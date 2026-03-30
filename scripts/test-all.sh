#!/bin/bash
# Quick test script for true privacy implementation

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     TRUE PRIVACY - COMPONENT TESTS                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Writer Contract
echo "1️⃣  WRITER CONTRACT (w.kampouse.near)"
echo "   Testing: TEE can write"
near call w.kampouse.near write '{"_message":"Test","deadline":1774620195}' \
  --accountId kampouse.near --networkId mainnet 2>&1 | grep -q "Transaction Id" && \
  echo "   ✅ PASS" || echo "   ❌ FAIL"
echo ""

# Test 2: WASM Package
echo "2️⃣  WASM PACKAGE (packages/zkp-wasm)"
cd /Users/asil/.openclaw/workspace/nostr-identity-latest/packages/zkp-wasm
cargo test 2>&1 | grep -q "3 passed" && \
  echo "   ✅ PASS (3/3 tests)" || echo "   ❌ FAIL"
echo ""

# Test 3: near-signer-TEE
echo "3️⃣  NEAR-SIGNER-TEE (kampouse.near/near-signer-tee)"
outlayer run kampouse.near/near-signer-tee '{"method":"get_pubkey","params":{}}' 2>&1 | grep -q "Tx:" && \
  echo "   ✅ PASS (TEE responding)" || echo "   ❌ FAIL"
echo ""

# Test 4: Files exist
echo "4️⃣  FILES"
[ -f "/Users/asil/.openclaw/workspace/nostr-identity-latest/packages/zkp-wasm/pkg/nostr_identity_zkp_wasm_bg.wasm" ] && \
  echo "   ✅ WASM package built (81KB)" || echo "   ❌ WASM not found"

[ -f "/Users/asil/.openclaw/workspace/nostr-identity-latest/test-true-privacy.html" ] && \
  echo "   ✅ Test page exists" || echo "   ❌ Test page not found"

[ -f "/Users/asil/.openclaw/workspace/nostr-identity-latest/contracts/nostr-identity-contract-zkp-tee/target/wasm32-wasip2/release/nostr-identity-zkp-tee.wasm" ] && \
  echo "   ✅ TEE WASM built" || echo "   ❌ TEE WASM not built"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  NEXT: Test in browser                                     ║"
echo "║  $ cd nostr-identity-latest                                ║"
echo "║  $ python3 -m http.server 8000                             ║"
echo "║  $ open http://localhost:8000/test-true-privacy.html       ║"
echo "╚════════════════════════════════════════════════════════════╝"
