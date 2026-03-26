# Nostr Identity - Monorepo

**Secure Nostr identities bound to NEAR accounts with TEE + ZKP security**

---

## 🏗️ Monorepo Structure

```
nostr-identity/
├── apps/
│   └── web/                      # Frontend (Next.js)
├── services/
│   └── zkp/                      # ZKP implementation (Circom)
├── contracts/
│   ├── nostr-identity-contract/  # Basic TEE contract
│   └── nostr-identity-contract-zkp-tee/  # Production ZKP+TEE contract
├── packages/
│   ├── crypto/                   # Shared cryptographic utilities
│   ├── types/                    # Shared TypeScript types
│   └── nostr/                    # Nostr protocol utilities
├── archived/                     # Legacy/unused contracts and services
└── docs/                         # Documentation
```

---

## 🚀 Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run frontend
pnpm dev

# Build smart contract
pnpm build:contract
```

### Deployment

```bash
# Build everything
pnpm build:all

# Deploy frontend
cd apps/web && vercel --prod

# Deploy TEE contract
cd contracts/nostr-identity-contract-zkp-tee
cargo build --target wasm32-wasip2 --release
outlayer deploy --name nostr-identity target/wasm32-wasip2/release/*.wasm
```

---

## 📚 Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - System architecture and flows
- [Deployment Guide](./docs/DEPLOYMENT.md) - Complete deployment instructions
- [Security](./docs/README.md) - Security model and guarantees

---

## 🔗 Live Demo

https://nostr-identity.vercel.app

---

## 📄 License

MIT
