import { BaseRepository } from './base-repository.js'
import { WhatsAppSession, WhatsAppSessionStatus } from '../types/index.js'

export class WhatsAppSessionRepository extends BaseRepository {
  async findByUser(userId: number): Promise<WhatsAppSession | null> {
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
   * tem uma sessão. Se já existir, atualiza número/nome/status; senão cria.
   */
  async upsert(
    userId: number,
    phoneNumber: string,
    displayName: string | null
  ): Promise<WhatsAppSession> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO whatsapp_sessions (user_id, phone_number, display_name, status, connected_at)
         VALUES ($1, $2, $3, 'connected', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
           SET phone_number = EXCLUDED.phone_number,
               display_name = EXCLUDED.display_name,
               status = 'connected',
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

  async updateStatus(userId: number, status: WhatsAppSessionStatus): Promise<boolean> {
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

  async deleteByUser(userId: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM whatsapp_sessions WHERE user_id = $1 RETURNING id',
        [userId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Lookup pelo phone_number_id da Meta (Cloud API). Usado pelo webhook
   * receiver pra descobrir qual usuário recebeu a mensagem.
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
   * se não existir (upsert por user_id).
   */
  async upsertCloudApiCredentials(input: {
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
            user_id, phone_number, display_name, status, provider,
            phone_number_id, access_token, app_secret, verify_token, business_account_id,
            connected_at
         ) VALUES ($1, $2, $3, 'connected', 'cloud_api', $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
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
