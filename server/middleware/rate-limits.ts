import rateLimit from 'express-rate-limit'

/**
 * Rate limits reutilizáveis do BRM.
 *
 * Objetivo:
 *   - Login: bloquear brute-force sem punir usuário normal digitando errado 2x
 *   - Webhooks públicos (Meta): impedir chuva de requests que derrube o app
 *
 * Não aplicamos rate-limit global — só nas rotas de risco. Chamadas
 * autenticadas do CRM normal (deals, clients, etc) rodam sem throttle porque
 * o usuário logado tá pagando, não é atacante.
 */

/**
 * Limite de LOGIN por IP. 10 tentativas/min é suficientemente frouxo pra não
 * atrapalhar quem esqueceu a senha, mas suficientemente apertado pra tornar
 * brute-force inviável.
 *
 * `standardHeaders` = envia RateLimit-* no response (padrão IETF).
 * `legacyHeaders`   = desliga os X-RateLimit-* antigos, evitando dupla info.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em 1 minuto.' },
})

/**
 * Limite pra webhooks públicos (Meta chama nossos endpoints sem auth). Aqui
 * o volume esperado é baixo (leads reais chegam em ritmo humano), mas se
 * algum ator resolver spammar, esse teto absorve o pico sem derrubar o Node.
 * A validação de assinatura HMAC continua sendo a segurança primária.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})
