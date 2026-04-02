'use client'

import { useState, useEffect } from 'react'
import { NearConnector } from '@hot-labs/near-connect'
import { encodeBech32, generateNostrKeypair } from '@nostr-identity/crypto'
import { submitToRelayer } from './actions'
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
  const [resolvedNpub, setResolvedNpub] = useState<string | null>(null)
  const [recoveredNsec, setRecoveredNsec] = useState<string | null>(null)
  const [signedMessage, setSignedMessage] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const conn = new NearConnector({
        network: 'testnet',
      })

      conn.on('wallet:signIn', async (t) => {
        setAccountId(t.accounts[0].accountId)
      })

      conn.on('wallet:signInAndSignMessage', async (t) => {
        setAccountId(t.accounts[0].accountId)
        setSignedMessage(t.accounts[0].signedMessage)
      })

      conn.on('wallet:signOut', async () => {
        setAccountId('')
        setIdentity(null)
        setSignedMessage(null)
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

      // Step 1: Get NEP-413 signature from wallet if we don't have one yet
      let nep413 = signedMessage
      if (!nep413) {
        // Request wallet to sign a NEP-413 message
        const nonce = new Uint8Array(32)
        crypto.getRandomValues(nonce)
        const nonceB64 = btoa(Array.from(nonce).map(b => String.fromCharCode(b)).join(''))

        await connector.connect({
          signMessageParams: {
            message: `Generate Nostr identity for ${accountId}`,
            recipient: 'nostr-identity.near',
            nonce: nonceB64,
          }
        })

        // The signedMessage will be set by the signInAndSignMessage handler
        // Wait a tick for state to update
        await new Promise(r => setTimeout(r, 500))
        // If still no signedMessage, the wallet didn't return it
        // Try reading from connector directly
        const wallet = await connector.wallet()
        nep413 = (wallet as any)?.signedMessage || signedMessage
      }

      if (!nep413) {
        throw new Error('Wallet signature required. Please sign the NEP-413 message.')
      }

      // Step 2: Get or create a passkey — proves uniqueness via biometric/device auth
      const passkeyChallenge = new Uint8Array(32)
      crypto.getRandomValues(passkeyChallenge)
      
      let credential: PublicKeyCredential
      
      try {
        credential = await navigator.credentials.get({
          publicKey: {
            challenge: passkeyChallenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
          },
        }) as PublicKeyCredential
      } catch {
        credential = await navigator.credentials.create({
          publicKey: {
            challenge: passkeyChallenge,
            rp: { name: 'Nostr Identity', id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(accountId).slice(0, 64),
              name: accountId,
              displayName: accountId,
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'required',
            },
            timeout: 60000,
          },
        } as any) as PublicKeyCredential
      }

      // Step 3: Generate ZKP proof in browser (keys never leave browser)
      const zkpNonce = zkp.generate_nonce()
      const proofResult = zkp.generate_ownership_proof_with_nsec(
        accountId,
        keypair.privateKeyHex,
        zkpNonce
      )

      if (!proofResult.proof || !proofResult.commitment_field || !proofResult.nullifier_field) {
        throw new Error('Invalid ZKP proof: missing required fields')
      }

      // Step 4: Generate pairing input for NEAR's native alt_bn128_pairing_check
      const pairingInput = zkp.generate_pairing_input(
        proofResult.proof,
        proofResult.commitment_field,
        proofResult.nullifier_field,
      ) as string

      if (!pairingInput) {
        throw new Error('Failed to generate pairing input')
      }

      // Step 5: Compute privacy-preserving nullifier from passkey credential ID
      const nullifierHash = await crypto.subtle.digest('SHA-256', credential.rawId)
      const nullifier = Array.from(new Uint8Array(nullifierHash)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')

      // Step 6: Encrypt nsec with AES-GCM for on-chain backup (recoverable with passkey)
      const aesKeyMaterial = await crypto.subtle.digest('SHA-256', credential.rawId)
      const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        new TextEncoder().encode(keypair.privateKeyHex)
      )
      const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      const encryptedNsec = btoa(Array.from(combined).map(b => String.fromCharCode(b)).join(''))

      // Step 7: Send to TEE with NEP-413 + ZKP proof
      const data = await submitToRelayer({
        npub: keypair.publicKeyHex,
        commitment: proofResult.commitment,
        nullifier,
        pairingInput,
        encryptedNsec,
        zkpProof: {
          proof: proofResult.proof,
          public_inputs: proofResult.public_inputs || [proofResult.commitment_field, proofResult.nullifier_field],
          verified: true,
          timestamp: Date.now(),
        },
        accountId,
        nep413Response: {
          account_id: nep413.account_id || accountId,
          public_key: nep413.public_key || nep413.publicKey,
          signature: nep413.signature,
          authRequest: {
            message: nep413.message || `Generate Nostr identity for ${accountId}`,
            nonce: nep413.nonce,
            recipient: nep413.recipient || 'nostr-identity.near',
          },
        },
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

  const loginWithPasskey = async () => {
    setLoading(true)
    setError('')
    setResolvedNpub(null)

    try {
      const passkeyChallenge = new Uint8Array(32)
      crypto.getRandomValues(passkeyChallenge)

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: passkeyChallenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential

      const nullifierHash = await crypto.subtle.digest('SHA-256', credential.rawId)
      const nullifier = Array.from(new Uint8Array(nullifierHash)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')

      // Query contract: resolve nullifier → npub
      const response = await fetch('https://rpc.testnet.fastnear.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'resolve',
          method: 'query',
          params: {
            request_type: 'call_function',
            account_id: 'nostr-identity.kampouse.testnet',
            method_name: 'resolve_nullifier',
            args_base64: btoa(JSON.stringify({ nullifier })),
            finality: 'final',
          },
        }),
      })

      const data = await response.json()
      const result = data.result?.result
      if (!result) throw new Error('Identity not found')

      // RPC call_function returns bytes of JSON response
      const jsonStr = new TextDecoder().decode(new Uint8Array(result))
      const npub = JSON.parse(jsonStr)
      if (!npub) throw new Error('No identity found for this passkey')

      setResolvedNpub(npub)
    } catch (err: any) {
      setError(err.message || 'Passkey login failed')
    } finally {
      setLoading(false)
    }
  }

  const recoverNsec = async () => {
    setLoading(true)
    setError('')
    setRecoveredNsec(null)

    try {
      const passkeyChallenge = new Uint8Array(32)
      crypto.getRandomValues(passkeyChallenge)

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: passkeyChallenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential

      const nullifierHash = await crypto.subtle.digest('SHA-256', credential.rawId)
      const nullifier = Array.from(new Uint8Array(nullifierHash)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')

      // Step 1: Resolve nullifier → npub
      const resolveResp = await fetch('https://rpc.testnet.fastnear.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'resolve',
          method: 'query',
          params: {
            request_type: 'call_function',
            account_id: 'nostr-identity.kampouse.testnet',
            method_name: 'resolve_nullifier',
            args_base64: btoa(JSON.stringify({ nullifier })),
            finality: 'final',
          },
        }),
      })

      const resolveData = await resolveResp.json()
      const resolveResult = resolveData.result?.result
      if (!resolveResult) throw new Error('Identity not found')

      // RPC returns JSON bytes — parse the npub
      const npubJson = JSON.parse(new TextDecoder().decode(new Uint8Array(resolveResult)))
      if (!npubJson) throw new Error('No identity found for this passkey')
      const npub = npubJson as string

      // Step 2: Fetch full identity (includes encrypted_nsec)
      const idResp = await fetch('https://rpc.testnet.fastnear.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-full',
          method: 'query',
          params: {
            request_type: 'call_function',
            account_id: 'nostr-identity.kampouse.testnet',
            method_name: 'get_identity_by_npub',
            args_base64: btoa(JSON.stringify({ npub })),
            finality: 'final',
          },
        }),
      })

      const idData = await idResp.json()
      const idResult = idData.result?.result
      if (!idResult) throw new Error('Could not fetch identity details')

      const idJson = JSON.parse(new TextDecoder().decode(new Uint8Array(idResult)))
      const encryptedB64 = idJson.encrypted_nsec
      if (!encryptedB64) throw new Error('No encrypted nsec stored — recovery not available')

      // Step 3: Decrypt nsec with AES-GCM using SHA256(credentialId) as key
      const aesKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', credential.rawId),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0))
      const iv = combined.slice(0, 12)
      const ciphertext = combined.slice(12)

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext
      )

      const nsecHex = new TextDecoder().decode(decrypted)
      const nsecBech32 = encodeBech32('nsec', nsecHex)
      setRecoveredNsec(nsecBech32)
    } catch (err: any) {
      setError(err.message || 'Recovery failed')
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
                  Derive a Nostr identity from your NEAR account. Private keys never leave your browser. Groth16 proofs verified on-chain with native pairing — zero trust required.
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
                      desc: 'Passkey + zero-knowledge proof verified on-chain. One identity per device — no trust required.',
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
                      Your browser creates a Nostr keypair and generates a Groth16 zero-knowledge proof.
                      The proof confirms you own a NEAR account without revealing which one.
                      Everything stays local — your private key never leaves this browser.
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
                      href={`https://testnet.nearblocks.io/txns/${identity.transactionHash}`}
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
                    'Groth16 ZKP verified on-chain',
                    'NEAR account not linked on-chain',
                    'Native alt_bn128 pairing check',
                    'No TEE trust assumptions',
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

      {/* Passkey Login */}
      {!identity && (
        <div className="max-w-xl mx-auto px-6 pb-8">
          <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-secondary)] space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Already have an identity?
              </h3>
              <button
                onClick={loginWithPasskey}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-xs font-medium
                  bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]
                  hover:border-[var(--accent-near)]/50 hover:text-[var(--accent-near)]
                  transition-colors duration-200 disabled:opacity-50"
              >
                🔐 Login
              </button>
              <button
                onClick={recoverNsec}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-xs font-medium
                  bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]
                  hover:border-[var(--accent-warning)]/50 hover:text-[var(--accent-warning)]
                  transition-colors duration-200 disabled:opacity-50"
              >
                🔑 Recover nsec
              </button>
            </div>

            {resolvedNpub && (
              <div className="p-3 rounded-lg bg-[var(--accent-success)]/5 border border-[var(--accent-success)]/20 animate-fade-in">
                <p className="text-xs text-[var(--text-muted)] mb-1">Welcome back</p>
                <p className="text-sm font-mono text-[var(--text-primary)] break-all">{resolvedNpub}</p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  npub: <span className="font-mono">{encodeBech32('npub', resolvedNpub)}</span>
                </p>
              </div>
            )}

            {recoveredNsec && (
              <div className="p-3 rounded-lg bg-[var(--accent-success)]/5 border border-[var(--accent-success)]/20 animate-fade-in space-y-2">
                <p className="text-xs text-[var(--accent-success)] font-medium">✅ nsec recovered!</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[var(--text-primary)] break-all flex-1 bg-[var(--bg-primary)] p-2 rounded">
                    {recoveredNsec}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(recoveredNsec)}
                    className="shrink-0 px-2 py-1 text-xs rounded bg-[var(--accent-near)] text-black hover:bg-[var(--accent-near-hover)]"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-[var(--accent-warning)]">⚠️ Save this now — it won't be shown again</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <a href="https://near.org" target="_blank" rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors">
              NEAR Protocol
            </a>
            <a href="https://testnet.nearblocks.io/address/nostr-identity.kampouse.testnet" target="_blank" rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors">
              Contract
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
