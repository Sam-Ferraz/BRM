import { Resend } from 'resend'

/**
 * EmailService — envio de emails transacionais via Resend.
 *
 * Configuração (.env):
 *   RESEND_API_KEY   — API key gerada em resend.com/api-keys
 *   EMAIL_FROM       — remetente. Enquanto DNS não estiver configurado,
 *                       usar 'onboarding@resend.dev' (sandbox do Resend).
 *   APP_URL          — base da URL da aplicação (ex: https://app.brm.tec.br)
 *                       usada pra montar links dos emails.
 *
 * Se RESEND_API_KEY não estiver setada, o service loga em vez de mandar —
 * útil pra dev local sem credencial.
 */
export class EmailService {
  private resend: Resend | null
  private from: string
  private appUrl: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    this.resend = apiKey ? new Resend(apiKey) : null
    this.from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    this.appUrl = process.env.APP_URL || 'http://localhost:5173'
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      console.warn('[EmailService] RESEND_API_KEY não configurado — email não enviado')
      console.warn(`  To: ${to}`)
      console.warn(`  Subject: ${subject}`)
      console.warn(`  HTML: ${html.substring(0, 200)}...`)
      return
    }
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      })
    } catch (err) {
      console.error('[EmailService] falha ao enviar:', err)
      throw new Error('Falha ao enviar email')
    }
  }

  /**
   * Email de convite: cliente recém-criado recebe link pra definir senha.
   * Assunto propositalmente claro pra não cair em spam.
   */
  async sendSetupPasswordEmail(params: {
    to: string
    userName: string
    accountName: string
    token: string
  }): Promise<void> {
    const link = `${this.appUrl}/setup-password?token=${encodeURIComponent(params.token)}`
    const html = this.baseTemplate({
      title: 'Configure sua senha no BRM',
      preheader: `Olá ${params.userName}, defina sua senha pra começar a usar o BRM.`,
      body: `
        <p>Olá <strong>${escapeHtml(params.userName)}</strong>,</p>
        <p>A conta <strong>${escapeHtml(params.accountName)}</strong> foi criada no BRM (Business Relationship Management).</p>
        <p>Pra começar a usar, clique no botão abaixo pra definir sua senha:</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${link}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;">
            Definir minha senha
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
          <a href="${link}" style="color:#1e40af;word-break:break-all;">${link}</a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          Este link vale por 48 horas. Se expirar, peça um novo pro administrador da sua conta.
        </p>
      `,
    })
    await this.send(params.to, `Configure sua senha — BRM (${params.accountName})`, html)
  }

  /**
   * Email de reset de senha: user existente esqueceu senha e pediu link pra
   * redefinir. Mesmo template do setup, mas texto contextualizado.
   */
  async sendResetPasswordEmail(params: {
    to: string
    userName: string
    token: string
  }): Promise<void> {
    const link = `${this.appUrl}/setup-password?token=${encodeURIComponent(params.token)}`
    const html = this.baseTemplate({
      title: 'Redefinir sua senha no BRM',
      preheader: `Olá ${params.userName}, aqui está o link pra redefinir sua senha.`,
      body: `
        <p>Olá <strong>${escapeHtml(params.userName)}</strong>,</p>
        <p>Recebemos uma solicitação pra redefinir sua senha no BRM.</p>
        <p>Se foi você, clique no botão pra criar uma senha nova:</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${link}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;">
            Redefinir senha
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Se o botão não funcionar, copie e cole este link:<br>
          <a href="${link}" style="color:#1e40af;word-break:break-all;">${link}</a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          Se você NÃO pediu essa redefinição, apenas ignore este email — sua senha atual continua valendo.
          Este link vale por 1 hora.
        </p>
      `,
    })
    await this.send(params.to, `Redefinir sua senha — BRM`, html)
  }

  /**
   * Template HTML minimalista responsivo. Sem CSS externo, tabelas pra
   * máxima compatibilidade com Gmail/Outlook/etc.
   */
  private baseTemplate(params: { title: string; preheader: string; body: string }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<!-- Preheader oculto (o snippet que aparece na inbox antes de abrir) -->
<span style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${escapeHtml(params.preheader)}
</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1e3a8a;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">BRM</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;line-height:1.6;font-size:15px;">
            ${params.body}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
              © BRM · Business Relationship Management<br>
              Este é um email automático — por favor não responda.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
  }
}

// Escape HTML pra impedir injection nos templates (nome do user, etc)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
