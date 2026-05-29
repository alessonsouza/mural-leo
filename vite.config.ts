import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite (ferramenta que roda e empacota o site React).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Durante o desenvolvimento local, tudo que o site pedir em "/api" é
    // encaminhado para o backend rodando na porta 3001. Assim o frontend e o
    // backend funcionam como se estivessem no mesmo endereço, sem erros de CORS.
    proxy: {
      // Usa 127.0.0.1 em vez de "localhost" — o Windows resolve "localhost"
      // para IPv6 ([::1]) primeiro, e nessa pilha o WSL relay pode estar
      // ocupando a 3001 e devolvendo 404. Forçar IPv4 cai direto no Node.
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
