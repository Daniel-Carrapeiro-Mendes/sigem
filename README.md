# SIGEM - Sistema de Gestao para Escolas de Musica

Esqueleto inicial do projeto, baseado na stack definida no TCC:
Node.js + Express (backend), PostgreSQL (banco), HTML/CSS/JS puro (frontend).

## Estrutura de pastas

```
sigem/
├── ARQUITETURA.md             -> como as pecas se conectam e por que
├── CLAUDE.md                  -> guia do projeto para o Claude Code
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          -> conexao com o PostgreSQL
│   │   │   └── schema.sql     -> script de criacao das tabelas
│   │   ├── controllers/       -> logica de cada funcionalidade (RF01 a RF08)
│   │   ├── routes/            -> health, alunos, professores
│   │   └── server.js          -> arquivo principal do backend
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html             -> pagina inicial e menu
    ├── css/style.css          -> estilo de todas as telas
    └── js/main.js
```

## Como rodar pela primeira vez

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Abra o arquivo `.env` e preencha `DB_PASSWORD` com a senha que voce definiu
na instalacao do PostgreSQL.

Crie o banco `sigem_db`, se ainda nao existir, e rode o script das tabelas:

```bash
psql -U postgres -d sigem_db -f src/config/schema.sql
```

Ele vai pedir a senha do PostgreSQL. Para conferir que deu certo:

```bash
psql -U postgres -d sigem_db -c '\dt'
```

Devem aparecer 9 tabelas. O pgAdmin4 continua util para *olhar* os dados.

O `schema.sql` so tem `CREATE TABLE`, nunca `DROP` - assim ninguem apaga o banco
sem querer. Se precisar recriar as tabelas do zero, os `DROP` sao feitos a mao.

Suba o servidor:

```bash
npm run dev
```

Se tudo estiver certo, o terminal vai mostrar:
`Servidor do SIGEM rodando em http://localhost:3000`

Teste no navegador: `http://localhost:3000/api/health` deve retornar um JSON
com `"status": "ok"`. Depois teste `http://localhost:3000/api/health/db` -
se retornar o horario do banco, a conexao com o PostgreSQL esta funcionando.

### 2. Frontend

Nao precisa de instalacao. Basta abrir o arquivo `frontend/index.html` no
navegador (ou usar a extensao "Live Server" do VS Code, botao direito no
arquivo -> "Open with Live Server").

Com o backend rodando, clique no botao "Testar conexao com a API" na pagina -
se aparecer o horario do banco em verde, o ambiente inteiro (frontend +
backend + banco) esta funcionando de ponta a ponta.

## Proximos passos

Com o ambiente validado, o desenvolvimento de cada funcionalidade (RF01 a RF08,
conforme a Secao 4 do TCC) segue o padrao:

1. Criar a rota em `backend/src/routes/`
2. Criar o controller correspondente em `backend/src/controllers/`
3. Criar a tela correspondente no frontend (`frontend/`), com base no
   wireframe feito no Figma
