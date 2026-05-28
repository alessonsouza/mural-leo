// ============================================================================
//  Conexão com o banco de dados PostgreSQL
// ----------------------------------------------------------------------------
//  Aqui criamos um "pool" de conexões — um conjunto de conexões reaproveitáveis
//  com o banco. É a forma recomendada de usar o Postgres em uma aplicação web.
// ============================================================================

import pg from 'pg';

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
