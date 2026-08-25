import type { Env } from '../types'
import { getDb } from '../lib/db'

export interface BotRegistration {
  id: string
  botTokenHash: string
  botName: string
  botUsername: string
  webAppUrl: string
  allowedOrigins: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export class BotRegistry {
  constructor(private env: Env) {}

  async registerBot(
    botToken: string,
    botName: string,
    botUsername: string,
    webAppUrl: string,
    allowedOrigins: string[]
  ): Promise<{ success: boolean; botId?: string; webhookSecret?: string; error?: string }> {
    const db = getDb(this.env.DB)

    const validation = await this.validateBotToken(botToken)
    if (!validation.ok) {
      return { success: false, error: 'Invalid bot token' }
    }

    const tokenHash = await this.hashToken(botToken)
    const botId = `bot_${tokenHash.slice(0, 16)}`

    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM bot_registry WHERE bot_id = ?',
      [botId]
    )
    if (existing) {
      return { success: false, error: 'Bot already registered' }
    }

    await this.env.KV_CACHE.put(`bot_token:${botId}`, botToken, { expirationTtl: 0 })

    // Generate a per-bot webhook secret. The caller configures it as
    // `secret_token` in setWebhook; Telegram then sends it back in the
    // X-Telegram-Bot-Api-Secret-Token header, which the callback route
    // verifies in constant time. Returned ONCE here.
    const webhookSecret = this.generateWebhookSecret()
    await this.env.KV_CACHE.put(`bot_webhook_secret:${botId}`, webhookSecret, { expirationTtl: 0 })

    await db.exec(
      `INSERT INTO bot_registry (bot_id, bot_token_hash, bot_name, bot_username, web_app_url, allowed_origins, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [botId, tokenHash, botName, botUsername, webAppUrl, JSON.stringify(allowedOrigins)]
    )

    return { success: true, botId, webhookSecret }
  }

  async getBot(botId: string): Promise<BotRegistration | null> {
    const db = getDb(this.env.DB)
    const row = await db.queryOne<Record<string, unknown>>(
      'SELECT * FROM bot_registry WHERE bot_id = ? AND is_active = 1',
      [botId]
    )
    if (!row) return null

    return {
      id: String(row.bot_id),
      botTokenHash: String(row.bot_token_hash),
      botName: String(row.bot_name),
      botUsername: String(row.bot_username),
      webAppUrl: String(row.web_app_url),
      allowedOrigins: String(row.allowed_origins),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }
  }

  async getBotToken(botId: string): Promise<string | null> {
    return this.env.KV_CACHE.get(`bot_token:${botId}`)
  }

  async getWebhookSecret(botId: string): Promise<string | null> {
    return this.env.KV_CACHE.get(`bot_webhook_secret:${botId}`)
  }

  async listBots(): Promise<Pick<BotRegistration, 'id' | 'botName' | 'botUsername' | 'webAppUrl' | 'isActive'>[]> {
    const db = getDb(this.env.DB)
    const rows = await db.query<Record<string, unknown>>(
      'SELECT bot_id, bot_name, bot_username, web_app_url, is_active FROM bot_registry ORDER BY created_at DESC'
    )
    return rows.map(r => ({
      id: String(r.bot_id),
      botName: String(r.bot_name),
      botUsername: String(r.bot_username),
      webAppUrl: String(r.web_app_url),
      isActive: Boolean(r.is_active)
    }))
  }

  async deactivateBot(botId: string): Promise<void> {
    const db = getDb(this.env.DB)
    await db.exec('UPDATE bot_registry SET is_active = 0 WHERE bot_id = ?', [botId])
    await this.env.KV_CACHE.delete(`bot_token:${botId}`)
    await this.env.KV_CACHE.delete(`bot_webhook_secret:${botId}`)
  }

  private async validateBotToken(token: string): Promise<{ ok: boolean; username?: string }> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      const data = await res.json() as { ok: boolean; result?: { username: string } }
      return { ok: data.ok, username: data.result?.username }
    } catch {
      return { ok: false }
    }
  }

  private generateWebhookSecret(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}
