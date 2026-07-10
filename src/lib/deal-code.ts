/**
 * Código curto e humano de Negócio — usado quando o corretor precisa se
 * referir a um Deal falando em áudio ou digitando rápido em um formulário.
 *
 * Formato: "N-XXXX" onde XXXX é o id do Deal com padding de 4 dígitos.
 * Exemplo: Deal id=42 → "N-0042"; Deal id=12345 → "N-12345"
 *
 * Derivamos direto do id, sem coluna nova no banco. Prós: zero migration,
 * zero risco de código órfão; contras: se um dia quisermos códigos custom
 * por conta do corretor, precisaremos migrar. Fica pra outro momento.
 */

const PREFIX = "N-"
const MIN_PAD = 4

export function formatDealCode(id: number | null | undefined): string {
  if (id == null || Number.isNaN(id) || id <= 0) return ""
  return `${PREFIX}${String(id).padStart(MIN_PAD, "0")}`
}

/**
 * Tenta extrair o id de um Deal a partir de um texto. Aceita:
 *   - "N-0042", "N-42", "n-42"  → 42
 *   - "N 0042", "n0042"          → 42
 *   - "0042", "42"               → 42 (fallback: só dígitos)
 *   - "atendimento no N-0042 pra checar"  → 42 (extração dentro de frase)
 *
 * Retorna null se nada plausível for encontrado. Usado tanto no campo manual
 * do form quanto na detecção automática do transcript da gravação.
 */
export function parseDealCode(input: string | null | undefined): number | null {
  if (!input) return null
  const clean = input.trim()
  if (!clean) return null

  const withPrefix = clean.match(/n[\s\-_]*0*(\d+)/i)
  if (withPrefix) {
    const n = parseInt(withPrefix[1], 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const digitsOnly = clean.match(/^0*(\d+)$/)
  if (digitsOnly) {
    const n = parseInt(digitsOnly[1], 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  return null
}

/**
 * Varre um bloco de texto (ex: transcrição do áudio) e devolve o PRIMEIRO
 * código de Negócio mencionado, se houver. Case-insensitive.
 */
export function extractDealCodeFromText(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.match(/\bn[\s\-_]*0*(\d+)/i)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
