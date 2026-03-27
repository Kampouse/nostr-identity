# The Real Problem & Solution

**Date:** March 27, 2026 - 12:28 PM

---

## The Problem

### What We Want
```
User → TEE → Writer Contract
       (verify ZKP, sign tx, submit to blockchain)
       User's account_id NEVER appears on-chain
```

### What OutLayer Actually Provides
```
User → TEE → returns result
       (can sign tx, but can't submit to blockchain)
```

**OutLayer TEEs cannot directly submit transactions to NEAR blockchain.**

---

## Why This Is a Problem

If the client submits the transaction:
- ✅ Transaction is signed by TEE (kampouse.near)
- ✅ account_id doesn't appear in transaction
- ❌ Client's IP is visible when submitting
- ⚠️  Privacy at account level ✅, but IP visible ❌

---

## The Solution (What We Can Actually Do)

### Option 1: Client Submits (Account Privacy Only)
```
1. Client → nostr-identity-zkp-tee (send ZKP proof)
2. TEE → verifies ZKP
3. TEE → near-signer-tee (sign transaction)
4. TEE → returns signed transaction to client
5. Client → submits to NEAR blockchain
```

**Privacy:**
- ✅ account_id hidden (TEE signs)
- ❌ Client IP visible (client submits)
- ✅ On-chain privacy (commitment_hash only)

### Option 2: Full Relayer (Requires Infrastructure)
```
1. Client → nostr-identity-zkp-tee (send ZKP proof)
2. TEE → verifies ZKP
3. TEE → near-signer-tee (sign transaction)
4. TEE → submits to NEAR via relayer service
```

**Privacy:**
- ✅ account_id hidden
- ✅ Client IP hidden (relayer submits)
- ✅ Full privacy

**Problem:** Requires building a relayer service

---

## What We'll Implement Now (Option 1)

### The Flow
```javascript
// Client-side
const proof = generateZKP(account_id, nsec);

// 1. Send to TEE
const response = await fetch('https://outlayer.io/run/nostr-identity-zkp-tee', {
  method: 'POST',
  body: JSON.stringify({
    action: 'RegisterWithZkp',
    zkp_proof: proof,
    npub: npub,
    writer_contract_id: 'w.kampouse.near'
  })
});

// 2. TEE verifies and returns signed transaction
const { signed_tx } = await response.json();

// 3. Client submits (IP visible, but account_id hidden)
await near.connection.provider.sendTransaction(signed_tx);
```

### What This Achieves
- ✅ account_id NEVER on-chain
- ✅ nsec NEVER on-chain
- ✅ commitment_hash unbrute-forceable
- ⚠️  Client IP visible (unavoidable without relayer)

---

## Implementation Steps

### 1. nostr-identity-zkp-tee Changes
```rust
fn handle_register_with_zkp(...) -> ActionResult {
    // 1. Verify ZKP proof (currently TODO)
    // 2. Call near-signer-tee to sign transaction
    let signed_tx = call_near_signer_tee(
        receiver_id: writer_contract_id,
        method: "write",
        args: json!({ commitment, npub })
    );

    // 3. Return signed transaction to client
    ActionResult {
        signed_transaction: Some(signed_tx),
        ...
    }
}
```

### 2. Client Code
```javascript
// Get signed transaction from TEE
const result = await outlayer.run('nostr-identity-zkp-tee', request);

// Submit to blockchain
await near.connection.provider.sendTransaction(result.signed_transaction);
```

### 3. Writer Contract
```rust
pub fn write(&self, message: String, deadline: u64) {
    // Verify signer is TEE (kampouse.near)
    require!(
        env::signer_account_id() == "kampouse.near",
        "Only TEE can register identities"
    );

    // Store commitment
    self.identities.insert(&commitment, &data);
}
```

---

## Privacy Guarantee (With This Solution)

**On-chain:**
- ✅ Signer: kampouse.near (TEE)
- ✅ commitment_hash: unbrute-forceable
- ✅ npub: Nostr public key
- ❌ NO account_id
- ❌ NO nsec

**Off-chain:**
- ⚠️  Client IP visible when submitting transaction
- ✅ But account_id still hidden (TEE signs)

**Result:** Account-level privacy ✅, IP privacy ❌

---

## Future: Full Privacy (Option 2)

To achieve full privacy (including IP), we'd need:

1. **Relayer Service**
   - Receives signed transactions from TEE
   - Submits to NEAR blockchain
   - Uses rotating IPs or Tor

2. **TEE → Relayer Communication**
   - TEE calls relayer API
   - Relayer submits transaction
   - Returns tx_hash to TEE

3. **Infrastructure Required**
   - Relayer server
   - NEAR RPC access
   - Rate limiting
   - Cost: ~$10-50/month

---

## Recommendation

**Implement Option 1 now:**
- Account-level privacy is the main goal
- IP privacy is secondary (can add later)
- Simpler architecture
- No additional infrastructure

**Add Option 2 later:**
- When full privacy is required
- When budget allows for relayer
- When we want to hide client IPs

---

## Next Steps

1. Modify nostr-identity-zkp-tee to call near-signer-tee
2. Return signed transaction to client
3. Update writer contract to verify TEE signer
4. Test full flow
5. Document IP privacy limitation

---

**Jean: Does this make sense? Should I implement Option 1 (account privacy, client submits)?**
