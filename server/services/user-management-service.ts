import bcrypt from 'bcryptjs'
import { ManagedUserRepository } from '../repositories/managed-user-repository.js'
import { ManagedUser, ManagedUserRole } from '../types/index.js'

const VALID_ROLES: ManagedUserRole[] = ['admin', 'manager', 'broker', 'sdr', 'administrative']

export class UserManagementService {
  constructor(private readonly repo: ManagedUserRepository) {}

  async list(): Promise<ManagedUser[]> {
    const users = await this.repo.findAll()
    return users
  }

  async getById(id: number): Promise<ManagedUser> {
    const user = await this.repo.findById(id)
    if (!user) throw new Error('User not found')
    return user
  }

  async create(input: { name: string; email: string; password: string; role: ManagedUserRole }): Promise<ManagedUser> {
    const name = input.name?.trim()
    const email = input.email?.trim().toLowerCase()
    const password = input.password ?? ''

    if (!name) throw new Error('name is required')
    if (!email || !email.includes('@')) throw new Error('email invalid')
    if (password.length < 8) throw new Error('password must be at least 8 chars')
    if (!VALID_ROLES.includes(input.role)) throw new Error('invalid role')

    const existing = await this.repo.findByEmail(email)
    if (existing) throw new Error('email already registered')

    const passwordHash = await bcrypt.hash(password, 10)
    return this.repo.create({ name, email, passwordHash, role: input.role })
  }

  async update(
    currentUserId: number,
    targetId: number,
    input: Partial<{ name: string; email: string; role: ManagedUserRole; active: boolean }>
  ): Promise<ManagedUser> {
    const target = await this.repo.findById(targetId)
    if (!target) throw new Error('User not found')

    const patch: Partial<{ name: string; email: string; role: ManagedUserRole; active: boolean }> = {}
    if (input.name !== undefined) {
      const name = input.name?.trim()
      if (!name) throw new Error('name is required')
      patch.name = name
    }
    if (input.email !== undefined) {
      const email = input.email?.trim().toLowerCase()
      if (!email || !email.includes('@')) throw new Error('email invalid')
      if (email !== target.email) {
        const collision = await this.repo.findByEmail(email)
        if (collision) throw new Error('email already registered')
      }
      patch.email = email
    }
    if (input.role !== undefined) {
      if (!VALID_ROLES.includes(input.role)) throw new Error('invalid role')
      patch.role = input.role
    }
    if (input.active !== undefined) patch.active = !!input.active

    await this.assertNotLockingOutAdmins(currentUserId, target, patch)

    const updated = await this.repo.update(targetId, patch)
    if (!updated) throw new Error('User not found')
    return updated
  }

  async resetPassword(_currentUserId: number, targetId: number, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) throw new Error('password must be at least 8 chars')
    const target = await this.repo.findById(targetId)
    if (!target) throw new Error('User not found')
    const hash = await bcrypt.hash(newPassword, 10)
    await this.repo.updatePassword(targetId, hash)
  }

  private async assertNotLockingOutAdmins(
    currentUserId: number,
    target: ManagedUser,
    patch: { role?: ManagedUserRole; active?: boolean }
  ): Promise<void> {
    const changingRole = patch.role !== undefined && patch.role !== target.role
    const deactivating = patch.active === false && target.active
    if (!changingRole && !deactivating) return

    const isTargetAdminNow = target.role === 'admin' && target.active
    if (!isTargetAdminNow) return

    if (target.id === currentUserId) {
      throw new Error('cannot demote or deactivate yourself')
    }

    const willKeepBeingAdmin =
      (patch.role === undefined || patch.role === 'admin') &&
      (patch.active === undefined || patch.active === true)
    if (willKeepBeingAdmin) return

    const totalActiveAdmins = await this.repo.countActiveAdmins()
    if (totalActiveAdmins <= 1) {
      throw new Error('cannot leave system without any active admin')
    }
  }
}
