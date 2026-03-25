# Nostr Identity TEE - Secure Architecture

**Forgery-Proof • Recoverable • Secure**

---

## Problem

Your current implementation has a **critical security vulnerability**:

```typescript
// CURRENT (INSECURE):
const seed = SHA-256(`nostr-identity:${accountId}:${nearPubkey}`)
const privKey = seed
```

**Attack:** Anyone can derive the same private key because `nearPubkey` is public on-chain.

```javascript
// Attacker can do this:
const pubkey = await near.getAccount('victim.near').publicKey // PUBLIC!
const victimKey = SHA-256(`nostr-identity:victim.near:${pubkey}`)
// Now attacker has victim's Nostr private key!
```

---

## Solution

### 3-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LAYER 1: FORGERY-PROOF                  │
│                     NEP-413 Verification                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User signs: {message, nonce, recipient}                    │
│  TEE verifies: ✓ Signature matches wallet                   │
│                ✓ Account ID matches signer                  │
│                ✓ Recipient is nostr-identity.near           │
│                                                             │
│  Result: Only wallet holder can pass                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     LAYER 2: SECURE STORAGE                 │
│                     OutLayer TEE + CKD                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Generate: RANDOM 32-byte key inside TEE                    │
│  Storage:  OutLayer encrypted storage with CKD              │
│  Access:   Automatic user isolation                         │
│                                                             │
│  Key derivation: storage:{project}:{user} → encryption key  │
│  Nobody knows the key, not even you                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     LAYER 3: RECOVERABLE                    │
│                     Persistent + Verified Access            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Storage survives:                                          │
│  ✅ WASM version updates                                    │
│  ✅ Code redeployments                                      │
│  ✅ System restarts                                         │
│                                                             │
│  Recovery: User signs NEP-413 again                         │
│            TEE retrieves encrypted key                      │
│            Returns decrypted key to verified owner          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Generate Identity (One-Time)

**Request:**
```json
POST /execute
{
  "action": "generate",
  "account_id": "user.near",
  "nep413_response": {
    "account_id": "user.near",
    "public_key": "ed25519:...",
    "signature": "...",
    "authRequest": {
      "message": "Generate Nostr identity for user.near",
      "nonce": "uuid-v4",
      "recipient": "nostr-identity.near"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "npub": "02abc123...",      // Public key (hex)
  "nsec": "5f7a9b2c...",      // Private key (ONLY SHOWN ONCE!)
  "created_at": 1712345678
}
```

**Security:**
- ✅ NEP-413 verification prevents forgery
- ✅ Random key generation (not deterministic)
- ✅ Encrypted storage with user isolation
- ⚠️ Private key shown ONCE - user must save it

---

### 2. Recover Identity

**Request:**
```json
POST /execute
{
  "action": "recover",
  "account_id": "user.near",
  "nep413_response": {
    "account_id": "user.near",
    "public_key": "ed25519:...",
    "signature": "...",
    "authRequest": {
      "message": "Recover Nostr identity for user.near",
      "nonce": "uuid-v4",
      "recipient": "nostr-identity.near"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "npub": "02abc123...",
  "nsec": "5f7a9b2c...",      // Decrypted private key
  "created_at": 1712345678
}
```

**Security:**
- ✅ Only wallet holder can recover (NEP-413)
- ✅ Encrypted storage survives updates
- ✅ User isolation prevents unauthorized access

---

### 3. Verify Identity (Public)

**Request:**
```json
POST /execute
{
  "action": "verify",
  "account_id": "user.near",
  "npub": "02abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,           // Does npub belong to this account?
  "npub": "02abc123...",
  "created_at": 1712345678
}
```

**No signature required** - public verification only.

---

### 4. Get Public Key (Public)

**Request:**
```json
POST /execute
{
  "action": "get_pubkey",
  "account_id": "user.near"
}
```

**Response:**
```json
{
  "success": true,
  "npub": "02abc123...",
  "created_at": 1712345678
}
```

---

## Security Guarantees

### ✅ Forgery-Proof

**Attack:** Can someone else generate an identity for my NEAR account?

**Defense:** 
- Requires NEP-413 signature from wallet
- TEE verifies signature cryptographically
- Only wallet holder can sign

**Result:** Impossible to forge

---

### ✅ Recoverable

**Scenario:** User loses their Nostr private key

**Solution:**
1. User signs NEP-413 again (proves ownership)
2. TEE retrieves encrypted key from OutLayer storage
3. Returns decrypted key to verified owner

**Storage Guarantees:**
- ✅ Persists across WASM updates
- ✅ Encrypted at rest with CKD
- ✅ User-isolated (no cross-user access)

---

### ✅ Secure

**Threat Model:**

| Attack | Defense | Status |
|--------|---------|--------|
| Derive key from public data | Random key generation | ✅ Blocked |
| Replay attack | Nonce in NEP-413 | ✅ Blocked |
| MITM attack | Recipient verification | ✅ Blocked |
| Cross-user access | OutLayer user isolation | ✅ Blocked |
| Storage breach | CKD encryption | ✅ Blocked |
| Code tampering | TEE attestation | ✅ Blocked |

---

## OutLayer Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   OUTLAYER ENCRYPTED STORAGE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Key Derivation (CKD):                                      │
│  storage:{project_uuid}:{account_id} → AES-256 key          │
│                                                             │
│  Storage Keys:                                              │
│  ├── nostr/nsec      → Encrypted private key (user-only)    │
│  └── nostr/metadata  → Public metadata (JSON)               │
│                                                             │
│  User Isolation:                                            │
│  alice.near → Can only read/write her namespace             │
│  bob.near   → Can only read/write his namespace             │
│                                                             │
│  Encryption:                                                │
│  ✅ AES-256-GCM                                             │
│  ✅ Unique key per user                                     │
│  ✅ Derived in TEE (nobody knows it)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Integration

```typescript
import { NearConnector } from '@hot-labs/near-connect'

const connector = new NearConnector({
  signIn: { contractId: 'v1.signer' }
})

// 1. Connect wallet
await connector.connect()
const wallet = await connector.wallet()
const accountId = wallet.accountId

// 2. Generate NEP-413 auth
const authRequest = {
  message: `Generate Nostr identity for ${accountId}`,
  nonce: crypto.randomUUID(),
  recipient: "nostr-identity.near"
}

const authResponse = await wallet.verifyOwner(authRequest)

// 3. Send to TEE
const result = await fetch('https://tee.outlayer.dev/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'generate',
    account_id: accountId,
    nep413_response: authResponse
  })
})

const { npub, nsec } = await result.json()

// 4. SAVE PRIVATE KEY SECURELY!
console.log('Your Nostr identity:')
console.log('Public key (npub):', npub)
console.log('Private key (nsec):', nsec) // SAVE THIS!
```

---

## Deployment

### Build

```bash
cargo build --target wasm32-wasip2 --release
```

Output: `target/wasm32-wasip2/release/nostr_identity_tee.wasm`

### Deploy to OutLayer

```bash
outlayer deploy --name nostr-identity nostr_identity_tee.wasm
```

---

## Testing

```bash
# Test NEP-413 verification
cargo test test_nep413_verification

# Test full flow
cargo test
```

---

## Security Audit Checklist

- [x] NEP-413 signature verification
- [x] Random key generation (not deterministic)
- [x] Encrypted storage with CKD
- [x] User isolation enforced by platform
- [x] No private key in logs
- [x] Nonce prevents replay attacks
- [x] Recipient verification prevents MITM
- [x] TEE attestation (OutLayer provides)
- [x] Storage persistence across updates
- [x] Recovery flow with re-verification

---

## Comparison: Before vs After

| Aspect | Before (Deterministic) | After (TEE + NEP-413) |
|--------|------------------------|----------------------|
| Key derivation | SHA-256(account + pubkey) | RANDOM in TEE |
| Forgery-proof | ❌ Anyone can derive | ✅ Requires signature |
| Recoverable | ❌ No storage | ✅ Encrypted persistence |
| Secure | ❌ Public data | ✅ Private TEE storage |
| Standard | ❌ Custom | ✅ NEP-413 |

---

## License

MIT
