# Deployment Guide - Nostr Identity TEE

## ✅ Build Complete

```bash
cd nostr-identity-contract
cargo build --target wasm32-wasip1 --release
```

**Output:** `target/wasm32-wasip1/release/nostr-identity-tee.wasm` (280KB)

---

## 🧪 Local Testing

```bash
# Test with wasmtime
echo '{"action":"generate","account_id":"test.near","nep413_response":{...}}' \
  | wasmtime target/wasm32-wasip1/release/nostr-identity-tee.wasm
```

---

## 🚀 Deploy to OutLayer

### Option 1: Via Dashboard

1. Go to https://outlayer.fastnear.com
2. Create new project: "nostr-identity"
3. Upload WASM: `nostr-identity-tee.wasm`
4. Copy project URL

### Option 2: Via CLI

```bash
# Install OutLayer CLI (if needed)
npm install -g @fastnear/outlayer-cli

# Deploy
outlayer deploy \
  --name nostr-identity \
  target/wasm32-wasip1/release/nostr-identity-tee.wasm
```

---

## 🔧 Configure Frontend

```bash
cd ../nostr-identity

# Create .env.local
cp .env.example .env.local

# Edit with your OutLayer URL
# NEXT_PUBLIC_TEE_URL=https://pXXXX.outlayer.fastnear.com/execute
```

---

## 🧪 Test Full Flow

### 1. Test TEE Directly

```bash
# Generate (will fail - needs real signature)
curl -X POST $TEE_URL \
  -H "Content-Type: application/json" \
  -d '{"action":"generate","account_id":"test.near","nep413_response":{...}}'
```

### 2. Test Frontend

```bash
npm run dev
# Open http://localhost:3000
# Connect wallet
# Generate identity
```

---

## 📦 Deploy Frontend

```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 🔄 Version Notes

**v1 (Current):**
- ✅ NEP-413 verification
- ✅ Random key generation
- ✅ Forgery-proof
- ❌ Not recoverable (no storage)
- ❌ No verification endpoint

**v2 (Future with WASI P2):**
- ✅ Persistent storage (OutLayer)
- ✅ Recovery flow
- ✅ Verification endpoint

---

## 🔐 Security

This implementation is **FORGERY-PROOF**:

1. **NEP-413 Verification** - Only wallet holder can generate
2. **Random Keys** - Not derived from public data
3. **TEE Execution** - Code runs in secure enclave

**Limitation:** Not recoverable in v1. Users MUST save their nsec on generation.

---

## 📊 API

### Generate Identity

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
  "npub": "02abc...",
  "nsec": "5f7a...",
  "created_at": 1712345678
}
```

---

## 🐛 Troubleshooting

**Build fails with cabi_realloc error:**
- Use wasm32-wasip1 (not wasip2)
- Use `[[bin]]` in Cargo.toml

**Signature verification fails:**
- Check signature format (hex or base64)
- Ensure message matches exactly
- Verify recipient is "nostr-identity.near"

**Frontend not connecting:**
- Check NEXT_PUBLIC_TEE_URL in .env.local
- Verify OutLayer project is deployed
- Check browser console for errors
