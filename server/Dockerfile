# ============================================================================
#  Imagem Docker do backend (API em Node.js)
# ============================================================================

FROM node:22-alpine

# Pasta de trabalho dentro do contêiner.
WORKDIR /app

# Copia primeiro só os arquivos de dependências e as instala.
# (Fazer isso separado aproveita o cache do Docker e acelera builds futuros.)
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do código do backend.
COPY . .

# A API escuta nesta porta dentro do contêiner.
EXPOSE 3001

# Comando que sobe o servidor.
CMD ["node", "index.js"]
