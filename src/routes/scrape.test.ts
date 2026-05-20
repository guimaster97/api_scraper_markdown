import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import scrapeRoute from './scrape';

const { mockScrape } = vi.hoisted(() => {
  return {
    mockScrape: vi.fn().mockResolvedValue({
      title: 'Mock Page',
      url: 'https://example.com',
      content: '# Mock Page Content'
    })
  };
});

vi.mock('../services/scraper', () => {
  return {
    ScraperService: class {
      scrape = mockScrape;
    }
  };
});


describe('Scrape Route Caching', () => {
  const app = new Hono();
  app.route('/scrape', scrapeRoute);

  const mockCacheMatch = vi.fn();
  const mockCachePut = vi.fn();

  beforeEach(() => {
    mockScrape.mockClear();
    mockCacheMatch.mockReset();
    mockCachePut.mockReset();

    // Mock global Cloudflare caches object
    globalThis.caches = {
      default: {
        match: mockCacheMatch,
        put: mockCachePut,
      }
    } as any;
  });

  afterEach(() => {
    delete (globalThis as any).caches;
  });

  it('should return MISS and put response in cache on first request (Cache MISS)', async () => {
    mockCacheMatch.mockResolvedValue(undefined);

    const res = await app.request('/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache')).toBe('MISS');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    
    const body = await res.json();
    expect(body).toEqual({
      markdown: '# Mock Page Content',
      metadata: {
        title: 'Mock Page',
        url: 'https://example.com'
      }
    });

    expect(mockCacheMatch).toHaveBeenCalled();
    expect(mockScrape).toHaveBeenCalledWith('https://example.com');
    expect(mockCachePut).toHaveBeenCalled();
  });

  it('should return HIT from cache on subsequent request (Cache HIT)', async () => {
    const cachedData = {
      markdown: '# Cached Content',
      metadata: {
        title: 'Cached Page',
        url: 'https://example.com'
      }
    };
    const cachedResponse = new Response(JSON.stringify(cachedData), {
      headers: { 'Content-Type': 'application/json' }
    });
    mockCacheMatch.mockResolvedValue(cachedResponse);

    const res = await app.request('/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache')).toBe('HIT');
    
    const body = await res.json() as any;
    expect(body.markdown).toBe('# Cached Content');

    expect(mockCacheMatch).toHaveBeenCalled();
    expect(mockScrape).not.toHaveBeenCalled();
    expect(mockCachePut).not.toHaveBeenCalled();
  });

  it('should bypass cache when Cache-Control: no-cache header is provided', async () => {
    const res = await app.request('/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache')).toBe('MISS');
    
    expect(mockCacheMatch).not.toHaveBeenCalled();
    expect(mockScrape).toHaveBeenCalled();
    expect(mockCachePut).not.toHaveBeenCalled();
  });
});
