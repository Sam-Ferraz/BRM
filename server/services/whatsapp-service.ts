import { WhatsAppSessionRepository } from '../repositories/index.js'
import { WhatsAppSession } from '../types/index.js'

/**
 * WhatsAppService — gerencia o cadastro do número WhatsApp de cada usuário.
 *
 * Cada usuário do BRM tem 0 ou 1 sessão (vínculo 1:1). Como hoje usamos um
 * provedor stub, "conectar" é só armazenar o número; quando trocarmos pelo
 * provedor real, este service será o lugar para disparar o handshake
 * (QR Code do Baileys, registro no Cloud API, etc.).
 */
export class WhatsAppService {
  private sessionRepository: WhatsAppSessionRepository

  constructor(sessionRepository: WhatsAppSessionRepository) {
    this.sessionRepository = sessionRepository
  }

  async getSession(accountId: number, userId: number): Promise<WhatsAppSession | null> {
    return this.sessionRepository.findByUser(accountId, userId)
  }

  async connect(
    accountId: number,
    userId: number,
    phoneNumber: string,
    displayName?: string | null
  ): Promise<WhatsAppSession> {
    const cleanedPhone = this.normalizePhone(phoneNumber)
    if (!cleanedPhone) {
      throw new Error('phone_number is required')
    }
    return this.sessionRepository.upsert(accountId, userId, cleanedPhone, displayName ?? null)
  }

  async disconnect(accountId: number, userId: number): Promise<{ success: boolean }> {
    const ok = await this.sessionRepository.updateStatus(accountId, userId, 'disconnected')
    return { success: ok }
  }

  /**
   * Mantém apenas dígitos e o '+' opcional no início — garante consistência
   * entre o número cadastrado e o que vem nas conversas.
   */
  private normalizePhone(raw: string): string {
    if (!raw) return ''
    const digits = raw.replace(/[^\d+]/g, '')
    // Se o usuário esqueceu o '+', mantém os dígitos crus mesmo assim.
    return digits
  }
}
