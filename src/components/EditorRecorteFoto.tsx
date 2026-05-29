// ============================================================================
//  Editor de recorte da foto antes do envio
// ----------------------------------------------------------------------------
//  Abre logo após o usuário escolher uma foto. Mostra a imagem dentro de um
//  quadro 4:3 (a mesma proporção exibida no card do mural) e permite arrastar
//  e dar zoom, garantindo que pessoas/objetos importantes não fiquem cortados.
//  Ao confirmar, o recorte é exportado como um novo File (JPEG) que vai pro
//  fluxo normal de upload.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface Props {
  arquivo: File
  onConcluir: (arquivoCortado: File) => void
  onCancelar: () => void
}

// Resolução de saída do recorte. browser-image-compression depois comprime.
const SAIDA_LARGURA = 1200
const SAIDA_ALTURA = 900
const ZOOM_MIN = 1
const ZOOM_MAX = 3

export function EditorRecorteFoto({ arquivo, onConcluir, onCancelar }: Props) {
  const [srcUrl, setSrcUrl] = useState<string>('')
  const [tamanhoImg, setTamanhoImg] = useState({ w: 0, h: 0 })
  const [tamanhoViewport, setTamanhoViewport] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 })
  const [arrastando, setArrastando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const refViewport = useRef<HTMLDivElement>(null)
  const refArrasto = useRef<{
    iniX: number
    iniY: number
    desX: number
    desY: number
  } | null>(null)
  const refUrlObjeto = useRef<string | null>(null)

  // Carrega a foto escolhida para extrair as dimensões naturais.
  useEffect(() => {
    const url = URL.createObjectURL(arquivo)
    refUrlObjeto.current = url
    setSrcUrl(url)
    const img = new Image()
    img.onload = () => setTamanhoImg({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => setErro('Não foi possível abrir a imagem para edição.')
    img.src = url
    return () => {
      if (refUrlObjeto.current) URL.revokeObjectURL(refUrlObjeto.current)
    }
  }, [arquivo])

  // Mede o tamanho real do quadro de recorte (responsivo).
  useEffect(() => {
    const el = refViewport.current
    if (!el) return
    const atualizar = () => {
      const r = el.getBoundingClientRect()
      setTamanhoViewport({ w: r.width, h: r.height })
    }
    atualizar()
    const observer = new ResizeObserver(atualizar)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Escala mínima para que a imagem cubra o viewport (sem buracos brancos).
  const escalaBase =
    tamanhoImg.w && tamanhoImg.h && tamanhoViewport.w && tamanhoViewport.h
      ? Math.max(
          tamanhoViewport.w / tamanhoImg.w,
          tamanhoViewport.h / tamanhoImg.h,
        )
      : 1
  const escala = escalaBase * zoom

  // Mantém o deslocamento dentro de limites que ainda cobrem o viewport.
  function limitar(x: number, y: number) {
    const renderW = tamanhoImg.w * escala
    const renderH = tamanhoImg.h * escala
    const maxX = Math.max(0, (renderW - tamanhoViewport.w) / 2)
    const maxY = Math.max(0, (renderH - tamanhoViewport.h) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    }
  }

  // Quando o zoom muda, recalcula o deslocamento para não expor borda branca.
  useEffect(() => {
    setDeslocamento((prev) => limitar(prev.x, prev.y))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, tamanhoImg.w, tamanhoImg.h, tamanhoViewport.w, tamanhoViewport.h])

  function aoIniciarArrasto(evento: ReactPointerEvent<HTMLDivElement>) {
    if (!tamanhoImg.w) return
    evento.preventDefault()
    evento.currentTarget.setPointerCapture(evento.pointerId)
    setArrastando(true)
    refArrasto.current = {
      iniX: evento.clientX,
      iniY: evento.clientY,
      desX: deslocamento.x,
      desY: deslocamento.y,
    }
  }

  function aoMover(evento: ReactPointerEvent<HTMLDivElement>) {
    const r = refArrasto.current
    if (!r) return
    const dx = evento.clientX - r.iniX
    const dy = evento.clientY - r.iniY
    setDeslocamento(limitar(r.desX + dx, r.desY + dy))
  }

  function aoFinalizarArrasto(evento: ReactPointerEvent<HTMLDivElement>) {
    setArrastando(false)
    refArrasto.current = null
    evento.currentTarget.releasePointerCapture?.(evento.pointerId)
  }

  async function aplicar() {
    if (!tamanhoImg.w || !tamanhoViewport.w) return
    setExportando(true)
    setErro(null)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = SAIDA_LARGURA
      canvas.height = SAIDA_ALTURA
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas indisponível neste navegador.')

      // Converte o estado da UI (deslocamento em pixels do viewport e escala)
      // para a região da imagem original que está visível.
      const centroX = tamanhoImg.w / 2 - deslocamento.x / escala
      const centroY = tamanhoImg.h / 2 - deslocamento.y / escala
      const recorteW = tamanhoViewport.w / escala
      const recorteH = tamanhoViewport.h / escala
      const recorteX = centroX - recorteW / 2
      const recorteY = centroY - recorteH / 2

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('Falha ao processar a imagem.'))
        i.src = srcUrl
      })

      ctx.drawImage(
        img,
        recorteX,
        recorteY,
        recorteW,
        recorteH,
        0,
        0,
        SAIDA_LARGURA,
        SAIDA_ALTURA,
      )

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Falha ao exportar.'))),
          'image/jpeg',
          0.92,
        )
      })

      const nomeBase = arquivo.name.replace(/\.[^.]+$/, '') || 'memoria'
      const arquivoCortado = new File([blob], `${nomeBase}.jpg`, {
        type: 'image/jpeg',
      })
      onConcluir(arquivoCortado)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível recortar.')
      setExportando(false)
    }
  }

  return (
    <div className="editor-recorte">
      <h2 className="modal-titulo">Ajuste a foto</h2>
      <p className="modal-instrucao">
        Arraste para reposicionar e use o controle abaixo para dar zoom. O que
        ficar dentro do quadro é o que vai aparecer no mural.
      </p>

      <div
        ref={refViewport}
        className={
          'editor-viewport' + (arrastando ? ' editor-viewport--arrastando' : '')
        }
        onPointerDown={aoIniciarArrasto}
        onPointerMove={aoMover}
        onPointerUp={aoFinalizarArrasto}
        onPointerCancel={aoFinalizarArrasto}
      >
        {srcUrl && tamanhoImg.w > 0 && (
          <img
            className="editor-imagem"
            src={srcUrl}
            alt=""
            draggable={false}
            style={{
              width: tamanhoImg.w,
              height: tamanhoImg.h,
              transform: `translate(-50%, -50%) translate(${deslocamento.x}px, ${deslocamento.y}px) scale(${escala})`,
            }}
          />
        )}
      </div>

      <label className="editor-zoom">
        <span className="editor-zoom-rotulo">Zoom</span>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>

      {erro && <p className="formulario-erro">{erro}</p>}

      <div className="formulario-acoes">
        <button
          type="button"
          className="botao-secundario"
          onClick={onCancelar}
          disabled={exportando}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="botao-primario"
          onClick={aplicar}
          disabled={exportando || !tamanhoImg.w}
        >
          {exportando ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
    </div>
  )
}
