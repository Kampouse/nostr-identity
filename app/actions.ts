'use server'

import { TeeResponse } from '@nostr-identity/types'

const OUTLAYER_API_BASE = 'https://api.outlayer.fastnear.com/call'
const PROJECT_ID = process.env.OUTLAYER_PROJECT_ID || 'kampouse.near/nostr-identity-tee'
const PAYMENT_KEY = process.env.OUTLAYER_PAYMENT_KEY || ''
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || 'nostr-identity.kampouse.testnet'

interface Nep413Response {
  accountId: string
  publicKey: string
  signature: string
  authRequest: {
    message: string
    nonce: string
    recipient: string
  }
}

export async function registerIdentityWithZKP(params: {
  npub: string
  proof: string
  commitmentField: string
  nullifierField: string
  accountId: string
  nep413Response: Nep413Response
  contractId?: string
}): Promise<TeeResponse> {
  try {
    const { npub, proof, commitmentField, nullifierField, accountId, nep413Response, contractId } = params

    if (!PAYMENT_KEY) {
      throw new Error('OUTLAYER_PAYMENT_KEY environment variable is not set')
    }

    const contractIdFinal = contractId || CONTRACT_ID

    // Send to TEE: proof, field elements (algebraic commitment), NEP-413 auth
    // TEE verifies NEP-413 (proves account ownership) + ZKP (proves knowledge of nsec)
    // TEE NEVER sees nsec
    const requestBody = {
      input: {
        action: 'register_with_zkp',
        npub,
        zkp_proof: {
          proof,
          // Public inputs = algebraic field elements (what the circuit constrains)
          public_inputs: [commitmentField, nullifierField],
          verified: false, // TEE ignores this, verifies cryptographically
          timestamp: Math.floor(Date.now() / 1000),
        },
        account_id: accountId,
        nep413_response: {
          account_id: nep413Response.accountId,
          public_key: nep413Response.publicKey,
          signature: nep413Response.signature,
          authRequest: {
            message: nep413Response.authRequest.message,
            nonce: nep413Response.authRequest.nonce,
            recipient: nep413Response.authRequest.recipient,
          },
        },
        writer_contract_id: contractIdFinal,
        deadline: Math.floor(Date.now() / 1000) + 3600,
      },
      async: false,
    }

    const response = await fetch(`${OUTLAYER_API_BASE}/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': PAYMENT_KEY,
        'X-Compute-Limit': '200000',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OutLayer API returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    if (result.status === 'failed') {
      throw new Error(`TEE execution failed: ${result.error}`)
    }

    const output = typeof result.output === 'string' ? JSON.parse(result.output) : result.output

    if (!output.success) {
      throw new Error(output.error || 'TEE registration failed')
    }

    return output as TeeResponse
  } catch (error: any) {
    console.error('Registration error:', error)
    throw new Error(error.message || 'Failed to register identity')
  }
}
