// ============================================================================
//  Modal "Editar memória" — altera nome e relato de uma memória existente
// ----------------------------------------------------------------------------
//  Mantém o mesmo visual do modal de criação, mas só dois campos: o nome (com
//  o prefixo fixo "CLEO") e o relato. A foto não pode ser trocada por aqui —
//  para trocar a foto basta remover a memória e cadastrar de novo.
// ============================================================================

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { atualizarMemoria } from '../api'
import type { Memoria } from '../types'

interface Props {
  memoria: Memoria
  onFechar: () => void
  onAtualizada: (memoria: Memoria) => void
}

// Tira o prefixo "CLEO " do início do nome para o usuário editar só a parte dele.
function removerPrefixoCleo(nome: string): string {
  return nome.replace(/^CLEO\s+/i, '')
}

export function ModalEditarMemoria({ memoria, onFechar, onAtualizada }: Props) {
  const [nome, setNome] = useState(removerPrefixoCleo(memoria.nome))
  const [relato, setRelato] = useState(memoria.relato)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Fechar com "Esc".
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)

    if (!nome.trim()) return setErro('Informe o seu nome.')
    if (!relato.trim()) return setErro('Escreva o relato da memória.')

    setSalvando(true)
    try {
      const atualizada = await atualizarMemoria(memoria.id, {
        nome: `CLEO ${nome.trim()}`,
        relato: relato.trim(),
      })
      onAtualizada(atualizada)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
      setSalvando(false)
    }
  }

  return createPortal(
    <div className="modal-fundo" onClick={onFechar}>
      <div
        className="modal-painel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-editar-titulo"
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

        <h2 id="modal-editar-titulo" className="modal-titulo">
          Editar memória
        </h2>
        <p className="modal-instrucao">
          Ajuste o nome ou o relato. A fotografia continua a mesma.
        </p>

        <form className="formulario" onSubmit={aoEnviar}>
          <label className="campo">
            <span className="campo-rotulo">Seu nome</span>
            <div className="campo-prefixado">
              <span className="campo-prefixo" aria-hidden="true">CLEO</span>
              <input
                type="text"
                className="campo-entrada campo-entrada--prefixada"
                value={nome}
                maxLength={80}
                placeholder="Como você quer assinar esta memória"
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </label>

          <label className="campo">
            <span className="campo-rotulo">Seu relato</span>
            <textarea
              className="campo-area"
              value={relato}
              maxLength={2000}
              rows={5}
              placeholder="Por que esta foto é importante para você?"
              onChange={(e) => setRelato(e.target.value)}
            />
          </label>

          {erro && <p className="formulario-erro">{erro}</p>}

          <div className="formulario-acoes">
            <button
              type="button"
              className="botao-secundario"
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
