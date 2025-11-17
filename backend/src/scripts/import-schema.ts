import pool from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

export interface ImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export async function importSchema(closePool: boolean = false): Promise<ImportResult> {
  const errors: string[] = [];
  console.log('🔄 Starting SQL schema import...\n');
  
  try {
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '../../database/icas_cmu_hub.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📄 Schema file loaded:', schemaPath);
    
    // Get a connection from the pool
    const connection = await pool.getConnection();
    console.log('✅ Database connected\n');
    
    // Split SQL by semicolons and filter out empty statements and comments
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.toLowerCase().startsWith('create database') &&
        !stmt.toLowerCase().startsWith('use ')
      );
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip if it's just whitespace or a comment
      if (!statement || statement.match(/^[\s-]*$/)) {
        continue;
      }
      
      try {
        // Extract table name for logging (if it's a CREATE TABLE statement)
        const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i);
        const tableName = tableMatch ? tableMatch[1] : 'statement';
        
        await connection.query(statement);
        console.log(`✅ [${i + 1}/${statements.length}] Executed: ${tableName}`);
        successCount++;
      } catch (error: any) {
        const errorMsg = `Error executing statement ${i + 1}: ${error.message}`;
        console.error(`❌ [${i + 1}/${statements.length}] ${errorMsg}`);
        // Extract a snippet of the statement for debugging
        const snippet = statement.substring(0, 50).replace(/\n/g, ' ');
        console.error(`   Statement: ${snippet}...`);
        errors.push(errorMsg);
        errorCount++;
      }
    }
    
    // Release the connection
    connection.release();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));
    
    if (errorCount === 0) {
      console.log('\n🎉 Schema import completed successfully!');
      console.log('📱 You can now view the database in phpMyAdmin at:');
      console.log('   http://localhost/phpmyadmin/index.php?route=/database/structure&db=icas_cmu_hub\n');
    } else {
      console.log('\n⚠️  Schema import completed with some errors.');
      console.log('   Please review the errors above.\n');
    }
    
    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      errors,
    };
    
  } catch (error: any) {
    const errorMsg = `Fatal error during schema import: ${error.message}`;
    console.error('❌', errorMsg);
    console.error(error);
    errors.push(errorMsg);
    
    return {
      success: false,
      successCount: 0,
      errorCount: 1,
      errors,
    };
  } finally {
    // Close the pool only if requested (for standalone script usage)
    if (closePool) {
      await pool.end();
    }
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  importSchema(true)
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unhandled error:', error);
      process.exit(1);
    });
}

