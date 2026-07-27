import { randomBytes } from 'crypto'
import { BaseRepository } from './base-repository.js'
import { LeadSource, LeadSourceStatus, LeadSourceType } from '../types/index.js'

export class LeadSourceRepository extends BaseRepository {
  async findAll(accountId: number): Promise<LeadSource[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM lead_sources WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<LeadSource | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM lead_sources WHERE id = $1 AND account_id = $2',
        [id, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Busca fonte pelo webhook_token. NÃO recebe accountId porque é usado pelo
   * webhook público (Meta, Zapier, etc.) que chega SEM autenticação — é a
   * própria chamada que descobre o account_id a partir de source.account_id.
   * O token é o segredo aleatório de 24 bytes gerado no create() — funciona
   * como identificador único global.
   */
  async findByWebhookToken(token: string): Promise<LeadSource | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM lead_sources WHERE webhook_token = $1',
        [token]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, input: {
    name: string
    type: LeadSourceType
    config?: Record<string, any> | null
    status?: LeadSourceStatus
  }): Promise<LeadSource> {
    const client = await this.getClient()
    try {
      // Token aleatório longo o suficiente para ser usado como segredo no webhook
      const webhookToken = randomBytes(24).toString('hex')
      const result = await client.query(
        `INSERT INTO lead_sources (account_id, name, type, config, webhook_token, status)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING *`,
        [
          accountId,
          input.name,
          input.type,
          input.config ? JSON.stringify(input.config) : null,
          webhookToken,
          input.status ?? 'active',
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(
    accountId: number,
    id: number,
    input: Partial<{ name: string; config: Record<string, any> | null; status: LeadSourceStatus }>
  ): Promise<LeadSource | null> {
    const client = await this.getClient()
    try {
      const fields: string[] = []
      const values: any[] = []
      let p = 1
      if (input.name !== undefined) {
        fields.push(`name = $${p++}`)
        values.push(input.name)
      }
      if (input.config !== undefined) {
        fields.push(`config = $${p++}::jsonb`)
        values.push(input.config ? JSON.stringify(input.config) : null)
      }
      if (input.status !== undefined) {
        fields.push(`status = $${p++}`)
        values.push(input.status)
      }
      if (fields.length === 0) {
        return this.findById(accountId, id)
      }
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      const idParam = p
      p++
      values.push(accountId)
      const query = `UPDATE lead_sources SET ${fields.join(', ')} WHERE id = $${idParam} AND account_id = $${p} RETURNING *`
      const result = await client.query(query, values)
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Atualiza last_lead_at após ingerir um lead. accountId é opcional porque
   * essa chamada acontece dentro do fluxo de webhook público — o LeadService
   * já resolveu qual é a source (e portanto a account) via findByWebhookToken.
   * Quando presente, filtramos por account_id como salvaguarda extra.
   */
  async touchLastLead(accountId: number | undefined, id: number): Promise<void> {
    const client = await this.getClient()
    try {
      if (accountId !== undefined) {
        await client.query(
          'UPDATE lead_sources SET last_lead_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND account_id = $2',
          [id, accountId]
        )
      } else {
        await client.query(
          'UPDATE lead_sources SET last_lead_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        )
      }
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM lead_sources WHERE id = $1 AND account_id = $2 RETURNING id',
        [id, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }
}
