# TEE Build Instructions

## Important: Use WASI v1 Target

The TEE **must** be built with `wasm32-wasip1` (WASI v1), **not** `wasm32-wasip2` (WASI v2).

### Why?

- **WASI v1** (`wasm32-wasip1`): Provides `storage_get`/`storage_set` functions for persistent TEE storage
- **WASI v2** (`wasm32-wasip2`): Does NOT provide storage functions

The TEE uses persistent storage to cache the ZKP proving key between invocations:
- First call: Generate proving key (~30s), store in TEE storage
- Subsequent calls: Load from storage (~1s) ✅

Without storage (WASI v2), every call regenerates the key and times out.

## Build Commands

```bash
# Build TEE WASM (use this always)
cargo build --release --target wasm32-wasip1 --features outlayer-tee

# Or use npm script
npm run build:tee
```

## Deploy

```bash
# Upload to FastFS
outlayer upload target/wasm32-wasip1/release/nostr-identity-zkp-tee.wasm

# Deploy from GitHub
git push && outlayer deploy nostr-identity-zkp-tee --github
```

## Configuration

The `outlayer.toml` file locks the build target to `wasm32-wasip1` to prevent accidental builds with WASI v2.
