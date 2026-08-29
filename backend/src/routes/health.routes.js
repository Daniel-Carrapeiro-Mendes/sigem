// Rota simples para confirmar que o servidor e o banco estao funcionando.
// Util para testar o ambiente antes de comecar a desenvolver as rotas reais (RF01 a RF08).

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /health -> confirma que a API esta de pe
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API do SIGEM esta funcionando' });
});

// GET /health/db -> confirma que a conexao com o PostgreSQL esta funcionando
router.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', message: 'Conexao com o banco OK', horario_banco: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'erro', message: 'Falha ao conectar no banco', detalhe: error.message });
  }
});

module.exports = router;
