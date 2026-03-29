'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { encodeBech32, generateNostrKeypair, hexToBytes, bytesToHex } from '@nostr-identity/crypto'
import { registerIdentityWithZKP } from './actions'

// ZKP WASM - client-side proof generation
let zkpWasm: any = null

async function initZKP() {
  if (!zkpWasm) {
    zkpWasm = await import('@nostr-identity/zkp-wasm')
    await zkpWasm.default()
    await zkpWasm.initialize_zkp()
  }
  return zkpWasm
}

export default function Home() {
  const [connector, setConnector] = useState<NearConnector | null>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Identity state
  const [identity, setIdentity] = useState<{
    npub: string
    nsec: string
    npubBech32: string
    nsecBech32: string
    commitment: string
    nullifier: string
    transactionHash?: string
    createdAt: number
  } | null>(null)
  
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const conn = new NearConnector({
        signIn: {
          contractId: 'v1.signer',
          methodNames: ['derived_public_key', 'sign']
        }
      })

      conn.on('wallet:signIn', async (t) => {
        const account = t.accounts[0].accountId
        setAccountId(account)
      })

      conn.on('wallet:signOut', async () => {
        setAccountId('')
        setIdentity(null)
      })

      setConnector(conn)
    }
    init()
  }, [])

  const connectWallet = async () => {
    if (!connector) return
    await connector.connect()
  }

  const disconnectWallet = async () => {
    if (!connector) return
    await connector.disconnect()
  }

  // Generate identity with client-side keys + ZKP
  const generateIdentity = async () => {
    console.log('🚀 generateIdentity called!')
    console.log('accountId:', accountId)
    console.log('connector:', connector)

    if (!accountId || !connector) {
      console.error('Missing accountId or connector')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('⏳ Initializing ZKP...')
      // 0. Initialize ZKP (downloads proving key once, cached in IndexedDB)
      const zkp = await initZKP()
      console.log('✅ ZKP initialized')

      // 1. Generate Nostr keypair CLIENT-SIDE (TEE never sees nsec)
      const keypair = generateNostrKeypair()
      console.log('✅ Nostr keypair generated locally')
      console.log('   npub:', keypair.publicKeyHex)
      console.log('   nsec length:', keypair.privateKeyHex.length)
      console.log('   nsec:', keypair.privateKeyHex)

      // 2. Get NEP-413 signature from wallet (proves NEAR account ownership)
      console.log('📝 Signing message with wallet...')
      const message = `Generate Nostr identity for ${accountId}`

      // Generate 32-byte nonce for NEP-413 (wallet requirement)
      const nonceBytes = new Uint8Array(32)
      crypto.getRandomValues(nonceBytes)

      // Get wallet instance and sign message
      const wallet = await connector.wallet()
      const authResponse = await wallet.signMessage({
        message,
        nonce: nonceBytes,  // Pass Uint8Array directly (32 bytes)
        recipient: "nostr-identity.near"
      })

      if (!authResponse || !authResponse.signature) {
        throw new Error('Wallet signature required')
      }
      console.log('✅ NEP-413 signature obtained')

      // 3. Generate ZKP client-side using nsec as salt
      //    commitment = SHA256(SHA256(account_id + nsec)) — nsec-bound, untraceable
      //    nullifier = SHA256(nsec + nonce)
      const zkpNonce = zkp.generate_nonce()
      console.log('   nonce length:', zkpNonce.length)
      console.log('   nonce:', zkpNonce)

      console.log('Calling generate_ownership_proof_with_nsec with:')
      console.log('  account_id:', accountId, `(${accountId.length} chars)`)
      console.log('  nsec (privateKeyHex):', keypair.privateKeyHex, `(${keypair.privateKeyHex.length} chars)`)
      console.log('  nonce:', zkpNonce, `(${zkpNonce.length} chars)`)

      const proofResult = zkp.generate_ownership_proof_with_nsec(
        accountId,
        keypair.privateKeyHex,  // nsec — stays client-side!
        zkpNonce
      )
      console.log('✅ ZKP proof generated (client-side)')
      console.log('📦 Full proofResult object:', JSON.stringify(proofResult, null, 2))
      console.log('📦 proofResult keys:', Object.keys(proofResult))
      console.log('   commitment:', proofResult.commitment)
      console.log('   nullifier:', proofResult.nullifier)
      console.log('   commitment_hash:', proofResult.commitment_hash)
      console.log('   proof:', proofResult.proof?.substring(0, 50) + '...')

      // Validate proof data
      if (!proofResult.proof || !proofResult.commitment || !proofResult.nullifier) {
        throw new Error('Invalid ZKP proof: missing required fields')
      }

      // 4. Send ONLY public data to TEE via server action — no nsec, no account_id
      console.log('📡 Calling server action to register with TEE...')
      const data = await registerIdentityWithZKP({
        npub: keypair.publicKeyHex,
        proof: proofResult.proof,
        commitment: proofResult.commitment,
        nullifier: proofResult.nullifier,
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to register identity')
      }

      console.log('✅ Identity registered on blockchain')
      console.log('📝 Transaction hash:', data.transaction_hash)
      console.log('🔒 Commitment:', proofResult.commitment)
      console.log('🚫 Nullifier:', proofResult.nullifier)

      // 5. Encode to bech32
      const npubBech32 = encodeBech32('npub', keypair.publicKeyHex)
      const nsecBech32 = encodeBech32('nsec', keypair.privateKeyHex)

      setIdentity({
        npub: keypair.publicKeyHex,
        nsec: keypair.privateKeyHex,
        npubBech32,
        nsecBech32,
        commitment: proofResult.commitment,
        nullifier: proofResult.nullifier,
        transactionHash: data.transaction_hash,
        createdAt: data.created_at || Date.now()
      })

    } catch (err: any) {
      setError(err.message || 'Failed to generate identity')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-600">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          🔐 Secure NEAR → Nostr Identity
        </h1>
        <p className="text-gray-600 mb-8">
          Zero-knowledge • TEE-Secured • Privacy-first
        </p>

        {/* Security Badge */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔒</span>
            <div>
              <p className="font-semibold text-green-900">3-Layer Security</p>
              <p className="text-sm text-green-700">
                Client-side keys + Zero-knowledge proofs + TEE attestation
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Connect */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex items-center mb-4">
            <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
              1
            </span>
            <h2 className="text-xl font-semibold">Connect NEAR Wallet</h2>
          </div>

          {!accountId ? (
            <button
              onClick={connectWallet}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-900">
                <strong>Connected:</strong> {accountId}
              </p>
              <button
                onClick={disconnectWallet}
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Generate */}
        {accountId && !identity && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                2
              </span>
              <h2 className="text-xl font-semibold">Generate Private Identity</h2>
            </div>

            <p className="text-gray-600 mb-4">
              <strong>🔒 Privacy:</strong> Keys generated in YOUR browser. TEE never sees your private key.
              Zero-knowledge proof binds identity without revealing your NEAR account.
            </p>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4">
              <strong>⚠️ Important:</strong>
              <br />
              <span className="text-sm">
                Your private key (nsec) is generated locally and <strong>never sent to any server</strong>.
                You MUST save it when shown — it cannot be recovered!
              </span>
            </div>

            <button
              onClick={generateIdentity}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Generating ZKP...' : 'Generate Identity (Requires Signature)'}
            </button>

            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-900">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Show Keys */}
        {identity && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                3
              </span>
              <h2 className="text-xl font-semibold">Your Nostr Identity</h2>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
              ✅ Identity registered on blockchain with zero-knowledge proof!
              <div className="mt-1 text-sm text-green-700">
                Your NEAR account is NOT linked to your Nostr identity on-chain.
              </div>
              {identity.transactionHash && (
                <div className="mt-2 text-sm">
                  Transaction:{' '}
                  <a
                    href={`https://explorer.testnet.near.org/transactions/${identity.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 underline hover:text-green-900"
                  >
                    {identity.transactionHash.slice(0, 20)}...
                  </a>
                </div>
              )}
            </div>

            {/* Blockchain Registration Info */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">🔗 On-chain Registration</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Commitment (nsec-bound):</span>
                  <div className="font-mono text-xs bg-white p-2 rounded mt-1 break-all">
                    {identity.commitment}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Nullifier:</span>
                  <div className="font-mono text-xs bg-white p-2 rounded mt-1 break-all">
                    {identity.nullifier}
                  </div>
                </div>
              </div>
            </div>

            {/* Public Key */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Public Key (npub):</p>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative">
                {identity.npubBech32}
                <button
                  onClick={() => copyToClipboard(identity.npubBech32, 'npub')}
                  className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                >
                  {copied === 'npub' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
              <strong>🔴 SAVE YOUR PRIVATE KEY NOW!</strong>
              <br />
              <span className="text-sm">
                This key never left your browser and cannot be recovered. Save it securely.
              </span>
            </div>

            {/* Private Key */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Private Key (nsec):</p>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative">
                {showKey ? identity.nsecBech32 : '••••••••••••••••••••••••••••••••'}
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(identity.nsecBech32, 'nsec')}
                className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                {copied === 'nsec' ? 'Copied!' : 'Copy Private Key'}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold mb-3">📱 Import to Nostr Client</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Copy your <strong>private key</strong> (nsec) above</li>
                <li>Open your Nostr client (Damus, Primal, Amethyst, etc.)</li>
                <li>Go to Settings → Add Account / Import Key</li>
                <li>Paste your nsec and save</li>
                <li>Start posting! 🎉</li>
              </ol>
            </div>

            <div className="mt-4 bg-gray-100 p-4 rounded-lg">
              <strong>🔐 Privacy Model:</strong>
              <br />
              <span className="text-sm text-gray-600">
                Keys generated in YOUR browser (TEE never sees nsec)
                <br />
                <br />
                ✅ ZKP proves ownership without revealing your NEAR account
                <br />
                ✅ Commitment bound to nsec (256-bit entropy, untraceable)
                <br />
                ✅ NEAR account_id used once for signature, then discarded
                <br />
                ✅ On-chain data has ZERO link to your NEAR account
                <br />
                ✅ TEE attestation ensures secure execution
                <br />
                ⚠️ NOT recoverable - you must save your key!
              </span>
            </div>
          </div>
        )}

        <div className="text-center text-gray-500 text-sm">
          Powered by{' '}
          <a href="https://near.org" target="_blank" className="text-indigo-600 hover:underline">
            NEAR
          </a>
          {' + '}
          <a href="https://outlayer.fastnear.com" target="_blank" className="text-indigo-600 hover:underline">
            OutLayer TEE
          </a>
        </div>
      </div>
    </main>
  )
}
