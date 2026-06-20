import {
  ConversationRepository,
  MessageRepository,
  WhatsAppSessionRepository,
  AppointmentRepository,
} from '../repositories/index.js'
import {
  ConversationWithDetails,
  Message,
  ApiResponse,
} from '../types/index.js'
import { WhatsAppProvider } from './whatsapp-provider.js'

/**
 * ChatService — orquestra conversas e mensagens.
 *
 * Regras importantes:
 *  • Admin (role === 'admin') vê TODAS as conversas. Corretor vê só as suas
 *    (owner_user_id == userId).
 *  • Enviar mensagem (outbound) cria registro local e chama o provider de
 *    WhatsApp para envio real. Com StubProvider, nenhuma rede acontece.
 *  • Receber mensagem (inbound) cria/encontra a conversa e cria o registro.
 *    Usado tanto pelo webhook futuro quanto pelo endpoint de simulação.
 */
export class ChatService {
  private conversationRepository: ConversationRepository
  private messageRepository: MessageRepository
  private sessionRepository: WhatsAppSessionRepository
  private appointmentRepository: AppointmentRepository | null
  private whatsappProvider: WhatsAppProvider

  constructor(
    conversationRepository: ConversationRepository,
    messageRepository: MessageRepository,
    sessionRepository: WhatsAppSessionRepository,
    whatsappProvider: WhatsAppProvider,
    appointmentRepository?: AppointmentRepository
  ) {
    this.conversationRepository = conversationRepository
    this.messageRepository = messageRepository
    this.sessionRepository = sessionRepository
    this.appointmentRepository = appointmentRepository ?? null
    this.whatsappProvider = whatsappProvider
  }

  async listConversations(viewer: { userId: number; role: string }): Promise<ApiResponse<ConversationWithDetails[]>> {
    const ownerFilter = viewer.role === 'admin' ? undefined : viewer.userId
    const conversations = await this.conversationRepository.findAll(ownerFilter)
    return { data: conversations, total: conversations.length }
  }

  async getConversation(
    id: number,
    viewer: { userId: number; role: string }
  ): Promise<{ conversation: ConversationWithDetails; messages: Message[] }> {
    const existing = await this.conversationRepository.findById(id)
    if (!existing) throw new Error('Conversation not found')
    this.assertCanView(existing.owner_user_id, viewer)
    await this.conversationRepository.markAsRead(id)
    // Re-busca para devolver o estado já com unread_count zerado.
    const refreshed = (await this.conversationRepository.findById(id))!
    const messages = await this.messageRepository.findByConversation(id)
    return { conversation: refreshed, messages }
  }

  /**
   * Cria conversa nova (ou recupera a existente para o mesmo contato) e envia
   * mensagem. Usado quando o vendedor inicia conversa do zero.
   */
  async startConversation(
    viewer: { userId: number; role: string },
    contactPhone: string,
    contactName: string | null,
    initialMessage: string
  ): Promise<{ conversation: ConversationWithDetails; message: Message }> {
    if (!contactPhone) throw new Error('contact_phone is required')
    if (!initialMessage || !initialMessage.trim()) throw new Error('message is required')

    const ownerUserId = viewer.userId
    await this.assertOwnerHasSession(ownerUserId)

    const conversation = await this.conversationRepository.findOrCreate(
      ownerUserId,
      contactPhone,
      contactName
    )
    const message = await this.sendMessageInternal(conversation.id, ownerUserId, contactPhone, initialMessage)
    const enriched = await this.conversationRepository.findById(conversation.id)
    return { conversation: enriched!, message }
  }

  async sendMessage(
    conversationId: number,
    viewer: { userId: number; role: string },
    content: string
  ): Promise<Message> {
    if (!content || !content.trim()) throw new Error('message is required')
    const conversation = await this.conversationRepository.findById(conversationId)
    if (!conversation) throw new Error('Conversation not found')
    this.assertCanView(conversation.owner_user_id, viewer)
    return this.sendMessageInternal(
      conversation.id,
      conversation.owner_user_id,
      conversation.contact_phone,
      content
    )
  }

  /**
   * Simula recebimento de mensagem entrante. Em produção este caminho será
   * chamado pelo webhook do provedor real.
   */
  async receiveMessage(input: {
    ownerUserId: number
    fromPhone: string
    fromName?: string | null
    content: string
    providerMessageId?: string | null
  }): Promise<Message> {
    if (!input.content) throw new Error('content is required')
    const conversation = await this.conversationRepository.findOrCreate(
      input.ownerUserId,
      input.fromPhone,
      input.fromName ?? null
    )
    const message = await this.messageRepository.create({
      conversation_id: conversation.id,
      direction: 'inbound',
      content: input.content,
      status: 'received',
      provider_message_id: input.providerMessageId ?? null,
    })
    await this.conversationRepository.touchLastMessage(conversation.id, 'inbound')
    // Pode ter completado interação bilateral (já houve outbound antes nas 24h).
    await this.tryRegisterServiceFromConversation(conversation)
    return message
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  private async sendMessageInternal(
    conversationId: number,
    ownerUserId: number,
    contactPhone: string,
    content: string
  ): Promise<Message> {
    const session = await this.sessionRepository.findByUser(ownerUserId)
    const fromPhone = session?.phone_number || 'unknown'

    let providerMessageId: string | null = null
    let status: 'sent' | 'failed' = 'sent'
    try {
      const result = await this.whatsappProvider.sendMessage({
        ownerUserId,
        from: fromPhone,
        to: contactPhone,
        content,
      })
      providerMessageId = result.providerMessageId
    } catch (error) {
      console.error('Error sending WhatsApp message via provider:', error)
      status = 'failed'
    }

    const message = await this.messageRepository.create({
      conversation_id: conversationId,
      direction: 'outbound',
      content,
      status,
      provider_message_id: providerMessageId,
    })
    await this.conversationRepository.touchLastMessage(conversationId, 'outbound')
    // Pode ter completado interação bilateral (já houve inbound antes nas 24h).
    const conv = await this.conversationRepository.findById(conversationId)
    if (conv) await this.tryRegisterServiceFromConversation(conv)
    return message
  }

  /**
   * Regra de métrica: cada conversa do WhatsApp gera 1 atendimento (type='chat',
   * origin='whatsapp') quando há interação bilateral (envio + recebimento)
   * dentro de uma janela de 24 horas. Se já existe atendimento criado pra essa
   * conversa nas últimas 24h, NÃO cria outro — só marca como respondido se
   * faltava resposta.
   *
   * Chamado após cada send/receive. Idempotente, falhas são silenciosas (log
   * só) — não devem quebrar o fluxo de mensagem.
   */
  private async tryRegisterServiceFromConversation(
    conversation: { id: number; owner_user_id: number; contact_name?: string | null; contact_phone: string }
  ): Promise<void> {
    if (!this.appointmentRepository) return
    try {
      const bilateral = await this.messageRepository.hasBothDirectionsInWindow(conversation.id, 24)
      if (!bilateral) return

      const existing = await this.appointmentRepository.findRecentChatByConversation(conversation.id, 24)
      if (existing) {
        // Já existe um atendimento na janela — só garante que está marcado como respondido.
        if (!existing.answered) await this.appointmentRepository.markAnswered(existing.id)
        return
      }

      const clientLabel = conversation.contact_name?.trim() || conversation.contact_phone
      await this.appointmentRepository.create({
        client: clientLabel,
        type: 'chat',
        scheduled_datetime: new Date().toISOString(),
        description: 'Atendimento gerado automaticamente a partir de conversa do WhatsApp.',
        answered: true,
        property_name: null,
        user_id: conversation.owner_user_id,
        origin: 'whatsapp',
        conversation_id: conversation.id,
      })
    } catch (error) {
      console.error('[ChatService] Falha ao registrar atendimento automático:', error)
    }
  }

  private assertCanView(ownerUserId: number, viewer: { userId: number; role: string }): void {
    if (viewer.role === 'admin') return
    if (ownerUserId === viewer.userId) return
    throw new Error('forbidden')
  }

  private async assertOwnerHasSession(userId: number): Promise<void> {
    const session = await this.sessionRepository.findByUser(userId)
    if (!session || session.status !== 'connected') {
      throw new Error('whatsapp_not_connected')
    }
  }
}
