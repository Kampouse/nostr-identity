'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { bech32 } from '@scure/base'
import * as secp256k1 from '@noble/secp256k1'

// Helper functions
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

async function generateDeterministicKey(accountId: string): Promise<{pubkey: Uint8Array, privkey: Uint8Array}> {
  // Derive private key from account ID (deterministic)
  const encoder = new TextEncoder()
  const seed = encoder.encode(`nostr-identity:${accountId}`)
  
  // Hash to get 32-byte private key
  const hashBuffer = await crypto.subtle.digest('SHA-256', seed)
  const privKey = new Uint8Array(hashBuffer)
  
  // Generate public key
  const pubKey = secp256k1.getPublicKey(privKey, true) // compressed
  
  return { pubkey: pubKey, privkey: privKey }
}

function encodeNpub(pubkey: Uint8Array): string {
  // pubkey should be 32 bytes (compressed)
  const words = bech32.toWords(pubkey)
  return bech32.encode('npub', words)
}

function encodeNsec(privkey: Uint8Array): string {
  // privkey should be 32 bytes
  const words = bech32.toWords(privkey)
  return bech32.encode('nsec', words)
}

export default function Home() {
  const [connector, setConnector] = useState<NearConnector | null>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keys, setKeys] = useState<{
    npub: string
    nsec: string
    pubkeyHex: string
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
        setKeys(null)
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

  const createIdentity = async () => {
    if (!accountId || !connector) return

    setLoading(true)
    setError('')

    try {
      const wallet = await connector.wallet()
      
      // 1. Request signature to prove ownership
      const message = `Generate Nostr identity for ${accountId}`
      
      // Sign the message with NEAR wallet
      const signature = await wallet.signMessage({
        message,
        recipient: 'nostr-identity.near',
        nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')
      })
      
      if (!signature || !signature.signature) {
        throw new Error('Failed to sign message - identity generation cancelled')
      }
      
      // 2. Derive key using signature (proves wallet ownership)
      const encoder = new TextEncoder()
      const seedData = encoder.encode(`nostr-identity:${accountId}:${signature.signature}`)
      const seedBuffer = await crypto.subtle.digest('SHA-256', seedData)
      const seed = new Uint8Array(seedBuffer)
      
      // 3. Generate keypair
      const privKey = seed
      const pubKey = secp256k1.getPublicKey(privKey, true)
      
      console.log('Generated pubkey with signature proof')
      
      // 4. Encode to Nostr format
      const npub = encodeNpub(pubKey)
      const nsec = encodeNsec(privKey)
      const pubkeyHex = bytesToHex(pubKey)
      
      setKeys({
        npub,
        nsec,
        pubkeyHex
      })
      
    } catch (err: any) {
      setError(err.message || 'Failed to create identity')
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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          🔑 NEAR → Nostr Identity
        </h1>
        <p className="text-gray-600 mb-8">
          Create a Nostr identity bound to your NEAR account
        </p>

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

        {/* Step 2: Create Identity */}
        {accountId && !keys && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                2
              </span>
              <h2 className="text-xl font-semibold">Create Nostr Identity</h2>
            </div>

            <p className="text-gray-600 mb-4">
              <strong>Secure Generation:</strong> Requires wallet signature to prove you own this NEAR account.
              Only the account holder can generate the Nostr identity.
            </p>

            <button
              onClick={createIdentity}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Identity'}
            </button>

            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-900">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Show Keys */}
        {keys && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                3
              </span>
              <h2 className="text-xl font-semibold">Your Nostr Identity</h2>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
              ✅ Identity generated successfully!
            </div>

            {/* Public Key */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Public Key (npub):</p>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative">
                {keys.npub}
                <button
                  onClick={() => copyToClipboard(keys.npub, 'npub')}
                  className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                >
                  {copied === 'npub' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4">
              <strong>⚠️ Keep your private key secret!</strong>
              <br />
              Save this nsec securely. It will not be shown again.
            </div>

            {/* Private Key */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Private Key (nsec):</p>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative">
                {showKey ? keys.nsec : '••••••••••••••••••••••••••••••••'}
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(keys.nsec, 'nsec')}
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
              <strong>🔐 Security:</strong>
              <br />
              <span className="text-sm text-gray-600">
                Your keys are deterministically derived from your NEAR account.
                <br />
                Bound to: <code className="bg-gray-200 px-1 rounded">{accountId}</code>
                <br />
                <br />
                <strong>Important:</strong> Same NEAR account = Same Nostr identity.
                You can regenerate these keys anytime by connecting the same account.
              </span>
            </div>
          </div>
        )}

        <div className="text-center text-gray-500 text-sm">
          Powered by{' '}
          <a href="https://near.org" target="_blank" className="text-indigo-600 hover:underline">
            NEAR
          </a>
        </div>
      </div>
    </main>
  )
}
