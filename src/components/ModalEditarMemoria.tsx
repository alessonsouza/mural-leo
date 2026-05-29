// ============================================================================
//  Modal "Editar memória" — altera nome, relato e/ou foto de uma memória
// ----------------------------------------------------------------------------
//  Mantém o visual do modal de criação: zona de upload (mostra a foto atual
//  como pré-visualização inicial), editor de recorte 4:3 ao trocar a imagem,
//  campos de nome (com prefixo CLEO fixo) e relato.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import imageCompression from 'browser-image-compression'
import { createPortal } from 'react-dom'
import { atualizarMemoria } from '../api'
import type { Memoria } from '../types'
import { EditorRecorteFoto } from './EditorRecorteFoto'

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
  // Nova foto cortada que substituirá a atual. Quando null, mantém a antiga.
  const [novaFoto, setNovaFoto] = useState<File | null>(null)
  // Pré-visualização (object URL) da foto nova. Quando null, mostra a antiga.
  const [previa, setPrevia] = useState<string | null>(null)
  // Quando preenchido, o editor de recorte está aberto sobre o formulário.
  const [arquivoParaEditar, setArquivoParaEditar] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)

  // Mantém referência da object URL atual da prévia local pra revogar depois.
  const urlPreviaRef = useRef<string | null>(null)

  // Fechar com "Esc".
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  // Limpa a object URL quando o modal desmonta.
  useEffect(() => {
    return () => {
      if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    }
  }, [])

  // Aplica a foto recém-cortada como nova foto e atualiza a pré-visualização.
  function definirNovaFoto(arquivoCortado: File) {
    setNovaFoto(arquivoCortado)
    setErro(null)
    if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    const url = URL.createObjectURL(arquivoCortado)
    urlPreviaRef.current = url
    setPrevia(url)
  }

  function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0]
    if (escolhido) setArquivoParaEditar(escolhido)
    evento.target.value = ''
  }

  function aoSoltarArquivo(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault()
    setArrastando(false)
    const escolhido = evento.dataTransfer.files?.[0]
    if (!escolhido) return
    if (!escolhido.type.startsWith('image/')) {
      setErro('O arquivo arrastado não é uma imagem.')
      return
    }
    setArquivoParaEditar(escolhido)
  }

  function reabrirEditor() {
    if (novaFoto) setArquivoParaEditar(novaFoto)
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)

    if (!nome.trim()) return setErro('Informe o seu nome.')
    if (!relato.trim()) return setErro('Escreva o relato da memória.')

    setSalvando(true)
    try {
      let fotoFinal: File | undefined
      if (novaFoto) {
        // Mesma compressão usada na criação.
        const comprimida = await imageCompression(novaFoto, {
          maxSizeMB: 4,
          maxWidthOrHeight: 3000,
          useWebWorker: true,
        })
        fotoFinal = comprimida as File
      }

      const atualizada = await atualizarMemoria(memoria.id, {
        nome: `CLEO ${nome.trim()}`,
        relato: relato.trim(),
        foto: fotoFinal,
      })
      onAtualizada(atualizada)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
      setSalvando(false)
    }
  }

  // Fonte da imagem mostrada no preview: a nova (se houver) ou a atual da memória.
  const fotoMostrada = previa ?? memoria.imagem_url

  return createPortal(
    <div className="modal-fundo" onClick={onFechar}>
      <div
        className={
          'modal-painel' +
          (arquivoParaEditar ? ' modal-painel--editor' : '')
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-editar-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        {!arquivoParaEditar && (
          <button
            type="button"
            className="modal-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        )}

        {arquivoParaEditar ? (
          <EditorRecorteFoto
            arquivo={arquivoParaEditar}
            onConcluir={(arquivoCortado) => {
              setArquivoParaEditar(null)
              definirNovaFoto(arquivoCortado)
            }}
            onCancelar={() => setArquivoParaEditar(null)}
          />
        ) : (
          <>
            <h2 id="modal-editar-titulo" className="modal-titulo">
              Editar memória
            </h2>
            <p className="modal-instrucao">
              Ajuste a foto, o nome ou o relato desta memória.
            </p>

            <form className="formulario" onSubmit={aoEnviar}>
              <div className="campo">
                <span className="campo-rotulo">Fotografia</span>
                <label
                  className={
                    'zona-upload zona-upload--com-foto' +
                    (arrastando ? ' zona-upload--arrastando' : '')
                  }
                  onDragOver={(e) => {
                    e.preventDefault()
                    setArrastando(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setArrastando(false)
                  }}
                  onDrop={aoSoltarArquivo}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="zona-upload-input"
                    onChange={aoEscolherArquivo}
                  />
                  <img
                    className="zona-upload-previa"
                    src={fotoMostrada}
                    alt="Pré-visualização da foto"
                  />
                  <span className="zona-upload-trocar">
                    {novaFoto ? 'Trocar de novo' : 'Trocar foto'}
                  </span>
                </label>
                {novaFoto && (
                  <button
                    type="button"
                    className="botao-ajustar"
                    onClick={reabrirEditor}
                  >
                    Ajustar enquadramento
                  </button>
                )}
              </div>

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
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
