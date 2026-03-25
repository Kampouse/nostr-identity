# Smart Contract vs TEE - Architecture Comparison

**Date:** March 25, 2026

---

## 📊 Quick Comparison

| Aspect | TEE (Current) | Smart Contract |
|--------|---------------|----------------|
| **Cost** | Free (no gas) | ~0.001 NEAR per operation |
| **Speed** | 100ms | 1-2 seconds (block time) |
| **Privacy** | Keys in TEE (private) | Data on-chain (public) |
| **Storage** | Encrypted in TEE | Public on blockchain |
| **Trust Model** | Trust TEE hardware | Trust blockchain consensus |
| **Recovery** | NEP-413 signature | On-chain ownership proof |
| **Upgrades** | Easy (redeploy WASM) | Hard (migration needed) |
| **Verification** | Off-chain | On-chain, verifiable by all |

---

## 🏗️ Smart Contract Architecture

### Contract Structure

```rust
// On-chain storage (public!)
pub struct NostrIdentityContract {
    identities: LookupMap<AccountId, IdentityInfo>,
    commitments: LookupMap<String, AccountId>,
    nullifiers: UnorderedSet<String>,
    total_identities: u64,
}

pub struct IdentityInfo {
    pub npub: String,           // PUBLIC - visible to everyone
    pub commitment: String,     // PUBLIC - commitment hash
    pub nullifier: String,      // PUBLIC - for double registration check
    pub created_at: u64,        // PUBLIC - timestamp
    pub owner: AccountId,       // PUBLIC - who owns it
}
```

### Deployment

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Create account
near create-account nostr-identity.near --useFaucet

# Deploy
near deploy --accountId nostr-identity.near \
  --wasmFile target/wasm32-unknown-unknown/release/nostr_identity_contract.wasm

# Initialize
near call nostr-identity.near new --accountId nostr-identity.near
```

### Usage

```typescript
// Register identity
await near.call('nostr-identity.near', 'register_identity', {
  npub: 'npub1abc123...',
  commitment: 'hash123...',
  nullifier: 'hash456...',
  signature: 'ed25519:...',
  public_key: 'ed25519:...',
  message: 'Register identity for alice.near'
}, {
  gas: '30000000000000',
  attachedDeposit: '0'
})

// Get identity
const identity = await near.view('nostr-identity.near', 'get_identity', {
  account_id: 'alice.near'
})

// Check if registered
const exists = await near.view('nostr-identity.near', 'has_identity', {
  account_id: 'alice.near'
})
```

---

## 🔒 What's Public vs Private

### TEE Approach (Current)

**Private (in TEE):**
- ✅ Nostr private key (nsec) - NEVER exposed
- ✅ Commitment pre-image
- ✅ Nullifier pre-image
- ✅ All computation happens in secure hardware

**Public:**
- User's NEAR account ID (for authentication)
- That's it!

### Smart Contract Approach

**Public (on blockchain):**
- ❌ Nostr public key (npub) - EVERYONE can see
- ❌ Commitment hash
- ❌ Nullifier hash
- ❌ Timestamp
- ❌ Owner account
- ❌ All transactions and data

**Private:**
- ✅ Nostr private key (nsec) - stored by user locally

---

## 💰 Cost Comparison

### TEE (Current)

```
Register identity:    $0.00 (free)
Recover identity:     $0.00 (free)
Verify identity:      $0.00 (free)
Storage:              $0.00 (OutLayer covers)
Total per identity:   $0.00
```

### Smart Contract

```
Register identity:    0.001 NEAR (~$0.001)
Recover identity:     0.0001 NEAR (~$0.0001)
Verify identity:      0.0001 NEAR (~$0.0001)
Storage:              0.01 NEAR/MB/year (~$0.01)
Total per identity:   ~$0.012
```

**For 1000 identities:**
- TEE: $0.00
- Smart Contract: ~$12.00

---

## ⚡ Performance Comparison

### TEE (Current)

```
Latency:      100ms (off-chain)
Throughput:   ~1000 req/sec
Finality:     Instant
Availability: 99.9% (depends on OutLayer)
```

### Smart Contract

```
Latency:      1-2 seconds (block time)
Throughput:   ~100 tx/sec (NEAR network)
Finality:     1-2 blocks (1-2 seconds)
Availability: 100% (decentralized blockchain)
```

---

## 🔐 Security Comparison

### TEE Security

**Pros:**
- ✅ Private keys never exposed
- ✅ Computation in secure hardware
- ✅ No public data leakage
- ✅ Encrypted storage

**Cons:**
- ⚠️ Trust TEE manufacturer (Intel/AMD)
- ⚠️ Single point of failure (OutLayer)
- ⚠️ Attestation required for trust
- ⚠️ Side-channel attacks possible

### Smart Contract Security

**Pros:**
- ✅ Decentralized (no single point of failure)
- ✅ Cryptographically verifiable
- ✅ Immutable (can't be changed)
- ✅ Transparent (all operations visible)

**Cons:**
- ⚠️ All data public on blockchain
- ⚠️ No private key storage
- ⚠️ User must manage nsec locally
- ⚠️ Can't hide commitment pre-image

---

## 🎯 Use Cases

### Use TEE When:
- ✅ Privacy is critical (keys must stay secret)
- ✅ Fast response time needed (<200ms)
- ✅ Free operations required
- ✅ Flexible upgrades needed
- ✅ Storing sensitive data

**Example:** Private messaging app, anonymous identities

### Use Smart Contract When:
- ✅ Transparency is required (verifiable by all)
- ✅ Decentralization is critical
- ✅ Public registry needed
- ✅ Cross-chain verification
- ✅ Regulatory compliance (audit trail)

**Example:** Public identity registry, KYC verification, DAO membership

---

## 🔄 Hybrid Approach (Best of Both)

**Recommended:** Use BOTH together!

### Architecture

```
1. TEE: Generate & store private key (nsec)
   ↓
2. Smart Contract: Register public commitment (npub + commitment hash)
   ↓
3. User: Gets both privacy (TEE) + verifiability (blockchain)
```

### Benefits

- ✅ Private key stays secret (TEE)
- ✅ Public proof exists (blockchain)
- ✅ Fast operations (TEE)
- ✅ Verifiable by all (blockchain)
- ✅ Recovery from both sides

### Implementation

```typescript
// 1. Generate in TEE
const { npub, nsec, commitment } = await fetch(TEE_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'generate',
    account_id: 'alice.near',
    nep413_response: signature
  })
}).then(r => r.json())

// 2. Register on blockchain
await near.call('nostr-identity.near', 'register_identity', {
  npub,
  commitment,
  nullifier: hash(commitment + nonce),
  signature,
  public_key,
  message
})

// 3. Now you have:
// - nsec in TEE (private, recoverable)
// - npub on blockchain (public, verifiable)
```

---

## 📋 Decision Matrix

| Requirement | TEE | Smart Contract | Hybrid |
|-------------|-----|----------------|--------|
| **Privacy** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Cost** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Speed** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Decentralization** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Verifiability** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Security** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Flexibility** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |

---

## 🚀 Recommended Path

### Phase 1: TEE Only (Current) ✅
- Fast, free, private
- Perfect for MVP
- Already built and tested

### Phase 2: Add Smart Contract (Optional)
- Add on-chain registry
- Public verification
- Decentralized backup

### Phase 3: Hybrid (Future)
- Best of both worlds
- Maximum security + usability
- Full production system

---

## 💡 Implementation Steps (Smart Contract)

### 1. Create Contract (5 min)
```bash
cargo new nostr-identity-contract --lib
cd nostr-identity-contract
# Add near-sdk to Cargo.toml
# Implement contract logic (see lib.rs)
```

### 2. Build & Test (10 min)
```bash
cargo build --target wasm32-unknown-unknown --release
cargo test
```

### 3. Deploy (5 min)
```bash
near create-account nostr-identity.near --useFaucet
near deploy --accountId nostr-identity.near --wasmFile target/.../release/nostr_identity_contract.wasm
near call nostr-identity.near new --accountId nostr-identity.near
```

### 4. Integrate (15 min)
```typescript
// Add contract calls to frontend
// Update TEE to also register on-chain
// Test end-to-end
```

**Total time:** ~35 minutes

---

## 📊 Summary

| Approach | Time to Build | Cost/User | Privacy | Verifiability |
|----------|---------------|-----------|---------|---------------|
| TEE | ✅ Done | $0.00 | ⭐⭐⭐ | ⭐⭐ |
| Smart Contract | 35 min | $0.012 | ⭐ | ⭐⭐⭐ |
| Hybrid | 2 hours | $0.012 | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Recommendation

**Current state:** ✅ TEE is perfect for now
- Private, fast, free
- Already built and tested
- Ready to deploy

**Future enhancement:** Add smart contract for:
- Public verification
- Decentralized backup
- Cross-chain compatibility

**Best approach:** Start with TEE, add smart contract later if needed

---

*Both approaches are valid. Choose based on your specific requirements.*
