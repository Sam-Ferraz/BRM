import { AppointmentRepository, FollowUpRepository } from '../repositories/index.js'
import { Appointment, AppointmentAnalytics, QueryFilters, ApiResponse } from '../types/index.js'

export class AppointmentService {
  private appointmentRepository: AppointmentRepository
  private followUpRepository: FollowUpRepository | null

  /**
   * followUpRepository e opcional: injetado quando a service precisa
   * auto-criar follow-up pra agendamentos (type='schedule'). Testes antigos
   * que mocavam a service continuam funcionando sem passar o segundo arg.
   */
  constructor(appointmentRepository: AppointmentRepository, followUpRepository?: FollowUpRepository) {
    this.appointmentRepository = appointmentRepository
    this.followUpRepository = followUpRepository ?? null
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
      // Agendamento (type='schedule') sempre nasce como "atendido" — o fato
      // de ter conseguido marcar o compromisso ja' conta como contato bem
      // sucedido com o cliente. Isso tambem alimenta os contadores de
      // "Atendimentos realizados" no grafico sem precisar de logica extra.
      if (appointmentData.type === 'schedule') {
        appointmentData = { ...appointmentData, answered: true }
      }

      const created = await this.appointmentRepository.create(accountId, appointmentData)

      // Agendamento gera follow-up automatico (mesmo workflow): a acao prevista
      // (reuniao ou visita) + descricao vira o texto do follow-up, e a data
      // agendada vira a data de execucao. Mantem a Secao de Follow-ups sempre
      // mostrando os agendamentos marcados.
      if (created.type === 'schedule' && this.followUpRepository) {
        try {
          const actionLabel =
            created.schedule_action === 'visit' ? 'Visita presencial' :
            created.schedule_action === 'remote_presentation' ? 'Apresentacao remota' :
            'Reuniao de alinhamento'
          const desc = (created.description ?? '').trim()
          const nextAction = desc ? `Agendamento (${actionLabel}): ${desc}` : `Agendamento: ${actionLabel}`
          const sd: any = created.scheduled_datetime
          const scheduledDate = sd instanceof Date
            ? sd.toISOString().slice(0, 10)
            : String(sd).slice(0, 10)
          await this.followUpRepository.create(accountId, {
            appointment_id: created.id,
            client_name: created.client,
            next_action: nextAction,
            next_action_date: scheduledDate,
            completed: false,
            user_id: created.user_id,
          })
        } catch (fuErr) {
          // Nao quebra a criacao do appointment se o follow-up falhar — loga.
          console.warn('[AppointmentService] auto-create follow-up for schedule failed:', fuErr)
        }
      }

      return created
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
