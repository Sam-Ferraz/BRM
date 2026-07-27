import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UserRepository } from '../repositories/index.js'
import { AuthResult } from '../types/index.js'

const JWT_SECRET = process.env.JWT_SECRET!
// 1 dia: token vazado fica exposto no máximo 24h antes de precisar re-login.
// Se um dia implementarmos refresh token, aí sim baixamos pra 15min no access
// token. Enquanto isso, 1d é o ponto de equilíbrio entre segurança e UX (o
// corretor não é forçado a re-logar no meio do dia).
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'

export class AuthService {
  private userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  generateToken(userId: number, email: string, role: string, accountId: number): string {
    return jwt.sign(
      { userId, email, role, accountId },
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

      const isPasswordValid = await bcrypt.compare(password, user.password_hash!)

      if (!isPasswordValid) {
        return { success: false, error: 'Credenciais inválidas' }
      }

      // Multi-tenancy: accountId vai no JWT — todo request autenticado
      // sabe imediatamente a qual account o user pertence sem consultar DB
      const token = this.generateToken(user.id, user.email, user.role, user.account_id)

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          account_id: user.account_id
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  }

  async registerUser(
    name: string,
    email: string,
    password: string,
    role: string = 'user',
    accountId: number
  ): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email)

      if (existingUser) {
        return { success: false, error: 'Usuário já existe' }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10)

      // Create new user na account informada
      const user = await this.userRepository.create(name, email, passwordHash, role, accountId)
      const token = this.generateToken(user.id, user.email, user.role, user.account_id)

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          account_id: user.account_id
        }
      }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  }

  /**
   * Lista users da account informada. Se accountId omitido, retorna vazio
   * (evita vazamento entre accounts em endpoint que esqueceu de passar).
   */
  async listUsers(accountId?: number): Promise<{ id: number; name: string; email: string }[]> {
    if (accountId == null) return []
    const users = await this.userRepository.findAll(accountId)
    return users.map(u => ({ id: u.id, name: u.name, email: u.email }))
  }
}