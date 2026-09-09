// Rodape com o numero de versao, compartilhado por todas as telas: qualquer
// pagina que incluir este script ganha o rodape sem precisar escrever HTML
// para ele. Ao clicar no numero, abre o changelog num dialogo nativo do
// navegador (a tag <dialog>, sem precisar de biblioteca nenhuma).
//
// O numero de versao nunca e escrito aqui: ele vem sempre do backend, que le
// do package.json. Assim ele existe em um lugar so - e nunca fica
// desatualizado num arquivo que alguem esqueceu de mexer.

const API_URL = 'http://localhost:3000/api';

function construirRodape() {
  const rodape = document.createElement('footer');
  rodape.className = 'rodape-sistema';

  const botaoVersao = document.createElement('button');
  botaoVersao.type = 'button';
  botaoVersao.className = 'versao-sistema';
  botaoVersao.textContent = 'SIGEM';
  botaoVersao.disabled = true; // so habilita depois que a versao carregar

  rodape.appendChild(botaoVersao);
  document.body.appendChild(rodape);

  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo-changelog';

  const cabecalho = document.createElement('div');
  cabecalho.className = 'dialogo-cabecalho';

  const titulo = document.createElement('h2');
  titulo.textContent = 'Changelog';

  const botaoFechar = document.createElement('button');
  botaoFechar.type = 'button';
  botaoFechar.className = 'secundario';
  botaoFechar.textContent = 'Fechar';
  botaoFechar.addEventListener('click', () => dialogo.close());

  cabecalho.append(titulo, botaoFechar);

  const corpo = document.createElement('div');
  corpo.className = 'dialogo-corpo';
  corpo.textContent = 'Carregando...';

  dialogo.append(cabecalho, corpo);
  document.body.appendChild(dialogo);

  return { botaoVersao, dialogo, corpo };
}

// Interpretador minimo de markdown - so entende o que o CHANGELOG.md usa:
// "## " e "### " como titulos, "- " como item de lista, e paragrafo comum.
// Nao existe biblioteca de markdown no projeto: o frontend e HTML/CSS/JS puro
// (RNF02), e um changelog tem formato simples demais para justificar uma
// dependencia nova so para isto.
//
// Cada trecho vira elemento por textContent, nunca por innerHTML - mesmo o
// CHANGELOG.md sendo escrito por nos, e o mesmo cuidado usado nas tabelas de
// aluno e professor: dado nunca vira HTML executado.
function renderizarChangelog(texto, corpo) {
  corpo.replaceChildren();
  let listaAtual = null;

  for (const linhaBruta of texto.split('\n')) {
    const linha = linhaBruta.trim();

    if (linha.startsWith('### ')) {
      listaAtual = null;
      const h4 = document.createElement('h4');
      h4.textContent = linha.slice(4);
      corpo.appendChild(h4);
    } else if (linha.startsWith('## ')) {
      listaAtual = null;
      const h3 = document.createElement('h3');
      h3.textContent = linha.slice(3);
      corpo.appendChild(h3);
    } else if (linha.startsWith('# ')) {
      // O titulo principal do markdown ("# Changelog") e ignorado: o dialogo
      // ja mostra "Changelog" no proprio cabecalho, duplicar seria repetitivo.
      listaAtual = null;
    } else if (linha.startsWith('- ')) {
      if (!listaAtual) {
        listaAtual = document.createElement('ul');
        corpo.appendChild(listaAtual);
      }
      const li = document.createElement('li');
      li.textContent = linha.slice(2);
      listaAtual.appendChild(li);
    } else if (linha.length > 0) {
      listaAtual = null;
      const p = document.createElement('p');
      p.textContent = linha;
      corpo.appendChild(p);
    }
  }
}

async function iniciarRodape() {
  const { botaoVersao, dialogo, corpo } = construirRodape();

  try {
    const resposta = await fetch(`${API_URL}/versao`);
    const corpoResposta = await resposta.json();
    if (corpoResposta.status === 'ok') {
      botaoVersao.textContent = `SIGEM v${corpoResposta.dados.versao}`;
      botaoVersao.disabled = false;
    }
  } catch (e) {
    // backend fora do ar: o rodape fica com o nome, sem numero, sem quebrar a tela
    botaoVersao.textContent = 'SIGEM';
  }

  botaoVersao.addEventListener('click', async () => {
    dialogo.showModal();
    try {
      const resposta = await fetch(`${API_URL}/changelog`);
      const corpoResposta = await resposta.json();
      if (corpoResposta.status === 'ok') {
        renderizarChangelog(corpoResposta.dados.conteudo, corpo);
      } else {
        corpo.textContent = corpoResposta.message;
      }
    } catch (e) {
      corpo.textContent = 'Nao foi possivel carregar o changelog.';
    }
  });
}

iniciarRodape();
