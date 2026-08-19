/**
 * Adapter para o provedor de WhatsApp.
 *
 * O ChatService depende desta interface (não de um cliente HTTP específico),
 * então quando o usuário decidir o provedor real (Cloud API oficial, Baileys,
 * Twilio, etc.) basta criar uma implementação concreta e plugar no lugar do
 * StubWhatsAppProvider em server/index.ts. Nenhuma mudança no resto do código.
 */

export interface SendMessageResult {
  providerMessageId: string
}

export type SessionStatus =
  | 'idle'
  | 'pending_qr'        // Baileys: aguardando scan do QR Code
  | 'connecting'        // conexão em andamento
  | 'connected'         // sessão ativa
  | 'disconnected'      // sessão encerrada
  | 'pending_setup'     // Cloud API: usuário ainda não configurou credenciais
  | 'invalid_credentials' // Cloud API: token expirado / phone_number_id errado

export interface SessionState {
  status: SessionStatus
  qrCode?: string | null         // data URL PNG do QR (quando status === 'pending_qr')
  phoneNumber?: string | null    // número conectado (quando status === 'connected')
  displayName?: string | null
}

export interface WhatsAppProvider {
  /**
   * Envia uma mensagem de texto pelo número `from` para o número `to`,
   * usando a sessão do usuário `ownerUserId`. Resolve com o id da mensagem
   * no provedor (útil para reconciliar entregas/leituras depois).
   */
  sendMessage(input: {
    ownerUserId: number
    from: string
    to: string
    content: string
  }): Promise<SendMessageResult>

  /**
   * Envia midia (imagem, audio, video, documento) — opcional (nao suportado
   * por Cloud API sem template ou por Stub). Providers que nao implementam
   * lancam Error('media_not_supported').
   */
  sendMedia?(input: {
    ownerUserId: number
    to: string
    buffer: Buffer
    mimetype: string
    filename?: string | null
    caption?: string | null
    kind: 'image' | 'audio' | 'video' | 'document'
  }): Promise<SendMessageResult>

  /**
   * Inicia uma sessão para o usuário. Para Baileys, abre o socket e emite QR.
   * Para o stub, basta marcar como conectado. Não bloqueia esperando QR ser
   * escaneado — retorna imediatamente; o frontend faz polling em getSessionState.
   */
  startSession(ownerUserId: number): Promise<SessionState>

  /**
   * Retorna o estado atual da sessão (QR Code, status, número conectado).
   * Frontend faz polling enquanto status !== 'connected'.
   */
  getSessionState(ownerUserId: number): SessionState

  /**
   * Encerra a sessão do usuário.
   */
  stopSession(ownerUserId: number): Promise<void>
}

/**
 * Implementação stub — não conversa de verdade com o WhatsApp. Apenas registra
 * no log e devolve um id sintético. Útil para teste de UI offline.
 */
export class StubWhatsAppProvider implements WhatsAppProvider {
  private sessions = new Map<number, SessionState>()

  async sendMessage(input: { ownerUserId: number; from: string; to: string; content: string }): Promise<SendMessageResult> {
    const providerMessageId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    console.log(
      `[WhatsApp Stub] user=${input.ownerUserId} ${input.from} → ${input.to} (${providerMessageId}): ${input.content}`
    )
    return { providerMessageId }
  }

  async startSession(ownerUserId: number): Promise<SessionState> {
    const state: SessionState = { status: 'connected', phoneNumber: 'stub-number' }
    this.sessions.set(ownerUserId, state)
    return state
  }

  getSessionState(ownerUserId: number): SessionState {
    return this.sessions.get(ownerUserId) ?? { status: 'idle' }
  }

  async stopSession(ownerUserId: number): Promise<void> {
    this.sessions.delete(ownerUserId)
  }
}
