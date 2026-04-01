'use server'

import {
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  createTransaction,
  actions,
  baseDecode,
} from 'near-api-js'

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || 'nostr-identity.kampouse.testnet'
const NETWORK_ID = 'testnet'
const RPC_URL = 'https://rpc.testnet.fastnear.com'

const RELAYER_ACCOUNT_ID = process.env.RELAYER_ACCOUNT_ID || 'kampouse.testnet'
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || ''

interface RegisterParams {
  npub: string
  commitment: string
  nullifier: string
  pairingInput: string
}

export async function registerIdentityViaRelayer(params: RegisterParams): Promise<{
  success: boolean
  transaction_hash?: string
  created_at?: number
  error?: string
}> {
  const { npub, commitment, nullifier, pairingInput } = params

  try {
    if (!RELAYER_PRIVATE_KEY) {
      throw new Error('RELAYER_PRIVATE_KEY not configured — server cannot relay transactions')
    }
    if (!npub || npub.length !== 64) throw new Error('Invalid npub: must be 64 hex chars')
    if (!commitment || commitment.length !== 64) throw new Error('Invalid commitment')
    if (!nullifier || nullifier.length !== 64) throw new Error('Invalid nullifier')
    if (!pairingInput) throw new Error('Missing pairing input')

    const provider = new JsonRpcProvider({ url: RPC_URL })

    const keyPair = KeyPair.fromString(RELAYER_PRIVATE_KEY)
    const signer = new KeyPairSigner(keyPair)
    const publicKey = keyPair.getPublicKey()

    // Get relayer's access key nonce
    const accessKey: any = await provider.query({
      request_type: 'view_access_key',
      account_id: RELAYER_ACCOUNT_ID,
      public_key: publicKey.toString(),
      finality: 'final',
    })

    const nonce = BigInt(accessKey.nonce) + 1n
    const recentBlock = await provider.block({ finality: 'final' })
    const blockHash = baseDecode(recentBlock.header.hash)

    const args = {
      owner: RELAYER_ACCOUNT_ID,
      npub,
      commitment,
      nullifier,
      pairing_input: pairingInput,
    }

    const transaction = createTransaction(
      RELAYER_ACCOUNT_ID,
      publicKey,
      CONTRACT_ID,
      nonce,
      [
        actions.functionCall(
          'register',
          Buffer.from(JSON.stringify(args)),
          50000000000000n,
          0n,
        ),
      ],
      blockHash,
    )

    const signedTx = await signer.signTransaction(transaction)
    const result = await provider.sendTransaction(signedTx)

    const txHash = result.transaction?.hash || ''

    return {
      success: true,
      transaction_hash: txHash,
      created_at: Date.now(),
    }
  } catch (error: any) {
    console.error('Relayer registration error:', error)
    return { success: false, error: error.message || 'Relayer failed' }
  }
}
