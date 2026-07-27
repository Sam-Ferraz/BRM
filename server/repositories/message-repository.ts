import { BaseRepository } from './base-repository.js'
import { Message, MessageDirection, MessageStatus } from '../types/index.js'

export class MessageRepository extends BaseRepository {
  /**
   * Lista mensagens de uma conversa. Filtra por account_id na própria linha
   * de messages (redundante com conversation_id → conversations.account_id
   * mas evita JOIN e blinda a tenancy no nível da tabela).
   */
  async findByConversation(accountId: number, conversationId: number, limit = 200): Promise<Message[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT * FROM messages
         WHERE conversation_id = $1
           AND account_id = $2
         ORDER BY sent_at ASC, id ASC
         LIMIT $3`,
        [conversationId, accountId, limit]
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
  async hasBothDirectionsInWindow(accountId: number, conversationId: number, windowHours = 24): Promise<boolean> {
    const c = await this.getClient()
    try {
      const result = await c.query(
        `SELECT
            BOOL_OR(direction = 'inbound')  AS has_inbound,
            BOOL_OR(direction = 'outbound') AS has_outbound
           FROM messages
          WHERE conversation_id = $1
            AND account_id = $2
            AND sent_at >= NOW() - ($3 || ' hours')::INTERVAL`,
        [conversationId, accountId, String(windowHours)]
      )
      const row = result.rows[0]
      return Boolean(row?.has_inbound) && Boolean(row?.has_outbound)
    } finally {
      this.releaseClient(c)
    }
  }

  async create(
    accountId: number,
    input: {
      conversation_id: number
      direction: MessageDirection
      content: string
      media_url?: string | null
      status?: MessageStatus
      provider_message_id?: string | null
    }
  ): Promise<Message> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO messages (
           account_id, conversation_id, direction, content, media_url, status, provider_message_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          accountId,
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
