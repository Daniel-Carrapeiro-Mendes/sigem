# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui, da mais
recente para a mais antiga.

## [0.1.0] - 2026-09-09

Primeira versão numerada do projeto. Reúne tudo que foi construído desde a
estrutura inicial até aqui.

### Adicionado
- Estrutura inicial do projeto: backend em Node.js e Express, frontend em
  HTML, CSS e JavaScript puro, conexão com PostgreSQL.
- Cadastro de alunos (RF01): cadastrar, editar, listar e excluir. A exclusão
  preserva o histórico acadêmico em vez de apagar o registro.
- Validação de cadastro no servidor: nome, e-mail, senha e data de nascimento.
- O backend passou a servir também as telas do frontend: o sistema inteiro
  abre em um endereço só, http://localhost:3000/.
- Documentação do projeto: ARQUITETURA.md, GUIA-DA-BANCA.md e ROADMAP.md.
- Número da versão no rodapé de cada tela, com este changelog disponível ao
  clicar nele.
