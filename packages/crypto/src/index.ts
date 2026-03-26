import { bech32 } from '@scure/base'

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
