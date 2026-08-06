import {
  WhatsAppProvider,
  SendMessageResult,
  SessionState,
} from './whatsapp-provider.js'
import { WhatsAppSessionRepository } from '../repositories/index.js'

/**
 * Provider que delega em runtime para o provider certo (CloudApi ou Baileys)
 * baseado no campo `provider` gravado na sessao do usuario. Assim o mesmo
 * servidor consegue atender ao mesmo tempo:
 *   - usuarios que conectaram via Cloud API (BYOK) → CloudApiWhatsAppProvider
 *   - usuarios que conectaram via QR code → BaileysWhatsAppProvider
 *
 * Sem esse wrapper, o server/index.ts precisava escolher UM provider por
 * ambiente via env WHATSAPP_PROVIDER, o que quebrava quando a env estava
 * setada errada ou quando um mesmo servidor tinha usuarios em provedores
 * diferentes.
 *
 * Escolha do fallback (sessao sem provider explicito, tipico de sessoes
 * legadas anteriores ao campo `provider`): Cloud API. Motivo: Cloud API e
 * o caminho oficial e ativo; Baileys hoje e legado. Se o usuario nao tem
 * credenciais Cloud API cadastradas, o proprio CloudApiProvider ja retorna
 * whatsapp_not_connected — comportamento correto.
 */
export class MultiWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private cloudApi: WhatsAppProvider,
    private baileys: WhatsAppProvider,
    private sessionRepository: WhatsAppSessionRepository,
  ) {}

  async sendMessage(input: {
    ownerUserId: number
    from: string
    to: string
    content: string
  }): Promise<SendMessageResult> {
    const provider = await this.pick(input.ownerUserId)
    return provider.sendMessage(input)
  }

  async startSession(ownerUserId: number): Promise<SessionState> {
    const provider = await this.pick(ownerUserId)
    return provider.startSession(ownerUserId)
  }

  // Interface original e sincrona (getSessionState). Aqui usamos a sessao ja
  // conhecida via startSession. Como esta rota e chamada em polling apenas
  // durante o pareamento Baileys (Cloud API nao usa polling), delegamos ao
  // Baileys por default — pra Cloud API o retorno correto virá do startSession.
  getSessionState(ownerUserId: number): SessionState {
    return this.baileys.getSessionState(ownerUserId)
  }

  async stopSession(ownerUserId: number): Promise<void> {
    const provider = await this.pick(ownerUserId)
    return provider.stopSession(ownerUserId)
  }

  private async pick(userId: number): Promise<WhatsAppProvider> {
    const session = await this.sessionRepository.findByUserInternal(userId)
    if (session?.provider === 'baileys') return this.baileys
    return this.cloudApi
  }
}
