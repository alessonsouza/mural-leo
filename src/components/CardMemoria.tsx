// ============================================================================
//  Card de uma memória — exibe foto, nome, relato e data
// ============================================================================

import { useState } from 'react'
import type { Memoria } from '../types'
import { ModalCompartilhar } from './ModalCompartilhar'
import { ModalEditarMemoria } from './ModalEditarMemoria'

interface Props {
  memoria: Memoria
  onAtualizada: (memoria: Memoria) => void
}

export function CardMemoria({ memoria, onAtualizada }: Props) {
  const [modalCompartilhar, setModalCompartilhar] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)

  return (
    <article className="card">
      <div className="card-moldura">
        <img
          className="card-foto"
          src={memoria.imagem_url}
          alt={`Memória compartilhada por ${memoria.nome}`}
          loading="lazy"
        />
      </div>

      <div className="card-corpo">
        <p className="card-relato">{memoria.relato}</p>

        <footer className="card-rodape">
          <span className="card-nome">{memoria.nome}</span>
        </footer>

        <div className="card-acoes">
          <button
            type="button"
            className="botao-compartilhar"
            onClick={() => setModalCompartilhar(true)}
            aria-label="Pré-visualizar e compartilhar nos stories"
          >
            <svg
              className="botao-compartilhar-icone"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>Compartilhar no story</span>
          </button>

          <div className="card-acoes-secundarias">
            <button
              type="button"
              className="botao-icone"
              onClick={() => setModalEditar(true)}
              aria-label="Editar memória"
              title="Editar"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {modalCompartilhar && (
        <ModalCompartilhar
          memoria={memoria}
          onFechar={() => setModalCompartilhar(false)}
        />
      )}

      {modalEditar && (
        <ModalEditarMemoria
          memoria={memoria}
          onFechar={() => setModalEditar(false)}
          onAtualizada={(atualizada) => {
            onAtualizada(atualizada)
            setModalEditar(false)
          }}
        />
      )}
    </article>
  )
}
