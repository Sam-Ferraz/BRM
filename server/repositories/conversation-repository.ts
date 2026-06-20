import { BaseRepository } from './base-repository.js'
import { Conversation, ConversationWithDetails } from '../types/index.js'

export class ConversationRepository extends BaseRepository {
  /**
   * Lista conversas com enriquecimento de cliente, dono e última mensagem.
   * Se ownerUserId for fornecido, filtra apenas as conversas daquele usuário
   * (visão do corretor). Sem ownerUserId, retorna tudo (visão do admin).
   */
  async findAll(ownerUserId?: number): Promise<ConversationWithDetails[]> {
    const client = await this.getClient()
    try {
      const params: any[] = []
      let where = ''
      if (ownerUserId !== undefined) {
        where = 'WHERE c.owner_user_id = $1'
        params.push(ownerUserId)
      }

      const query = `
        SELECT
          c.*,
          cl.name           AS client_name,
          u.name            AS owner_user_name,
          lm.content        AS last_message_preview,
          lm.direction      AS last_message_direction
        FROM conversations c
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN users   u  ON c.owner_user_id = u.id
        LEFT JOIN LATERAL (
          SELECT content, direction
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY sent_at DESC, id DESC
          LIMIT 1
        ) lm ON TRUE
        ${where}
        ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC
      `
      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<ConversationWithDetails | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT
          c.*,
          cl.name AS client_name,
          u.name  AS owner_user_name
        FROM conversations c
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN users   u  ON c.owner_user_id = u.id
        WHERE c.id = $1`,
        [id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Garante uma conversa única por (dono, contato). Se já existir, retorna.
   * Senão, cria — fazendo lookup de cliente pelo telefone do contato (match
   * frouxo: normaliza dígitos antes de comparar).
   */
  async findOrCreate(
    ownerUserId: number,
    contactPhone: string,
    contactName?: string | null
  ): Promise<Conversation> {
    const client = await this.getClient()
    try {
      // Tenta achar conversa existente primeiro
      const existing = await client.query(
        'SELECT * FROM conversations WHERE owner_user_id = $1 AND contact_phone = $2',
        [ownerUserId, contactPhone]
      )
      if (existing.rows.length > 0) {
        return existing.rows[0]
      }

      // Match com Cliente do CRM por telefone — compara só dígitos para
      // ignorar formatação (+55, espaços, parênteses, hifens).
      const normalized = contactPhone.replace(/\D/g, '')
      const clientLookup = await client.query(
        `SELECT id, name FROM clients
         WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1
         LIMIT 1`,
        [normalized]
      )
      const clientId = clientLookup.rows[0]?.id ?? null
      const clientName = clientLookup.rows[0]?.name ?? null

      const result = await client.query(
        `INSERT INTO conversations (owner_user_id, contact_phone, contact_name, client_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [ownerUserId, contactPhone, contactName ?? clientName ?? null, clientId]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Atualiza o ponteiro last_message_at após inserir uma mensagem. Se a
   * mensagem foi inbound, incrementa unread_count.
   */
  async touchLastMessage(
    conversationId: number,
    direction: 'inbound' | 'outbound'
  ): Promise<void> {
    const client = await this.getClient()
    try {
      if (direction === 'inbound') {
        await client.query(
          `UPDATE conversations
             SET last_message_at = CURRENT_TIMESTAMP,
                 unread_count = unread_count + 1,
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [conversationId]
        )
      } else {
        await client.query(
          `UPDATE conversations
             SET last_message_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [conversationId]
        )
      }
    } finally {
      this.releaseClient(client)
    }
  }

  async markAsRead(conversationId: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        'UPDATE conversations SET unread_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId]
      )
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Soma todas as mensagens entrantes ainda não visualizadas pelo corretor
   * (cliente respondeu, corretor não abriu). É a soma de `unread_count` das
   * conversas: cada mensagem inbound incrementa esse contador (em
   * touchLastMessage) e ele é zerado quando o corretor abre a conversa
   * (em markAsRead). Filtro opcional por dono.
   */
  async sumUnreadMessages(ownerUserId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COALESCE(SUM(unread_count), 0) AS total FROM conversations'
      const params: any[] = []
      if (ownerUserId !== undefined) {
        query += ' WHERE owner_user_id = $1'
        params.push(ownerUserId)
      }
      const result = await client.query(query, params)
      return parseInt(result.rows[0].total)
    } finally {
      this.releaseClient(client)
    }
  }
}
