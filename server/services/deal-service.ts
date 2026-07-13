import { DealRepository } from '../repositories/index.js'
import { Deal, DealFunnelStage, QueryFilters, ApiResponse } from '../types/index.js'
export class DealService {
  private dealRepository: DealRepository
  constructor(dealRepository: DealRepository) {
    this.dealRepository = dealRepository
  }
  async getAllDeals(filters: QueryFilters, userId: number): Promise<ApiResponse<Deal[]>> {
    try {
      const deals = await this.dealRepository.findAll(filters, userId)
      return {
        data: deals,
        total: deals.length
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
      throw new Error('Internal server error')
    }
  }
  async createDeal(dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    try {
      return await this.dealRepository.create(dealData)
    } catch (error) {
      console.error('Error creating deal:', error)
      throw new Error('Internal server error')
    }
  }
  async updateDeal(id: number, dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    try {
      const updatedDeal = await this.dealRepository.update(id, dealData)
      if (!updatedDeal) {
        throw new Error('Deal not found')
      }
      return updatedDeal
    } catch (error) {
      console.error('Error updating deal:', error)
      if (error instanceof Error && error.message === 'Deal not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }
  /**
   * Update parcial de status apenas — usado pelo drag-and-drop do Kanban,
   * onde o front só quer mudar status sem enviar o payload completo.
   */
  async updateDealStatus(id: number, status: Deal['status']): Promise<Deal> {
    try {
      const updated = await this.dealRepository.updateStatus(id, status)
      if (!updated) throw new Error('Deal not found')
      return updated
    } catch (error) {
      console.error('Error updating deal status:', error)
      if (error instanceof Error && error.message === 'Deal not found') throw error
      throw new Error('Internal server error')
    }
  }

  async deleteDeal(id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.dealRepository.delete(id)
      if (!deleted) {
        throw new Error('Deal not found')
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting deal:', error)
      if (error instanceof Error && error.message === 'Deal not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }
  async getDealsWithoutOpenFollowUps(userId: number): Promise<ApiResponse<Deal[]>> {
    try {
      const deals = await this.dealRepository.findWithoutOpenFollowUps(userId)
      return {
        data: deals,
        total: deals.length
      }
    } catch (error) {
      console.error('Error fetching deals without open follow-ups:', error)
      throw new Error('Internal server error')
    }
  }

  /**
   * Returns deal counts grouped by status across ALL users (company-wide).
   * Used by the deal funnel chart in the Analytics page. Optional date range
   * + dateField narrows the funnel to deals whose chosen date column falls
   * inside the range (inclusive).
   */
  async getFunnel(params?: {
    from?: string
    to?: string
    timezone?: string
    dateField?: 'origin_date' | 'created_at'
  }): Promise<{ data: DealFunnelStage[] }> {
    try {
      const stages = await this.dealRepository.getFunnelByStatus(params)
      return { data: stages }
    } catch (error) {
      console.error('Error fetching deal funnel:', error)
      throw new Error('Internal server error')
    }
  }

  /**
   * Retorna os Negócios que estão em atraso de cadência — usados pra render
   * do badge "Cadência" no Kanban de Negócios.
   *
   * userId opcional: filtra pra ver só os deals do usuário logado (o corretor
   * vê seus próprios cards; gerência vê tudo).
   */
  async getDealsNeedingCadence(userId?: number): Promise<{
    data: Array<{ deal_id: number; attempts: number; days_in_wallet: number }>
  }> {
    try {
      const rows = await this.dealRepository.getDealsNeedingCadence(userId)
      return { data: rows }
    } catch (error) {
      console.error('Error fetching deals needing cadence:', error)
      throw new Error('Internal server error')
    }
  }
}
