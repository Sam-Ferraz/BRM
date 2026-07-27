import bcrypt from 'bcryptjs'
import { Account, AccountCustomConfig } from '../types/index.js'
import { AccountRepository } from '../repositories/account-repository.js'
import { UserRepository } from '../repositories/user-repository.js'

/**
 * AccountService — CRUD de accounts + provisionamento de nova account com
 * primeiro user admin (fluxo de onboarding manual pelo super-admin).
 */
export class AccountService {
  constructor(
    private accountRepo: AccountRepository,
    private userRepo: UserRepository
  ) {}

  async getById(id: number): Promise<Account | null> {
    return this.accountRepo.findById(id)
  }

  async listAll(): Promise<Account[]> {
    return this.accountRepo.findAll()
  }

  async updateCustomConfig(id: number, config: AccountCustomConfig): Promise<Account | null> {
    return this.accountRepo.updateCustomConfig(id, config)
  }

  async update(id: number, payload: Partial<Pick<Account, 'name' | 'plan' | 'is_active'>>): Promise<Account | null> {
    return this.accountRepo.update(id, payload)
  }

  /**
   * Cria nova account + primeiro user admin dela. Fluxo de onboarding manual:
   * super-admin cadastra o cliente, depois manda credenciais por WhatsApp/email.
   *
   * O user criado é sempre role='admin' — ele então gerencia os corretores
   * da própria account via módulo de UserManagement.
   */
  async provisionNewAccount(payload: {
    account_name: string
    plan?: string
    admin_name: string
    admin_email: string
    admin_password: string
  }): Promise<{ account: Account; admin_user: { id: number; email: string } }> {
    if (!payload.account_name?.trim()) throw new Error('account_name é obrigatório')
    if (!payload.admin_name?.trim()) throw new Error('admin_name é obrigatório')
    if (!payload.admin_email?.trim()) throw new Error('admin_email é obrigatório')
    if (!payload.admin_password || payload.admin_password.length < 8) {
      throw new Error('admin_password deve ter pelo menos 8 caracteres')
    }

    // Impede duplicata de email antes de criar account
    const existing = await this.userRepo.findByEmail(payload.admin_email.toLowerCase())
    if (existing) throw new Error('Já existe um usuário com esse email')

    const account = await this.accountRepo.create({
      name: payload.account_name.trim(),
      plan: payload.plan || 'trial',
      is_active: true,
    })

    const passwordHash = await bcrypt.hash(payload.admin_password, 10)
    const admin = await this.userRepo.create(
      payload.admin_name.trim(),
      payload.admin_email.toLowerCase().trim(),
      passwordHash,
      'admin',
      account.id
    )

    return {
      account,
      admin_user: { id: admin.id, email: admin.email },
    }
  }
}
