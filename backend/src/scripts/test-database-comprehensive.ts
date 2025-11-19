import pool, { testConnection } from '../config/database';
import { RowDataPacket } from 'mysql2';

interface TableInfo {
  name: string;
  exists: boolean;
  rowCount: number;
  columns: string[];
  foreignKeys: string[];
  issues: string[];
}

interface TestResult {
  connection: boolean;
  tables: TableInfo[];
  foreignKeys: { valid: number; invalid: number };
  queries: { passed: number; failed: number };
  errors: string[];
}

const REQUIRED_TABLES = [
  'users',
  'clubs',
  'club_memberships',
  'events',
  'check_in_sessions',
  'check_ins',
  'documents',
  'reports',
  'club_assignments',
  'assignment_submissions',
  'assignment_attachments',
  'assignment_comments',
  'document_assignments',
  'document_templates',
  'smart_documents',
  'email_otps',
];

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    return rows[0].count > 0;
  } catch (error) {
    return false;
  }
}

async function getTableRowCount(tableName: string): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    return rows[0].count;
  } catch (error) {
    return -1;
  }
}

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? 
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    );
    return rows.map((row: any) => row.COLUMN_NAME);
  } catch (error) {
    return [];
  }
}

async function getForeignKeys(tableName: string): Promise<string[]> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME, ' -> ', 
               TABLE_NAME, '.', COLUMN_NAME) as fk_info
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName]
    );
    return rows.map((row: any) => row.fk_info);
  } catch (error) {
    return [];
  }
}

async function testTableQueries(tableName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Test basic SELECT
    await pool.execute(`SELECT * FROM \`${tableName}\` LIMIT 1`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkForeignKeyIntegrity(): Promise<{ valid: number; invalid: number }> {
  let valid = 0;
  let invalid = 0;

  // Check common foreign key relationships
  const fkChecks = [
    {
      name: 'clubs.president_id -> users.id',
      query: `SELECT COUNT(*) as invalid FROM clubs c 
              LEFT JOIN users u ON c.president_id = u.id 
              WHERE c.president_id IS NOT NULL AND u.id IS NULL`,
    },
    {
      name: 'events.club_id -> clubs.id',
      query: `SELECT COUNT(*) as invalid FROM events e 
              LEFT JOIN clubs c ON e.club_id = c.id 
              WHERE c.id IS NULL`,
    },
    {
      name: 'events.created_by -> users.id',
      query: `SELECT COUNT(*) as invalid FROM events e 
              LEFT JOIN users u ON e.created_by = u.id 
              WHERE u.id IS NULL`,
    },
    {
      name: 'club_memberships.user_id -> users.id',
      query: `SELECT COUNT(*) as invalid FROM club_memberships cm 
              LEFT JOIN users u ON cm.user_id = u.id 
              WHERE u.id IS NULL`,
    },
    {
      name: 'club_memberships.club_id -> clubs.id',
      query: `SELECT COUNT(*) as invalid FROM club_memberships cm 
              LEFT JOIN clubs c ON cm.club_id = c.id 
              WHERE c.id IS NULL`,
    },
    {
      name: 'documents.created_by -> users.id',
      query: `SELECT COUNT(*) as invalid FROM documents d 
              LEFT JOIN users u ON d.created_by = u.id 
              WHERE u.id IS NULL`,
    },
  ];

  for (const check of fkChecks) {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(check.query);
      const invalidCount = rows[0].invalid;
      if (invalidCount === 0) {
        valid++;
      } else {
        invalid++;
        console.log(`  ⚠️  ${check.name}: ${invalidCount} invalid references`);
      }
    } catch (error: any) {
      // Table might not exist or have no data
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        invalid++;
      }
    }
  }

  return { valid, invalid };
}

async function checkDataIntegrity(): Promise<string[]> {
  const issues: string[] = [];

  // Check for orphaned records
  try {
    const [orphanedEvents] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM events e 
       LEFT JOIN clubs c ON e.club_id = c.id 
       WHERE c.id IS NULL`
    );
    if (orphanedEvents[0].count > 0) {
      issues.push(`Found ${orphanedEvents[0].count} events with invalid club_id`);
    }
  } catch (error: any) {
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      issues.push(`Error checking events: ${error.message}`);
    }
  }

  // Check for users without valid email
  try {
    const [invalidEmails] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM users WHERE email IS NULL OR email = ''`
    );
    if (invalidEmails[0].count > 0) {
      issues.push(`Found ${invalidEmails[0].count} users with invalid email`);
    }
  } catch (error: any) {
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      issues.push(`Error checking users: ${error.message}`);
    }
  }

  // Check for duplicate emails
  try {
    const [duplicates] = await pool.execute<RowDataPacket[]>(
      `SELECT email, COUNT(*) as count FROM users 
       GROUP BY email HAVING count > 1`
    );
    if (duplicates.length > 0) {
      issues.push(`Found duplicate emails: ${duplicates.map((d: any) => d.email).join(', ')}`);
    }
  } catch (error: any) {
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      issues.push(`Error checking duplicate emails: ${error.message}`);
    }
  }

  return issues;
}

async function comprehensiveTest(): Promise<TestResult> {
  const result: TestResult = {
    connection: false,
    tables: [],
    foreignKeys: { valid: 0, invalid: 0 },
    queries: { passed: 0, failed: 0 },
    errors: [],
  };

  console.log('🔍 Starting comprehensive database test...\n');

  // 1. Test connection
  console.log('1️⃣  Testing database connection...');
  result.connection = await testConnection();
  if (!result.connection) {
    result.errors.push('Database connection failed');
    console.log('❌ Connection failed\n');
    return result;
  }
  console.log('✅ Connection successful\n');

  // 2. Check all tables
  console.log('2️⃣  Checking tables...');
  for (const tableName of REQUIRED_TABLES) {
    const tableInfo: TableInfo = {
      name: tableName,
      exists: false,
      rowCount: 0,
      columns: [],
      foreignKeys: [],
      issues: [],
    };

    tableInfo.exists = await checkTableExists(tableName);
    
    if (tableInfo.exists) {
      tableInfo.rowCount = await getTableRowCount(tableName);
      tableInfo.columns = await getTableColumns(tableName);
      tableInfo.foreignKeys = await getForeignKeys(tableName);
      
      const queryTest = await testTableQueries(tableName);
      if (queryTest.success) {
        result.queries.passed++;
      } else {
        result.queries.failed++;
        tableInfo.issues.push(`Query failed: ${queryTest.error}`);
      }

      if (tableInfo.rowCount < 0) {
        tableInfo.issues.push('Cannot read row count');
      }
    } else {
      tableInfo.issues.push('Table does not exist');
      result.queries.failed++;
    }

    result.tables.push(tableInfo);
    
    const status = tableInfo.exists ? '✅' : '❌';
    const rowInfo = tableInfo.exists ? `(${tableInfo.rowCount} rows)` : '';
    console.log(`   ${status} ${tableName} ${rowInfo}`);
    if (tableInfo.issues.length > 0) {
      tableInfo.issues.forEach(issue => console.log(`      ⚠️  ${issue}`));
    }
  }
  console.log('');

  // 3. Check foreign key integrity
  console.log('3️⃣  Checking foreign key integrity...');
  result.foreignKeys = await checkForeignKeyIntegrity();
  console.log(`   ✅ Valid: ${result.foreignKeys.valid}`);
  if (result.foreignKeys.invalid > 0) {
    console.log(`   ❌ Invalid: ${result.foreignKeys.invalid}`);
  }
  console.log('');

  // 4. Check data integrity
  console.log('4️⃣  Checking data integrity...');
  const dataIssues = await checkDataIntegrity();
  if (dataIssues.length === 0) {
    console.log('   ✅ No data integrity issues found');
  } else {
    dataIssues.forEach(issue => {
      console.log(`   ⚠️  ${issue}`);
      result.errors.push(issue);
    });
  }
  console.log('');

  // 5. Test sample queries
  console.log('5️⃣  Testing sample queries...');
  const sampleQueries = [
    { name: 'Get all users', query: 'SELECT COUNT(*) as count FROM users' },
    { name: 'Get all clubs', query: 'SELECT COUNT(*) as count FROM clubs' },
    { name: 'Get club memberships', query: 'SELECT COUNT(*) as count FROM club_memberships' },
    { name: 'Get events', query: 'SELECT COUNT(*) as count FROM events' },
  ];

  for (const { name, query } of sampleQueries) {
    try {
      await pool.execute(query);
      console.log(`   ✅ ${name}`);
    } catch (error: any) {
      console.log(`   ❌ ${name}: ${error.message}`);
      result.errors.push(`${name} query failed: ${error.message}`);
    }
  }
  console.log('');

  return result;
}

async function printSummary(result: TestResult) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🔌 Connection: ${result.connection ? '✅ Connected' : '❌ Failed'}`);
  
  const existingTables = result.tables.filter(t => t.exists).length;
  const missingTables = result.tables.filter(t => !t.exists).length;
  console.log(`\n📋 Tables:`);
  console.log(`   ✅ Existing: ${existingTables}/${REQUIRED_TABLES.length}`);
  if (missingTables > 0) {
    console.log(`   ❌ Missing: ${missingTables}`);
    result.tables
      .filter(t => !t.exists)
      .forEach(t => console.log(`      - ${t.name}`));
  }
  
  console.log(`\n🔗 Foreign Keys:`);
  console.log(`   ✅ Valid: ${result.foreignKeys.valid}`);
  console.log(`   ❌ Invalid: ${result.foreignKeys.invalid}`);
  
  console.log(`\n🔍 Queries:`);
  console.log(`   ✅ Passed: ${result.queries.passed}`);
  console.log(`   ❌ Failed: ${result.queries.failed}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Issues Found:`);
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  } else {
    console.log(`\n✅ No issues found!`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  const allGood = result.connection && 
                  missingTables === 0 && 
                  result.foreignKeys.invalid === 0 && 
                  result.queries.failed === 0 && 
                  result.errors.length === 0;
  
  if (allGood) {
    console.log('\n🎉 All tests passed! Database is healthy.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some issues were found. Please review the results above.\n');
    process.exit(1);
  }
}

// Run the test
async function main() {
  try {
    const result = await comprehensiveTest();
    await printSummary(result);
  } catch (error: any) {
    console.error('❌ Fatal error during testing:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

