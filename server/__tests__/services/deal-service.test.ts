import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { DealService } from '../../services/deal-service.js'
import { DealRepository } from '../../repositories/deal-repository.js'
import { Deal } from '../../types/index.js'

// Mock the DealRepository
jest.mock('../../repositories/deal-repository.js')

const MockedDealRepository = DealRepository as jest.MockedClass<typeof DealRepository>

describe('DealService', () => {
  let dealService: DealService
  let mockDealRepository: jest.Mocked<DealRepository>

  beforeEach(() => {
    mockDealRepository = new MockedDealRepository() as jest.Mocked<DealRepository>
    dealService = new DealService(mockDealRepository)
    jest.clearAllMocks()
  })

  describe('getAllDeals', () => {
    const mockDeals: Deal[] = [
      {
        id: 1,
        client: 'Test Client',
        value: '1000.00',
        status: 'Em Andamento',
        date: '2025-01-15',
        description: 'Test deal'
      },
      {
        id: 2,
        client: 'Another Client',
        value: '2000.00',
        status: 'Fechado',
        date: '2025-01-16',
        description: 'Another deal'
      }
    ]

    it('should return all deals with filters', async () => {
      // Arrange
      mockDealRepository.findAll.mockResolvedValue(mockDeals)
      const filters = { search: 'test', status: 'Em Andamento' }

      // Act
      const result = await dealService.getAllDeals(filters)

      // Assert
      expect(result.data).toEqual(mockDeals)
      expect(result.total).toBe(2)
      expect(mockDealRepository.findAll).toHaveBeenCalledWith(filters)
    })

    it('should handle repository errors', async () => {
      // Arrange
      mockDealRepository.findAll.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(dealService.getAllDeals({})).rejects.toThrow('Internal server error')
    })
  })

  describe('createDeal', () => {
    const newDealData = {
      client: 'New Client',
      value: '3000.00',
      status: 'Proposta' as const,
      date: '2025-01-17',
      description: 'New deal'
    }

    const createdDeal: Deal = {
      id: 3,
      ...newDealData
    }

    it('should create a new deal', async () => {
      // Arrange
      mockDealRepository.create.mockResolvedValue(createdDeal)

      // Act
      const result = await dealService.createDeal(newDealData)

      // Assert
      expect(result).toEqual(createdDeal)
      expect(mockDealRepository.create).toHaveBeenCalledWith(newDealData)
    })

    it('should handle repository errors', async () => {
      // Arrange
      mockDealRepository.create.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(dealService.createDeal(newDealData)).rejects.toThrow('Internal server error')
    })
  })

  describe('updateDeal', () => {
    const updateData = {
      client: 'Updated Client',
      value: '4000.00',
      status: 'Fechado' as const,
      date: '2025-01-18',
      description: 'Updated deal'
    }

    const updatedDeal: Deal = {
      id: 1,
      ...updateData
    }

    it('should update an existing deal', async () => {
      // Arrange
      mockDealRepository.update.mockResolvedValue(updatedDeal)

      // Act
      const result = await dealService.updateDeal(1, updateData)

      // Assert
      expect(result).toEqual(updatedDeal)
      expect(mockDealRepository.update).toHaveBeenCalledWith(1, updateData)
    })

    it('should throw error when deal not found', async () => {
      // Arrange
      mockDealRepository.update.mockResolvedValue(null)

      // Act & Assert
      await expect(dealService.updateDeal(999, updateData)).rejects.toThrow('Deal not found')
    })

    it('should handle repository errors', async () => {
      // Arrange
      mockDealRepository.update.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(dealService.updateDeal(1, updateData)).rejects.toThrow('Internal server error')
    })
  })

  describe('deleteDeal', () => {
    it('should delete an existing deal', async () => {
      // Arrange
      mockDealRepository.delete.mockResolvedValue(true)

      // Act
      const result = await dealService.deleteDeal(1)

      // Assert
      expect(result).toEqual({ success: true })
      expect(mockDealRepository.delete).toHaveBeenCalledWith(1)
    })

    it('should throw error when deal not found', async () => {
      // Arrange
      mockDealRepository.delete.mockResolvedValue(false)

      // Act & Assert
      await expect(dealService.deleteDeal(999)).rejects.toThrow('Deal not found')
    })

    it('should handle repository errors', async () => {
      // Arrange
      mockDealRepository.delete.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(dealService.deleteDeal(1)).rejects.toThrow('Internal server error')
    })
  })
})