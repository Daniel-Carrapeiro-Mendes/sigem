# Arquitetura do SIGEM

Sistema web de gestão para escolas de música. TCC de Anita Felício dos Santos e
Daniel Carrapeiro Mendes — Fatec Ourinhos, ADS.

Estado atual: esqueleto validado. Só a rota de health check existe. O escopo é o
MVP definido na Seção 4 do TCC: RF01 a RF08.

## Arquivos, na ordem em que o código executa

| Arquivo | O que faz | Quem chama |
|---|---|---|
| `frontend/index.html` | Página única com o botão de teste; carrega o CSS e o JS. | O navegador (aberto à mão ou pelo Live Server). |
| `frontend/css/style.css` | Estilo da página: paleta escura no cabeçalho e botão. | `index.html`, via `<link>`. |
| `frontend/js/main.js` | Faz `fetch` na API e escreve o resultado na tela; a URL do backend está fixa na constante `API_URL`. | `index.html`, via `<script>`. |
| `backend/package.json` | Declara as dependências e os scripts `dev` (nodemon) e `start`. | O `npm`. |
| `backend/.env.example` | Modelo das variáveis de ambiente, sem valores reais. | Copiado à mão para `.env`. |
| `backend/src/server.js` | Cria o app Express, liga `cors` e `express.json`, registra os routers sob `/api` e sobe o servidor na porta do `.env`. | `npm run dev` / `npm start`. |
| `backend/src/routes/health.routes.js` | Duas rotas de diagnóstico: `/api/health` (API viva) e `/api/health/db` (banco responde). | `server.js`, via `app.use('/api', ...)`. |
| `backend/src/config/db.js` | Cria o pool de conexões do PostgreSQL a partir do `.env` e exporta ele pronto para uso. | Qualquer arquivo que precise consultar o banco; hoje só o `health.routes.js`. |
| `backend/src/config/schema.sql` | Script de criação das nove tabelas do sistema. | Ninguém, no código. É rodado à mão no pgAdmin4. |
| `backend/src/controllers/` | Pasta vazia. É onde a lógica de cada funcionalidade vai morar. | Será chamada pelos arquivos de `routes/`. |

## Como as peças se conectam

O usuário abre `frontend/index.html` no navegador. Não há servidor de frontend nem
build: o HTML carrega o CSS e o `main.js` direto do disco. Ao clicar no botão, o
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

## Pendências de modelagem

O `schema.sql` foi escrito antes da versão final dos requisitos. Três pontos ainda
não batem com o que o TCC pede:

1. **Horário como texto.** `turma.horario` e `aula.horario` são `VARCHAR`. RF04
   pede agendamento; com texto livre não é possível ordenar por horário nem
   detectar duas aulas marcadas no mesmo momento para o mesmo professor.
2. **`arquivo` só aponta para turma.** RF07 fala em vincular arquivo a turma *ou
   aluno* e RF08 em áudio enviado pelo aluno. Falta uma referência opcional a
   `aluno`.
3. **Exclusão.** RF01 e RF02 pedem excluir aluno e professor, mas as chaves
   estrangeiras de `matricula` e `frequencia` bloqueiam o `DELETE` de quem já tem
   histórico. O caminho normal é exclusão lógica: uma coluna `ativo BOOLEAN` que
   esconde o registro sem apagar o histórico.

## Fora do escopo

O TCC registra como trabalhos futuros, explicitamente fora da versão inicial:
grupos musicais, controle de salas, módulo financeiro, empréstimo de instrumentos
e integração com plataformas de EAD. Não há tabela nem código para nada disso, e
não deve haver.
