import pool from '../config/database';

async function migrate() {
  try {
    console.log('🔄 Starting token version migration...');
    
    try {
      console.log('📊 Adding token_version column to users table...');
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN token_version INT NOT NULL DEFAULT 0
      `);
      console.log('✅ Added token_version column');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column token_version already exists');
      } else {
        console.error('❌ Failed to add column:', error.message);
      }
    }

    console.log('✅ Token version migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
