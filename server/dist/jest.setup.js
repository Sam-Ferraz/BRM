// Setup file for Jest tests
import dotenv from 'dotenv';
// Load test environment variables
dotenv.config({ path: '.env.test' });
// Mock process.env for tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
