import { BaseRepository } from './base-repository.js'
import { GoogleCalendarConnection } from '../types/index.js'

/**
 * Persistência da conexão Google Calendar por usuário.
 * A tabela é 1:1 com users (UNIQUE em user_id), então upsert usa isso.
 */
export class GoogleCalendarRepository extends BaseRepository {
  async findByUserId(userId: number): Promise<GoogleCalendarConnection | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<GoogleCalendarConnection>(
        `SELECT * FROM user_google_calendar WHERE user_id = $1`,
        [userId]
      )
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  /**
   * Upsert por user_id. Substitui tokens e email na reautenticação.
   */
  async upsert(input: {
    user_id: number
    connected_email: string
    access_token: string
    refresh_token: string
    token_expires_at: Date
    scope?: string | null
  }): Promise<GoogleCalendarConnection> {
    const client = await this.getClient()
    try {
      const result = await client.query<GoogleCalendarConnection>(
        `INSERT INTO user_google_calendar
           (user_id, connected_email, access_token, refresh_token, token_expires_at, scope, last_sync_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           connected_email  = EXCLUDED.connected_email,
           access_token     = EXCLUDED.access_token,
           refresh_token    = EXCLUDED.refresh_token,
           token_expires_at = EXCLUDED.token_expires_at,
           scope            = EXCLUDED.scope,
           last_sync_at     = NOW(),
           updated_at       = NOW()
         RETURNING *`,
        [
          input.user_id,
          input.connected_email,
          input.access_token,
          input.refresh_token,
          input.token_expires_at,
          input.scope ?? null,
        ]
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Atualiza só access_token e expires_at após refresh.
   * O refresh_token do Google não muda a cada refresh — a gente mantém o original.
   */
  async updateAccessToken(
    userId: number,
    accessToken: string,
    expiresAt: Date
  ): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        `UPDATE user_google_calendar
         SET access_token = $1, token_expires_at = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [accessToken, expiresAt, userId]
      )
    } finally {
      client.release()
    }
  }

  async markSynced(userId: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        `UPDATE user_google_calendar SET last_sync_at = NOW() WHERE user_id = $1`,
        [userId]
      )
    } finally {
      client.release()
    }
  }

  async deleteByUserId(userId: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `DELETE FROM user_google_calendar WHERE user_id = $1`,
        [userId]
      )
      return (result.rowCount ?? 0) > 0
    } finally {
      client.release()
    }
  }
}
