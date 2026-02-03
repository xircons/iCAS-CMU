import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { decryptMessage } from '../services/chatEncryptionService';

/**
 * Fix script for club_chat_messages table
 * 
 * This script:
 * 1. Adds AUTO_INCREMENT to the id column if it doesn't exist
 * 2. Clears old encrypted messages that can't be decrypted
 * 
 * Usage: npm run fix:chat-table
 */

async function fixChatTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Starting chat table fix...\n');

    // Step 1: Check if AUTO_INCREMENT exists on id column
    console.log('📋 Step 1: Checking AUTO_INCREMENT on id column...');
    const [columns] = await connection.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME, EXTRA 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'club_chat_messages' 
       AND COLUMN_NAME = 'id'`
    );

    if (columns.length === 0) {
      console.error('❌ club_chat_messages table not found!');
      process.exit(1);
    }

    const idColumn = columns[0];
    const hasAutoIncrement = idColumn.EXTRA?.includes('auto_increment') || false;

    if (!hasAutoIncrement) {
      console.log('   ⚠️  AUTO_INCREMENT not found. Adding it...');
      
      // Get current max id to set AUTO_INCREMENT value
      const [maxIdRows] = await connection.execute<RowDataPacket[]>(
        'SELECT COALESCE(MAX(id), 0) as maxId FROM club_chat_messages'
      );
      const maxId = maxIdRows[0]?.maxId || 0;
      const nextAutoIncrement = maxId + 1;

      await connection.execute(
        `ALTER TABLE \`club_chat_messages\` 
         MODIFY \`id\` int(11) NOT NULL AUTO_INCREMENT, 
         AUTO_INCREMENT=${nextAutoIncrement}`
      );
      console.log(`   ✅ AUTO_INCREMENT added. Next value: ${nextAutoIncrement}`);
    } else {
      console.log('   ✅ AUTO_INCREMENT already exists');
    }

    // Step 2: Find and clear messages that can't be decrypted
    console.log('\n📋 Step 2: Checking for undecryptable messages...');
    
    const [messages] = await connection.execute<RowDataPacket[]>(
      `SELECT id, encrypted_message, user_id, club_id, created_at 
       FROM club_chat_messages 
       WHERE deleted_at IS NULL 
       ORDER BY id`
    );

    console.log(`   Found ${messages.length} messages to check`);

    let undecryptableCount = 0;
    const undecryptableIds: number[] = [];

    for (const message of messages) {
      try {
        // Try to decrypt the message
        decryptMessage(message.encrypted_message);
      } catch (error: any) {
        // If decryption fails, mark for deletion
        undecryptableCount++;
        undecryptableIds.push(message.id);
        console.log(`   ⚠️  Message ${message.id} (user ${message.user_id}, club ${message.club_id}) cannot be decrypted`);
      }
    }

    if (undecryptableIds.length > 0) {
      console.log(`\n   🗑️  Found ${undecryptableIds.length} undecryptable messages`);
      console.log('   Clearing these messages...');
      
      // Soft delete by setting deleted_at
      await connection.execute(
        `UPDATE club_chat_messages 
         SET deleted_at = NOW() 
         WHERE id IN (${undecryptableIds.join(',')})`
      );
      
      console.log(`   ✅ Cleared ${undecryptableIds.length} undecryptable messages`);
    } else {
      console.log('   ✅ All messages can be decrypted');
    }

    // Summary
    console.log('\n✅ Chat table fix completed successfully!');
    console.log(`   - AUTO_INCREMENT: ${hasAutoIncrement ? 'Already existed' : 'Added'}`);
    console.log(`   - Undecryptable messages cleared: ${undecryptableIds.length}`);

    connection.release();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error fixing chat table:', error);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('   SQL error:', error.sqlMessage);
    }
    connection.release();
    process.exit(1);
  }
}

fixChatTable();
