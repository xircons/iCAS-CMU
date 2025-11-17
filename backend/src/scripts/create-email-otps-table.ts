import pool from '../config/database';

async function createEmailOTPsTable() {
  try {
    console.log('Creating email_otps table...\n');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`email_otps\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`otp\` varchar(6) NOT NULL,
        \`expires_at\` timestamp NOT NULL,
        \`is_used\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (\`id\`),
        KEY \`idx_email\` (\`email\`),
        KEY \`idx_expires_at\` (\`expires_at\`),
        KEY \`idx_is_used\` (\`is_used\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createTableSQL);
    console.log('✅ email_otps table created successfully!');
    
    // Verify table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'email_otps'");
    if ((tables as any[]).length > 0) {
      console.log('✅ Table verification: email_otps table exists');
    } else {
      console.log('⚠️  Warning: Table verification failed');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating email_otps table:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table already exists, skipping creation.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

createEmailOTPsTable();

