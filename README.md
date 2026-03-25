# Nostr Identity - Secure NEAR Integration

**Forgery-Proof • Recoverable • TEE-Secured**

Create Nostr identities bound to NEAR accounts with 3-layer security.

---

## 🔒 Security Architecture

### The Problem (Old Version)

```typescript
// INSECURE - DO NOT USE
const seed = SHA-256(`nostr-identity:${accountId}:${nearPubkey}`)
const privKey = seed
```

**Attack:** `nearPubkey` is public on blockchain. Anyone can derive your Nostr key!

---

### The Solution (This Version)

**3-Layer Security:**

1. **Forgery-Proof (NEP-413)**
   - User signs `{message, nonce, recipient}` with wallet
   - TEE verifies signature cryptographically
   - Only wallet holder can pass

2. **Secure Storage (OutLayer TEE)**
   - Generate RANDOM key inside Trusted Execution Environment
   - Store encrypted with CKD (hardware-derived keys)
   - Automatic user isolation

3. **Recoverable**
   - Storage persists across updates
   - User signs NEP-413 again to recover
   - TEE returns decrypted key to verified owner

---

## 🚀 Quick Start

### 1. Connect Wallet

```typescript
import { NearConnector } from '@hot-labs/near-connect'

const connector = new NearConnector({
  signIn: { contractId: 'v1.signer' }
})

await connector.connect()
```

### 2. Generate Identity

```typescript
const wallet = await connector.wallet()

// NEP-413 auth
const authResponse = await wallet.verifyOwner({
  message: `Generate Nostr identity for ${accountId}`,
  nonce: crypto.randomUUID(),
  recipient: "nostr-identity.near"
})

// Send to TEE
const result = await fetch('https://tee.outlayer.dev/execute', {
  method: 'POST',
  body: JSON.stringify({
    action: 'generate',
    account_id: accountId,
    nep413_response: authResponse
  })
})

const { npub, nsec } = await result.json()
// SAVE nsec SECURELY!
```

### 3. Recover Identity

```typescript
const authResponse = await wallet.verifyOwner({
  message: `Recover Nostr identity for ${accountId}`,
  nonce: crypto.randomUUID(),
  recipient: "nostr-identity.near"
})

const result = await fetch('https://tee.outlayer.dev/execute', {
  method: 'POST',
  body: JSON.stringify({
    action: 'recover',
    account_id: accountId,
    nep413_response: authResponse
  })
})

const { nsec } = await result.json()
// Returns decrypted private key
```

---

## 📁 Project Structure

```
nostr-identity/
├── app/
│   └── page.tsx           # Frontend UI
├── nostr-identity-contract/
│   └── src/
│       └── lib.rs         # TEE backend (Rust)
└── DEPLOYMENT.md          # Deployment guide
```

---

## 🔐 API Endpoints

### Generate Identity (One-Time)

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
  "npub": "02abc123...",
  "nsec": "5f7a9b2c...",  // ONLY SHOWN ONCE!
  "created_at": 1712345678
}
```

---

### Recover Identity

```json
POST /execute
{
  "action": "recover",
  "account_id": "user.near",
  "nep413_response": { /* wallet signature */ }
}
```

**Response:**
```json
{
  "success": true,
  "npub": "02abc123...",
  "nsec": "5f7a9b2c...",  // Decrypted private key
  "created_at": 1712345678
}
```

---

### Verify Identity (Public)

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
  "verified": true,
  "npub": "02abc123...",
  "created_at": 1712345678
}
```

---

### Get Public Key (Public)

```json
POST /execute
{
  "action": "get_pubkey",
  "account_id": "user.near"
}
```

---

## 🛡️ Security Guarantees

| Attack | Defense | Status |
|--------|---------|--------|
| Derive key from public data | Random key generation | ✅ Blocked |
| Replay attack | Nonce in NEP-413 | ✅ Blocked |
| MITM attack | Recipient verification | ✅ Blocked |
| Cross-user access | OutLayer user isolation | ✅ Blocked |
| Storage breach | CKD encryption | ✅ Blocked |
| Code tampering | TEE attestation | ✅ Blocked |

---

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

**Quick version:**

```bash
# 1. Build TEE WASM
cd nostr-identity-contract
cargo build --target wasm32-wasip2 --release

# 2. Deploy to OutLayer
outlayer deploy --name nostr-identity target/wasm32-wasip2/release/nostr_identity_tee.wasm

# 3. Update frontend env
cd ../nostr-identity
cp .env.example .env.local
# Edit NEXT_PUBLIC_TEE_URL

# 4. Deploy frontend
vercel --prod
```

---

## 🧪 Testing

```bash
# Test TEE locally
cd nostr-identity-contract
cargo test

# Test frontend
cd ../nostr-identity
npm run dev
```

---

## 📊 Cost Estimate

**OutLayer Pricing:**
- Generate/Recover: ~$0.005 per call
- Verify/GetPubkey: Free (no TEE)

**Estimated monthly (1000 users):** ~$10

---

## 🤝 Comparison

| Feature | Old (Deterministic) | New (TEE + NEP-413) |
|---------|---------------------|---------------------|
| Key derivation | SHA-256(pubkey) | RANDOM in TEE |
| Forgery-proof | ❌ Anyone can derive | ✅ Requires signature |
| Recoverable | ❌ No storage | ✅ Encrypted storage |
| Secure | ❌ Public data | ✅ Private TEE |
| Standard | ❌ Custom | ✅ NEP-413 |

---

## 📄 License

MIT

---

## 🔗 Links

- **Live Demo:** https://nostr-identity.vercel.app
- **TEE Backend:** https://github.com/Kampouse/nostr-identity-contract
- **OutLayer Docs:** https://outlayer.fastnear.com
- **NEP-413 Spec:** https://github.com/near/NEPs/blob/master/neps/nep-0413.md
