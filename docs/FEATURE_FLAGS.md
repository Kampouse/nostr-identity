# Feature Flags - nostr-identity-zkp-tee

## `outlayer-tee`

Enables OutLayer TEE production features:
- **Persistent storage** - Data survives across TEE invocations
- **NEAR contract calls** - TEE can call NEAR smart contracts as delegator
- **TEE signing** - Hardware-attested signatures

### Testing Build (Default)

Without the feature flag, all TEE features use mock implementations:

```bash
# Build for testing
cargo build --target wasm32-wasip2 --release

# Run tests
cargo test
```

**Behavior:**
- Storage: In-memory only (lost on restart)
- Contract calls: Returns mock transaction hashes
- Signing: Returns hash-based signatures (not attested)

### Production Build

With the feature flag, uses real OutLayer APIs:

```bash
# Build for production
cargo build --target wasm32-wasip2 --release --features outlayer-tee
```

**Behavior:**
- Storage: Persistent via `storage_get`/`storage_set` externs
- Contract calls: Real NEAR transactions via OutLayer SDK
- Signing: Hardware-attested TEE signatures

## Feature-Flagged Functions

### `tee_storage_get(key)` / `tee_storage_set(key, value)`
```rust
#[cfg(feature = "outlayer-tee")]
// Uses OutLayer persistent storage APIs

#[cfg(not(feature = "outlayer-tee"))]
// Falls back to in-memory HashMap
```

### `outlayer_contract_call(contract_id, method, args)`
```rust
#[cfg(feature = "outlayer-tee")]
// Calls NEAR smart contract via OutLayer SDK

#[cfg(not(feature = "outlayer-tee"))]
// Returns mock transaction hash for testing
```

### `sign_as_delegator(registration)`
```rust
#[cfg(feature = "outlayer-tee")]
// Uses OutLayer TEE signing (hardware attested)

#[cfg(not(feature = "outlayer-tee"))]
// Returns hash-based signature (testing only)
```

## When to Use Each

**Testing (no flag):**
- Local development
- Unit tests
- CI/CD pipelines
- WASM builds without OutLayer runtime

**Production (with flag):**
- Deploying to OutLayer TEE
- Real user registrations
- On-chain verification needed

## CI/CD Example

```yaml
# Test build (fast, no external dependencies)
- name: Test
  run: cargo test

# Production build (requires OutLayer runtime at deploy time)
- name: Build Production WASM
  run: cargo build --target wasm32-wasip2 --release --features outlayer-tee
```

## Current Status

- ✅ Feature flag implemented
- ✅ 7/7 tests passing (mock mode)
- ✅ WASM builds successfully (770K)
- ⏳ Production OutLayer SDK integration (pending runtime availability)
