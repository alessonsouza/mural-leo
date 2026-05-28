// ============================================================================
//  App — componente principal do site
// ----------------------------------------------------------------------------
//  Junta todas as partes: cabeçalho, mural de memórias e o modal de adicionar.
//  Também guarda o estado geral: a lista de memórias e se o modal está aberto.
// ============================================================================

import { useEffect, useState } from 'react'
import { Cabecalho } from './components/Cabecalho'
import { MuralGaleria } from './components/MuralGaleria'
import { ModalNovaMemoria } from './components/ModalNovaMemoria'
import { listarMemorias } from './api'
import type { Memoria } from './types'

function App() {
  // Lista de memórias exibidas no mural.
  const [memorias, setMemorias] = useState<Memoria[]>([])
  // Indica se as memórias ainda estão sendo carregadas do servidor.
  const [carregando, setCarregando] = useState(true)
  // Mensagem de erro de carregamento, se houver.
  const [erro, setErro] = useState<string | null>(null)
  // Controla a abertura do modal "Adicionar memória".
  const [modalAberto, setModalAberto] = useState(false)

  // Ao abrir o site, busca as memórias já cadastradas.
  useEffect(() => {
    listarMemorias()
      .then((dados) => setMemorias(dados))
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao carregar o mural.'),
      )
      .finally(() => setCarregando(false))
  }, [])

  // Quando uma nova memória é criada no modal, ela entra no topo do mural.
  function aoCriarMemoria(nova: Memoria) {
    setMemorias((anteriores) => [nova, ...anteriores])
    setModalAberto(false)
  }

  // Substitui uma memória existente pela versão atualizada (após edição).
  function aoAtualizarMemoria(atualizada: Memoria) {
    setMemorias((anteriores) =>
      anteriores.map((m) => (m.id === atualizada.id ? atualizada : m)),
    )
  }

  return (
    <div className="pagina">
      <Cabecalho />

      <main className="conteudo">
        <MuralGaleria
          memorias={memorias}
          carregando={carregando}
          erro={erro}
          onAdicionar={() => setModalAberto(true)}
          onAtualizada={aoAtualizarMemoria}
        />
      </main>

      <footer className="rodape-site">
        Feito com afeto pelos companheiros do LEO Clube Ômega Pinhalzinho 💛
      </footer>

      {/* Botão flutuante sempre visível para adicionar uma nova memória. */}
      <button
        type="button"
        className="botao-flutuante"
        onClick={() => setModalAberto(true)}
      >
        <span className="botao-flutuante-mais" aria-hidden="true">
          +
        </span>
        Adicionar memória
      </button>

      {/* O modal só aparece quando "modalAberto" é verdadeiro. */}
      {modalAberto && (
        <ModalNovaMemoria
          onFechar={() => setModalAberto(false)}
          onCriada={aoCriarMemoria}
        />
      )}
    </div>
  )
}

export default App
