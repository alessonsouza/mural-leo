// ============================================================================
//  Card de uma memória — exibe foto, nome, relato e data
// ============================================================================

import { useState } from 'react'
import { curtirMemoria, descurtirMemoria } from '../api'
import type { Memoria } from '../types'
import {
  desmarcarCurtida,
  jaCurtiu,
  marcarComoCurtida,
} from '../utils/curtidas'
import { ModalCompartilhar } from './ModalCompartilhar'
import { ModalEditarMemoria } from './ModalEditarMemoria'
import { ModalVisualizarMemoria } from './ModalVisualizarMemoria'

interface Props {
  memoria: Memoria
  onAtualizada: (memoria: Memoria) => void
}

export function CardMemoria({ memoria, onAtualizada }: Props) {
  const [modalCompartilhar, setModalCompartilhar] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalVisualizar, setModalVisualizar] = useState(false)
  // Estado local da curtida — começa olhando para o localStorage.
  const [curtido, setCurtido] = useState(() => jaCurtiu(memoria.id))
  // Flag para impedir cliques duplos enquanto a requisição está no ar.
  const [salvandoCurtida, setSalvandoCurtida] = useState(false)

  async function aoAlternarCurtida() {
    if (salvandoCurtida) return
    setSalvandoCurtida(true)

    // Atualização otimista: vira o estado e o contador antes da resposta.
    const eraCurtido = curtido
    const novoCurtido = !eraCurtido
    setCurtido(novoCurtido)
    if (novoCurtido) marcarComoCurtida(memoria.id)
    else desmarcarCurtida(memoria.id)
    onAtualizada({
      ...memoria,
      curtidas: memoria.curtidas + (novoCurtido ? 1 : -1),
    })

    try {
      const totalReal = novoCurtido
        ? await curtirMemoria(memoria.id)
        : await descurtirMemoria(memoria.id)
      // Concilia o contador com o total real vindo do banco (caso outras
      // pessoas tenham curtido enquanto isso).
      onAtualizada({ ...memoria, curtidas: totalReal })
    } catch {
      // Se falhar, desfaz o estado otimista.
      setCurtido(eraCurtido)
      if (eraCurtido) marcarComoCurtida(memoria.id)
      else desmarcarCurtida(memoria.id)
      onAtualizada(memoria)
    } finally {
      setSalvandoCurtida(false)
    }
  }

  return (
    <article className="card">
      <button
        type="button"
        className="card-moldura card-moldura--clicavel"
        onClick={() => setModalVisualizar(true)}
        aria-label={`Ver a memória de ${memoria.nome} em tamanho maior`}
      >
        <img
          className="card-foto"
          src={memoria.imagem_url}
          alt={`Memória compartilhada por ${memoria.nome}`}
          loading="lazy"
        />
      </button>

      <div className="card-corpo">
        <p className="card-relato">{memoria.relato}</p>

        <footer className="card-rodape">
          <span className="card-nome">{memoria.nome}</span>
          <button
            type="button"
            className={
              'botao-curtir' + (curtido ? ' botao-curtir--ativo' : '')
            }
            onClick={aoAlternarCurtida}
            disabled={salvandoCurtida}
            aria-pressed={curtido}
            aria-label={curtido ? 'Remover curtida' : 'Curtir esta memória'}
            title={curtido ? 'Você curtiu' : 'Curtir'}
          >
            <svg
              className="botao-curtir-icone"
              viewBox="0 0 24 24"
              fill={curtido ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="botao-curtir-contador">{memoria.curtidas}</span>
          </button>
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

      {modalVisualizar && (
        <ModalVisualizarMemoria
          memoria={memoria}
          onFechar={() => setModalVisualizar(false)}
        />
      )}
    </article>
  )
}
