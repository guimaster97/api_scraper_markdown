# Markdown Scraper API (MCP Enabled)

> **🤖 FOR LLMs / AGENTS:** This README acts as the API Specification and System Prompt.

This is a serverless Web Scraper API built with Node.js and Hono, deployed to Cloudflare Workers. It uses the `r.jina.ai` engine to bypass captchas and extract clean Markdown from any given URL.

## 🧠 System Architecture & Context Engineering
- **File Map:** Always read `CODEBASE.md` to understand file dependencies and system routing before modifying code.
- **Session Memory:** Always read and update `STATE.md` at the beginning and end of each session to maintain context across chats.

## 📡 API Specification

### 1. `GET /mcp/manifest` (Discovery)
Returns the Model Context Protocol (MCP) JSON manifest. Use this to dynamically understand the required parameters to use the scraping tool.

### 2. `POST /scrape` (Action)
**Requires Authentication:** `Authorization: Bearer <token>`

Este endpoint utiliza o protocolo **HTTP 402 Payment Required**. 
- Se você não fornecer um token ou o token não tiver saldo, a API retornará um erro 402.
- A resposta do erro 402 conterá uma `paymentUrl` (Dodo Payments) onde você pode adquirir créditos.
- Após o pagamento, você receberá um token que deve ser enviado no header `Authorization`.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "title": "Page Title",
    "url": "https://example.com",
    "content": "# Markdown extracted..."
  }
}
```

## 🚀 How to Run Locally
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
