import { bech32 } from '@scure/base'
import * as secp256k1 from '@noble/secp256k1'

/**
 * Convert hexadecimal string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to hexadecimal string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Encode bytes to bech32 format (npub/nsec)
 */
export function encodeBech32(prefix: string, hex: string): string {
  const bytes = hexToBytes(hex)
  const words = bech32.toWords(bytes)
  return bech32.encode(prefix, words)
}

/**
 * Decode bech32 format to bytes
 */
export function decodeBech32(input: string): { prefix: string; bytes: Uint8Array } {
  const { prefix, words } = bech32.decode(input as `${string}1${string}`)
  const bytes = bech32.fromWords(words)
  return { prefix, bytes: new Uint8Array(bytes) }
}

// ============================================================================
// NOSTR KEY GENERATION (secp256k1 compliant)
// ============================================================================

/**
 * Generate a proper Nostr keypair
 * 
 * According to Nostr spec:
 * - Private key (nsec): 32 random bytes
 * - Public key (npub): Derived using secp256k1 elliptic curve
 * 
 * Both are 64-character hex strings (32 bytes)
 * Bech32 format: nsec1... and npub1...
 */
export interface NostrKeypair {
  // Hex format (64 chars)
  privateKeyHex: string
  publicKeyHex: string
  
  // Bech32 format (human-readable)
  nsec: string  // nsec1...
  npub: string  // npub1...
}

/**
 * Generate a new Nostr keypair
 * 
 * @returns NostrKeypair with hex and bech32 formats
 */
export function generateNostrKeypair(): NostrKeypair {
  // 1. Generate random 32-byte private key
  const privateKeyBytes = secp256k1.utils.randomSecretKey()
  const privateKeyHex = bytesToHex(privateKeyBytes)
  
  // 2. Derive public key using secp256k1
  const publicKeyFull = secp256k1.getPublicKey(privateKeyBytes, true) // compressed (33 bytes)
  // Nostr uses only the 32-byte X coordinate (drop the prefix byte)
  const publicKeyBytes = publicKeyFull.slice(1) // Remove first byte (02 or 03)
  const publicKeyHex = bytesToHex(publicKeyBytes)
  
  // 3. Convert to bech32 format
  const nsec = encodeBech32('nsec', privateKeyHex)
  const npub = encodeBech32('npub', publicKeyHex)
  
  return {
    privateKeyHex,
    publicKeyHex,
    nsec,
    npub
  }
}

/**
 * Derive public key from private key
 * 
 * @param privateKeyHex - 64-char hex private key
 * @returns 64-char hex public key
 */
export function derivePublicKey(privateKeyHex: string): string {
  const privateKeyBytes = hexToBytes(privateKeyHex)
  const publicKeyFull = secp256k1.getPublicKey(privateKeyBytes, true) // compressed
  // Nostr uses only the 32-byte X coordinate (drop the prefix byte)
  const publicKeyBytes = publicKeyFull.slice(1) // Remove first byte (02 or 03)
  return bytesToHex(publicKeyBytes)
}

/**
 * Validate a Nostr private key
 * 
 * @param privateKeyHex - 64-char hex private key
 * @returns true if valid
 */
export function validatePrivateKey(privateKeyHex: string): boolean {
  // Must be 64 hex characters
  if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
    return false
  }
  
  // Must be valid secp256k1 private key
  try {
    const bytes = hexToBytes(privateKeyHex)
    return secp256k1.utils.isValidSecretKey(bytes)
  } catch {
    return false
  }
}

/**
 * Convert nsec (bech32) to hex private key
 * 
 * @param nsec - nsec1... format
 * @returns 64-char hex private key
 */
export function nsecToHex(nsec: string): string {
  const { prefix, bytes } = decodeBech32(nsec)
  if (prefix !== 'nsec') {
    throw new Error('Invalid prefix: expected nsec')
  }
  return bytesToHex(bytes)
}

/**
 * Convert npub (bech32) to hex public key
 * 
 * @param npub - npub1... format
 * @returns 64-char hex public key
 */
export function npubToHex(npub: string): string {
  const { prefix, bytes } = decodeBech32(npub)
  if (prefix !== 'npub') {
    throw new Error('Invalid prefix: expected npub')
  }
  return bytesToHex(bytes)
}

/**
 * Sign a message with Nostr private key
 * 
 * @param message - Message to sign (hex string)
 * @param privateKeyHex - 64-char hex private key
 * @returns Signature (hex string)
 */
export async function signNostr(message: string, privateKeyHex: string): Promise<string> {
  const messageBytes = hexToBytes(message)
  const privateKeyBytes = hexToBytes(privateKeyHex)
  const signature = await secp256k1.signAsync(messageBytes, privateKeyBytes)
  // signature is already Bytes (Uint8Array), just convert to hex
  return bytesToHex(signature)
}

/**
 * Verify a Nostr signature
 * 
 * @param message - Original message (hex string)
 * @param signature - Signature (hex string)
 * @param publicKeyHex - 64-char hex public key
 * @returns true if valid
 */
export function verifyNostr(message: string, signature: string, publicKeyHex: string): boolean {
  try {
    const messageBytes = hexToBytes(message)
    const signatureBytes = hexToBytes(signature)
    const publicKeyBytes = hexToBytes(publicKeyHex)
    return secp256k1.verify(signatureBytes, messageBytes, publicKeyBytes)
  } catch {
    return false
  }
}
