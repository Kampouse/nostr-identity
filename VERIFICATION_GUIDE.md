# User Verification Guide - 6 Methods

**Date:** March 25, 2026
**Question:** Can we verify users without revealing their identity?

---

## ✅ YES! Multiple Verification Methods

You can verify users while keeping their NEAR account private:

---

## 🔍 Method 1: On-Chain Lookup (Basic)

**Use case:** Check if identity exists

```typescript
// Anyone can check if commitment is registered
const exists = await near.view('nostr-identity.near', 'identity_exists', {
  commitment: 'abc123...'
})

// Get public identity info
const identity = await near.view('nostr-identity.near', 'get_identity', {
  commitment: 'abc123...'
})

// Returns:
{
  npub: 'npub1def456...',  // ✅ Public
  commitment: 'abc123...',  // ✅ Public
  delegator: 'delegator.near',  // ✅ Public
  created_at: 1712345678
  // ❌ NO account_id! (privacy protected)
}
```

**Privacy:** ⭐⭐⭐ Perfect (no account revealed)  
**Trust:** ✅ Cryptographic (on-chain)  
**Cost:** ✅ Free (view call)

---

## 🎯 Method 2: Challenge-Response (Interactive)

**Use case:** dApp needs to verify user owns the identity

### Flow

```
1. dApp creates challenge
   ↓
2. User signs challenge with Nostr key
   ↓
3. Contract verifies signature
   ↓
4. dApp gets proof of ownership
```

### Implementation

```typescript
// 1. dApp creates challenge
const challenge = await near.call(
  'nostr-identity.near',
  'create_verification_challenge',
  {
    npub: 'npub1abc123...',
    dapp_account: 'myapp.near'
  }
)

// 2. User signs challenge with Nostr key (client-side)
const signature = await nostr.sign(challenge)

// 3. Verify response
const isValid = await near.view(
  'nostr-identity.near',
  'verify_challenge_response',
  {
    challenge_hash: challenge,
    nostr_signature: signature,
    commitment: 'abc123...'
  }
)

// 4. If valid, user proved ownership!
if (isValid) {
  // User owns this identity
  // But you still don't know their NEAR account!
}
```

**Privacy:** ⭐⭐⭐ Perfect  
**Trust:** ✅ Cryptographic (signature)  
**Cost:** ⚠️ 0.0001 NEAR (create challenge)

---

## 🔐 Method 3: Ownership Proof (Self-Contained)

**Use case:** User proves ownership without interaction

```typescript
// User generates proof (client-side)
const timestamp = Date.now()
const message = `Verify ownership of ${commitment} at ${timestamp}`
const signature = await nostr.sign(message)

// Anyone can verify
const isValid = await near.view(
  'nostr-identity.near',
  'verify_ownership',
  {
    commitment: 'abc123...',
    timestamp,
    signature,
    message
  }
)

if (isValid) {
  // User proved they own this Nostr identity!
  // But account_id still hidden!
}
```

**Privacy:** ⭐⭐⭐ Perfect  
**Trust:** ✅ Cryptographic (signature)  
**Cost:** ✅ Free (view call)

---

## 🎭 Method 4: Zero-Knowledge Proof (Most Private)

**Use case:** Prove ownership without revealing anything

### How It Works

```
User generates ZK proof that:
- "I know the preimage of this commitment"
- "I signed the message with my Nostr key"
- "My NEAR account created this identity"

Without revealing:
- Which NEAR account
- What the preimage is
- Any identifying information
```

### Implementation

```typescript
// 1. User generates ZK proof (client-side, ~5 seconds)
const zkProof = await generateZKProof({
  commitment: 'abc123...',
  account_id: 'alice.near',  // ❌ NOT revealed!
  signature: userSignature,
  timestamp: Date.now()
})

// 2. Contract verifies proof
const isValid = await near.view(
  'nostr-identity.near',
  'verify_zk_ownership',
  {
    commitment: 'abc123...',
    zk_proof: zkProof,
    public_inputs: ['abc123...', timestamp]
  }
)

if (isValid) {
  // ✅ User proved ownership!
  // ✅ Without revealing account_id!
  // ✅ Zero knowledge!
}
```

**Privacy:** ⭐⭐⭐ Perfect (zero knowledge)  
**Trust:** ✅ Cryptographic (ZK proof)  
**Cost:** ✅ Free (view call)  
**Speed:** ⚠️ ~5 seconds (proof generation)

---

## 🎨 Method 5: Selective Disclosure (User Choice)

**Use case:** User wants to reveal identity to specific party

### Flow

```
User chooses to reveal account to:
- Specific dApp
- KYC provider
- Trusted verifier

But NOT to public blockchain!
```

### Implementation

```typescript
// 1. User signs authorization to reveal
const nep413Signature = await wallet.signMessage({
  message: `Reveal identity to ${verifier}`,
  nonce: crypto.randomUUID(),
  recipient: 'nostr-identity.near'
})

// 2. Reveal to specific verifier
await near.call(
  'nostr-identity.near',
  'reveal_to_verifier',
  {
    commitment: 'abc123...',
    verifier: 'kyc-provider.near',
    nep413_signature: nep413Signature,
    user_public_key: wallet.publicKey,
    message: `Reveal identity to kyc-provider.near`
  }
)

// 3. Verifier can now see account
const account = await near.view(
  'nostr-identity.near',
  'is_revealed_to',
  {
    commitment: 'abc123...',
    verifier: 'kyc-provider.near'
  }
)

// Returns: "alice.near" (only visible to verifier!)
```

**Privacy:** ⭐⭐ Good (user controls disclosure)  
**Trust:** ✅ Cryptographic + user consent  
**Cost:** ⚠️ 0.001 NEAR (reveal transaction)

---

## 🌐 Method 6: Cross-Chain Verification

**Use case:** Verify on other blockchains (Ethereum, Solana, etc.)

### Flow

```
1. Generate proof on NEAR
2. Submit proof to Ethereum
3. Ethereum contract verifies
4. No identity revealed!
```

### Implementation

```typescript
// 1. Generate proof on NEAR
const proof = await near.view(
  'nostr-identity.near',
  'generate_cross_chain_proof',
  {
    commitment: 'abc123...',
    chain_id: 'ethereum',
    recipient: '0x1234...'
  }
)

// 2. Submit to Ethereum
await ethereumContract.verifyNearIdentity(
  proof,
  commitment,
  npub,
  { value: 0 }
)

// 3. Ethereum contract verifies:
// - Proof is valid
// - Identity exists on NEAR
// - Without revealing account!
```

**Privacy:** ⭐⭐⭐ Perfect  
**Trust:** ✅ Cross-chain cryptographic  
**Cost:** ⚠️ Gas on both chains

---

## 📊 Comparison Table

| Method | Privacy | Trust | Cost | Speed | Use Case |
|--------|---------|-------|------|-------|----------|
| **On-Chain Lookup** | ⭐⭐⭐ | ✅ Crypto | Free | Instant | Check existence |
| **Challenge-Response** | ⭐⭐⭐ | ✅ Crypto | 0.0001 NEAR | Fast | dApp login |
| **Ownership Proof** | ⭐⭐⭐ | ✅ Crypto | Free | Fast | Self-attestation |
| **ZK Proof** | ⭐⭐⭐ | ✅ Crypto | Free | 5s | Maximum privacy |
| **Selective Disclosure** | ⭐⭐ | ✅ User consent | 0.001 NEAR | Fast | KYC/compliance |
| **Cross-Chain** | ⭐⭐⭐ | ✅ Crypto | Gas fees | Slow | Multi-chain |

---

## 🚀 Real-World Examples

### Example 1: dApp Login

```typescript
// dApp wants to verify user without knowing their NEAR account

// 1. User provides commitment
const commitment = 'abc123...'

// 2. dApp checks identity exists
const exists = await contract.identity_exists(commitment)

// 3. dApp creates challenge
const challenge = await contract.create_verification_challenge(
  npub,
  'myapp.near'
)

// 4. User signs challenge
const signature = await nostr.sign(challenge)

// 5. dApp verifies
const isValid = await contract.verify_challenge_response(
  challenge,
  signature,
  commitment
)

// 6. If valid, log user in
// ✅ User authenticated
// ❌ dApp doesn't know their NEAR account
// ⭐ Privacy preserved!
```

### Example 2: KYC Verification

```typescript
// KYC provider needs to verify identity

// 1. User generates ZK proof
const zkProof = await generateZKProof({
  commitment: 'abc123...',
  account_id: 'alice.near',
  kyc_data: encryptedKYC
})

// 2. KYC provider verifies proof
const isValid = await contract.verify_zk_ownership(
  'abc123...',
  zkProof,
  ['abc123...']
)

// 3. If valid, KYC provider approves
// ✅ Verified user owns identity
// ✅ Verified account has valid KYC
// ❌ KYC provider doesn't know which account
// ⭐ Complete privacy!

// 4. User gets KYC badge without revealing identity
```

### Example 3: Access Control

```typescript
// DAO wants to give voting rights to verified identity holders

// 1. Check if identity exists
const hasIdentity = await contract.identity_exists(commitment)

// 2. Verify ownership (any method)
const ownsIdentity = await contract.verify_ownership(
  commitment,
  timestamp,
  signature,
  message
)

// 3. If both true, allow voting
if (hasIdentity && ownsIdentity) {
  // ✅ User can vote
  // ❌ DAO doesn't know who they are
  // ⭐ Anonymous voting!
}
```

---

## 🔧 Implementation Guide

### Step 1: Deploy Contract (5 min)

```bash
cargo build --target wasm32-unknown-unknown --release
near deploy --accountId nostr-identity.near --wasmFile ...
near call nostr-identity.near new '{"delegators": [...]}' --accountId nostr-identity.near
```

### Step 2: Choose Verification Method (2 min)

```typescript
// Pick based on your use case:

// Simple: On-chain lookup
const exists = await contract.identity_exists(commitment)

// Interactive: Challenge-response
const challenge = await contract.create_verification_challenge(npub, dapp)

// Self-contained: Ownership proof
const valid = await contract.verify_ownership(commitment, ts, sig, msg)

// Maximum privacy: ZK proof
const valid = await contract.verify_zk_ownership(commitment, zkProof, inputs)
```

### Step 3: Integrate (10 min)

```typescript
// Add to your dApp
async function verifyUser(commitment: string, method: 'challenge' | 'zk') {
  if (method === 'challenge') {
    // Challenge-response flow
    const challenge = await createChallenge()
    const signature = await userSign(challenge)
    return await verifyResponse(challenge, signature, commitment)
  } else {
    // ZK proof flow
    const zkProof = await userGenerateZKProof(commitment)
    return await verifyZKProof(commitment, zkProof)
  }
}
```

---

## 🎯 Recommendation

**For most use cases:**
1. **Method 1 (On-Chain Lookup)** - Check existence
2. **Method 3 (Ownership Proof)** - Verify ownership
3. **Method 4 (ZK Proof)** - Maximum privacy

**For KYC/compliance:**
- **Method 5 (Selective Disclosure)** - User chooses what to reveal

**For cross-chain:**
- **Method 6 (Cross-Chain)** - Verify on other blockchains

---

## 💡 Key Insight

**You can verify users WITHOUT knowing who they are!**

- ✅ Prove ownership
- ✅ Verify identity exists
- ✅ Check authenticity
- ❌ Don't need to know account_id
- ⭐ Complete privacy!

**This is the power of commitment schemes + signatures!**

---

## 📚 Code Examples

See complete implementation:
- **Contract:** `nostr-identity-verification-contract/src/lib.rs` (10,349 bytes)
- **Methods:** All 6 verification methods implemented
- **Tests:** Comprehensive test suite included

---

## 🎉 Summary

| Question | Answer |
|----------|--------|
| **Can we verify users?** | ✅ YES! |
| **Reveal their account?** | ❌ NO! (unless they choose) |
| **Privacy protected?** | ✅ YES! |
| **Cryptographic proof?** | ✅ YES! |
| **Multiple methods?** | ✅ YES! (6 methods) |

**Verification + Privacy = Possible!** 🎉

---

*All verification methods preserve user privacy while proving ownership.*
