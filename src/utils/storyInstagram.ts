// ============================================================================
//  Gera uma imagem 1080x1920 pronta para os stories do Instagram a partir de
//  uma memória do mural. A foto é encaixada inteira (sem corte) dentro de uma
//  moldura marfim, com título da proposta no topo, relato em itálico e
//  assinatura do autor.
// ============================================================================

import type { Memoria } from '../types'

// Dimensões do story (proporção 9:16).
const W = 1080
const H = 1920

// Paleta — espelha as variáveis CSS do site.
const VINHO = '#7b1e3b'
const VINHO_ESCURO = '#5a1129'
const DOURADO = '#c9a24b'
const DOURADO_CLARO = '#e4c77a'
const MARFIM = '#fbf6ef'

// Carrega a imagem com CORS habilitado para que o canvas não fique "tainted".
// As fotos ficam no Cloudflare R2 (URL pública pub-*.r2.dev), que não responde
// com cabeçalhos CORS. Por isso passamos pela rota /api/imagem do nosso backend,
// que serve a mesma foto na origem do site — o canvas aceita sem reclamar.
function carregarImagem(url: string): Promise<HTMLImageElement> {
  const urlProxy = `/api/imagem?url=${encodeURIComponent(url)}`
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a foto.'))
    img.src = urlProxy
  })
}

// Garante que as fontes do site (Playfair e Inter) estejam prontas no canvas.
async function aguardarFontes(): Promise<void> {
  if (!document.fonts) return
  await document.fonts.ready
  await Promise.all([
    document.fonts.load('700 90px "Playfair Display"'),
    document.fonts.load('italic 500 52px "Playfair Display"'),
    document.fonts.load('600 32px "Playfair Display"'),
    document.fonts.load('italic 500 36px "Playfair Display"'),
    document.fonts.load('600 22px "Inter"'),
    document.fonts.load('500 24px "Inter"'),
  ])
}

// Desenha um retângulo arredondado (preencher ou contornar fica a cargo de quem chama).
function retanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const raio = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + raio, y)
  ctx.arcTo(x + w, y, x + w, y + h, raio)
  ctx.arcTo(x + w, y + h, x, y + h, raio)
  ctx.arcTo(x, y + h, x, y, raio)
  ctx.arcTo(x, y, x + w, y, raio)
  ctx.closePath()
}

// Quebra o texto em linhas que cabem em larguraMax. Se ultrapassar maxLinhas,
// a última linha recebe reticências.
function quebrarTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number,
  maxLinhas: number,
): string[] {
  const palavras = texto.split(/\s+/)
  const linhas: string[] = []
  let atual = ''
  let truncado = false

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width <= larguraMax) {
      atual = tentativa
      continue
    }
    if (atual) linhas.push(atual)
    atual = palavra
    if (linhas.length === maxLinhas) {
      truncado = true
      atual = ''
      break
    }
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual)

  if (truncado) {
    let ultima = linhas[maxLinhas - 1]
    while (
      ultima.length > 0 &&
      ctx.measureText(`${ultima}…`).width > larguraMax
    ) {
      ultima = ultima.slice(0, -1)
    }
    linhas[maxLinhas - 1] = `${ultima.trimEnd()}…`
  }

  return linhas
}

function formatarData(dataISO: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dataISO))
}

export async function gerarStoryInstagram(memoria: Memoria): Promise<Blob> {
  const [imagem] = await Promise.all([
    carregarImagem(memoria.imagem_url),
    aguardarFontes(),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível neste navegador.')

  // --- Fundo: gradiente vinho com textura de pontos sutil ----------------
  const gradiente = ctx.createLinearGradient(0, 0, 0, H)
  gradiente.addColorStop(0, VINHO)
  gradiente.addColorStop(1, VINHO_ESCURO)
  ctx.fillStyle = gradiente
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(228, 199, 122, 0.07)'
  for (let y = 0; y < H; y += 28) {
    for (let x = 0; x < W; x += 28) {
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  }

  // --- Cabeçalho: selo + título da proposta ------------------------------
  let y = 110
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Selo arredondado
  const selo = 'LEO CLUBE ÔMEGA PINHALZINHO'
  ctx.font = '600 22px "Inter", sans-serif'
  const seloLargura = ctx.measureText(selo).width
  const seloPad = 28
  const seloH = 48
  const seloW = seloLargura + seloPad * 2
  ctx.strokeStyle = 'rgba(228, 199, 122, 0.55)'
  ctx.lineWidth = 2
  retanguloArredondado(ctx, (W - seloW) / 2, y, seloW, seloH, seloH / 2)
  ctx.stroke()
  ctx.fillStyle = DOURADO_CLARO
  ctx.fillText(selo, W / 2, y + seloH / 2)
  y += seloH + 44

  // Título da proposta
  ctx.textBaseline = 'top'
  ctx.fillStyle = MARFIM
  ctx.font = '700 90px "Playfair Display", serif'
  ctx.fillText('Relatos de Afeto', W / 2, y)
  y += 100

  ctx.fillStyle = DOURADO_CLARO
  ctx.font = 'italic 500 52px "Playfair Display", serif'
  ctx.fillText('Memórias do Servir', W / 2, y)
  y += 72

  // Filete dourado decorativo
  ctx.strokeStyle = DOURADO
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 70, y)
  ctx.lineTo(W / 2 + 70, y)
  ctx.stroke()
  y += 48

  // --- Moldura tipo "polaroid" com a foto encaixada (sem corte) ---------
  const molduraW = 900
  const molduraH = 900
  const molduraX = (W - molduraW) / 2
  const molduraY = y

  // Sombra projetada da moldura
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.32)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 14
  ctx.fillStyle = MARFIM
  retanguloArredondado(ctx, molduraX, molduraY, molduraW, molduraH, 14)
  ctx.fill()
  ctx.restore()

  // Área interna onde a foto se encaixa (com espaço extra embaixo para a assinatura)
  const padFoto = 32
  const espacoAssinatura = 96
  const fotoAreaX = molduraX + padFoto
  const fotoAreaY = molduraY + padFoto
  const fotoAreaW = molduraW - padFoto * 2
  const fotoAreaH = molduraH - padFoto * 2 - espacoAssinatura

  // Fundo creme atrás da foto — preenche eventual letterbox em fotos retrato/paisagem
  ctx.fillStyle = '#e9e0d2'
  ctx.fillRect(fotoAreaX, fotoAreaY, fotoAreaW, fotoAreaH)

  // Aspect-fit: a foto inteira cabe dentro da área, sem cortes.
  const proporcaoImg = imagem.width / imagem.height
  const proporcaoArea = fotoAreaW / fotoAreaH
  let desenhaW = fotoAreaW
  let desenhaH = fotoAreaH
  if (proporcaoImg > proporcaoArea) {
    desenhaH = fotoAreaW / proporcaoImg
  } else {
    desenhaW = fotoAreaH * proporcaoImg
  }
  const desenhaX = fotoAreaX + (fotoAreaW - desenhaW) / 2
  const desenhaY = fotoAreaY + (fotoAreaH - desenhaH) / 2
  ctx.drawImage(imagem, desenhaX, desenhaY, desenhaW, desenhaH)

  // Assinatura do autor dentro da moldura (estilo polaroid)
  ctx.fillStyle = VINHO
  ctx.font = '600 34px "Playfair Display", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const assinaturaY = molduraY + molduraH - espacoAssinatura / 2
  ctx.fillText(memoria.nome, W / 2, assinaturaY)

  // --- Relato (citação em itálico) --------------------------------------
  y = molduraY + molduraH + 60

  ctx.fillStyle = MARFIM
  ctx.font = 'italic 500 36px "Playfair Display", serif'
  ctx.textBaseline = 'top'
  const aspas = `“${memoria.relato.trim()}”`
  const linhaH = 50
  const larguraTexto = W - 160
  const linhas = quebrarTexto(ctx, aspas, larguraTexto, 5)
  for (const linha of linhas) {
    ctx.fillText(linha, W / 2, y)
    y += linhaH
  }

  // --- Rodapé: data + faixa dourada -------------------------------------
  ctx.fillStyle = DOURADO_CLARO
  ctx.font = '500 24px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(formatarData(memoria.criado_em), W / 2, H - 96)

  ctx.fillStyle = DOURADO
  ctx.fillRect(0, H - 10, W, 10)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível gerar a imagem do story.'))
      },
      'image/png',
      0.95,
    )
  })
}

// Baixa um blob como arquivo no computador do usuário.
export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Indica se o navegador suporta compartilhar arquivos via API nativa
// (ex.: abrir a folha do iOS/Android com Instagram, WhatsApp etc.).
export function podeCompartilharArquivo(blob: Blob, nomeArquivo: string): boolean {
  if (typeof navigator === 'undefined' || !('share' in navigator)) return false
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' })
  return navigator.canShare?.({ files: [arquivo] }) ?? false
}

// Compartilha via API nativa. Devolve true se a partilha aconteceu, false se o
// usuário cancelou. Lança erro em outras falhas para o chamador exibir.
export async function compartilharBlob(
  blob: Blob,
  nomeArquivo: string,
): Promise<boolean> {
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' })
  try {
    await navigator.share({
      files: [arquivo],
      title: 'Relatos de Afeto',
      text: 'Memórias do Servir — LEO Clube',
    })
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false
    throw e
  }
}
