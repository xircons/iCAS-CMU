import pool from '../config/database';

async function migrate() {
  try {
    console.log('🔄 Starting performance migration...');
    
    // Add composite index for chat messages (club_id + created_at)
    // This optimizes the common query: WHERE club_id = ? ORDER BY created_at DESC
    try {
      console.log('📊 Adding idx_club_chat_composite to club_chat_messages...');
      await pool.execute(`
        CREATE INDEX idx_club_chat_composite 
        ON club_chat_messages (club_id, created_at DESC)
      `);
      console.log('✅ Added idx_club_chat_composite');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index idx_club_chat_composite already exists');
      } else {
        console.error('❌ Failed to add index:', error.message);
      }
    }

    console.log('✅ Performance migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
