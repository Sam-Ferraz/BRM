import { BaseRepository } from './base-repository.js';
import { Deal, QueryFilters } from '../types/index.js';
export declare class DealRepository extends BaseRepository {
    findAll(filters?: QueryFilters): Promise<Deal[]>;
    create(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal>;
    update(id: number, deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal | null>;
    delete(id: number): Promise<boolean>;
    getCount(): Promise<number>;
}
