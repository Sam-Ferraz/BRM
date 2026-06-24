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
    const session = await this.sessionRepository.findByUser(ownerUserId)
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
    await this.sessionRepository
      .updateStatus(ownerUserId, 'disconnected')
      .catch((error) => console.error('[CloudAPI] Erro stopSession:', error))
  }

  async sendMessage(input: {
    ownerUserId: number
    from: string
    to: string
    content: string
  }): Promise<SendMessageResult> {
    const session = await this.sessionRepository.findByUser(input.ownerUserId)
    if (!session || !session.phone_number_id || !session.access_token) {
      throw new Error('whatsapp_not_connected')
    }

    // TODO mini-entrega 2: chamar Graph API real
    //   POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
    //   Authorization: Bearer {access_token}
    //   Body: { messaging_product: 'whatsapp', to: '<digits>', text: { body: content } }
    console.log(
      `[CloudAPI Stub] user=${input.ownerUserId} ${input.from} → ${input.to}: ${input.content}`
    )

    const providerMessageId = `cloud-api-stub-${Date.now()}`
    return { providerMessageId }
  }
}
