import { BaseRepository } from './base-repository.js';
import { SalesAgenda, QueryFilters } from '../types/index.js';
export declare class SalesAgendaRepository extends BaseRepository {
    findAll(filters?: QueryFilters): Promise<SalesAgenda[]>;
    create(salesAgenda: Omit<SalesAgenda, 'id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda>;
    update(id: number, salesAgenda: Omit<SalesAgenda, 'id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda | null>;
    delete(id: number): Promise<boolean>;
    getCount(): Promise<number>;
}
