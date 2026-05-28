// ============================================================================
//  Conexão com o banco de dados PostgreSQL
// ----------------------------------------------------------------------------
//  Aqui criamos um "pool" de conexões — um conjunto de conexões reaproveitáveis
//  com o banco. É a forma recomendada de usar o Postgres em uma aplicação web.
// ============================================================================

import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

// A string de conexão vem da variável de ambiente DATABASE_URL (definida no .env).
// Formato: postgres://USUARIO:SENHA@ENDERECO:PORTA/NOME_DO_BANCO
if (!process.env.DATABASE_URL) {
  throw new Error('A variável de ambiente DATABASE_URL não foi definida.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Atalho para executar uma consulta SQL no banco.
// Exemplo de uso: const { rows } = await query('SELECT * FROM memorias');
export function query(texto, parametros) {
  return pool.query(texto, parametros);
}

/**
 * Aplica o schema do banco lendo o arquivo db/init.sql. O SQL é idempotente
 * (usa `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`), então é
 * seguro rodar a cada inicialização — em deploys novos cria as tabelas, em
 * deploys existentes não faz nada.
 *
 * Tenta dois caminhos para encontrar o init.sql:
 *   · ../db/init.sql      → estrutura do repositório (server/ ao lado de db/)
 *   · /app/db/init.sql    → estrutura dentro do contêiner Docker
 */
export async function aplicarSchema() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const caminhosPossiveis = [
    resolve(aqui, '..', 'db', 'init.sql'),
    '/app/db/init.sql',
  ];

  let sql;
  let usado;
  for (const caminho of caminhosPossiveis) {
    try {
      sql = await readFile(caminho, 'utf8');
      usado = caminho;
      break;
    } catch (e) {
      if (e?.code !== 'ENOENT') throw e;
    }
  }
  if (!sql) {
    throw new Error(
      'Não encontrei db/init.sql para aplicar o schema. Verifique se o arquivo foi incluído na imagem.',
    );
  }

  await pool.query(sql);
  console.log(`Schema verificado/aplicado a partir de ${usado}.`);
}
