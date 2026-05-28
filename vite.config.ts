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
      '/api': 'http://localhost:3001',
    },
  },
})
