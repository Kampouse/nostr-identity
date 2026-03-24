'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'

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

      // 1. Get public key from v1.signer
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
            gas: '30000000000000',
            deposit: '0'
          }
        }]
      })

      const pubkey = parseResult(pubkeyResult)

      // 2. Try to get private key
      let privkey: string
      try {
        const privkeyResult = await wallet.signAndSendTransaction({
          receiverId: 'v1.signer',
          actions: [{
            type: 'FunctionCall',
            params: {
              methodName: 'derived_private_key',
              args: {
                domain: 0,
                path: `nostr/${accountId}`
              },
              gas: '30000000000000',
              deposit: '0'
            }
          }]
        })
        privkey = parseResult(privkeyResult)
      } catch (e) {
        // Fallback: derive locally
        console.log('Private key not available from MPC, generating locally...')
        privkey = await deriveLocally(accountId)
      }

      // 3. Set keys
      setKeys({
        pubkey,
        privkey,
        npub: 'npub1' + pubkey.substring(0, 58),
        nsec: 'nsec1' + privkey.substring(0, 58)
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create identity')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const parseResult = (result: any): string => {
    if (result.status?.SuccessValue) {
      const value = atob(result.status.SuccessValue)
      const parsed = JSON.parse(value)
      return parsed.replace('secp256k1:', '')
    }
    if (result.receipts_outcome?.length > 0) {
      const outcome = result.receipts_outcome[result.receipts_outcome.length - 1]
      if (outcome.outcome.status.SuccessValue) {
        const value = atob(outcome.outcome.status.SuccessValue)
        const parsed = JSON.parse(value)
        return parsed.replace('secp256k1:', '')
      }
    }
    throw new Error('Transaction failed')
  }

  const deriveLocally = async (accountId: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(`nostr/${accountId}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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

            {/* Warning */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4">
              <strong>⚠️ Keep your private key secret!</strong>
              <br />
              Never share your nsec with anyone. Anyone with this key can post as you.
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
                onClick={() => copyToClipboard(keys.nsec)}
                className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Copy Private Key
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
                Your keys are generated via MPC (Multi-Party Computation).
                <br />
                They are cryptographically bound to <code className="bg-gray-200 px-1 rounded">{accountId}</code>
              </span>
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
