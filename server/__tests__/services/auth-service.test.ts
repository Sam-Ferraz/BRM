import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import bcrypt from 'bcryptjs'
import { AuthService } from '../../services/auth-service.js'
import { UserRepository } from '../../repositories/user-repository.js'
import { User } from '../../types/index.js'

// Mock the UserRepository
jest.mock('../../repositories/user-repository.js')
jest.mock('bcryptjs')

const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('AuthService', () => {
  let authService: AuthService
  let mockUserRepository: jest.Mocked<UserRepository>

  beforeEach(() => {
    mockUserRepository = new MockedUserRepository() as jest.Mocked<UserRepository>
    authService = new AuthService(mockUserRepository)
    jest.clearAllMocks()
  })

  describe('loginUser', () => {
    const mockUser: User = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      password_hash: 'hashed_password'
    }

    it('should login user with valid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      // Act
      const result = await authService.loginUser('test@example.com', 'password')

      // Assert
      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role
      })
      expect(result.token).toBeDefined()
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password', 'hashed_password')
    })

    it('should reject login with invalid email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null)

      // Act
      const result = await authService.loginUser('invalid@example.com', 'password')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Credenciais inválidas')
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('invalid@example.com')
      expect(mockedBcrypt.compare).not.toHaveBeenCalled()
    })

    it('should reject login with invalid password', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      // Act
      const result = await authService.loginUser('test@example.com', 'wrongpassword')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Credenciais inválidas')
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed_password')
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'))

      // Act
      const result = await authService.loginUser('test@example.com', 'password')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Erro interno do servidor')
    })
  })

  describe('registerUser', () => {
    const newUser: User = {
      id: 2,
      name: 'New User',
      email: 'new@example.com',
      role: 'user'
    }

    it('should register new user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null)
      mockUserRepository.create.mockResolvedValue(newUser)
      mockedBcrypt.hash.mockResolvedValue('hashed_password' as never)

      // Act
      const result = await authService.registerUser('New User', 'new@example.com', 'password')

      // Assert
      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      })
      expect(result.token).toBeDefined()
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com')
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password', 10)
      expect(mockUserRepository.create).toHaveBeenCalledWith('New User', 'new@example.com', 'hashed_password', 'user')
    })

    it('should reject registration for existing user', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(newUser)

      // Act
      const result = await authService.registerUser('New User', 'new@example.com', 'password')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Usuário já existe')
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com')
      expect(mockUserRepository.create).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'))

      // Act
      const result = await authService.registerUser('New User', 'new@example.com', 'password')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Erro interno do servidor')
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      // This would require mocking jwt.verify, but for simplicity we'll test the integration
      const token = authService.generateToken(1, 'test@example.com', 'user')
      const decoded = authService.verifyToken(token)

      expect(decoded).toBeTruthy()
      expect(decoded.userId).toBe(1)
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.role).toBe('user')
    })

    it('should reject invalid token', () => {
      const decoded = authService.verifyToken('invalid-token')
      expect(decoded).toBeNull()
    })
  })
})