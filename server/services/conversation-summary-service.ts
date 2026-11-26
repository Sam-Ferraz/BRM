import type { Pool } from 'pg'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

/**
 * ConversationSummaryService — gera resumos automáticos das conversas de
 * WhatsApp e insere na linha do tempo do negócio como atendimento.
 *
 * Como funciona:
 *   1. Cron chama runCycle() a cada N minutos (default 5).
 *   2. Serviço varre conversas cujo last_message_at já passou de 15 minutos
 *      (pausa detectada) E cujo last_summary_at está desatualizado.
 *   3. Pega as mensagens desde o último resumo (ou meia-noite local se nunca
 *      resumido), transcreve áudios inbound via Whisper e gera um resumo
 *      curto com Haiku.
 *   4. Cria um Appointment (type='chat', answered=true) vinculado ao deal
 *      mais recente do mesmo client_phone, marcando scheduled_datetime como
 *      o horário da última mensagem da janela.
 *   5. Atualiza conversations.last_summary_at pra evitar duplicata.
 *
 * Configuração via env:
 *   ANTHROPIC_API_KEY  — obrigatória (sem ela o serviço roda em dry-run log)
 *   OPENAI_API_KEY     — opcional (sem ela, áudios são ignorados)
 *   SUMMARY_PAUSE_MIN  — opcional, pausa mínima pra disparar (default 15)
 *   SUMMARY_MODEL      — opcional (default claude-haiku-5-5)
 *   SUMMARY_TIMEZONE   — opcional, pra janela "desde meia-noite" (default America/Sao_Paulo)
 */

interface ConversationRow {
  id: number
  account_id: number
  owner_user_id: number
  client_id: number | null
  contact_phone: string
  contact_name: string | null
  last_message_at: string
  last_summary_at: string | null
}

interface MessageRow {
  id: number
  direction: 'inbound' | 'outbound'
  content: string
  media_url: string | null
  sent_at: string
}

export class ConversationSummaryService {
  private readonly pool: Pool
  private readonly anthropic: Anthropic | null
  private readonly openai: OpenAI | null
  private readonly pauseMinutes: number
  private readonly model: string
  private readonly timezone: string
  private running = false

  constructor(pool: Pool) {
    this.pool = pool
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null
    this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null
    this.pauseMinutes = Number(process.env.SUMMARY_PAUSE_MIN ?? '15')
    this.model = process.env.SUMMARY_MODEL ?? 'claude-haiku-5-5'
    this.timezone = process.env.SUMMARY_TIMEZONE ?? 'America/Sao_Paulo'
  }

  /**
   * Executa um ciclo. Idempotente — se outro ciclo ainda estiver rodando,
   * retorna sem fazer nada (overlap entre crons deixa o banco inconsistente).
   */
  async runCycle(): Promise<{ processed: number; summarized: number; errors: number }> {
    if (this.running) {
      console.log('[summary] ciclo anterior ainda rodando — pulando')
      return { processed: 0, summarized: 0, errors: 0 }
    }
    if (!this.anthropic) {
      console.log('[summary] ANTHROPIC_API_KEY ausente — serviço em modo observação')
      return { processed: 0, summarized: 0, errors: 0 }
    }

    this.running = true
    let processed = 0
    let summarized = 0
    let errors = 0

    try {
      const conversations = await this.findConversationsNeedingSummary()
      console.log(`[summary] ${conversations.length} conversas elegíveis`)

      for (const conv of conversations) {
        processed++
        try {
          const since = conv.last_summary_at
            ? new Date(conv.last_summary_at)
            : this.midnightLocal()
          const messages = await this.getMessagesForSummary(conv.id, conv.account_id, since)
          if (messages.length === 0) {
            await this.markSummarized(conv.id, conv.last_message_at)
            continue
          }

          // Transcreve áudios inbound em paralelo (até 3 por vez)
          const transcripts = this.openai
            ? await this.transcribeAudios(messages)
            : new Map<number, string>()

          const summary = await this.generateSummary(conv, messages, transcripts)
          if (!summary) {
            await this.markSummarized(conv.id, conv.last_message_at)
            continue
          }

          const dealId = await this.findDealForConversation(conv)
          await this.createAppointment(conv, summary, dealId)
          await this.markSummarized(conv.id, conv.last_message_at)
          summarized++
        } catch (err) {
          errors++
          console.warn(`[summary] erro na conversa ${conv.id}:`, err instanceof Error ? err.message : err)
        }
      }
    } finally {
      this.running = false
    }

    if (processed > 0) {
      console.log(`[summary] ciclo concluído: ${summarized}/${processed} resumidas, ${errors} erros`)
    }
    return { processed, summarized, errors }
  }

  /**
   * Conversas elegíveis: tiveram mensagem há mais de pauseMinutes atrás,
   * mas ainda recentes (últimas 24h — resumos antigos não têm valor),
   * e o último resumo é anterior à última mensagem.
   */
  private async findConversationsNeedingSummary(): Promise<ConversationRow[]> {
    const res = await this.pool.query<ConversationRow>(
      `SELECT id, account_id, owner_user_id, client_id, contact_phone,
              contact_name, last_message_at, last_summary_at
         FROM conversations
        WHERE last_message_at IS NOT NULL
          AND last_message_at < NOW() - make_interval(mins => $1)
          AND last_message_at > NOW() - INTERVAL '24 hours'
          AND (last_summary_at IS NULL OR last_summary_at < last_message_at)
        ORDER BY last_message_at DESC
        LIMIT 50`,
      [this.pauseMinutes]
    )
    return res.rows
  }

  private async getMessagesForSummary(
    conversationId: number,
    accountId: number,
    since: Date
  ): Promise<MessageRow[]> {
    const res = await this.pool.query<MessageRow>(
      `SELECT id, direction, content, media_url, sent_at
         FROM messages
        WHERE conversation_id = $1
          AND account_id = $2
          AND sent_at > $3
        ORDER BY sent_at ASC
        LIMIT 500`,
      [conversationId, accountId, since.toISOString()]
    )
    return res.rows
  }

  /**
   * Transcreve áudios inbound da janela (OpenAI Whisper). Só áudios de
   * clientes — áudios outbound já têm o texto que o corretor digitou.
   */
  private async transcribeAudios(messages: MessageRow[]): Promise<Map<number, string>> {
    const result = new Map<number, string>()
    if (!this.openai) return result

    const audios = messages.filter(
      (m) => m.direction === 'inbound' && m.media_url && this.looksLikeAudio(m.media_url)
    )
    // Concorrência limitada — Whisper aceita ~50 RPM na tier default
    for (const msg of audios) {
      try {
        const url = this.absoluteMediaUrl(msg.media_url!)
        const audioRes = await fetch(url)
        if (!audioRes.ok) continue
        const blob = await audioRes.blob()
        const file = new File([blob], `audio-${msg.id}.ogg`, { type: blob.type || 'audio/ogg' })
        const transcript = await this.openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language: 'pt',
        })
        if (transcript.text?.trim()) {
          result.set(msg.id, transcript.text.trim())
        }
      } catch (err) {
        console.warn(`[summary] falha ao transcrever msg ${msg.id}:`, err instanceof Error ? err.message : err)
      }
    }
    return result
  }

  private looksLikeAudio(mediaUrl: string): boolean {
    const u = mediaUrl.toLowerCase()
    return u.endsWith('.ogg') || u.endsWith('.opus') || u.endsWith('.mp3') || u.endsWith('.m4a') || u.endsWith('.wav') || u.includes('audio')
  }

  private absoluteMediaUrl(mediaUrl: string): string {
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl
    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`
    return `${base}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`
  }

  /**
   * Chama Claude Haiku pra gerar resumo curto (2-3 frases) focado em:
   * o que foi tratado, próximo passo esperado, sinais de interesse.
   */
  private async generateSummary(
    conv: ConversationRow,
    messages: MessageRow[],
    transcripts: Map<number, string>
  ): Promise<string | null> {
    if (!this.anthropic) return null

    const contactLabel = conv.contact_name || conv.contact_phone
    const lines = messages.map((m) => {
      const who = m.direction === 'inbound' ? contactLabel : 'Corretor'
      let body = m.content?.trim() || ''
      const transcript = transcripts.get(m.id)
      if (transcript) {
        body = body ? `${body} [áudio: ${transcript}]` : `[áudio: ${transcript}]`
      } else if (m.media_url && !body) {
        body = `[mídia: ${m.media_url}]`
      }
      return `${who}: ${body}`
    }).join('\n')

    const prompt = `Você é um assistente que resume conversas de WhatsApp entre corretor imobiliário e cliente.

Leia a conversa abaixo e produza um RESUMO CURTO (máximo 3 frases, no máximo 350 caracteres) em português do Brasil, focando em:
- O que foi tratado nesta conversa
- Interesse demonstrado pelo cliente (se houver)
- Próximo passo esperado (se houver)

Se a conversa for só saudação ou irrelevante (ex: "oi", "obrigado"), responda apenas: SKIP

Conversa:
${lines}

Resumo:`

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      const text = textBlock && 'text' in textBlock ? textBlock.text.trim() : ''
      if (!text || text.toUpperCase().startsWith('SKIP')) return null
      return text
    } catch (err) {
      console.warn('[summary] falha na chamada Anthropic:', err instanceof Error ? err.message : err)
      return null
    }
  }

  /**
   * Procura o deal mais recente do mesmo client_phone. Nome do cliente
   * pode variar; telefone é a chave mais estável. Qualquer status conta
   * (conforme decisão do produto).
   */
  private async findDealForConversation(conv: ConversationRow): Promise<number | null> {
    if (!conv.contact_phone) return null
    const res = await this.pool.query<{ id: number }>(
      `SELECT id FROM deals
        WHERE account_id = $1
          AND client_phone = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [conv.account_id, conv.contact_phone]
    )
    return res.rows[0]?.id ?? null
  }

  private async createAppointment(
    conv: ConversationRow,
    summary: string,
    dealId: number | null
  ): Promise<void> {
    const scheduled = conv.last_message_at
    const client = conv.contact_name || conv.contact_phone
    await this.pool.query(
      `INSERT INTO appointments (
         account_id, client, type, scheduled_datetime, description,
         answered, property_name, user_id, audio_url, deal_id,
         schedule_action
       ) VALUES ($1, $2, 'chat', $3, $4, true, NULL, $5, NULL, $6, NULL)`,
      [conv.account_id, client, scheduled, `[Resumo automático] ${summary}`, conv.owner_user_id, dealId]
    )
  }

  private async markSummarized(conversationId: number, lastMessageAt: string): Promise<void> {
    await this.pool.query(
      `UPDATE conversations SET last_summary_at = $1 WHERE id = $2`,
      [lastMessageAt, conversationId]
    )
  }

  /**
   * Meia-noite local da timezone configurada (America/Sao_Paulo por default).
   * Usado como ancora quando conversa nunca foi resumida ainda.
   */
  private midnightLocal(): Date {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
    // ISO sem timezone — assumir hora local da timezone; convertido pra
    // UTC via truque: calcular offset olhando pra now
    const localIso = `${get('year')}-${get('month')}-${get('day')}T00:00:00`
    const asIfUtc = new Date(`${localIso}Z`)
    // Descobre offset da timezone agora
    const tzAgora = new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`)
    const offsetMs = tzAgora.getTime() - now.getTime()
    return new Date(asIfUtc.getTime() - offsetMs)
  }
}
