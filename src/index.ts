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

// Smithery Server Card
app.get('/.well-known/mcp/server-card.json', (c) => {
  return c.json({
    "serverInfo": {
      "name": "api_scraper_markdown",
      "version": "1.0.0"
    },
    "tools": [
      {
        "name": "scrape_url_to_markdown",
        "description": "Extracts the main content of any given URL as Markdown. Requires a Dodo Payments token in the Authorization header. Cost: $0.005 per request.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "url": { "type": "string" }
          },
          "required": ["url"]
        }
      }
    ],
    "resources": [],
    "prompts": []
  });
});

export default app;
