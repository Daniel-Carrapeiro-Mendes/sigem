const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const healthRoutes = require('./routes/health.routes');
const alunoRoutes = require('./routes/aluno.routes');
const professorRoutes = require('./routes/professor.routes');
const sistemaRoutes = require('./routes/sistema.routes');

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());

// Serve o frontend direto pelo mesmo servidor: quem abrir http://localhost:3000
// ja recebe a tela, sem precisar abrir o index.html pelo disco separadamente.
// __dirname e o caminho absoluto da pasta deste arquivo (backend/src) - usamos
// ele, e nao um caminho relativo solto, porque um caminho relativo depende de
// qual pasta a pessoa estava quando digitou "npm run dev", e isso varia.
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rotas
// Registradas todas de uma vez no inicio do sprint: assim quem implementa alunos
// e quem implementa professores nunca precisa editar este arquivo ao mesmo tempo.
app.use('/api', healthRoutes);
app.use('/api', sistemaRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/professores', professorRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor do SIGEM rodando em http://localhost:${PORT}`);
  console.log(`Teste em: http://localhost:${PORT}/api/health`);
});
