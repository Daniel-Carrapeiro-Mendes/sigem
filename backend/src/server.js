const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health.routes');
const alunoRoutes = require('./routes/aluno.routes');
const professorRoutes = require('./routes/professor.routes');

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Rotas
// Registradas todas de uma vez no inicio do sprint: assim quem implementa alunos
// e quem implementa professores nunca precisa editar este arquivo ao mesmo tempo.
app.use('/api', healthRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/professores', professorRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor do SIGEM rodando em http://localhost:${PORT}`);
  console.log(`Teste em: http://localhost:${PORT}/api/health`);
});
