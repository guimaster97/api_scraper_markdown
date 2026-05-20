import { Hono } from 'hono';
import { CloudflareBindings } from '../middleware/billing';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Helper to compare signatures in constant time to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Standard Webhooks Signature Verification using Cloudflare native Web Crypto API.
 * 1. Constructs signed content: msgId.timestamp.rawBody
 * 2. Calculates HMAC-SHA256 with the decoded Webhook Secret Key
 * 3. Compares the resulting signature with the header values in constant-time
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headers: Record<string, string | undefined>,
  secret: string
): Promise<boolean> {
  const msgId = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signatureHeader = headers['webhook-signature'];

  if (!msgId || !timestamp || !signatureHeader) {
    console.error('Missing required webhook headers:', { msgId: !!msgId, timestamp: !!timestamp, signature: !!signatureHeader });
    return false;
  }

  // Prevents replay attacks (5 minutes tolerance window)
  const now = Math.floor(Date.now() / 1000);
  const msgTimestamp = parseInt(timestamp, 10);
  if (isNaN(msgTimestamp) || Math.abs(now - msgTimestamp) > 300) {
    console.error('Webhook signature timestamp validation failed. Age difference in seconds:', Math.abs(now - msgTimestamp));
    return false;
  }

  let keyString = secret;
  if (secret.startsWith('whsec_')) {
    keyString = secret.substring('whsec_'.length);
  }

  try {
    // Standard Webhooks secrets are base64 encoded
    const keyBytes = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    
    // Construct signature message base
    const signedContent = `${msgId}.${timestamp}.${rawBody}`;
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(signedContent);

    // Import HMAC SHA-256 Key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign using SubtleCrypto
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
    const signatureBytes = new Uint8Array(signatureBuffer);
    
    // Convert computed signature to base64
    const computedSignatureB64 = btoa(String.fromCharCode(...signatureBytes));

    // Dodo Payments webhook-signature contains space-separated versions (e.g. "v1,signature_b64")
    const signatures = signatureHeader.split(' ');
    for (const sig of signatures) {
      const parts = sig.split(',');
      if (parts.length === 2 && parts[0] === 'v1') {
        if (constantTimeCompare(computedSignatureB64, parts[1])) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Cryptographic verification error during webhook process:', error);
  }

  return false;
}

app.post('/dodo', async (c) => {
  const webhookSecret = c.env.PAYMENT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CRITICAL: PAYMENT_WEBHOOK_SECRET is not configured in Cloudflare Bindings.');
    return c.json({ error: 'Internal Server Error', message: 'Webhook system is misconfigured.' }, 500);
  }

  const rawBody = await c.req.text();
  const headers = {
    'webhook-id': c.req.header('webhook-id'),
    'webhook-signature': c.req.header('webhook-signature'),
    'webhook-timestamp': c.req.header('webhook-timestamp'),
  };

  const isValid = await verifyWebhookSignature(rawBody, headers, webhookSecret);
  if (!isValid) {
    return c.json({ error: 'Unauthorized', message: 'Signature verification failed.' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return c.json({ error: 'Bad Request', message: 'Invalid JSON payload.' }, 400);
  }

  if (payload.event_type === 'payment.succeeded') {
    const data = payload.data;
    const paymentId = data.id;
    const amount = data.amount; // in cents, e.g. 500 for $5.00
    
    if (!paymentId) {
      return c.json({ error: 'Bad Request', message: 'Missing payment ID in payload data.' }, 400);
    }

    const costPerRequest = c.env.COST_PER_REQUEST ? parseFloat(c.env.COST_PER_REQUEST) : 0.005;
    
    // Cost calculation: $5.00 -> 5.00 / 0.005 = 1000 credits
    const credits = Math.floor((amount / 100) / costPerRequest);

    if (c.env.TRIAL_KV) {
      try {
        await c.env.TRIAL_KV.put(`payment:${paymentId}`, credits.toString());
        console.log(`Successfully provisioned ${credits} credits in KV for Dodo Payment ID: ${paymentId}`);
      } catch (kvError) {
        console.error('Failed to write payment credits to TRIAL_KV:', kvError);
        return c.json({ error: 'Internal Server Error', message: 'Failed to write payment cache.' }, 500);
      }
    } else {
      console.warn('TRIAL_KV namespace binding is missing; payment credits were verified but could not be cached.');
    }
  }

  return c.json({ received: true }, 200);
});

export default app;
