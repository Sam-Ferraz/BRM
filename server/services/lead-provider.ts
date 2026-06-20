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
   * Meta pode enviar um array de "entry"; outros podem enviar um por request.
   * Retornar array vazio se o payload não contiver leads válidos.
   */
  parsePayload(payload: any, config?: Record<string, any> | null): NormalizedLead[]
}

// ===========================================================================
// MetaLeadProvider — Meta (Facebook/Instagram) Lead Ads
// ===========================================================================
//
// O Meta envia leads via webhook em dois formatos principais:
//
//   • "Leadgen" do Webhooks da página: notificação leve com leadgen_id, depois
//     o BRM precisa chamar Graph API para buscar os field_data. Esse caminho
//     requer access_token e está implementado aqui de forma simplificada
//     (apenas registra o leadgen_id; fetch dos detalhes é TODO).
//
//   • Payload já expandido (via Zapier / Make / integrações intermediárias):
//     vem direto o JSON com {field_name, values: [...]}. Esse caminho é o
//     mais simples e o que recomendamos para começar.
//
// Suportamos ambos sem precisar de token Meta colado: se vier expandido,
// processa direto; se vier só o ID, ignora silenciosamente (registra log).
// ===========================================================================

export class MetaLeadProvider implements LeadProvider {
  parsePayload(payload: any): NormalizedLead[] {
    const leads: NormalizedLead[] = []

    // Forma 1: webhook nativo da Meta (sem expandir)
    //   { "object": "page", "entry": [{ "changes": [{ "value": { "leadgen_id": "..." } }] }] }
    if (payload?.object === 'page' && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          const leadgenId = change?.value?.leadgen_id
          if (leadgenId) {
            // Sem expansão via Graph API, apenas guardamos o id. O usuário
            // pode complementar manualmente ou configurar Zapier para
            // expandir antes de enviar.
            leads.push({
              external_id: String(leadgenId),
              form_data: { meta_raw: change.value },
            })
          }
        }
      }
      return leads
    }

    // Forma 2: payload já expandido (Zapier/Make ou teste manual)
    //   { "leadgen_id": "...", "field_data": [{ "name": "full_name", "values": ["João"] }, ...] }
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

// ===========================================================================
// GenericWebhookLeadProvider — aceita qualquer JSON
// ===========================================================================
//
// Útil para receber leads de ferramentas próprias / formulários do site /
// integrações intermediárias que não seguem o formato Meta. Aceita um único
// objeto ou um array, e tenta extrair name/email/phone heuristicamente.

export class GenericWebhookLeadProvider implements LeadProvider {
  parsePayload(payload: any): NormalizedLead[] {
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
