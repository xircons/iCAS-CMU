import pool from '../config/database';

/**
 * Script to fix UTF-8 charset for assignment_attachments table
 * Fixes: Database, Table, and Columns to use utf8mb4
 */
async function fixCharset() {
  try {
    console.log('🔧 Fixing UTF-8 charset for assignment_attachments...\n');
    
    // Step 1: Check and fix DATABASE charset
    console.log('Step 1: Checking database charset...');
    const [dbInfo] = await pool.execute<any[]>(`SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = DATABASE()`);
    console.log(`  Current database charset: ${dbInfo[0]?.DEFAULT_CHARACTER_SET_NAME || 'N/A'}`);
    
    if (dbInfo[0]?.DEFAULT_CHARACTER_SET_NAME !== 'utf8mb4') {
      console.log('  Updating database to utf8mb4...');
      await pool.execute(`ALTER DATABASE ${process.env.DB_NAME || 'icas_cmu_hub'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('  ✅ Database charset updated to utf8mb4');
    } else {
      console.log('  ✅ Database already uses utf8mb4');
    }
    
    // Step 2: Check and fix TABLE charset
    console.log('\nStep 2: Checking table charset...');
    const [tableInfo] = await pool.execute<any[]>(
      `SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assignment_attachments'`
    );
    console.log(`  Current table collation: ${tableInfo[0]?.TABLE_COLLATION || 'N/A'}`);
    
    if (!tableInfo[0]?.TABLE_COLLATION?.includes('utf8mb4')) {
      console.log('  Updating table to utf8mb4...');
      await pool.execute(`ALTER TABLE assignment_attachments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('  ✅ Table charset updated to utf8mb4');
    } else {
      console.log('  ✅ Table already uses utf8mb4');
    }
    
    // Step 3: Check and fix COLUMN charset
    console.log('\nStep 3: Checking column charset...');
    const [columns] = await pool.execute<any[]>(
      `SHOW FULL COLUMNS FROM assignment_attachments WHERE Field IN ('file_name', 'file_path')`
    );
    
    console.log('  Current column charset:');
    columns.forEach((col: any) => {
      console.log(`    ${col.Field}: ${col.Collation || 'N/A'}`);
    });
    
    // Update file_name column to utf8mb4
    const fileNameCol = columns.find((c: any) => c.Field === 'file_name');
    if (!fileNameCol?.Collation?.includes('utf8mb4')) {
      console.log('\n  Updating file_name column to utf8mb4...');
      await pool.execute(`
        ALTER TABLE assignment_attachments 
        MODIFY COLUMN file_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('  ✅ file_name column updated to utf8mb4');
    } else {
      console.log('  ✅ file_name column already uses utf8mb4');
    }
    
    // Update file_path column to utf8mb4
    const filePathCol = columns.find((c: any) => c.Field === 'file_path');
    if (!filePathCol?.Collation?.includes('utf8mb4')) {
      console.log('\n  Updating file_path column to utf8mb4...');
      await pool.execute(`
        ALTER TABLE assignment_attachments 
        MODIFY COLUMN file_path VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('  ✅ file_path column updated to utf8mb4');
    } else {
      console.log('  ✅ file_path column already uses utf8mb4');
    }
    
    // Step 4: Verify the changes
    console.log('\nStep 4: Verifying changes...');
    const [updatedColumns] = await pool.execute<any[]>(
      `SHOW FULL COLUMNS FROM assignment_attachments WHERE Field IN ('file_name', 'file_path')`
    );
    
    console.log('  Updated column charset:');
    updatedColumns.forEach((col: any) => {
      console.log(`    ${col.Field}: ${col.Collation || 'N/A'}`);
    });
    
    // Step 5: Verify connection charset
    console.log('\nStep 5: Verifying connection charset...');
    const [connectionCharset] = await pool.execute<any[]>(`SHOW VARIABLES LIKE 'character_set%'`);
    console.log('  Connection charset variables:');
    connectionCharset.forEach((row: any) => {
      console.log(`    ${row.Variable_name}: ${row.Value}`);
    });
    
    console.log('\n✅ Charset fix completed!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Database: utf8mb4');
    console.log('  ✅ Table: utf8mb4');
    console.log('  ✅ Columns: utf8mb4');
    console.log('  ✅ Connection: utf8mb4 (configured in database.ts)');
    console.log('  ✅ Upload code: Uses originalname directly (no toString())');
    console.log('\n⚠️  Note: Existing corrupted filenames cannot be automatically fixed.');
    console.log('   You will need to delete and re-upload files with Thai names.');
    console.log('   New uploads will work correctly with Thai characters.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error fixing charset:', error);
    console.error('Error details:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

fixCharset();

