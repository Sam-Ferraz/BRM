/**
 * Adapter para diferentes plataformas de captação de leads.
 *
 * Cada plataforma (Meta, Google Ads, LinkedIn, webhook genérico) tem um
 * formato diferente de payload. Cada implementação extrai os campos
 * canônicos (name/email/phone + form_data completo) e devolve algo que o
 * LeadService consegue gravar diretamente.
 */

export interface NormalizedLead {
  external_id?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  form_data?: Record<string, any> | null
}

export interface LeadProvider {
  /**
   * Extrai 0..N leads de um payload bruto recebido no webhook.
   * Async porque algumas integrações (Meta) precisam fazer fetch adicional
   * via Graph API pra completar os dados antes de devolver.
   * Retornar array vazio se o payload não contiver leads válidos.
   */
  parsePayload(payload: any, config?: Record<string, any> | null): Promise<NormalizedLead[]>
}

// ===========================================================================
// MetaLeadProvider — Meta (Facebook/Instagram) Lead Ads
// ===========================================================================
//
// Aceita dois formatos de webhook:
//
//   • "Leadgen" do Webhooks da Page (formato nativo, recomendado pra produção):
//     Meta envia um pequeno payload só com leadgen_id, page_id e form_id.
//     O BRM precisa fazer GET na Graph API com o leadgen_id pra obter os
//     field_data reais (nome, email, telefone). Isso requer page_access_token
//     na config da source.
//
//   • Payload já expandido (formato Zapier/Make ou teste manual):
//     vem direto o JSON com {field_name, values: [...]}. Não requer access_token.
//     Útil pra testes e pra usuários que preferem usar Zapier no meio do
//     caminho.
//
// Suporta ambos: se vier expandido, processa direto; se vier só ID e tiver
// access_token na config, faz fetch via Graph API; se vier só ID e NÃO tiver
// access_token, registra um lead "magro" (só leadgen_id) que pode ser
// completado depois.
// ===========================================================================

const META_GRAPH_VERSION = 'v18.0'

export class MetaLeadProvider implements LeadProvider {
  async parsePayload(payload: any, config?: Record<string, any> | null): Promise<NormalizedLead[]> {
    const leads: NormalizedLead[] = []
    const accessToken = (config?.page_access_token as string) || (config?.access_token as string) || null

    // Forma 1: webhook nativo da Meta (notificação leve)
    //   { "object": "page", "entry": [{ "id": "<page_id>", "changes": [{
    //       "value": { "leadgen_id": "...", "page_id": "...", "form_id": "..." }
    //   }] }] }
    if (payload?.object === 'page' && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          if (change?.field !== 'leadgen' && change?.field !== undefined) continue
          const leadgenId = change?.value?.leadgen_id
          if (!leadgenId) continue

          if (accessToken) {
            // Faz fetch dos detalhes via Graph API. Em caso de falha,
            // grava o lead "magro" mesmo assim pra não perder o sinal.
            try {
              const details = await fetchLeadDetails(String(leadgenId), accessToken)
              leads.push(toNormalizedFromGraphResponse(details, String(leadgenId)))
              continue
            } catch (err) {
              console.error('[MetaLeadProvider] Falha no fetch Graph API:', err)
            }
          }

          // Sem token ou fetch falhou — registra lead apenas com leadgen_id
          leads.push({
            external_id: String(leadgenId),
            form_data: { meta_raw: change.value, _fetch_pending: !accessToken },
          })
        }
      }
      return leads
    }

    // Forma 2: payload já expandido (Zapier/Make/teste)
    //   { "leadgen_id": "...", "field_data": [{ "name": "full_name", "values": ["..."] }, ...] }
    // ou um array de leads.
    const items = Array.isArray(payload) ? payload : [payload]
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const fieldData = extractFieldData(item)
      if (!fieldData && !item.name && !item.email && !item.phone) continue

      const normalized: NormalizedLead = {
        external_id: item.leadgen_id || item.id || item.external_id || null,
        form_data: fieldData ? Object.fromEntries(fieldData) : (item as Record<string, any>),
      }
      normalized.name = pickFromFields(fieldData, ['full_name', 'name', 'nome'])
        ?? item.name ?? null
      normalized.email = pickFromFields(fieldData, ['email', 'e-mail'])
        ?? item.email ?? null
      normalized.phone = pickFromFields(fieldData, ['phone_number', 'phone', 'telefone', 'celular'])
        ?? item.phone ?? null

      leads.push(normalized)
    }
    return leads
  }
}

/**
 * GET /{leadgen-id}?access_token={page-access-token}&fields=field_data,created_time,form_id,ad_id
 * Resposta: { id, field_data: [...], created_time, form_id, ad_id }
 */
async function fetchLeadDetails(leadgenId: string, accessToken: string): Promise<any> {
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${leadgenId}?fields=field_data,created_time,form_id,ad_id,campaign_id,adset_id,is_organic`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    throw new Error(
      `Graph API ${response.status}: ${(errBody as any)?.error?.message || response.statusText}`
    )
  }
  return response.json()
}

function toNormalizedFromGraphResponse(details: any, leadgenId: string): NormalizedLead {
  const fieldData = extractFieldData(details)
  return {
    external_id: details.id || leadgenId,
    name: pickFromFields(fieldData, ['full_name', 'name', 'nome']) ?? null,
    email: pickFromFields(fieldData, ['email', 'e-mail']) ?? null,
    phone: pickFromFields(fieldData, ['phone_number', 'phone', 'telefone', 'celular']) ?? null,
    form_data: {
      ...(fieldData ? Object.fromEntries(fieldData) : {}),
      _meta: {
        leadgen_id: details.id,
        created_time: details.created_time,
        form_id: details.form_id,
        ad_id: details.ad_id,
        campaign_id: details.campaign_id,
        adset_id: details.adset_id,
        is_organic: details.is_organic,
      },
    },
  }
}

// ===========================================================================
// GenericWebhookLeadProvider — aceita qualquer JSON
// ===========================================================================
//
// Útil para receber leads de ferramentas próprias / formulários do site /
// integrações intermediárias que não seguem o formato Meta. Aceita um único
// objeto ou um array, e tenta extrair name/email/phone heuristicamente.

export class GenericWebhookLeadProvider implements LeadProvider {
  async parsePayload(payload: any): Promise<NormalizedLead[]> {
    const items = Array.isArray(payload) ? payload : [payload]
    const leads: NormalizedLead[] = []
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      leads.push({
        external_id: item.id || item.external_id || null,
        name: item.name || item.nome || item.full_name || null,
        email: item.email || item['e-mail'] || null,
        phone: item.phone || item.telefone || item.celular || null,
        form_data: item,
      })
    }
    return leads
  }
}

// ===========================================================================
// Helpers
// ===========================================================================

function extractFieldData(item: any): [string, string][] | null {
  // Meta envia: [{ name: 'full_name', values: ['João da Silva'] }, ...]
  if (!Array.isArray(item?.field_data)) return null
  const pairs: [string, string][] = []
  for (const f of item.field_data) {
    if (!f?.name) continue
    const value = Array.isArray(f.values) ? f.values[0] : f.value
    if (value !== undefined && value !== null) {
      pairs.push([String(f.name).toLowerCase(), String(value)])
    }
  }
  return pairs
}

function pickFromFields(fields: [string, string][] | null, keys: string[]): string | null {
  if (!fields) return null
  for (const key of keys) {
    const match = fields.find(([k]) => k === key)
    if (match) return match[1]
  }
  return null
}

// ===========================================================================
// Registry — escolhe o provider apropriado pelo tipo da fonte
// ===========================================================================

export function getProviderForType(type: string): LeadProvider {
  switch (type) {
    case 'meta':
      return new MetaLeadProvider()
    case 'webhook_generic':
    case 'manual':
    default:
      return new GenericWebhookLeadProvider()
  }
}
