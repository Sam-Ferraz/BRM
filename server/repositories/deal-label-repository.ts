import { BaseRepository } from './base-repository.js'

export interface DealLabel {
  id: number
  account_id: number
  name: string
  color: string
  created_at?: string
}

export class DealLabelRepository extends BaseRepository {
  async findAll(accountId: number): Promise<DealLabel[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM deal_labels WHERE account_id = $1 ORDER BY name ASC',
        [accountId],
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, name: string, color: string): Promise<DealLabel> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO deal_labels (account_id, name, color) VALUES ($1, $2, $3) RETURNING *',
        [accountId, name, color],
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(
    accountId: number,
    id: number,
    updates: { name?: string; color?: string },
  ): Promise<DealLabel | null> {
    const client = await this.getClient()
    try {
      const fields: string[] = []
      const values: any[] = []
      let i = 1
      if (updates.name !== undefined) {
        fields.push(`name = $${i++}`)
        values.push(updates.name)
      }
      if (updates.color !== undefined) {
        fields.push(`color = $${i++}`)
        values.push(updates.color)
      }
      if (fields.length === 0) return this.findById(accountId, id)
      values.push(id, accountId)
      const result = await client.query(
        `UPDATE deal_labels SET ${fields.join(', ')} WHERE id = $${i++} AND account_id = $${i++} RETURNING *`,
        values,
      )
      return result.rows[0] ?? null
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<DealLabel | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM deal_labels WHERE id = $1 AND account_id = $2',
        [id, accountId],
      )
      return result.rows[0] ?? null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM deal_labels WHERE id = $1 AND account_id = $2',
        [id, accountId],
      )
      return (result.rowCount ?? 0) > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async findByDeal(accountId: number, dealId: number): Promise<DealLabel[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT dl.* FROM deal_labels dl
           JOIN deal_label_assignments a ON a.label_id = dl.id
          WHERE a.deal_id = $1 AND dl.account_id = $2
          ORDER BY dl.name ASC`,
        [dealId, accountId],
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Bulk lookup: retorna todas as (deal_id, label) das dealIds passadas.
   * Usado pelo Kanban pra evitar N+1 queries ao renderizar cards com
   * suas etiquetas. Filtra por account (defesa em profundidade).
   */
  async findByDeals(
    accountId: number,
    dealIds: number[],
  ): Promise<Array<DealLabel & { deal_id: number }>> {
    if (dealIds.length === 0) return []
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT dl.*, a.deal_id
           FROM deal_labels dl
           JOIN deal_label_assignments a ON a.label_id = dl.id
          WHERE a.deal_id = ANY($1::int[]) AND dl.account_id = $2
          ORDER BY dl.name ASC`,
        [dealIds, accountId],
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async assignToDeal(accountId: number, dealId: number, labelId: number): Promise<boolean> {
    // Confere que o label pertence a mesma account (defesa em profundidade)
    const label = await this.findById(accountId, labelId)
    if (!label) return false
    const client = await this.getClient()
    try {
      await client.query(
        'INSERT INTO deal_label_assignments (deal_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [dealId, labelId],
      )
      return true
    } finally {
      this.releaseClient(client)
    }
  }

  async unassignFromDeal(accountId: number, dealId: number, labelId: number): Promise<boolean> {
    const label = await this.findById(accountId, labelId)
    if (!label) return false
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM deal_label_assignments WHERE deal_id = $1 AND label_id = $2',
        [dealId, labelId],
      )
      return (result.rowCount ?? 0) > 0
    } finally {
      this.releaseClient(client)
    }
  }
}
