import { createHmac } from 'crypto'

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false

  params.delete('hash')
  const pairs: string[] = []
  params.sort()
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`)
  }
  const dataCheckString = pairs.join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const checkHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  return checkHash === hash
}

export function parseTelegramUser(initData: string): {
  id: number
  username?: string
  first_name: string
  last_name?: string
  photo_url?: string
} | null {
  const params = new URLSearchParams(initData)
  const userStr = params.get('user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}
