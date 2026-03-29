'use server'

import { TeeResponse } from '@nostr-identity/types'

// OutLayer HTTPS API configuration
const OUTLAYER_API_BASE = 'https://api.outlayer.fastnear.com/call'
const PROJECT_ID = process.env.OUTLAYER_PROJECT_ID || 'nostr-identity.near/tee-service'
const PAYMENT_KEY = process.env.OUTLAYER_PAYMENT_KEY || ''

export async function registerIdentityWithZKP(params: {
  npub: string
  proof: string
  commitment: string
  nullifier: string
  contractId?: string
}): Promise<TeeResponse> {
  try {
    const { npub, proof, commitment, nullifier, contractId } = params

    if (!PAYMENT_KEY) {
      throw new Error('OUTLAYER_PAYMENT_KEY environment variable is not set')
    }

    const contractIdFinal = contractId || process.env.NEXT_PUBLIC_CONTRACT_ID || 'nostr-identity.testnet'

    console.log('📡 Server action: Calling OutLayer API', {
      projectId: PROJECT_ID,
      npub: npub.substring(0, 20) + '...',
      commitment: commitment.substring(0, 20) + '...',
    })

    // Call OutLayer HTTPS API
    const response = await fetch(`${OUTLAYER_API_BASE}/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'X-Payment-Key': PAYMENT_KEY,
        'X-Compute-Limit': '100000', // $0.10 max
        'X-Attached-Deposit': '50000', // $0.05 to author
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          action: 'register_with_zkp',
          npub: npub,
          zkp_proof: {
            proof: proof,
            public_inputs: [commitment, nullifier],
            verified: true,
            timestamp: Math.floor(Date.now() / 1000)
          },
          writer_contract_id: contractIdFinal,
          deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
        },
        async: false // Wait for result
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OutLayer API error:', response.status, errorText)
      throw new Error(`OutLayer API returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('📦 OutLayer response:', JSON.stringify(result, null, 2))

    // Check if execution failed
    if (result.status === 'failed') {
      throw new Error(`TEE execution failed: ${result.error}`)
    }

    // Extract the actual output from the OutLayer response
    if (!result.output) {
      throw new Error('No output from TEE execution')
    }

    const data: TeeResponse = result.output
    console.log('✅ TEE success:', data.transaction_hash)

    return data
  } catch (error: any) {
    console.error('❌ Server action error:', error)
    throw new Error(error.message || 'Failed to register identity')
  }
}
