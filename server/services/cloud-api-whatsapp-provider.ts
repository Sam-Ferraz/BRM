import {
  WhatsAppProvider,
  SendMessageResult,
  SessionState,
} from './whatsapp-provider.js'
import { WhatsAppSessionRepository } from '../repositories/index.js'

/**
 * Callback chamado quando uma mensagem entrante chega via webhook do
 * Meta Cloud API. O server/index.ts conecta isso ao ChatService.receiveMessage.
 */
/**
 * Retorna variantes do numero pra tentar em ordem no envio. Pra celular BR
 * existem 2 formatos usados por WhatsApp:
 *   - 13 dig: 55 + DDD (2) + 9 + 8 (formato atual, brasileiro comum)
 *   - 12 dig: 55 + DDD (2) + 8 (formato antigo, usado pelo wa_id da Meta)
 *
 * A Cloud API em geral aceita os dois; MAS a lista de destinatarios
 * autorizados do modo TESTE bate por string exata — se o usuario autorizou
 * com 9 e a Meta entrega wa_id sem 9, respostas caem em #131030.
 *
 * Retornamos o input primeiro, depois a variante alternativa (se aplicavel),
 * pra que o sendMessage tente ambas antes de desistir. Em producao, com
 * numero real e sem lista de autorizados, a primeira ja sempre passa.
 */
function brPhoneVariants(digits: string): string[] {
  if (digits.startsWith('55')) {
    // Celular atual (13 dig com 9): oferece variante sem 9
    if (digits.length === 13 && digits[4] === '9') {
      return [digits, digits.slice(0, 4) + digits.slice(5)]
    }
    // Formato antigo/wa_id (12 dig sem 9): oferece variante com 9 pra celular
    // Assumimos que o DDD comum de celular e >= 11; adiciona o 9 apos DDD.
    if (digits.length === 12) {
      return [digits, digits.slice(0, 4) + '9' + digits.slice(4)]
    }
  }
  return [digits]
}

export type IncomingMessageHandler = (input: {
  ownerUserId: number
  fromPhone: string
  fromName?: string | null
  content: string
  providerMessageId?: string | null
}) => Promise<unknown>

/**
 * Implementação do WhatsAppProvider usando WhatsApp Cloud API (Graph API
 * v18.0+) da Meta — caminho oficial pra automações em escala. Sem risco
 * de ban (diferente do Baileys), porém pago por conversa de 24h
 * (1000 grátis/mês por número).
 *
 * Modelo BYOK (Bring Your Own Keys):
 *   Cada usuário do BRM cadastra suas próprias credenciais Meta
 *   (phone_number_id, access_token, app_secret) na UI. Essas credenciais
 *   ficam em whatsapp_sessions e são lidas em cada chamada à Graph API.
 *
 * Webhook:
 *   O Meta envia eventos (mensagens recebidas, status de entrega) pra
 *   um único endpoint POST /api/whatsapp/webhook do BRM. O endpoint
 *   consulta whatsapp_sessions pelo phone_number_id do payload pra
 *   rotear ao usuário correto antes de chamar incoming().
 *
 * IMPORTANTE: Este arquivo é o esqueleto da mini-entrega 1. Os métodos
 * sendMessage/startSession/stopSession terão a lógica real preenchida
 * na mini-entrega 2 — agora só validam dados e logam.
 */
export class CloudApiWhatsAppProvider implements WhatsAppProvider {
  private incoming: IncomingMessageHandler
  private sessionRepository: WhatsAppSessionRepository

  constructor(opts: {
    incoming: IncomingMessageHandler
    sessionRepository: WhatsAppSessionRepository
  }) {
    this.incoming = opts.incoming
    this.sessionRepository = opts.sessionRepository
  }

  /**
   * No modelo Cloud API + BYOK, não existe "iniciar sessão" pela API — o
   * usuário cadastra as credenciais via UI e elas ficam persistidas. Este
   * método apenas valida e retorna o estado atual.
   */
  async startSession(ownerUserId: number): Promise<SessionState> {
    // Provider não conhece accountId — variante interna (rule 9).
    const session = await this.sessionRepository.findByUserInternal(ownerUserId)
    if (!session) {
      return { status: 'pending_setup' }
    }
    if (!session.phone_number_id || !session.access_token) {
      return { status: 'pending_setup', phoneNumber: session.phone_number }
    }
    return {
      status: 'connected',
      phoneNumber: session.phone_number,
      displayName: session.display_name,
    }
  }

  getSessionState(_ownerUserId: number): SessionState {
    // Cloud API não tem estado em memória — sempre lê do banco em startSession.
    // Retorna 'idle' aqui; o frontend chama startSession pra obter o estado real.
    return { status: 'idle' }
  }

  async stopSession(ownerUserId: number): Promise<void> {
    // Marca como desconectado sem apagar credenciais — usuário pode reativar.
    // Provider não conhece accountId — variante interna (rule 9).
    await this.sessionRepository
      .updateStatusInternal(ownerUserId, 'disconnected')
      .catch((error) => console.error('[CloudAPI] Erro stopSession:', error))
  }

  async sendMessage(input: {
    ownerUserId: number
    from: string
    to: string
    content: string
  }): Promise<SendMessageResult> {
    // Provider não conhece accountId — variante interna (rule 9).
    const session = await this.sessionRepository.findByUserInternal(input.ownerUserId)
    if (!session || !session.phone_number_id || !session.access_token) {
      throw new Error('whatsapp_not_connected')
    }

    // WhatsApp Cloud API espera o "to" só com dígitos (E.164 sem o +).
    const digits = input.to.replace(/\D/g, '')
    const variants = brPhoneVariants(digits)
    const url = `https://graph.facebook.com/v18.0/${session.phone_number_id}/messages`

    let lastError: { status: number; msg: string; code?: number } | null = null

    for (const to of variants) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: input.content },
        }),
      })

      if (response.ok) {
        const data: any = await response.json()
        const providerMessageId = data?.messages?.[0]?.id || `cloud-api-${Date.now()}`
        return { providerMessageId }
      }

      const errBody: any = await response.json().catch(() => ({}))
      lastError = {
        status: response.status,
        msg: errBody?.error?.message || response.statusText,
        code: errBody?.error?.code,
      }

      // 401/403 = token inválido. Marca a sessão como invalid_credentials
      // e para de tentar variantes (o problema nao vai mudar).
      if (response.status === 401 || response.status === 403 || lastError.code === 190) {
        await this.sessionRepository
          .updateStatusInternal(input.ownerUserId, 'invalid_credentials')
          .catch(() => undefined)
        break
      }

      // Se nao for erro de numero nao autorizado, para de tentar variantes.
      if (lastError.code !== 131030) break
    }

    throw new Error(`Cloud API error (${lastError?.status}): ${lastError?.msg}`)
  }
}
