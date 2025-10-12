import { DealRepository, ClientRepository, ProductRepository, AppointmentRepository, SalesAgendaRepository } from '../repositories/index.js'
import { DashboardStats } from '../types/index.js'

export class DashboardService {
  private dealRepository: DealRepository
  private clientRepository: ClientRepository
  private productRepository: ProductRepository
  private appointmentRepository: AppointmentRepository
  private salesAgendaRepository: SalesAgendaRepository

  constructor(
    dealRepository: DealRepository,
    clientRepository: ClientRepository,
    productRepository: ProductRepository,
    appointmentRepository: AppointmentRepository,
    salesAgendaRepository: SalesAgendaRepository
  ) {
    this.dealRepository = dealRepository
    this.clientRepository = clientRepository
    this.productRepository = productRepository
    this.appointmentRepository = appointmentRepository
    this.salesAgendaRepository = salesAgendaRepository
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalDeals,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda
    ] = await Promise.all([
      this.dealRepository.getCount(),
      this.clientRepository.getCount(),
      this.productRepository.getCount(),
      this.appointmentRepository.getCount(),
      this.salesAgendaRepository.getCount()
    ])

    return {
      totalDeals,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda
    }
  }
}