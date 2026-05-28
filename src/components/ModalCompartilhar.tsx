// ============================================================================
//  Modal de compartilhamento
// ----------------------------------------------------------------------------
//  Quando o usuário clica em "Compartilhar no story" de uma memória, este modal
//  abre, gera o template 1080x1920 no canvas e mostra uma pré-visualização do
//  resultado. A partir da pré-visualização o usuário pode baixar o PNG ou abrir
//  a folha de compartilhamento nativa (no celular).
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Memoria } from '../types'
import {
  baixarBlob,
  compartilharBlob,
  gerarStoryInstagram,
  podeCompartilharArquivo,
} from '../utils/storyInstagram'

interface Props {
  memoria: Memoria
  onFechar: () => void
}

export function ModalCompartilhar({ memoria, onFechar }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [compartilhando, setCompartilhando] = useState(false)

  // Guarda a URL temporária da pré-visualização para liberá-la depois.
  const urlPreviaRef = useRef<string | null>(null)

  // Permite fechar o modal pressionando "Esc".
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  // Gera o PNG assim que o modal abre.
  useEffect(() => {
    let cancelado = false
    setErro(null)

    gerarStoryInstagram(memoria)
      .then((resultado) => {
        if (cancelado) return
        const url = URL.createObjectURL(resultado)
        urlPreviaRef.current = url
        setBlob(resultado)
        setPrevia(url)
      })
      .catch((e: unknown) => {
        if (cancelado) return
        setErro(e instanceof Error ? e.message : 'Não foi possível gerar a imagem.')
      })

    return () => {
      cancelado = true
    }
  }, [memoria])

  // Libera a URL temporária da pré-visualização ao desmontar.
  useEffect(() => {
    return () => {
      if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    }
  }, [])

  function nomeArquivo(): string {
    const base = memoria.nome.replace(/[^\w\-]+/g, '_').toLowerCase()
    return `relatos-de-afeto-${base || 'memoria'}.png`
  }

  function aoBaixar() {
    if (!blob) return
    baixarBlob(blob, nomeArquivo())
  }

  async function aoCompartilhar() {
    if (!blob) return
    setCompartilhando(true)
    setErro(null)
    try {
      await compartilharBlob(blob, nomeArquivo())
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Não foi possível abrir o compartilhamento.',
      )
    } finally {
      setCompartilhando(false)
    }
  }

  // Decide se o botão de compartilhar nativo deve aparecer.
  const podeCompartilhar = blob ? podeCompartilharArquivo(blob, nomeArquivo()) : false

  // Renderiza num portal no <body> para escapar de ancestrais com `transform`
  // (o `.card` tem `translateY` no hover, e isso "prende" o `position: fixed`
  //  do modal dentro dele).
  return createPortal(
    <div className="modal-fundo" onClick={onFechar}>
      <div
        className="modal-painel modal-painel--compartilhar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-compartilhar-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-fechar"
          onClick={onFechar}
          aria-label="Fechar"
        >
          ×
        </button>

        <h2 id="modal-compartilhar-titulo" className="modal-titulo">
          Compartilhar no story
        </h2>
        <p className="modal-instrucao">
          Confira como a sua memória vai aparecer e baixe ou compartilhe a imagem
          quando estiver pronta.
        </p>

        <div className="previa-story">
          {previa ? (
            <img
              className="previa-story-imagem"
              src={previa}
              alt="Pré-visualização do story"
            />
          ) : erro ? (
            <p className="previa-story-erro">{erro}</p>
          ) : (
            <div className="previa-story-carregando" aria-live="polite">
              <span className="previa-story-spinner" aria-hidden="true" />
              <span>Gerando a imagem…</span>
            </div>
          )}
        </div>

        {erro && previa && <p className="formulario-erro">{erro}</p>}

        <div className="formulario-acoes">
          <button
            type="button"
            className="botao-secundario"
            onClick={onFechar}
          >
            Fechar
          </button>
          {podeCompartilhar && (
            <button
              type="button"
              className="botao-secundario"
              onClick={aoCompartilhar}
              disabled={!blob || compartilhando}
            >
              {compartilhando ? 'Abrindo…' : 'Compartilhar'}
            </button>
          )}
          <button
            type="button"
            className="botao-primario"
            onClick={aoBaixar}
            disabled={!blob}
          >
            Baixar imagem
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
