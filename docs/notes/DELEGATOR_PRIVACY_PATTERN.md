# Delegator Pattern - Maximum Privacy

**Date:** March 25, 2026
**Concept:** End users' NEAR identity NOT stored on-chain

---

## 🎯 The Privacy Problem

### Standard Smart Contract (BAD for privacy)

```rust
pub struct IdentityInfo {
    pub npub: String,
    pub owner: AccountId,  // ❌ User's NEAR account PUBLIC on blockchain!
}

// On-chain data:
alice.near -> npub1abc123...  // ❌ EVERYONE can see this mapping!
```

**Problem:** Anyone can see:
- "alice.near owns Nostr identity npub1abc123..."
- Complete identity graph on public blockchain
- No privacy at all

---

## ✅ Delegator Solution

### Architecture

```
User (alice.near)
    ↓ 1. Signs NEP-413 message (off-chain)
    ↓ 2. Sends to Delegator (off-chain)
    
Delegator (delegator.near)
    ↓ 3. Verifies user's signature (off-chain)
    ↓ 4. Calls smart contract (on-chain)
    
Smart Contract
    ↓ 5. Stores: commitment -> npub
    ↓ 6. Does NOT store: account_id!
    
Result: No link between alice.near and npub1abc123 on blockchain!
```

### Smart Contract (Privacy-Preserving)

```rust
pub struct IdentityInfo {
    pub npub: String,           // ✅ Public
    pub commitment: String,     // ✅ Public (hash, not account!)
    pub delegator: AccountId,   // ✅ Delegator (not user!)
    // ❌ NO user account_id stored!
}

// On-chain data:
commitment_hash_abc123 -> npub1def456...  // ✅ No account link!
```

---

## 🔐 Privacy Guarantees

### What's On-Chain (Public)

```json
{
  "commitment": "abc123...",
  "npub": "npub1def456...",
  "delegator": "delegator.near",
  "timestamp": 1712345678
}
```

**Observers see:**
- ✅ A commitment hash exists
- ✅ Associated with a Nostr public key
- ✅ Registered by delegator.near
- ❌ **NO link to alice.near!**

### What's Off-Chain (Private)

```json
{
  "account_id": "alice.near",  // ❌ NOT on blockchain!
  "commitment_preimage": "...",
  "nsec": "nsec1..."           // ❌ Never stored anywhere!
}
```

**Only delegator knows:**
- Which account owns which commitment
- This is stored in delegator's private database
- Or better: use ZK proofs so even delegator doesn't know!

---

## 🏗️ Implementation

### 1. Delegator Service (Off-Chain)

```typescript
// delegator-service/index.ts
import { verify } from '@noble/ed25519';

export async function handleRegistration(
  userId: string,
  nep413Signature: string,
  userPublicKey: string,
  message: string
) {
  // 1. Verify user's NEP-413 signature
  const isValid = await verify(
    nep413Signature,
    message,
    userPublicKey
  );
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }
  
  // 2. Generate commitment (hash, not revealing account)
  const commitment = SHA256(`commitment:${userId}:${nonce}`);
  
  // 3. Generate nullifier
  const nullifier = SHA256(`nullifier:${userId}:${nonce}`);
  
  // 4. Call smart contract as delegator
  const result = await near.call(
    'nostr-identity.near',
    'register_via_delegator',
    {
      registration: {
        npub: userNpub,
        commitment,
        nullifier,
        nep413_signature: nep413Signature,
        user_public_key: userPublicKey,
        message,
        nonce: await getNonce()
      },
      delegator_signature: signAsDelegator(...)
    }
  );
  
  // 5. Store mapping in private database (optional)
  await db.insert({
    account_id: userId,  // ❌ NOT stored on-chain!
    commitment,
    npub: userNpub
  });
  
  return result;
}
```

### 2. Smart Contract (On-Chain)

```rust
pub fn register_via_delegator(
    &mut self,
    registration: DelegatedRegistration,
    delegator_signature: String,
) -> IdentityInfo {
    // 1. Verify delegator is authorized
    assert!(self.authorized_delegators.contains(&delegator));
    
    // 2. Verify delegator signature (proves they checked user)
    verify_delegator_signature(&delegator_signature, &registration)?;
    
    // 3. Store identity (NO account_id!)
    let identity = IdentityInfo {
        npub: registration.npub,
        commitment: registration.commitment.clone(),
        delegator,  // ✅ Only delegator stored
        // ❌ NO user account_id!
    };
    
    self.identities.insert(&registration.commitment, &identity);
    identity
}
```

### 3. User Flow (Frontend)

```typescript
// User clicks "Register Identity"
async function registerIdentity() {
  // 1. Get user signature
  const signature = await wallet.signMessage({
    message: `Register Nostr identity`,
    nonce: crypto.randomUUID(),
    recipient: 'nostr-identity.near'
  });
  
  // 2. Send to delegator (NOT directly to blockchain!)
  const response = await fetch('https://delegator.example.com/register', {
    method: 'POST',
    body: JSON.stringify({
      account_id: 'alice.near',
      nep413_signature: signature,
      user_public_key: wallet.publicKey,
      message: signature.message
    })
  });
  
  // 3. Delegator handles blockchain transaction
  // 4. User's identity registered WITHOUT revealing account on-chain!
}
```

---

## 💰 Cost Analysis

### Standard Contract (User pays)

```
User calls contract directly:
- Gas: 0.001 NEAR
- User pays: Yes
- Privacy: ❌ None (account visible)
```

### Delegator Pattern (Delegator pays)

```
Delegator calls contract:
- Gas: 0.001 NEAR
- User pays: No! (delegator pays)
- Privacy: ✅ Full (account hidden)
```

**Delegator business models:**
1. **Free service:** Subsidized by project
2. **Fee per registration:** User pays 0.1 NEAR off-chain
3. **Subscription:** Monthly fee for unlimited registrations
4. **Freemium:** Free basic, paid premium features

---

## 🔒 Enhanced Privacy: ZK Proofs

### Even Better: Delegator doesn't know user's identity!

```typescript
// User generates ZK proof (client-side)
const proof = await generateZKProof({
  account_id: 'alice.near',
  signature: userSignature,
  nonce: randomNonce
});

// Proof contains:
// - Proof that user owns some NEAR account
// - Proof that signature is valid
// - But does NOT reveal which account!

// Delegator verifies proof without learning identity
const isValid = await verifyZKProof(proof);

// Smart contract stores only proof verification result
contract.register_with_proof(proof, delegator_signature);
```

**Result:**
- ✅ User proves ownership (via ZK proof)
- ✅ Delegator can't see user's identity
- ✅ Smart contract can't see user's identity
- ✅ Complete privacy!

---

## 🎭 Privacy Levels Comparison

| Approach | User Account On-Chain? | Delegator Knows Identity? | Observer Can Link? | Privacy Level |
|----------|------------------------|---------------------------|-------------------|---------------|
| **Direct Call** | ❌ Yes (bad) | N/A | ❌ Yes | ⭐ None |
| **Delegator (Basic)** | ✅ No | ❌ Yes | ✅ No | ⭐⭐ Good |
| **Delegator + ZK** | ✅ No | ✅ No | ✅ No | ⭐⭐⭐ Perfect |
| **TEE (Current)** | ✅ No | N/A | ✅ No | ⭐⭐⭐ Perfect |

---

## 🚀 Deployment

### 1. Deploy Contract
```bash
near create-account nostr-identity.near --useFaucet
near deploy --accountId nostr-identity.near \
  --wasmFile target/.../release/nostr_identity_delegator_contract.wasm

# Initialize with authorized delegators
near call nostr-identity.near new \
  '{"delegators": ["delegator1.near", "delegator2.near"]}' \
  --accountId nostr-identity.near
```

### 2. Deploy Delegator Service
```bash
# Option A: Centralized (simpler)
docker run -d delegator-service

# Option B: Decentralized (better)
# Run multiple delegator nodes
# Anyone can run a delegator (with stake)
```

### 3. Integrate Frontend
```typescript
// Change from direct contract call to delegator call
const result = await fetch('https://delegator.example.com/register', {
  method: 'POST',
  body: JSON.stringify({ signature, publicKey, message })
});
```

---

## 📊 Comparison: TEE vs Delegator

| Aspect | TEE (Current) | Delegator Contract |
|--------|---------------|-------------------|
| **Privacy** | ⭐⭐⭐ Perfect | ⭐⭐⭐ Perfect (with ZK) |
| **Cost** | ✅ Free | ⚠️ 0.001 NEAR (delegator pays) |
| **Speed** | ✅ 100ms | ⚠️ 1-2s (blockchain) |
| **Trust** | TEE hardware | Delegator + blockchain |
| **Decentralization** | ⚠️ Single (OutLayer) | ✅ Multiple delegators |
| **Recovery** | ✅ Easy (TEE) | ⚠️ Need delegator cooperation |
| **Verification** | ⚠️ Off-chain only | ✅ On-chain verifiable |

---

## 🎯 Recommended Approach

### Option 1: TEE Only (Current) ✅
**Best for:** Maximum privacy, zero cost
- Already built and tested
- Perfect privacy
- Free
- Fast

### Option 2: Delegator + ZK Proofs
**Best for:** Decentralized, verifiable privacy
- No single point of failure
- On-chain verification
- Still private
- Small cost

### Option 3: Hybrid (Best of Both)
**Architecture:**
```
1. TEE: Generate & store private key (nsec)
2. Delegator Contract: Register commitment (on-chain)
3. ZK Proof: Prove ownership without revealing identity

Result: 
- ✅ Private key secure (TEE)
- ✅ Public verification (blockchain)
- ✅ Identity hidden (ZK proof)
- ✅ Decentralized backup
```

---

## 🔧 Quick Start

### Delegator Contract (35 min to deploy)
```bash
# 1. Build
cd nostr-identity-delegator-contract
cargo build --target wasm32-unknown-unknown --release

# 2. Test
cargo test

# 3. Deploy
near deploy --accountId nostr-identity.near --wasmFile ...

# 4. Add delegator
near call nostr-identity.near add_delegator \
  '{"delegator": "delegator.near"}' \
  --accountId nostr-identity.near

# 5. Use via delegator service
curl -X POST https://delegator.example.com/register \
  -d '{"signature":"...", "public_key":"...", "message":"..."}'
```

---

## 💡 Key Insight

**Delegator pattern = Meta-transactions for privacy**

Just like meta-transactions let users pay gas with tokens, delegators let users:
- ✅ Register without revealing identity
- ✅ Pay gas indirectly (delegator pays)
- ✅ Get privacy on public blockchain

**This is how you do private identity on a public blockchain!**

---

## 🎉 Summary

| Feature | Standard Contract | Delegator Pattern |
|---------|-------------------|-------------------|
| User account on-chain | ❌ Yes (bad) | ✅ No (hidden) |
| Privacy | ⭐ None | ⭐⭐⭐ Perfect |
| Verifiability | ✅ On-chain | ✅ On-chain |
| Decentralization | ✅ Yes | ✅ Yes |
| Cost to user | 0.001 NEAR | $0 (delegator pays) |
| Recovery | Easy | Needs delegator |

**Delegator pattern gives you blockchain verifiability + privacy!**

---

*Best approach: Use TEE for now, add delegator contract later for on-chain verification.*
