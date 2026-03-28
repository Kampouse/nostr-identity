# Nostr Identity

Privacy-preserving Nostr identity management on NEAR, powered by TEE (Trusted Execution Environment) and Zero-Knowledge Proofs.

## Structure

```
contracts/
  tee/         TEE WASM contract (OutLayer/wasmtime) — identity generation, recovery, ZKP verification
  writer/      NEAR smart contract — writes Nostr events on-chain
apps/web/      Next.js frontend
packages/      Shared TypeScript packages (crypto, nostr, types, zkp)
services/      Backend services
```

## Quick Start

### Prerequisites

- Rust toolchain with `wasm32-wasip2` target
- [wasmtime](https://wasmtime.dev/) (optional, for WASM testing)
- Node.js 18+ (for apps/packages)

### Build & Test (TEE Contract)

```bash
# Run all tests locally
./test_local.sh

# Run via wasmtime (full WASM test)
./test_local.sh --wasmtime

# Clean rebuild
./test_local.sh --clean

# Just cargo test
cd contracts/tee && cargo test --features local-test
```

### Build & Test (Writer Contract)

```bash
cd contracts/writer && cargo test
```

## Feature Flags (TEE Contract)

| Flag | Mode | Description |
|------|------|-------------|
| `local-test` | Development | File-backed storage, mock contract calls, deterministic keys |
| `outlayer-tee` | Production | OutLayer host functions, persistent on-chain storage |

## Architecture

The TEE contract runs inside a WASM sandbox (wasmtime/OutLayer). It:
1. Generates Nostr keypairs linked to NEAR accounts via NEP-413 signatures
2. Produces ZK proofs of identity ownership without revealing the NEAR account
3. Signs transactions for the writer contract to post Nostr events on-chain
4. Supports identity recovery through re-authentication

See [ARCHITECTURE.md](ARCHITECTURE.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for details.
