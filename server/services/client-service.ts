import { ClientRepository, DealRepository } from '../repositories/index.js'
import { Client, QueryFilters, ApiResponse } from '../types/index.js'

export class ClientService {
  private clientRepository: ClientRepository
  private dealRepository: DealRepository

  constructor(clientRepository: ClientRepository, dealRepository: DealRepository) {
    this.clientRepository = clientRepository
    this.dealRepository = dealRepository
  }

  async getAllClients(accountId: number, filters: QueryFilters): Promise<ApiResponse<Client[]>> {
    try {
      const clients = await this.clientRepository.findAll(accountId, filters)
      return {
        data: clients,
        total: clients.length
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw new Error('Internal server error')
    }
  }

  async createClient(accountId: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    try {
      return await this.clientRepository.create(accountId, clientData)
    } catch (error) {
      console.error('Error creating client:', error)
      throw new Error('Internal server error')
    }
  }

  async updateClient(accountId: number, id: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    try {
      // Busca o cliente ANTES do update pra saber o nome antigo (chave
      // do vinculo com deals) e o telefone antigo (pra decidir se sincroniza)
      const previous = await this.clientRepository.findById(accountId, id)
      const updatedClient = await this.clientRepository.update(accountId, id, clientData)
      if (!updatedClient) {
        throw new Error('Client not found')
      }

      // Sincroniza deals: se o telefone mudou, propaga pra TODOS os deals
      // do cliente na mesma account. Vinculo por nome (modelo atual — sem
      // deal.client_id). Usa o nome NOVO pra encontrar os deals.
      if (previous && previous.phone !== updatedClient.phone) {
        try {
          const affected = await this.dealRepository.syncPhoneByClientName(
            accountId,
            updatedClient.name,
            updatedClient.phone || null
          )
          if (affected > 0) {
            console.log(`[ClientService] telefone sincronizado em ${affected} deals de "${updatedClient.name}"`)
          }
          // Se o nome tambem mudou, atualiza deals pelo nome ANTIGO
          if (previous.name !== updatedClient.name) {
            const legacyAffected = await this.dealRepository.syncPhoneByClientName(
              accountId,
              previous.name,
              updatedClient.phone || null
            )
            if (legacyAffected > 0) {
              console.log(`[ClientService] telefone sincronizado em ${legacyAffected} deals do nome antigo "${previous.name}"`)
            }
          }
        } catch (syncErr) {
          // Nao falha o update do cliente se o sync der problema — loga e segue
          console.error('[ClientService] falha ao sincronizar deals:', syncErr)
        }
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

  async deleteClient(accountId: number, id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.clientRepository.delete(accountId, id)
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
