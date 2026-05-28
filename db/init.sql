-- ============================================================================
--  Banco de dados — "Relatos de Afeto: Memórias do Servir"
-- ----------------------------------------------------------------------------
--  Este arquivo é executado AUTOMATICAMENTE pelo contêiner do PostgreSQL na
--  PRIMEIRA vez que ele sobe (quando o volume de dados ainda está vazio).
--  Ele cria a única tabela do projeto: "memorias".
-- ============================================================================

CREATE TABLE IF NOT EXISTS memorias (
  -- Identificador único de cada memória, gerado automaticamente pelo banco.
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nome do companheiro LEO que publicou a memória.
  nome        TEXT         NOT NULL,

  -- O relato: por que aquela foto é importante para quem postou.
  relato      TEXT         NOT NULL,

  -- Endereço público da foto (o arquivo em si fica no Cloudflare R2).
  imagem_url  TEXT         NOT NULL,

  -- Data e hora da publicação, preenchida automaticamente.
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índice para acelerar a listagem do mural (memórias mais recentes primeiro).
CREATE INDEX IF NOT EXISTS idx_memorias_criado_em ON memorias (criado_em DESC);

-- Contador de curtidas. Como o app não tem login, o "quem curtiu" é controlado
-- pelo navegador via localStorage; o banco guarda só o total.
ALTER TABLE memorias ADD COLUMN IF NOT EXISTS curtidas INTEGER NOT NULL DEFAULT 0;
