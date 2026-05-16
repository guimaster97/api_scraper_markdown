# 🗺️ CODEBASE.md - Markdown Scraper API

> **ATENÇÃO LLMs:** Este arquivo é o mapa mental do projeto. Leia-o antes de usar `list_dir` ou vasculhar arquivos.

## 🎯 Visão e Regras de Negócio (Project Vision)
1. **A Meta ($2.000):** O objetivo principal deste projeto é gerar uma renda passiva de $2.000 dólares. Todas as decisões arquiteturais (como usar a API grátis da Jina Reader em vez de servidores caros de Puppeteer) devem priorizar o lucro e o baixo custo de manutenção para o solopreneur.
2. **Público-Alvo (Agentes Autônomos):** O consumidor primário desta API não é um humano, mas sim **outros Agentes de IA Autônomos**. Por isso, a API deve ser extremamente documentada via Model Context Protocol (MCP), retornar erros descritivos e usar o HTTP 402 (Payment Required) de forma clara para que outras IAs saibam como pagar pelo uso.

## 🏗️ Arquitetura e Fluxo de Dados

A aplicação é uma API RESTful (Serverless) focada em extração web e monetização autônoma via agentes. O fluxo de requisição funciona em camadas simples:

1. **`src/index.ts` (Entrypoint):** Roteia a aplicação Hono.
2. **`src/middleware/billing.ts` (Gatekeeper):** Intercepta todas as rotas `/scrape/*`. Valida o segredo `PAYMENT_API_KEY` e retorna HTTP 402 se não houver token válido (`dodo_...`).
3. **`src/routes/scrape.ts` (Controller):** Rota de extração de dados. Trata o payload `{ "url": "..." }`.
4. **`src/services/scraper.ts` (Engine):** Integração externa com a Jina Reader API (`r.jina.ai`). Requisita o HTML renderizado e pede retorno forçado em Markdown.
5. **`src/routes/mcp.ts` (Discovery):** Endpoint público que expõe o manifesto do Model Context Protocol (MCP) para LLMs conectarem na ferramenta.

## 📁 Dependências de Arquivos

| Arquivo Modificado | Arquivo Dependente a ser verificado | Motivo |
| :--- | :--- | :--- |
| `src/middleware/billing.ts` | `src/middleware/billing.test.ts` | Testes unitários protegem a lógica de cobrança. |
| `src/middleware/billing.ts` | `src/routes/mcp.ts` | Se a lógica de pagamento ou preço (cost) mudar, o manifesto do MCP deve refletir essa mudança. |
| `src/services/scraper.ts` | `src/routes/scrape.ts` | Se o contrato de retorno do serviço (`ScrapeResult`) mudar, o controller precisará ser ajustado. |

## 🔌 Integrações Externas
* **Jina Reader:** Usada para extração de conteúdo em Markdown.
* **Dodo Payments:** Gateway de monetização. Usa `PAYMENT_API_KEY`.

## ⚡ Variáveis de Ambiente / Bindings
* **`PAYMENT_API_KEY`**: Chave secreta da Dodo Payments (Injetada via secret ou `.dev.vars`).
* **`COST_PER_REQUEST`**: Custo em USD por requisição (Opcional).
