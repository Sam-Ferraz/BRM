import { BaseRepository } from './base-repository.js'

export interface Coupon {
  id: number
  code: string
  description?: string | null
  discount_type: 'percent' | 'fixed_brl'
  discount_value: number
  valid_from?: Date
  valid_until?: Date | null
  max_uses?: number | null
  uses_count: number
  plan_filter?: string | null
  is_active: boolean
  created_at?: Date
  updated_at?: Date
}

export type CouponPayload = Omit<Coupon, 'id' | 'uses_count' | 'created_at' | 'updated_at'>

/**
 * Repositório de cupons. Cupons são globais (não têm account_id) — são
 * gerenciados pelo super-admin da BRM Demo e consumidos publicamente pela LP.
 */
export class CouponRepository extends BaseRepository {
  async findAll(): Promise<Coupon[]> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT * FROM coupons ORDER BY is_active DESC, created_at DESC')
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<Coupon | null> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT * FROM coupons WHERE id = $1', [id])
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1)',
        [code]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(payload: CouponPayload): Promise<Coupon> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO coupons (code, description, discount_type, discount_value, valid_from, valid_until, max_uses, plan_filter, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          payload.code.toUpperCase().trim(),
          payload.description || null,
          payload.discount_type,
          payload.discount_value,
          payload.valid_from || new Date(),
          payload.valid_until || null,
          payload.max_uses || null,
          payload.plan_filter || null,
          payload.is_active,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, payload: Partial<CouponPayload>): Promise<Coupon | null> {
    const client = await this.getClient()
    try {
      const sets: string[] = []
      const values: any[] = []
      let p = 1
      const fields: (keyof CouponPayload)[] = ['code', 'description', 'discount_type', 'discount_value', 'valid_from', 'valid_until', 'max_uses', 'plan_filter', 'is_active']
      for (const f of fields) {
        if (payload[f] !== undefined) {
          sets.push(`${f} = $${p++}`)
          values.push(f === 'code' && payload[f] ? String(payload[f]).toUpperCase().trim() : payload[f])
        }
      }
      if (sets.length === 0) return this.findById(id)
      values.push(id)
      const result = await client.query(
        `UPDATE coupons SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`,
        values
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM coupons WHERE id = $1 RETURNING id', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Incrementa uses_count atômicamente. Chamado quando LP finaliza compra.
   * NÃO valida limites aqui — quem valida é o service.
   */
  async incrementUses(id: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1', [id])
    } finally {
      this.releaseClient(client)
    }
  }
}
