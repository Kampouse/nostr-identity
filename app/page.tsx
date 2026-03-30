'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { encodeBech32, generateNostrKeypair } from '@nostr-identity/crypto'
import { registerIdentityWithZKP } from './actions'

let zkpWasm: any = null

async function initZKP() {
  if (!zkpWasm) {
    zkpWasm = await import('@nostr-identity/zkp-wasm')
    await zkpWasm.default()
    await zkpWasm.initialize_zkp()
  }
  return zkpWasm
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 px-2.5 py-1 text-xs rounded-md transition-all duration-200
        border border-[var(--border-primary)] text-[var(--text-secondary)]
        hover:border-[var(--accent-near)] hover:text-[var(--accent-near)]"
    >
      {copied ? (
        <span className="animate-check text-[var(--accent-near)]">copied</span>
      ) : (
        'copy'
      )}
    </button>
  )
}

function MonospaceField({
  value,
  label,
  showCopy = true,
  hidden = false,
  onHide,
  onShow,
}: {
  value: string
  label: string
  showCopy?: boolean
  hidden?: boolean
  onHide?: () => void
  onShow?: () => void
}) {
  const displayValue = hidden
    ? value.substring(0, 12) + '...' + value.substring(value.length - 6)
    : value

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          {label}
        </span>
        {onHide && onShow && (
          <button
            onClick={hidden ? onShow : onHide}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {hidden ? 'reveal' : 'hide'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5">
        <code className="text-sm text-[var(--text-primary)] break-all flex-1 font-mono leading-relaxed">
          {displayValue}
        </code>
        {showCopy && <CopyButton text={value} label={label} />}
      </div>
    </div>
  )
}

export default function Home() {
  const [connector, setConnector] = useState<NearConnector | null>(null)
  const [accountId, setAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const init = async () => {
      const conn = new NearConnector({
        signIn: {
          contractId: 'v1.signer',
          methodNames: ['derived_public_key', 'sign']
        }
      })

      conn.on('wallet:signIn', async (t) => {
        setAccountId(t.accounts[0].accountId)
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

  const generateIdentity = async () => {
    if (!accountId || !connector) return

    setLoading(true)
    setError('')

    try {
      const zkp = await initZKP()
      const keypair = generateNostrKeypair()

      const message = `Generate Nostr identity for ${accountId}`
      const nonceBytes = new Uint8Array(32)
      crypto.getRandomValues(nonceBytes)

      const wallet = await connector.wallet()
      const authResponse = await wallet.signMessage({
        message,
        nonce: nonceBytes,
        recipient: 'nostr-identity.near'
      })

      if (!authResponse || !authResponse.signature) {
        throw new Error('Wallet signature required')
      }

      const zkpNonce = zkp.generate_nonce()
      const proofResult = zkp.generate_ownership_proof_with_nsec(
        accountId,
        keypair.privateKeyHex,
        zkpNonce
      )

      if (!proofResult.proof || !proofResult.commitment_field || !proofResult.nullifier_field) {
        throw new Error('Invalid ZKP proof: missing required fields')
      }

      const data = await registerIdentityWithZKP({
        npub: keypair.publicKeyHex,
        proof: proofResult.proof,
        commitmentField: proofResult.commitment_field,
        nullifierField: proofResult.nullifier_field,
        accountId: accountId,
        nep413Response: {
          accountId: accountId,
          publicKey: authResponse.publicKey,
          signature: authResponse.signature,
          authRequest: {
            message,
            nonce: Buffer.from(nonceBytes).toString('base64'),
            recipient: 'nostr-identity.near',
          }
        }
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to register identity')
      }

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] sticky top-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-md">
        <div className="px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
            nostr on <span className="text-[var(--accent-near)]">NEAR</span>
          </span>
          {accountId ? (
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-near)]" />
              <span className="text-xs text-[var(--text-secondary)] font-mono">
                {accountId.length > 20 ? accountId.slice(0, 10) + '...' + accountId.slice(-6) : accountId}
              </span>
              <button
                onClick={disconnectWallet}
                className="ml-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-colors"
              >
                disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="px-4 py-1.5 rounded-lg text-xs font-medium
                bg-[var(--accent-near)] text-black
                hover:bg-[var(--accent-near-hover)] transition-colors duration-200"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="max-w-xl w-full space-y-6">

          {/* Hero - only shown when not logged in */}
          {!accountId && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-5 hero-glow">
                <h2 className="text-4xl font-bold tracking-tight leading-[1.1]">
                  <span className="text-white">Your keys. Your identity.</span>
                  <br />
                  <span className="text-[var(--accent-near)] font-light text-[2.75rem] tracking-tight drop-shadow-[0_0_12px_var(--accent-near-dim)]">
                    Zero proof required.
                  </span>
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mt-4">
                  Derive a Nostr identity from your NEAR account. Private keys never leave your browser. Zero-knowledge proofs keep the link untraceable.
                </p>
              </div>

              {/* How it works */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  How it works
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      step: '1',
                      title: 'Connect NEAR',
                      desc: 'Sign in with your NEAR wallet to prove account ownership.',
                    },
                    {
                      step: '2',
                      title: 'Generate keys',
                      desc: 'A Nostr keypair is created in your browser. Your private key never leaves this page.',
                    },
                    {
                      step: '3',
                      title: 'Prove & register',
                      desc: 'A zero-knowledge proof is generated and registered on-chain, binding the two identities privately.',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="rounded-xl p-4 border bg-[var(--bg-secondary)] border-[var(--border-subtle)]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0
                          border border-[var(--border-primary)] text-[var(--text-muted)]">
                          {item.step}
                        </div>
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed pl-7">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Connect */}
          <div className="step-connector">
            <div className="flex items-start gap-3">
              <div className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center shrink-0 text-xs font-mono ${
                accountId
                  ? 'border-[var(--accent-near)] text-[var(--accent-near)] bg-[var(--accent-near-dim)]'
                  : 'border-[var(--border-primary)] text-[var(--text-muted)] bg-[var(--bg-secondary)]'
              }`}>
                {accountId ? '✓' : '1'}
              </div>
              <div className="flex-1 pt-0.5">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                  Connect NEAR wallet
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                  This signs one message to prove you control the account. Nothing is deployed or spent.
                </p>
                {!accountId ? (
                  <button
                    onClick={connectWallet}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium
                      bg-[var(--accent-near)] text-black
                      hover:bg-[var(--accent-near-hover)] transition-colors duration-200"
                  >
                    Connect
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-[var(--accent-near-dim)] border border-[var(--accent-near)]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-near)]" />
                    <span className="text-sm text-[var(--accent-near)] font-mono">
                      {accountId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Generate */}
          {accountId && !identity && (
            <div className="step-connector animate-fade-in">
              <div className="flex items-start gap-3">
                <div className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center shrink-0 text-xs font-mono ${
                  loading
                    ? 'border-[var(--accent-near)] text-[var(--accent-near)] bg-[var(--accent-near-dim)] animate-pulse'
                    : 'border-[var(--border-primary)] text-[var(--text-muted)] bg-[var(--bg-secondary)]'
                }`}>
                  {loading ? '...' : '2'}
                </div>
                <div className="flex-1 pt-0.5 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">
                      Generate identity
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      Your browser will create a Nostr keypair and build a zero-knowledge proof.
                      The proof confirms you own a NEAR account without revealing which one.
                      A TEE (trusted execution environment) verifies everything securely.
                    </p>
                  </div>

                  {/* Warning */}
                  <div className="flex gap-2.5 p-3 rounded-lg bg-[var(--accent-warning)]/5 border border-[var(--accent-warning)]/20">
                    <span className="text-[var(--accent-warning)] text-sm shrink-0 mt-0.5">
                      !
                    </span>
                    <p className="text-xs text-[var(--accent-warning)]/90 leading-relaxed">
                      Your private key (nsec) is generated locally and never sent anywhere.
                      <strong> You must save it when shown</strong> — it cannot be recovered.
                    </p>
                  </div>

                  <button
                    onClick={generateIdentity}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium
                      bg-[var(--accent-near)] text-black
                      hover:bg-[var(--accent-near-hover)] transition-colors duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center gap-2"
                  >
                    {loading && (
                      <span className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />
                    )}
                    {loading ? 'Generating...' : 'Generate identity'}
                  </button>

                  {error && (
                    <div className="flex gap-2.5 p-3 rounded-lg bg-[var(--accent-danger)]/5 border border-[var(--accent-danger)]/20 animate-fade-in">
                      <span className="text-[var(--accent-danger)] text-sm shrink-0 mt-0.5">
                        x
                      </span>
                      <p className="text-xs text-[var(--accent-danger)]/90">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Keys */}
          {identity && (
            <div className="animate-fade-in space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg
                bg-[var(--accent-success)]/5 border border-[var(--accent-success)]/20">
                <span className="text-[var(--accent-success)] text-sm shrink-0">
                  check
                </span>
                <div className="flex-1">
                  <p className="text-xs text-[var(--accent-success)]">
                    Identity registered on-chain
                  </p>
                  {identity.transactionHash && (
                    <a
                      href={`https://explorer.testnet.near.org/transactions/${identity.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                        font-mono mt-0.5 inline-block transition-colors"
                    >
                      tx: {identity.transactionHash.slice(0, 16)}...
                    </a>
                  )}
                </div>
              </div>

              {/* Keys card */}
              <div className="border border-[var(--border-subtle)] rounded-xl p-5 space-y-4
                bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    Your keys
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    generated locally
                  </span>
                </div>

                <div className="space-y-3">
                  <MonospaceField
                    value={identity.npubBech32}
                    label="Public key (npub)"
                  />

                  <div className="pt-1 border-t border-[var(--border-subtle)]" />

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-[var(--accent-danger)] uppercase tracking-wider font-medium">
                      Private key
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">-- never share</span>
                  </div>
                  <MonospaceField
                    value={identity.nsecBech32}
                    label="nsec"
                    hidden={!showKey}
                    onHide={() => setShowKey(false)}
                    onShow={() => setShowKey(true)}
                  />
                </div>
              </div>

              {/* Collapsible on-chain details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full text-left text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                  transition-colors flex items-center gap-1.5 py-1"
              >
                <span className={`transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`}>
                  &gt;
                </span>
                on-chain registration details
              </button>

              {showDetails && (
                <div className="animate-fade-in space-y-3 pl-4 border-l border-[var(--border-subtle)]">
                  <MonospaceField
                    value={identity.commitment}
                    label="Commitment (nsec-bound)"
                    showCopy={true}
                  />
                  <MonospaceField
                    value={identity.nullifier}
                    label="Nullifier"
                    showCopy={true}
                  />
                </div>
              )}

              {/* Import instructions */}
              <div className="border border-[var(--border-subtle)] rounded-xl p-5
                bg-[var(--bg-secondary)] space-y-3">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Import to Nostr
                </h3>
                <ol className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--text-muted)] font-mono shrink-0">1.</span>
                    Copy your private key above
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--text-muted)] font-mono shrink-0">2.</span>
                    Open your Nostr client
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--text-muted)] font-mono shrink-0">3.</span>
                    Go to Settings &rarr; Import key &rarr; paste nsec
                  </li>
                </ol>
              </div>

              {/* Privacy model - minimal */}
              <div className="space-y-2 px-1">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                  Privacy model
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Keys generated in browser',
                    'ZKP proves ownership',
                    'NEAR account not linked on-chain',
                    'TEE attestation enforced',
                    'Not recoverable',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="text-[var(--accent-near)] text-[10px]">+</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <a href="https://near.org" target="_blank" rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors">
              NEAR Protocol
            </a>
            <a href="https://outlayer.fastnear.com" target="_blank" rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors">
              OutLayer TEE
            </a>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            open source
          </span>
        </div>
      </footer>
    </div>
  )
}
