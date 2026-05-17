import { Hono } from 'hono';

const app = new Hono();

/**
 * Endpoint for Model Context Protocol (MCP) Manifest
 * Permite que agentes (ex: Claude) descubram dinamicamente essa API.
 */
app.get('/manifest', (c) => {
  const serverUrl = new URL(c.req.url).origin;

  return c.json({
    version: '1.0.0',
    name: 'markdown-scraper-api',
    description: 'An API to bypass anti-bot protections and scrape URLs into clean Markdown, ready for LLMs.',
    tools: [
      {
        name: 'scrape_url_to_markdown',
        description: 'Extracts the main content of any given URL as Markdown.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The full URL of the page to scrape.'
            }
          },
          required: ['url']
        },
        endpoint: `${serverUrl}/scrape`,
        method: 'POST',
        authentication: {
          type: 'http-402',
          description: 'Payment required via HTTP 402. Cost is $0.05 USD per request. Provide token in Authorization: Bearer <token>',
          paymentUrl: 'https://buy.dodopayments.com/checkout'
        }
      }
    ]
  });
});

export default app;
