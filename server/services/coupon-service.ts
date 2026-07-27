import { CouponRepository, Coupon, CouponPayload } from '../repositories/coupon-repository.js'

/**
 * CouponService — CRUD do super-admin + endpoint público de validação
 * pra LP consumir antes do checkout.
 */
export class CouponService {
  constructor(private repo: CouponRepository) {}

  async list(): Promise<Coupon[]> {
    return this.repo.findAll()
  }

  async get(id: number): Promise<Coupon | null> {
    return this.repo.findById(id)
  }

  async create(payload: CouponPayload): Promise<Coupon> {
    this.validate(payload)
    const existing = await this.repo.findByCode(payload.code)
    if (existing) throw new Error('Já existe um cupom com esse código')
    return this.repo.create(payload)
  }

  async update(id: number, payload: Partial<CouponPayload>): Promise<Coupon | null> {
    if (payload.code) {
      const existing = await this.repo.findByCode(payload.code)
      if (existing && existing.id !== id) {
        throw new Error('Já existe um cupom com esse código')
      }
    }
    if (payload.discount_type && payload.discount_value !== undefined) {
      this.validate({
        code: payload.code || '',
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
        is_active: true,
      } as CouponPayload)
    }
    return this.repo.update(id, payload)
  }

  async delete(id: number): Promise<boolean> {
    return this.repo.delete(id)
  }

  /**
   * Validação pública. Consumida pela LP antes do checkout.
   *
   * Retorna:
   *   { valid: true, coupon: {...}, discount_display }
   *   { valid: false, error: '...' }
   *
   * Nunca lança exceção — sempre resolve o objeto pra facilitar UI.
   */
  async validateForCheckout(code: string, plan?: string): Promise<{
    valid: boolean
    error?: string
    coupon?: {
      code: string
      discount_type: 'percent' | 'fixed_brl'
      discount_value: number
      description?: string | null
    }
    discount_display?: string
  }> {
    if (!code || !code.trim()) {
      return { valid: false, error: 'Código vazio' }
    }
    const coupon = await this.repo.findByCode(code.trim())
    if (!coupon || !coupon.is_active) {
      return { valid: false, error: 'Cupom inválido' }
    }
    const now = new Date()
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { valid: false, error: 'Cupom ainda não está ativo' }
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { valid: false, error: 'Cupom expirado' }
    }
    if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
      return { valid: false, error: 'Cupom esgotado' }
    }
    if (coupon.plan_filter && plan && coupon.plan_filter !== plan) {
      return { valid: false, error: `Cupom válido só para o plano ${coupon.plan_filter}` }
    }
    const discount_display =
      coupon.discount_type === 'percent'
        ? `${coupon.discount_value}% de desconto em todas as mensalidades`
        : `R$ ${(coupon.discount_value / 100).toFixed(2).replace('.', ',')} de desconto em todas as mensalidades`
    return {
      valid: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        description: coupon.description,
      },
      discount_display,
    }
  }

  private validate(payload: CouponPayload) {
    if (!payload.code || !payload.code.trim()) throw new Error('Código é obrigatório')
    if (!['percent', 'fixed_brl'].includes(payload.discount_type)) {
      throw new Error('discount_type inválido')
    }
    if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0) {
      throw new Error('Valor do desconto deve ser positivo')
    }
    if (payload.discount_type === 'percent' && payload.discount_value > 100) {
      throw new Error('Percentual não pode ser maior que 100')
    }
  }
}
