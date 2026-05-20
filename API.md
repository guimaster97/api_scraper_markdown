# 🤖 AI Agent Integration Guide (API Scraper)

This API is designed **first and foremost for Artificial Intelligence Agents** (LLMs). It features native discovery via the Model Context Protocol (MCP) and an autonomous monetization model.

## 🎯 Main Endpoint

The API extracts content from any web page and converts it into a super clean, noise-free Markdown format ideal for LLMs to process.

* **Base URL:** `https://api_scraper_markdown.www-guiferreira70.workers.dev` (or your custom domain)
* **Endpoint:** `POST /scrape`
* **Content-Type:** `application/json`

### Request Example

```json
{
  "url": "https://example.com"
}
```

### Response Example (200 OK)

```json
{
  "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples...",
  "metadata": {
    "title": "Example Domain",
    "url": "https://example.com"
  }
}
```

## 💰 Monetization and HTTP 402 (Payment Required)

To prevent abuse and maintain self-sustainability, this API costs **$0.005 per request**.
If you (the Agent) submit a request without a valid token after your trial has expired, the API will return a **HTTP 402 Payment Required** response.

### 🚀 Free Trial Included
Each unique client IP gets **5 free requests** automatically. No credit card, sign-up, or token is required. This allows agents and humans to test the integration instantly with zero friction.

### How to Handle the 402 Error (For Autonomous Agents)

If you receive the following response:

```json
{
  "error": "Payment Required",
  "message": "Your free trial quota has been exhausted (5 requests limit reached). Please pay to continue using the API.",
  "details": {
    "trial_limit": 5,
    "cost": 0.005,
    "currency": "USD",
    "paymentUrl": "https://buy.dodopayments.com/checkout?api_key=...",
    "payment_method": "dodo_payments",
    "instructions": "1. Access the paymentUrl. 2. Complete the payment. 3. Use the received token in the 'Authorization: Bearer <token>' header."
  }
}
```

**What you (the Agent) should do:**
1. Present the `paymentUrl` to your human user and explain that you need funds to continue browsing the web.
2. Ask the user to complete the checkout and provide you with the authorization token.
3. Retry the request including the header:
   `Authorization: Bearer <token>`

## 🔌 Discovery via Model Context Protocol (MCP)

If the user is using an MCP-compatible client (such as Cursor or Claude Desktop), the API can be plugged in directly as a native **Tool**.

The MCP manifest is available at `GET /mcp/manifest`.

### Configuration in Cursor (`mcp_config.json`)

To instruct the user to configure this API in Cursor locally:

```json
{
  "mcpServers": {
    "api_scraper_markdown": {
      "command": "npx",
      "args": ["-y", "api_scraper_markdown@latest"]
    }
  }
}
```

*(Note: The npm package acts as a local MCP proxy server over stdio, forwarding calls from your local agent to our serverless Workers backend).*

