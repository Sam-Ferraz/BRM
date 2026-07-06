import bcrypt from 'bcryptjs'
import { UserRepository } from '../repositories/user-repository.js'
import { User, UserRole } from '../types/index.js'

/**
 * UserManagementService — CRUD administrativo de usuários.
 *
 * Regras protetivas:
 *   • Não deixa desativar/rebaixar o último admin ativo (impede lockout)
 *   • Não deixa admin desativar/rebaixar a si mesmo (mesma razão + evita erro humano)
 *   • Email é único (case-insensitive) — retorna erro claro pra UI
 *   • Senha inicial: admin define string livre (>= 8 chars); usuário troca depois
 *   • Soft delete: `deactivate` seta active=false, mantém histórico e relações
 */

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'broker']

export class UserManagementService {
  constructor(private readonly repo: UserRepository) {}

  async list(): Promise<User[]> {
    const users = await this.repo.findAll()
    // Nunca vaza password_hash na resposta
    return users.map((u) => this.strip(u))
  }

  async getById(id: number): Promise<User> {
    const user = await this.repo.findById(id)
    if (!user) throw new Error('User not found')
    return this.strip(user)
  }

  async create(input: {
    name: string
    email: string
    password: string
    role: UserRole
  }): Promise<User> {
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
    const created = await this.repo.create({
      name,
      email,
      passwordHash,
      role: input.role,
      active: true,
    })
    return this.strip(created)
  }

  async update(
    currentUserId: number,
    targetId: number,
    input: Partial<{ name: string; email: string; role: UserRole; active: boolean }>
  ): Promise<User> {
    const target = await this.repo.findById(targetId)
    if (!target) throw new Error('User not found')

    // Sanitiza inputs
    const patch: Partial<{ name: string; email: string; role: UserRole; active: boolean }> = {}
    if (input.name !== undefined) {
      const name = input.name?.trim()
      if (!name) throw new Error('name is required')
      patch.name = name
    }
    if (input.email !== undefined) {
      const email = input.email?.trim().toLowerCase()
      if (!email || !email.includes('@')) throw new Error('email invalid')
      // Se mudou email, checa duplicata
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
    if (input.active !== undefined) {
      patch.active = !!input.active
    }

    // Regras de proteção — evitar lockout total
    await this.assertNotLockingOutAdmins(currentUserId, target, patch)

    const updated = await this.repo.update(targetId, patch)
    if (!updated) throw new Error('User not found')
    return this.strip(updated)
  }

  async resetPassword(currentUserId: number, targetId: number, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) throw new Error('password must be at least 8 chars')
    const target = await this.repo.findById(targetId)
    if (!target) throw new Error('User not found')
    const hash = await bcrypt.hash(newPassword, 10)
    await this.repo.updatePassword(targetId, hash)
    // Log administrativo (só stdout por enquanto) — bom pra auditoria futura
    console.log(`[user-mgmt] password reset by admin=${currentUserId} for user=${targetId}`)
  }

  private strip(u: User): User {
    // Remove password_hash antes de expor pela API
    const { password_hash, ...safe } = u as any
    return safe as User
  }

  /**
   * Impede que uma mudança deixe o sistema sem admin ativo — cenário de lockout
   * total (ninguém consegue mais gerenciar usuários). Também impede o próprio
   * admin de se auto-rebaixar/desativar (menos por segurança e mais porque
   * geralmente é erro humano — se realmente quiser, ele pede pra outro admin).
   */
  private async assertNotLockingOutAdmins(
    currentUserId: number,
    target: User,
    patch: { role?: UserRole; active?: boolean }
  ): Promise<void> {
    const changingRole = patch.role !== undefined && patch.role !== target.role
    const deactivating = patch.active === false && target.active
    if (!changingRole && !deactivating) return

    const isTargetAdminNow = target.role === 'admin' && target.active
    if (!isTargetAdminNow) return // não estava no grupo protegido

    if (target.id === currentUserId) {
      throw new Error('cannot demote or deactivate yourself')
    }

    // Se target era admin ativo e vai deixar de ser, precisa restar >= 1 admin ativo
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
