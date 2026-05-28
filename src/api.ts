// ============================================================================
//  Comunicação com o backend (a API)
// ----------------------------------------------------------------------------
//  Este arquivo concentra todas as chamadas de rede do site. Os componentes
//  React usam estas funções e não precisam saber os detalhes do "fetch".
// ============================================================================

import type { Memoria } from './types'

// Todas as rotas da API começam com "/api" (o mesmo endereço do site).
const BASE = '/api'

/**
 * Busca todas as memórias do mural, das mais recentes para as mais antigas.
 */
export async function listarMemorias(): Promise<Memoria[]> {
  const resposta = await fetch(`${BASE}/memories`)
  if (!resposta.ok) {
    throw new Error('Não foi possível carregar as memórias do mural.')
  }
  return resposta.json()
}

// Dados necessários para criar uma nova memória.
export interface NovaMemoria {
  nome: string
  relato: string
  foto: File // o arquivo de imagem (já comprimido pelo navegador)
}

/**
 * Envia uma nova memória para o backend (texto + foto) e devolve a memória
 * criada, já com id e data preenchidos pelo banco.
 */
export async function criarMemoria(dados: NovaMemoria): Promise<Memoria> {
  // FormData é o formato usado para enviar arquivos junto de campos de texto.
  const formulario = new FormData()
  formulario.append('nome', dados.nome)
  formulario.append('relato', dados.relato)
  formulario.append('foto', dados.foto)

  const resposta = await fetch(`${BASE}/memories`, {
    method: 'POST',
    body: formulario,
  })

  // Tenta ler o corpo da resposta como JSON (pode conter uma mensagem de erro).
  const corpo = await resposta.json().catch(() => ({}))

  if (!resposta.ok) {
    throw new Error(corpo.erro || 'Não foi possível salvar a memória.')
  }

  return corpo as Memoria
}

// Dados que podem ser alterados em uma memória já existente.
export interface AlteracaoMemoria {
  nome?: string
  relato?: string
}

/**
 * Atualiza o nome e/ou o relato de uma memória existente. A foto não é alterada
 * por esta rota.
 */
export async function atualizarMemoria(
  id: string,
  dados: AlteracaoMemoria,
): Promise<Memoria> {
  const resposta = await fetch(`${BASE}/memories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(dados),
  })
  const corpo = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw new Error(corpo.erro || 'Não foi possível atualizar a memória.')
  }
  return corpo as Memoria
}
