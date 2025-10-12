export function generateToken(userId: any, email: any, role: any): never;
export function verifyToken(token: any): (jwt.Jwt & jwt.JwtPayload & void) | null;
export function authenticateToken(req: any, res: any, next: any): Promise<any>;
export function loginUser(email: any, password: any): Promise<{
    success: boolean;
    error: string;
    token?: undefined;
    user?: undefined;
} | {
    success: boolean;
    token: never;
    user: {
        id: any;
        name: any;
        email: any;
        role: any;
    };
    error?: undefined;
}>;
export function registerUser(name: any, email: any, password: any, role?: string): Promise<{
    success: boolean;
    error: string;
    token?: undefined;
    user?: undefined;
} | {
    success: boolean;
    token: never;
    user: {
        id: any;
        name: any;
        email: any;
        role: any;
    };
    error?: undefined;
}>;
import jwt from 'jsonwebtoken';
