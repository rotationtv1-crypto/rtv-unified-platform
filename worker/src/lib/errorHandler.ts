import type { Context } from 'hono'
import type { Env } from '../types'

export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  console.error('Worker error:', err)
  const isDev = c.env.RTV_API_SECRET === 'dev'
  return c.json({
    error: 'Internal Server Error',
    message: isDev ? err.message : undefined,
    timestamp: new Date().toISOString(),
  }, 500)
}
