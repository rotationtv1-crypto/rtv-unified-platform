import { useEffect, useState } from 'react'
import { useRTVStore } from '../store/rtvStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.rotationtv.network'

export function useTelegramAuth() {
  const { setUser, setToken, user } = useRTVStore()
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) {
      setError('Not running in Telegram')
      setIsReady(true)
      return
    }

    const initData = tg.initData
    if (!initData) {
      setError('No Telegram init data')
      setIsReady(true)
      return
    }

    fetch(`${API_BASE}/api/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.error || `Authentication failed (${res.status})`)
        }
        return data
      })
      .then((data) => {
        if (data?.success) {
          setUser(data.user)
          setToken(data.token)
        } else {
          setError(data?.error || 'Auth failed')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Authentication failed'))
      .finally(() => setIsReady(true))
  }, [setUser, setToken])

  return { isReady, error, isAuthenticated: !!user }
}
