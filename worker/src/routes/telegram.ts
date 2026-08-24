import { Hono } from 'hono'
import type { Env } from '../types'
import { getDb } from '../lib/db'
import { BotRegistry } from '../telegram/botRegistry'
import { CloudSDKClient } from '../telegram/cloudSdk'
import { SyncEngine } from '../telegram/syncEngine'
import { validateInitData } from '../telegram/initData'
import { createMiddleware } from 'hono/factory'

const app = new Hono<{ Bindings: Env }>()

// ===== BOT REGISTRATION =====

app.post('/bots/register', async (c) => {
  const body = await c.req.json() as {
    botToken: string
    botName: string
    botUsername: string
    webAppUrl: string
    allowedOrigins?: string[]
  }

  const registry = new BotRegistry(c.env)
  const result = await registry.registerBot(
    body.botToken,
    body.botName,
    body.botUsername,
    body.webAppUrl,
    body.allowedOrigins || ['*']
  )

  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }

  return c.json({
    success: true,
    botId: result.botId,
    message: 'Bot registered successfully'
  })
})

app.get('/bots', async (c) => {
  const registry = new BotRegistry(c.env)
  const bots = await registry.listBots()
  return c.json({ bots })
})

// ===== WEBAPP INIT =====

app.post('/bot/:botId/webapp/init', async (c) => {
  const botId = c.req.param('botId')
  const body = await c.req.json() as { initData: string }

  const registry = new BotRegistry(c.env)
  const bot = await registry.getBot(botId)
  if (!bot) return c.json({ error: 'Bot not found' }, 404)

  const token = await registry.getBotToken(botId)
  if (!token) return c.json({ error: 'Bot token missing' }, 500)

  const validation = await validateInitData(body.initData, token)
  if (!validation.valid) {
    return c.json({ error: 'Invalid initData' }, 403)
  }

  const sync = new SyncEngine(c.env)
  const config = await sync.getActiveConfig(botId)
  const flags = await sync.getFeatureFlags(botId, String(validation.user!.id))

  const db = getDb(c.env.DB)
  await db.exec(
    `INSERT INTO users (telegram_id, username, display_name, avatar_url, is_creator, is_admin, balance_stars, balance_rtv)
     VALUES (?, ?, ?, ?, 0, 0, 0, 0)
     ON CONFLICT(telegram_id) DO UPDATE SET
       username = excluded.username,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       updated_at = CURRENT_TIMESTAMP`,
    [
      String(validation.user!.id),
      validation.user!.username || null,
      validation.user!.first_name + (validation.user!.last_name ? ` ${validation.user!.last_name}` : ''),
      validation.user!.photo_url || null
    ]
  )

  const userRow = await db.queryOne<{ id: number; is_admin: number }>(
    'SELECT id, is_admin FROM users WHERE telegram_id = ?',
    [String(validation.user!.id)]
  )

  return c.json({
    valid: true,
    user: validation.user,
    app: config,
    featureFlags: flags,
    isAdmin: userRow?.is_admin === 1
  })
})

// ===== WEBHOOK CALLBACKS =====

app.post('/bot/:botId/callback', async (c) => {
  const botId = c.req.param('botId')
  const update = await c.req.json() as Record<string, unknown>

  const registry = new BotRegistry(c.env)
  const bot = await registry.getBot(botId)
  if (!bot) return c.json({ error: 'Bot not found' }, 404)

  const db = getDb(c.env.DB)
  await db.exec(
    `INSERT INTO webhook_logs (bot_id, update_type, payload) VALUES (?, ?, ?)`,
    [botId, String(update.message ? 'message' : update.callback_query ? 'callback_query' : 'unknown'), JSON.stringify(update)]
  )

  const message = (update.message || update.edited_message) as Record<string, unknown> | undefined
  const text = message?.text as string | undefined
  const chat = message?.chat as { id: number } | undefined

  if (text && text.startsWith('/start') && chat) {
    const token = await registry.getBotToken(botId)
    if (token) {
      const sdk = new CloudSDKClient(token)
      const webAppUrl = bot.webAppUrl
      await sdk.sendMessage(chat.id,
        `Welcome to ${bot.botName}! Tap the button below to open the app:`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: 'Launch App', web_app: { url: webAppUrl } }
            ]]
          }
        }
      )
    }
  }

  return c.json({ ok: true })
})

// ===== CLOUD SDK PROXY =====

const botAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const botId = c.req.param('botId')
  const registry = new BotRegistry(c.env)
  const bot = await registry.getBot(botId)
  if (!bot) return c.json({ error: 'Bot not found' }, 404)
  c.set('botToken', await registry.getBotToken(botId))
  await next()
})

app.use('/bot/:botId/cloud-sdk/*', botAuthMiddleware)

app.post('/bot/:botId/cloud-sdk/sendMessage', async (c) => {
  const token = c.get('botToken') as string
  const body = await c.req.json() as { chatId: number | string; text: string; options?: Record<string, unknown> }
  const sdk = new CloudSDKClient(token)
  const result = await sdk.sendMessage(body.chatId, body.text, body.options)
  return c.json(result)
})

app.post('/bot/:botId/cloud-sdk/editMessage', async (c) => {
  const token = c.get('botToken') as string
  const body = await c.req.json() as { chatId: number | string; messageId: number; text: string; options?: Record<string, unknown> }
  const sdk = new CloudSDKClient(token)
  const result = await sdk.editMessage(body.chatId, body.messageId, body.text, body.options)
  return c.json(result)
})

app.post('/bot/:botId/cloud-sdk/deleteMessage', async (c) => {
  const token = c.get('botToken') as string
  const body = await c.req.json() as { chatId: number | string; messageId: number }
  const sdk = new CloudSDKClient(token)
  const result = await sdk.deleteMessage(body.chatId, body.messageId)
  return c.json(result)
})

app.post('/bot/:botId/cloud-sdk/getChat', async (c) => {
  const token = c.get('botToken') as string
  const body = await c.req.json() as { chatId: number | string }
  const sdk = new CloudSDKClient(token)
  const result = await sdk.getChat(body.chatId)
  return c.json(result)
})

app.post('/bot/:botId/cloud-sdk/getUser', async (c) => {
  const token = c.get('botToken') as string
  const body = await c.req.json() as { userId: number }
  const sdk = new CloudSDKClient(token)
  const result = await sdk.getUser(body.userId)
  return c.json(result)
})

app.post('/bot/:botId/cloud-sdk/invoke', async (c) => {
  const token = c.get('botToken') as string
  const body = await c.req.json() as { method: string; params: Record<string, unknown> }
  const sdk = new CloudSDKClient(token)
  const result = await sdk.invokeMethod(body.method, body.params)
  return c.json(result)
})

// ===== VERSION SYNC =====

app.post('/bot/:botId/sync/publish', async (c) => {
  const botId = c.req.param('botId')
  const body = await c.req.json() as {
    versionTag: string
    assetCdnUrl: string
    featureFlags?: Record<string, unknown>
  }

  const sync = new SyncEngine(c.env)
  const result = await sync.publishVersion(
    botId,
    body.versionTag,
    body.assetCdnUrl,
    body.featureFlags || {}
  )

  if (!result.success) return c.json({ error: result.error }, 400)
  return c.json({ success: true, versionId: result.versionId })
})

app.get('/bot/:botId/sync/config', async (c) => {
  const botId = c.req.param('botId')
  const userId = c.req.query('userId')

  const sync = new SyncEngine(c.env)
  const config = await sync.getActiveConfig(botId)
  const flags = await sync.getFeatureFlags(botId, userId || undefined)

  return c.json({ config, featureFlags: flags })
})

export default app
