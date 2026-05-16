import { Hono } from 'hono';
import { http402Billing, CloudflareBindings } from './middleware/billing';
import scrapeRoute from './routes/scrape';
import mcpRoute from './routes/mcp';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Rotas públicas (Descoberta)
app.route('/mcp', mcpRoute);

// Rotas protegidas (Monetização)
app.use('/scrape/*', http402Billing());
app.route('/scrape', scrapeRoute);

// Root
app.get('/', (c) => {
  return c.text('Markdown Scraper API (MCP Enabled) - Online');
});

export default app;
