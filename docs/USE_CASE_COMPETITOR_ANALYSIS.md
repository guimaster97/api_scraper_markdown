# 💡 Use Case: Automating Competitor Analysis in Cursor

One of the most powerful ways to use the **Markdown Scraper API** is to give your IDE (like Cursor) the ability to browse the web autonomously to gather context for your projects.

Without this tool, you would have to manually open competitor websites, copy their pricing or feature tables, and paste them into your prompt. With the **Markdown Scraper API MCP**, Cursor does the heavy lifting for you.

## 🎯 The Scenario: Pricing Strategy Research

Imagine you are building a new SaaS product and want to design your pricing page based on your top 3 competitors.

### 1. Setup
Make sure you have added the Markdown Scraper MCP to Cursor (Settings > Features > MCP > `npx -y api_scraper_markdown`).

### 2. The Prompt
Open Cursor Composer (`Ctrl+I` or `Cmd+I`) and type the following prompt:

> *"I am building a pricing page for our new API product. Please use the Markdown Scraper to visit the pricing pages of [Competitor A URL], [Competitor B URL], and [Competitor C URL]. Extract their pricing tiers, and then create a comprehensive feature comparison matrix in markdown format in a new file called `PRICING_RESEARCH.md`."*

### 3. What Happens Next? (The Magic)
1. **Tool Invocation:** Cursor recognizes that it needs to fetch live data and calls the `scrape` tool provided by the MCP server.
2. **Execution:** The scraper bypasses any captchas on the competitor websites, strips away the heavy HTML/CSS, and returns pure, token-optimized Markdown.
3. **Analysis:** Cursor reads the clean Markdown, analyzes the pricing structures, and autonomously creates the `PRICING_RESEARCH.md` file with the requested matrix.

### 4. 💸 The Cost
Since the Markdown Scraper API operates on a micro-transaction model ($0.005 per request), this entire automated research task cost you exactly **$0.015** (3 requests).

You saved 15 minutes of manual copying and pasting, and got perfectly structured context injected straight into your IDE.

---

**Ready to try?** 
Add it to Cursor now with one command: `npx -y api_scraper_markdown`
