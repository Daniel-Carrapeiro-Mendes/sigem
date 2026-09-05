# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

SIGEM (Sistema de Gestão para Escolas de Música) é o TCC do Daniel Carrapeiro
Mendes e da Anita Felício dos Santos, na Fatec Ourinhos (ADS). Orientador:
Prof. Me. João Maurício Hypolito.

Hoje o código é um **esqueleto validado**: existe apenas a rota de health check.
Nenhuma funcionalidade de negócio foi implementada ainda.

**A equipe são duas pessoas com pouco tempo livre.** O critério de sucesso é ser
aprovado pela banca, não construir o sistema mais completo possível. Diante de uma
escolha entre a solução elegante e a solução simples que funciona e é fácil de
explicar, escolha a simples e diga por quê. Ao planejar, quebre o trabalho em
tarefas que duas pessoas possam pegar em paralelo sem editar o mesmo arquivo.

O Daniel escreve o texto do TCC no Claude Cowork, em **LaTeX**, e trabalha o
código aqui. Mudança de escopo ou de arquitetura decidida no código também mexe no
texto do TCC — sinalize quando isso acontecer.

O diretório de trabalho **não é** o repositório git. A estrutura é:

```
sigem-projeto-base/          <- diretório de trabalho (não versionado)
├── sigem/                   <- repositório git (origin: github.com/Daniel-Carrapeiro-Mendes/sigem)
├── TG-SIGEM.pdf             <- o TCC: metodologia, escopo, cronograma
└── gitToken.txt             <- token pessoal em texto puro; NÃO mova para dentro de sigem/
```

Todo comando de git e de npm roda dentro de `sigem/`.

## Comandos

```bash
cd sigem/backend
npm install
cp .env.example .env     # depois preencher DB_PASSWORD e JWT_SECRET
npm run dev              # nodemon, recarrega a cada save
npm start                # sem watch
```

Não existe suite de testes, linter ou formatter configurado. `npm test` falha.
Se for adicionar qualquer um deles, avise antes — é decisão de stack, não detalhe.

**Verificar que o ambiente está de pé** (é assim que se testa uma mudança hoje):

```bash
curl http://localhost:3000/api/health      # a API responde
curl http://localhost:3000/api/health/db   # o PostgreSQL responde
```

**Banco**: não há sistema de migrations. O schema vive em
`sigem/backend/src/config/schema.sql` e é aplicado **à mão** pelo pgAdmin4
(Query Tool, conectado ao banco `sigem_db`). Alterou o schema, o arquivo `.sql`
muda junto e o Daniel precisa rodar o novo trecho manualmente — diga isso a ele.

**Frontend**: sem build, sem bundler, sem npm. Abrir `sigem/frontend/index.html`
direto no navegador ou pelo Live Server do VS Code.

## Arquitetura

Fluxo de uma requisição, ponta a ponta:

`frontend/js/main.js` faz `fetch` para `http://localhost:3000/api/...` (a URL da
API está hardcoded na constante `API_URL`, linha 3) → `backend/src/server.js`
aplica `cors()` e `express.json()`, então delega o prefixo `/api` para um router
→ o router em `backend/src/routes/` trata a rota → o controller em
`backend/src/controllers/` (pasta ainda vazia) contém a lógica → o acesso ao banco
usa o pool exportado por `backend/src/config/db.js`.

Pontos que só se percebem lendo vários arquivos juntos:

- **`db.js` exporta um `Pool` único**, compartilhado por todo o processo. Sempre
  importe esse módulo; nunca crie um `new Pool` novo dentro de uma rota.
- **Cada nova área vira 3 arquivos**: uma rota em `routes/`, um controller em
  `controllers/`, e uma tela no frontend. O `health.routes.js` mistura rota e
  lógica de propósito, por ser só um teste — não copie esse padrão.
- **Registrar a rota é um passo manual** em `server.js` (não há autoload). Há um
  comentário no arquivo marcando exatamente onde a linha `app.use(...)` entra.
- **`bcrypt` e `jsonwebtoken` já estão instalados mas não são usados em lugar
  nenhum ainda.** Autenticação é trabalho futuro: `usuario.senha_hash` guarda o
  hash do bcrypt e `JWT_SECRET` está no `.env` esperando uso.
- **`bcrypt` compila código nativo na instalação.** O `package.json` tem um campo
  `allowScripts` por causa disso. Se o `npm install` quebrar, é aí.

### Modelo de dados

`usuario` é a tabela central e carrega o `perfil` (`admin` | `professor` | `aluno`,
garantido por CHECK). `professor` e `aluno` são tabelas satélite que apontam para
`usuario` — ou seja, dados de perfil ficam separados dos dados de login.

`curso` → `turma` (que junta um curso e um professor) → `aula`.
`matricula` é a tabela de ligação muitos-para-muitos entre `turma` e `aluno`, com
chave primária composta. `frequencia` liga `aula` + `aluno` com um booleano.
`arquivo` guarda só o `caminho` no disco, não o binário — o upload de áudio é
descrito no TCC como o diferencial do sistema.

## Convenções deste código

- **Comentários em português, explicando o porquê.** Identificadores de código em
  inglês; identificadores de banco e campos de resposta JSON em português
  (`horario_banco`, `senha_hash`, `status`, `message`) — mantenha essa mistura,
  ela é consistente no código existente.
- **O código-fonte existente não usa acentos** (`Configuracao`, `conexao`). O
  README e os arquivos `.md` usam. Siga o arquivo que estiver editando.
- Respostas de erro seguem `{ status: 'erro', message: '...', detalhe: error.message }`
  com o HTTP status apropriado; sucesso usa `status: 'ok'`.
- Tabelas do banco em singular e minúsculo (`usuario`, `turma`), colunas em
  snake_case.

## Requisitos (TG-SIGEM.pdf, Seção 4)

Os comentários no código citam "RF01 a RF08". Eles estão definidos no TCC:

| Código | Requisito funcional |
|---|---|
| RF01 | Cadastro, edição, consulta e exclusão de **alunos**. |
| RF02 | Cadastro, edição, consulta e exclusão de **professores**. |
| RF03 | Cadastro de **turmas e cursos**, associando alunos e professores. |
| RF04 | **Agendamento** de aulas e horários. |
| RF05 | Registro e controle de **frequência** dos alunos por aula. |
| RF06 | **Autenticação** com perfis de acesso (administrador, professor, aluno). |
| RF07 | **Professores enviam arquivos** (texto e áudio) vinculados a turmas ou alunos. |
| RF08 | **Alunos enviam áudio** das suas práticas, para avaliação pedagógica. |

Requisitos não funcionais, que amarram a stack — não troque nada disso sem falar
com o Daniel, porque está escrito no TCC: backend em Node.js + Express (RNF01);
frontend em HTML, CSS e JS puro, **sem frameworks** (RNF02); PostgreSQL (RNF03);
interface responsiva em desktop, tablet e celular (RNF04); navegação simples para
usuários com pouca familiaridade tecnológica (RNF05).

**Fora do escopo do MVP** (o TCC lista como trabalhos futuros — não implemente,
não sugira): grupos musicais, controle de salas, módulo financeiro, empréstimo de
instrumentos, integração com EAD.

## Cronograma e onde o projeto está

O TCC prevê (2º semestre de 2026): refinamento de requisitos e modelagem UML em
ago–set; protótipo no Figma em set–out; **backend e frontend em out–nov**; módulo
de arquivos e áudio em nov; integração e testes em nov–dez; redação final em
nov–dez; banca em dez.

## Dívidas conhecidas do schema

Achados ao cruzar `schema.sql` com os requisitos. Não foram corrigidos ainda;
discuta com o Daniel antes de mexer:

- **`turma.horario` e `aula.horario` são `VARCHAR`**, texto livre. RF04 pede
  agendamento — com horário em texto não dá para detectar conflito de agenda nem
  ordenar. Provavelmente precisam virar `TIME`/`TIMESTAMP`.
- **`arquivo` não tem `aluno_id`.** RF07 fala em arquivo vinculado a turma **ou
  aluno**, e RF08 em áudio enviado pelo aluno. Hoje só existe `usuario_id` (quem
  enviou) e `turma_id`.
- **RF01 e RF02 pedem exclusão**, mas as chaves estrangeiras impedem apagar um
  aluno que já tem matrícula ou frequência. O caminho usual é exclusão lógica (uma
  coluna `ativo BOOLEAN`) em vez de `DELETE`.
- Nenhuma tabela tem coluna de data de criação.
