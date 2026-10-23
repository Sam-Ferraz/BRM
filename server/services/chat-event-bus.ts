import { EventEmitter } from 'events'

/**
 * Barramento de eventos do modulo Chat. ChatService emite aqui quando
 * ha mudanca relevante (nova msg, update de status, markAsRead); o
 * endpoint SSE /api/chat/events se inscreve pra enviar push real-time
 * pros ChatPages abertos — elimina a latencia do polling 3s.
 *
 * Escopo multi-tenant: todo evento carrega accountId. Subscriber filtra
 * por accountId antes de emitir pro cliente (evita cross-tenant leak).
 * ownerUserId opcional pra permitir que admins recebam tudo da account.
 *
 * EventEmitter default limite 10 listeners — subimos pra 1000 pra
 * acomodar varios corretores da mesma account conectados ao SSE
 * simultaneamente.
 */
export type ChatEvent =
  | { kind: 'message'; accountId: number; ownerUserId: number; conversationId: number }
  | { kind: 'conversation'; accountId: number; ownerUserId: number; conversationId: number }
  | { kind: 'read'; accountId: number; ownerUserId: number; conversationId: number }

export class ChatEventBus {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(1000)
  }

  emit(event: ChatEvent): void {
    this.emitter.emit('event', event)
  }

  /**
   * Inscreve um listener pros eventos de uma account+ownerUserId. Retorna
   * funcao pra cancelar a inscricao (uso no close do SSE).
   */
  subscribe(filter: { accountId: number; ownerUserId: number | null }, handler: (ev: ChatEvent) => void): () => void {
    const wrapper = (ev: ChatEvent) => {
      if (ev.accountId !== filter.accountId) return
      // Se filter.ownerUserId e null (admin), recebe tudo da account.
      // Se e numero, so recebe eventos desse owner.
      if (filter.ownerUserId !== null && ev.ownerUserId !== filter.ownerUserId) return
      try {
        handler(ev)
      } catch (err) {
        console.error('[ChatEventBus] handler lancou:', err)
      }
    }
    this.emitter.on('event', wrapper)
    return () => this.emitter.off('event', wrapper)
  }
}
