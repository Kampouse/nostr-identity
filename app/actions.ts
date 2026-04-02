'use server'

// OutLayer HTTPS API: POST https://api.outlayer.fastnear.com/call/{owner}/{project}
// TEE WASM reads JSON from stdin, returns JSON on stdout
const OUTLAYER_API = 'https://api.outlayer.fastnear.com/call'
const OUTLAYER_PROJECT = process.env.OUTLAYER_PROJECT_ID || 'kampouse.near/nostr-identity-zkp-tee'
const PAYMENT_KEY = process.env.OUTLAYER_PAYMENT_KEY || ''

// Secrets ref for TEE to access encrypted NEAR signing key
const SECRETS_PROFILE = process.env.OUTLAYER_SECRETS_PROFILE || 'default'
const SECRETS_ACCOUNT = process.env.OUTLAYER_SECRETS_ACCOUNT_ID || ''

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || 'nostr-identity.kampouse.testnet'

interface ZKPProof {
  proof: string
  public_inputs: string[]
  verified: boolean
  timestamp: number
}

interface Nep413Auth {
  account_id: string
  public_key: string
  signature: string
  authRequest: {
    message: string
    nonce: string
    recipient: string
  }
}

interface RegisterParams {
  npub: string
  commitment: string
  nullifier: string
  pairingInput: string
  encryptedNsec?: string
  zkpProof: ZKPProof
  accountId: string
  nep413Response: Nep413Auth
}

export async function submitToRelayer(params: RegisterParams): Promise<{
  success: boolean
  transaction_hash?: string
  created_at?: number
  npub?: string
  error?: string
}> {
  const { npub, zkpProof, accountId, nep413Response } = params

  try {
    if (!npub || npub.length !== 64) throw new Error('Invalid npub')
    if (!accountId) throw new Error('Missing account_id')
    if (!zkpProof || !zkpProof.proof) throw new Error('Missing ZKP proof')
    if (!nep413Response) throw new Error('Missing NEP-413 auth')
    if (!PAYMENT_KEY) throw new Error('OUTLAYER_PAYMENT_KEY not configured')

    // Build the action payload — this becomes stdin JSON for the TEE WASM
    const teeInput: any = {
      action: 'register_with_zkp',
      zkp_proof: {
        proof: zkpProof.proof,
        public_inputs: zkpProof.public_inputs,
        verified: zkpProof.verified,
        timestamp: zkpProof.timestamp,
      },
      npub,
      account_id: accountId,
      nep413_response: {
        account_id: nep413Response.account_id || accountId,
        public_key: nep413Response.public_key,
        signature: nep413Response.signature,
        authRequest: nep413Response.authRequest,
      },
      writer_contract_id: CONTRACT_ID,
      deadline: Math.floor(Date.now() / 1000) + 300,
    }

    // Add encrypted_nsec if provided
    if (params.encryptedNsec) {
      teeInput.encrypted_nsec = params.encryptedNsec
    }

    const url = `${OUTLAYER_API}/${OUTLAYER_PROJECT}`

    console.log('Calling TEE:', url)
    console.log('Action:', teeInput.action, '| Account:', accountId, '| Npub:', npub.slice(0, 16) + '...')
    console.log('Request payload:', JSON.stringify({
      input: teeInput,
      secrets_ref: SECRETS_ACCOUNT ? {
        profile: SECRETS_PROFILE,
        account_id: SECRETS_ACCOUNT,
      } : undefined,
    }, null, 2))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minute timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': PAYMENT_KEY,
        'X-Compute-Limit': '500000', // $0.50 max compute budget
      },
      body: JSON.stringify({
        input: teeInput,
        ...(SECRETS_ACCOUNT ? {
          secrets_ref: {
            profile: SECRETS_PROFILE,
            account_id: SECRETS_ACCOUNT,
          }
        } : {}),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Log response status before parsing
    console.log('Response status:', response.status, response.statusText)

    if (!response.ok) {
      const text = await response.text()
      const errorMsg = `OutLayer API ${response.status}: ${text.slice(0, 500)}`
      console.error('❌ TEE API Error:', errorMsg)
      console.error('Response headers:', Object.fromEntries(response.headers.entries()))

      // Specific error messages
      if (response.status === 401) {
        throw new Error('Invalid or missing Payment Key. Check OUTLAYER_PAYMENT_KEY env var.')
      } else if (response.status === 402) {
        throw new Error('Insufficient balance on Payment Key. Add USD stablecoins to your payment key.')
      } else if (response.status === 404) {
        throw new Error('Project not found. Check OUTLAYER_PROJECT_ID: ' + OUTLAYER_PROJECT)
      }
      throw new Error(errorMsg)
    }

    const data = await response.json()
    console.log('📥 OutLayer response status:', data.status)
    console.log('📥 Compute cost:', data.compute_cost, 'micro-units ($' + (Number(data.compute_cost || 0) / 1000000).toFixed(6) + ')')
    console.log('📥 OutLayer FULL response:', JSON.stringify(data, null, 2))

    // OutLayer wraps result: { status: "completed", output: "...", ... }
    if (data.status === 'failed') {
      const errorMsg = data.error || data.message || 'TEE execution failed'
      console.error('❌ TEE Execution Failed:', errorMsg)
      console.error('Full TEE error:', JSON.stringify(data))
      throw new Error(`TEE: ${errorMsg}`)
    }

    // The TEE output is in data.output — could be string or object
    let output
    try {
      output = typeof data.output === 'string' ? JSON.parse(data.output) : data.output
    } catch (err) {
      console.error('❌ Failed to parse TEE output:', err)
      throw new Error('Invalid TEE response format')
    }

    if (!output.success) {
      const errorMsg = output.error || output.message || 'TEE registration failed'
      console.error('❌ TEE Operation Failed:', errorMsg)
      console.error('Full TEE output:', JSON.stringify(output))
      throw new Error(`TEE: ${errorMsg}`)
    }

    console.log('✅ TEE operation successful')

    return {
      success: true,
      transaction_hash: output.transaction_hash,
      created_at: output.created_at || Date.now(),
      npub: output.npub || npub,
    }
  } catch (error: any) {
    const msg = error.message || 'Registration failed'
    console.error('❌ TEE registration error:', msg)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

    // Return error info
    return {
      success: false,
      error: msg.slice(0, 500), // Allow longer error messages
    }
  }
}
