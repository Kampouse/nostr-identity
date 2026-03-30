# True Privacy Implementation Plan

## Current State
- TEE generates ZKP (receives account_id)
- TEE sees account_id temporarily
- Privacy relies on TEE hardware

## Goal
- Client generates ZKP (account_id never leaves browser)
- TEE only verifies (never sees account_id)
- Perfect privacy without trusting TEE

## Implementation

### Phase 1: Extract ZKP to WASM Package

```bash
cd nostr-identity-latest
mkdir -p packages/zkp-wasm
```

**packages/zkp-wasm/Cargo.toml:**
```toml
[package]
name = "nostr-identity-zkp-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
ark-bn254 = "0.4"
ark-groth16 = "0.4"
ark-serialize = "0.4"
sha2 = "0.10"
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.6"
```

**packages/zkp-wasm/src/lib.rs:**
```rust
use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

#[wasm_bindgen]
pub fn compute_commitment(account_id: &str) -> String {
    let input = format!("commitment:{}", account_id);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

#[wasm_bindgen]
pub fn generate_zkp(account_id: &str, nonce: &str) -> Result<JsValue, JsValue> {
    // Generate ZKP proving ownership
    // Returns: { proof, public_inputs: [commitment, nullifier] }
    // TODO: Implement full Groth16 proof
    let commitment = compute_commitment(account_id);
    let nullifier_input = format!("nullifier:{}{}", account_id, nonce);
    let nullifier = hex::encode(Sha256::digest(nullifier_input.as_bytes()));
    
    Ok(serde_wasm_bindgen::to_value(&serde_json::json!({
        "proof": "PLACEHOLDER_PROOF",
        "public_inputs": [commitment, nullifier],
    }))?)
}
```

### Phase 2: Update TEE to Verify-Only

**New action:**
```rust
#[serde(rename = "register_with_zkp")]
RegisterWithZkp {
    zkp_proof: ZKPProof,      // Client-generated
    npub: String,              // Client-generated Nostr pubkey
    deadline: u64,
}
```

**TEE handler:**
```rust
fn handle_register_with_zkp(zkp_proof: ZKPProof, npub: String, deadline: u64) -> ActionResult {
    // 1. Verify ZKP
    if !verify_zkp(&zkp_proof)? {
        return error("Invalid ZKP");
    }
    
    // 2. Extract commitment from proof
    let commitment = &zkp_proof.public_inputs[0];
    let nullifier = &zkp_proof.public_inputs[1];
    
    // 3. Check not already registered
    if is_commitment_used(commitment) {
        return error("Already registered");
    }
    
    // 4. Prepare transaction for writer contract
    let tx_payload = create_writer_tx(commitment, nullifier, &npub, deadline);
    
    // 5. Store identity (only commitment/nullifier, no account_id!)
    store_identity(commitment, nullifier, &npub, now());
    
    ActionResult {
        success: true,
        npub: Some(npub),
        commitment: Some(commitment.clone()),
        tx_payload: Some(tx_payload),
        ..Default::default()
    }
}
```

### Phase 3: Frontend Integration

**Browser flow:**
```javascript
// 1. User connects NEAR wallet
const accountId = await wallet.getAccountId();

// 2. User signs NEP-413 message
const signature = await wallet.signMessage({
    message: "Register Nostr identity",
    recipient: "nostr-identity",
});

// 3. Client computes commitment locally
const commitment = zkpWasm.compute_commitment(accountId);

// 4. Client generates ZKP locally
const zkpProof = await zkpWasm.generate_zkp(accountId, nonce);

// 5. Client generates Nostr keypair
const nostrKeys = generateNostrKeys(); // nsec never leaves browser!

// 6. Send to TEE (no account_id!)
const result = await fetch('https://nostr-identity.outlayer.run', {
    method: 'POST',
    body: JSON.stringify({
        register_with_zkp: {
            zkp_proof: zkpProof,
            npub: nostrKeys.npub,
            deadline: Date.now() / 1000 + 3600,
        }
    })
});

// 7. TEE returns tx_payload
// 8. Client calls near-signer-tee to sign
// 9. Client broadcasts to writer contract
```

### Phase 4: Writer Contract

Already deployed at `w.kampouse.near` - stores only:
- `commitment` (hash of account_id)
- `nullifier` (prevents double-registration)
- `npub` (Nostr public key)

Never sees `account_id`.

## Privacy Guarantees

| Data | Client | TEE | Writer Contract | Blockchain |
|------|--------|-----|-----------------|------------|
| account_id | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| nsec | ✅ YES | ❌ NO | ❌ NO | ❌ NO |
| commitment | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| npub | ✅ YES | ✅ YES | ✅ YES | ✅ YES |

## Effort Estimate

- Phase 1 (WASM package): 2-4 hours
- Phase 2 (TEE verify-only): 1-2 hours
- Phase 3 (Frontend): 2-3 hours
- Phase 4 (Testing): 1-2 hours

**Total: 6-11 hours**

## Simpler Alternative (Phase 0)

If full ZKP is too complex, start with:
1. Client computes commitment locally
2. Client sends {commitment, signature, public_key} to TEE
3. TEE verifies signature (still sees account_id from signature)
4. TEE trusts client's commitment

This provides **medium privacy** (TEE sees account_id) but is simpler to implement.
