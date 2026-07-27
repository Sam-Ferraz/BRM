import { DealRepository, ClientRepository, ProductRepository, AppointmentRepository, SalesAgendaRepository, FollowUpRepository, ProposalRepository, ConversationRepository, LeadRepository, SaleRepository, ContractRepository } from '../repositories/index.js'
import { DashboardStats } from '../types/index.js'

export class DashboardService {
  private dealRepository: DealRepository
  private clientRepository: ClientRepository
  private productRepository: ProductRepository
  private appointmentRepository: AppointmentRepository
  private salesAgendaRepository: SalesAgendaRepository
  private followUpRepository: FollowUpRepository
  private proposalRepository: ProposalRepository
  private conversationRepository: ConversationRepository
  private leadRepository: LeadRepository
  private saleRepository: SaleRepository
  private contractRepository: ContractRepository

  constructor(
    dealRepository: DealRepository,
    clientRepository: ClientRepository,
    productRepository: ProductRepository,
    appointmentRepository: AppointmentRepository,
    salesAgendaRepository: SalesAgendaRepository,
    followUpRepository: FollowUpRepository,
    proposalRepository: ProposalRepository,
    conversationRepository: ConversationRepository,
    leadRepository: LeadRepository,
    saleRepository: SaleRepository,
    contractRepository: ContractRepository
  ) {
    this.dealRepository = dealRepository
    this.clientRepository = clientRepository
    this.productRepository = productRepository
    this.appointmentRepository = appointmentRepository
    this.salesAgendaRepository = salesAgendaRepository
    this.followUpRepository = followUpRepository
    this.proposalRepository = proposalRepository
    this.conversationRepository = conversationRepository
    this.leadRepository = leadRepository
    this.saleRepository = saleRepository
    this.contractRepository = contractRepository
  }

  // Multi-tenancy: recebe accountId + userId. accountId isola por empresa;
  // userId continua sendo usado nos contadores "meus" (deals do corretor,
  // atendimentos do corretor, etc).
  async getDashboardStats(accountId: number, userId: number): Promise<DashboardStats> {
    const [
      activeDealsCount,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalFollowUps,
      totalProposals,
      unreadMessages,
      unansweredCalls,
      leadCounts,
      totalShowcaseProducts,
      totalSales,
      contractCounts,
    ] = await Promise.all([
      this.dealRepository.getActiveCount(accountId, userId),
      this.clientRepository.getCount(accountId),
      this.productRepository.getCount(accountId),
      this.appointmentRepository.getCount(accountId, userId),
      this.salesAgendaRepository.getCount(accountId, userId),
      this.followUpRepository.getCount(accountId, userId),
      this.proposalRepository.getActiveCount(accountId, userId),
      this.conversationRepository.sumUnreadMessages(accountId, userId),
      this.appointmentRepository.getCountUnansweredCalls(accountId, userId),
      this.leadRepository.getCountByStatus(accountId),
      this.productRepository.getShowcaseCount(accountId),
      this.saleRepository.getCount(accountId),
      this.contractRepository.getCountByStatus(accountId, userId),
    ])

    const totalActiveContracts = Object.entries(contractCounts)
      .filter(([status]) => status !== 'approved')
      .reduce((sum, [, n]) => sum + n, 0)

    return {
      totalDeals: activeDealsCount,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalShowcaseProducts,
      totalFollowUps,
      totalProposals,
      totalSales,
      totalContracts: totalActiveContracts,
      pendingChatAndCalls: unreadMessages + unansweredCalls,
      newLeads: leadCounts.novo
    }
  }
}
