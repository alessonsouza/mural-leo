// ============================================================================
//  Tipos de dados compartilhados pelo site
// ============================================================================

// Representa uma memória do mural — exatamente como o backend a devolve.
export interface Memoria {
  id: string
  nome: string // nome do companheiro que postou
  relato: string // por que a foto é importante
  imagem_url: string // endereço público da foto
  criado_em: string // data/hora da publicação (formato ISO)
}
