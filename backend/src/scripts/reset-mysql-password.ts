/**
 * Script to help reset MySQL password or test different passwords
 * 
 * Usage: tsx src/scripts/reset-mysql-password.ts
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const commonPasswords = [
  '',
  'root',
  '12345',
  'rootpassword',
  'password',
  'admin',
  '123456',
  'mysql',
];

async function testPassword(password: string): Promise<boolean> {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: password,
      connectTimeout: 2000,
    });
    
    await connection.ping();
    await connection.end();
    return true;
  } catch (error: any) {
    return false;
  }
}

async function testDatabaseExists(password: string): Promise<boolean> {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: password,
      database: process.env.DB_NAME || 'icas_cmu_hub',
      connectTimeout: 2000,
    });
    
    await connection.ping();
    const [rows] = await connection.execute('SHOW TABLES');
    await connection.end();
    return true;
  } catch (error: any) {
    return false;
  }
}

async function createDatabase(password: string): Promise<boolean> {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: password,
      connectTimeout: 2000,
    });
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'icas_cmu_hub'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
    return true;
  } catch (error: any) {
    console.error('Error creating database:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing MySQL passwords...\n');
  console.log('Testing common passwords...\n');
  
  let foundPassword = null;
  
  for (const password of commonPasswords) {
    process.stdout.write(`Testing password: ${password || '(empty)'}... `);
    const isValid = await testPassword(password);
    
    if (isValid) {
      console.log('✅ SUCCESS!');
      foundPassword = password;
      break;
    } else {
      console.log('❌');
    }
  }
  
  if (foundPassword === null) {
    console.log('\n❌ None of the common passwords worked.');
    console.log('\n💡 Solutions:');
    console.log('1. Try to remember your MySQL root password');
    console.log('2. Reset MySQL password (see FIX_DATABASE_PASSWORD.md)');
    console.log('3. Use MySQL Workbench or phpMyAdmin to reset password');
    console.log('4. Reinstall MySQL with a known password');
    process.exit(1);
  }
  
  console.log(`\n✅ Found working password: ${foundPassword || '(empty)'}`);
  console.log('\n📝 Update your .env file:');
  console.log(`DB_PASSWORD=${foundPassword}`);
  
  // Test if database exists
  console.log('\n🔍 Checking if database exists...');
  const dbExists = await testDatabaseExists(foundPassword);
  
  if (dbExists) {
    console.log('✅ Database exists and has tables!');
  } else {
    console.log('⚠️  Database does not exist or has no tables');
    console.log('\n🔧 Creating database...');
    const created = await createDatabase(foundPassword);
    
    if (created) {
      console.log('✅ Database created!');
      console.log('📝 Next step: Run "npm run import:schema" to create tables');
    } else {
      console.log('❌ Failed to create database');
    }
  }
  
  console.log('\n✅ Done! Update your .env file with the password above.');
}

main().catch(console.error);

