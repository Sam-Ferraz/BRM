import {
  ConversationRepository,
  MessageRepository,
  WhatsAppSessionRepository,
  AppointmentRepository,
  DealRepository,
} from '../repositories/index.js'
import {
  ConversationWithDetails,
  Message,
  ApiResponse,
} from '../types/index.js'
import { WhatsAppProvider } from './whatsapp-provider.js'
import { ChatEventBus } from './chat-event-bus.js'

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
  private dealRepository: DealRepository | null = null
  private whatsappProvider: WhatsAppProvider
  private eventBus: ChatEventBus | null = null

  constructor(
    conversationRepository: ConversationRepository,
    messageRepository: MessageRepository,
    sessionRepository: WhatsAppSessionRepository,
    whatsappProvider: WhatsAppProvider,
    appointmentRepository?: AppointmentRepository,
    eventBus?: ChatEventBus,
    dealRepository?: DealRepository,
  ) {
    this.conversationRepository = conversationRepository
    this.messageRepository = messageRepository
    this.sessionRepository = sessionRepository
    this.appointmentRepository = appointmentRepository ?? null
    this.whatsappProvider = whatsappProvider
    this.eventBus = eventBus ?? null
    this.dealRepository = dealRepository ?? null
  }

  /** Helper interno: emite se o bus foi injetado. Nao quebra fluxo se null. */
  private emitEvent(ev: Parameters<NonNullable<ChatService['eventBus']>['emit']>[0]): void {
    try {
      this.eventBus?.emit(ev)
    } catch (err) {
      console.error('[ChatService] erro emitindo evento:', err)
    }
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
    // Emite 'read' com patch (unread zerado) pra outros clientes SSE
    // atualizarem o badge sem precisar refetch da lista de conversas
    this.emitEvent({
      kind: 'read',
      accountId,
      ownerUserId: existing.owner_user_id,
      conversationId: id,
      conversationPatch: { unread_count: 0 },
    })
    // Re-busca para devolver o estado já com unread_count zerado.
    const refreshed = (await this.conversationRepository.findById(accountId, id))!
    const messages = await this.messageRepository.findByConversation(accountId, id)
    return { conversation: refreshed, messages }
  }

  /**
   * Apaga uma msg (qualquer status). Nao apaga do WhatsApp — so do BRM.
   */
  async deleteMessage(
    accountId: number,
    messageId: number,
    viewer: { userId: number; role: string },
  ): Promise<{ deleted: boolean; conversation_id: number | null }> {
    const msg = await this.messageRepository.findById(accountId, messageId)
    if (!msg) throw new Error('Message not found')
    const conv = await this.conversationRepository.findById(accountId, msg.conversation_id)
    if (!conv) throw new Error('Conversation not found')
    this.assertCanView(conv.owner_user_id, viewer)
    const deleted = await this.messageRepository.deleteById(accountId, messageId)
    return { deleted, conversation_id: msg.conversation_id }
  }

  /**
   * Reenvia uma msg outbound (tipicamente uma 'failed'). Nao modifica a antiga
   * — cria uma nova com o mesmo conteudo pra o WhatsApp gerar um novo
   * providerMessageId. A antiga fica no historico (usuario pode apagar
   * manualmente se quiser).
   */
  async resendMessage(
    accountId: number,
    messageId: number,
    viewer: { userId: number; role: string },
  ): Promise<Message> {
    const msg = await this.messageRepository.findById(accountId, messageId)
    if (!msg) throw new Error('Message not found')
    if (msg.direction !== 'outbound') throw new Error('cannot resend inbound message')
    const conv = await this.conversationRepository.findById(accountId, msg.conversation_id)
    if (!conv) throw new Error('Conversation not found')
    this.assertCanView(conv.owner_user_id, viewer)
    return this.sendMessageInternal(
      accountId,
      conv.id,
      conv.owner_user_id,
      conv.contact_phone,
      msg.content,
    )
  }

  /**
   * Registra uma ligacao manualmente numa conversa (nao envia nada pro
   * WhatsApp — apenas cria msg no historico). Serve pra corretor logar
   * ligacoes feitas/recebidas fora do canal. Formato: content prefixa
   * '📞 ' que o frontend ja reconhece pra renderizar com icone de telefone.
   */
  async logCall(
    accountId: number,
    conversationId: number,
    viewer: { userId: number; role: string },
    input: { direction: 'inbound' | 'outbound'; duration_minutes?: number | null; notes?: string | null },
  ): Promise<Message> {
    const conv = await this.conversationRepository.findById(accountId, conversationId)
    if (!conv) throw new Error('Conversation not found')
    this.assertCanView(conv.owner_user_id, viewer)

    const dir = input.direction === 'inbound' ? 'recebida' : 'realizada'
    const parts = [`📞 Ligação ${dir}`]
    if (input.duration_minutes && input.duration_minutes > 0) parts.push(`(${input.duration_minutes} min)`)
    if (input.notes?.trim()) parts.push(`— ${input.notes.trim()}`)
    const content = parts.join(' ')

    const message = await this.messageRepository.create(accountId, {
      conversation_id: conversationId,
      direction: input.direction,
      content,
      // call log entra como 'sent' (outbound) ou 'received' (inbound) direto
      status: input.direction === 'outbound' ? 'sent' : 'received',
      provider_message_id: null,
    })
    await this.conversationRepository.touchLastMessage(accountId, conversationId, input.direction)
    // Mesma regra de atendimento automatico das demais interacoes
    await this.tryRegisterServiceFromConversation(accountId, conv)
    return message
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
  /**
   * Abre (ou cria) uma conversa vazia com o contato — usado quando o
   * usuario clica num contato da aba Contatos pra abrir o chat sem
   * enviar mensagem inicial. Nao exige WhatsApp conectado.
   */
  async openConversation(
    accountId: number,
    viewer: { userId: number; role: string },
    contactPhone: string,
    contactName: string | null,
  ): Promise<{ conversation: ConversationWithDetails }> {
    if (!contactPhone) throw new Error('contact_phone is required')
    const ownerUserId = viewer.userId
    const conversation = await this.conversationRepository.findOrCreate(
      accountId,
      ownerUserId,
      contactPhone,
      contactName,
    )
    const enriched = await this.conversationRepository.findById(accountId, conversation.id)
    return { conversation: enriched! }
  }

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
   * Envia midia (imagem/audio/video/documento) numa conversa existente.
   * Salva o buffer em disco (uploads/whatsapp/{ownerUserId}/{filename})
   * e dispara o send via provider (Baileys). O media_url e persistido na
   * mensagem outbound pra o frontend renderizar de volta.
   */
  async sendMediaMessage(
    accountId: number,
    conversationId: number,
    viewer: { userId: number; role: string },
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    caption?: string,
  ): Promise<Message> {
    const conversation = await this.conversationRepository.findById(accountId, conversationId)
    if (!conversation) throw new Error('Conversation not found')
    this.assertCanView(conversation.owner_user_id, viewer)

    // Detecta tipo pela mimetype pra escolher payload do Baileys
    const mime = (file.mimetype || '').toLowerCase()
    const kind: 'image' | 'audio' | 'video' | 'document' = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('audio/')
      ? 'audio'
      : mime.startsWith('video/')
      ? 'video'
      : 'document'

    // Salva arquivo local pra servir depois via /uploads/*
    const path = await import('path')
    const fs = await import('fs/promises')
    const timestamp = Date.now()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `out-${timestamp}-${safeName}`
    const relDir = path.join('uploads', 'whatsapp', String(conversation.owner_user_id))
    const absDir = path.resolve(relDir)
    await fs.mkdir(absDir, { recursive: true })
    await fs.writeFile(path.join(absDir, filename), file.buffer)
    const mediaUrl = `/${relDir.replace(/\\/g, '/')}/${filename}`

    // Envia via provider (Baileys hoje; CloudApi lanca media_not_supported)
    const session = await this.sessionRepository.findByUser(accountId, conversation.owner_user_id)
    const fromPhone = session?.phone_number || 'unknown'

    let providerMessageId: string | null = null
    let status: 'sent' | 'failed' = 'sent'
    let providerError: Error | null = null
    try {
      if (!(this.whatsappProvider as any).sendMedia) {
        throw new Error('Este provider nao suporta envio de midia. Use WhatsApp Web (Baileys).')
      }
      const result = await (this.whatsappProvider as any).sendMedia({
        ownerUserId: conversation.owner_user_id,
        from: fromPhone,
        to: conversation.contact_phone,
        buffer: file.buffer,
        mimetype: file.mimetype,
        filename: file.originalname,
        caption: caption ?? null,
        kind,
      })
      providerMessageId = result.providerMessageId
    } catch (error) {
      console.error('Error sending media via provider:', error)
      status = 'failed'
      providerError = error instanceof Error ? error : new Error(String(error))
    }

    const contentLabel = caption?.trim() || {
      image: '🖼️ Imagem',
      audio: '🎤 Áudio',
      video: '🎬 Vídeo',
      document: '📎 Documento',
    }[kind]

    const message = await this.messageRepository.create(accountId, {
      conversation_id: conversationId,
      direction: 'outbound',
      content: contentLabel,
      media_url: mediaUrl,
      status,
      provider_message_id: providerMessageId,
    })
    await this.conversationRepository.touchLastMessage(accountId, conversationId, 'outbound')
    // Push real-time com payload rico: SSE ja leva a Message pra UI dar
    // append direto sem refetch; conversationPatch leva campos atualizados
    // pra lista de conversas re-renderizar sem listConversations.
    const conv = await this.conversationRepository.findById(accountId, conversationId)
    if (conv) this.emitEvent({
      kind: 'message',
      accountId,
      ownerUserId: conv.owner_user_id,
      conversationId,
      message,
      conversationPatch: {
        last_message_at: message.sent_at ? new Date(message.sent_at).toISOString() : null,
        last_message_preview: message.content ?? null,
        last_message_direction: 'outbound',
        unread_count: conv.unread_count ?? 0,
      },
    })
    if (providerError) throw providerError
    return message
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
    // Direcao: 'inbound' (default) = cliente pro corretor. 'outbound' =
    // corretor mandou do celular (Baileys emitOwnEvents=true captura isso).
    direction?: 'inbound' | 'outbound'
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

    // Deduplicacao: se essa msg ja foi salva (BRM enviou e agora Baileys
    // reflete via emitOwnEvents), retorna a existente sem duplicar.
    if (input.providerMessageId) {
      const existing = await this.messageRepository.findByProviderMessageId(
        accountId,
        input.providerMessageId,
      ).catch(() => null)
      if (existing) return existing
    }

    const direction = input.direction ?? 'inbound'
    const message = await this.messageRepository.create(accountId, {
      conversation_id: conversation.id,
      direction,
      content: input.content,
      media_url: input.mediaUrl ?? null,
      status: direction === 'outbound' ? 'sent' : 'received',
      provider_message_id: input.providerMessageId ?? null,
    })
    await this.conversationRepository.touchLastMessage(accountId, conversation.id, 'inbound')
    // Push real-time com payload rico (ver comentario na midia outbound)
    this.emitEvent({
      kind: 'message',
      accountId,
      ownerUserId: conversation.owner_user_id,
      conversationId: conversation.id,
      message,
      conversationPatch: {
        last_message_at: message.sent_at ? new Date(message.sent_at).toISOString() : null,
        last_message_preview: message.content ?? null,
        last_message_direction: direction === 'outbound' ? 'outbound' : 'inbound',
        // Inbound incrementa unread, outbound (fromMe do emitOwnEvents) nao
        unread_count: direction === 'outbound' ? conversation.unread_count ?? 0 : (conversation.unread_count ?? 0) + 1,
      },
    })
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
    // Push real-time com payload rico (ver comentario na midia outbound)
    this.emitEvent({
      kind: 'message',
      accountId,
      ownerUserId,
      conversationId,
      message,
      conversationPatch: {
        last_message_at: message.sent_at ? new Date(message.sent_at).toISOString() : null,
        last_message_preview: message.content ?? null,
        last_message_direction: 'outbound',
        // Outbound nao mexe no unread do destinatario; preserva o atual
      },
    })
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
   * Regra do atendimento (metrica do grafico Atendimentos & Visitas):
   *
   * 1 atendimento = 1 conversa que teve INTERACAO BILATERAL (ao menos 1 msg
   * inbound E 1 msg outbound) dentro do mesmo DIA-CALENDARIO em
   * America/Sao_Paulo (00:00-23:59). O numero de mensagens em cada direcao
   * nao importa. Virada do dia reseta: 23:59 + 00:01 do dia seguinte NAO
   * fecham o par.
   *
   * Chamado apos cada send/receive. Idempotente:
   *  - Se ainda nao e bilateral no dia: retorna sem criar.
   *  - Se e bilateral e ja existe atendimento da conversa no dia: so garante
   *    que esta marcado como realizado (answered=true).
   *  - Se e bilateral e nao existe: cria 1 atendimento tipo chat.
   *
   * Elimina a necessidade do corretor registrar atendimento manualmente —
   * o BRM contabiliza automaticamente a partir das conversas WhatsApp.
   * Falhas sao silenciosas (log) pra nao quebrar o fluxo de mensagem.
   */
  private async tryRegisterServiceFromConversation(
    accountId: number,
    conversation: { id: number; owner_user_id: number; contact_name?: string | null; contact_phone: string }
  ): Promise<void> {
    if (!this.appointmentRepository) return
    try {
      // GATE 1: so conta atendimento se ja houve interacao bilateral HOJE
      // (dia-calendario America/Sao_Paulo).
      const bilateral = await this.messageRepository.hasBothDirectionsToday(accountId, conversation.id)
      if (!bilateral) return

      // GATE 2: contato precisa ter pelo menos 1 Deal (negocio) na account.
      // Match por telefone (variantes BR 12/13) OU por nome exato (case/trim).
      // Sem isso, conversas de leads/contatos aleatorios ainda contariam
      // atendimento apesar do /chat ja filtrar — metrica deve bater com UI.
      if (this.dealRepository) {
        const hasDeal = await this.dealRepository.hasDealForContact(
          accountId,
          conversation.contact_phone,
          conversation.contact_name,
        )
        if (!hasDeal) return
      }

      const existing = await this.appointmentRepository.findChatOfConversationOnDay(
        accountId,
        conversation.id,
      )
      if (existing) {
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
