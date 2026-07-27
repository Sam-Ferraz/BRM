import path from 'path'
import fs from 'fs/promises'
import QRCode from 'qrcode'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import type { WASocket } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import {
  WhatsAppProvider,
  SendMessageResult,
  SessionState,
  SessionStatus,
} from './whatsapp-provider.js'
import { WhatsAppSessionRepository } from '../repositories/index.js'

/**
 * Callback chamado pelo provider quando uma mensagem entrante é recebida.
 * O server/index.ts conecta isso ao ChatService.receiveMessage.
 */
export type IncomingMessageHandler = (input: {
  ownerUserId: number
  fromPhone: string
  fromName?: string | null
  content: string
  providerMessageId?: string | null
}) => Promise<unknown>

/**
 * Implementação do WhatsAppProvider usando a biblioteca Baileys
 * (https://github.com/WhiskeySockets/Baileys), que conversa diretamente
 * com a infraestrutura do WhatsApp Web. Sem custo monetário.
 *
 * Cada usuário do BRM tem o próprio número e, portanto, o próprio socket.
 * Mantemos um Map<userId, BaileysSession> em memória; o auth state de cada
 * usuário é persistido em disco (./auth/whatsapp/<userId>) para que o
 * pareamento via QR só precise acontecer uma vez por dispositivo.
 *
 * Limitações conhecidas:
 *  • Baileys viola o ToS da Meta — ok para teste/uso interno, evitar spam.
 *  • Mídia (imagem/áudio/doc) não é tratada nesta versão; apenas texto.
 *  • Grupos (jids @g.us) são ignorados.
 */
export class BaileysWhatsAppProvider implements WhatsAppProvider {
  private sessions = new Map<number, BaileysSession>()
  private incoming: IncomingMessageHandler
  private sessionRepository: WhatsAppSessionRepository
  private authDir: string

  constructor(opts: {
    incoming: IncomingMessageHandler
    sessionRepository: WhatsAppSessionRepository
    authDir?: string
  }) {
    this.incoming = opts.incoming
    this.sessionRepository = opts.sessionRepository
    this.authDir = opts.authDir ?? path.resolve('./auth/whatsapp')
  }

  // -------------------------------------------------------------------------
  // API do WhatsAppProvider
  // -------------------------------------------------------------------------

  async startSession(ownerUserId: number): Promise<SessionState> {
    let session = this.sessions.get(ownerUserId)
    if (session && (session.state.status === 'connecting' || session.state.status === 'pending_qr' || session.state.status === 'connected')) {
      // Já temos uma sessão ativa/em andamento; só devolve o estado atual.
      return session.state
    }
    session = new BaileysSession(ownerUserId, this.authDir, this.incoming, this.sessionRepository)
    this.sessions.set(ownerUserId, session)
    await session.connect()
    return session.state
  }

  getSessionState(ownerUserId: number): SessionState {
    const session = this.sessions.get(ownerUserId)
    return session?.state ?? { status: 'idle' }
  }

  async stopSession(ownerUserId: number): Promise<void> {
    const session = this.sessions.get(ownerUserId)
    if (session) {
      await session.disconnect()
      this.sessions.delete(ownerUserId)
    }
    // Apaga auth state do disco para forçar QR de novo na próxima conexão
    const dir = path.join(this.authDir, String(ownerUserId))
    try {
      await fs.rm(dir, { recursive: true, force: true })
    } catch (error) {
      console.error('[Baileys] Erro removendo auth dir:', error)
    }
  }

  async sendMessage(input: {
    ownerUserId: number
    from: string
    to: string
    content: string
  }): Promise<SendMessageResult> {
    let session = this.sessions.get(input.ownerUserId)
    if (!session || session.state.status !== 'connected') {
      // Tenta reabrir se já tem credenciais salvas em disco
      session = new BaileysSession(input.ownerUserId, this.authDir, this.incoming, this.sessionRepository)
      this.sessions.set(input.ownerUserId, session)
      await session.connect()
    }
    if (!session.sock || session.state.status !== 'connected') {
      throw new Error('whatsapp_not_connected')
    }
    const jid = toJid(input.to)
    const sent = await session.sock.sendMessage(jid, { text: input.content })
    return { providerMessageId: sent?.key?.id ?? `baileys-${Date.now()}` }
  }
}

// ===========================================================================
// BaileysSession — uma sessão (socket) por usuário do BRM
// ===========================================================================

class BaileysSession {
  state: SessionState = { status: 'idle' }
  sock: WASocket | null = null
  private ownerUserId: number
  private authDir: string
  private incoming: IncomingMessageHandler
  private sessionRepository: WhatsAppSessionRepository
  private reconnectAttempt = 0

  constructor(
    ownerUserId: number,
    authDirRoot: string,
    incoming: IncomingMessageHandler,
    sessionRepository: WhatsAppSessionRepository
  ) {
    this.ownerUserId = ownerUserId
    this.authDir = path.join(authDirRoot, String(ownerUserId))
    this.incoming = incoming
    this.sessionRepository = sessionRepository
  }

  async connect(): Promise<void> {
    await fs.mkdir(this.authDir, { recursive: true })
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir)
    const { version } = await fetchLatestBaileysVersion()

    this.setStatus('connecting')

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['BRM', 'Chrome', '1.0'],
      // syncFullHistory: false (default) — só pega mensagens novas, não o histórico todo
    })
    this.sock = sock

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update))
    sock.ev.on('messages.upsert', (m) => this.handleMessages(m))
  }

  async disconnect(): Promise<void> {
    if (this.sock) {
      try {
        await this.sock.logout()
      } catch {
        try { this.sock.end(undefined) } catch { /* ignore */ }
      }
      this.sock = null
    }
    this.setStatus('disconnected')
    // Provider não conhece accountId — usa variante interna (rule 9).
    await this.sessionRepository.updateStatusInternal(this.ownerUserId, 'disconnected').catch(() => undefined)
  }

  // ----- internos -----

  private setStatus(status: SessionStatus, extra?: Partial<SessionState>): void {
    this.state = {
      ...this.state,
      ...extra,
      status,
      // limpa o QR uma vez conectado (não precisa mais)
      qrCode: status === 'connected' ? null : extra?.qrCode ?? this.state.qrCode,
    }
  }

  private async handleConnectionUpdate(update: any): Promise<void> {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      // Converte QR cru em data URL PNG para o frontend exibir
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 240, margin: 1 })
        this.setStatus('pending_qr', { qrCode: qrDataUrl })
      } catch (error) {
        console.error('[Baileys] Erro gerando QR data URL:', error)
      }
    }

    if (connection === 'open') {
      this.reconnectAttempt = 0
      const phoneNumber = extractPhoneFromJid(this.sock?.user?.id)
      const displayName = this.sock?.user?.name ?? null
      this.setStatus('connected', { phoneNumber, displayName, qrCode: null })

      // Registra a sessão na tabela do banco — daqui pra frente o resto do
      // BRM enxerga esse usuário como "WhatsApp conectado".
      if (phoneNumber) {
        // Provider não conhece accountId em memória — usa variante interna
        // que deriva account_id via subquery em users (rule 9).
        await this.sessionRepository
          .upsertInternal(this.ownerUserId, phoneNumber, displayName)
          .catch((error) => console.error('[Baileys] Erro upserting session:', error))
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log(
        `[Baileys] connection closed for user=${this.ownerUserId} statusCode=${statusCode} shouldReconnect=${shouldReconnect}`
      )
      this.setStatus(shouldReconnect ? 'connecting' : 'disconnected')

      if (shouldReconnect && this.reconnectAttempt < 5) {
        this.reconnectAttempt++
        setTimeout(() => this.connect().catch(console.error), 1500 * this.reconnectAttempt)
      } else if (!shouldReconnect) {
        // Logout do dispositivo — limpa auth e exige novo QR
        // Provider não conhece accountId — variante interna (rule 9).
        await this.sessionRepository.updateStatusInternal(this.ownerUserId, 'disconnected').catch(() => undefined)
      }
    }
  }

  private async handleMessages({ messages, type }: any): Promise<void> {
    if (type !== 'notify') return
    for (const msg of messages || []) {
      // Ignora mensagens enviadas pelo próprio usuário e mensagens sem chave
      if (!msg.message || msg.key?.fromMe) continue
      const remoteJid: string | undefined = msg.key?.remoteJid
      if (!remoteJid || remoteJid.endsWith('@g.us')) continue // ignora grupos

      const content = extractTextContent(msg.message)
      if (!content) continue // ignora mensagens sem texto (mídia, sticker, etc.)

      const fromPhone = extractPhoneFromJid(remoteJid)
      const fromName: string | null = msg.pushName || null
      const providerMessageId: string | null = msg.key?.id ?? null

      try {
        await this.incoming({
          ownerUserId: this.ownerUserId,
          fromPhone: fromPhone || remoteJid,
          fromName,
          content,
          providerMessageId,
        })
      } catch (error) {
        console.error('[Baileys] Erro persistindo mensagem entrante:', error)
      }
    }
  }
}

// ===========================================================================
// Helpers de conversão JID ↔ telefone
// ===========================================================================

function toJid(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@s.whatsapp.net`
}

function extractPhoneFromJid(jid?: string | null): string | null {
  if (!jid) return null
  // formato comum: "5511988887777@s.whatsapp.net" ou ".:0@s.whatsapp.net"
  const at = jid.indexOf('@')
  const base = at >= 0 ? jid.slice(0, at) : jid
  // remove sufixo ":0" / ":11" que aparece em alguns JIDs do próprio usuário
  const cleaned = base.split(':')[0].replace(/\D/g, '')
  return cleaned ? `+${cleaned}` : null
}

function extractTextContent(message: any): string | null {
  if (!message) return null
  if (typeof message.conversation === 'string' && message.conversation) {
    return message.conversation
  }
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text
  }
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption
  }
  if (message.videoMessage?.caption) {
    return message.videoMessage.caption
  }
  return null
}
