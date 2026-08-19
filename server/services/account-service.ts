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
    admin_password?: string  // Opcional — se vier, seta senha direto (sem email de setup)
  }): Promise<{
    account: Account
    admin_user: { id: number; email: string; name: string }
    email_sent: boolean
    email_error: string | null
    setup_token: string | null
    password_set: boolean
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

    // Se admin_password veio no payload, hasheia com bcrypt e cria user
    // ja logavel. Senao, cria com password_hash=null + envia email de setup.
    let passwordHash: string | null = null
    const passwordSet = !!(payload.admin_password && payload.admin_password.length >= 4)
    if (passwordSet) {
      const bcrypt = await import('bcrypt')
      passwordHash = await bcrypt.hash(payload.admin_password!, 10)
    }

    const admin = await this.userRepo.create(
      payload.admin_name.trim(),
      email,
      passwordHash,
      'admin',
      account.id
    )

    // Se senha ja foi setada, nao gera token nem manda email
    if (passwordSet) {
      return {
        account,
        admin_user: { id: admin.id, email: admin.email, name: admin.name },
        email_sent: false,
        email_error: null,
        setup_token: null,
        password_set: true,
      }
    }

    // Fluxo padrao: gera token de 48h + email de setup
    const token = await this.tokenRepo.create(admin.id, 'setup', 48)

    let email_sent = false
    let email_error: string | null = null
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
      email_error = err instanceof Error ? err.message : String(err)
    }

    return {
      account,
      admin_user: { id: admin.id, email: admin.email, name: admin.name },
      email_sent,
      email_error,
      setup_token: token,
      password_set: false,
    }
  }

  /**
   * Retorna o diagnostico do EmailService — usado por super-admin pra
   * verificar se RESEND_API_KEY esta configurado e qual EMAIL_FROM/APP_URL
   * o processo esta usando.
   */
  getEmailDiagnostics(): { has_api_key: boolean; from: string; app_url: string } {
    return this.emailService.getDiagnostics()
  }

  /**
   * Reenvia o email de setup (útil se o cliente não recebeu o primeiro
   * ou perdeu). Só pra users que ainda NÃO têm senha definida.
   */
  async resendSetupEmail(userId: number): Promise<{ email_sent: boolean; email_error: string | null; setup_token: string }> {
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
      return { email_sent: true, email_error: null, setup_token: token }
    } catch (err) {
      console.error('[AccountService] resend email falhou:', err)
      return {
        email_sent: false,
        email_error: err instanceof Error ? err.message : String(err),
        setup_token: token,
      }
    }
  }
}
