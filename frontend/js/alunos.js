// Tela de alunos (RF01). Sem framework, conforme o RNF02.

const API_URL = 'http://localhost:3000/api/alunos';

const formulario = document.getElementById('formulario-aluno');
const campoId = document.getElementById('aluno-id');
const campoNome = document.getElementById('nome');
const campoEmail = document.getElementById('email');
const campoSenha = document.getElementById('senha');
const campoNascimento = document.getElementById('data-nascimento');
const blocoSenha = document.getElementById('campo-senha');
const tituloFormulario = document.getElementById('titulo-formulario');
const botaoCancelar = document.getElementById('botao-cancelar');
const corpoTabela = document.getElementById('corpo-tabela');
const mensagem = document.getElementById('mensagem');

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = 'mensagem ' + tipo;
}

// Monta uma celula com texto. Usar textContent em vez de innerHTML e proposital:
// se o nome do aluno contiver "<script>", o innerHTML executaria o codigo.
function celula(texto) {
  const td = document.createElement('td');
  td.textContent = texto || '-';
  return td;
}

function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

async function carregarAlunos() {
  try {
    const resposta = await fetch(API_URL);
    const corpo = await resposta.json();

    if (corpo.status !== 'ok') {
      return mostrarMensagem(corpo.message, 'erro');
    }

    corpoTabela.replaceChildren();

    if (corpo.dados.length === 0) {
      const linha = document.createElement('tr');
      const td = celula('Nenhum aluno cadastrado ainda.');
      td.colSpan = 4;
      linha.appendChild(td);
      corpoTabela.appendChild(linha);
      return;
    }

    for (const aluno of corpo.dados) {
      const linha = document.createElement('tr');
      linha.appendChild(celula(aluno.nome));
      linha.appendChild(celula(aluno.email));
      linha.appendChild(celula(formatarData(aluno.data_nascimento)));

      const acoes = document.createElement('td');

      const editar = document.createElement('button');
      editar.textContent = 'Editar';
      editar.className = 'secundario';
      editar.addEventListener('click', () => prepararEdicao(aluno));

      const excluir = document.createElement('button');
      excluir.textContent = 'Excluir';
      excluir.className = 'perigo';
      excluir.addEventListener('click', () => excluirAluno(aluno));

      acoes.append(editar, ' ', excluir);
      linha.appendChild(acoes);
      corpoTabela.appendChild(linha);
    }
  } catch (e) {
    mostrarMensagem('Nao foi possivel falar com o backend. Ele esta rodando?', 'erro');
  }
}

function prepararEdicao(aluno) {
  campoId.value = aluno.id;
  campoNome.value = aluno.nome;
  campoEmail.value = aluno.email;
  campoNascimento.value = aluno.data_nascimento || '';

  // Sem senha na edicao: o campo sai da tela e perde o "required", senao o
  // navegador bloqueia o envio de um campo obrigatorio que esta escondido.
  blocoSenha.hidden = true;
  campoSenha.required = false;

  tituloFormulario.textContent = 'Editar aluno';
  botaoCancelar.hidden = false;
  mostrarMensagem('', '');
  campoNome.focus();
}

function limparFormulario() {
  formulario.reset();
  campoId.value = '';
  blocoSenha.hidden = false;
  campoSenha.required = true;
  tituloFormulario.textContent = 'Cadastrar aluno';
  botaoCancelar.hidden = true;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const editando = campoId.value !== '';
  const dados = {
    nome: campoNome.value.trim(),
    email: campoEmail.value.trim(),
    data_nascimento: campoNascimento.value || null
  };
  if (!editando) {
    dados.senha = campoSenha.value;
  }

  try {
    const resposta = await fetch(editando ? `${API_URL}/${campoId.value}` : API_URL, {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resposta.json();

    if (corpo.status !== 'ok') {
      return mostrarMensagem(corpo.message, 'erro');
    }

    mostrarMensagem(editando ? 'Aluno atualizado.' : 'Aluno cadastrado.', 'sucesso');
    limparFormulario();
    carregarAlunos();
  } catch (e) {
    mostrarMensagem('Nao foi possivel falar com o backend. Ele esta rodando?', 'erro');
  }
});

botaoCancelar.addEventListener('click', () => {
  limparFormulario();
  mostrarMensagem('', '');
});

async function excluirAluno(aluno) {
  if (!confirm(`Excluir o aluno ${aluno.nome}?`)) return;

  try {
    const resposta = await fetch(`${API_URL}/${aluno.id}`, { method: 'DELETE' });
    const corpo = await resposta.json();

    if (corpo.status !== 'ok') {
      return mostrarMensagem(corpo.message, 'erro');
    }
    mostrarMensagem('Aluno excluido.', 'sucesso');
    limparFormulario();
    carregarAlunos();
  } catch (e) {
    mostrarMensagem('Nao foi possivel falar com o backend. Ele esta rodando?', 'erro');
  }
}

carregarAlunos();
