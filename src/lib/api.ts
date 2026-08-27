// RotationTV Unified Platform — API Client
// Connects frontend to the platform API and the live stream gateway.

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const STREAM_GATEWAY =
  import.meta.env.VITE_STREAM_GATEWAY_URL ||
  'https://rtv-ai-gateway.rotationtvaicom.workers.dev'

class APIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

function gatewayBase(): string {
  return STREAM_GATEWAY.replace(/\/$/, '')
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('rtv_token')

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new APIError(res.status, data.error || `HTTP ${res.status}`)
  }

  return data
}

export const authAPI = {
  async register(email: string, password: string, displayName?: string) {
    const data = await fetchAPI('/auth/web-register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    })
    if (data.token) {
      localStorage.setItem('rtv_token', data.token)
      localStorage.setItem('rtv_refresh', data.refreshToken)
    }
    return data
  },

  async login(email: string, password: string) {
    const data = await fetchAPI('/auth/web-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (data.token) {
      localStorage.setItem('rtv_token', data.token)
      localStorage.setItem('rtv_refresh', data.refreshToken)
    }
    return data
  },

  async me() {
    return fetchAPI('/auth/me')
  },

  async logout() {
    await fetchAPI('/auth/logout', { method: 'POST' })
    localStorage.removeItem('rtv_token')
    localStorage.removeItem('rtv_refresh')
  },

  async verifyTelegram(initData: string, initDataUnsafe: Record<string, unknown>) {
    return fetchAPI('/telegram/verify', {
      method: 'POST',
      body: JSON.stringify({ initData, initDataUnsafe }),
    })
  },
}

export const channelsAPI = {
  async list(params?: { type?: string; category?: string; search?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return fetchAPI(`/channels${qs ? '?' + qs : ''}`)
  },

  async get(slug: string) {
    return fetchAPI(`/channels?slug=${encodeURIComponent(slug)}`)
  },
}

export const vodAPI = {
  async list(params?: {
    genre?: string
    category?: string
    search?: string
    is_original?: string
    limit?: string
    offset?: string
  }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return fetchAPI(`/vod${qs ? '?' + qs : ''}`)
  },

  async get(slug: string) {
    return fetchAPI(`/vod?slug=${encodeURIComponent(slug)}`)
  },
}

export type PlaybackInfo = {
  uid: string
  type?: 'live' | 'vod'
  hls: string
  dash?: string
  thumbnail?: string
  expiresIn?: number
  requiresToken?: boolean
  tokenCost?: number
  status?: string
}

function normalizePlayback(uid: string, data: Record<string, unknown>): PlaybackInfo {
  const hls = String(data.hls || data.hls_playback || '')
  if (!hls) {
    throw new APIError(502, 'Playback response did not include an HLS URL')
  }
  return {
    uid: String(data.uid || uid),
    type: data.type === 'vod' ? 'vod' : 'live',
    hls,
    dash: data.dash ? String(data.dash) : undefined,
    thumbnail: data.thumbnail ? String(data.thumbnail) : undefined,
    expiresIn: typeof data.expiresIn === 'number' ? data.expiresIn : undefined,
    requiresToken: Boolean(data.requiresToken),
    tokenCost: typeof data.tokenCost === 'number' ? data.tokenCost : 0,
    status: data.status ? String(data.status) : undefined,
  }
}

/**
 * Stream ingest/playback goes through the live rtv-ai-gateway Worker.
 * The platform Worker (`rtv-api`) is the fallback once PR #7 is deployed.
 * ECS is not used as a public API — only LiveKit/media.
 */
export const streamingAPI = {
  async playback(uid: string): Promise<PlaybackInfo> {
    const gatewayUrl = `${gatewayBase()}/stream/playback/${encodeURIComponent(uid)}`
    try {
      const res = await fetch(gatewayUrl, {
        headers: { Accept: 'application/json' },
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (res.ok) return normalizePlayback(uid, data)
      if (res.status !== 404) {
        throw new APIError(res.status, String(data.error || `HTTP ${res.status}`))
      }
    } catch (err) {
      if (err instanceof APIError) throw err
    }

    const data = (await fetchAPI(`/streaming/playback/${encodeURIComponent(uid)}`)) as Record<string, unknown>
    return normalizePlayback(uid, data)
  },

  async status(id: string) {
    const res = await fetch(`${gatewayBase()}/stream/status?id=${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new APIError(res.status, data.error || `HTTP ${res.status}`)
    }
    return data
  },
}

export { APIError, STREAM_GATEWAY }
