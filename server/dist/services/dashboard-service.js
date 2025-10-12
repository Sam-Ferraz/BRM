export class DashboardService {
    constructor(dealRepository, clientRepository, productRepository, appointmentRepository, salesAgendaRepository) {
        this.dealRepository = dealRepository;
        this.clientRepository = clientRepository;
        this.productRepository = productRepository;
        this.appointmentRepository = appointmentRepository;
        this.salesAgendaRepository = salesAgendaRepository;
    }
    async getDashboardStats() {
        const [totalDeals, totalClients, totalProducts, totalAppointments, totalSalesAgenda] = await Promise.all([
            this.dealRepository.getCount(),
            this.clientRepository.getCount(),
            this.productRepository.getCount(),
            this.appointmentRepository.getCount(),
            this.salesAgendaRepository.getCount()
        ]);
        return {
            totalDeals,
            totalClients,
            totalProducts,
            totalAppointments,
            totalSalesAgenda
        };
    }
}
