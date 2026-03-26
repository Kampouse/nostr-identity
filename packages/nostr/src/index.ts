import { secp256k1 } from '@noble/secp256k1'

/**
 * Generate a random Nostr keypair
 */
export async function generateKeyPair(): Promise<{
  secretKey: Uint8Array
  publicKey: Uint8Array
}> {
  const secretKey = secp256k1.utils.randomPrivateKey()
  const publicKey = secp256k1.getPublicKey(secretKey, true)
  return { secretKey, publicKey }
}

/**
 * Get public key from secret key
 */
export function getPublicKey(secretKey: Uint8Array): Uint8Array {
  return secp256k1.getPublicKey(secretKey, true)
}

/**
 * Sign a Nostr event
 */
export async function signEvent(
  eventData: {
    kind: number
    created_at: number
    tags: string[][]
    content: string
    pubkey: string
  },
  secretKey: Uint8Array
): Promise<string> {
  const message = JSON.stringify([
    0,
    eventData.pubkey,
    eventData.created_at,
    eventData.kind,
    eventData.tags,
    eventData.content
  ])

  const messageBytes = new TextEncoder().encode(message)
  const signature = await secp256k1.sign(messageBytes, secretKey)

  return signature.toCompactHex()
}

/**
 * Verify a Nostr event signature
 */
export async function verifySignature(
  signature: string,
  message: string,
  publicKey: string
): Promise<boolean> {
  try {
    return await secp256k1.verify(
      signature,
      new TextEncoder().encode(message),
      publicKey
    )
  } catch {
    return false
  }
}
