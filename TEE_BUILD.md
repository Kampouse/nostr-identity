# TEE Build Instructions

## Modern OutLayer Storage API

This project uses the **modern OutLayer storage SDK** with **WASI Preview 2**.

### Why WASI Preview 2?

- **Official storage support**: OutLayer's `outlayer` crate only works with WASI v2
- **Better API**: Modern `outlayer::storage` API instead of raw extern "C" functions
- **Project compatibility**: New OutLayer projects require WASI v2
- **User-isolated storage**: Automatic per-user encryption and namespacing

### Dependencies

```toml
[dependencies]
outlayer = "0.1"
```

### Storage API Usage

```rust
use outlayer::storage;

// Store data
storage::set("proving_key", key_bytes).unwrap();

// Read data
if let Some(data) = storage::get("proving_key").unwrap() {
    // Use cached key
}

// Atomic operations
let count = storage::increment("counter", 1).unwrap();
```

## Build Commands

```bash
# Build TEE WASM (use this always)
cargo build --release --target wasm32-wasip2 --features outlayer-tee

# Or use npm script
npm run build:tee
```

## Deploy

```bash
# Upload to FastFS
outlayer upload target/wasm32-wasip2/release/nostr-identity-zkp-tee.wasm

# Deploy to project (WASI v2)
outlayer deploy <project-name> --wasm-url <fastfs-url>

# Or from GitHub
git push && outlayer deploy <project-name> --github
```

## Configuration

The `outlayer.toml` file specifies `wasm32-wasip2` as the build target.

## Storage Features

The TEE uses persistent storage to cache the ZKP proving key:
- **First call**: Generate proving key (~30s), store in TEE storage
- **Subsequent calls**: Load from storage (~1s) ✅

Storage is:
- **Encrypted**: Using project-specific TEE keys
- **User-isolated**: Each user has their own namespace
- **Persistent**: Survives across executions and version updates
- **Atomic**: Supports increment, CAS, and other atomic operations

## Common Issues

### "Not a valid WASI Preview 2 component"
- **Cause**: Building with `wasm32-wasip1` instead of `wasm32-wasip2`
- **Fix**: Ensure outlayer.toml has `target = "wasm32-wasip2"`

### Storage functions not found
- **Cause**: Using old `extern "C"` storage_get/storage_set functions
- **Fix**: Use `outlayer::storage` API instead

## Documentation

- [OutLayer Storage API](https://outlayer.fastnear.com/docs/storage)
- [OutLayer Getting Started](https://outlayer.fastnear.com/docs/getting-started)
