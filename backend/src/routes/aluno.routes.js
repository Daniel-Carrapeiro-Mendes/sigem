// Rotas de alunos (RF01). Este arquivo so liga caminho a funcao - a logica toda
// mora no controller, para poder ser lida e testada sem passar por HTTP.

const express = require('express');
const router = express.Router();
const alunoController = require('../controllers/aluno.controller');

router.get('/', alunoController.listar);
router.get('/:id', alunoController.buscarPorId);
router.post('/', alunoController.criar);
router.put('/:id', alunoController.atualizar);
router.delete('/:id', alunoController.excluir);

module.exports = router;
