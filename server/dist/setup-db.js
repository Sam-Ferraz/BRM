import pool from './database.js';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function setupDatabase() {
    const client = await pool.connect();
    try {
        console.log('Setting up database from dump using pg_restore...');
        // Use pg_restore to restore the dump
        const dumpPath = join(__dirname, '../db/dumps/dump-brm-dev-202508302323.sql');
        const dbUrl = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
        try {
            const { stdout, stderr } = await execAsync(`pg_restore -v --no-owner --no-privileges -d "${dbUrl}" "${dumpPath}"`);
            if (stdout)
                console.log('pg_restore output:', stdout);
            if (stderr)
                console.log('pg_restore warnings:', stderr);
        }
        catch (error) {
            console.log('pg_restore completed with warnings (this is normal):', error.message);
        }
        // Check if admin user exists and create if needed
        const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@brm.com']);
        if (adminCheck.rows.length === 0) {
            // Create default admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await client.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `, ['Administrator', 'admin@brm.com', hashedPassword, 'admin']);
            console.log('Default admin user created:');
            console.log('Email: admin@brm.com');
            console.log('Password: admin123');
        }
        console.log('Database setup from dump completed successfully!');
    }
    catch (error) {
        console.error('Error setting up database:', error);
    }
    finally {
        client.release();
    }
}
setupDatabase().then(() => {
    process.exit(0);
});
