import { describe, it, expect, vi } from 'vitest';
import { http402Billing } from './billing';
import { Context } from 'hono';

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
    } as unknown as Context;

    const next = vi.fn();
    await middleware(mockContext, next);

    expect(next).toHaveBeenCalled();
  });
});
