# TEE Safety Fixes - Make It Fail Safely

## Problem
The TEE uses `unwrap()` everywhere, which causes **panics and crashes** instead of graceful error handling.

## Critical Issues to Fix

### 1. Safe Time Handling
```rust
// ❌ DANGEROUS - Panics if system time is before Unix epoch
let created_at = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_secs();

// ✅ SAFE - Returns 0 on error
fn safe_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
```

### 2. Safe Mutex Locking
```rust
// ❌ DANGEROUS - Panics if mutex is poisoned
let nonce_lock = USED_NONCES.lock().unwrap();

// ✅ SAFE - Handles poisoned mutexes
fn safe_nonces_check<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&mut UsedNonces) -> R,
{
    USED_NONCES.lock().map(|mut guard| f(&mut guard)).ok()
}
```

### 3. Safe Storage Operations
```rust
// ❌ DANGEROUS - Panics if JSON serialization fails
tee_storage_set(..., &serde_json::to_string(&info).unwrap());

// ✅ SAFE - Handles JSON errors
fn safe_store_identity(commitment: &str, nullifier: &str, npub: &str, created_at: u64) -> Result<(), String> {
    let info = IdentityInfo { /* ... */ };
    let json = serde_json::to_string(&info)
        .map_err(|e| format!("JSON serialization failed: {}", e))?;

    tee_storage_set(&format!("commitment:{}", commitment), npub);
    tee_storage_set(&format!("npub:{}", npub), &json);
    Ok(())
}
```

### 4. Safe Key Operations
```rust
// ❌ DANGEROUS - Panics if slice conversion fails
let seed: [u8; 32] = key_bytes[..32].try_into().unwrap();

// ✅ SAFE - Returns error instead of panicking
let seed: [u8; 32] = key_bytes[..32]
    .try_into()
    .map_err(|_| format!("Bad key length: {}", key_bytes.len()))?;
```

### 5. Safe ZKP Operations
```rust
// ❌ DANGEROUS - Multiple unwraps
let pk_lock = PROVING_KEY.lock().unwrap();
let pk = pk_lock.as_ref().ok_or("ZKP not initialized")?;

// ✅ SAFE - Proper error propagation
fn get_proving_key() -> Result<ProvingKey<Bn254>, String> {
    PROVING_KEY.lock()
        .map_err(|_| "ZKP mutex poisoned".to_string())
        .and_then(|guard| {
            guard.as_ref().cloned().ok_or("ZKP not initialized".to_string())
        })
}
```

## Top Priority Fixes

### Fix #1: Safe Timestamps (HIGHEST PRIORITY)
Replace ALL `.unwrap()` on system time with safe version:
- Line 641
- Line 1377
- Line 1436
- Line 1473
- Line 1601
- Line 1709

### Fix #2: Safe Mutex Operations
Replace ALL `.unwrap()` on mutex locks with safe locking:
- Lines 123, 131, 144 (ACCOUNT_HASH_SALT)
- Lines 379, 429 (USED_NONCES)
- Lines 685, 703-705 (COMMITMENTS, NULLIFIERS, IDENTITIES)
- Lines 1014, 1314 (IDENTITIES)

### Fix #3: Safe Storage (Line 700)
Replace JSON unwrap with proper error handling:
```rust
tee_storage_set(&format!("npub:{}", npub),
    &serde_json::to_string(&info).map_err(|e| {
        format!("Failed to serialize identity info: {}", e)
    })?
);
```

### Fix #4: Add Panic Handler
Add a top-level panic handler to catch crashes:
```rust
fn main() {
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("TEE PANIC: {}", panic_info);
        // Try to save critical state before crashing
        // Send error to monitoring
    }));
}
```

## Testing Strategy

1. **Poisoned Mutex Test**: Deliberately poison a mutex and verify graceful handling
2. **Invalid Input Test**: Send malformed keys, invalid JSON, etc.
3. **Time Travel Test**: Mock system time going backwards
4. **Memory Stress Test**: OOM conditions
5. **Concurrency Test**: Race conditions on shared state

## Implementation Priority

1. **CRITICAL** (Do immediately):
   - Safe timestamps (prevents crashes on time issues)
   - Safe JSON serialization (prevents data loss)

2. **HIGH** (This week):
   - Safe mutex operations (prevents poisoning crashes)
   - Safe key operations (prevents input crashes)

3. **MEDIUM** (Next sprint):
   - Add panic handler
   - Comprehensive error logging
   - Monitoring integration

## Monitoring

Add telemetry to track:
- Panic rate (should be 0)
- Error rates by operation
- Mutex poison events
- Failed operations

## Impact of NOT Fixing

- **Data Loss**: Users lose encrypted backups
- **Replay Attacks**: Lost nonce state allows replay
- **Downtime**: Crashes require TEE restart
- **Bad UX**: Silent failures, lost transactions
- **Security**: Inconsistent state, potential exploits
