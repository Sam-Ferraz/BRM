/**
 * Código curto e humano de Negócio — usado quando o corretor precisa se
 * referir a um Deal falando em áudio ou digitando rápido em um formulário.
 *
 * Formato: "NXXXX" onde XXXX é o id do Deal com padding de 4 dígitos.
 * Exemplo: Deal id=1 → "N0001"; Deal id=12345 → "N12345"
 *
 * A numeração vem direto do id do banco (autoincrement), portanto respeita
 * a ordem de cadastro. Sem coluna nova: zero migration, zero risco de código
 * órfão.
 *
 * O parse abaixo é liberal — aceita "N0001", "N-0001", "N+0001", "N 0001"
 * e o "N mais zero zero um" que sai do transcript do Speech API — porque
 * é melhor achar demais do que fazer o corretor lembrar o formato exato.
 */

const PREFIX = "N"
const MIN_PAD = 4

export function formatDealCode(id: number | null | undefined): string {
  if (id == null || Number.isNaN(id) || id <= 0) return ""
  return `${PREFIX}${String(id).padStart(MIN_PAD, "0")}`
}

/**
 * Tenta extrair o id de um Deal a partir de um texto. Aceita:
 *   - "N0042", "n0042"                 → 42 (formato canônico atual)
 *   - "N+0042", "N-0042"               → 42 (formatos anteriores e transcrição)
 *   - "N 0042", "N mais 0042"          → 42 (fala transcrita)
 *   - "0042", "42"                     → 42 (fallback: só dígitos)
 *   - "atendimento no N0042 pra checar" → 42 (extração dentro de frase)
 *
 * Retorna null se nada plausível for encontrado. Usado tanto no campo manual
 * do form quanto na detecção automática do transcript da gravação.
 */
export function parseDealCode(input: string | null | undefined): number | null {
  if (!input) return null
  const clean = input.trim()
  if (!clean) return null

  // Aceita N+, N-, N espaço, "N mais" (transcrição do áudio) e N cru
  const withPrefix = clean.match(/n\s*(?:mais\s+)?[+\-_\s]*0*(\d+)/i)
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
 *
 * \bn — palavra começando com "n" — evita casar dentro de palavras comuns
 * em pt-BR (ex: "não", "nós", "nove").
 */
export function extractDealCodeFromText(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.match(/\bn\s*(?:mais\s+)?[+\-_\s]*0*(\d+)/i)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
