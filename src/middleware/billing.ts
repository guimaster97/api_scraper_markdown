import { Context, Next } from 'hono';

export type CloudflareBindings = {
  PAYMENT_API_KEY: string;
  PAYMENT_WEBHOOK_SECRET?: string;
  COST_PER_REQUEST?: string;
  AXIOM_TOKEN?: string;
  AXIOM_DATASET?: string;
  TRIAL_KV?: KVNamespace;
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

    const costPerRequest = c.env?.COST_PER_REQUEST ? parseFloat(c.env.COST_PER_REQUEST) : 0.005;
    const currency = 'USD';
    
    // TODO: Em produção, o paymentUrl pode vir dinamicamente via Dodo Payments SDK
    const paymentUrl = 'https://buy.dodopayments.com/checkout?api_key=' + c.env.PAYMENT_API_KEY.split('.')[0];

    const authHeader = c.req.header('Authorization');
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '127.0.0.1';
    
    // Gerar um hash SHA-256 do IP para preservar a privacidade do usuário (LGPD/GDPR)
    const ipBuffer = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', ipBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    let isValidPayment = false;
    let paymentId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      
      // 1. Mock tokens support (compatibilidade com testes locais)
      if (token.startsWith('dodo_') || token.startsWith('test_')) {
        isValidPayment = true;
      } 
      // 2. Validação Real de ID de pagamento da Dodo Payments
      else if (token.startsWith('pay_') || token.startsWith('p_')) {
        paymentId = token;
        if (c.env?.TRIAL_KV) {
          try {
            const cachedCreditsStr = await c.env.TRIAL_KV.get(`payment:${paymentId}`);
            if (cachedCreditsStr !== null) {
              const remainingCredits = parseInt(cachedCreditsStr, 10);
              if (remainingCredits > 0) {
                // Decrementa 1 crédito pelo request atual
                const newCredits = remainingCredits - 1;
                await c.env.TRIAL_KV.put(`payment:${paymentId}`, newCredits.toString());
                isValidPayment = true;
              }
            } else {
              // Auto-regenerativo: Se o webhook atrasar, consulta diretamente a Dodo Payments API
              const apiKey = c.env.PAYMENT_API_KEY;
              const isTest = apiKey.includes('test') || paymentId.includes('test');
              const dodoHost = isTest ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
              
              const dodoResponse = await fetch(`${dodoHost}/payments/${paymentId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              });

              if (dodoResponse.ok) {
                const data = await dodoResponse.json() as any;
                if (data.status === 'succeeded') {
                  const amount = data.amount; // em centavos (ex: 500 para $5.00)
                  const credits = Math.floor((amount / 100) / costPerRequest);
                  if (credits > 0) {
                    const remainingCredits = credits - 1;
                    await c.env.TRIAL_KV.put(`payment:${paymentId}`, remainingCredits.toString());
                    isValidPayment = true;
                  }
                }
              }
            }
          } catch (kvErr) {
            console.error('Error verifying real payment token:', kvErr);
          }
        }
      }
    }

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

    // 1. Se o pagamento for válido, segue o fluxo normal de cobrança
    if (isValidPayment) {
      c.executionCtx.waitUntil(sendAxiomLog({ level: 'info', type: 'payment_success', url: c.req.url, ip: ipHash }));

      // Adiciona metadados de custo na resposta bem-sucedida
      c.res.headers.set('X-Cost', costPerRequest.toString());
      c.res.headers.set('X-Currency', currency);
      c.res.headers.set('X-Payment-Provider', 'DodoPayments');
      
      await next();
      return;
    }

    // 2. Se não houver pagamento válido, verifica se há trial/quota gratuita baseada no IP via TRIAL_KV
    const TRIAL_LIMIT = 5;
    if (c.env?.TRIAL_KV) {
      try {
        const trialCountStr = await c.env.TRIAL_KV.get(ipHash);
        const trialCount = trialCountStr ? parseInt(trialCountStr, 10) : 0;

        if (trialCount < TRIAL_LIMIT) {
          const newCount = trialCount + 1;
          await c.env.TRIAL_KV.put(ipHash, newCount.toString());
          
          const remaining = TRIAL_LIMIT - newCount;

          c.executionCtx.waitUntil(sendAxiomLog({
            level: 'info',
            type: 'payment_trial_active',
            url: c.req.url,
            ip: ipHash,
            trial_count: newCount,
            remaining
          }));

          // Adiciona metadados de trial na resposta bem-sucedida
          c.res.headers.set('X-Trial-Active', 'true');
          c.res.headers.set('X-Trial-Remaining', remaining.toString());
          c.res.headers.set('X-Trial-Limit', TRIAL_LIMIT.toString());
          
          await next();
          return;
        } else {
          // Trial esgotado
          c.executionCtx.waitUntil(sendAxiomLog({
            level: 'info',
            type: 'payment_trial_exhausted',
            url: c.req.url,
            ip: ipHash,
            trial_count: trialCount
          }));

          return c.json({
            error: 'Payment Required',
            message: `Your free trial quota has been exhausted (${TRIAL_LIMIT} requests limit reached). Please pay to continue using the API.`,
            details: {
              trial_limit: TRIAL_LIMIT,
              cost: costPerRequest,
              currency: currency,
              paymentUrl: paymentUrl,
              payment_method: 'dodo_payments',
              instructions: '1. Acesse a paymentUrl. 2. Realize o pagamento. 3. Use o token recebido no header "Authorization: Bearer <token>".'
            }
          }, 402);
        }
      } catch (kvError) {
        console.error('Error reading/writing to TRIAL_KV:', kvError);
        // Fallback seguro caso o KV falhe: exige pagamento para evitar abuso
      }
    }

    // 3. Fallback: Se o trial não puder ser verificado ou foi esgotado, bloqueia com 402 padrão
    c.executionCtx.waitUntil(sendAxiomLog({ level: 'info', type: 'payment_blocked', url: c.req.url, ip: ipHash, has_auth: !!authHeader }));
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
  };
};
