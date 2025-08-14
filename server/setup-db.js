import pool from './database.js'
import bcrypt from 'bcryptjs'

async function setupDatabase() {
  const client = await pool.connect()
  
  try {
    console.log('Creating database tables...')
    
    // Drop existing tables if they exist (for clean setup)
    await client.query('DROP TABLE IF EXISTS pauta_vendas CASCADE')
    await client.query('DROP TABLE IF EXISTS atendimentos CASCADE')
    await client.query('DROP TABLE IF EXISTS produtos CASCADE')
    await client.query('DROP TABLE IF EXISTS negocios CASCADE')
    await client.query('DROP TABLE IF EXISTS clientes CASCADE')
    await client.query('DROP TABLE IF EXISTS users CASCADE')
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create clientes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(50),
        cidade VARCHAR(100),
        endereco TEXT,
        empresa VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create negocios table
    await client.query(`
      CREATE TABLE IF NOT EXISTS negocios (
        id SERIAL PRIMARY KEY,
        cliente VARCHAR(255) NOT NULL,
        valor VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Em Andamento',
        data DATE NOT NULL,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create produtos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco VARCHAR(50) NOT NULL,
        categoria VARCHAR(100),
        estoque INTEGER DEFAULT 0,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create atendimentos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS atendimentos (
        id SERIAL PRIMARY KEY,
        cliente VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pendente',
        datetime_agendamento TIMESTAMP NOT NULL,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create pauta_vendas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pauta_vendas (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        cliente VARCHAR(255) NOT NULL,
        valor VARCHAR(50) NOT NULL,
        data DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'Ativa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Check if admin user exists
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@brm.com'])
    
    if (adminCheck.rows.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await client.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `, ['Administrator', 'admin@brm.com', hashedPassword, 'admin'])
      
      console.log('Default admin user created:')
      console.log('Email: admin@brm.com')
      console.log('Password: admin123')
    }
    
    // Insert sample data if tables are empty
    const clienteCount = await client.query('SELECT COUNT(*) FROM clientes')
    if (parseInt(clienteCount.rows[0].count) === 0) {
      console.log('Inserting sample data...')
      
      // Sample clientes
      await client.query(`
        INSERT INTO clientes (nome, email, telefone, cidade, endereco, empresa) VALUES
        ('João Silva', 'joao@email.com', '(11) 99999-9999', 'São Paulo', 'Rua das Flores, 123', 'Tech Corp'),
        ('Maria Santos', 'maria@email.com', '(11) 88888-8888', 'Rio de Janeiro', 'Av. Principal, 456', 'Inovação Ltda'),
        ('Pedro Costa', 'pedro@email.com', '(11) 77777-7777', 'Belo Horizonte', 'Rua Central, 789', 'Solutions Inc'),
        ('Ana Oliveira', 'ana@email.com', '(11) 66666-6666', 'Salvador', 'Rua Nova, 321', 'Creative Agency')
      `)
      
      // Sample negócios
      await client.query(`
        INSERT INTO negocios (cliente, valor, status, data, descricao) VALUES
        ('João Silva', 'R$ 15.000', 'Em Andamento', '2024-01-15', 'Desenvolvimento de sistema ERP'),
        ('Maria Santos', 'R$ 8.500', 'Proposta', '2024-01-12', 'Consultoria em TI'),
        ('Pedro Costa', 'R$ 22.000', 'Fechado', '2024-01-10', 'Migração para nuvem'),
        ('Ana Oliveira', 'R$ 12.300', 'Em Andamento', '2024-01-08', 'Website corporativo')
      `)
      
      // Sample produtos
      await client.query(`
        INSERT INTO produtos (nome, preco, categoria, estoque, descricao) VALUES
        ('Software ERP Basic', 'R$ 299,90', 'Software', 15, 'Sistema básico de gestão empresarial'),
        ('Consultoria Premium', 'R$ 199,90', 'Serviços', 8, 'Consultoria especializada em TI'),
        ('Hosting Cloud Pro', 'R$ 399,90', 'Infraestrutura', 22, 'Hospedagem em nuvem profissional'),
        ('Suporte Técnico', 'R$ 149,90', 'Serviços', 5, 'Suporte técnico 24/7'),
        ('Website Custom', 'R$ 599,90', 'Desenvolvimento', 12, 'Website personalizado'),
        ('Backup Automático', 'R$ 89,90', 'Infraestrutura', 30, 'Sistema de backup automático')
      `)
      
      // Sample atendimentos
      await client.query(`
        INSERT INTO atendimentos (cliente, tipo, status, datetime_agendamento, descricao) VALUES
        ('João Silva', 'Suporte', 'Em Andamento', '2024-01-15 14:30:00'::timestamp, 'Problemas no sistema ERP'),
        ('Maria Santos', 'Vendas', 'Concluído', '2024-01-15 10:15:00'::timestamp, 'Apresentação de produtos'),
        ('Pedro Costa', 'Suporte', 'Pendente', '2024-01-14 16:45:00'::timestamp, 'Configuração de servidor'),
        ('Ana Oliveira', 'Consultoria', 'Em Andamento', '2024-01-14 09:00:00'::timestamp, 'Análise de necessidades')
      `)
      
      // Sample pauta de vendas
      await client.query(`
        INSERT INTO pauta_vendas (titulo, cliente, valor, data, status) VALUES
        ('Proposta Sistema ERP', 'João Silva', 'R$ 50.000', '2024-01-20', 'Ativa'),
        ('Consultoria TI', 'Maria Santos', 'R$ 25.000', '2024-01-18', 'Concluída'),
        ('Desenvolvimento App', 'Pedro Costa', 'R$ 80.000', '2024-01-15', 'Ativa'),
        ('Website E-commerce', 'Ana Oliveira', 'R$ 35.000', '2024-01-22', 'Ativa')
      `)
    }
    
    console.log('Database setup completed successfully!')
    
  } catch (error) {
    console.error('Error setting up database:', error)
  } finally {
    client.release()
  }
}

setupDatabase().then(() => {
  process.exit(0)
})