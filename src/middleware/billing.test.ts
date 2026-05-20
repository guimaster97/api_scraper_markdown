import { describe, it, expect, vi } from 'vitest';
import { http402Billing } from './billing';
import { Context } from 'hono';

const getSha256 = async (str: string) => {
  const ipBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', ipBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

describe('http402Billing Middleware', () => {
  it('should return 500 if PAYMENT_API_KEY is missing', async () => {
    const middleware = http402Billing();
    const mockContext = {
      env: {},
      json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      req: { header: vi.fn() },
    } as unknown as Context;

    const next = vi.fn();
    const result = await middleware(mockContext, next);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal Server Error' }),
      500
    );
  });

  it('should return 402 if payment token is missing or invalid', async () => {
    const middleware = http402Billing();
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key' },
      json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      req: { header: vi.fn().mockReturnValue(null) },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    const next = vi.fn();
    await middleware(mockContext, next);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Payment Required' }),
      402
    );
  });

  it('should call next() if a valid dodo_ token is provided', async () => {
    const middleware = http402Billing();
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key' },
      req: { header: vi.fn().mockReturnValue('Bearer dodo_test_token') },
      res: { headers: { set: vi.fn() } },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    const next = vi.fn();
    await middleware(mockContext, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow trial request and increment TRIAL_KV if under quota', async () => {
    const middleware = http402Billing();
    const mockKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key', TRIAL_KV: mockKV },
      req: { header: vi.fn().mockImplementation((h) => h === 'cf-connecting-ip' ? '1.1.1.1' : null) },
      res: { headers: { set: vi.fn() } },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    const next = vi.fn();
    await middleware(mockContext, next);

    const hashedIp = await getSha256('1.1.1.1');

    expect(mockKV.get).toHaveBeenCalledWith(hashedIp);
    expect(mockKV.put).toHaveBeenCalledWith(hashedIp, '1');
    expect(mockContext.res.headers.set).toHaveBeenCalledWith('X-Trial-Active', 'true');
    expect(mockContext.res.headers.set).toHaveBeenCalledWith('X-Trial-Remaining', '4');
    expect(next).toHaveBeenCalled();
  });

  it('should block with 402 and specific message if trial quota is exhausted', async () => {
    const middleware = http402Billing();
    const mockKV = {
      get: vi.fn().mockResolvedValue('5'),
      put: vi.fn(),
    };
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key', TRIAL_KV: mockKV },
      json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      req: { header: vi.fn().mockImplementation((h) => h === 'cf-connecting-ip' ? '1.1.1.1' : null) },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    const next = vi.fn();
    await middleware(mockContext, next);

    const hashedIp = await getSha256('1.1.1.1');

    expect(mockKV.get).toHaveBeenCalledWith(hashedIp);
    expect(mockKV.put).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Payment Required',
        message: expect.stringContaining('free trial quota has been exhausted')
      }),
      402
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate a real payment ID with remaining credits in TRIAL_KV', async () => {
    const middleware = http402Billing();
    const mockKV = {
      get: vi.fn().mockResolvedValue('10'), // 10 remaining credits
      put: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key', TRIAL_KV: mockKV },
      req: { header: vi.fn().mockReturnValue('Bearer pay_real_123') },
      res: { headers: { set: vi.fn() } },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    const next = vi.fn();
    await middleware(mockContext, next);

    expect(mockKV.get).toHaveBeenCalledWith('payment:pay_real_123');
    expect(mockKV.put).toHaveBeenCalledWith('payment:pay_real_123', '9');
    expect(next).toHaveBeenCalled();
  });

  it('should validate a real payment ID not in KV by fetching from Dodo Payments API', async () => {
    const middleware = http402Billing();
    const mockKV = {
      get: vi.fn().mockResolvedValue(null), // not cached yet
      put: vi.fn().mockResolvedValue(undefined),
    };
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key', TRIAL_KV: mockKV, COST_PER_REQUEST: '0.005' },
      req: { header: vi.fn().mockReturnValue('Bearer pay_api_fetch_456') },
      res: { headers: { set: vi.fn() } },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    // Mock global fetch to simulate Dodo Payments API response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'succeeded',
        amount: 500, // $5.00 -> 1000 credits
      }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const next = vi.fn();
      await middleware(mockContext, next);

      expect(mockKV.get).toHaveBeenCalledWith('payment:pay_api_fetch_456');
      // Should query the test/live endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pay_api_fetch_456'),
        expect.any(Object)
      );
      // Saved with credits - 1 = 999 remaining credits
      expect(mockKV.put).toHaveBeenCalledWith('payment:pay_api_fetch_456', '999');
      expect(next).toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should block with 402 if a real payment ID fails Dodo Payments API verification', async () => {
    const middleware = http402Billing();
    const mockKV = {
      get: vi.fn().mockImplementation((key) => {
        if (key.startsWith('payment:')) return null;
        return '5'; // trial esgotado
      }),
      put: vi.fn(),
    };
    const mockContext = {
      env: { PAYMENT_API_KEY: 'test_key', TRIAL_KV: mockKV },
      json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      req: { header: vi.fn().mockReturnValue('Bearer pay_failed_789') },
      res: { headers: { set: vi.fn() } },
      executionCtx: { waitUntil: vi.fn() },
    } as unknown as Context;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const next = vi.fn();
      await middleware(mockContext, next);

      expect(mockKV.get).toHaveBeenCalledWith('payment:pay_failed_789');
      expect(mockKV.put).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Payment Required' }),
        402
      );
      expect(next).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

