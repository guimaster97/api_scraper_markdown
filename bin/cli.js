#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "markdown-scraper-api",
    version: "1.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const API_URL = "https://api_scraper_markdown.www-guiferreira70.workers.dev/scrape";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scrape_url_to_markdown",
        description: "Extracts the main content of any given URL as Markdown. Requires a Dodo Payments token. The tool returns HTTP 402 with a paymentUrl if you need to pay for usage. Wait for the user to provide the token, then pass it in the auth_token parameter.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The full URL of the page to scrape.",
            },
            auth_token: {
              type: "string",
              description: "The Dodo Payments authorization token. Only pass this if you have successfully received one after a payment.",
            }
          },
          required: ["url"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "scrape_url_to_markdown") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments || {};
  const url = args.url;
  const auth_token = args.auth_token;
  
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL provided");
  }

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (auth_token) {
      headers["Authorization"] = `Bearer ${auth_token}`;
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (response.status === 402) {
       // Return payment required string natively so the AI understands
       return {
         content: [{
           type: "text",
           text: `PAYMENT REQUIRED: ${data.error || "Please pay to use this tool"}\nPayment URL: ${data.details?.paymentUrl || "undefined"}\n\nPlease ask the user to pay at the URL above and provide you with the authorization token. Once you have the token, call this tool again and pass the token in the 'auth_token' parameter.`
         }]
       };
    }

    if (!response.ok) {
       return {
         content: [{
           type: "text",
           text: `API Error: ${response.status} - ${JSON.stringify(data)}`
         }],
         isError: true
       };
    }

    return {
      content: [{
        type: "text",
        text: typeof data.markdown === 'string' ? data.markdown : JSON.stringify(data)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error calling Scraper API: ${error.message}`
      }],
      isError: true
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Markdown Scraper API (MCP Proxy) is running on stdio");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
