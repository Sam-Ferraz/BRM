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
 *  • Admin (role === 'admin') vê TODAS as conversas da account. Corretor vê
 *    só as suas (owner_user_id == userId).
 *  • Enviar mensagem (outbound) cria registro local e chama o provider de
 *    WhatsApp para envio real. Com StubProvider, nenhuma rede acontece.
 *  • Receber mensagem (inbound) cria/encontra a conversa e cria o registro.
 *    Usado tanto pelo webhook do provedor real quanto pelo endpoint de
 *    simulação.
 *  • Multi-tenancy: todos os métodos exigem accountId. Em fluxos onde o
 *    caller não conhece accountId (provider Baileys/CloudApi via incoming
 *    handler), receiveMessage aceita accountId opcional e deriva a partir
 *    da sessão do owner_user_id (rule 9).
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

  async listConversations(accountId: number, viewer: { userId: number; role: string }): Promise<ApiResponse<ConversationWithDetails[]>> {
    const ownerFilter = viewer.role === 'admin' ? undefined : viewer.userId
    const conversations = await this.conversationRepository.findAll(accountId, ownerFilter)
    return { data: conversations, total: conversations.length }
  }

  async getConversation(
    accountId: number,
    id: number,
    viewer: { userId: number; role: string }
  ): Promise<{ conversation: ConversationWithDetails; messages: Message[] }> {
    const existing = await this.conversationRepository.findById(accountId, id)
    if (!existing) throw new Error('Conversation not found')
    this.assertCanView(existing.owner_user_id, viewer)
    await this.conversationRepository.markAsRead(accountId, id)
    // Re-busca para devolver o estado já com unread_count zerado.
    const refreshed = (await this.conversationRepository.findById(accountId, id))!
    const messages = await this.messageRepository.findByConversation(accountId, id)
    return { conversation: refreshed, messages }
  }

  async deleteConversation(
    accountId: number,
    id: number,
    viewer: { userId: number; role: string }
  ): Promise<{ deleted: boolean }> {
    const existing = await this.conversationRepository.findById(accountId, id)
    if (!existing) throw new Error('Conversation not found')
    this.assertCanView(existing.owner_user_id, viewer)
    const deleted = await this.conversationRepository.deleteById(accountId, id)
    return { deleted }
  }

  /**
   * Cria conversa nova (ou recupera a existente para o mesmo contato) e envia
   * mensagem. Usado quando o vendedor inicia conversa do zero.
   */
  async startConversation(
    accountId: number,
    viewer: { userId: number; role: string },
    contactPhone: string,
    contactName: string | null,
    initialMessage: string
  ): Promise<{ conversation: ConversationWithDetails; message: Message }> {
    if (!contactPhone) throw new Error('contact_phone is required')
    if (!initialMessage || !initialMessage.trim()) throw new Error('message is required')

    const ownerUserId = viewer.userId
    await this.assertOwnerHasSession(accountId, ownerUserId)

    const conversation = await this.conversationRepository.findOrCreate(
      accountId,
      ownerUserId,
      contactPhone,
      contactName
    )
    const message = await this.sendMessageInternal(accountId, conversation.id, ownerUserId, contactPhone, initialMessage)
    const enriched = await this.conversationRepository.findById(accountId, conversation.id)
    return { conversation: enriched!, message }
  }

  async sendMessage(
    accountId: number,
    conversationId: number,
    viewer: { userId: number; role: string },
    content: string
  ): Promise<Message> {
    if (!content || !content.trim()) throw new Error('message is required')
    const conversation = await this.conversationRepository.findById(accountId, conversationId)
    if (!conversation) throw new Error('Conversation not found')
    this.assertCanView(conversation.owner_user_id, viewer)
    return this.sendMessageInternal(
      accountId,
      conversation.id,
      conversation.owner_user_id,
      conversation.contact_phone,
      content
    )
  }

  /**
   * Simula/roteia recebimento de mensagem entrante. Em produção este caminho
   * é chamado pelo webhook do provedor real e pelo callback incoming dos
   * providers (Baileys/CloudApi).
   *
   * accountId é opcional (rule 9) porque os providers não conhecem essa
   * informação em memória — quando omitido, deriva via lookup da sessão
   * do ownerUserId (session.account_id). Callers autenticados (rota
   * /inbound) e o webhook DEVEM passar accountId explicitamente.
   */
  async receiveMessage(input: {
    accountId?: number
    ownerUserId: number
    fromPhone: string
    fromName?: string | null
    content: string
    providerMessageId?: string | null
    // Mensagens de midia (imagem/audio/video/documento) baixadas pelo provider
    // e salvas em /uploads/whatsapp/... — URL relativa ao servidor.
    mediaUrl?: string | null
    // Tipo semantico. O schema atual so tem media_url, entao guardamos o tipo
    // implicitamente pela extensao do arquivo — o frontend detecta e renderiza
    // image/audio/video adequadamente.
    mediaType?: 'image' | 'audio' | 'video' | 'document' | 'call_missed' | null
  }): Promise<Message> {
    if (!input.content) throw new Error('content is required')

    let accountId = input.accountId
    if (accountId === undefined) {
      const session = await this.sessionRepository.findByUserInternal(input.ownerUserId)
      if (!session) throw new Error('whatsapp_session_not_found')
      accountId = session.account_id
    }

    const conversation = await this.conversationRepository.findOrCreate(
      accountId,
      input.ownerUserId,
      input.fromPhone,
      input.fromName ?? null
    )
    const message = await this.messageRepository.create(accountId, {
      conversation_id: conversation.id,
      direction: 'inbound',
      content: input.content,
      media_url: input.mediaUrl ?? null,
      status: 'received',
      provider_message_id: input.providerMessageId ?? null,
    })
    await this.conversationRepository.touchLastMessage(accountId, conversation.id, 'inbound')
    // Pode ter completado interação bilateral (já houve outbound antes nas 24h).
    await this.tryRegisterServiceFromConversation(accountId, conversation)
    return message
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  private async sendMessageInternal(
    accountId: number,
    conversationId: number,
    ownerUserId: number,
    contactPhone: string,
    content: string
  ): Promise<Message> {
    const session = await this.sessionRepository.findByUser(accountId, ownerUserId)
    const fromPhone = session?.phone_number || 'unknown'

    let providerMessageId: string | null = null
    let status: 'sent' | 'failed' = 'sent'
    let providerError: Error | null = null
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
      providerError = error instanceof Error ? error : new Error(String(error))
    }

    const message = await this.messageRepository.create(accountId, {
      conversation_id: conversationId,
      direction: 'outbound',
      content,
      status,
      provider_message_id: providerMessageId,
    })
    await this.conversationRepository.touchLastMessage(accountId, conversationId, 'outbound')
    // Propaga o erro real do provider (Cloud API 400/401/etc) pro handler HTTP,
    // que devolve pro toast do BRM. A mensagem fica salva com status='failed'
    // pra ficar registro visual, mas o toast avisa o motivo (ex: destinatário
    // não autorizado no modo teste, token expirado, phone number id errado).
    if (providerError) throw providerError
    // Pode ter completado interação bilateral (já houve inbound antes nas 24h).
    const conv = await this.conversationRepository.findById(accountId, conversationId)
    if (conv) await this.tryRegisterServiceFromConversation(accountId, conv)
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
    accountId: number,
    conversation: { id: number; owner_user_id: number; contact_name?: string | null; contact_phone: string }
  ): Promise<void> {
    if (!this.appointmentRepository) return
    try {
      const bilateral = await this.messageRepository.hasBothDirectionsInWindow(accountId, conversation.id, 24)
      if (!bilateral) return

      const existing = await this.appointmentRepository.findRecentChatByConversation(accountId, conversation.id, 24)
      if (existing) {
        // Já existe um atendimento na janela — só garante que está marcado como respondido.
        if (!existing.answered) await this.appointmentRepository.markAnswered(accountId, existing.id)
        return
      }

      const clientLabel = conversation.contact_name?.trim() || conversation.contact_phone
      await this.appointmentRepository.create(accountId, {
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

  private async assertOwnerHasSession(accountId: number, userId: number): Promise<void> {
    const session = await this.sessionRepository.findByUser(accountId, userId)
    if (!session || session.status !== 'connected') {
      throw new Error('whatsapp_not_connected')
    }
  }
}
