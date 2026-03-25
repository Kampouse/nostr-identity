'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { bech32 } from '@scure/base'
import bs58 from 'bs58'

// Helper to convert hex to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export default function Home() {
  const [connector, setConnector] = useState<NearConnector | null>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keys, setKeys] = useState<{
    pubkey: string
    privkey: string
    npub: string
    nsec: string
  } | null>(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    // Initialize near-connect
    const conn = new NearConnector({
      signIn: {
        contractId: 'v1.signer',
        methodNames: ['derived_public_key', 'sign']
      }
    })

    // Listen for sign in
    conn.on('wallet:signIn', async (t) => {
      const account = t.accounts[0].accountId
      setAccountId(account)
    })

    // Listen for sign out
    conn.on('wallet:signOut', async () => {
      setAccountId('')
      setKeys(null)
    })

    setConnector(conn)
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
    if (!connector || !accountId) return

    setLoading(true)
    setError('')

    try {
      const wallet = await connector.wallet()

      // 1. Call v1.signer.derived_public_key with SIGNED transaction
      // This requires user to approve in wallet
      const pubkeyResult = await wallet.signAndSendTransaction({
        receiverId: 'v1.signer',
        actions: [{
          type: 'FunctionCall',
          params: {
            methodName: 'derived_public_key',
            args: {
              domain: 0,
              path: `nostr/${accountId}`
            },
            gas: '30000000000000', // 30 TGas
            deposit: '0'
          }
        }]
      })

      // Parse the public key from result
      const pubkey = parseResult(pubkeyResult)
      
      // 2. For private key, we can't get it from MPC
      // User must sign events via v1.signer.sign() each time
      // OR we derive locally with same seed (less secure but usable)
      
      // For now, show pubkey only - user needs to sign each Nostr event via MPC
      setKeys({
        pubkey,
        privkey: '', // No private key - MPC holds it
        npub: hexToNpub(pubkey),
        nsec: '' // No nsec - must sign via MPC each time
      })
      
    } catch (err: any) {
      setError(err.message || 'Failed to create identity. Make sure you approved the transaction in your wallet.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  const parseResult = (result: any): string => {
    // Parse NEAR transaction result
    if (result.status?.SuccessValue) {
      const value = atob(result.status.SuccessValue)
      return JSON.parse(value).replace('secp256k1:', '')
    }
    if (result.receipts_outcome?.length > 0) {
      const outcome = result.receipts_outcome[result.receipts_outcome.length - 1]
      if (outcome.outcome.status.SuccessValue) {
        const value = atob(outcome.outcome.status.SuccessValue)
        return JSON.parse(value).replace('secp256k1:', '')
      }
    }
    throw new Error('Transaction failed - check wallet for details')
  }
  
  const hexToNpub = (pubkey: string): string => {
    // v1.signer returns "secp256k1:BASE58..."
    // Need to decode base58 to bytes, then encode to npub
    try {
      // Remove "secp256k1:" prefix if present
      const base58Key = pubkey.replace('secp256k1:', '')
      
      // Decode base58 to bytes
      const bytes = bs58.decode(base58Key)
      
      // Encode to npub using bech32
      const words = bech32.toWords(bytes)
      return bech32.encode('npub', words)
    } catch (e) {
      console.error('Failed to encode npub:', e)
      return 'Invalid pubkey'
    }
  }
  
  const hexToNsec = (privkey: string): string => {
    // Convert base58 privkey to nsec (bech32 encoding)
    try {
      // Remove prefix if present
      const base58Key = privkey.replace('secp256k1:', '')
      
      // Decode base58 to bytes
      const bytes = bs58.decode(base58Key)
      
      // Encode to nsec using bech32
      const words = bech32.toWords(bytes)
      return bech32.encode('nsec', words)
    } catch (e) {
      console.error('Failed to encode nsec:', e)
      return 'Invalid privkey'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          🔑 NEAR → Nostr Identity
        </h1>
        <p className="text-gray-600 mb-8">
          Create a Nostr identity bound to your NEAR account via MPC
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
              This will generate a Nostr keypair cryptographically bound to your NEAR account using MPC.
            </p>

            <button
              onClick={createIdentity}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating keys...' : 'Create Identity'}
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
              ✅ Identity created successfully!
            </div>

            {/* Public Key */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Public Key (npub):</p>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative">
                {keys.npub}
                <button
                  onClick={() => copyToClipboard(keys.npub)}
                  className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* MPC Info */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
              <strong>🔐 MPC-Secured Key</strong>
              <br />
              <span className="text-sm text-blue-900">
                Your Nostr public key is generated by MPC (Multi-Party Computation).
                <br />
                The private key NEVER exists in full - it's split across the MPC network.
                <br />
                <br />
                <strong>To sign Nostr events:</strong> You must call v1.signer.sign() for each event.
                <br />
                No nsec (private key) to export - this is maximum security.
              </span>
            </div>

            {/* Instructions */}
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold mb-3">⚠️ Important: No Private Key Export</h3>
              <p className="text-gray-700 text-sm mb-3">
                This is MPC-only mode. The private key is never exposed. You cannot import this into Damus/Primal directly.
              </p>
              <p className="text-gray-700 text-sm">
                To use this identity, you need a Nostr client that supports calling v1.signer.sign() for each event.
                <br />
                <br />
                For regular Nostr usage (Damus/Primal), use a different key generator that exports nsec.
              </p>
            </div>
          </div>
        )}

        <div className="text-center text-gray-500 text-sm">
          Powered by{' '}
          <a href="https://near.org" target="_blank" className="text-indigo-600 hover:underline">
            NEAR
          </a>{' '}
          +{' '}
          <a href="https://github.com/near-one/mpc" target="_blank" className="text-indigo-600 hover:underline">
            MPC
          </a>
        </div>
      </div>
    </main>
  )
}
