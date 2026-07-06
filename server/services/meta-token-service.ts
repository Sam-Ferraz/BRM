/**
 * MetaTokenService — cuida da lógica de transformação de tokens do Meta pra
 * garantir que a integração de leads NUNCA expire.
 *
 * Contexto — como o Meta expira tokens (importantíssimo):
 *   • User Access Token curto (do Graph API Explorer): expira em ~1-2h
 *   • User Access Token long-lived: expira em 60 dias
 *   • Page Access Token gerado a partir de User CURTO: expira em ~1-2h
 *   • Page Access Token gerado a partir de User LONG-LIVED: NUNCA EXPIRA
 *
 * Solução: quando o admin cadastra uma integração Meta e cola qualquer token,
 * o backend:
 *   1. Descobre o tipo do token via /debug_token
 *   2. Se for USER TOKEN → converte pra long-lived → chama /me/accounts
 *      → filtra pela page_id configurada → devolve o Page Access Token PERMANENTE
 *   3. Se já for PAGE TOKEN PERMANENTE → devolve como está
 *   4. Se for PAGE TOKEN curto (sem user token de origem) → erro claro:
 *      "cole o User Access Token, não o Page — sem o User não consigo gerar
 *      um token permanente"
 *
 * Assim o admin cola o token que ele gerou no Graph API Explorer sem se
 * preocupar com detalhes; o BRM lida com upgrade e persiste o permanente.
 */

const META_GRAPH_VERSION = 'v18.0'
const GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export interface DebugTokenInfo {
  type: 'USER' | 'PAGE' | 'APP' | string
  app_id?: string
  is_valid: boolean
  expires_at: number    // unix seconds; 0 = nunca expira
  scopes?: string[]
  user_id?: string
}

export interface PageTokenEntry {
  id: string
  name: string
  access_token: string
  tasks?: string[]
}

export class MetaTokenService {
  /**
   * Consulta o /debug_token pra descobrir tipo, validade e expiração.
   * Precisa passar um app_access_token (formato `${app_id}|${app_secret}`)
   * — que é uma credencial de app pura, sem precisar de user token.
   */
  async debugToken(inputToken: string, appId: string, appSecret: string): Promise<DebugTokenInfo> {
    const appAccessToken = `${appId}|${appSecret}`
    const url = `${GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(inputToken)}&access_token=${encodeURIComponent(appAccessToken)}`
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Meta debug_token falhou: ${res.status} ${err}`)
    }
    const body = (await res.json()) as { data?: any }
    const d = body.data || {}
    return {
      type: d.type,
      app_id: d.app_id,
      is_valid: !!d.is_valid,
      expires_at: typeof d.expires_at === 'number' ? d.expires_at : 0,
      scopes: Array.isArray(d.scopes) ? d.scopes : undefined,
      user_id: d.user_id,
    }
  }

  /**
   * Troca User Token curto por User Token long-lived (60 dias).
   * Só faz sentido chamar quando o debug_token indicou que é USER.
   */
  async exchangeForLongLivedUserToken(shortUserToken: string, appId: string, appSecret: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortUserToken,
    })
    const url = `${GRAPH_BASE}/oauth/access_token?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Meta exchange long-lived falhou: ${res.status} ${err}`)
    }
    const body = (await res.json()) as { access_token: string; token_type?: string; expires_in?: number }
    if (!body.access_token) throw new Error('Meta não devolveu access_token no exchange')
    return body.access_token
  }

  /**
   * Chama /me/accounts com o long-lived user token. Cada Page listada vem com
   * seu Page Access Token PERMANENTE (não expira, é a mágica desse fluxo).
   */
  async listPagesWithTokens(userToken: string): Promise<PageTokenEntry[]> {
    const url = `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,tasks`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` } })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Meta me/accounts falhou: ${res.status} ${err}`)
    }
    const body = (await res.json()) as { data?: PageTokenEntry[] }
    return Array.isArray(body.data) ? body.data : []
  }

  /**
   * O fluxo completo: recebe qualquer token do usuário + page_id alvo + credenciais
   * do app. Devolve um Page Access Token PERMANENTE pronto pra persistir.
   *
   * Se o token já for permanente e da page certa, devolve como está.
   * Se for user curto/long-lived, converte e extrai o page token permanente.
   * Se for page curto (sem user token de origem), lança erro pedindo user token.
   */
  async upgradeToPermanentPageToken(input: {
    inputToken: string
    pageId: string
    appId: string
    appSecret: string
  }): Promise<{ token: string; page_name: string; upgraded: boolean }> {
    const { inputToken, pageId, appId, appSecret } = input

    if (!pageId) {
      throw new Error('page_id é obrigatório pra fazer upgrade do token')
    }

    // 1. Descobre o tipo do token
    let info: DebugTokenInfo
    try {
      info = await this.debugToken(inputToken, appId, appSecret)
    } catch (err) {
      // Sem debug_token não conseguimos decidir com segurança — melhor abortar
      throw new Error(
        `Não consegui inspecionar o token no Meta. Verifica se App ID e App Secret estão corretos. Detalhe: ${(err as Error).message}`
      )
    }

    if (!info.is_valid) {
      throw new Error('Token inválido ou expirado. Gera um novo no Graph API Explorer e cola aqui.')
    }

    // 2. Se já é PAGE token permanente (expires_at=0), usa direto
    if (info.type === 'PAGE' && info.expires_at === 0) {
      return { token: inputToken, page_name: '(page)', upgraded: false }
    }

    // 3. Se é PAGE token temporário → sem User Token não dá pra converter
    if (info.type === 'PAGE') {
      throw new Error(
        'Você colou um Page Access Token temporário (expira em ~1h). Pra ficar permanente, cole o USER Access Token (do Graph API Explorer) — o BRM converte automaticamente pra Page Token que nunca expira.'
      )
    }

    // 4. É USER token — converte pra long-lived se necessário e extrai o page token
    let longLivedUserToken = inputToken
    // Se expira em menos de 55 dias, faz o exchange pra garantir 60 dias
    const secondsToExpiry = info.expires_at ? (info.expires_at - Math.floor(Date.now() / 1000)) : 0
    if (info.expires_at !== 0 && secondsToExpiry < 55 * 24 * 60 * 60) {
      longLivedUserToken = await this.exchangeForLongLivedUserToken(inputToken, appId, appSecret)
    }

    // 5. Lista pages disponíveis (cada uma com Page Token PERMANENTE)
    const pages = await this.listPagesWithTokens(longLivedUserToken)
    if (pages.length === 0) {
      throw new Error(
        'O User Token não deu acesso a nenhuma Page. Verifica se você foi adicionado como admin da Page do cliente e se as permissões pages_show_list/pages_manage_metadata/leads_retrieval foram concedidas.'
      )
    }

    const match = pages.find((p) => p.id === pageId)
    if (!match) {
      const available = pages.map((p) => `${p.name} (${p.id})`).join(', ')
      throw new Error(
        `Page ID ${pageId} não foi encontrada nas pages do seu User Token. Pages disponíveis: ${available}`
      )
    }

    if (!match.access_token) {
      throw new Error(`Page "${match.name}" achada mas não veio Page Access Token — falta permissão pages_show_list ou pages_manage_metadata.`)
    }

    return { token: match.access_token, page_name: match.name, upgraded: true }
  }
}
