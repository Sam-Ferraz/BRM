import { randomBytes } from 'crypto'
import { BaseRepository } from './base-repository.js'
import { LeadSource, LeadSourceStatus, LeadSourceType } from '../types/index.js'

export class LeadSourceRepository extends BaseRepository {
  async findAll(): Promise<LeadSource[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM lead_sources ORDER BY created_at DESC'
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<LeadSource | null> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT * FROM lead_sources WHERE id = $1', [id])
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

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

  async create(input: {
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
        `INSERT INTO lead_sources (name, type, config, webhook_token, status)
         VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING *`,
        [
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
        return this.findById(id)
      }
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      const query = `UPDATE lead_sources SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`
      const result = await client.query(query, values)
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async touchLastLead(id: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        'UPDATE lead_sources SET last_lead_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      )
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM lead_sources WHERE id = $1 RETURNING id', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }
}
