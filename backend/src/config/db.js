// Configuracao da conexao com o banco PostgreSQL
// Usamos um "pool" de conexoes, que e a forma recomendada pelo driver "pg"
// (evita abrir/fechar uma conexao nova a cada requisicao)

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
