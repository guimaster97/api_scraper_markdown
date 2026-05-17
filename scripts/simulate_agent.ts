import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Pega a URL dos argumentos ou usa o wrangler local como fallback
const API_URL = process.argv[2] || 'http://localhost:8787/scrape';
const TARGET_URL = 'https://news.ycombinator.com'; // Exemplo real para extrair

async function run() {
  console.log(`🤖 [Agent] Iniciando simulação de extração de dados...`);
  console.log(`🤖 [Agent] URL Alvo: ${TARGET_URL}`);
  console.log(`🤖 [Agent] Endpoint da API: ${API_URL}\n`);

  // PASSO 1: Tentativa sem token (Gatilho do Funil 402)
  console.log(`[Passo 1] Enviando requisição inicial sem header Authorization...`);
  const res1 = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: TARGET_URL })
  });

  if (res1.status === 402) {
    console.log(`✅ [Sucesso] A API barrou o Agente e retornou HTTP 402 Payment Required!`);
    const data = await res1.json();
    
    console.log(`\n--- Informações Lidas pelo Agente Autônomo ---`);
    console.log(`Custo da Chamada: ${data.details.cost} ${data.details.currency}`);
    console.log(`Motivo: ${data.message}`);
    console.log(`URL de Pagamento: \x1b[36m${data.details.paymentUrl}\x1b[0m`);
    console.log(`Instruções: ${data.details.instructions}`);
    console.log(`----------------------------------------------\n`);

    // PASSO 2: Intervenção Humana / Processamento do Pagamento
    console.log(`🚨 [Atenção] Como agente, não tenho cartão. Solicitando intervenção do usuário...`);
    rl.question(`👉 [Ação Humana] Clique no link azul acima, faça o pagamento (use cartão de teste da Dodo) e cole o Token retornado (ex: dodo_...):\n> `, async (token) => {
      
      const cleanToken = token.trim();
      if (!cleanToken) {
        console.log(`❌ Operação cancelada. Sem token, o Agente não prossegue.`);
        rl.close();
        return;
      }

      // PASSO 3: Refazer requisição com Token Autorizado
      console.log(`\n[Passo 3] Agente refazendo a requisição com o token pago...`);
      const res2 = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        },
        body: JSON.stringify({ url: TARGET_URL })
      });

      if (res2.status === 200) {
        console.log(`✅ [Sucesso] Recebido HTTP 200 OK! A extração foi permitida.`);
        const data2 = await res2.json();
        console.log(`\n--- Preview do Markdown Extraído (primeiros 300 chars) ---`);
        console.log('\x1b[32m' + data2.markdown.substring(0, 300) + '...\x1b[0m\n');
        console.log(`💸 Funil E2E concluído com sucesso! Os logs devem ter sido enviados ao Axiom.`);
      } else {
        console.log(`❌ [Erro] Falha ao usar o token. A API retornou Status: ${res2.status}`);
        const errData = await res2.text();
        console.log(`Detalhes do Erro: ${errData}`);
      }
      rl.close();
    });

  } else {
    console.log(`⚠️ [Aviso Crítico] O servidor não retornou 402. Status recebido: ${res1.status}. O sistema de billing no middleware está funcionando?`);
    const data = await res1.text();
    console.log(data);
    rl.close();
  }
}

run().catch(err => {
  console.error("Erro fatal:", err);
  rl.close();
});
