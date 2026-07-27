import { AppointmentRepository } from '../repositories/index.js'
import { Appointment, AppointmentAnalytics, QueryFilters, ApiResponse } from '../types/index.js'

export class AppointmentService {
  private appointmentRepository: AppointmentRepository

  constructor(appointmentRepository: AppointmentRepository) {
    this.appointmentRepository = appointmentRepository
  }

  async getAllAppointments(accountId: number, filters: QueryFilters, userId: number): Promise<ApiResponse<Appointment[]>> {
    try {
      const appointments = await this.appointmentRepository.findAll(accountId, filters, userId)
      return {
        data: appointments,
        total: appointments.length
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      throw new Error('Internal server error')
    }
  }

  async createAppointment(
    accountId: number,
    appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Appointment> {
    try {
      return await this.appointmentRepository.create(accountId, appointmentData)
    } catch (error) {
      console.error('Error creating appointment:', error)
      throw new Error('Internal server error')
    }
  }

  async updateAppointment(
    accountId: number,
    id: number,
    appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Appointment> {
    try {
      const updatedAppointment = await this.appointmentRepository.update(accountId, id, appointmentData)
      if (!updatedAppointment) {
        throw new Error('Appointment not found')
      }
      return updatedAppointment
    } catch (error) {
      console.error('Error updating appointment:', error)
      if (error instanceof Error && error.message === 'Appointment not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async deleteAppointment(accountId: number, id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.appointmentRepository.delete(accountId, id)
      if (!deleted) {
        throw new Error('Appointment not found')
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting appointment:', error)
      if (error instanceof Error && error.message === 'Appointment not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async getLast7DaysAnalytics(accountId: number, timezone: string): Promise<{ data: AppointmentAnalytics[] }> {
    try {
      const analytics = await this.appointmentRepository.getLast7DaysAnalytics(accountId, timezone)
      return { data: analytics }
    } catch (error) {
      console.error('Error fetching appointments analytics:', error)
      throw new Error('Internal server error')
    }
  }

  async getLast7DaysAnalyticsByType(
    accountId: number,
    timezone: string
  ): Promise<{ data: Record<string, AppointmentAnalytics[]> }> {
    try {
      const analytics = await this.appointmentRepository.getLast7DaysAnalyticsByType(accountId, timezone)
      return { data: analytics }
    } catch (error) {
      console.error('Error fetching appointments analytics by type:', error)
      throw new Error('Internal server error')
    }
  }

  async getAnalyticsByDateRange(
    accountId: number,
    params: {
      from: string
      to: string
      timezone: string
      dateField: 'scheduled_datetime' | 'created_at'
    }
  ): Promise<{ data: AppointmentAnalytics[] }> {
    try {
      const analytics = await this.appointmentRepository.getAnalyticsByDateRange(accountId, params)
      return { data: analytics }
    } catch (error) {
      console.error('Error fetching appointments analytics by date range:', error)
      throw new Error('Internal server error')
    }
  }

  async getAnalyticsByTypeByDateRange(
    accountId: number,
    params: {
      from: string
      to: string
      timezone: string
      dateField: 'scheduled_datetime' | 'created_at'
    }
  ): Promise<{ data: Record<string, AppointmentAnalytics[]> }> {
    try {
      const analytics = await this.appointmentRepository.getAnalyticsByTypeByDateRange(accountId, params)
      return { data: analytics }
    } catch (error) {
      console.error('Error fetching appointments analytics by type by date range:', error)
      throw new Error('Internal server error')
    }
  }
}
