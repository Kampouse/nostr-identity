'use server'

import { TeeResponse } from '@nostr-identity/types'

const TEE_URL = process.env.TEE_URL || 'https://api.outlayer.fastnear.com/execute'

export async function registerIdentityWithZKP(params: {
  npub: string
  proof: string
  commitment: string
  nullifier: string
  contractId?: string
}): Promise<TeeResponse> {
  try {
    const { npub, proof, commitment, nullifier, contractId } = params

    const contractIdFinal = contractId || process.env.NEXT_PUBLIC_CONTRACT_ID || 'nostr-identity.testnet'
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour

    console.log('📡 Server action: Calling TEE', {
      url: TEE_URL,
      npub: npub.substring(0, 20) + '...',
      commitment: commitment.substring(0, 20) + '...',
    })

    const response = await fetch(TEE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_with_zkp',
        npub: npub,
        zkp_proof: {
          proof: proof,
          public_inputs: [commitment, nullifier],
          verified: true,
          timestamp: Math.floor(Date.now() / 1000)
        },
        writer_contract_id: contractIdFinal,
        deadline: deadline
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ TEE error:', response.status, errorText)
      throw new Error(`TEE returned ${response.status}: ${errorText}`)
    }

    const data: TeeResponse = await response.json()
    console.log('✅ TEE success:', data.transaction_hash)

    return data
  } catch (error: any) {
    console.error('❌ Server action error:', error)
    throw new Error(error.message || 'Failed to register identity')
  }
}
