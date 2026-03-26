/**
 * NEP-413 Authentication Request
 */
export interface Nep413AuthRequest {
  message: string
  nonce: string
  recipient: string
}

/**
 * NEP-413 Authentication Response
 */
export interface Nep413AuthResponse {
  account_id: string
  public_key: string
  signature: string
  authRequest: Nep413AuthRequest
}

/**
 * TEE API Response
 */
export interface TeeResponse {
  success: boolean
  npub?: string
  nsec?: string
  created_at?: number
  error?: string
}

/**
 * TEE API Request
 */
export interface TeeRequest {
  action: 'generate' | 'recover' | 'verify' | 'get_pubkey'
  account_id: string
  nep413_response?: Nep413AuthResponse
  npub?: string
}

/**
 * Nostr Identity
 */
export interface NostrIdentity {
  npub: string
  nsec: string
  npubBech32: string
  nsecBech32: string
  createdAt: number
}

/**
 * Commitment and Nullifier for ZKP
 */
export interface CommitmentPair {
  commitment: string
  nullifier: string
}

/**
 * Smart Contract Storage
 */
export interface IdentityStorage {
  commitment: string
  nullifier: string
  owner?: string
  created_at: number
}
