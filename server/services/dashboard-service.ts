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

  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const [
      totalDeals,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalFollowUps,
      totalProposals,
      unreadMessages,
      unansweredCalls,
      leadCounts,
      totalShowcaseProducts
    ] = await Promise.all([
      this.dealRepository.getCount(userId),
      this.clientRepository.getCount(),
      this.productRepository.getCount(),
      // Inclui atendimentos manuais E os auto-criados pelo ChatService a partir
      // de interações bilaterais do WhatsApp (origin='whatsapp', dedupe 24h).
      this.appointmentRepository.getCount(userId),
      this.salesAgendaRepository.getCount(userId),
      this.followUpRepository.getCount(userId),
      // Only "in-flight" proposals (pending/accepted/counter_proposal); rejected & expired excluded
      this.proposalRepository.getActiveCount(userId),
      // Pendências de comunicação — filtradas pelo usuário logado
      // (cada user tem o próprio número WhatsApp).
      //  • unreadMessages   = mensagens entrantes ainda não vistas pelo corretor
      //  • unansweredCalls  = ligações (appointments type='call') sem answered=true
      this.conversationRepository.sumUnreadMessages(userId),
      this.appointmentRepository.getCountUnansweredCalls(userId),
      // Leads aguardando triagem (status='novo', visíveis para todos os corretores)
      this.leadRepository.getCountByStatus(),
      // Imóveis visíveis na Vitrine (available_for_sale = TRUE)
      this.productRepository.getShowcaseCount()
    ])

    return {
      totalDeals,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalShowcaseProducts,
      totalFollowUps,
      totalProposals,
      pendingChatAndCalls: unreadMessages + unansweredCalls,
      newLeads: leadCounts.novo
    }
  }
}