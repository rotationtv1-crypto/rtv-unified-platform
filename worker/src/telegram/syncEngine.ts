import type { Env } from '../types'
import { getDb } from '../lib/db'

export interface AppVersionConfig {
  versionId: string
  versionTag: string
  assetCdnUrl: string
  featureFlags: Record<string, unknown>
  updatedAt: number
}

export class SyncEngine {
  constructor(private env: Env) {}

  async publishVersion(
    botId: string,
    versionTag: string,
    assetCdnUrl: string,
    featureFlags: Record<string, unknown>
  ): Promise<{ success: boolean; versionId?: string; error?: string }> {
    const db = getDb(this.env.DB)

    await db.exec(
      'UPDATE app_versions SET is_active = 0 WHERE bot_id = ?',
      [botId]
    )

    const versionId = `v_${botId}_${Date.now()}`
    await db.exec(
      `INSERT INTO app_versions (version_id, bot_id, version_tag, asset_cdn_url, feature_flags, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [versionId, botId, versionTag, assetCdnUrl, JSON.stringify(featureFlags)]
    )

    await this.env.KV_CACHE.put(
      `app_config:${botId}`,
      JSON.stringify({ versionId, versionTag, assetCdnUrl, featureFlags, updatedAt: Date.now() }),
      { expirationTtl: 3600 }
    )

    return { success: true, versionId }
  }

  async getActiveConfig(botId: string): Promise<AppVersionConfig | null> {
    const cached = await this.env.KV_CACHE.get(`app_config:${botId}`)
    if (cached) {
      try { return JSON.parse(cached) } catch { /* fall through */ }
    }

    const db = getDb(this.env.DB)
    const row = await db.queryOne<Record<string, unknown>>(
      'SELECT * FROM app_versions WHERE bot_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      [botId]
    )
    if (!row) return null

    return {
      versionId: String(row.version_id),
      versionTag: String(row.version_tag),
      assetCdnUrl: String(row.asset_cdn_url),
      featureFlags: JSON.parse(String(row.feature_flags || '{}')),
      updatedAt: 0
    }
  }

  async getFeatureFlags(botId: string, userId?: string): Promise<Record<string, unknown>> {
    const config = await this.getActiveConfig(botId)
    const flags: Record<string, unknown> = { ...(config?.featureFlags || {}) }

    if (userId) {
      const db = getDb(this.env.DB)
      const dbFlags = await db.query<Record<string, unknown>>(
        'SELECT flag_key, flag_value, flag_type, rollout_percent FROM feature_flags WHERE bot_id = ?',
        [botId]
      )
      for (const f of dbFlags) {
        const key = String(f.flag_key)
        const rollout = Number(f.rollout_percent) || 100
        const userHash = await this.hashUserForRollout(userId, key)
        const userPercent = (userHash % 100) + 1
        if (userPercent <= rollout) {
          flags[key] = this.coerceFlagValue(String(f.flag_value), String(f.flag_type))
        } else {
          delete flags[key]
        }
      }
    }

    return flags
  }

  private async hashUserForRollout(userId: string, flagKey: string): Promise<number> {
    const encoder = new TextEncoder()
    const data = encoder.encode(`${userId}:${flagKey}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    const view = new DataView(hashArray.buffer)
    return view.getUint32(0, false)
  }

  private coerceFlagValue(value: string, type: string): unknown {
    switch (type) {
      case 'boolean': return value === 'true'
      case 'number': return Number(value)
      default: return value
    }
  }
}
