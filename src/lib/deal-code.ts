/**
 * Código curto e humano de Negócio — usado quando o corretor precisa se
 * referir a um Deal falando em áudio ou digitando rápido em um formulário.
 *
 * Formato: "N+XXXX" onde XXXX é o id do Deal com padding de 4 dígitos.
 * Exemplo: Deal id=1 → "N+0001"; Deal id=12345 → "N+12345"
 *
 * A numeração vem direto do id do banco (autoincrement), portanto respeita
 * a ordem de cadastro. Sem coluna nova: zero migration, zero risco de código
 * órfão.
 *
 * Sobre o "+" no separador:
 *   - Em URLs, "+" precisa ser encoded. Por isso NÃO usamos o código em
 *     query strings — sempre passamos o id numérico pra APIs.
 *   - Em regex, "+" é quantifier — escapamos onde precisa.
 *   - No áudio, o corretor fala "N mais zero zero um" e o Speech API
 *     transcreve como "N mais 0001" / "N+0001" / "N + 0001" — a extração
 *     abaixo aceita todas essas variações.
 */

const PREFIX = "N+"
const MIN_PAD = 4

export function formatDealCode(id: number | null | undefined): string {
  if (id == null || Number.isNaN(id) || id <= 0) return ""
  return `${PREFIX}${String(id).padStart(MIN_PAD, "0")}`
}

/**
 * Tenta extrair o id de um Deal a partir de um texto. Aceita:
 *   - "N+0042", "N+42", "n+42"        → 42
 *   - "N-0042", "N-42"                 → 42 (formato legado)
 *   - "N 0042", "N mais 0042", "n0042" → 42
 *   - "0042", "42"                     → 42 (fallback: só dígitos)
 *   - "atendimento no N+0042 pra checar"  → 42 (extração dentro de frase)
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
