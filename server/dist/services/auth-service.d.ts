import { UserRepository } from '../repositories/index.js';
import { AuthResult } from '../types/index.js';
export declare class AuthService {
    private userRepository;
    constructor(userRepository: UserRepository);
    generateToken(userId: number, email: string, role: string): string;
    verifyToken(token: string): any;
    loginUser(email: string, password: string): Promise<AuthResult>;
    registerUser(name: string, email: string, password: string, role?: string): Promise<AuthResult>;
}
