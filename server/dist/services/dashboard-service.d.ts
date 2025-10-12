import { DealRepository, ClientRepository, ProductRepository, AppointmentRepository, SalesAgendaRepository } from '../repositories/index.js';
import { DashboardStats } from '../types/index.js';
export declare class DashboardService {
    private dealRepository;
    private clientRepository;
    private productRepository;
    private appointmentRepository;
    private salesAgendaRepository;
    constructor(dealRepository: DealRepository, clientRepository: ClientRepository, productRepository: ProductRepository, appointmentRepository: AppointmentRepository, salesAgendaRepository: SalesAgendaRepository);
    getDashboardStats(): Promise<DashboardStats>;
}
