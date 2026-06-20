import { BaseRepository } from './base-repository.js'
import { Message, MessageDirection, MessageStatus } from '../types/index.js'

export class MessageRepository extends BaseRepository {
  async findByConversation(conversationId: number, limit = 200): Promise<Message[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT * FROM messages
         WHERE conversation_id = $1
         ORDER BY sent_at ASC, id ASC
         LIMIT $2`,
        [conversationId, limit]
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Retorna true se a conversa teve PELO MENOS uma mensagem inbound E uma
   * outbound nas últimas `windowHours` horas. Usado pelo ChatService para
   * detectar "interação bilateral" (= 1 atendimento).
   */
  async hasBothDirectionsInWindow(conversationId: number, windowHours = 24): Promise<boolean> {
    const c = await this.getClient()
    try {
      const result = await c.query(
        `SELECT
            BOOL_OR(direction = 'inbound')  AS has_inbound,
            BOOL_OR(direction = 'outbound') AS has_outbound
           FROM messages
          WHERE conversation_id = $1
            AND sent_at >= NOW() - ($2 || ' hours')::INTERVAL`,
        [conversationId, String(windowHours)]
      )
      const row = result.rows[0]
      return Boolean(row?.has_inbound) && Boolean(row?.has_outbound)
    } finally {
      this.releaseClient(c)
    }
  }

  async create(input: {
    conversation_id: number
    direction: MessageDirection
    content: string
    media_url?: string | null
    status?: MessageStatus
    provider_message_id?: string | null
  }): Promise<Message> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO messages (
           conversation_id, direction, content, media_url, status, provider_message_id
         ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          input.conversation_id,
          input.direction,
          input.content,
          input.media_url ?? null,
          input.status ?? (input.direction === 'inbound' ? 'received' : 'sent'),
          input.provider_message_id ?? null,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }
}
