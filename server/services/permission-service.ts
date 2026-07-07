import { PermissionRepository } from '../repositories/permission-repository.js'
import { PermissionsMatrix, UserRole } from '../types/index.js'

export class PermissionService {
  constructor(private readonly repo: PermissionRepository) {}

  async getMatrix(): Promise<PermissionsMatrix> {
    return this.repo.getMatrix()
  }

  async saveMatrix(
    updates: { role: UserRole; permissionId: number; allowed: boolean }[],
    updatedBy: number
  ): Promise<void> {
    return this.repo.setPermissionsBulk(updates, updatedBy)
  }

  async listKeysForRole(role: UserRole): Promise<string[]> {
    return this.repo.listKeysForRole(role)
  }

  async can(role: UserRole, permissionKey: string): Promise<boolean> {
    return this.repo.isAllowed(role, permissionKey)
  }
}
