const encoder = new TextEncoder()

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null

  const bytes = new Uint8Array(32)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function fromBase64(value: string): Uint8Array | null {
  try {
    const decoded = atob(value)
    if (decoded.length !== 32) return null
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

export async function createTributeSignature(body: string, apiKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return toHex(new Uint8Array(digest))
}

export async function verifyTributeSignature(
  body: string,
  signatureHeader: string | null,
  apiKey: string,
): Promise<boolean> {
  if (!signatureHeader || !apiKey) return false

  const normalized = signatureHeader.trim().replace(/^sha256=/i, '')
  const expected = await createTributeSignature(body, apiKey)

  if (/^[0-9a-f]{64}$/i.test(normalized)) {
    return timingSafeEqual(encoder.encode(normalized.toLowerCase()), encoder.encode(expected))
  }

  const providedBytes = fromBase64(normalized)
  const expectedBytes = fromHex(expected)
  return providedBytes !== null && expectedBytes !== null && timingSafeEqual(providedBytes, expectedBytes)
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toHex(new Uint8Array(digest))
}
