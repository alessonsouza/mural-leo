// ============================================================================
//  Modal "Adicionar memória" — o formulário de envio
// ----------------------------------------------------------------------------
//  Mostra uma janela sobreposta com os campos: foto, nome e relato.
//  Antes de enviar, a foto é comprimida no próprio navegador, para o upload
//  ficar mais rápido e ocupar menos espaço no armazenamento.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import imageCompression from 'browser-image-compression'
import { criarMemoria } from '../api'
import type { Memoria } from '../types'
import { EditorRecorteFoto } from './EditorRecorteFoto'

interface Props {
  onFechar: () => void // fecha o modal sem salvar
  onCriada: (memoria: Memoria) => void // avisa o App que uma memória foi criada
}

export function ModalNovaMemoria({ onFechar, onCriada }: Props) {
  // --- Estado do formulário ---
  const [nome, setNome] = useState('')
  const [relato, setRelato] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(null) // imagem de pré-visualização
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Indica se o usuário está arrastando um arquivo sobre a área de upload.
  const [arrastando, setArrastando] = useState(false)
  // Quando preenchido, o editor de recorte está aberto sobre o formulário.
  const [arquivoParaEditar, setArquivoParaEditar] = useState<File | null>(null)

  // Guarda a URL temporária da pré-visualização para liberá-la depois da memória.
  const urlPreviaRef = useRef<string | null>(null)

  // Permite fechar o modal pressionando a tecla "Esc".
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  // Limpa a URL temporária da pré-visualização quando o modal é fechado.
  useEffect(() => {
    return () => {
      if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    }
  }, [])

  // Guarda a imagem escolhida e gera a sua pré-visualização.
  function definirArquivo(escolhido: File) {
    setArquivo(escolhido)
    setErro(null)

    // Cria uma pré-visualização da imagem escolhida.
    if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    const url = URL.createObjectURL(escolhido)
    urlPreviaRef.current = url
    setPrevia(url)
  }

  // Chamado quando o usuário escolhe uma imagem clicando no campo de upload.
  function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0]
    if (escolhido) abrirEditor(escolhido)
    // Limpa o input para permitir reescolher a MESMA foto depois de cancelar.
    evento.target.value = ''
  }

  // Chamado quando o usuário solta uma imagem arrastada sobre a área.
  function aoSoltarArquivo(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault()
    setArrastando(false)
    const escolhido = evento.dataTransfer.files?.[0]
    if (!escolhido) return
    if (!escolhido.type.startsWith('image/')) {
      setErro('O arquivo arrastado não é uma imagem.')
      return
    }
    abrirEditor(escolhido)
  }

  // Abre o editor de recorte para a foto recém-selecionada.
  function abrirEditor(escolhido: File) {
    setErro(null)
    setArquivoParaEditar(escolhido)
  }

  // Reabrir o editor para reajustar a foto já escolhida.
  function reabrirEditor() {
    if (arquivo) setArquivoParaEditar(arquivo)
  }

  // Chamado ao enviar o formulário.
  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)

    // Validação simples antes de enviar.
    if (!nome.trim()) return setErro('Informe o seu nome.')
    if (!relato.trim()) return setErro('Escreva o relato da memória.')
    if (!arquivo) return setErro('Anexe uma fotografia.')

    setEnviando(true)
    try {
      // Comprime a foto no navegador: até ~2.5 MB e 2400px de lado maior.
      // Combinado com o editor (que exporta 2400x1800) preserva resolução boa
      // pra zoom no lightbox e no template do story.
      const fotoComprimida = await imageCompression(arquivo, {
        maxSizeMB: 2.5,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
      })

      // Envia tudo para o backend e recebe a memória já salva.
      // O nome é gravado com o prefixo "CLEO" para padronizar a assinatura.
      const memoria = await criarMemoria({
        nome: `CLEO ${nome.trim()}`,
        relato: relato.trim(),
        foto: fotoComprimida as File,
      })

      onCriada(memoria)
    } catch (e) {
      // Mostra a mensagem de erro vinda do backend (ou uma genérica).
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
      setEnviando(false)
    }
  }

  return (
    // A camada escura ao fundo; clicar nela fecha o modal.
    <div className="modal-fundo" onClick={onFechar}>
      {/* O painel branco. "stopPropagation" impede que cliques aqui fechem o modal. */}
      <div
        className={
          'modal-painel' +
          (arquivoParaEditar ? ' modal-painel--editor' : '')
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
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
              definirArquivo(arquivoCortado)
            }}
            onCancelar={() => setArquivoParaEditar(null)}
          />
        ) : (
          <>
            <h2 id="modal-titulo" className="modal-titulo">
              Adicionar memória
            </h2>
            <p className="modal-instrucao">
              Compartilhe uma fotografia e conte por que ela é especial para você.
            </p>

        <form className="formulario" onSubmit={aoEnviar}>
          {/* Campo de upload da imagem — área clicável que também aceita
              arrastar e soltar. Mostra a pré-visualização depois de escolhida. */}
          <div className="campo">
            <span className="campo-rotulo">Fotografia</span>
            <label
              className={
                'zona-upload' +
                (previa ? ' zona-upload--com-foto' : '') +
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
              {/* O input fica escondido; o visual fica todo na "zona-upload". */}
              <input
                type="file"
                accept="image/*"
                className="zona-upload-input"
                onChange={aoEscolherArquivo}
              />

              {previa ? (
                <>
                  <img
                    className="zona-upload-previa"
                    src={previa}
                    alt="Pré-visualização da foto"
                  />
                  <span className="zona-upload-trocar">Trocar foto</span>
                </>
              ) : (
                <span className="zona-upload-vazia">
                  {/* Ícone de imagem. */}
                  <svg
                    className="zona-upload-icone"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2.5" />
                    <circle cx="8.5" cy="8.5" r="1.8" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="zona-upload-titulo">
                    Clique para escolher uma foto
                  </span>
                  <span className="zona-upload-dica">ou arraste a imagem aqui</span>
                </span>
              )}
            </label>
            {previa && (
              <button
                type="button"
                className="botao-ajustar"
                onClick={reabrirEditor}
              >
                Ajustar enquadramento
              </button>
            )}
          </div>

          {/* Campo do nome — com prefixo fixo "CLEO" antes do que o usuário digita. */}
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

          {/* Campo do relato. */}
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

          {/* Mensagem de erro, quando houver. */}
          {erro && <p className="formulario-erro">{erro}</p>}

          {/* Botões de ação. */}
          <div className="formulario-acoes">
            <button
              type="button"
              className="botao-secundario"
              onClick={onFechar}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Publicar memória'}
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  )
}
