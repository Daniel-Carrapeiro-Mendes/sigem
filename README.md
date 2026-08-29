# SIGEM - Sistema de Gestao para Escolas de Musica

Esqueleto inicial do projeto, baseado na stack definida no TCC:
Node.js + Express (backend), PostgreSQL (banco), HTML/CSS/JS puro (frontend).

## Estrutura de pastas

```
sigem/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          -> conexao com o PostgreSQL
│   │   │   └── schema.sql     -> script de criacao das tabelas
│   │   ├── controllers/       -> logica de cada funcionalidade (RF01 a RF08)
│   │   ├── routes/
│   │   │   └── health.routes.js -> rota de teste
│   │   └── server.js          -> arquivo principal do backend
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/style.css
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

Crie as tabelas: abra o pgAdmin4, conecte no banco `sigem_db` (crie-o antes,
se ainda nao existir), abra a "Query Tool" e execute o conteudo do arquivo
`backend/src/config/schema.sql`.

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

Com o ambiente validado, o desenvolvimento de cada funcionalidade (RF01 a
RF08, conforme a Secao de Levantamento de Requisitos do TCC) deve seguir o
padrao:

1. Criar a rota em `backend/src/routes/`
2. Criar o controller correspondente em `backend/src/controllers/`
3. Criar a tela correspondente no frontend (`frontend/`), com base no
   wireframe feito no Figma
