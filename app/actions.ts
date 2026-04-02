'use server'
import { execSync } from 'child_process'

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || 'nostr-identity.kampouse.testnet'
const RELAYER_ACCOUNT_ID = process.env.RELAYER_ACCOUNT_ID || 'kampouse.testnet'

interface RegisterParams {
  npub: string
  commitment: string
  nullifier: string
  pairingInput: string
  encryptedNsec?: string
}

export async function submitToRelayer(params: RegisterParams): Promise<{
  success: boolean
  transaction_hash?: string
  created_at?: number
  error?: string
}> {
  const { npub, commitment, nullifier, pairingInput, encryptedNsec } = params

  try {
    if (!npub || npub.length !== 64) throw new Error('Invalid npub')
    if (!commitment || commitment.length !== 64) throw new Error('Invalid commitment')
    if (!nullifier || nullifier.length !== 64) throw new Error('Invalid nullifier')
    if (!pairingInput) throw new Error('Missing pairing input')

    const args = JSON.stringify({
      npub,
      commitment,
      nullifier,
      pairing_input: pairingInput,
      encrypted_nsec: encryptedNsec || null,
    })

    const result = execSync(
      `near call ${CONTRACT_ID} register '${args}' --accountId ${RELAYER_ACCOUNT_ID} --networkId testnet --gas 50000000000000 2>&1`,
      { encoding: 'utf-8', timeout: 30000 }
    )

    const hashMatch = result.match(/Transaction Id\s+(\w+)/)
    const txHash = hashMatch ? hashMatch[1] : ''

    return {
      success: true,
      transaction_hash: txHash,
      created_at: Date.now(),
    }
  } catch (error: any) {
    const msg = error.stdout || error.message || 'Relayer failed'
    console.error('Relayer error:', msg)
    return { success: false, error: msg.slice(0, 200) }
  }
}
