// ============================================================================
//  Cabeçalho do site — título e subtítulo
// ============================================================================

export function Cabecalho() {
  return (
    <header className="cabecalho">
      <div className="cabecalho-conteudo">
        {/* Emblema da Assessoria Leoística 25/26: "Líderes Singulares". */}
        <img
          className="cabecalho-emblema"
          src="/logo-al-25-26.png"
          alt="Líderes Singulares — AL 25/26"
        />

        {/* Pequeno selo decorativo acima do título. */}
        <span className="cabecalho-selo">LEO Clube Ômega Pinhalzinho</span>

        <h1 className="cabecalho-titulo">
          Relatos de Afeto
          <span className="cabecalho-subtitulo-serif">Memórias do Servir</span>
        </h1>

        <p className="cabecalho-descricao">
          Um mural coletivo onde cada companheiro guarda uma fotografia e conta
          por que aquele momento de voluntariado ficou marcado no coração.
        </p>

        <span className="cabecalho-subtitulo">Proposta da diretoria de Instrução Leoística</span>
      </div>
    </header>
  )
}
