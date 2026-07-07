import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UserRepository } from '../repositories/index.js'
import { AuthResult } from '../types/index.js'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export class AuthService {
  private userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  generateToken(userId: number, email: string, role: string): string {
    return jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    )
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  async loginUser(email: string, password: string): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findByEmail(email)

      if (!user) {
        return { success: false, error: 'Credenciais inválidas' }
      }

      // Usuário desativado não loga (soft delete via módulo Usuários)
      if (user.active === false) {
        return { success: false, error: 'Usuário desativado. Contate o administrador.' }
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash!)

      if (!isPasswordValid) {
        return { success: false, error: 'Credenciais inválidas' }
      }

      // Fire-and-forget: atualiza last_login_at sem bloquear a resposta
      this.userRepository.touchLastLogin(user.id).catch((err) => {
        console.error('[auth] touchLastLogin failed:', err)
      })

      const token = this.generateToken(user.id, user.email, user.role)

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active ?? true,
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  }

  async registerUser(name: string, email: string, password: string, role: string = 'broker'): Promise<AuthResult> {
    try {
      const existingUser = await this.userRepository.findByEmail(email)

      if (existingUser) {
        return { success: false, error: 'Usuário já existe' }
      }

      const passwordHash = await bcrypt.hash(password, 10)

      // Normaliza role — só aceita os 5 valores oficiais; qualquer outro vira 'broker'
      const VALID: readonly string[] = ['admin', 'manager', 'broker', 'sdr', 'administrative']
      const safeRole = VALID.includes(role) ? role : 'broker'

      const user = await this.userRepository.create({
        name,
        email,
        passwordHash,
        role: safeRole as any,
      })
      const token = this.generateToken(user.id, user.email, user.role)

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active ?? true,
        }
      }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  }

  async listUsers(): Promise<{ id: number; name: string; email: string }[]> {
    const users = await this.userRepository.findAll()
    return users.map(u => ({ id: u.id, name: u.name, email: u.email }))
  }
}