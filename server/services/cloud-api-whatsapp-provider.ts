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
 * Normaliza celular BR pro formato aceito pelo WhatsApp Cloud API.
 * Celulares BR tem 13 dig (55 + DDD 2 dig + 9 + 8 dig), mas o wa_id da Meta
 * vem sempre no formato antigo com 12 dig (55 + DDD + 8 dig, sem o 9).
 * Removemos o 9 pra que respostas a mensagens recebidas usem o mesmo wa_id
 * que a Meta usa — evita erro #131030 quando o numero autorizado no modo
 * teste foi cadastrado com 9.
 * Fixos BR (13 dig sem 9 no lugar 4) e demais paises passam sem alteracao.
 */
function normalizeBrCellPhone(digits: string): string {
  if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') {
    return digits.slice(0, 4) + digits.slice(5)
  }
  return digits
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
    // Pra celular BR, remove o 9 depois do DDD — Meta usa o wa_id no formato
    // antigo (12 dig: 55 + DDD + 8 dig) e nao no formato atual (13 dig com 9).
    // Sem essa normalizacao, respostas a mensagens recebidas caem no erro
    // #131030 (nao autorizado) porque o numero salvo na conversa e o wa_id
    // sem 9, mas o usuario cadastrou/autorizou com 9.
    const to = normalizeBrCellPhone(input.to.replace(/\D/g, ''))
    const url = `https://graph.facebook.com/v18.0/${session.phone_number_id}/messages`

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

    if (!response.ok) {
      const errBody: any = await response.json().catch(() => ({}))
      const errMsg = errBody?.error?.message || response.statusText
      const errCode = errBody?.error?.code

      // 401/403 = token inválido. Marca a sessão como invalid_credentials
      // pra UI poder pedir que o user atualize as credenciais.
      if (response.status === 401 || response.status === 403 || errCode === 190) {
        // Provider não conhece accountId — variante interna (rule 9).
        await this.sessionRepository
          .updateStatusInternal(input.ownerUserId, 'invalid_credentials')
          .catch(() => undefined)
      }
      throw new Error(`Cloud API error (${response.status}): ${errMsg}`)
    }

    const data: any = await response.json()
    const providerMessageId = data?.messages?.[0]?.id || `cloud-api-${Date.now()}`
    return { providerMessageId }
  }
}
