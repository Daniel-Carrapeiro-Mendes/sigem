# Roadmap do SIGEM

Onde estamos e o que vem agora. Este arquivo responde três perguntas: **o que já
está pronto**, **o que pode ser começado hoje** e **o que está bloqueado esperando
outra coisa**.

Ele é organizado por **ordem de dependência**, não por data. A disponibilidade da
dupla varia muito de semana, então prazo fixo por etapa criaria atraso no papel
sem significar nada. A única data que importa está na seção "A linha de corte".

O cronograma por mês está na Seção 6 do TCC. Este documento é a outra metade: quem
faz o quê, e em que ordem.

---

## 1. Onde estamos

| Requisito | Situação | Com quem |
|---|---|---|
| **RF01** Cadastro de alunos | ✅ Pronto e na `main` | Daniel |
| **RF02** Cadastro de professores | 🔨 Em andamento | Anita |
| **RF03** Turmas e cursos | ⬜ Liberado para começar | — |
| **RF06** Autenticação e perfis | ⬜ Liberado para começar | — |
| **RF04** Agendamento de aulas | 🔒 Bloqueado pelo RF03 | — |
| **RF05** Frequência | 🔒 Bloqueado pelo RF04 | — |
| **RF07** Envio de arquivos (professor) | 🔒 Bloqueado por RF03 + RF06 | — |
| **RF08** Envio de áudio (aluno) | 🔒 Bloqueado pelo RF06 | — |

Atualizado em: 07/09/2026.

---

## 2. O mapa de dependências

Nenhuma dessas dependências é opinião. Cada uma existe porque há uma **chave
estrangeira** no `backend/src/config/schema.sql` — uma coluna que aponta para
outra tabela, e que o banco não deixa preencher com algo que não existe.

```
   RF01 alunos ────┬──────────────────────────────┐
                   │                              │
   RF02 professores┴──> RF03 turmas e cursos      │
                   │         │                    │
                   │         ├──> RF04 aulas ──> RF05 frequencia
                   │         │
                   └──> RF06 autenticacao         │
                             │                    │
                             ├──> RF07 arquivos <─┘
                             └──> RF08 audio
```

| Requisito | Só começa depois de | A chave estrangeira que obriga isso |
|---|---|---|
| RF03 turmas e cursos | RF01 + RF02 | `turma.professor_id → professor` e `matricula.aluno_id → aluno`. Sem aluno e professor cadastrados, não há o que associar. |
| RF06 autenticação | RF01 + RF02 | Nenhuma chave — precisa apenas de linhas em `usuario` para ter em quem fazer login. **Independente do RF03**, e é por isso que os dois correm em paralelo. |
| RF04 agendamento | RF03 | `aula.turma_id → turma`. Não existe aula solta: toda aula pertence a uma turma. |
| RF05 frequência | RF04 (e RF03) | `frequencia.aula_id → aula`. E é a `matricula` que diz quem deveria estar presente. |
| RF07 arquivos do professor | RF03 + RF06 | `arquivo.turma_id → turma`, e `arquivo.usuario_id` precisa saber quem está enviando — o que só a autenticação responde. |
| RF08 áudio do aluno | RF01 + RF06 | `arquivo.aluno_id → aluno`, mesma questão do `usuario_id`. |

**A leitura prática:** o RF03 e o RF06 são os dois gargalos. Enquanto os dois não
fecharem, nada dos quatro requisitos restantes pode começar de verdade.

---

## 3. As etapas, em ordem

Cada etapa tem duas frentes que rodam em paralelo e **não compartilham nenhum
arquivo**. É o que permite duas pessoas trabalharem ao mesmo tempo sem dar
conflito no Git.

### Etapa 1 — os dois cadastros base *(em andamento)*

| | Daniel | Anita |
|---|---|---|
| **Requisito** | RF01 alunos | RF02 professores |
| **Situação** | ✅ pronto | 🔨 em andamento |

**Pronto quando:** as duas telas cadastram, editam e excluem, e a exclusão deixa a
linha no banco com `ativo = false`.

---

### Etapa 2 — o gargalo duplo

| | Daniel | Anita |
|---|---|---|
| **Requisito** | RF06 autenticação e perfis | RF03 turmas e cursos |
| **Arquivos** | `routes/auth.routes.js`, `controllers/auth.controller.js`, `middlewares/autenticacao.js`, `frontend/login.html`, `frontend/js/login.js` | `routes/curso.routes.js` e `turma.routes.js`, os controllers correspondentes, `frontend/cursos.html` e `turmas.html`, mais os JS |

**Por que essa divisão:** o RF03 tem o mesmo formato do RF02 que a Anita acabou de
fazer — formulário, tabela, cinco endereços na API. Ela aproveita o embalo. O RF06
é território novo (token, middleware, sessão no navegador) e fica com quem
construiu a arquitetura. **É trocável:** se a Anita preferir a autenticação, basta
inverter, não muda mais nada no roadmap.

**A parte não óbvia do RF03:** a `matricula` não é um CRUD comum. Ela é a tabela
que liga turma e aluno, com chave primária composta pelos dois. Na tela, isso vira
"dentro da turma, adicionar e remover alunos" — não um cadastro separado.

**A parte não óbvia do RF06:** as peças já estão prontas esperando. A coluna
`usuario.senha_hash` já guarda o hash do bcrypt, `usuario.perfil` já tem os três
valores travados por CHECK, e `bcrypt`, `jsonwebtoken` e `JWT_SECRET` já estão
instalados e configurados. Falta só usar.

**Pronto quando:** dá para fazer login com um aluno cadastrado e receber um token;
e dá para criar uma turma associando um curso, um professor e alguns alunos.

---

### Etapa 3 — o que o gargalo destravou

| | Daniel | Anita |
|---|---|---|
| **Requisito** | RF04 agendamento de aulas | RF07 + RF08 envio de arquivos e áudio |
| **Arquivos** | `routes/aula.routes.js`, `controllers/aula.controller.js`, `frontend/agenda.html`, `frontend/js/agenda.js` | `routes/arquivo.routes.js`, `controllers/arquivo.controller.js`, uma pasta de destino no disco, `frontend/arquivos.html`, `frontend/js/arquivos.js` |

**O RF04 é o que justifica a modelagem do horário.** `turma` guarda `dia_semana`,
`hora_inicio` e `hora_fim`; `aula` guarda `data`, `hora_inicio` e `hora_fim`. Como
são colunas de tempo e não texto, dá para perguntar ao banco "esse professor já
tem aula nesse intervalo?".

**O RF07 e o RF08 são o diferencial do TCC.** O texto os descreve como o que
distingue este sistema de um sistema escolar genérico: o professor disponibiliza
gravações de referência, o aluno envia a gravação da própria prática. O arquivo
vai para o disco; o banco guarda `caminho`, `nome_original` e quem enviou.

**Pronto quando:** dá para marcar uma aula para uma turma; e um professor consegue
subir um áudio vinculado a uma turma, e um aluno consegue subir o dele.

---

### Etapa 4 — fechar o ciclo

| | Daniel | Anita |
|---|---|---|
| **Requisito** | RF05 frequência | Proteger as rotas antigas + acabamento |
| **Arquivos** | `routes/frequencia.routes.js`, `controllers/frequencia.controller.js`, tela de chamada | Ajustes em todos os `frontend/js/*.js` e nos arquivos de rota já existentes |

A segunda frente é a única dívida que a antecipação do RF06 cria: as telas de
aluno e professor foram escritas antes da autenticação existir, então precisam
passar a mandar o token. É um ajuste repetitivo, não difícil — e é bem menor agora
do que seria se a autenticação tivesse ficado para o fim, com seis telas prontas
em vez de duas.

**Pronto quando:** dá para abrir uma aula, marcar quem esteve presente, e nenhuma
rota da API responde sem token.

---

### Etapa 5 — preparar a entrega

Não é código novo. É o que transforma um sistema que funciona numa apresentação
que convence:

- **Dados de demonstração**: um conjunto realista de alunos, professores, cursos e
  turmas. Apresentar com banco vazio, cadastrando tudo ao vivo, gasta o tempo da
  banca e convida o erro.
- **Roteiro de testes**: percorrer os oito requisitos e anotar o que quebra.
- **Ensaio da apresentação**, com o roteiro da Seção 7 do `GUIA-DA-BANCA.md`.
- **Revisão final** do `ARQUITETURA.md` e do `GUIA-DA-BANCA.md` contra o código
  que realmente existe.

---

## 4. A linha de corte

**Todo o código precisa estar pronto no início de novembro.**

O cronograma do TCC reserva novembro e dezembro para integração, testes e redação
final, e a banca é em dezembro. Código escrito em novembro rouba tempo da escrita,
e a escrita não tem como ser cortada.

Traduzindo para as etapas: **as etapas 1 a 4 fecham em outubro.** A etapa 5 e a
redação final dividem novembro.

---

## 5. Se apertar, o que corta

O princípio, antes da lista: **os oito requisitos estão escritos no documento do
TCC e não se cortam.** Prometer RF01 a RF08 e apresentar seis é uma falha de
entrega. O que se corta é **profundidade dentro de cada requisito** — o requisito
continua atendido, só que na versão simples.

Na ordem em que devem ser sacrificados:

1. **Polimento visual** além do que o RNF04 (responsivo) e o RNF05 (navegação
   simples) exigem. É o corte mais barato e o menos visível para a banca.
2. **Relatórios de frequência.** O RF05 pede "registro e controle" — marcar
   presença por aula atende. Totais por aluno e por período são extra.
3. **Detecção de choque de agenda** no RF04. O requisito pede permitir o
   agendamento, não impedir conflitos. O schema suporta a detecção, então
   implementar depois não custa mudança de banco — e dá uma boa resposta na banca:
   "está modelado, ficou como melhoria".
4. **Player de áudio na tela.** Um link para baixar o arquivo já cumpre RF07 e
   RF08. Tocar dentro da página é conforto.

**O que não entra nessa lista:** RF07 e RF08. O próprio TCC os descreve como o
diferencial do sistema. Cortá-los tira o que distingue o SIGEM de um sistema
escolar qualquer.

---

## 6. Sinais de que estamos atrasados

Gatilhos objetivos. Se algum acontecer, reduza o escopo pela lista da seção 5 em
vez de esperar melhorar sozinho:

- 🚩 A **Etapa 2 não fechou até o fim de setembro.** É a mais arriscada, porque
  destrava todas as outras.
- 🚩 **Qualquer etapa passou de três semanas.** Sinal de que ela era maior do que
  parecia, ou de que alguém está travado e não avisou.
- 🚩 **Chegou novembro** com qualquer coisa das etapas 1 a 4 em aberto.

---

## 7. Manutenção

Este arquivo é atualizado **na mesma tarefa** em que um requisito muda de estado —
a tabela da seção 1 e a data logo abaixo dela. Um roadmap desatualizado é pior que
nenhum, porque as pessoas tomam decisão em cima dele.

Os três documentos do repositório e o que cada um responde:

| Arquivo | Pergunta que responde |
|---|---|
| `ARQUITETURA.md` | O que o sistema é: quais arquivos, como uma requisição atravessa. |
| `GUIA-DA-BANCA.md` | Por que o sistema é assim, em pergunta e resposta. |
| `ROADMAP.md` | Onde estamos e o que vem agora. |

**Nota para o texto do TCC:** este roadmap antecipa a autenticação (RF06) para
antes do agendamento e da frequência. Se a Seção 6 do TCC descrever outra ordem,
os dois precisam ser reconciliados — o texto e o código não podem contar histórias
diferentes na hora da defesa.
