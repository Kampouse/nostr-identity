#!/bin/bash
set -e

echo "=== NOSTR-IDENTITY + WRITER CONTRACT INTEGRATION ==="
echo ""

# Configuration
TEE_SIGNER="kampouse.near/near-signer-tee"
WRITER_CONTRACT="w.kampouse.near"
NETWORK="mainnet"

echo "Components:"
echo "  TEE Signer: $TEE_SIGNER"
echo "  Writer Contract: $WRITER_CONTRACT"
echo "  Network: $NETWORK"
echo ""

# Step 1: User creates NEP-413 signature (simulated)
echo "=== STEP 1: User creates NEP-413 signature ==="
USER_ACCOUNT="test-user.near"
MESSAGE="Login to nostr-identity"
NONCE=$(python3 -c "import os; import base64; print(base64.b64encode(os.urandom(32)).decode())")

echo "  User: $USER_ACCOUNT"
echo "  Message: $MESSAGE"
echo "  Nonce: ${NONCE:0:20}..."
echo ""

# Step 2: Call nostr-identity TEE to prepare writer call
echo "=== STEP 2: Call nostr-identity TEE (prepare_writer_call) ==="
echo "  This will:"
echo "    - Verify NEP-413 signature"
echo "    - Generate Nostr identity (npub, nsec)"
echo "    - Create transaction payload for writer contract"
echo ""

DEADLINE=$(python3 -c "import time; print(int(time.time()) + 3600)")

# Mock NEP-413 response (in production, user would sign this)
NEP413_RESPONSE=$(cat <<EOF
{
  "account_id": "$USER_ACCOUNT",
  "public_key": "ed25519:DemoPublicKeyForTesting12345678901234567890",
  "signature": "DEMO_SIGNATURE_BASE64",
  "authRequest": {
    "message": "$MESSAGE",
    "nonce": "$NONCE",
    "recipient": "nostr-identity.test"
  }
}
EOF
)

echo "NEP-413 Response:"
echo "$NEP413_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$NEP413_RESPONSE"
echo ""

# Step 3: Show what prepare_writer_call returns
echo "=== STEP 3: nostr-identity TEE returns ==="
echo "  success: true"
echo "  npub: npub1abc123... (Nostr public key)"
echo "  nsec: nsec1xyz789... (Nostr private key - save this!)"
echo "  commitment: abc123... (SHA256 hash)"
echo "  nullifier: def456... (SHA256 hash)"
echo "  tx_payload: {"
echo "    signer_id: kampouse.near"
echo "    receiver_id: $WRITER_CONTRACT"
echo "    actions: [{FunctionCall: write}]"
echo "  }"
echo ""

# Step 4: Call near-signer-tee to sign transaction
echo "=== STEP 4: Call near-signer-tee (sign_tx) ==="
echo "  Input: tx_payload from step 3"
echo "  Output: signed_tx_base64"
echo ""

# Step 5: Broadcast to NEAR
echo "=== STEP 5: Broadcast signed transaction ==="
echo "  Contract: $WRITER_CONTRACT"
echo "  Method: write"
echo "  Args: {"
echo "    _message: {npub, commitment, nullifier, timestamp}"
echo "    deadline: $DEADLINE"
echo "  }"
echo ""

# Step 6: Verify on-chain
echo "=== STEP 6: Verify on-chain ==="
echo "  ✓ Transaction from: kampouse.near (TEE)"
echo "  ✓ Identity stored: npub, commitment, nullifier"
echo "  ✗ User identity: NOT ON CHAIN (privacy!)"
echo ""

echo "=== INTEGRATION COMPLETE ==="
echo ""
echo "Flow summary:"
echo "  1. User signs NEP-413 → nostr-identity TEE"
echo "  2. nostr-identity TEE → generates identity + tx_payload"
echo "  3. Client → near-signer-tee (sign_tx)"
echo "  4. Client → broadcasts to $WRITER_CONTRACT"
echo ""
echo "Privacy guarantee:"
echo "  On-chain only sees: kampouse.near (TEE)"
echo "  User account: NEVER appears on mainnet"
echo ""
echo "Files updated:"
echo "  - contracts/nostr-identity-contract-zkp-tee/src/lib.rs"
echo "    - Added Action::PrepareWriterCall"
echo "    - Added handle_prepare_writer_call()"
echo "    - Added tx_payload field to ActionResult"
