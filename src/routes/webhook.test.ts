import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import * as crypto from 'crypto';
import webhookRoute from './webhook';
import { CloudflareBindings } from '../middleware/billing';

// Cryptographic signature helper for testing (Node.js crypto matching standard Web Crypto)
function generateTestSignature(
  msgId: string,
  timestamp: string,
  rawPayload: string,
  secret: string
): string {
  let keyString = secret;
  if (secret.startsWith('whsec_')) {
    keyString = secret.substring('whsec_'.length);
  }
  const keyBytes = Buffer.from(keyString, 'base64');
  const signedContent = `${msgId}.${timestamp}.${rawPayload}`;
  
  const hmac = crypto.createHmac('sha256', keyBytes);
  hmac.update(signedContent);
  const signature = hmac.digest('base64');
  
  return `v1,${signature}`;
}

describe('Dodo Payments Webhook Handler', () => {
  const secretKey = 'whsec_dGVzdF9zZWNyZXRfa2V5XzEyMzQ1Njc4OTA='; // base64 payload: test_secret_key_1234567890
  const mockKV = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
  };

  const app = new Hono<{ Bindings: CloudflareBindings }>();
  app.use('*', async (c, next) => {
    c.env = {
      PAYMENT_API_KEY: 'test_key',
      PAYMENT_WEBHOOK_SECRET: secretKey,
      COST_PER_REQUEST: '0.005',
      TRIAL_KV: mockKV as any,
    };
    await next();
  });
  app.route('/webhook', webhookRoute);

  beforeEach(() => {
    mockKV.put.mockClear();
    mockKV.get.mockClear();
  });

  it('should accept a valid signature and provision credit quotas in TRIAL_KV on payment.succeeded', async () => {
    const payloadObj = {
      event_type: 'payment.succeeded',
      data: {
        id: 'pay_987654321',
        amount: 500, // $5.00 -> should result in 5.00/0.005 = 1000 credits
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const msgId = 'msg_001';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateTestSignature(msgId, timestamp, rawPayload, secretKey);

    const res = await app.request('/webhook/dodo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': msgId,
        'webhook-timestamp': timestamp,
        'webhook-signature': signature,
      },
      body: rawPayload,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
    
    // 500 cents / 100 = 5 USD -> 5 / 0.005 = 1000 credits
    expect(mockKV.put).toHaveBeenCalledWith('payment:pay_987654321', '1000');
  });

  it('should reject requests with expired timestamp signature to prevent replay attacks', async () => {
    const payloadObj = {
      event_type: 'payment.succeeded',
      data: {
        id: 'pay_old_transaction',
        amount: 500,
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const msgId = 'msg_expired';
    // 10 minutes ago (600 seconds)
    const timestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = generateTestSignature(msgId, timestamp, rawPayload, secretKey);

    const res = await app.request('/webhook/dodo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': msgId,
        'webhook-timestamp': timestamp,
        'webhook-signature': signature,
      },
      body: rawPayload,
    });

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBe('Unauthorized');
    expect(mockKV.put).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid signature', async () => {
    const rawPayload = JSON.stringify({ event_type: 'payment.succeeded' });
    const res = await app.request('/webhook/dodo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': 'msg_003',
        'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        'webhook-signature': 'v1,invalid_signature_base_64',
      },
      body: rawPayload,
    });

    expect(res.status).toBe(401);
    expect(mockKV.put).not.toHaveBeenCalled();
  });

  it('should reject requests with missing headers', async () => {
    const rawPayload = JSON.stringify({ event_type: 'payment.succeeded' });
    const res = await app.request('/webhook/dodo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: rawPayload,
    });

    expect(res.status).toBe(401);
    expect(mockKV.put).not.toHaveBeenCalled();
  });
});
