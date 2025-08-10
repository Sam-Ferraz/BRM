import pool from './database.js'
import bcrypt from 'bcryptjs'

async function setupAuth() {
  const client = await pool.connect()
  
  try {
    console.log('Setting up authentication...')
    
    // Check if admin user exists
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@brm.com'])
    
    if (adminCheck.rows.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await client.query(`
        INSERT INTO users (username, email, password_hash, nome)
        VALUES ($1, $2, $3, $4)
      `, ['admin', 'admin@brm.com', hashedPassword, 'Administrator'])
      
      console.log('✅ Default admin user created:')
      console.log('📧 Email: admin@brm.com')
      console.log('🔑 Password: admin123')
    } else {
      console.log('ℹ️ Admin user already exists')
    }
    
    // Test retrieving user
    const testUser = await client.query('SELECT id, username, email, nome FROM users WHERE email = $1', ['admin@brm.com'])
    if (testUser.rows.length > 0) {
      console.log('✅ User retrieval test successful:')
      console.log('   ID:', testUser.rows[0].id)
      console.log('   Username:', testUser.rows[0].username)
      console.log('   Email:', testUser.rows[0].email)
      console.log('   Nome:', testUser.rows[0].nome)
    }
    
    console.log('🎉 Authentication setup completed!')
    
  } catch (error) {
    console.error('❌ Error setting up authentication:', error)
  } finally {
    client.release()
  }
}

setupAuth().then(() => {
  process.exit(0)
})