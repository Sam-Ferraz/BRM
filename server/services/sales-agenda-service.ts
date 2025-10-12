import { SalesAgendaRepository } from '../repositories/index.js'
import { SalesAgenda, QueryFilters, ApiResponse } from '../types/index.js'

export class SalesAgendaService {
  private salesAgendaRepository: SalesAgendaRepository

  constructor(salesAgendaRepository: SalesAgendaRepository) {
    this.salesAgendaRepository = salesAgendaRepository
  }

  async getAllSalesAgenda(filters: QueryFilters): Promise<ApiResponse<SalesAgenda[]>> {
    try {
      const salesAgenda = await this.salesAgendaRepository.findAll(filters)
      return {
        data: salesAgenda,
        total: salesAgenda.length
      }
    } catch (error) {
      console.error('Error fetching sales agenda:', error)
      throw new Error('Internal server error')
    }
  }

  async createSalesAgenda(salesAgendaData: Omit<SalesAgenda, 'id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda> {
    try {
      // Validate required fields
      if (!salesAgendaData.product_name) {
        throw new Error('Product name is required')
      }

      return await this.salesAgendaRepository.create(salesAgendaData)
    } catch (error) {
      console.error('Error creating sales agenda:', error)
      if (error instanceof Error && error.message === 'Product name is required') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async updateSalesAgenda(id: number, salesAgendaData: Omit<SalesAgenda, 'id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda> {
    try {
      // Validate required fields
      if (!salesAgendaData.product_name) {
        throw new Error('Product name is required')
      }

      const updatedSalesAgenda = await this.salesAgendaRepository.update(id, salesAgendaData)
      if (!updatedSalesAgenda) {
        throw new Error('Sales agenda not found')
      }
      return updatedSalesAgenda
    } catch (error) {
      console.error('Error updating sales agenda:', error)
      if (error instanceof Error && (error.message === 'Sales agenda not found' || error.message === 'Product name is required')) {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async deleteSalesAgenda(id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.salesAgendaRepository.delete(id)
      if (!deleted) {
        throw new Error('Sales agenda not found')
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting sales agenda:', error)
      if (error instanceof Error && error.message === 'Sales agenda not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }
}