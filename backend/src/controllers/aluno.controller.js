// Controller de alunos (RF01): cadastro, edicao, consulta e exclusao.
//
// Um aluno vive em duas tabelas: "usuario" (nome, email, senha, perfil, ativo) e
// "aluno" (data_nascimento). Por isso cadastrar e editar usam transacao - se a
// segunda escrita falhar, a primeira precisa ser desfeita, senao sobra um usuario
// orfao no banco.

const bcrypt = require('bcrypt');
const pool = require('../config/db');

// Custo do hash: quantas rodadas de embaralhamento o bcrypt aplica na senha.
// 10 e o padrao recomendado - alto o bastante para atrapalhar quem tenta
// adivinhar, baixo o bastante para o cadastro nao demorar.
const CUSTO_HASH = 10;

// As colunas devolvidas em toda consulta. Listadas uma a uma de proposito:
// "SELECT *" traria senha_hash junto, e hash de senha nunca sai da API.
// A data vira texto no proprio SQL para nao passar por Date do JavaScript, que
// desloca o dia conforme o fuso horario.
const COLUNAS = `
  a.id,
  u.nome,
  u.email,
  TO_CHAR(a.data_nascimento, 'YYYY-MM-DD') AS data_nascimento
`;

// Codigo do PostgreSQL para violacao de restricao UNIQUE (email repetido).
const EMAIL_DUPLICADO = '23505';

function erro(res, status, message, detalhe) {
  return res.status(status).json({ status: 'erro', message, detalhe });
}

// GET /api/alunos -> lista os alunos ativos
async function listar(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT ${COLUNAS}
      FROM aluno a
      JOIN usuario u ON u.id = a.usuario_id
      WHERE u.ativo = true
      ORDER BY u.nome
    `);
    res.json({ status: 'ok', dados: resultado.rows });
  } catch (e) {
    erro(res, 500, 'Falha ao listar os alunos', e.message);
  }
}

// GET /api/alunos/:id -> busca um aluno
async function buscarPorId(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT ${COLUNAS}
      FROM aluno a
      JOIN usuario u ON u.id = a.usuario_id
      WHERE a.id = $1 AND u.ativo = true
    `, [req.params.id]);

    if (resultado.rows.length === 0) {
      return erro(res, 404, 'Aluno nao encontrado');
    }
    res.json({ status: 'ok', dados: resultado.rows[0] });
  } catch (e) {
    erro(res, 500, 'Falha ao buscar o aluno', e.message);
  }
}

// POST /api/alunos -> cadastra usuario + aluno
async function criar(req, res) {
  const { nome, email, senha, data_nascimento } = req.body;

  if (!nome || !email || !senha) {
    return erro(res, 400, 'Nome, email e senha sao obrigatorios');
  }

  // client() em vez de pool.query() porque BEGIN/COMMIT precisam rodar todos na
  // MESMA conexao. Com pool.query() cada comando poderia pegar uma conexao
  // diferente e a transacao nao valeria de nada.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const senhaHash = await bcrypt.hash(senha, CUSTO_HASH);
    const usuario = await client.query(`
      INSERT INTO usuario (nome, email, senha_hash, perfil)
      VALUES ($1, $2, $3, 'aluno')
      RETURNING id
    `, [nome, email, senhaHash]);

    const aluno = await client.query(`
      INSERT INTO aluno (usuario_id, data_nascimento)
      VALUES ($1, $2)
      RETURNING id
    `, [usuario.rows[0].id, data_nascimento || null]);

    await client.query('COMMIT');
    res.status(201).json({
      status: 'ok',
      dados: { id: aluno.rows[0].id, nome, email, data_nascimento: data_nascimento || null }
    });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === EMAIL_DUPLICADO) {
      return erro(res, 409, 'Ja existe um usuario com esse email');
    }
    erro(res, 500, 'Falha ao cadastrar o aluno', e.message);
  } finally {
    // devolve a conexao ao pool. Sem isso o pool esgota e a API trava.
    client.release();
  }
}

// PUT /api/alunos/:id -> edita nome, email e data de nascimento
async function atualizar(req, res) {
  const { nome, email, data_nascimento } = req.body;

  if (!nome || !email) {
    return erro(res, 400, 'Nome e email sao obrigatorios');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // O subselect encontra o usuario dono deste aluno. O filtro por ativo evita
    // "ressuscitar" pela edicao alguem que ja foi excluido.
    const usuario = await client.query(`
      UPDATE usuario SET nome = $1, email = $2
      WHERE id = (SELECT usuario_id FROM aluno WHERE id = $3) AND ativo = true
      RETURNING id
    `, [nome, email, req.params.id]);

    if (usuario.rows.length === 0) {
      await client.query('ROLLBACK');
      return erro(res, 404, 'Aluno nao encontrado');
    }

    await client.query(
      'UPDATE aluno SET data_nascimento = $1 WHERE id = $2',
      [data_nascimento || null, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ status: 'ok', dados: { id: Number(req.params.id), nome, email, data_nascimento: data_nascimento || null } });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === EMAIL_DUPLICADO) {
      return erro(res, 409, 'Ja existe um usuario com esse email');
    }
    erro(res, 500, 'Falha ao atualizar o aluno', e.message);
  } finally {
    client.release();
  }
}

// DELETE /api/alunos/:id -> exclusao logica
// Nao apaga a linha: as chaves estrangeiras de matricula e frequencia impedem, e
// apagar destruiria o historico academico. Marca como inativo, some das listas.
async function excluir(req, res) {
  try {
    const resultado = await pool.query(`
      UPDATE usuario SET ativo = false
      WHERE id = (SELECT usuario_id FROM aluno WHERE id = $1) AND ativo = true
      RETURNING id
    `, [req.params.id]);

    if (resultado.rows.length === 0) {
      return erro(res, 404, 'Aluno nao encontrado');
    }
    res.json({ status: 'ok', message: 'Aluno excluido' });
  } catch (e) {
    erro(res, 500, 'Falha ao excluir o aluno', e.message);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir };
