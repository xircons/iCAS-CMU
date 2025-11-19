import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '12345',
  database: process.env.DB_NAME || 'icas_cmu_hub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4', // Use utf8mb4 to support all Unicode characters including emojis and Thai characters
  // Don't set timezone - let MySQL use its default
  // dateStrings: true would return strings, but we're using DATE_FORMAT in queries
});

// Test database connection with retry logic
export const testConnection = async (maxRetries: number = 10, delayMs: number = 2000): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
      return true;
    } catch (error: any) {
      if (attempt < maxRetries) {
        console.log(`⏳ Database connection attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('❌ Database connection failed after', maxRetries, 'attempts:', error.message);
        return false;
      }
    }
  }
  return false;
};

export default pool;