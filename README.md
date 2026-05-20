# 🕷️ Markdown Scraper API (MCP Enabled)

[![smithery badge](https://smithery.ai/badge/www-guiferreira70/api-scraper-markdown)](https://smithery.ai/servers/www-guiferreira70/api-scraper-markdown)

> **🤖 FOR LLMs / AGENTS:** This README acts as the API Specification and System Prompt.

**Give your AI Agents the power to read the web.** 

LLMs often hallucinate when asked to read URLs directly. They get blocked by captchas, and raw HTML consumes too many tokens, leading to degraded performance. 

**Markdown Scraper API** solves this: it acts as a bridge, bypassing captchas, stripping bloated HTML, and returning clean, structured, LLM-ready Markdown.

Perfect for **Cursor IDE**, **Claude Desktop**, and custom autonomous agents. 

🚀 **No-friction Free Trial:** Get **5 free scraper requests per IP instantly**—no account, sign-up, or credit card required. Perfect for testing and prototyping!

💸 **Micro-transactions Model:** After your trial, it's only **$0.005 per scrape**. No monthly subscriptions. Your Agent handles the payment workflow autonomously!

---

## 📦 Quick Installation (Cursor / Claude)

You don't need to install anything locally. You can plug this directly into any MCP-compatible client using `npx`:

```bash
npx -y api_scraper_markdown
```

📚 **[Read the Full Integration Guide for Cursor and Claude Desktop](./docs/INTEGRATION_GUIDE.md)**
💡 **[See a Real Use Case: Automating Competitor Analysis in Cursor](./docs/USE_CASE_COMPETITOR_ANALYSIS.md)**

---

## 📡 API Specification for Agents

### 1. `GET /mcp/manifest` (Discovery)
Returns the Model Context Protocol (MCP) JSON manifest. Use this to dynamically understand the required parameters to use the scraping tool.

### 2. `POST /scrape` (Action)
**Requires Authentication:** `Authorization: Bearer <token>` *(or use our built-in Free Trial!)*

This endpoint utilizes the **HTTP 402 Payment Required** protocol under a **Micro-transactions model ($0.005 per request)**.
It is designed to be the fastest, easiest, and cheapest way to plug high-quality Web Scraping capabilities into your Autonomous Agent with zero infrastructure setup.

- **Free Trial:** The first 5 requests per IP are entirely free, no setup required!
- If you don't provide a token (after trial exhaustion) or the token has no credits left, the API returns a `402 Payment Required` error.
- The 402 response contains a `paymentUrl` (Dodo Payments) where the human owner can instantly acquire credits.
- After checkout, you (the Agent) will receive an authorization token to include in the `Authorization` header.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Success Response (200 OK):**
```json
{
  "markdown": "# Page Content in clean Markdown format...",
  "metadata": {
    "title": "Page Title",
    "url": "https://example.com"
  }
}
```

## 🚀 How to Run Locally (For Developers)

```bash
# Start the local Cloudflare dev server
npm run dev
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

