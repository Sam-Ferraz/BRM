import { BaseRepository } from './base-repository.js'
import { WhatsAppSession, WhatsAppSessionStatus } from '../types/index.js'

export class WhatsAppSessionRepository extends BaseRepository {
  async findByUser(userId: number): Promise<WhatsAppSession | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM whatsapp_sessions WHERE user_id = $1',
        [userId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Upsert da sessão do usuário — como há UNIQUE em user_id, cada usuário só
   * tem uma sessão. Se já existir, atualiza número/nome/status; senão cria.
   */
  async upsert(
    userId: number,
    phoneNumber: string,
    displayName: string | null
  ): Promise<WhatsAppSession> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO whatsapp_sessions (user_id, phone_number, display_name, status, connected_at)
         VALUES ($1, $2, $3, 'connected', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
           SET phone_number = EXCLUDED.phone_number,
               display_name = EXCLUDED.display_name,
               status = 'connected',
               connected_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, phoneNumber, displayName]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async updateStatus(userId: number, status: WhatsAppSessionStatus): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE whatsapp_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING id',
        [status, userId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async deleteByUser(userId: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM whatsapp_sessions WHERE user_id = $1 RETURNING id',
        [userId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }
}
