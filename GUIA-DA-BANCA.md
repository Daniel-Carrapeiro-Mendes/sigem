# Guia da banca — SIGEM

As perguntas que a banca provavelmente vai fazer, com a resposta já formulada e
ancorada no código que existe de verdade. Serve também como material de estudo:
o `ARQUITETURA.md` descreve **o que** o sistema é, este arquivo explica **por
quê**.

Mantido junto com o código. Toda decisão técnica não óbvia vira uma entrada aqui,
na mesma tarefa em que é tomada.

---

## 1. Escopo e metodologia

### "Por que vocês escolheram o Scrum sendo apenas duas pessoas?"

Porque nenhum requisito estava fechado quando o desenvolvimento começou. O Scrum
permite entregar em incrementos e ajustar prioridade no caminho, sem exigir o
levantamento completo antes da primeira linha de código.

Ele foi aplicado de forma **adaptada**, e isso está declarado no TCC: não há
Scrum Master dedicado (a responsabilidade é dividida entre os dois integrantes),
e as reuniões diárias viraram alinhamentos assíncronos. Um quadro Kanban dá a
visão do fluxo de tarefas.

**Se perguntarem "então vocês não usam Scrum de verdade":** a resposta honesta é
que se usa o núcleo (backlog priorizado, sprints curtos, review e retrospectiva)
e se descarta o que pressupõe um time maior. Fingir cerimônias que não acontecem
seria pior.

### "Por que esse escopo e não um sistema completo?"

A equipe caiu de três para dois integrantes, ambos com tempo reduzido. Em vez de
prometer tudo e entregar pela metade, foi delimitado um MVP (escopo mínimo
viável) com RF01 a RF08, e o resto foi registrado explicitamente como trabalho
futuro na Subseção 4.3: grupos musicais, controle de salas, módulo financeiro,
empréstimo de instrumentos e integração com EAD.

**Ponto forte a destacar:** essa lista existe no documento. Não é escopo que
ficou faltando, é escopo que foi conscientemente adiado.

### "Como o trabalho foi dividido entre vocês dois?"

Por funcionalidade, não por camada. Cada integrante desenvolve um requisito
inteiro — do banco até a tela. RF01 (alunos) e RF02 (professores) foram feitos em
paralelo, em arquivos que não se cruzam.

O motivo é acadêmico, não só prático: dividir por camada ("um faz backend, outro
faz frontend") faria com que cada um dominasse metade do sistema. Dividindo por
funcionalidade, os dois entendem a aplicação inteira — que é o que a banca cobra
de ambos.

---

## 2. Arquitetura

### "Descreva o caminho de uma requisição."

O navegador abre `frontend/alunos.html`, que carrega `js/alunos.js`. Esse arquivo
faz um `fetch` para `http://localhost:3000/api/alunos`.

No servidor, `backend/src/server.js` recebe a requisição e passa por dois
middlewares: `cors()`, que autoriza o navegador a chamar um endereço diferente do
da página, e `express.json()`, que converte o corpo JSON em objeto JavaScript.

O Express então escolhe o router pelo caminho: `/api/alunos` cai em
`routes/aluno.routes.js`, que só liga o caminho à função. A lógica está em
`controllers/aluno.controller.js`, que usa o pool de conexões exportado por
`config/db.js` para falar com o PostgreSQL. A resposta volta em JSON e o
`alunos.js` monta a tabela na tela.

### "Por que separar rota de controller, se é a mesma coisa?"

Para que a lógica possa ser lida e testada sem passar por HTTP. O arquivo de rota
vira um índice: bate o olho e se sabe quais endereços existem. O controller
concentra o que realmente acontece.

**Contraexemplo assumido no próprio código:** `health.routes.js` mistura as duas
coisas, porque é uma rota de diagnóstico de três linhas. Está comentado no
arquivo que ela não deve ser usada como modelo.

### "Por que um pool de conexões e não uma conexão por requisição?"

Abrir e fechar uma conexão com o PostgreSQL é caro e o banco tem um limite de
conexões simultâneas. O pool mantém um conjunto de conexões abertas e as
reaproveita. É a forma recomendada pelo driver `pg`.

`config/db.js` exporta **um** pool para todo o processo. Criar um `new Pool` novo
dentro de uma rota anularia o benefício.

**Detalhe que vale citar:** no cadastro, `pool.connect()` reserva uma conexão
específica, e o `client.release()` no bloco `finally` a devolve. Sem esse
`release`, o pool esgota e a API trava depois de algumas requisições.

### "Por que frontend sem framework?"

É requisito não funcional do próprio trabalho (RNF02), justificado por leveza,
simplicidade e controle direto da interface. Na prática também significa nenhum
passo de build: salvou o arquivo, recarregou o navegador.

**Se perguntarem se isso não é um retrocesso:** para o tamanho deste sistema, um
framework adicionaria dependências, tempo de configuração e uma camada a mais
para explicar, sem resolver nenhum problema que o projeto tenha.

---

## 3. Banco de dados

### "Por que separar `usuario` de `aluno` e `professor`?"

Porque dados de autenticação e dados de perfil mudam por motivos diferentes.
`usuario` guarda o que todo mundo tem (nome, e-mail, senha, perfil, situação
ativa). `aluno` guarda `data_nascimento`; `professor` guarda `especialidade`.

Isso significa que o RF06 (autenticação) consulta **uma** tabela, independente do
perfil de quem está entrando. Se os três fossem tabelas separadas e completas, o
login teria que procurar em três lugares.

Os dois satélites têm `UNIQUE` em `usuario_id`: um usuário não pode virar dois
alunos.

### "Por que a exclusão não apaga o registro?"

Duas razões, e a segunda é a que importa.

A técnica: as chaves estrangeiras de `matricula` e `frequencia` apontam para
`aluno`. Um `DELETE` em quem já tem histórico é recusado pelo banco.

A real: apagar destruiria o histórico acadêmico. Se a frequência de um semestre
inteiro referencia um aluno, apagar esse aluno significaria perder o registro de
quem esteve naquelas aulas.

A solução é a **exclusão lógica**: `UPDATE usuario SET ativo = false`. O registro
some das listagens (toda consulta filtra `WHERE u.ativo = true`) e o histórico
continua íntegro. A coluna `ativo` fica só em `usuario` — um lugar só para
controlar, sem risco de `aluno` e `usuario` discordarem.

### "Por que o horário não é um campo de texto?"

Era, na primeira versão do schema, e foi corrigido antes de qualquer dado entrar.

`turma` guarda `dia_semana` (0 = domingo a 6 = sábado), `hora_inicio` e
`hora_fim`; `aula` guarda `data`, `hora_inicio` e `hora_fim`. Com `VARCHAR`, o
banco não conseguiria ordenar por horário nem responder "este professor já tem
aula marcada neste intervalo?" — que é exatamente o que o RF04 (agendamento)
precisa.

**Pergunta provável de acompanhamento — "como vocês perceberam?"** Ao cruzar o
`schema.sql`, escrito antes, com os requisitos finais da Seção 4. O banco ainda
estava vazio, então a correção não custou migração nenhuma.

### "Por que o arquivo de áudio não é salvo no banco?"

A tabela `arquivo` guarda o `caminho` no disco e o `nome_original`, não o
binário. Áudio dentro de coluna faria o dump do banco crescer sem controle e
deixaria todo backup lento. O banco fica com os metadados, o disco com os
arquivos.

`turma_id` e `aluno_id` são ambos opcionais porque cada requisito preenche um:
RF07 (professor enviando) vincula a uma turma ou a um aluno; RF08 (aluno enviando
sua prática) vincula ao aluno.

### "Por que não há sistema de migrations?"

Escolha consciente de simplicidade. O `schema.sql` é aplicado com
`psql -f`, e ele contém **apenas** `CREATE TABLE`, nunca `DROP` — assim ninguém
apaga o banco por engano ao rodar o arquivo.

**A limitação, dita antes que perguntem:** não há histórico versionado de
alterações do schema, e cada mudança precisa ser aplicada manualmente em cada
máquina. Para uma equipe de dois e um banco de desenvolvimento, o custo de uma
ferramenta de migration não se pagaria. Em produção com dados reais, se pagaria.

---

## 4. Segurança

### "Como as senhas são armazenadas?"

Nunca em texto. A coluna se chama `senha_hash` justamente para deixar isso
explícito. O `bcrypt` gera um hash irreversível com custo 10 — dez rodadas de
embaralhamento, o padrão recomendado: alto o bastante para atrapalhar quem tenta
adivinhar por força bruta, baixo o bastante para o cadastro não demorar.

Conferindo no banco, o valor começa com `$2b$10$` — `2b` é a versão do bcrypt e
`10` é o custo.

**Nenhuma consulta devolve o `senha_hash`.** As colunas são listadas uma a uma
nos `SELECT`, sem `SELECT *`, exatamente para que uma coluna nova não vaze por
acidente no futuro.

### "Como o sistema se protege de SQL Injection?"

Toda consulta usa parâmetros (`$1`, `$2`), nunca concatenação de string. O driver
`pg` envia o comando e os valores separadamente, então o banco jamais interpreta
o que o usuário digitou como parte do comando SQL.

Um nome como `'; DROP TABLE usuario; --` é gravado como texto literal, não
executado.

### "Vocês validam os dados só no formulário?"

Não, e essa distinção é importante: **validar no navegador é conforto, validar no
servidor é segurança.** O HTML com `type="email"`, `minlength` e `min`/`max`
ajuda o usuário a errar menos, mas qualquer pessoa manda uma requisição direto na
API com `curl` e passa por cima disso.

Por isso `backend/src/utils/validacao.js` repete todas as regras no servidor:
nome com pelo menos uma letra, formato de e-mail, senha de no mínimo 8
caracteres, data de nascimento nem no futuro nem além de 120 anos atrás.

### "Por que o nome aceita números?"

Decisão deliberada. Proibir dígitos em nome recusaria nomes legítimos ("Maria
2ª", sufixos de geração) e é um erro clássico de validação. O que se quer barrar
é `123456` como nome — e a regra usada é **exigir pelo menos uma letra**, o que
resolve o caso real sem criar o problema novo.

A expressão usada é `\p{L}`, que casa com letra de qualquer alfabeto, incluindo
acentuadas.

### "As rotas estão protegidas?"

**Ainda não, e isso é conhecido.** RF01 e RF02 foram construídos com as rotas
abertas. O RF06 (autenticação com perfis) entra depois e protege tudo de uma vez.

A justificativa da ordem: construir o middleware de autenticação antes de existir
qualquer tela para proteger significaria escrevê-lo às cegas. As peças que ele vai
usar já estão prontas no banco (`usuario.perfil`, `usuario.senha_hash`) e nas
dependências (`bcrypt`, `jsonwebtoken`, `JWT_SECRET` no `.env`).

### "Onde ficam as senhas de banco e as chaves?"

Em um arquivo `.env`, que está no `.gitignore` e nunca foi versionado. O
repositório tem um `.env.example` com os nomes das chaves e nenhum valor, para
que outra pessoa saiba o que precisa preencher.

---

## 5. Decisões que parecem estranhas até serem explicadas

### "Por que a data de nascimento é convertida para texto no SQL?"

Porque o PostgreSQL devolve `DATE` como um `Date` do JavaScript, e o `Date`
carrega fuso horário. Uma data gravada como `2005-03-11` chegava ao frontend como
`2005-03-11T03:00:00.000Z` e, dependendo do fuso, virava o dia anterior na tela.

A solução foi converter no próprio banco, com
`TO_CHAR(a.data_nascimento, 'YYYY-MM-DD')`. A data sai como texto e nenhuma
conversão de fuso acontece no caminho.

**É um bom exemplo para citar** de bug que só aparece testando, não lendo o
código.

### "Por que o cadastro usa transação?"

Um aluno vive em duas tabelas: `usuario` e `aluno`. São dois `INSERT`. Se o
segundo falhar, o primeiro não pode permanecer — sobraria um usuário sem aluno
correspondente, um registro órfão.

A transação (`BEGIN` … `COMMIT`, com `ROLLBACK` no erro) garante que ou as duas
escritas acontecem, ou nenhuma.

**Detalhe técnico que impressiona se perguntarem:** os comandos usam
`client.query`, de uma conexão reservada com `pool.connect()`, e não
`pool.query`. Com `pool.query`, cada comando poderia sair por uma conexão
diferente do pool, e o `BEGIN` não valeria para os comandos seguintes.

### "Por que os controllers de aluno e professor são quase iguais?"

Repetição consciente. Os dois foram desenvolvidos em paralelo por pessoas
diferentes; extrair a parte comum para um arquivo compartilhado obrigaria as duas
a editar o mesmo arquivo ao mesmo tempo.

O que **foi** compartilhado é o que precisa ser idêntico por definição: as regras
de validação, em `utils/validacao.js`. Se a regra de senha mudar, muda para os
dois de uma vez. Esse arquivo foi criado **antes** de o desenvolvimento paralelo
começar, justamente para não virar ponto de conflito.

### "Por que a interface monta a tabela com `textContent` e não `innerHTML`?"

Segurança. Com `innerHTML`, um aluno cadastrado com `<script>` no nome teria esse
código executado no navegador de quem abrisse a listagem — um ataque de XSS
(Cross-Site Scripting). `textContent` insere o valor como texto puro, sempre.

---

## 6. Limitações assumidas

Dizer isso antes de a banca perguntar é mais forte do que ser pego por elas.

| Limitação | Por que foi aceita |
|---|---|
| **O e-mail fica reservado após a exclusão.** Um aluno excluído continua ocupando o e-mail, e não é possível recadastrá-lo com o mesmo endereço. | A linha permanece no banco (exclusão lógica), então a restrição `UNIQUE` continua valendo. O sistema pelo menos explica o motivo na mensagem de erro. A solução completa seria uma função de reativar cadastro — registrada como melhoria futura. |
| **Não há testes automatizados.** | A verificação é manual, por `curl` e pelo navegador. Com duas pessoas e tempo reduzido, o esforço foi para funcionalidade. É a primeira dívida técnica a citar se perguntarem o que fariam com mais tempo. |
| **As rotas estão abertas.** | RF06 entra depois e protege todas de uma vez. |
| **A URL da API está fixa no código** (`http://localhost:3000/api`), em cada arquivo JS do frontend. | O sistema roda em ambiente de desenvolvimento. Publicar exigiria centralizar essa configuração. |
| **Não há paginação nas listagens.** | Uma escola de música tem dezenas ou centenas de alunos, não milhões. |
| **Não há registro de quem fez cada alteração** (log de auditoria). | Fora do escopo do MVP. |

---

## 7. Como demonstrar o sistema funcionando

Roteiro curto para a apresentação:

```bash
cd sigem/backend && npm run dev
```

1. Abrir `frontend/index.html` e clicar em **Testar conexao com a API** — prova
   que os três níveis (tela, servidor, banco) estão conversando.
2. Ir em **Alunos**, cadastrar um aluno.
3. Tentar cadastrar outro com o mesmo e-mail — mostra a validação respondendo.
4. Editar e excluir o aluno.
5. Mostrar no banco que a linha **continua lá**, com `ativo = false`:

```bash
psql -U postgres -d sigem_db -c 'SELECT nome, email, ativo FROM usuario'
```

Esse último passo é o que prova a exclusão lógica, e é o mais fácil de explicar
para quem não é da área: "o aluno sai da lista, mas a escola não perde o
histórico dele".

Para mostrar que a validação não depende do navegador, um `curl` que passa por
cima do formulário e mesmo assim é recusado:

```bash
curl -X POST http://localhost:3000/api/alunos \
  -H 'Content-Type: application/json' \
  -d '{"nome":"123","email":"nao-e-email","senha":"123"}'
```
