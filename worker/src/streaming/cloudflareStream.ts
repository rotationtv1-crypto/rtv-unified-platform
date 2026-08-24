export interface CloudflareStreamClientOptions {
  accountId: string
  apiToken: string
}

export interface LiveInput {
  uid: string
  rtmps: { url: string; streamKey: string }
  srt: { url: string; streamId: string }
  webRTC: { url: string }
  created: string
}

export interface VideoItem {
  uid: string
  status: { state: string; pctComplete?: number; errorReasonCode?: string; errorReasonText?: string }
  meta: Record<string, string>
  created: string
  modified: string
  size: number
  preview: string
  readyToStream: boolean
  thumbnail: string
  playback: { hls: string; dash: string }
  duration: number
  input: { width: number; height: number }
  liveInput?: string
  clippedFrom?: string
  watermark?: string
  publicDetails?: { title: string; share_link?: string }
  requireSignedURLs: boolean
  allowedOrigins: string[]
  maxDurationSeconds?: number
  uploadURL?: string
}

export class CloudflareStreamClient {
  private accountId: string
  private apiToken: string
  private baseUrl: string

  constructor(env: { CF_ACCOUNT_ID?: string; CF_STREAM_API_TOKEN?: string }) {
    if (!env.CF_ACCOUNT_ID || !env.CF_STREAM_API_TOKEN) {
      throw new Error('Cloudflare Stream credentials not configured')
    }
    this.accountId = env.CF_ACCOUNT_ID
    this.apiToken = env.CF_STREAM_API_TOKEN
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Cloudflare Stream API error: ${res.status} ${err}`)
    }
    const json = await res.json() as { success: boolean; result: T; errors: Array<{ message: string }> }
    if (!json.success) {
      throw new Error(`Cloudflare Stream API error: ${json.errors?.[0]?.message || 'Unknown'}`)
    }
    return json.result
  }

  // ===== LIVE INPUTS =====

  async createLiveInput(name: string, meta?: Record<string, string>): Promise<LiveInput> {
    return this.request<LiveInput>('/live_inputs', {
      method: 'POST',
      body: JSON.stringify({
        meta: { name, ...meta },
        recording: { mode: 'automatic', timeoutSeconds: 10, requireSignedURLs: false },
      }),
    })
  }

  async listLiveInputs(): Promise<LiveInput[]> {
    const result = await this.request<{ liveInputs: LiveInput[] }>('/live_inputs')
    return result.liveInputs || []
  }

  async deleteLiveInput(uid: string): Promise<void> {
    await this.request<void>(`/live_inputs/${uid}`, { method: 'DELETE' })
  }

  // ===== VIDEOS / VOD =====

  async listVideos(): Promise<VideoItem[]> {
    const result = await this.request<{ videos: VideoItem[] }>('/?limit=100')
    return result.videos || []
  }

  async getVideo(uid: string): Promise<VideoItem> {
    return this.request<VideoItem>(`/${uid}`)
  }

  async deleteVideo(uid: string): Promise<void> {
    await this.request<void>(`/${uid}`, { method: 'DELETE' })
  }

  // ===== TOKEN-GATED PLAYBACK =====

  async getPlaybackUrl(
    uid: string,
    origin?: string,
    options: { requireToken?: boolean; tokenExpirySeconds?: number } = {}
  ): Promise<{ hls: string; dash: string; thumbnail: string; token?: string }> {
    const video = await this.getVideo(uid)

    let token: string | undefined
    if (options.requireToken) {
      token = await this.generateSignedToken(uid, options.tokenExpirySeconds || 3600)
    }

    const hls = token ? `${video.playback.hls}?token=${token}` : video.playback.hls
    const dash = token ? `${video.playback.dash}?token=${token}` : video.playback.dash

    return {
      hls,
      dash,
      thumbnail: video.thumbnail,
      token,
    }
  }

  private async generateSignedToken(uid: string, expirySeconds: number): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + expirySeconds
    const payload = { sub: uid, exp }
    // In production, use a proper JWT library or Cloudflare's signing endpoint
    // For now, this is a placeholder - the actual signing should happen via
    // Cloudflare Stream's signed URL feature or a separate signing worker
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const body = btoa(JSON.stringify(payload))
    const signature = await this.sign(`${header}.${body}`)
    return `${header}.${body}.${signature}`
  }

  private async sign(data: string): Promise<string> {
    // Placeholder: In production, use Cloudflare Stream's native signed URLs
    // or a dedicated signing key in Secrets Manager
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.apiToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
  }

  // ===== STREAM HEALTH =====

  async getStreamHealth(uid: string): Promise<{
    status: string
    live: boolean
    connected: boolean
    frameRate?: number
    width?: number
    height?: number
  }> {
    try {
      const video = await this.getVideo(uid)
      return {
        status: video.status.state,
        live: video.status.state === 'live-inprogress',
        connected: video.status.state !== 'error',
        ...(video.input || {}),
      }
    } catch {
      return { status: 'unknown', live: false, connected: false }
    }
  }

  // ===== ANALYTICS =====

  async getVideoViews(uid: string, start?: string, end?: string): Promise<{
    totalViews: number
    timeSeries: Array<{ datetime: string; views: number }>
  }> {
    const params = new URLSearchParams()
    if (start) params.append('start', start)
    if (end) params.append('end', end)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/analytics/views${query}`)
  }
}
