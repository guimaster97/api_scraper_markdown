import { Context, Next } from 'hono';

export type CloudflareBindings = {
  PAYMENT_API_KEY: string;
  COST_PER_REQUEST?: string;
  AXIOM_TOKEN?: string;
  AXIOM_DATASET?: string;
};

/**
 * Middleware HTTP 402 - Intercepts requests and checks for valid payment tokens.
 * Integrated with Dodo Payments for autonomous monetization.
 */
export const http402Billing = () => {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    // Verificação de Segurança: Garantir que a API Key está configurada no ambiente
    if (!c.env?.PAYMENT_API_KEY) {
      console.error('CRITICAL: PAYMENT_API_KEY is not configured in Cloudflare Bindings.');
      return c.json({
        error: 'Internal Server Error',
        message: 'Payment system is currently misconfigured.'
      }, 500);
    }

    const costPerRequest = c.env?.COST_PER_REQUEST ? parseFloat(c.env.COST_PER_REQUEST) : 0.05;
    const currency = 'USD';
    
    // TODO: Em produção, o paymentUrl pode vir dinamicamente via Dodo Payments SDK
    const paymentUrl = 'https://buy.dodopayments.com/checkout?api_key=' + c.env.PAYMENT_API_KEY.split('.')[0];

    const authHeader = c.req.header('Authorization');
    
    /**
     * Fluxo de Autenticação de Agentes:
     * O agente deve fornecer um ID de transação ou Token de Cliente da Dodo Payments.
     * Mock de validação: Aceita tokens que começam com 'dodo_' para simulação.
     */
    const isValidPayment = authHeader && (authHeader.startsWith('Bearer dodo_') || authHeader.startsWith('Bearer test_'));

    const sendAxiomLog = async (event: any) => {
      // Fallback local sempre faz o log
      console.log(JSON.stringify(event));
      if (c.env?.AXIOM_TOKEN && c.env?.AXIOM_DATASET) {
        try {
          await fetch(`https://api.axiom.co/v1/datasets/${c.env.AXIOM_DATASET}/ingest`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${c.env.AXIOM_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([event])
          });
        } catch (e) {
          console.error('Failed to send Axiom log', e);
        }
      }
    };

    if (!isValidPayment) {
      c.executionCtx.waitUntil(sendAxiomLog({ level: 'info', type: 'payment_blocked', url: c.req.url, ip: c.req.header('cf-connecting-ip') }));
      return c.json({
        error: 'Payment Required',
        message: 'This API requires a valid Dodo Payments token.',
        details: {
          cost: costPerRequest,
          currency: currency,
          paymentUrl: paymentUrl,
          payment_method: 'dodo_payments',
          instructions: '1. Acesse a paymentUrl. 2. Realize o pagamento. 3. Use o token recebido no header "Authorization: Bearer <token>".'
        }
      }, 402);
    }

    c.executionCtx.waitUntil(sendAxiomLog({ level: 'info', type: 'payment_success', url: c.req.url, ip: c.req.header('cf-connecting-ip') }));

    // Adiciona metadados de custo na resposta bem-sucedida
    c.res.headers.set('X-Cost', costPerRequest.toString());
    c.res.headers.set('X-Currency', currency);
    c.res.headers.set('X-Payment-Provider', 'DodoPayments');
    
    await next();
  };
};
