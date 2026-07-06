import { DealRepository, ClientRepository, ProductRepository, AppointmentRepository, SalesAgendaRepository, FollowUpRepository, ProposalRepository, ConversationRepository, LeadRepository, SaleRepository } from '../repositories/index.js'
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
    saleRepository: SaleRepository
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
  }

  async getDashboardStats(userId: number): Promise<DashboardStats> {
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
    ] = await Promise.all([
      // Card "Negócios" reflete tudo que está em jogo: deals ativos (todos
      // exceto descartados) + leads em aberto (status='novo' aguardando
      // triagem). Independe da origem — engloba manuais e vindos de integração.
      this.dealRepository.getActiveCount(userId),
      this.clientRepository.getCount(),
      this.productRepository.getCount(),
      // Inclui atendimentos manuais E os auto-criados pelo ChatService a partir
      // de interações bilaterais do WhatsApp (origin='whatsapp', dedupe 24h).
      this.appointmentRepository.getCount(userId),
      this.salesAgendaRepository.getCount(userId),
      this.followUpRepository.getCount(userId),
      // Propostas em andamento: apenas 'pending' (Em análise) e
      // 'counter_proposal' (Contraproposta). 'accepted' migra pra Vendas,
      // 'rejected' e 'expired' são terminais e não contam aqui.
      this.proposalRepository.getActiveCount(userId),
      // Pendências de comunicação — filtradas pelo usuário logado
      this.conversationRepository.sumUnreadMessages(userId),
      this.appointmentRepository.getCountUnansweredCalls(userId),
      this.leadRepository.getCountByStatus(),
      this.productRepository.getShowcaseCount(),
      // Total de vendas no sistema (todos os status — pending, approved, rejected)
      this.saleRepository.getCount(),
    ])

    return {
      // Card "Negócios" = deals ativos (todos exceto descartados).
      // NÃO soma leads em triagem — esses aparecem em card separado
      // ("Leads") ate serem aceitos e virarem deals.
      totalDeals: activeDealsCount,
      totalClients,
      totalProducts,
      totalAppointments,
      totalSalesAgenda,
      totalShowcaseProducts,
      totalFollowUps,
      totalProposals,
      totalSales,
      pendingChatAndCalls: unreadMessages + unansweredCalls,
      newLeads: leadCounts.novo
    }
  }
}