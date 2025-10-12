import { SalesAgendaRepository } from '../repositories/index.js';
import { SalesAgenda, QueryFilters, ApiResponse } from '../types/index.js';
export declare class SalesAgendaService {
    private salesAgendaRepository;
    constructor(salesAgendaRepository: SalesAgendaRepository);
    getAllSalesAgenda(filters: QueryFilters): Promise<ApiResponse<SalesAgenda[]>>;
    createSalesAgenda(salesAgendaData: Omit<SalesAgenda, 'id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda>;
    updateSalesAgenda(id: number, salesAgendaData: Omit<SalesAgenda, 'id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda>;
    deleteSalesAgenda(id: number): Promise<{
        success: boolean;
    }>;
}
