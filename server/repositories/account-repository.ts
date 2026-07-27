import { BaseRepository } from './base-repository.js'
import { Account, AccountCustomConfig } from '../types/index.js'

/**
 * Repositório de accounts (empresas/clientes). Uma account = uma empresa
 * contratante do BRM. Todo dado do sistema é filtrado por account_id.
 */
export class AccountRepository extends BaseRepository {
  async findById(id: number): Promise<Account | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, plan, custom_config, is_active, created_at, updated_at FROM accounts WHERE id = $1',
        [id]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async findAll(): Promise<Account[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, plan, custom_config, is_active, created_at, updated_at FROM accounts ORDER BY name ASC'
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(payload: {
    name: string
    plan?: string
    custom_config?: AccountCustomConfig
    is_active?: boolean
  }): Promise<Account> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO accounts (name, plan, custom_config, is_active)
         VALUES ($1, $2, $3::jsonb, $4)
         RETURNING id, name, plan, custom_config, is_active, created_at, updated_at`,
        [
          payload.name,
          payload.plan || 'trial',
          JSON.stringify(payload.custom_config || {}),
          payload.is_active ?? true,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async updateCustomConfig(id: number, custom_config: AccountCustomConfig): Promise<Account | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE accounts SET custom_config = $1::jsonb WHERE id = $2
         RETURNING id, name, plan, custom_config, is_active, created_at, updated_at`,
        [JSON.stringify(custom_config), id]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, payload: Partial<Pick<Account, 'name' | 'plan' | 'is_active'>>): Promise<Account | null> {
    const client = await this.getClient()
    try {
      const sets: string[] = []
      const values: any[] = []
      let p = 1
      if (payload.name !== undefined) { sets.push(`name = $${p++}`); values.push(payload.name) }
      if (payload.plan !== undefined) { sets.push(`plan = $${p++}`); values.push(payload.plan) }
      if (payload.is_active !== undefined) { sets.push(`is_active = $${p++}`); values.push(payload.is_active) }
      if (sets.length === 0) return this.findById(id)
      values.push(id)
      const result = await client.query(
        `UPDATE accounts SET ${sets.join(', ')} WHERE id = $${p}
         RETURNING id, name, plan, custom_config, is_active, created_at, updated_at`,
        values
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }
}
