import { BaseRepository } from './base-repository.js'
import { Pipeline } from '../types/index.js'

export class PipelineRepository extends BaseRepository {
  async findAll(accountId: number): Promise<Pipeline[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM pipelines WHERE account_id = $1 ORDER BY position ASC, id ASC',
        [accountId]
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<Pipeline | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM pipelines WHERE id = $1 AND account_id = $2',
        [id, accountId]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(
    accountId: number,
    input: { name: string; color?: string; position?: number; is_default?: boolean; custom_config?: Record<string, any> }
  ): Promise<Pipeline> {
    const client = await this.getClient()
    try {
      // Se setou is_default=true, zera o default anterior pra manter a regra
      // de um unico default por conta (parcial unique index garante no DB).
      if (input.is_default) {
        await client.query(
          'UPDATE pipelines SET is_default = FALSE WHERE account_id = $1 AND is_default = TRUE',
          [accountId]
        )
      }
      const result = await client.query(
        `INSERT INTO pipelines (account_id, name, color, position, is_default, custom_config)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          accountId,
          input.name,
          input.color || '#0c343d',
          input.position ?? 999,
          input.is_default || false,
          input.custom_config || {},
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
    input: Partial<{ name: string; color: string; position: number; is_default: boolean; custom_config: Record<string, any> }>
  ): Promise<Pipeline | null> {
    const client = await this.getClient()
    try {
      if (input.is_default === true) {
        await client.query(
          'UPDATE pipelines SET is_default = FALSE WHERE account_id = $1 AND is_default = TRUE AND id != $2',
          [accountId, id]
        )
      }
      // Build dynamic UPDATE
      const fields: string[] = []
      const values: any[] = []
      let idx = 1
      for (const [k, v] of Object.entries(input)) {
        fields.push(`${k} = $${idx++}`)
        values.push(v)
      }
      if (fields.length === 0) return this.findById(accountId, id)
      fields.push('updated_at = NOW()')
      values.push(id, accountId)
      const result = await client.query(
        `UPDATE pipelines SET ${fields.join(', ')} WHERE id = $${idx++} AND account_id = $${idx} RETURNING *`,
        values
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      // Nao permite excluir o unico funil (ou o default) pra nao deixar os
      // deals orfaos sem navegacao. Admin tem que criar outro default antes.
      const count = await client.query(
        'SELECT COUNT(*)::int as n FROM pipelines WHERE account_id = $1',
        [accountId]
      )
      if (count.rows[0].n <= 1) {
        throw new Error('Nao e possivel excluir o unico funil — crie outro antes')
      }
      const result = await client.query(
        'DELETE FROM pipelines WHERE id = $1 AND account_id = $2 RETURNING id',
        [id, accountId]
      )
      return result.rowCount != null && result.rowCount > 0
    } finally {
      this.releaseClient(client)
    }
  }
}
