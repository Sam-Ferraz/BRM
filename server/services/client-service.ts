import { ClientRepository } from '../repositories/index.js'
import { Client, QueryFilters, ApiResponse } from '../types/index.js'

export class ClientService {
  private clientRepository: ClientRepository

  constructor(clientRepository: ClientRepository) {
    this.clientRepository = clientRepository
  }

  async getAllClients(filters: QueryFilters): Promise<ApiResponse<Client[]>> {
    try {
      const clients = await this.clientRepository.findAll(filters)
      return {
        data: clients,
        total: clients.length
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw new Error('Internal server error')
    }
  }

  async createClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    try {
      return await this.clientRepository.create(clientData)
    } catch (error) {
      console.error('Error creating client:', error)
      throw new Error('Internal server error')
    }
  }

  async updateClient(id: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    try {
      const updatedClient = await this.clientRepository.update(id, clientData)
      if (!updatedClient) {
        throw new Error('Client not found')
      }
      return updatedClient
    } catch (error) {
      console.error('Error updating client:', error)
      if (error instanceof Error && error.message === 'Client not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }

  async deleteClient(id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.clientRepository.delete(id)
      if (!deleted) {
        throw new Error('Client not found')
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting client:', error)
      if (error instanceof Error && error.message === 'Client not found') {
        throw error
      }
      throw new Error('Internal server error')
    }
  }
}
