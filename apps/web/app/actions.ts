'use server'

import { TeeResponse } from '@nostr-identity/types'

// OutLayer HTTPS API configuration
const OUTLAYER_API_BASE = 'https://api.outlayer.fastnear.com/call'
const PROJECT_ID = process.env.OUTLAYER_PROJECT_ID || 'nostr-identity.near/tee-service'
const PAYMENT_KEY = process.env.OUTLAYER_PAYMENT_KEY || ''

// Secrets configuration for TEE to sign transactions
const SECRETS_PROFILE = process.env.OUTLAYER_SECRETS_PROFILE || 'default'
const SECRETS_ACCOUNT_ID = process.env.OUTLAYER_SECRETS_ACCOUNT_ID || ''

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
      usingSecrets: !!SECRETS_ACCOUNT_ID,
    })

    // Build request body
    const requestBody: any = {
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
    }

    // Add secrets reference if configured (for TEE to sign transactions)
    if (SECRETS_ACCOUNT_ID) {
      requestBody.secrets_ref = {
        profile: SECRETS_PROFILE,
        account_id: SECRETS_ACCOUNT_ID
      }
      console.log('🔐 Using secrets:', SECRETS_PROFILE, 'from', SECRETS_ACCOUNT_ID)
    }

    // Call OutLayer HTTPS API
    const response = await fetch(`${OUTLAYER_API_BASE}/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'X-Payment-Key': PAYMENT_KEY,
        'X-Compute-Limit': '100000', // $0.10 max
        'X-Attached-Deposit': '50000', // $0.05 to author
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
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

    const teeResponse: TeeResponse = result.output
    console.log('✅ TEE execution success, checking for signed transaction...')

    // Check if TEE returned a signed transaction
    if (!teeResponse.signed_transaction) {
      throw new Error('TEE did not return a signed transaction')
    }

    console.log('📝 Signed transaction received from TEE')

    // Submit the signed transaction to NEAR RPC
    const network = process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet'
    const rpcUrl = network === 'mainnet'
      ? 'https://rpc.mainnet.near.org'
      : 'https://rpc.testnet.near.org'

    console.log('📡 Submitting transaction to NEAR RPC:', rpcUrl)

    // Build the RPC request for sending transaction
    const signedTx = teeResponse.signed_transaction as any
    const rpcResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'broadcast_tx_async',
        params: [signedTx]
      })
    })

    if (!rpcResponse.ok) {
      const errorText = await rpcResponse.text()
      console.error('❌ RPC submission failed:', rpcResponse.status, errorText)
      throw new Error(`Failed to submit transaction to NEAR RPC: ${rpcResponse.status}`)
    }

    const rpcData = await rpcResponse.json()
    console.log('✅ Transaction submitted to RPC:', rpcData)

    // Extract transaction hash from RPC response
    const transactionHash = rpcData.result || signedTx.hash

    // Return response with actual transaction hash from RPC
    const data: TeeResponse = {
      success: true,
      npub: teeResponse.npub,
      commitment: teeResponse.commitment,
      nullifier: teeResponse.nullifier,
      transaction_hash: transactionHash,
      created_at: teeResponse.created_at
    }

    console.log('✅ Complete success! Transaction hash:', transaction_hash)

    return data
  } catch (error: any) {
    console.error('❌ Server action error:', error)
    throw new Error(error.message || 'Failed to register identity')
  }
}
