import { DealRepository } from '../repositories/index.js';
import { Deal, QueryFilters, ApiResponse } from '../types/index.js';
export declare class DealService {
    private dealRepository;
    constructor(dealRepository: DealRepository);
    getAllDeals(filters: QueryFilters): Promise<ApiResponse<Deal[]>>;
    createDeal(dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal>;
    updateDeal(id: number, dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal>;
    deleteDeal(id: number): Promise<{
        success: boolean;
    }>;
}
