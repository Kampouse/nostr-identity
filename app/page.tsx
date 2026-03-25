'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { bech32 } from '@scure/base'

// TEE Backend URL (update after deployment)
const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'https://p.outlayer.fastnear.com/execute'

// Helper: Convert hex to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

// Helper: Encode to bech32 (npub/nsec)
function encodeBech32(prefix: string, hex: string): string {
  const bytes = hexToBytes(hex)
  const words = bech32.toWords(bytes)
  return bech32.encode(prefix, words)
}

// TEE API response types
interface TeeResponse {
  success: boolean
  npub?: string
  nsec?: string
  created_at?: number
  error?: string
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

  // Generate identity using TEE
  const generateIdentity = async () => {
    if (!accountId || !connector) return

    setLoading(true)
    setError('')

    try {
      const wallet = await connector.wallet()
      
      // 1. Create NEP-413 auth request
      const message = `Generate Nostr identity for ${accountId}`
      const nonce = crypto.randomUUID()
      
      // 2. Get NEP-413 signature using signMessage
      const authResponse = await wallet.signMessage({
        message,
        nonce: new TextEncoder().encode(nonce),
        recipient: "nostr-identity.near"
      })
      
      if (!authResponse || !authResponse.signature) {
        throw new Error('Wallet signature required')
      }
      
      console.log('✅ NEP-413 signature obtained')
      
      // 3. Format for TEE backend
      const nep413_response = {
        account_id: authResponse.accountId,
        public_key: authResponse.publicKey,
        signature: authResponse.signature,
        authRequest: {
          message,
          nonce,
          recipient: "nostr-identity.near"
        }
      }
      
      // 4. Send to TEE
      const response = await fetch(TEE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          account_id: accountId,
          nep413_response
        })
      })
      
      const data: TeeResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create identity')
      }
      
      if (!data.npub || !data.nsec) {
        throw new Error('Invalid response from TEE')
      }
      
      // 4. Encode to bech32
      const npubBech32 = encodeBech32('npub', data.npub)
      const nsecBech32 = encodeBech32('nsec', data.nsec)
      
      setIdentity({
        npub: data.npub,
        nsec: data.nsec,
        npubBech32,
        nsecBech32,
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
          Forgery-proof • TEE-Secured
        </p>

        {/* Security Badge */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔒</span>
            <div>
              <p className="font-semibold text-green-900">2-Layer Security</p>
              <p className="text-sm text-green-700">
                NEP-413 verification + TEE random key generation
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
              <h2 className="text-xl font-semibold">Generate Secure Identity</h2>
            </div>

            <p className="text-gray-600 mb-4">
              <strong>🔒 Security:</strong> Uses NEP-413 standard authentication.
              Only you can generate your identity.
            </p>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4">
              <strong>⚠️ Important:</strong>
              <br />
              <span className="text-sm">
                This version does NOT store keys. You MUST save your private key (nsec) 
                when shown - it cannot be recovered!
              </span>
            </div>

            <button
              onClick={generateIdentity}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Signing...' : 'Generate Identity (Requires Signature)'}
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
              ✅ Identity generated with NEP-413 verification!
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
                This key cannot be recovered. Write it down or store it securely.
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
              <strong>🔐 Security Model:</strong>
              <br />
              <span className="text-sm text-gray-600">
                Your keys are generated inside a TEE (Trusted Execution Environment).
                <br />
                <br />
                ✅ Only YOU can generate this identity (requires wallet signature)
                <br />
                ✅ Keys are random (not derived from public data)
                <br />
                ✅ Forgery-proof (NEP-413 verification)
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
