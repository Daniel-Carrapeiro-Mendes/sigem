-- Script inicial de criacao das tabelas do SIGEM
-- Baseado no diagrama de classes/ER ja validado no TCC
-- Rode este script no pgAdmin4 (Query Tool), conectado ao banco "sigem_db"

CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('admin', 'professor', 'aluno'))
);

CREATE TABLE professor (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  especialidade VARCHAR(150)
);

CREATE TABLE aluno (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  data_nascimento DATE
);

CREATE TABLE curso (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT
);

CREATE TABLE turma (
  id SERIAL PRIMARY KEY,
  curso_id INTEGER NOT NULL REFERENCES curso(id),
  professor_id INTEGER NOT NULL REFERENCES professor(id),
  nome VARCHAR(150) NOT NULL,
  horario VARCHAR(100)
);

-- Tabela de matricula: representa o relacionamento muitos-para-muitos entre turma e aluno
CREATE TABLE matricula (
  turma_id INTEGER NOT NULL REFERENCES turma(id),
  aluno_id INTEGER NOT NULL REFERENCES aluno(id),
  PRIMARY KEY (turma_id, aluno_id)
);

CREATE TABLE aula (
  id SERIAL PRIMARY KEY,
  turma_id INTEGER NOT NULL REFERENCES turma(id),
  data DATE NOT NULL,
  horario VARCHAR(50)
);

CREATE TABLE frequencia (
  id SERIAL PRIMARY KEY,
  aula_id INTEGER NOT NULL REFERENCES aula(id),
  aluno_id INTEGER NOT NULL REFERENCES aluno(id),
  presente BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE arquivo (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  turma_id INTEGER REFERENCES turma(id),
  tipo VARCHAR(50),
  caminho VARCHAR(255) NOT NULL
);
