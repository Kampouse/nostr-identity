# True Privacy Architecture

## Problem
Current flow: TEE sees `account_id` in plain text
- User must trust TEE operator
- If TEE is compromised, privacy is broken

## Solution: Client-Side Commitment

### Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                                │
│                                                                 │
│ 1. User connects NEAR wallet                                    │
│ 2. User signs NEP-413 message                                   │
│    - message: "Register Nostr identity"                         │
│    - signature proves ownership of account                      │
│ 3. Client computes commitment LOCALLY:                          │
│    commitment = SHA256("commitment:" || account_id)             │
│ 4. Client sends to TEE:                                         │
│    - commitment (NOT account_id!)                               │
│    - nep413_signature                                           │
│    - public_key                                                 │
│    - NEP-413 message (without account_id in it)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TEE (OutLayer)                                                  │
│                                                                 │
│ 5. Verify NEP-413 signature is valid                            │
│    - Checks signature matches public_key                        │
│    - Does NOT know which account_id                             │
│ 6. Verify commitment matches:                                   │
│    - Extract account_id from public_key derivation              │
│    - Wait... this is the problem!                               │
└─────────────────────────────────────────────────────────────────┘
```

### The Chicken-and-Egg Problem

NEP-413 verification requires knowing the `account_id` to:
1. Fetch the public key from the account
2. Verify the signature matches that public key

So we can't hide `account_id` from the verifier!

## Solutions

### Option 1: Self-Contained Proof
Client sends:
- `account_id` (encrypted with TEE's public key)
- `signature`
- `public_key`

TEE:
- Decrypts `account_id` inside TEE (never exposed)
- Verifies signature
- Computes commitment
- Discards `account_id` immediately

**Privacy:** account_id only exists inside TEE memory

### Option 2: Client-Side ZKP
Client generates ZKP proving:
- "I know account_id such that:"
  - SHA256("commitment:" || account_id) = commitment
  - I can sign with account_id's private key

TEE:
- Verifies ZKP (sees only commitment)
- Never sees account_id

**Privacy:** Perfect - account_id never leaves client

**Challenge:** ZKP generation is slow (seconds) and requires large proving key

### Option 3: NEAR MPC (Most Practical)
Use NEAR's MPC contract for signature verification:
1. User signs with wallet
2. MPC network verifies signature
3. Only reveals: "signature is valid for commitment X"

**Privacy:** Distributed trust across MPC nodes

## Recommended: Option 1 (Encrypted account_id)

Simplest implementation with strong privacy:
- account_id encrypted with TEE's public key
- Only decryptable inside TEE
- Never written to disk or logs
- Ephemeral - exists only during verification

```rust
// Client encrypts:
let encrypted_account = tee_public_key.encrypt(account_id);

// TEE decrypts inside secure enclave:
let account_id = tee_private_key.decrypt(encrypted_account);
verify_nep413(&account_id, &signature);
let commitment = sha256(format!("commitment:{}", account_id));
// account_id dropped from memory here
```

This is what OutLayer TEE already provides - the entire TEE is the "secure enclave".
