import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool, types } = pg

// PostgreSQL DATE (OID 1082) — por padrao o driver pg converte pra Date JS
// com meia-noite UTC. Isso quebra em timezone BR (UTC-3): "2026-08-10" vira
// "2026-08-09T21:00:00-03:00" ao serializar, aparecendo como o dia anterior.
// Preservamos a string "yyyy-MM-dd" pra que o frontend receba a mesma data
// que o usuario digitou, sem conversao de timezone.
types.setTypeParser(1082, (value: string) => value)

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
  // Force all connections to use UTC timezone
  options: '--timezone=UTC'
})

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
})

export default pool