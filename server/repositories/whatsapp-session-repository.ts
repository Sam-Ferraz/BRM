import { BaseRepository } from './base-repository.js'
import { WhatsAppSession, WhatsAppSessionStatus } from '../types/index.js'

export class WhatsAppSessionRepository extends BaseRepository {
  /**
   * Retorna a sessão do usuário dentro da account informada.
   * user_id sozinho é UNIQUE na tabela, mas o filtro por account_id blinda
   * a tenancy (defesa em profundidade: quem chamar com accountId errado
   * simplesmente não enxerga a sessão do usuário do outro tenant).
   */
  async findByUser(accountId: number, userId: number): Promise<WhatsAppSession | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM whatsapp_sessions WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * INTERNO/GLOBAL (rule 9): usado por providers (Baileys/CloudApi) e pelo
   * incoming handler no server/index.ts, onde o accountId ainda NÃO é
   * conhecido — o caller deve extrair session.account_id do retorno pra
   * seguir passando adiante em fluxos tenant-safe.
   *
   * Como user_id é UNIQUE globalmente, retorna a linha correta mesmo sem
   * filtro por account.
   */
  async findByUserInternal(userId: number): Promise<WhatsAppSession | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM whatsapp_sessions WHERE user_id = $1',
        [userId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Upsert da sessão do usuário — como há UNIQUE em user_id, cada usuário só
   * tem uma sessão. Se já existir, atualiza número/nome/status; senão cria
   * associando à account informada.
   */
  async upsert(
    accountId: number,
    userId: number,
    phoneNumber: string,
    displayName: string | null
  ): Promise<WhatsAppSession> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO whatsapp_sessions (account_id, user_id, phone_number, display_name, status, connected_at)
         VALUES ($1, $2, $3, $4, 'connected', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
           SET phone_number = EXCLUDED.phone_number,
               display_name = EXCLUDED.display_name,
               status = 'connected',
               connected_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [accountId, userId, phoneNumber, displayName]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * INTERNO/GLOBAL (rule 9): variante usada pelos providers que não têm
   * accountId em memória. Deriva o account_id via subquery na users table.
   * Providers/webhook flows unicamente — nunca chamar de rota autenticada.
   */
  async upsertInternal(
    userId: number,
    phoneNumber: string,
    displayName: string | null
  ): Promise<WhatsAppSession> {
    const client = await this.getClient()
    try {
      // Seta provider='baileys' porque este metodo interno so e chamado pelo
      // BaileysProvider ao completar o pareamento por QR. Sem isso, o
      // MultiWhatsAppProvider rotearia envios subsequentes pro CloudApi por
      // default e falhariam com "whatsapp_not_connected".
      const result = await client.query(
        `INSERT INTO whatsapp_sessions (account_id, user_id, phone_number, display_name, status, provider, connected_at)
         VALUES ((SELECT account_id FROM users WHERE id = $1), $1, $2, $3, 'connected', 'baileys', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
           SET phone_number = EXCLUDED.phone_number,
               display_name = EXCLUDED.display_name,
               status = 'connected',
               provider = 'baileys',
               connected_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, phoneNumber, displayName]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async updateStatus(accountId: number, userId: number, status: WhatsAppSessionStatus): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE whatsapp_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND account_id = $3 RETURNING id',
        [status, userId, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * INTERNO/GLOBAL (rule 9): providers atualizam status sem conhecer accountId.
   * user_id é UNIQUE globalmente, então update por user_id sozinho é correto.
   */
  async updateStatusInternal(userId: number, status: WhatsAppSessionStatus): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE whatsapp_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING id',
        [status, userId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async deleteByUser(accountId: number, userId: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM whatsapp_sessions WHERE user_id = $1 AND account_id = $2 RETURNING id',
        [userId, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Lookup pelo phone_number_id da Meta (Cloud API). Usado pelo webhook
   * receiver PÚBLICO pra descobrir qual usuário/account recebeu a mensagem.
   *
   * GLOBAL (rule 9): sem filtro por account porque o webhook é aberto e só
   * o phone_number_id identifica a origem. O caller (webhook) usa
   * session.account_id do retorno pra roteamento tenant-safe posterior.
   */
  async findByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppSession | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM whatsapp_sessions WHERE phone_number_id = $1',
        [phoneNumberId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Lookup pelo verify_token. Usado no challenge inicial do webhook do Meta
   * (GET /webhook) — o Meta envia o token escolhido pelo usuário e o BRM
   * confirma que conhece a sessão antes de devolver o challenge.
   *
   * GLOBAL (rule 9): mesma justificativa de findByPhoneNumberId — webhook
   * público não tem contexto de account.
   */
  async findByVerifyToken(verifyToken: string): Promise<WhatsAppSession | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM whatsapp_sessions WHERE verify_token = $1',
        [verifyToken]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Salva/atualiza credenciais do Cloud API pra um usuário. Cria a linha
   * se não existir (upsert por user_id) associando à account informada.
   */
  async upsertCloudApiCredentials(input: {
    accountId: number
    userId: number
    phoneNumber: string
    displayName?: string | null
    phoneNumberId: string
    accessToken: string
    appSecret: string
    verifyToken: string
    businessAccountId?: string | null
  }): Promise<WhatsAppSession> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO whatsapp_sessions (
            account_id, user_id, phone_number, display_name, status, provider,
            phone_number_id, access_token, app_secret, verify_token, business_account_id,
            connected_at
         ) VALUES ($1, $2, $3, $4, 'connected', 'cloud_api', $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
           SET phone_number = EXCLUDED.phone_number,
               display_name = EXCLUDED.display_name,
               status = 'connected',
               provider = 'cloud_api',
               phone_number_id = EXCLUDED.phone_number_id,
               access_token = EXCLUDED.access_token,
               app_secret = EXCLUDED.app_secret,
               verify_token = EXCLUDED.verify_token,
               business_account_id = EXCLUDED.business_account_id,
               connected_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          input.accountId,
          input.userId,
          input.phoneNumber,
          input.displayName ?? null,
          input.phoneNumberId,
          input.accessToken,
          input.appSecret,
          input.verifyToken,
          input.businessAccountId ?? null,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }
}
