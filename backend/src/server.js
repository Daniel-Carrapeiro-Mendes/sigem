const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health.routes');

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', healthRoutes);

// Quando comecarem a implementar RF01 a RF08, as novas rotas entram aqui, por exemplo:
// const alunoRoutes = require('./routes/aluno.routes');
// app.use('/api/alunos', alunoRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor do SIGEM rodando em http://localhost:${PORT}`);
  console.log(`Teste em: http://localhost:${PORT}/api/health`);
});
