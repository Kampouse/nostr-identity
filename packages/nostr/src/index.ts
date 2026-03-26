import { getPublicKey as getPubKey, sign, verify, keygen, utils } from '@noble/secp256k1'
import { bytesToHex, hexToBytes } from '@nostr-identity/crypto'

/**
 * Generate a random Nostr keypair
 */
export async function generateKeyPair(): Promise<{
  secretKey: Uint8Array
  publicKey: Uint8Array
}> {
  return keygen()
}

/**
 * Get public key from secret key
 */
export function getPublicKey(secretKey: Uint8Array): Uint8Array {
  return getPubKey(secretKey, true)
}

/**
 * Get public key from secret key (hex format)
 */
export function getPublicKeyHex(secretKeyHex: string): string {
  const secretKey = hexToBytes(secretKeyHex)
  const publicKey = getPubKey(secretKey, true)
  return bytesToHex(publicKey)
}

/**
 * Sign a message with private key
 */
export function signMessage(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return sign(message, secretKey)
}

/**
 * Sign a Nostr event
 * Note: This is a simplified version - full Nostr event signing would use the event serialization
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
  const signature = sign(messageBytes, secretKey)

  return bytesToHex(signature)
}

/**
 * Verify a signature
 */
export function verifySignature(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array
): boolean {
  try {
    return verify(signature, message, publicKey)
  } catch {
    return false
  }
}

/**
 * Validate a secret key
 */
export function isValidSecretKey(secretKey: Uint8Array): boolean {
  return utils.isValidSecretKey(secretKey)
}

/**
 * Validate a public key
 */
export function isValidPublicKey(publicKey: Uint8Array): boolean {
  return utils.isValidPublicKey(publicKey, true)
}
