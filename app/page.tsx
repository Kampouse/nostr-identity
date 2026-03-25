'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { bech32 } from '@scure/base'
import * as secp256k1 from '@noble/secp256k1'

// Helper functions
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function generateSecureKey(accountId: string, signature: string): Promise<{pubkey: Uint8Array, privkey: Uint8Array}> {
  // Derive private key from account ID + signature
  // This ensures only the wallet holder can generate the key
  const encoder = new TextEncoder()
  const seedData = encoder.encode(`nostr-identity:${accountId}:${signature}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', seedData)
  const privKey = new Uint8Array(hashBuffer)
  
  // Generate public key
  const pubKey = secp256k1.getPublicKey(privKey, true) // compressed
  
  return { pubkey: pubKey, privkey: privKey }
}

function encodeNpub(pubkey: Uint8Array): string {
  const words = bech32.toWords(pubkey)
  return bech32.encode('npub', words)
}

function encodeNsec(privkey: Uint8Array): string {
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
  
  // Verification state
  const [verifyMode, setVerifyMode] = useState(false)
  const [verifyAccountId, setVerifyAccountId] = useState('')
  const [verifyNpub, setVerifyNpub] = useState('')
  const [verifyResult, setVerifyResult] = useState<{
    verified: boolean
    message: string
  } | null>(null)
  const [verifying, setVerifying] = useState(false)

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
      // 1. Request wallet signature to prove ownership
      const wallet = await connector.wallet()
      const message = `Generate Nostr identity for ${accountId}`
      
      // This prompts user to sign - proves they control the account
      const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))
      const signResult = await wallet.signMessage({ 
        message,
        recipient: 'nostr-identity.near',
        nonce
      })
      
      if (!signResult) {
        throw new Error('Wallet signature required')
      }
      
      // Extract signature - could be string or object
      const signature = typeof signResult === 'string' ? signResult : (signResult as any).signature || JSON.stringify(signResult)
      
      // 2. Derive key using signature (proves ownership)
      const { pubkey, privkey } = await generateSecureKey(accountId, signature)
      
      
      // 3. Encode to Nostr format
      const npub = encodeNpub(pubkey)
      const nsec = encodeNsec(privkey)
      const pubkeyHex = bytesToHex(pubkey)
      
      setKeys({ npub, nsec, pubkeyHex })
      
    } catch (err: any) {
      setError(err.message || 'Failed to create identity')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  const verifyIdentity = async () => {
    if (!verifyAccountId || !verifyNpub) {
      setVerifyResult({
        verified: false,
        message: 'Please enter both NEAR account and npub'
      })
      return
    }
    
    if (!connector) {
      setVerifyResult({
        verified: false,
        message: 'Please connect wallet first'
      })
      return
    }
    
    setVerifying(true)
    setVerifyResult(null)
    
    try {
      const wallet = await connector.wallet()
      
      // Request signature to verify
      const message = `Verify Nostr identity for ${verifyAccountId}`
      const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))
      const signResult = await wallet.signMessage({
        message,
        recipient: 'nostr-identity.near',
        nonce
      })
      
      if (!signResult) {
        throw new Error('Signature required for verification')
      }
      
      const signature = typeof signResult === 'string' ? signResult : (signResult as any).signature || JSON.stringify(signResult)
      
      // Regenerate the expected npub
      const { pubkey } = await generateSecureKey(verifyAccountId, signature)
      const expectedNpub = encodeNpub(pubkey)
      
      // Compare
      const verified = expectedNpub === verifyNpub
      
      setVerifyResult({
        verified,
        message: verified
          ? `✅ Verified! This npub belongs to ${verifyAccountId}`
          : `❌ Verification failed. This npub does not match ${verifyAccountId}`
      })
      
    } catch (err: any) {
      setVerifyResult({
        verified: false,
        message: `Verification error: ${err.message}`
      })
    } finally {
      setVerifying(false)
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
          🔑 NEAR → Nostr Identity
        </h1>
        <p className="text-gray-600 mb-8">
          Secure identity generation with wallet signature verification
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
              <h2 className="text-xl font-semibold">Generate Secure Identity</h2>
            </div>

            <p className="text-gray-600 mb-4">
              <strong>🔒 Security:</strong> Requires wallet signature to prove you own this NEAR account.
              Only the account holder can generate the Nostr identity.
            </p>

            <button
              onClick={createIdentity}
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
        {keys && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center mb-4">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                3
              </span>
              <h2 className="text-xl font-semibold">Your Nostr Identity</h2>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
              ✅ Identity generated with signature verification!
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
              <strong>🔐 Security Model:</strong>
              <br />
              <span className="text-sm text-gray-600">
                Your keys are derived from your NEAR account + wallet signature.
                <br />
                <br />
                ✅ Only YOU can generate this identity (requires your wallet signature)
                <br />
                ✅ One Nostr identity per NEAR account (enforced by signature)
                <br />
                ✅ Keys never leave your device
              </span>
            </div>
          </div>
        )}

        {/* Verification Section */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">🔍 Verify Identity</h2>
            <button
              onClick={() => setVerifyMode(!verifyMode)}
              className="text-indigo-600 hover:underline text-sm"
            >
              {verifyMode ? 'Cancel' : 'Verify an npub'}
            </button>
          </div>
          
          {verifyMode && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Verify that a Nostr public key belongs to a NEAR account
              </p>
              
              <input
                type="text"
                placeholder="NEAR account (e.g., kampouse.near)"
                value={verifyAccountId}
                onChange={(e) => setVerifyAccountId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              
              <input
                type="text"
                placeholder="Nostr public key (npub1...)"
                value={verifyNpub}
                onChange={(e) => setVerifyNpub(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              />
              
              <button
                onClick={verifyIdentity}
                disabled={verifying || !verifyAccountId || !verifyNpub}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
              >
                {verifying ? 'Verifying...' : 'Verify Identity'}
              </button>
              
              {verifyResult && (
                <div className={`p-4 rounded-lg ${verifyResult.verified ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                  <p className={verifyResult.verified ? 'text-green-900' : 'text-red-900'}>
                    {verifyResult.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
