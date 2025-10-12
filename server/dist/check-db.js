import pool from './database.js';
async function checkDatabase() {
    const client = await pool.connect();
    try {
        console.log('Checking existing tables...');
        // Check if tables exist and their schema
        const tables = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
        console.log('Database schema:');
        let currentTable = '';
        for (const row of tables.rows) {
            if (row.table_name !== currentTable) {
                console.log(`\n${row.table_name}:`);
                currentTable = row.table_name;
            }
            console.log(`  ${row.column_name}: ${row.data_type}`);
        }
    }
    catch (error) {
        console.error('Error checking database:', error);
    }
    finally {
        client.release();
    }
}
checkDatabase().then(() => {
    process.exit(0);
});
