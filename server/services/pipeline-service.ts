import { PipelineRepository } from '../repositories/index.js'
import { Pipeline, ApiResponse } from '../types/index.js'

export class PipelineService {
  private pipelineRepository: PipelineRepository

  constructor(pipelineRepository: PipelineRepository) {
    this.pipelineRepository = pipelineRepository
  }

  async list(accountId: number): Promise<ApiResponse<Pipeline[]>> {
    try {
      const pipelines = await this.pipelineRepository.findAll(accountId)
      return { data: pipelines, total: pipelines.length }
    } catch (error) {
      console.error('Error listing pipelines:', error)
      throw new Error('Internal server error')
    }
  }

  async create(
    accountId: number,
    input: { name: string; color?: string; is_default?: boolean }
  ): Promise<Pipeline> {
    const name = input.name?.trim()
    if (!name) throw new Error('name is required')
    try {
      return await this.pipelineRepository.create(accountId, { name, color: input.color, is_default: input.is_default })
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('Ja existe um funil com esse nome')
      }
      console.error('Error creating pipeline:', error)
      throw new Error('Internal server error')
    }
  }

  async update(
    accountId: number,
    id: number,
    input: Partial<{ name: string; color: string; position: number; is_default: boolean; custom_config: Record<string, any> }>
  ): Promise<Pipeline> {
    try {
      const updated = await this.pipelineRepository.update(accountId, id, input)
      if (!updated) throw new Error('Pipeline not found')
      return updated
    } catch (error) {
      if (error instanceof Error && error.message === 'Pipeline not found') throw error
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('Ja existe um funil com esse nome')
      }
      console.error('Error updating pipeline:', error)
      throw new Error('Internal server error')
    }
  }

  async delete(accountId: number, id: number): Promise<{ success: boolean }> {
    try {
      const ok = await this.pipelineRepository.delete(accountId, id)
      if (!ok) throw new Error('Pipeline not found')
      return { success: true }
    } catch (error) {
      if (error instanceof Error && (error.message === 'Pipeline not found' || error.message.startsWith('Nao e possivel'))) throw error
      console.error('Error deleting pipeline:', error)
      throw new Error('Internal server error')
    }
  }
}
