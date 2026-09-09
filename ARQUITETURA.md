# Arquitetura do SIGEM

Sistema web de gestão para escolas de música. TCC de Anita Felício dos Santos e
Daniel Carrapeiro Mendes — Fatec Ourinhos, ADS.

Estado atual: schema aplicado no banco, rotas de alunos e professores registradas
e ainda vazias. O escopo é o MVP definido na Seção 4 do TCC: RF01 a RF08.

## Arquivos, na ordem em que o código executa

| Arquivo | O que faz | Quem chama |
|---|---|---|
| `frontend/index.html` | Página inicial: menu de navegação e o cartão de diagnóstico do ambiente. | O navegador, servido pelo próprio backend em `http://localhost:3000/`. |
| `frontend/alunos.html` | Tela de alunos: formulário que serve para cadastrar e editar, e tabela da listagem. | O navegador, pelo menu. |
| `frontend/js/alunos.js` | Chama a API de alunos e monta a tabela; monta as células com `textContent` para não executar HTML vindo do banco. | `alunos.html`. |
| `frontend/css/style.css` | Estilo de **todas** as telas. Classes genéricas (`.cartao`, `.campo`, `.tabela-wrapper`, `.mensagem`) para que ninguém precise escrever CSS solto por tela. | Todas as páginas, via `<link>`. |
| `frontend/js/main.js` | Faz `fetch` na API e escreve o resultado na tela; a URL do backend está fixa na constante `API_URL`. | `index.html`, via `<script>`. |
| `backend/package.json` | Declara as dependências e os scripts `dev` (nodemon) e `start`. | O `npm`. |
| `backend/.env.example` | Modelo das variáveis de ambiente, sem valores reais. | Copiado à mão para `.env`. |
| `backend/src/server.js` | Cria o app Express, liga `cors` e `express.json`, **serve a pasta `frontend/` como arquivos estáticos**, registra os routers sob `/api` e sobe o servidor na porta do `.env`. | `npm run dev` / `npm start`. |
| `backend/src/routes/health.routes.js` | Duas rotas de diagnóstico: `/api/health` (API viva) e `/api/health/db` (banco responde). | `server.js`, via `app.use('/api', ...)`. |
| `backend/src/routes/aluno.routes.js` | Liga os cinco caminhos de `/api/alunos` (RF01) às funções do controller. | `server.js`. |
| `backend/src/controllers/aluno.controller.js` | CRUD de alunos (RF01): grava em `usuario` + `aluno` numa transação, faz o hash da senha e exclui de forma lógica. | `aluno.routes.js`. |
| `backend/src/routes/professor.routes.js` | Rotas de `/api/professores` (RF02). Ainda vazio. | `server.js`. |
| `backend/src/controllers/professor.controller.js` | Lógica do cadastro de professores (RF02). Ainda vazio. | `professor.routes.js`. |
| `backend/src/utils/validacao.js` | Regras de validação de nome, e-mail, senha e data, compartilhadas por todos os cadastros. Criado antes do desenvolvimento paralelo para não virar ponto de conflito. | Os controllers. |
| `backend/src/config/db.js` | Cria o pool de conexões do PostgreSQL a partir do `.env` e exporta ele pronto para uso. | Qualquer arquivo que precise consultar o banco; hoje só o `health.routes.js`. |
| `backend/src/config/schema.sql` | Script de criação das nove tabelas. Só `CREATE`, nunca `DROP`. | Ninguém, no código. Rodado à mão com `psql -f`. |


## Como as peças se conectam

O usuário abre `http://localhost:3000/` no navegador. O próprio backend entrega o
HTML: `express.static` serve a pasta `frontend/` inteira, então qualquer arquivo
dentro dela responde por HTTP sem precisar de rota escrita à mão. Não há build —
o HTML carrega o CSS e o `main.js` como arquivos comuns. Ao clicar no botão, o
`main.js` dispara um `fetch` para `http://localhost:3000/api/health/db`.

Do outro lado, `server.js` já está rodando. Ele passa a requisição por dois
middlewares (funções que rodam antes da rota): o `cors`, que autoriza o navegador a
chamar um endereço diferente do da página, e o `express.json`, que transforma corpo
de requisição JSON em objeto JavaScript. Depois, o Express procura qual router
responde pelo caminho — tudo que começa com `/api` cai no `health.routes.js`.

A rota `/health/db` pega o pool exportado por `db.js` e roda um `SELECT NOW()`. O
pool (um conjunto de conexões abertas e reaproveitadas) já foi criado quando o
servidor subiu, então a consulta não precisa abrir conexão nova. O resultado volta
como JSON, o `main.js` lê o campo `status` e pinta o texto de verde ou vermelho.

Quando as funcionalidades reais entrarem, a diferença é uma camada a mais: o router
não vai mais consultar o banco direto, vai chamar um controller em `controllers/`,
e o controller é que usa o pool.

## Decisões

**Node.js + Express, PostgreSQL, HTML/CSS/JS puro.** É a stack fixada no TCC. O
frontend sem framework é escolha deliberada: menos coisa para aprender ao mesmo
tempo e nenhum passo de build entre salvar o arquivo e ver o resultado.

**Pasta `config/` separada de `routes/`.** `db.js` e `schema.sql` não são
funcionalidade, são infraestrutura. Ficam juntos para que trocar de banco ou mexer
no schema não obrigue a caçar arquivo no meio das rotas.

**Um pool só, exportado de `db.js`.** É a forma recomendada pelo driver `pg`. Abrir
e fechar conexão a cada requisição é lento e estoura o limite de conexões do
PostgreSQL sob carga.

**Rota e controller separados.** No `health.routes.js` a lógica está dentro da rota
porque é um teste de três linhas. Para as funcionalidades reais, a rota só diz
"esse caminho chama essa função" e o controller carrega a lógica — assim a lógica
pode ser lida e testada sem passar por HTTP.

**Sem migrations.** O `schema.sql` é aplicado à mão no pgAdmin4. É simples enquanto
o banco é de desenvolvimento e existe uma cópia só. O preço: toda alteração de
tabela precisa ser rodada manualmente, e não há histórico de mudanças do schema.

**`bcrypt` e `jsonwebtoken` instalados antes do uso.** A tabela `usuario` já prevê
`senha_hash` e o `.env` já prevê `JWT_SECRET`; as bibliotecas ficaram declaradas
para que o login não exija mexer em dependência depois. `bcrypt` compila código
nativo na instalação — daí o campo `allowScripts` no `package.json`.

**`arquivo` guarda caminho, não o binário.** Áudio em coluna de banco incha o dump
e deixa o backup lento. O arquivo vai para o disco, o banco guarda onde ele está.

**Frontend servido pelo próprio backend, via `express.static`.** Antes, a tela era
aberta direto do disco (`file://...`) enquanto a API rodava em `localhost:3000` —
dois endereços diferentes para a mesma aplicação, e `localhost:3000` sozinho
respondia "Cannot GET /". Servindo os dois do mesmo processo, um endereço só abre
o sistema inteiro. O `cors()` continua no código: ele segue necessário para o dia
em que o frontend for aberto de outro endereço (por exemplo, publicado num
serviço separado do backend).

## O que cada requisito vai encostar

Mapa entre os requisitos do TCC e as peças do código, para saber onde mexer.

| Requisito | Tabelas | Arquivos que vão nascer |
|---|---|---|
| RF01 — CRUD de alunos | `usuario`, `aluno` | `routes/aluno.routes.js`, `controllers/aluno.controller.js`, tela no frontend |
| RF02 — CRUD de professores | `usuario`, `professor` | `routes/professor.routes.js`, controller e tela |
| RF03 — turmas e cursos | `curso`, `turma`, `matricula` | rotas e controllers de curso e turma; a matrícula é o que liga aluno à turma |
| RF04 — agendamento de aulas | `aula` | `routes/aula.routes.js`, controller e tela de agenda |
| RF05 — frequência | `frequencia` | rota e controller de frequência, ligados à tela da aula |
| RF06 — autenticação e perfis | `usuario.perfil` | `routes/auth.routes.js`, um middleware de autenticação, uso de `bcrypt` e `jsonwebtoken` |
| RF07 e RF08 — envio de arquivos | `arquivo` | rota de upload, controller, e uma pasta de destino no disco |

RF06 é pré-requisito prático dos outros: sem saber quem está logado, não dá para
decidir o que cada perfil pode ver. Mas ele não precisa vir primeiro no
desenvolvimento — dá para construir os CRUDs abertos e proteger as rotas depois,
o que costuma ser mais fácil de dividir entre duas pessoas.

## Decisões de modelagem que já estão no schema

Três pontos foram corrigidos antes da primeira execução do `schema.sql`, enquanto
o banco ainda estava vazio e a mudança era gratuita:

1. **Exclusão é lógica.** `usuario.ativo` existe porque RF01 e RF02 pedem excluir
   aluno e professor, mas as chaves estrangeiras de `matricula` e `frequencia`
   bloqueiam o `DELETE` de quem tem histórico. Excluir vira
   `UPDATE usuario SET ativo = false`, e toda listagem filtra por `ativo = true`.
   O controle mora só em `usuario` — `aluno` e `professor` não repetem a coluna.
2. **Horário é coluna tipada, não texto.** `turma` guarda `dia_semana` +
   `hora_inicio` + `hora_fim`; `aula` guarda `data` + `hora_inicio` + `hora_fim`.
   Com `VARCHAR` seria impossível ordenar por horário ou descobrir que o mesmo
   professor foi marcado em duas aulas ao mesmo tempo, que é o coração do RF04.
3. **`arquivo` aponta para turma e para aluno**, ambos opcionais. RF07 vincula o
   arquivo do professor a uma turma *ou* a um aluno; RF08 é áudio do próprio
   aluno. `nome_original` existe para o download sair com nome legível.

## Fora do escopo

O TCC registra como trabalhos futuros, explicitamente fora da versão inicial:
grupos musicais, controle de salas, módulo financeiro, empréstimo de instrumentos
e integração com plataformas de EAD. Não há tabela nem código para nada disso, e
não deve haver.
