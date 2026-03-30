#!/bin/bash
# Fix TEE to support smart contract integration
# This adds the RegisterViaContract action

set -e

echo "==================================="
echo "Fixing TEE for Contract Integration"
echo "==================================="
echo ""

TEE_DIR="/Users/asil/.openclaw/workspace/nostr-identity/nostr-identity-contract-zkp-tee"
LIB_FILE="$TEE_DIR/src/lib.rs"

# Check if file exists
if [ ! -f "$LIB_FILE" ]; then
    echo "❌ File not found: $LIB_FILE"
    echo ""
    echo "Please clone the repo first:"
    echo "git clone https://github.com/Kampouse/nostr-identity"
    exit 1
fi

cd "$TEE_DIR"

# Backup
cp "$LIB_FILE" "$LIB_FILE.backup"
echo "✅ Backed up to: $LIB_FILE.backup"

# Create patch file
cat > /tmp/tee_integration.patch << 'PATCH_EOF'
--- a/src/lib.rs
+++ b/src/lib.rs
@@ -1,3 +1,4 @@
+use serde_json::json;
 use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
 use near_sdk::serde::{Deserialize, Serialize};
 use sha2::{Sha256, Digest};
PATCH_EOF

echo "✅ Patch file created"

echo ""
echo "==================================="
echo "Manual Changes Required:"
echo "==================================="
echo ""
echo "1. Add to Action enum (around line 210):"
echo ""
cat << 'EOF'

    #[serde(rename = "register_via_contract")]
    RegisterViaContract {
        account_id: String,
        nep413_response: Nep413AuthResponse,
        contract_id: String,
        nonce: u64,
    },
EOF

echo ""
echo "2. Add to handle_action match (around line 250):"
echo ""
cat << 'EOF'

        Action::RegisterViaContract { 
            account_id, 
            nep413_response, 
            contract_id,
            nonce,
        } => {
            handle_register_via_contract(
                account_id,
                nep413_response,
                contract_id,
                nonce,
            )
        }
EOF

echo ""
echo "3. Add new handler function (around line 400):"
echo ""
cat << 'EOF'

fn handle_register_via_contract(
    account_id: String,
    nep413_response: Nep413AuthResponse,
    contract_id: String,
    nonce: u64,
) -> ActionResult {
    // 1. Verify NEP-413 signature
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("NEP-413 verification failed: {}", e)),
            ..Default::default()
        };
    }
    
    // 2. Generate commitment and nullifier
    let commitment = compute_sha256(&format!("commitment:{}", account_id));
    let nullifier = compute_sha256(&format!("nullifier:{}:{}", account_id, nonce));
    
    // 3. Prepare contract call args
    let args = json!({
        "registration": {
            "commitment": commitment,
            "nullifier": nullifier,
            "nep413_signature": nep413_response.signature,
            "user_public_key": nep413_response.public_key,
            "message": nep413_response.message,
            "nonce": nonce,
        },
        "delegator_signature": format!("tee_sig_{}", commitment),
    });
    
    // 4. Call smart contract (OutLayer handles this)
    // In production, use OutLayer's contract call API
    let _result = args; // Placeholder for actual contract call
    
    ActionResult {
        success: true,
        commitment: Some(commitment),
        nullifier: Some(nullifier),
        created_at: Some(env::block_timestamp()),
        ..Default::default()
    }
}
EOF

echo ""
echo "==================================="
echo "After making changes:"
echo "==================================="
echo ""
echo "# Build"
echo "cargo build --target wasm32-wasip2 --release"
echo ""
echo "# Test"
echo "cargo test"
echo ""
echo "# Deploy"
echo "outlayer deploy --name nostr-identity-zkp-tee \\"
echo "  target/wasm32-wasip2/release/nostr_identity_zkp_tee.wasm"
echo ""
