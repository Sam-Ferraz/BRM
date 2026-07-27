import { BaseRepository } from './base-repository.js'
import { User } from '../types/index.js'

export class UserRepository extends BaseRepository {
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, email, password_hash, role, account_id FROM users WHERE email = $1',
        [email]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Lista users. Multi-tenancy: se accountId for informado, filtra pela
   * account (uso normal — corretor lista colegas). Sem accountId é uso
   * admin/sistema (ex: painel super-admin).
   */
  async findAll(accountId?: number): Promise<User[]> {
    const client = await this.getClient()
    try {
      if (accountId != null) {
        const result = await client.query(
          'SELECT id, name, email, role, account_id FROM users WHERE account_id = $1 ORDER BY name ASC',
          [accountId]
        )
        return result.rows
      }
      const result = await client.query(
        'SELECT id, name, email, role, account_id FROM users ORDER BY name ASC'
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<User | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, email, role, account_id FROM users WHERE id = $1',
        [id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(
    name: string,
    email: string,
    passwordHash: string | null,
    role: string = 'user',
    accountId: number
  ): Promise<User> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, account_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, account_id`,
        [name, email, passwordHash, role, accountId]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [passwordHash, userId]
      )
    } finally {
      this.releaseClient(client)
    }
  }
}
