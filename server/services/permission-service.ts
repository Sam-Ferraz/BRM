import { PermissionRepository } from '../repositories/permission-repository.js'
import { PermissionsMatrix, ManagedUserRole, UserPermissionsView } from '../types/index.js'

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

  async getUserPermissions(userId: number, userRole: ManagedUserRole): Promise<UserPermissionsView> {
    return this.repo.getUserPermissions(userId, userRole)
  }

  async saveUserOverrides(
    userId: number,
    updates: { permission_id: number; allowed: boolean | null }[],
    updatedBy: number
  ): Promise<void> {
    return this.repo.setUserOverrides(userId, updates, updatedBy)
  }
}
