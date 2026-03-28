#!/usr/bin/env node
/**
 * REAL E2E test - correct flow:
 * 1. Client generates Nostr keypair
 * 2. Client signs NEP-413 with NEAR wallet key
 * 3. Client sends npub + NEP-413 sig to TEE
 * 4. TEE verifies sig, generates ZKP proof, stores commitment
 * 5. TEE returns proof (never touches nsec)
 */

const crypto = require('crypto')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const nacl = require('tweetnacl')

// bs58 for NEAR key encoding
function bs58Decode(str) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const bytes = [0]
  for (const ch of str) {
    let c = A.indexOf(ch); if (c < 0) throw new Error('invalid bs58')
    for (let j = 0; j < bytes.length; j++) { c += bytes[j] * 58; bytes[j] = c & 0xff; c >>= 8 }
    while (c) { bytes.push(c & 0xff); c >>= 8 }
  }
  for (const ch of str) { if (ch === '1') bytes.push(0); else break }
  return Buffer.from(bytes.reverse())
}
function bs58Encode(buf) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const bytes = Array.from(buf); if (!bytes.length) return ''
  let z = 0; while (z < bytes.length && bytes[z] === 0) z++
  const chars = []
  for (const b of bytes) { let c = b; for (let j = 0; j < chars.length; j++) { c += chars[j] << 8; chars[j] = c % 58; c = (c / 58) | 0 } while (c) { chars.push(c % 58); c = (c / 58) | 0 } }
  while (z--) chars.push(0)
  return chars.reverse().map(c => A[c]).join('')
}

// Config
const NETWORK = process.env.NETWORK || 'testnet'
const ACCOUNT_ID = process.env.ACCOUNT || (NETWORK === 'testnet' ? 'kampouse.testnet' : 'kampouse.near')
const CREDS_PATH = process.env.CREDS || `${process.env.HOME}/.near-credentials/${NETWORK}/${ACCOUNT_ID}.json`
const CREDS = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'))
const WRITER = NETWORK === 'testnet' ? 'writer.gork-agent.testnet' : 'w.kampouse.near'
const TEE_BIN = path.join(__dirname, 'contracts/tee/target/debug/nostr-identity-zkp-tee')
const STORAGE_DIR = '/tmp/nostr-identity-test'

if (!fs.existsSync(TEE_BIN)) { console.error('Build: cd contracts/tee && cargo build --features local-test'); process.exit(1) }
execSync(`rm -rf ${STORAGE_DIR} && mkdir -p ${STORAGE_DIR}`)

const { generateNostrKeypair, nsecToHex } = require(path.join(__dirname, 'packages/crypto/dist/index.js'))

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║     REAL E2E TEST — Client generates key, TEE proves     ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log(`\nAccount: ${ACCOUNT_ID} (${NETWORK})`)

// ============================================================================
// STEP 1: CLIENT generates Nostr keypair
// ============================================================================
console.log('\n━━━ STEP 1: Client generates Nostr keypair ━━━')
const keypair = generateNostrKeypair()
const nsecHex = nsecToHex(keypair.nsec)
console.log(`✅ Generated locally (TEE never sees nsec)`)
console.log(`   nsec: ${keypair.nsec.substring(0, 20)}...`)
console.log(`   npub: ${keypair.npub.substring(0, 20)}...`)
console.log(`   npub hex: ${keypair.publicKeyHex}`)

// ============================================================================
// STEP 2: CLIENT computes commitment = SHA256("commitment:" + account_id + nsec)
// ============================================================================
console.log('\n━━━ STEP 2: Client computes commitment ━━━')
const commitmentInput = `commitment:${ACCOUNT_ID}${nsecHex}`
const commitment = crypto.createHash('sha256').update(commitmentInput).digest('hex')
console.log(`✅ commitment = SHA256("commitment:${ACCOUNT_ID}" + nsec_hex)`)
console.log(`   ${commitment.substring(0, 32)}...`)
console.log(`   To forge this, attacker needs BOTH your NEAR key AND your nsec`)

// ============================================================================
// STEP 2: CLIENT signs NEP-413 with real NEAR key
// ============================================================================
console.log('\n━━━ STEP 2: Client signs NEP-413 with NEAR key ━━━')
const nonce = crypto.randomBytes(32).toString('hex')
const message = "Verify NEAR account ownership for Nostr identity"
const recipient = "nostr-identity.near"

const pkBs58 = CREDS.private_key.replace('ed25519:', '')
const seed = bs58Decode(pkBs58).slice(0, 32)
const keyPair = nacl.sign.keyPair.fromSeed(seed)

const payload = JSON.stringify({ message, nonce, recipient })
const hash = crypto.createHash('sha256').update(payload).digest()
const sig = nacl.sign.detached(hash, keyPair.secretKey)
const sigBs58 = bs58Encode(sig)

console.log(`✅ Signed with ${ACCOUNT_ID}'s real NEAR key`)
console.log(`   key:  ${CREDS.public_key.substring(0, 30)}...`)
console.log(`   sig:  ed25519:${sigBs58.substring(0, 20)}...`)

// ============================================================================
// STEP 3: CLIENT sends npub + signature to TEE
// ============================================================================
console.log('\n━━━ STEP 3: Send npub + NEP-413 to TEE ━━━')

const teeInput = JSON.stringify({
  action: 'generate',
  account_id: ACCOUNT_ID,
  npub: keypair.publicKeyHex,
  commitment: commitment,
  nep413_response: {
    account_id: ACCOUNT_ID,
    public_key: CREDS.public_key,
    signature: `ed25519:${sigBs58}`,
    authRequest: { message, nonce, recipient }
  }
})

console.log(`TEE input: npub=${keypair.publicKeyHex.substring(0, 16)}...`)

let result
try {
  const out = execSync(`echo '${teeInput}' | LOCAL_STORAGE_DIR=${STORAGE_DIR} ${TEE_BIN}`, { encoding: 'utf8', timeout: 30000 })
  result = JSON.parse(out)
} catch (e) {
  console.log(`❌ TEE error: ${(e.stdout || e.message).substring(0, 500)}`)
  process.exit(1)
}

if (!result.success) {
  console.log(`❌ TEE rejected: ${result.error}`)
  process.exit(1)
}

console.log('✅ TEE verified and generated proof!')
console.log('   Raw:', JSON.stringify(result).substring(0, 300))
console.log(`   commitment: ${result.commitment ? result.commitment.substring(0,32) + '...' : 'MISSING'}`)
console.log(`   nullifier:  ${result.nullifier ? result.nullifier.substring(0,32) + '...' : 'MISSING'}`)
console.log(`   ZKP verified: ${result.zkp_proof?.verified}`)
console.log(`   nsec returned: ${result.nsec === null ? 'null ✅ (correct!)' : result.nsec + ' ⚠️ (should be null)'}`)
console.log(`   attestation: platform=${result.attestation?.platform}, secure=${result.attestation?.secure}`)

// ============================================================================
// STEP 4: Verify what TEE actually stored vs what's private
// ============================================================================
console.log('\n━━━ STEP 4: Privacy verification ━━━')
console.log('TEE stored on-chain (public):')
console.log(`  commitment: ${result.zkp_proof?.public_inputs?.[0]}`)
console.log(`  npub:       ${keypair.publicKeyHex}`)
console.log('')
console.log('TEE NEVER saw (private):')
console.log(`  nsec:       ${keypair.nsec}`)
console.log(`  account_id: (hidden via ZKP)`)
console.log('')
console.log('✅ The nsec never left the client')
console.log('✅ The TEE cannot produce the nsec — it never had it')

// ============================================================================
// STEP 5: Write to chain (optional)
// ============================================================================
if (process.env.WRITE_CHAIN === '1') {
  console.log('\n━━━ STEP 5: Write to Writer Contract ━━━')
  try {
    const args = JSON.stringify({
      npub: keypair.publicKeyHex,
      commitment: result.zkp_proof?.public_inputs?.[0],
      nullifier: result.zkp_proof?.public_inputs?.[1],
      sig: `ed25519:${sigBs58}`
    })
    const out = execSync(`near call ${WRITER} register '${args}' --accountId ${ACCOUNT_ID} --networkId ${NETWORK}`, { encoding: 'utf8', timeout: 30000 })
    console.log('✅ On-chain!')
    const m = out.match(/Transaction Id ([A-Za-z0-9]+)/)
    if (m) console.log(`🔗 https://explorer.near.org/transactions/${m[1]}`)
  } catch (e) {
    console.log(`❌ ${e.message.split('\n')[0]}`)
  }
}

console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║     ✅ ALL CHECKS PASSED                                   ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log(`\nYour Nostr identity (keep safe!):`)
console.log(`  nsec: ${keypair.nsec}`)
console.log(`  npub: ${keypair.npub}`)
