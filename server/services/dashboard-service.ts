import { DealRepository, ClientRepository, ProductRepository, AppointmentRepository, SalesAgendaRepository, FollowUpRepository } from '../repositories/index.js'
import { DashboardStats } from '../types/index.js'

export class DashboardService {
  private dealRepository: DealRepository
  private clientRepository: ClientRepository
  private productRepository: ProductRepository
  private appointmentRepository: AppointmentRepository
  private salesAgendaRepository: SalesAgendaRepository
  private followUpRepository: FollowUpRepository

  constructor(
    dealRepository: DealRepository,
    clientRepository: ClientRepository,
    productRepository: ProductRepository,
    appointmentRepository: AppointmentRepository,
    salesAgendaRepository: SalesAgendaRepository,
    followUpRepository: FollowUpRepository
  ) {
    this.dealRepository = dealRepository
    this.clientRepository = clientRepository
    this.productRepository = productRepository
    this.appointmentRepository = appointmentRepository
    this.salesAgendaRepository = salesAgendaRepository
    this.followUpRepository = followUpRepository
  }

  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const [
      totalDeals,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalFollowUps
    ] = await Promise.all([
      this.dealRepository.getCount(userId),
      this.clientRepository.getCount(),
      this.productRepository.getCount(),
      this.appointmentRepository.getCount(userId),
      this.salesAgendaRepository.getCount(userId),
      this.followUpRepository.getCount(userId)
    ])

    return {
      totalDeals,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalFollowUps
    }
  }
}