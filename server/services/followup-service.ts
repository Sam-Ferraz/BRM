import { FollowUpRepository } from '../repositories/index.js'
import { FollowUp, FollowUpWithDetails, QueryFilters, ApiResponse } from '../types/index.js'

export class FollowUpService {
  private followUpRepository: FollowUpRepository

  constructor(followUpRepository: FollowUpRepository) {
    this.followUpRepository = followUpRepository
  }

  async getAllFollowUps(filters: QueryFilters, userId: number): Promise<ApiResponse<FollowUpWithDetails[]>> {
    try {
      const followUps = await this.followUpRepository.findAll(filters, userId)
      return {
        data: followUps,
        total: followUps.length
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      throw new Error('Internal server error')
    }
  }

  async getFollowUpById(id: number): Promise<FollowUpWithDetails> {
    try {
      const followUp = await this.followUpRepository.findById(id)
      if (!followUp) {
        throw new Error('Follow-up not found')
      }
      return followUp
    } catch (error) {
      console.error('Error fetching follow-up:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async getFollowUpsByAppointmentId(appointmentId: number): Promise<ApiResponse<FollowUp[]>> {
    try {
      const followUps = await this.followUpRepository.findByAppointmentId(appointmentId)
      return {
        data: followUps,
        total: followUps.length
      }
    } catch (error) {
      console.error('Error fetching follow-ups by appointment:', error)
      throw new Error('Internal server error')
    }
  }

  async createFollowUp(followUpData: Omit<FollowUp, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<FollowUp> {
    try {
      return await this.followUpRepository.create(followUpData)
    } catch (error) {
      console.error('Error creating follow-up:', error)
      throw new Error('Internal server error')
    }
  }

  async updateFollowUp(id: number, followUpData: Partial<Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>>): Promise<FollowUp> {
    try {
      const updatedFollowUp = await this.followUpRepository.update(id, followUpData)
      if (!updatedFollowUp) {
        throw new Error('Follow-up not found')
      }
      return updatedFollowUp
    } catch (error) {
      console.error('Error updating follow-up:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async markAsCompleted(id: number): Promise<FollowUp> {
    try {
      const updatedFollowUp = await this.followUpRepository.update(id, { completed: true })
      if (!updatedFollowUp) {
        throw new Error('Follow-up not found')
      }
      return updatedFollowUp
    } catch (error) {
      console.error('Error marking follow-up as completed:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async deleteFollowUp(id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.followUpRepository.delete(id)
      if (!deleted) {
        throw new Error('Follow-up not found')
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting follow-up:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async getStatusCounts(userId: number): Promise<{ data: { open: number; pending: number; overdue: number } }> {
    try {
      const counts = await this.followUpRepository.getCountByStatus(userId)
      return { data: counts }
    } catch (error) {
      console.error('Error fetching follow-up status counts:', error)
      throw new Error('Internal server error')
    }
  }
}
