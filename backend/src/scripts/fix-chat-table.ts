import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function fixChatTable() {
  try {
    const connection = await pool.getConnection();
    
    console.log('🔧 Fixing club_chat_messages table...\n');

    // Fix 1: Add AUTO_INCREMENT to id column
    console.log('1. Adding AUTO_INCREMENT to id column...');
    try {
      await connection.execute(`
        ALTER TABLE club_chat_messages 
        MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT
      `);
      console.log('✅ AUTO_INCREMENT added to id column');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ id column already has AUTO_INCREMENT');
      } else {
        throw error;
      }
    }

    // Fix 2: Clear old messages that can't be decrypted
    console.log('\n2. Clearing old encrypted messages...');
    const [result] = await connection.execute<any>(
      'DELETE FROM club_chat_messages WHERE created_at < NOW()'
    );
    console.log(`✅ Cleared ${result.affectedRows} old messages`);

    connection.release();
    console.log('\n✅ Chat table fixed successfully!');
    console.log('   You can now send new messages.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error fixing chat table:', error);
    if (error.sqlMessage) {
      console.error('SQL error:', error.sqlMessage);
    }
    process.exit(1);
  }
}

fixChatTable();
