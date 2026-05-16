# 💾 STATE.md (Session Memory)

> **ATENÇÃO LLMs:** Leia este arquivo para continuar o trabalho de onde a última sessão parou. Ao final de cada sessão, VOCÊ DEVE ATUALIZAR ESTE ARQUIVO.

## 🟢 Status Atual
**Fase do Projeto:** Produção, CI/CD e Monetização Ativa.
**Última Atualização:** Repositório GitHub criado (`guimaster97/api_scraper_markdown`), GitHub Actions configurado com a secret `CLOUDFLARE_API_TOKEN`. Código base com middleware de billing (Dodo Payments) e testes Vitest enviados para a branch `main`.

## 🧠 Memória e Decisões Recentes
* **Billing Real Ativado:** O middleware de billing (`src/middleware/billing.ts`) foi refatorado para exigir a `PAYMENT_API_KEY`. Se a chave falhar, ele retorna um link de checkout real da Dodo Payments no erro 402, orientando o usuário/agente a realizar o pagamento.
* **Segurança de Secrets:** Usamos `.dev.vars` para desenvolvimento local. No GitHub, o pipeline usa um Token Cloudflare com escopo restrito (`Workers Scripts: Edit`).
* **Resolução de Conflitos Git:** Tivemos um problema com o GitHub Push Protection devido ao vazamento acidental do token num script local. Recriamos o repositório Git local e fizemos um force push limpo. O ambiente agora está 100% seguro e sem vazamentos no histórico.

## 🚀 Next Steps (Próxima Sessão)
> *Para a próxima LLM: Comece a sessão lendo este arquivo e o `CODEBASE.md`. Pergunte ao usuário qual dos itens abaixo ele quer priorizar.*

1. **Validar Fluxo de Pagamento E2E:** O usuário deve testar a URL de checkout gerada no erro 402, simular um pagamento na Dodo Payments e usar o token retornado na API para validar se o acesso é liberado.
2. **Setup do SDK Dodo (Opcional):** Instalar o SDK oficial da Dodo Payments para validar os webhooks/pagamentos do lado do servidor de forma mais robusta, caso o método manual (headers) não seja suficiente.
3. **Monitoramento:** Adicionar logs estruturados (Console/Tail) para monitorar as chamadas bem-sucedidas e rejeitadas.
4. **Manifesto MCP:** Atualizar `src/routes/mcp.ts` para que a descoberta de ferramentas informe claramente ao agente de IA o custo em USD por requisição de scraping.
