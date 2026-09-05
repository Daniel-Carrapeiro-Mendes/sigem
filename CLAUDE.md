# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

SIGEM (Sistema de Gestão para Escolas de Música) é o TCC do Daniel Carrapeiro
Mendes e da Anita Felício dos Santos, na Fatec Ourinhos (ADS). Orientador:
Prof. Me. João Maurício Hypolito.

Estado do código: o schema está aplicado no banco e as rotas de `/api/alunos` e
`/api/professores` estão registradas, mas ainda vazias. RF01 e RF02 são o sprint
em andamento; nada de RF03 a RF08 existe.

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
└── TG-SIGEM.pdf             <- o TCC: metodologia, escopo, cronograma
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
`backend/src/config/schema.sql` e é aplicado à mão:

```bash
psql -U postgres -d sigem_db -f src/config/schema.sql   # a partir de backend/
psql -U postgres -d sigem_db -c '\dt'                   # conferir: 9 tabelas
```

O arquivo só tem `CREATE TABLE`, nunca `DROP` — para não apagar o banco de quem
rodar por engano. Se o schema mudar, o `.sql` muda junto e alguém precisa aplicar
a diferença manualmente. **Recriar as tabelas exige `DROP`, que apaga dados:
pergunte ao Daniel antes.**

**Frontend**: sem build, sem bundler, sem npm. Abrir `sigem/frontend/index.html`
direto no navegador ou pelo Live Server do VS Code.

## Arquitetura

Fluxo de uma requisição, ponta a ponta:

`frontend/js/main.js` faz `fetch` para `http://localhost:3000/api/...` (a URL da
API está hardcoded na constante `API_URL`, linha 3) → `backend/src/server.js`
aplica `cors()` e `express.json()`, então delega o prefixo `/api` para um router
→ o router em `backend/src/routes/` trata a rota → o controller em
`backend/src/controllers/` contém a lógica → o acesso ao banco usa o pool
exportado por `backend/src/config/db.js`.

Pontos que só se percebem lendo vários arquivos juntos:

- **`db.js` exporta um `Pool` único**, compartilhado por todo o processo. Sempre
  importe esse módulo; nunca crie um `new Pool` novo dentro de uma rota.
- **Cada nova área vira 3 arquivos**: uma rota em `routes/`, um controller em
  `controllers/`, e uma tela no frontend. O `health.routes.js` mistura rota e
  lógica de propósito, por ser só um teste — não copie esse padrão.
- **Registrar a rota é um passo manual** em `server.js` (não há autoload). As
  rotas de alunos e professores já foram registradas de antemão, de propósito:
  assim as duas pessoas da equipe nunca precisam editar o `server.js` ao mesmo
  tempo. Ao criar uma área nova, siga a mesma ideia.
- **`backend/src/utils/validacao.js` guarda as regras de validação** de todos os
  cadastros. Validação no navegador é conforto; a do servidor é a que vale, porque
  um `curl` passa por cima do formulário. Nunca valide só no frontend.
- **`frontend/css/style.css` é compartilhado por todas as telas** pelo mesmo
  motivo. Classes genéricas (`.cartao`, `.campo`, `.tabela-wrapper`, `.mensagem`)
  vivem lá; evite estilo solto dentro do HTML de uma tela.
- **`bcrypt` e `jsonwebtoken` já estão instalados mas não são usados em lugar
  nenhum ainda.** Autenticação é trabalho futuro: `usuario.senha_hash` guarda o
  hash do bcrypt e `JWT_SECRET` está no `.env` esperando uso.
- **`bcrypt` compila código nativo na instalação.** O `package.json` tem um campo
  `allowScripts` por causa disso. Se o `npm install` quebrar, é aí.

### Modelo de dados

`usuario` é a tabela central e carrega o `perfil` (`admin` | `professor` | `aluno`,
garantido por CHECK) e a coluna `ativo`. `professor` e `aluno` são tabelas satélite
que apontam para `usuario` (com `UNIQUE` no `usuario_id`) — dados de perfil ficam
separados dos dados de login.

**Exclusão é lógica, nunca `DELETE`.** RF01 e RF02 pedem excluir aluno e professor,
mas as chaves estrangeiras de `matricula` e `frequencia` bloqueiam. Excluir =
`UPDATE usuario SET ativo = false`. Toda listagem filtra por `ativo = true`. O
controle fica só em `usuario`, um lugar só.

`curso` → `turma` (que junta um curso e um professor) → `aula`.
`matricula` é a tabela de ligação muitos-para-muitos entre `turma` e `aluno`, com
chave primária composta. `frequencia` liga `aula` + `aluno` com um booleano.

Horários são colunas tipadas, não texto: `turma` tem `dia_semana` (0=domingo a
6=sábado) + `hora_inicio` + `hora_fim`; `aula` tem `data` + `hora_inicio` +
`hora_fim`. É o que torna o RF04 possível — dá para ordenar e detectar choque de
agenda do mesmo professor.

`arquivo` guarda só o `caminho` no disco, não o binário, mais o `nome_original`
para o download sair legível. `turma_id` e `aluno_id` são os dois opcionais: RF07
preenche um ou outro, RF08 preenche `aluno_id`.

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

## Documentação que precisa ser mantida

Além deste arquivo, dois documentos são atualizados **na mesma tarefa** em que o
código muda:

- **`ARQUITETURA.md`** — o que o sistema é: tabela de arquivos na ordem de
  execução, caminho de uma requisição, decisões de estrutura.
- **`GUIA-DA-BANCA.md`** — por que o sistema é assim, em formato de pergunta e
  resposta. Toda decisão técnica não óbvia (escolha entre abordagens, contorno de
  limitação, regra de validação, decisão de segurança) vira uma entrada lá.
  Serve para o Daniel estudar e para defender o TCC.

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
