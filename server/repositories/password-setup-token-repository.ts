import { randomBytes } from 'crypto'
import { BaseRepository } from './base-repository.js'

export interface PasswordSetupToken {
  id: number
  user_id: number
  token: string
  purpose: 'setup' | 'reset'
  expires_at: Date
  used_at: Date | null
  created_at?: Date
}

/**
 * Repositório de tokens de setup/reset de senha.
 * Token é 32 bytes aleatórios em base64url (URL-safe, ~43 chars).
 */
export class PasswordSetupTokenRepository extends BaseRepository {
  /**
   * Cria um novo token para o user. Se já houver token válido não usado,
   * invalida (used_at = NOW()) pra evitar múltiplos links ativos.
   */
  async create(
    userId: number,
    purpose: 'setup' | 'reset',
    ttlHours: number
  ): Promise<string> {
    const client = await this.getClient()
    try {
      // Invalida tokens anteriores não usados desse user
      await client.query(
        `UPDATE password_setup_tokens SET used_at = NOW()
           WHERE user_id = $1 AND used_at IS NULL`,
        [userId]
      )
      const token = randomBytes(32).toString('base64url')
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      await client.query(
        `INSERT INTO password_setup_tokens (user_id, token, purpose, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, token, purpose, expiresAt]
      )
      return token
    } finally {
      this.releaseClient(client)
    }
  }

  async findValid(token: string): Promise<PasswordSetupToken | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT * FROM password_setup_tokens
           WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
           LIMIT 1`,
        [token]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async markUsed(id: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        `UPDATE password_setup_tokens SET used_at = NOW() WHERE id = $1`,
        [id]
      )
    } finally {
      this.releaseClient(client)
    }
  }
}
