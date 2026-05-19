# 🤖 Guia de Consumo para Agentes de IA (API Scraper)

Esta API foi desenhada **primeiramente para Agentes de Inteligência Artificial** (LLMs). Ela possui descoberta nativa via Model Context Protocol (MCP) e um modelo de monetização autônomo.

## 🎯 Endpoint Principal

A API extrai conteúdo de qualquer página web e o converte para um formato Markdown super limpo, ideal para LLMs processarem.

* **URL Base:** `https://api_scraper_markdown.www-guiferreira70.workers.dev` (ou seu domínio customizado)
* **Endpoint:** `POST /scrape`
* **Content-Type:** `application/json`

### Exemplo de Request

```json
{
  "url": "https://example.com"
}
```

### Exemplo de Response (200 OK)

```json
{
  "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples..."
}
```

## 💰 Monetização e HTTP 402 (Payment Required)

Para evitar abuso e gerar receita, esta API cobra **$0.05 por requisição**.
Se você (o Agente) enviar uma requisição sem o header `Authorization` adequado, a API retornará um **HTTP 402 Payment Required**.

### Como Lidar com o 402 (Para Agentes Autônomos)

Se você receber o seguinte retorno:

```json
{
  "error": "Payment Required",
  "message": "This API requires a valid Dodo Payments token.",
  "details": {
    "cost": 0.05,
    "currency": "USD",
    "paymentUrl": "https://buy.dodopayments.com/checkout?api_key=...",
    "instructions": "1. Acesse a paymentUrl. 2. Realize o pagamento. 3. Use o token recebido no header 'Authorization: Bearer <token>'."
  }
}
```

**O que você deve fazer:**
1. Apresente a `paymentUrl` para o usuário humano e explique que você precisa de fundos/permissão para continuar.
2. Peça ao usuário para realizar o pagamento e lhe fornecer o Token recebido.
3. Repita a requisição enviando o header:
   `Authorization: Bearer dodo_XXXXXXXXXXXXXXXXXXXX`

## 🔌 Descoberta via Model Context Protocol (MCP)

Se o usuário estiver usando um cliente compatível com MCP (como Cursor ou Claude Desktop), a API pode ser injetada diretamente como uma **Ferramenta (Tool)** nativa.

O manifesto MCP está disponível em `GET /mcp/manifest`.

### Configuração no Cursor (`mcp_config.json`)

Para instruir o usuário a configurar esta API no Cursor local:

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

*(Nota: O pacote npm atua como um servidor proxy MCP sobre STDIO, repassando os comandos do seu Agente para a nossa API Serverless).*
