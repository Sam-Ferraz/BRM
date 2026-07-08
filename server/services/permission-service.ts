import { PermissionRepository } from '../repositories/permission-repository.js'
import { PermissionsMatrix, ManagedUserRole } from '../types/index.js'

export class PermissionService {
  constructor(private readonly repo: PermissionRepository) {}

  async getMatrix(): Promise<PermissionsMatrix> {
    return this.repo.getMatrix()
  }

  async saveMatrix(
    updates: { role: ManagedUserRole; permissionId: number; allowed: boolean }[],
    updatedBy: number
  ): Promise<void> {
    return this.repo.setPermissionsBulk(updates, updatedBy)
  }
}
