# Client-Side ZKP Implementation

## Architecture (True Privacy)

```
┌────────────────────────────────────────────────────────────────┐
│ BROWSER (Client-Side)                                          │
│                                                                │
│ 1. Generate Nostr keypair (npub/nsec) - NEVER sent anywhere   │
│ 2. Compute commitment = SHA256("commitment:" || account_id)    │
│ 3. Generate ZKP proving:                                       │
│    - "I own account_id" (via NEP-413 signature)               │
│    - "commitment = SHA256(account_id)"                         │
│    - Reveals ONLY: commitment                                  │
│ 4. Send to TEE:                                                │
│    - zkp_proof                                                  │
│    - commitment                                                 │
│    - npub (public Nostr key)                                   │
│    - NOT account_id, NOT signature, NOT public_key             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ TEE (OutLayer)                                                 │
│                                                                │
│ 5. Verify ZKP:                                                 │
│    - Check proof is valid                                      │
│    - Check commitment not already used                         │
│ 6. Sign transaction for writer contract                        │
│ 7. NEVER sees account_id                                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ WRITER CONTRACT (w.kampouse.near)                              │
│                                                                │
│ 8. Store: {commitment, nullifier, npub}                        │
│ 9. NEVER sees account_id                                       │
└────────────────────────────────────────────────────────────────┘
```

## ZKP Circuit (Groth16 on Bn254)

```rust
// Public inputs (revealed):
// - commitment: hash of account_id
// - nullifier: hash of account_id + nonce (prevents double-registration)

// Private inputs (secret):
// - account_id: "user.near"
// - nonce: random value
// - signature: NEP-413 signature

// Constraints:
// 1. commitment == SHA256("commitment:" || account_id)
// 2. nullifier == SHA256("nullifier:" || account_id || nonce)
// 3. signature is valid for account_id
```

## Implementation Steps

### Step 1: Build Client-Side WASM
```bash
# Compile ZKP circuit to WASM for browser
cd nostr-identity-latest/packages/zkp-wasm
wasm-pack build --target web
```

### Step 2: Update TEE to Accept ZKP
```rust
// New action: verify_zkp_and_register
Action::VerifyZkpAndRegister {
    zkp_proof: ZKPProof,
    npub: String,
    deadline: u64,
}

// TEE only sees:
// - zkp_proof (contains commitment, nullifier)
// - npub (Nostr public key)
// - deadline
// NEVER sees: account_id, signature, public_key
```

### Step 3: Writer Contract Stores Minimal Data
```rust
// writer contract stores:
pub struct IdentityRecord {
    pub npub: String,           // Nostr public key
    pub commitment: String,     // hash(account_id)
    pub nullifier: String,      // hash(account_id + nonce)
    pub registered_at: u64,
}
// NEVER stores: account_id
```

## Privacy Guarantees

| Entity | Sees account_id? | Trust Required |
|--------|-----------------|----------------|
| Browser | YES | User controls |
| TEE | NO | Zero trust |
| Writer Contract | NO | Zero trust |
| Blockchain | NO | Zero trust |
| Anyone reading chain | NO | Zero trust |

## Trade-offs

### Pros
- ✅ Perfect privacy: account_id never leaves browser
- ✅ No trust in TEE required
- ✅ On-chain verification via ZKP
- ✅ User controls their data completely

### Cons
- ⚠️ Client-side ZKP generation takes 2-5 seconds
- ⚠️ WASM download ~2MB (proving key)
- ⚠️ More complex frontend

## Simpler Alternative: Encrypted account_id

If ZKP is too complex, we can encrypt account_id with TEE's public key:

```javascript
// Client:
const encrypted = await teePublicKey.encrypt(JSON.stringify({
    account_id: "user.near",
    signature: nep413Signature,
}));

// TEE decrypts inside secure enclave, verifies, discards
```

This is simpler but requires trusting TEE hardware.

## Recommendation

Start with **encrypted account_id** (simpler, good privacy):
- TEE never writes account_id to disk
- Only exists in memory during verification
- OutLayer provides strong hardware guarantees

Later add **client-side ZKP** (perfect privacy):
- No trust in TEE required
- Account_id never leaves browser
