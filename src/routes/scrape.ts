import { Hono } from 'hono';
import { ScraperService } from '../services/scraper';

const app = new Hono();

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const url = body.url;

    if (!url) {
      return c.json({ error: 'Missing "url" parameter in body.' }, 400);
    }

    // Em produção real, você usaria env vars do Cloudflare Bindings.
    const scraper = new ScraperService(); // Sem API Key para usar a cota grátis do Jina

    const result = await scraper.scrape(url);
    
    return c.json({
      markdown: result.content,
      metadata: {
        title: result.title,
        url: result.url
      }
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default app;
