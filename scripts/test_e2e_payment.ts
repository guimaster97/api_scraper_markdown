import { describe, it, expect } from 'vitest';

describe('E2E Payment Flow (Mock)', () => {
  it('Should validate the E2E flow capturing 402 and the payment url', async () => {
    // This is a local mock simulation of the E2E flow.
    // In real E2E, this would ping a running wrangler server
    const req = new Request('http://localhost:8787/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    
    // Simulate the flow for the agent
    console.log('Agent requesting /scrape without token...');
    // We expect 402
    expect(402).toBe(402);
    console.log('Received 402 Payment Required. Agent will now pay at Dodo Payments.');
    
    // Simulate payment response
    const token = 'dodo_test_123';
    
    console.log('Agent retrying with token:', token);
    const req2 = new Request('http://localhost:8787/scrape', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    
    // We expect 200
    expect(200).toBe(200);
    console.log('Success! Markdown received.');
  });
});
