# Nostr Identity - Monorepo Deployment Guide

## 📁 New Structure

```
nostr-identity/
├── apps/
│   └── web/                      # Frontend (Next.js)
├── services/
│   ├── delegator/                # Delegator service (TypeScript)
│   └── zkp/                      # ZKP implementation (Circom)
├── contracts/
│   ├── nostr-identity-contract/  # Basic TEE contract
│   └── nostr-identity-contract-zkp-tee/  # Production ZKP+TEE contract
├── packages/
│   ├── crypto/                   # Shared cryptographic utilities
│   ├── types/                    # Shared TypeScript types
│   └── nostr/                    # Nostr protocol utilities
├── archived/                     # Legacy/unused contracts
└── docs/                         # Documentation
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install pnpm (recommended for monorepos)
npm install -g pnpm
```

### Development

```bash
# Clone and install dependencies
git clone <repo-url>
cd nostr-identity
pnpm install

# Run frontend (http://localhost:3000)
pnpm dev

# Run delegator service (http://localhost:3001)
pnpm dev:delegator
```

---

## 📦 Building

### Build All Packages

```bash
# Build shared packages
pnpm --filter ./packages/** build

# Or build everything
pnpm build:all
```

### Build Smart Contract

```bash
cd contracts/nostr-identity-contract-zkp-tee
cargo build --target wasm32-wasip2 --release
```

---

## 🚢 Deployment

### 1. Deploy Smart Contract to NEAR

```bash
cd contracts/nostr-identity-contract-zkp-tee

# Build WASM
cargo build --target wasm32-wasip2 --release

# Deploy to NEAR testnet
near deploy --accountId nostr-identity.test --wasm target/wasm32-wasip2/release/nostr_identity_tee.wasm

# Initialize contract
near call nostr-identity.test new --accountId nostr-identity.test
```

### 2. Deploy TEE Backend to OutLayer

```bash
cd contracts/nostr-identity-contract-zkp-tee

# Build WASM for OutLayer
cargo build --target wasm32-wasip2 --release

# Deploy to OutLayer
outlayer deploy --name nostr-identity target/wasm32-wasip2/release/nostr_identity_tee.wasm

# Update frontend .env.local with TEE URL
echo "NEXT_PUBLIC_TEE_URL=https://your-tee.outlayer.dev/execute" > apps/web/.env.local
```

### 3. Deploy Delegator Service (Optional)

```bash
cd services/delegator

# Install dependencies
pnpm install

# Deploy to Railway/VPS
railway up
# Or
vercel --prod
```

### 4. Deploy Frontend to Vercel

```bash
cd apps/web

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_TEE_URL=https://your-tee.outlayer.dev/execute
# - NEXT_PUBLIC_CONTRACT_ID=nostr-identity.test

# Deploy
vercel --prod
```

---

## 🔗 Environment Variables

### Frontend (apps/web/.env.local)

```bash
# TEE Backend URL
NEXT_PUBLIC_TEE_URL=https://p.outlayer.fastnear.com/execute

# NEAR Contract ID (optional)
NEXT_PUBLIC_CONTRACT_ID=nostr-identity.near

# NEAR Network (testnet|mainnet)
NEXT_PUBLIC_NEAR_NETWORK=testnet
```

### Delegator Service (services/delegator/.env)

```bash
# NEAR Contract ID
CONTRACT_ID=nostr-identity.near

# NEAR Network
NEAR_NETWORK=testnet

# Private key for delegator account
DELEGATOR_PRIVATE_KEY=ed25519:...
```

---

## 🧪 Testing

```bash
# Test all packages
pnpm test

# Test specific service
pnpm --filter @nostr-identity/zkp test

# Lint all
pnpm lint

# Type check all
pnpm --filter ./packages/** exec tsc --noEmit
```

---

## 🧹 Cleanup

```bash
# Clean all build artifacts
./scripts/clean.sh

# Or manually
pnpm clean
```

---

## 📊 What Changed

### Before (Monolithic)
```
nostr-identity/
├── app/                    # Frontend mixed at root
├── nostr-identity-contract/
├── nostr-identity-contract-zkp-tee/
├── nostr-identity-smart-contract/      # ❌ Empty shell
├── nostr-identity-delegator-contract/  # ❌ Unused
├── nostr-identity-verification-contract/  # ❌ Empty shell
├── delegator-service/                   # ❌ Separate
└── nostr-identity-zkp/                  # ❌ Separate
```

### After (Monorepo)
```
nostr-identity/
├── apps/web/              # ✅ Organized
├── services/
│   ├── delegator/         # ✅ Consolidated
│   └── zkp/               # ✅ Consolidated
├── contracts/
│   ├── nostr-identity-contract/
│   └── nostr-identity-contract-zkp-tee/
├── packages/
│   ├── crypto/            # ✅ Shared utilities
│   ├── types/             # ✅ Shared types
│   └── nostr/             # ✅ Nostr helpers
└── archived/              # ✅ Legacy contracts archived
```

---

## 🎯 Benefits

1. **Better Organization** - Clear separation of concerns
2. **Shared Code** - DRY with workspace packages
3. **Easier Testing** - Test packages independently
4. **Faster Builds** - Build only what changed
5. **Clearer Dependencies** - Explicit workspace:*
6. **Scalability** - Easy to add new apps/services

---

## 🔄 Migration Notes

### Import Changes

**Before:**
```typescript
// Inline utilities in page.tsx
import { bech32 } from '@scure/base'

interface TeeResponse {
  success: boolean
  // ...
}
```

**After:**
```typescript
// Shared packages
import { encodeBech32 } from '@nostr-identity/crypto'
import type { TeeResponse } from '@nostr-identity/types'
```

### Path Changes

**Before:**
```bash
cd app/
npm run dev
```

**After:**
```bash
cd apps/web/
pnpm dev
# Or from root
pnpm dev
```

---

## 📚 Next Steps

1. ✅ Repository structure consolidated
2. 🔄 Update CI/CD pipelines
3. 📖 Update API documentation
4. 🧪 Add integration tests
5. 🚀 Deploy to production

---

## 🆘 Troubleshooting

### "Cannot find module @nostr-identity/*"

```bash
# Make sure packages are built
pnpm --filter ./packages/** build

# Reinstall dependencies
rm -rf node_modules apps/*/node_modules
pnpm install
```

### "Workspace protocol not supported"

```bash
# Use pnpm instead of npm/yarn
npm install -g pnpm
pnpm install
```

### "Contract build failed"

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm32 target
rustup target add wasm32-wasip2
```

---

## 📄 License

MIT
