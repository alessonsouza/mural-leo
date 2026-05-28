// ============================================================================
//  Modal "ver memória em tela cheia" — lightbox que abre ao clicar no card
// ----------------------------------------------------------------------------
//  Mostra a foto inteira (sem corte, aspect-fit) com bastante espaço, mais o
//  relato e a assinatura embaixo. Pensado para que os companheiros consigam
//  apreciar cada memória em detalhe.
// ============================================================================

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Memoria } from '../types'

interface Props {
  memoria: Memoria
  onFechar: () => void
}

export function ModalVisualizarMemoria({ memoria, onFechar }: Props) {
  // Fechar com "Esc".
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return createPortal(
    <div className="lightbox-fundo" onClick={onFechar}>
      <button
        type="button"
        className="lightbox-fechar"
        onClick={onFechar}
        aria-label="Fechar"
      >
        ×
      </button>
      <div
        className="lightbox-painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-autor"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lightbox-foto-area">
          <img
            className="lightbox-foto"
            src={memoria.imagem_url}
            alt={`Memória compartilhada por ${memoria.nome}`}
          />
        </div>

        <div className="lightbox-texto">
          <p className="lightbox-relato">{memoria.relato}</p>
          <p id="lightbox-autor" className="lightbox-autor">
            {memoria.nome}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
