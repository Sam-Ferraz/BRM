import { DealRepository, ClientRepository, ProductRepository, AppointmentRepository, SalesAgendaRepository, FollowUpRepository, ProposalRepository, ConversationRepository, LeadRepository } from '../repositories/index.js'
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

  constructor(
    dealRepository: DealRepository,
    clientRepository: ClientRepository,
    productRepository: ProductRepository,
    appointmentRepository: AppointmentRepository,
    salesAgendaRepository: SalesAgendaRepository,
    followUpRepository: FollowUpRepository,
    proposalRepository: ProposalRepository,
    conversationRepository: ConversationRepository,
    leadRepository: LeadRepository
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
      unansweredConversations,
      unansweredCalls,
      leadCounts,
      totalShowcaseProducts,
    ] = await Promise.all([
      this.dealRepository.getActiveCount(accountId, userId),
      this.clientRepository.getCount(accountId),
      this.productRepository.getCount(accountId),
      this.appointmentRepository.getCount(accountId, userId),
      this.salesAgendaRepository.getCount(accountId, userId),
      this.followUpRepository.getCount(accountId, userId),
      this.proposalRepository.getActiveCount(accountId, userId),
      this.conversationRepository.countConversationsWithUnread(accountId, userId),
      this.appointmentRepository.getCountUnansweredCalls(accountId, userId),
      this.leadRepository.getCountByStatus(accountId),
      this.productRepository.getShowcaseCount(accountId),
    ])

    return {
      totalDeals: activeDealsCount,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalShowcaseProducts,
      totalFollowUps,
      totalProposals,
      pendingChatAndCalls: unansweredConversations + unansweredCalls,
      newLeads: leadCounts.novo
    }
  }
}
