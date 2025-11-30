const encoder = new TextEncoder()

async function createHmacKey(secret: string) {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function hmacSha256Base64Url(secret: string, data: string) {
  const key = await createHmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(signature))
  const base64 = btoa(String.fromCharCode(...hashArray))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export type TicketPayloadValidation =
  | { valid: true; ticketId: string; expTs: number }
  | { valid: false; error: string }

export async function verifyTicketPayload(
  payload: string,
  salt: string,
): Promise<TicketPayloadValidation> {
  try {
    const parts = payload.split('.')
    if (parts.length !== 4 || parts[0] !== 'TKT') {
      return { valid: false, error: 'Invalid QR payload format' }
    }

    const [, ticketId, expTsStr, signature] = parts
    const expTs = Number(expTsStr)

    if (!Number.isFinite(expTs)) {
      return { valid: false, error: 'Invalid expiration timestamp' }
    }

    const expectedSignature = await hmacSha256Base64Url(
      salt,
      `${ticketId}.${expTs}`,
    )

    if (expectedSignature !== signature) {
      return { valid: false, error: 'Invalid signature' }
    }

    const now = Math.floor(Date.now() / 1000)
    if (expTs < now) {
      return { valid: false, error: 'Ticket expired' }
    }

    return { valid: true, ticketId, expTs }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, error: message }
  }
}

