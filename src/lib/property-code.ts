/**
 * Código curto do Imóvel (Product) — número sequencial pela ordem de cadastro.
 *
 * Formato: "001", "002", ..., "999", "1000", ... — três dígitos como mínimo,
 * cresce naturalmente depois. Vem do id do banco (autoincrement), então
 * respeita a ordem de cadastro.
 *
 * Sem prefixo — o usuário pediu formato bruto ("001", "002 assim sucessivamente").
 */

const MIN_PAD = 3

export function formatPropertyCode(id: number | null | undefined): string {
  if (id == null || Number.isNaN(id) || id <= 0) return ""
  return String(id).padStart(MIN_PAD, "0")
}

export function parsePropertyCode(input: string | null | undefined): number | null {
  if (!input) return null
  const clean = input.trim()
  if (!clean) return null
  const match = clean.match(/^0*(\d+)$/)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
