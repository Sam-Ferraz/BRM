import bcrypt from 'bcryptjs'
import { UserRepository } from '../repositories/user-repository.js'
import { PasswordSetupTokenRepository } from '../repositories/password-setup-token-repository.js'
import { EmailService } from './email-service.js'
import { AuthService } from './auth-service.js'

/**
 * PasswordService — orquestra o fluxo de definição/reset de senha via
 * link mágico enviado por email.
 *
 * Endpoints que consomem:
 *   - GET  /api/auth/validate-setup-token?token=xxx  → valida token, retorna email do user pra pré-popular UI
 *   - POST /api/auth/setup-password                   → aplica nova senha + auto-login
 *   - POST /api/auth/request-password-reset          → envia email de reset (silencioso pra não vazar quem existe)
 */
export class PasswordService {
  constructor(
    private userRepo: UserRepository,
    private tokenRepo: PasswordSetupTokenRepository,
    private emailService: EmailService,
    private authService: AuthService
  ) {}

  /**
   * Valida token. Retorna dados do user (pra UI mostrar "Definindo senha para joao@x")
   * ou null se token inválido/expirado/usado.
   */
  async validateToken(token: string): Promise<{
    email: string
    name: string
    purpose: 'setup' | 'reset'
  } | null> {
    const record = await this.tokenRepo.findValid(token)
    if (!record) return null
    const user = await this.userRepo.findById(record.user_id)
    if (!user) return null
    return {
      email: user.email,
      name: user.name,
      purpose: record.purpose,
    }
  }

  /**
   * Define nova senha usando token. Marca token como usado, retorna JWT
   * do user (auto-login).
   */
  async applyPassword(token: string, newPassword: string): Promise<{
    success: boolean
    error?: string
    token?: string
    user?: { id: number; name: string; email: string; role: string; account_id: number }
  }> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'A senha deve ter pelo menos 8 caracteres' }
    }
    const record = await this.tokenRepo.findValid(token)
    if (!record) {
      return { success: false, error: 'Link inválido ou expirado' }
    }
    const user = await this.userRepo.findById(record.user_id)
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' }
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await this.userRepo.updatePassword(user.id, hash)
    await this.tokenRepo.markUsed(record.id)

    // Auto-login: emite JWT como se o user tivesse feito login normalmente
    const jwtToken = this.authService.generateToken(user.id, user.email, user.role, user.account_id)

    return {
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_id: user.account_id,
      },
    }
  }

  /**
   * Pede reset de senha. Silencioso — sempre retorna sucesso pra não vazar
   * quais emails existem no sistema. Se o email não existir, apenas não
   * dispara nada.
   */
  async requestReset(email: string): Promise<{ success: true }> {
    const normalizedEmail = email.toLowerCase().trim()
    const user = await this.userRepo.findByEmail(normalizedEmail)
    if (user) {
      try {
        const token = await this.tokenRepo.create(user.id, 'reset', 1) // 1h de validade
        await this.emailService.sendResetPasswordEmail({
          to: user.email,
          userName: user.name,
          token,
        })
      } catch (err) {
        console.error('[PasswordService] falha ao enviar reset:', err)
      }
    }
    // Silencioso: sempre 200 sucesso
    return { success: true }
  }
}
