import pool, { testConnection } from '../config/database';

async function test() {
  console.log('Testing database connection...\n');
  
  const connected = await testConnection();
  
  if (connected) {
    try {
      // Test a simple query
      const [rows] = await pool.query('SELECT DATABASE() as current_db, NOW() as server_time');
      console.log('✅ Database query successful');
      console.log('Current database:', (rows as any[])[0].current_db);
      console.log('Server time:', (rows as any[])[0].server_time);
      
      // Check tables
      const [tables] = await pool.query('SHOW TABLES');
      console.log('\n📊 Available tables:');
      (tables as any[]).forEach((table: any) => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    } catch (error) {
      console.error('❌ Query failed:', error);
    } finally {
      await pool.end();
    }
  } else {
    console.error('❌ Connection test failed');
    process.exit(1);
  }
}

test();

