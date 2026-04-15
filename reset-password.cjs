const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:superdev@localhost:5523/brm'
});

async function resetPassword() {
  const hash = await bcrypt.hash('admin123', 10);
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = 'admin@brm.com'",
    [hash]
  );
  console.log('Senha atualizada! Linhas afetadas:', result.rowCount);
  await pool.end();
}

resetPassword().catch(console.error);
