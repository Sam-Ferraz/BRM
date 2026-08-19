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

  /**
   * Exclui a account e todos os dados associados (cascade manual em
   * transacao). As FKs no schema sao ON DELETE RESTRICT — precisamos
   * deletar dependentes primeiro. Ordem importa: tabelas indiretas
   * (que dependem de outras da mesma account) primeiro, depois as
   * diretas, depois a account.
   *
   * ATENCAO: acao IRREVERSIVEL. Nao deve estar exposta em produção
   * sem confirmacao dupla. Nao permite excluir a account #1 (BRM Demo).
   */
  async deleteWithCascade(id: number): Promise<boolean> {
    if (id === 1) throw new Error('Nao e permitido excluir a account #1 (BRM Demo)')
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      // Ordem: indiretas -> diretas -> account
      // Msgs/assignments dependem de conversations, deals, etc — ON DELETE
      // CASCADE na FK das indiretas normalmente cuida disso, mas apagamos
      // explicitamente pra nao deixar orfao caso algum FK esteja como SET NULL.
      await client.query(`DELETE FROM deal_label_assignments WHERE label_id IN (SELECT id FROM deal_labels WHERE account_id = $1)`, [id])
      await client.query(`DELETE FROM messages WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM conversations WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM deal_labels WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM follow_ups WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM appointments WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM proposals WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM contracts WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM sales WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE account_id = $1)`, [id])
      await client.query(`DELETE FROM products WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM leads WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM lead_pipeline_members WHERE pipeline_id IN (SELECT id FROM lead_pipelines WHERE account_id = $1)`, [id])
      await client.query(`DELETE FROM lead_pipelines WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM lead_sources WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM deals WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM clients WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM whatsapp_sessions WHERE account_id = $1`, [id])
      await client.query(`DELETE FROM calendar_events WHERE account_id = $1`, [id])
      // Tabelas opcionais (talvez nao existam em todos ambientes)
      await client.query(`DELETE FROM sales_agenda WHERE account_id = $1`, [id]).catch(() => undefined)
      await client.query(`DELETE FROM user_google_calendar WHERE account_id = $1`, [id]).catch(() => undefined)
      await client.query(`DELETE FROM user_permission_overrides WHERE user_id IN (SELECT id FROM users WHERE account_id = $1)`, [id]).catch(() => undefined)
      await client.query(`DELETE FROM password_setup_tokens WHERE user_id IN (SELECT id FROM users WHERE account_id = $1)`, [id]).catch(() => undefined)
      await client.query(`DELETE FROM users WHERE account_id = $1`, [id])
      const result = await client.query(`DELETE FROM accounts WHERE id = $1`, [id])
      await client.query('COMMIT')
      return (result.rowCount ?? 0) > 0
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw err
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
