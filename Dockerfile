# ============================================================================
#  Imagem única para deploy — Caddy + API Node.js + frontend React
# ----------------------------------------------------------------------------
#  Junta tudo o que a aplicação precisa em um só contêiner: o site (servido
#  pelo Caddy), a API Node.js (na porta 3001 interna) e o proxy /api -> 3001
#  configurado no Caddyfile.
#
#  O que NÃO está aqui: o banco PostgreSQL. Contrate um banco gerenciado
#  (Neon, Supabase, Railway, etc.) e passe a string de conexão na variável
#  DATABASE_URL — exatamente como o backend já espera.
#
#  Variáveis de ambiente exigidas em produção:
#    · DATABASE_URL         (string de conexão do Postgres)
#    · R2_ACCOUNT_ID
#    · R2_ACCESS_KEY_ID
#    · R2_SECRET_ACCESS_KEY
#    · R2_BUCKET
#    · R2_PUBLIC_URL
#    · DOMINIO              (ex.: mural.seuclube.org.br  ou  :80)
# ============================================================================

# --- Etapa 1: build do frontend (React + Vite) -----------------------------
FROM node:22-alpine AS frontend
WORKDIR /app
# Força "development" só durante a instalação para garantir que devDependencies
# (vite, typescript, etc.) sejam instaladas mesmo se o orquestrador passar
# NODE_ENV=production no build (caso da Coolify por padrão).
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

# --- Etapa 2: dependências de produção do backend --------------------------
FROM node:22-alpine AS backend
WORKDIR /api
COPY server/package*.json ./
RUN npm install --omit=dev

# --- Etapa 3: imagem final --------------------------------------------------
FROM node:22-alpine

# Pega o binário do Caddy direto da imagem oficial (Go estático, sem deps).
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/bin/caddy

# Pastas onde o Caddy guarda certificados HTTPS e estado interno.
ENV XDG_DATA_HOME=/data XDG_CONFIG_HOME=/config
RUN mkdir -p /data /config

WORKDIR /app

# Backend: código + node_modules.
COPY --from=backend /api/node_modules ./server/node_modules
COPY server/index.js server/db.js server/r2.js server/package.json ./server/

# Schema do banco — aplicado automaticamente pelo backend no primeiro start.
COPY db/init.sql ./db/init.sql

# Frontend pronto, servido pelo Caddy a partir de /srv.
COPY --from=frontend /app/dist /srv

# Configuração do Caddy (já preparada para container único: /api -> localhost:3001).
COPY Caddyfile /etc/caddy/Caddyfile

# Script que sobe a API Node e o Caddy juntos.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
# 80 = HTTP / 443 = HTTPS automático (quando DOMINIO é um domínio real).
EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
