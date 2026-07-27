import { Account, AccountCustomConfig } from '../types/index.js'
import { AccountRepository } from '../repositories/account-repository.js'
import { UserRepository } from '../repositories/user-repository.js'
import { PasswordSetupTokenRepository } from '../repositories/password-setup-token-repository.js'
import { EmailService } from './email-service.js'

/**
 * AccountService — CRUD de accounts + provisionamento de nova account com
 * primeiro user admin.
 *
 * Fluxo do onboarding manual (super-admin cadastra):
 *   1. Cria account
 *   2. Cria user admin SEM senha (password_hash = NULL)
 *   3. Gera token de setup (48h de validade)
 *   4. Envia email pra admin com link https://app.brm.tec.br/setup-password?token=xxx
 *   5. Admin clica no link, define senha, faz login automático
 */
export class AccountService {
  constructor(
    private accountRepo: AccountRepository,
    private userRepo: UserRepository,
    private tokenRepo: PasswordSetupTokenRepository,
    private emailService: EmailService
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
   * Cria nova account + primeiro user admin dela (SEM senha), gera token
   * de setup e dispara email de convite. Cliente clica no link e define
   * sua própria senha.
   */
  async provisionNewAccount(payload: {
    account_name: string
    plan?: string
    admin_name: string
    admin_email: string
  }): Promise<{
    account: Account
    admin_user: { id: number; email: string; name: string }
    email_sent: boolean
  }> {
    if (!payload.account_name?.trim()) throw new Error('account_name é obrigatório')
    if (!payload.admin_name?.trim()) throw new Error('admin_name é obrigatório')
    if (!payload.admin_email?.trim()) throw new Error('admin_email é obrigatório')

    const email = payload.admin_email.toLowerCase().trim()
    const existing = await this.userRepo.findByEmail(email)
    if (existing) throw new Error('Já existe um usuário com esse email')

    const account = await this.accountRepo.create({
      name: payload.account_name.trim(),
      plan: payload.plan || 'trial',
      is_active: true,
    })

    // password_hash = null → user existe mas não pode logar até definir senha
    const admin = await this.userRepo.create(
      payload.admin_name.trim(),
      email,
      null,
      'admin',
      account.id
    )

    // Gera token válido por 48h
    const token = await this.tokenRepo.create(admin.id, 'setup', 48)

    let email_sent = false
    try {
      await this.emailService.sendSetupPasswordEmail({
        to: admin.email,
        userName: admin.name,
        accountName: account.name,
        token,
      })
      email_sent = true
    } catch (err) {
      // Não rollback — a conta foi criada. Se email falhou, super-admin
      // pode reenviar o link pela UI. O token continua válido.
      console.error('[AccountService] email de setup falhou:', err)
    }

    return {
      account,
      admin_user: { id: admin.id, email: admin.email, name: admin.name },
      email_sent,
    }
  }

  /**
   * Reenvia o email de setup (útil se o cliente não recebeu o primeiro
   * ou perdeu). Só pra users que ainda NÃO têm senha definida.
   */
  async resendSetupEmail(userId: number): Promise<{ email_sent: boolean }> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new Error('Usuário não encontrado')
    const account = await this.accountRepo.findById(user.account_id)
    if (!account) throw new Error('Account não encontrada')

    const token = await this.tokenRepo.create(user.id, 'setup', 48)

    try {
      await this.emailService.sendSetupPasswordEmail({
        to: user.email,
        userName: user.name,
        accountName: account.name,
        token,
      })
      return { email_sent: true }
    } catch (err) {
      console.error('[AccountService] resend email falhou:', err)
      return { email_sent: false }
    }
  }
}
