import { AppointmentRepository } from '../repositories/index.js'
import { Appointment, AppointmentAnalytics, QueryFilters, ApiResponse } from '../types/index.js'

export class AppointmentService {
  private appointmentRepository: AppointmentRepository

  constructor(appointmentRepository: AppointmentRepository) {
    this.appointmentRepository = appointmentRepository
  }

  async getAllAppointments(filters: QueryFilters): Promise<ApiResponse<Appointment[]>> {
    try {
      const appointments = await this.appointmentRepository.findAll(filters)
      return {
        data: appointments,
        total: appointments.length
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      throw new Error('Internal server error')
    }
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    try {
      return await this.appointmentRepository.create(appointmentData)
    } catch (error) {
      console.error('Error creating appointment:', error)
      throw new Error('Internal server error')
    }
  }

  async updateAppointment(id: number, appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    try {
      const updatedAppointment = await this.appointmentRepository.update(id, appointmentData)
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

  async deleteAppointment(id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.appointmentRepository.delete(id)
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

  async getLast7DaysAnalytics(): Promise<{ data: AppointmentAnalytics[] }> {
    try {
      const analytics = await this.appointmentRepository.getLast7DaysAnalytics()
      return { data: analytics }
    } catch (error) {
      console.error('Error fetching appointments analytics:', error)
      throw new Error('Internal server error')
    }
  }

  async getLast7DaysAnalyticsByType(): Promise<{ data: Record<string, AppointmentAnalytics[]> }> {
    try {
      const analytics = await this.appointmentRepository.getLast7DaysAnalyticsByType()
      return { data: analytics }
    } catch (error) {
      console.error('Error fetching appointments analytics by type:', error)
      throw new Error('Internal server error')
    }
  }
}