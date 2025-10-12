import { BaseRepository } from './base-repository.js';
import { Client, QueryFilters } from '../types/index.js';
export declare class ClientRepository extends BaseRepository {
    findAll(filters?: QueryFilters): Promise<Client[]>;
    create(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client>;
    update(id: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client | null>;
    delete(id: number): Promise<boolean>;
    getCount(): Promise<number>;
}
