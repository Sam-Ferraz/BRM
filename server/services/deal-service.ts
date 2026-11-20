import { DealRepository, DealLabelRepository } from '../repositories/index.js'
import { Deal, DealFunnelStage, QueryFilters, ApiResponse } from '../types/index.js'

/**
 * Nomes das labels-semente que representam a temperatura do deal.
 * Devem bater com os seed labels criados no frontend em DealsPage.tsx
 * (SEED_LABELS). A comparacao e case-insensitive + trim.
 */
const TEMPERATURE_TO_LABEL_NAME: Record<'cold' | 'mild' | 'warm', string> = {
  cold: 'Frio',
  mild: 'Morno',
  warm: 'Quente',
}

function extractTemperature(status: string | undefined | null): 'cold' | 'mild' | 'warm' | null {
  if (!status) return null
  if (status.endsWith('_cold')) return 'cold'
  if (status.endsWith('_mild')) return 'mild'
  if (status.endsWith('_warm')) return 'warm'
  return null
}

export class DealService {
  private dealRepository: DealRepository
  private dealLabelRepository: DealLabelRepository | null

  constructor(dealRepository: DealRepository, dealLabelRepository?: DealLabelRepository) {
    this.dealRepository = dealRepository
    this.dealLabelRepository = dealLabelRepository ?? null
  }

  /**
   * Sincroniza as etiquetas de temperatura (Frio/Morno/Quente) com o status
   * do deal: a correspondente ao sufixo _cold/_mild/_warm e atribuida, as
   * outras 2 sao removidas. Se o status nao tem temperatura (ex: proposal,
   * sold), as 3 sao removidas.
   *
   * Falha silenciosa (log so) — se o repo de labels nao foi injetado ou as
   * labels nao existem na conta ainda, o update do deal nao e bloqueado.
   */
  private async syncTemperatureLabels(accountId: number, dealId: number, status: string | null | undefined): Promise<void> {
    if (!this.dealLabelRepository) return
    try {
      const temp = extractTemperature(status)
      const desiredName = temp ? TEMPERATURE_TO_LABEL_NAME[temp] : null
      const allLabels = await this.dealLabelRepository.findAll(accountId)
      const tempLabels = allLabels.filter((l: { name: string }) =>
        Object.values(TEMPERATURE_TO_LABEL_NAME).some(
          (name) => l.name.trim().toLowerCase() === name.toLowerCase()
        )
      )
      const repo = this.dealLabelRepository
      await Promise.all(
        tempLabels.map((lb: { id: number; name: string }) => {
          const matches = desiredName && lb.name.trim().toLowerCase() === desiredName.toLowerCase()
          return matches
            ? repo.assignToDeal(accountId, dealId, lb.id).catch(() => false)
            : repo.unassignFromDeal(accountId, dealId, lb.id).catch(() => false)
        })
      )
    } catch (err) {
      console.warn('[DealService] Falha ao sincronizar labels de temperatura:', err)
    }
  }
  async getAllDeals(accountId: number, filters: QueryFilters, userId: number): Promise<ApiResponse<Deal[]>> {
    try {
      const deals = await this.dealRepository.findAll(accountId, filters, userId)
      return {
        data: deals,
        total: deals.length
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
      throw new Error('Internal server error')
    }
  }
  async createDeal(accountId: number, dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    try {
      const created = await this.dealRepository.create(accountId, dealData)
      // Sincroniza label de temperatura logo apos criar — assim o deal ja
      // nasce com a etiqueta Frio/Morno/Quente correta vinculada.
      await this.syncTemperatureLabels(accountId, created.id, created.status)
      return created
    } catch (error) {
      console.error('Error creating deal:', error)
      throw new Error('Internal server error')
    }
  }
  async updateDeal(accountId: number, id: number, dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    try {
      const updatedDeal = await this.dealRepository.update(accountId, id, dealData)
      if (!updatedDeal) {
        throw new Error('Deal not found')
      }
      await this.syncTemperatureLabels(accountId, updatedDeal.id, updatedDeal.status)
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
  async updateDealStatus(accountId: number, id: number, status: Deal['status']): Promise<Deal> {
    try {
      const updated = await this.dealRepository.updateStatus(accountId, id, status)
      if (!updated) throw new Error('Deal not found')
      await this.syncTemperatureLabels(accountId, updated.id, updated.status)
      return updated
    } catch (error) {
      console.error('Error updating deal status:', error)
      if (error instanceof Error && error.message === 'Deal not found') throw error
      throw new Error('Internal server error')
    }
  }

  async deleteDeal(accountId: number, id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.dealRepository.delete(accountId, id)
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
  async getDealsWithoutOpenFollowUps(accountId: number, userId: number): Promise<ApiResponse<Deal[]>> {
    try {
      const deals = await this.dealRepository.findWithoutOpenFollowUps(accountId, userId)
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
   * Returns deal counts grouped by status across ALL users of the account
   * (company-wide). Used by the deal funnel chart in the Analytics page.
   * Optional date range + dateField narrows the funnel to deals whose
   * chosen date column falls inside the range (inclusive).
   */
  async getFunnel(accountId: number, params?: {
    from?: string
    to?: string
    timezone?: string
    dateField?: 'origin_date' | 'created_at'
  }): Promise<{ data: DealFunnelStage[] }> {
    try {
      const stages = await this.dealRepository.getFunnelByStatus(accountId, params)
      return { data: stages }
    } catch (error) {
      console.error('Error fetching deal funnel:', error)
      throw new Error('Internal server error')
    }
  }

  /**
   * Agregação por origem do cliente pra o gráfico radar no BI.
   */
  async getPerformanceByOrigin(accountId: number): Promise<{
    data: Array<{
      origin: string
      service_count: number
      visit_count: number
      proposal_count: number
      sale_count: number
    }>
  }> {
    try {
      const rows = await this.dealRepository.getPerformanceByOrigin(accountId)
      return { data: rows }
    } catch (error) {
      console.error('Error fetching performance by origin:', error)
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
  async getDealsNeedingCadence(accountId: number, userId?: number): Promise<{
    data: Array<{ deal_id: number; attempts: number; days_in_wallet: number }>
  }> {
    try {
      const rows = await this.dealRepository.getDealsNeedingCadence(accountId, userId)
      return { data: rows }
    } catch (error) {
      console.error('Error fetching deals needing cadence:', error)
      throw new Error('Internal server error')
    }
  }
}
