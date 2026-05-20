import { Hono } from 'hono';
import { ScraperService } from '../services/scraper';
import { CloudflareBindings } from '../middleware/billing';

const app = new Hono<{ Bindings: CloudflareBindings }>();

const sendAxiomLog = async (env: CloudflareBindings, event: any) => {
  console.log(JSON.stringify(event));
  if (env?.AXIOM_TOKEN && env?.AXIOM_DATASET) {
    try {
      await fetch(`https://api.axiom.co/v1/datasets/${env.AXIOM_DATASET}/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.AXIOM_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([event])
      });
    } catch (e) {
      console.error('Failed to send Axiom log', e);
    }
  }
};

const safeWaitUntil = (c: any, promise: Promise<any> | void) => {
  try {
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(promise);
      return;
    }
  } catch (e) {
    // Suppress getter error when ExecutionContext is missing in tests
  }
  if (promise instanceof Promise) {
    promise.catch(console.error);
  }
};

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const url = body.url;

    if (!url) {
      return c.json({ error: 'Missing "url" parameter in body.' }, 400);
    }

    const cacheControlHeader = c.req.header('Cache-Control');
    const noCache = cacheControlHeader === 'no-cache';

    // Virtual GET Request as a cache key (POST requests are not cached natively)
    const cacheKeyUrl = new URL(c.req.url, 'http://localhost');
    cacheKeyUrl.pathname = `/cache/scrape`;
    cacheKeyUrl.searchParams.set('url', url);
    const cacheKey = new Request(cacheKeyUrl.toString(), {
      method: 'GET',
    });

    const hasCacheAPI = typeof caches !== 'undefined' && (caches as any).default;
    const cache = hasCacheAPI ? (caches as any).default : null;
    let cachedResponse: Response | undefined;

    if (cache && !noCache) {
      try {
        cachedResponse = await cache.match(cacheKey);
      } catch (err) {
        console.error('Cache read error:', err);
      }
    }

    if (cachedResponse) {
      const responseWithHit = new Response(cachedResponse.body, cachedResponse);
      responseWithHit.headers.set('X-Cache', 'HIT');

      safeWaitUntil(c, sendAxiomLog(c.env, {
        level: 'info',
        type: 'scrape_cache_hit',
        url: url
      }));

      return responseWithHit;
    }

    const scraper = new ScraperService();
    const result = await scraper.scrape(url);
    
    const responseData = {
      markdown: result.content,
      metadata: {
        title: result.title,
        url: result.url
      }
    };

    const response = c.json(responseData);
    response.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    response.headers.set('X-Cache', 'MISS');

    if (cache && !noCache) {
      safeWaitUntil(c, cache.put(cacheKey, response.clone()));
    }

    safeWaitUntil(c, sendAxiomLog(c.env, {
      level: 'info',
      type: noCache ? 'scrape_cache_bypass' : 'scrape_cache_miss',
      url: url
    }));

    return response;
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});


export default app;
