// Test setup file for Jest
import { jest } from '@jest/globals';

// Mock environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5432/icas_cmu_hub_test?sslmode=disable';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.DB_NAME = process.env.DB_NAME || 'icas_cmu_hub_test';
process.env.NODE_ENV = 'test';
// SMTP credentials for testing (optional - tests can run without real credentials)
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
process.env.SMTP_PORT = process.env.SMTP_PORT || '587';
process.env.SMTP_USER = process.env.SMTP_USER || 'test@example.com';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'test_smtp_password';
// Global test timeout
jest.setTimeout(10000);

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

