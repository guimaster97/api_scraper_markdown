# 🚀 Integration Guide: Markdown Scraper API

This guide explains how to connect and use the Markdown Scraper API across different AI Assistants and Agents. 
Since this API uses the **HTTP 402 Monetization Protocol**, the autonomous agents will know how to pay for usage automatically via Dodo Payments.

---

## 1. ⚡ Quick Start (npx)
You can quickly get the connection details without installing anything locally:
```bash
npx api_scraper_markdown
```

## 2. 💻 Claude Desktop Setup
To add the Scraper API to your Claude Desktop App:

1. Open your `claude_desktop_config.json` file.
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add the following to your `mcpServers` object:

```json
{
  "mcpServers": {
    "api_scraper_markdown": {
      "command": "npx",
      "args": [
        "-y",
        "api_scraper_markdown"
      ]
    }
  }
}
```

*Note: The CLI wrapper will automatically point Claude to the remote Serverless manifest.*

## 3. 🖱️ Cursor IDE Setup
To use the Web Scraper directly within Cursor:

1. Open Cursor Settings > **Features** > **MCP**.
2. Click **+ Add new MCP Server**.
3. Name: `Markdown Scraper`
4. Type: `command`
5. Command: `npx -y api_scraper_markdown`
6. Click Save. Cursor will now be able to fetch live web pages and read their markdown content for you.

## 4. 🤖 Autonomous Agents (Direct API Call)
If you are building an AI Agent using LangChain, Vercel AI SDK, or custom HTTP clients, simply point your MCP Client to our remote manifest URL:

```text
GET https://api_scraper_markdown.www-guiferreira70.workers.dev/mcp/manifest
```

### 💸 Handling Payments (HTTP 402)
When your agent makes a `POST /scrape` request without a valid token, it will receive:
```json
{
  "error": "Payment Required",
  "paymentUrl": "https://pay.dodo..."
}
```
Your agent should pause, notify the user to complete the payment via `paymentUrl`, and once the user provides the token, resume the request passing the token in `Authorization: Bearer <token>`.
