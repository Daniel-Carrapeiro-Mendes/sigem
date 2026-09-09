// Rotas sobre o proprio sistema: numero da versao e historico de mudancas.
// Ficam num arquivo separado porque nao pertencem a nenhuma funcionalidade
// especifica (aluno, professor...) - sao sobre o software como um todo.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// O package.json e a UNICA fonte da versao. Nunca digite o numero em outro
// lugar (nem no HTML, nem aqui) - se digitasse, um dia os dois desencontram.
const packageJson = require('../../package.json');

// CHANGELOG.md fica na raiz do repositorio, nao dentro de backend/.
// routes/ -> src/ -> backend/ -> sigem/ e onde o arquivo mora.
const CAMINHO_CHANGELOG = path.join(__dirname, '../../../CHANGELOG.md');

// GET /api/versao -> devolve o numero de versao atual.
router.get('/versao', (req, res) => {
  res.json({ status: 'ok', dados: { versao: packageJson.version } });
});

// GET /api/changelog -> devolve o texto do CHANGELOG.md, cru. Quem interpreta
// o markdown e o frontend; o servidor so entrega o conteudo do arquivo.
router.get('/changelog', (req, res) => {
  fs.readFile(CAMINHO_CHANGELOG, 'utf8', (erro, conteudo) => {
    if (erro) {
      return res.status(500).json({
        status: 'erro',
        message: 'Nao foi possivel ler o changelog',
        detalhe: erro.message
      });
    }
    res.json({ status: 'ok', dados: { conteudo } });
  });
});

module.exports = router;
