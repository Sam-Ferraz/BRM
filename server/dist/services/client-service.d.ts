import { ClientRepository } from '../repositories/index.js';
import { Client, QueryFilters, ApiResponse } from '../types/index.js';
export declare class ClientService {
    private clientRepository;
    constructor(clientRepository: ClientRepository);
    getAllClients(filters: QueryFilters): Promise<ApiResponse<Client[]>>;
    createClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client>;
    updateClient(id: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client>;
    deleteClient(id: number): Promise<{
        success: boolean;
    }>;
}
