#!/bin/sh
# ============================================================================
#  Entrypoint do contêiner único — sobe a API Node e o Caddy lado a lado
# ----------------------------------------------------------------------------
#  Inicia os dois processos em background, espera pelo encerramento de
#  qualquer um e desliga o contêiner inteiro (para o orquestrador reiniciar
#  num estado consistente).
# ============================================================================
set -e

# Sobe a API Node.js (escuta em 3001 por padrão).
node /app/server/index.js &
PID_API=$!

# Sobe o Caddy em foreground-via-background para podermos esperar pelos dois.
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
PID_CADDY=$!

# Repassa SIGTERM/SIGINT para os filhos e sai limpo.
trap 'kill -TERM "$PID_API" "$PID_CADDY" 2>/dev/null; exit 0' INT TERM

# Loop simples: enquanto os dois processos estiverem vivos, dorme. POSIX shell
# não tem "wait -n", então usamos "kill -0" (sinal nulo, só verifica existência).
while kill -0 "$PID_API" 2>/dev/null && kill -0 "$PID_CADDY" 2>/dev/null; do
	sleep 2
done

echo "Um dos processos encerrou — desligando o contêiner." >&2
kill -TERM "$PID_API" "$PID_CADDY" 2>/dev/null || true
exit 1
