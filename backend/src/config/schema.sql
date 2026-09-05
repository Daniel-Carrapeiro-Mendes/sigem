-- Script de criacao das tabelas do SIGEM
-- Baseado no diagrama de classes/ER do TCC e nos requisitos da Secao 4 (RF01 a RF08)
--
-- Como rodar:
--   psql -U postgres -d sigem_db -f src/config/schema.sql
--
-- Este arquivo so cria tabelas, nunca apaga. Se precisar recriar o banco do
-- zero, os DROP devem ser feitos a mao e com cuidado: eles apagam os dados.

CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('admin', 'professor', 'aluno')),
  -- RF01 e RF02 pedem exclusao de alunos e professores, mas apagar de verdade
  -- esbarra nas chaves estrangeiras de matricula e frequencia. Em vez de apagar,
  -- marcamos como inativo: some das listagens e o historico continua intacto.
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- professor e aluno sao "satelites" de usuario: guardam so o que e especifico de
-- cada perfil. O login, o nome e o estado ativo/inativo ficam todos em usuario.
CREATE TABLE professor (
  id SERIAL PRIMARY KEY,
  -- UNIQUE porque um mesmo usuario nao pode virar dois professores
  usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id),
  especialidade VARCHAR(150)
);

CREATE TABLE aluno (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id),
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
  -- Horario semanal da turma. Em colunas separadas, e nao em texto livre, porque
  -- o RF04 (agendamento) precisa ordenar por horario e detectar choque de agenda
  -- do mesmo professor. Com VARCHAR isso seria impossivel.
  -- dia_semana: 0 = domingo ... 6 = sabado
  dia_semana SMALLINT CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME,
  hora_fim TIME
);

-- Relacionamento muitos-para-muitos entre turma e aluno
CREATE TABLE matricula (
  turma_id INTEGER NOT NULL REFERENCES turma(id),
  aluno_id INTEGER NOT NULL REFERENCES aluno(id),
  PRIMARY KEY (turma_id, aluno_id)
);

-- Uma ocorrencia concreta de aula, numa data especifica
CREATE TABLE aula (
  id SERIAL PRIMARY KEY,
  turma_id INTEGER NOT NULL REFERENCES turma(id),
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME
);

CREATE TABLE frequencia (
  id SERIAL PRIMARY KEY,
  aula_id INTEGER NOT NULL REFERENCES aula(id),
  aluno_id INTEGER NOT NULL REFERENCES aluno(id),
  presente BOOLEAN NOT NULL DEFAULT false,
  -- o mesmo aluno so pode ter um registro de presenca por aula
  UNIQUE (aula_id, aluno_id)
);

CREATE TABLE arquivo (
  id SERIAL PRIMARY KEY,
  -- quem enviou
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  -- RF07: o professor vincula o arquivo a uma turma OU a um aluno especifico.
  -- RF08: o aluno envia audio da propria pratica, entao aponta so para si.
  -- Os dois sao opcionais justamente porque cada caso preenche um deles.
  turma_id INTEGER REFERENCES turma(id),
  aluno_id INTEGER REFERENCES aluno(id),
  tipo VARCHAR(50),
  -- caminho no disco. O arquivo em si nao vai para o banco: audio em coluna
  -- deixa o backup lento e o dump gigante.
  caminho VARCHAR(255) NOT NULL,
  -- nome que o arquivo tinha na maquina de quem enviou, para o download sair legivel
  nome_original VARCHAR(255),
  enviado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
