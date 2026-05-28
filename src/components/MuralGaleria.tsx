// ============================================================================
//  Mural — a grade de cards com todas as memórias
// ----------------------------------------------------------------------------
//  Cuida apenas de exibir a lista. Os estados de carregando/erro/vazio também
//  são tratados aqui para deixar o componente App mais simples.
// ============================================================================

import type { Memoria } from '../types'
import { CardMemoria } from './CardMemoria'

interface Props {
  memorias: Memoria[]
  carregando: boolean
  erro: string | null
  onAdicionar: () => void // chamado quando o usuário quer adicionar a 1ª memória
  onAtualizada: (memoria: Memoria) => void
}

export function MuralGaleria({
  memorias,
  carregando,
  erro,
  onAdicionar,
  onAtualizada,
}: Props) {
  // Enquanto as memórias estão sendo buscadas no servidor.
  if (carregando) {
    return <p className="aviso">Carregando o mural…</p>
  }

  // Se houve algum problema ao falar com a API.
  if (erro) {
    return <p className="aviso aviso-erro">{erro}</p>
  }

  // Quando ainda não existe nenhuma memória cadastrada.
  if (memorias.length === 0) {
    return (
      <div className="vazio">
        <p className="vazio-titulo">O mural ainda está vazio</p>
        <p className="vazio-texto">
          Seja o primeiro a compartilhar uma lembrança do servir.
        </p>
        <button type="button" className="botao-primario" onClick={onAdicionar}>
          Adicionar a primeira memória
        </button>
      </div>
    )
  }

  // O mural propriamente dito: uma grade de cards.
  return (
    <section className="grade" aria-label="Memórias do mural">
      {memorias.map((memoria) => (
        <CardMemoria
          key={memoria.id}
          memoria={memoria}
          onAtualizada={onAtualizada}
        />
      ))}
    </section>
  )
}
