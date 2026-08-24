// RotationTV Unified Platform — API Client
// Connects frontend to Supabase Edge Functions backend

const API_BASE = import.meta.env.VITE_API_URL || '/api'

class APIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
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

// ================================================================
// AUTH API
// ================================================================

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

// ================================================================
// CHANNELS API
// ================================================================

export const channelsAPI = {
  async list(params?: { type?: string; category?: string; search?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return fetchAPI(`/channels${qs ? '?' + qs : ''}`)
  },

  async get(slug: string) {
    return fetchAPI(`/channels?slug=${encodeURIComponent(slug)}`)
  },
}

// ================================================================
// VOD API
// ================================================================

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

// ================================================================
// WEBHOOK API
// ================================================================

export const webhookAPI = {
  async sendTribute(payload: Record<string, unknown>) {
    return fetchAPI('/webhooks/tribute?source=tribute', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export { APIError }
