import { BaseRepository } from './base-repository.js';
import { User } from '../types/index.js';
export declare class UserRepository extends BaseRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    create(name: string, email: string, passwordHash: string, role?: string): Promise<User>;
}
