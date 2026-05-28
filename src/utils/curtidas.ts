// ============================================================================
//  Controle local de quais memórias o usuário já curtiu
// ----------------------------------------------------------------------------
//  Como o app não tem login, guardamos no localStorage do navegador a lista de
//  IDs já curtidos. O backend é só um contador agnóstico (incrementa /
//  decrementa). Cada navegador conta como um "usuário" para fins de curtida.
// ============================================================================

const CHAVE = 'mural-leo:curtidas'

function carregar(): Set<string> {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return new Set()
    const ids = JSON.parse(bruto)
    return Array.isArray(ids) ? new Set(ids) : new Set()
  } catch {
    return new Set()
  }
}

function salvar(ids: Set<string>): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify([...ids]))
  } catch {
    // localStorage cheio ou indisponível (modo anônimo restrito) — silencia.
  }
}

export function jaCurtiu(id: string): boolean {
  return carregar().has(id)
}

export function marcarComoCurtida(id: string): void {
  const ids = carregar()
  ids.add(id)
  salvar(ids)
}

export function desmarcarCurtida(id: string): void {
  const ids = carregar()
  ids.delete(id)
  salvar(ids)
}
