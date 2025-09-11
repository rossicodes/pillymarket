import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database schema...');
    
    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables in database:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check if we have the expected tables
    const expectedTables = ['kols', 'tokens', 'trades', 'trade_transactions', 'leaderboard_periods', 'webhook_logs'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:');
      missingTables.forEach(table => console.log(`- ${table}`));
    } else {
      console.log('\n✅ All expected tables exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();