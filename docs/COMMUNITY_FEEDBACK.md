# 💬 Community Q&A & Feedback Swipe File

This document acts as a repository of real feedback, questions, objections, and standard replies received from developer forums (like Reddit's r/langchain, r/LocalLLaMA, and Hacker News). 

Use this as a **marketing swipe file** to quickly copy-paste answers when promoting the Markdown Scraper API across other channels, and as a **product roadmap guide** to understand what features and concerns developers care about most.

---

## 📊 Core Feedback Insights (r/langchain Launch)

* **Main Hooks:** Developers loved the **pay-as-you-go ($0.005/req)** micro-transaction pricing (citing subscription fatigue with tools starting at $20-$50/mo) and the **high token savings (80-95%)** achieved by feeding clean Markdown instead of bloated HTML to LLMs.
* **Common Concerns:** Dynamic rendering (JavaScript/SPA pages), anti-bot bypass mechanisms (Cloudflare, captchas), comparison with **Firecrawl**, and long-term API stability/compliance.

---

## 📁 Q&A Swipe File (Ready-to-Use Replies)

### Q1: How do you handle dynamic pages (JS render) and anti-bot blocks?
* **Context:** Raised by users concerned about SPAs (React/Vue/Next.js) and bot detection systems like Cloudflare.
* **Standard Swipe Reply:**
  ```text
  Under the hood, the API uses a robust headless rendering layer (powered by Jina Reader) that executes dynamic JavaScript (handling SPAs built with React/Vue/Next.js). It manages proxy rotation, custom headers, and browser fingerprint emulation to seamlessly bypass Cloudflare and standard anti-bot walls.
  ```

### Q2: How does this compare to Firecrawl in terms of quality and price?
* **Context:** Firecrawl is the main competitor. Highlighting the subscription vs micro-transaction difference is key.
* **Standard Swipe Reply:**
  ```text
  Firecrawl is an amazing tool, especially if you need deep full-site crawling and indexing! Here is how this MCP server compares to help you decide if it fits your workflow:
  
  1. Pricing Model (No Subscription Fatigue): Firecrawl's paid plans start at $19/mo. If you're prototyping or running agents that scrape occasionally, a monthly subscription can feel like a waste. Our server is purely pay-as-you-go ($0.005 per request via Dodo Payments). You can buy $5 worth of credits (1,000 scrapes) and they never expire. It only costs when your agent actually works.
  
  2. Native MCP Support: Built specifically for the Model Context Protocol. You don't need to write API orchestration code—just hook it directly to Cursor, Claude Desktop, or any LangChain MCP client in seconds.
  
  3. Quality: It uses Jina Reader's engine to strip navbars, footers, ads, and scripts, leaving only high-density, semantic markdown (retaining links, tables, and headers) which is highly optimized for LLM attention windows.
  
  If you want to give it a spin, there is a free trial of 5 requests per IP built-in—no sign-up required. Just run the MCP server and test it out!
  ```

### Q3: Why is Markdown output better than fetching raw HTML or using bs4?
* **Context:** Developers discussing attention mechanism degradation and token savings in prompts.
* **Standard Swipe Reply:**
  ```text
  Stripping raw HTML and passing clean markdown instead yields 80% to 95% token savings on most technical and documentation sites. More importantly, it avoids 'needle-in-a-haystack' attention degradation inside the LLM’s context window, making your agent's reasoning significantly more accurate and faster.
  
  While scraping direct JSON APIs via the Network Tab is always the gold standard, this Markdown Scraper acts as the perfect, low-overhead fallback when target sites use static generators (Nextra, Docusaurus) or block direct API access.
  ```

### Q4: Should we be worried about building dependencies on a third-party scraping layer? (Stability/Legality)
* **Context:** Users concerned about building production pipelines on a single API.
* **Standard Swipe Reply:**
  ```text
  Respecting robots.txt and website terms of service is absolutely essential. One of the main advantages of utilizing the Model Context Protocol (MCP) abstraction layer is that your agent's tool-calling logic remains completely decoupled. If you ever need to scale to a self-hosted custom scraper for production, you can easily replace the backend endpoint without modifying a single line of agent code or prompt configuration.
  ```

---

## 📈 Future Actionable Marketing Copy

### The "No-Sign-Up Trial" Pitch Hook
When posting on forums like **r/Cursor** or **r/LocalLLaMA**, lead with the immediate gratification aspect:
> *"I built a Markdown Scraper MCP server that is pure pay-as-you-go ($0.005/request). You don't even need to sign up or enter a card to try it out. I've built a **free trial of 5 requests per IP** directly into the API endpoint. You can literally plug it into Claude Desktop or Cursor using `npx -y api_scraper_markdown` and test it instantly."*
