import pool from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to remove LINE user from database
 * Usage: tsx src/scripts/remove-line-user.ts <email>
 */

async function removeLineUser(email: string) {
  try {
    console.log(`Removing LINE user for email: ${email}...`);
    
    // Get LINE user ID
    const [rows] = await pool.execute<any[]>(
      'SELECT line_user_id FROM line_users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      console.log(`❌ No LINE user found for email: ${email}`);
      return;
    }
    
    const lineUserId = rows[0].line_user_id;
    console.log(`Found LINE User ID: ${lineUserId}`);
    
    // Delete from line_conversations
    await pool.execute(
      'DELETE FROM line_conversations WHERE line_user_id = ?',
      [lineUserId]
    );
    console.log('✅ Deleted from line_conversations');
    
    // Delete from line_users
    await pool.execute(
      'DELETE FROM line_users WHERE line_user_id = ?',
      [lineUserId]
    );
    console.log('✅ Deleted from line_users');
    
    console.log(`✅ Successfully removed LINE user for email: ${email}`);
  } catch (error) {
    console.error('❌ Error removing LINE user:', error);
  } finally {
    await pool.end();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: tsx src/scripts/remove-line-user.ts <email>');
  console.error('Example: tsx src/scripts/remove-line-user.ts user@cmu.ac.th');
  process.exit(1);
}

removeLineUser(email);

