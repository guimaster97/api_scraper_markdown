# 💾 STATE.md (Session Memory)

> **ATENÇÃO LLMs:** Leia este arquivo para continuar o trabalho de onde a última sessão parou. Ao final de cada sessão, VOCÊ DEVE ATUALIZAR ESTE ARQUIVO.

## 🟢 Status Atual
**Fase do Projeto:** Produção & Monetização Ativa.
**Última Atualização:** Integração da `PAYMENT_API_KEY` do Dodo Payments, criação de `.dev.vars` para ambiente local e implementação de testes unitários para o middleware de billing.

## 🧠 Memória e Decisões Recentes
* **Billing Real:** Substituímos o mock de billing por uma validação que exige a presença de segredos reais. O sistema agora retorna um link de checkout da Dodo Payments no erro 402.
* **Segurança de Secrets:** Definimos que o deploy via GitHub Actions usará um Token de API restrito (Princípio do Menor Privilégio).
* **Testes:** Adicionamos o Vitest ao pipeline de CI. O deploy só ocorre se os testes passarem.

## 🚀 Next Steps (Próxima Sessão)
1. **Validar Checkout Real:** Fazer um teste de ponta a ponta usando um token real gerado após um pagamento no ambiente de sandbox da Dodo.
2. **Monitoramento:** Adicionar logs estruturados para monitorar o custo acumulado por usuário/agente.
3. **MCP Enhancement:** Atualizar o manifesto MCP para incluir o custo estimado por tarefa de scraping.
