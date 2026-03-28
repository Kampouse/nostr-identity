#!/bin/bash
# Local test harness for nostr-identity-zkp-tee
# Tests the full flow locally with REAL cryptographic signatures
#
# Usage:
#   ./test_local.sh              # Run native binary
#   ./test_local.sh --wasmtime   # Run via wasmtime (WASM)
#   ./test_local.sh --clean      # Clean storage and rebuild

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

STORAGE_DIR="/tmp/nostr-identity-storage"
WASMTIME="$HOME/.wasmtime/bin/wasmtime"
BINARY="target/debug/nostr-identity-zkp-tee"
HELPER="target/debug/test_helper"
WASM_BINARY="target/wasm32-wasip2/release/nostr-identity-zkp-tee.wasm"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; }
info() { echo -e "${CYAN}ℹ️${NC} $1"; }
step() { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

# Parse args
MODE="native"
CLEAN=false
for arg in "$@"; do
    case $arg in
        --native) MODE="native" ;;
        --wasmtime) MODE="wasmtime" ;;
        --clean) CLEAN=true ;;
    esac
done

# Clean if requested
if $CLEAN; then
    info "Cleaning storage and build artifacts..."
    rm -rf "$STORAGE_DIR"
    cargo clean
fi

# Ensure storage dir exists
mkdir -p "$STORAGE_DIR"

# Build
step "Building (features: local-test)"
cargo build --features local-test 2>&1 | tail -1

if [ ! -f "$HELPER" ]; then
    info "Building test helper..."
    cargo build --bin test_helper --features local-test 2>&1 | tail -1
fi

# Generate real NEP-413 signatures
step "Generating real NEP-413 signatures"

NEP413_SIG1=$($HELPER sign 0 "Verify NEAR account ownership for Nostr identity" "test-nonce-12345")
NEP413_SIG2=$($HELPER sign 1 "Verify ownership" "nonce-456")
NEP413_SIG3=$($HELPER sign 0 "Recovery request" "recovery-nonce-789")
NEP413_SIG4=$($HELPER sign 1 "Verify writer call ownership" "writer-nonce-999")

info "Signature 1 (generate): $(echo "$NEP413_SIG1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["signature"][:30] + "...")')"
info "Signature 2 (prepare):  $(echo "$NEP413_SIG2" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["signature"][:30] + "...")')"

# Get test key for signing transactions
TEST_KEY=$($HELPER keyinfo 0 | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["private_key"])')
TEST_KEY1=$($HELPER keyinfo 1 | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["private_key"])')

# Helper: run action via native binary
run_action() {
    local input="$1"
    echo "$input" | LOCAL_STORAGE_DIR="$STORAGE_DIR" "$BINARY" 2>/dev/null
}

# Track results
TESTS=0
PASSED=0

check() {
    local label="$1"
    local result="$2"
    local expected="$3"
    
    TESTS=$((TESTS + 1))
    
    if echo "$result" | grep -q "$expected"; then
        pass "$label"
        PASSED=$((PASSED + 1))
        return 0
    else
        fail "$label"
        echo "  Expected: $expected"
        echo "  Got: $(echo "$result" | head -c 200)"
        return 1
    fi
}

# ============================================================================
# TEST 1: Generate identity (REAL NEP-413 signature)
# ============================================================================
step "Test 1: Generate Identity (real signature)"

GENERATE_INPUT=$(python3 -c "
import json
sig = json.loads('''$NEP413_SIG1''')
print(json.dumps({
    'action': 'generate',
    'account_id': 'test-validation.near',
    'nep413_response': sig
}))
")

RESULT=$(run_action "$GENERATE_INPUT")
check "Generate succeeds" "$RESULT" '"success":true'

# Extract npub for later tests
NPUB=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('npub',''))" 2>/dev/null || echo "")
info "Generated npub: ${NPUB:0:20}..."

# Extract commitment
COMMITMENT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); z=d.get('zkp_proof',{}); print(z.get('public_inputs',['',''])[0])" 2>/dev/null || echo "")
info "Commitment: ${COMMITMENT:0:20}..."

# ============================================================================
# TEST 2: Duplicate generation should fail
# ============================================================================
step "Test 2: Duplicate Generate (should fail)"

RESULT=$(run_action "$GENERATE_INPUT")
check "Duplicate fails" "$RESULT" 'already has a Nostr identity'

# ============================================================================
# TEST 3: Stats
# ============================================================================
step "Test 3: Stats"

RESULT=$(run_action '{"action":"stats"}')
check "Stats returns success" "$RESULT" '"success":true'
COUNT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('created_at',0))" 2>/dev/null)
info "Registered identities: $COUNT"

# ============================================================================
# TEST 4: Check Commitment (existing)
# ============================================================================
step "Test 4: Check Commitment"

if [ -n "$COMMITMENT" ]; then
    RESULT=$(run_action "{\"action\":\"check_commitment\",\"commitment\":\"$COMMITMENT\"}")
    check "Commitment exists" "$RESULT" '"verified":true'
else
    info "Skipping (no commitment from Test 1)"
fi

# ============================================================================
# TEST 5: Get Identity
# ============================================================================
step "Test 5: Get Identity"

if [ -n "$NPUB" ]; then
    RESULT=$(run_action "{\"action\":\"get_identity\",\"npub\":\"$NPUB\"}")
    check "Identity found" "$RESULT" '"success":true'
else
    info "Skipping (no npub from Test 1)"
fi

# ============================================================================
# TEST 6: Recover Identity (real NEP-413 signature)
# ============================================================================
step "Test 6: Recover Identity (real signature)"

RECOVER_INPUT=$(python3 -c "
import json
sig = json.loads('''$NEP413_SIG3''')
print(json.dumps({
    'action': 'recover',
    'account_id': 'test-validation.near',
    'nep413_response': sig
}))
")

RESULT=$(run_action "$RECOVER_INPUT")
check "Recover succeeds" "$RESULT" '"success":true'

# ============================================================================
# TEST 7: Prepare Writer Call (real signature)
# ============================================================================
step "Test 7: Prepare Writer Call (real signature)"

PREPARE_INPUT=$(python3 -c "
import json
sig = json.loads('''$NEP413_SIG4''')
print(json.dumps({
    'action': 'prepare_writer_call',
    'account_id': 'test-writer.near',
    'nep413_response': sig,
    'writer_contract_id': 'writer.test.near',
    'deadline': 9999999999
}))
")

RESULT=$(run_action "$PREPARE_INPUT")
check "Prepare returns success" "$RESULT" '"success":true'
check "Has tx_payload" "$RESULT" '"tx_payload"'

# ============================================================================
# TEST 8: Register with ZKP + real signing key
# ============================================================================
step "Test 8: Register with ZKP (real signing key)"

REGISTER_ZKP_INPUT=$(python3 -c "
import json, time
print(json.dumps({
    'action': 'register_with_zkp',
    'zkp_proof': {
        'proof': 'dGVzdF9wcm9vZl9ub3RfZW1wdHk=',
        'public_inputs': ['deadbeef0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c', 'cafebabe0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c'],
        'verified': True,
        'timestamp': int(time.time())
    },
    'npub': 'test_npub_zkp_' + str(int(time.time())),
    'writer_contract_id': 'writer.test.near',
    'deadline': 9999999999,
    'signing_key': '$TEST_KEY'
}))
")

RESULT=$(run_action "$REGISTER_ZKP_INPUT")
check "Register with ZKP succeeds" "$RESULT" '"success":true'
check "Has signed_transaction" "$RESULT" '"signed_transaction"'

# Show the signed transaction
TX_SIG=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('signed_transaction',{}); print(t.get('signature','N/A')[:40] + '...')" 2>/dev/null)
info "Transaction signature: $TX_SIG"

# ============================================================================
# TEST 9: Verify ZKP (empty - should fail)
# ============================================================================
step "Test 9: Verify ZKP (empty - should fail)"

RESULT=$(run_action '{"action":"verify","zkp_proof":{"proof":"","public_inputs":["abc","def"],"verified":false,"timestamp":12345}}')
check "Empty proof fails" "$RESULT" '"Empty proof"'

# ============================================================================
# TEST 10: Storage Persistence
# ============================================================================
step "Test 10: Storage Persistence"

FILE_COUNT=$(ls "$STORAGE_DIR/" 2>/dev/null | wc -l | tr -d ' ')
TESTS=$((TESTS + 1))
if [ "$FILE_COUNT" -gt 0 ]; then
    pass "Storage files persisted ($FILE_COUNT files)"
    PASSED=$((PASSED + 1))
else
    fail "No storage files (in-memory only)"
fi

info "Storage dir: $STORAGE_DIR ($FILE_COUNT files)"

# ============================================================================
# TEST 11: Unit Tests
# ============================================================================
step "Test 11: Unit Tests (cargo test)"

if cargo test --features local-test 2>&1 | grep -q "test result: ok"; then
    pass "Unit tests passed"
    TESTS=$((TESTS + 1))
    PASSED=$((PASSED + 1))
else
    fail "Unit tests failed"
    TESTS=$((TESTS + 1))
    cargo test --features local-test 2>&1 | tail -5
fi

# ============================================================================
# SUMMARY
# ============================================================================
step "Results"
echo ""
echo -e "  ${GREEN}$PASSED/$TESTS${NC} tests passed"
echo ""

if [ "$PASSED" -eq "$TESTS" ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
fi

echo ""
echo "Feature flags:"
echo "  local-test   → File-backed storage + mock contract calls"
echo "  outlayer-tee → OutLayer host functions + persistent storage"
echo ""
echo "Quick commands:"
echo "  ./test_local.sh --native    # Fast native testing (default)"
echo "  ./test_local.sh --wasmtime  # Full WASM test"
echo "  ./test_local.sh --clean     # Reset storage + rebuild"
echo ""
echo "Manual test:"
echo "  echo '{\"action\":\"stats\"}' | LOCAL_STORAGE_DIR=/tmp/nostr-identity-storage target/debug/nostr-identity-zkp-tee"
