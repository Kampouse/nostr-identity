#!/bin/bash
# Full round trip: TEE (local) → NEAR testnet (on-chain)
#
# This script:
# 1. Runs the TEE code locally to generate a Nostr identity
# 2. Calls writer.gork-agent.testnet on testnet to register it
# 3. Verifies the identity exists on-chain
#
set -e

TEE_DIR="$(cd "$(dirname "$0")" && pwd)"
STORAGE_DIR="/tmp/nostr-identity-e2e"
CONTRACT="writer.gork-agent.testnet"
CALLER="gork-agent.testnet"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${CYAN}ℹ️${NC} $1"; }
step() { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

# Clean
rm -rf "$STORAGE_DIR"
mkdir -p "$STORAGE_DIR"

# Build if needed
if [ ! -f "$TEE_DIR/target/debug/nostr-identity-zkp-tee" ]; then
    step "Building TEE code"
    cd "$TEE_DIR" && cargo build --features local-test 2>&1 | tail -1
fi

TEE_BIN="$TEE_DIR/target/debug/nostr-identity-zkp-tee"
HELPER="$TEE_DIR/target/debug/test_helper"

if [ ! -f "$HELPER" ]; then
    cd "$TEE_DIR" && cargo build --bin test_helper --features local-test 2>&1 | tail -1
fi

# Generate real NEP-413 signature
step "1. Generate NEP-413 signature"
SIG=$($HELPER sign 0 "Verify NEAR account ownership for Nostr identity" "e2e-nonce-$(date +%s)")
info "Signature: $(echo "$SIG" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["signature"][:30])...')"

# Step 2: TEE generates identity
step "2. TEE generates identity (local)"

GENERATE_INPUT=$(python3 -c "
import json
sig = json.loads('''$SIG''')
print(json.dumps({
    'action': 'generate',
    'account_id': 'test-validation.near',
    'nep413_response': sig
}))
")

TEE_RESULT=$(echo "$GENERATE_INPUT" | LOCAL_STORAGE_DIR="$STORAGE_DIR" "$TEE_BIN" 2>/dev/null)

if ! echo "$TEE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('success') else 1)"; then
    fail "TEE failed: $(echo "$TEE_RESULT" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("error","unknown"))')"
fi

pass "TEE generated identity"
NPUB=$(echo "$TEE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('npub',''))")
COMMITMENT=$(echo "$TEE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('zkp_proof',{}); print(p.get('public_inputs',['',''])[0])")
NULLIFIER=$(echo "$TEE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('zkp_proof',{}); print(p.get('public_inputs',['',''])[1])")

info "npub: ${NPUB:0:30}..."
info "commitment: ${COMMITMENT:0:30}..."

# Step 3: Register on testnet
step "3. Register on testnet"

REGISTER_RESULT=$(near call "$CONTRACT" register \
    "{\"npub\":\"$NPUB\",\"commitment\":\"$COMMITMENT\",\"nullifier\":\"$NULLIFIER\",\"sig\":\"tee_signed\"}" \
    --accountId "$CALLER" \
    --networkId testnet 2>&1)

if echo "$REGISTER_RESULT" | grep -qi "error\|panic\|Error"; then
    if echo "$REGISTER_RESULT" | grep -qi "already"; then
        info "Already registered (from previous run)"
    else
        fail "Registration failed: $REGISTER_RESULT"
    fi
else
    pass "Identity registered on testnet"
fi

# Step 4: Verify on-chain
step "4. Verify on-chain"

EXISTS=$(near view "$CONTRACT" exists "{\"commitment\":\"$COMMITMENT\"}" --networkId testnet 2>&1)
if echo "$EXISTS" | grep -q "true"; then
    pass "Identity exists on-chain!"
else
    fail "Identity NOT found: $EXISTS"
fi

TOTAL=$(near view "$CONTRACT" total --networkId testnet 2>&1)
info "Total identities: $TOTAL"

# Summary
step "Results"
echo ""
echo -e "${GREEN}Full round trip complete!${NC}"
echo "  TEE (local) → $CONTRACT (testnet)"
echo "  https://testnet.nearblocks.io/address/$CONTRACT"
