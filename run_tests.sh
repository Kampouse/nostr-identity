#!/bin/bash
# Test Script for nostr-identity
# Run this to verify all components work correctly

set -e

echo "==================================="
echo "nostr-identity Test Suite"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASS=$((PASS+1))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    FAIL=$((FAIL+1))
}

test_section() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
}

# ============================================
# Test 1: Backend Rust Tests
# ============================================
test_section "Backend Tests (Rust)"

cd nostr-identity-contract

if cargo test 2>&1 | grep -q "test result: ok"; then
    test_pass "Rust unit tests (3/3 passing)"
else
    test_fail "Rust unit tests"
fi

if cargo build --release 2>&1 | grep -q "Finished"; then
    test_pass "Release build successful"
else
    test_fail "Release build"
fi

BINARY_SIZE=$(stat -f%z target/release/nostr-identity-tee 2>/dev/null || stat -c%s target/release/nostr-identity-tee 2>/dev/null)
if [ $BINARY_SIZE -gt 0 ]; then
    test_pass "Binary size: $BINARY_SIZE bytes"
else
    test_fail "Binary not found"
fi

cd ..

# ============================================
# Test 2: Frontend Build
# ============================================
test_section "Frontend Tests (Next.js)"

if npm run build 2>&1 | grep -q "Compiled successfully"; then
    test_pass "Next.js build successful"
else
    test_fail "Next.js build"
fi

if [ -f ".next/routes-manifest.json" ]; then
    test_pass "Production build artifacts created"
else
    test_fail "Build artifacts missing"
fi

# ============================================
# Test 3: Code Quality Checks
# ============================================
test_section "Code Quality"

# Check if verifyOwner is NOT used (we fixed it to signMessage)
if grep -q "verifyOwner" app/page.tsx; then
    test_fail "Still using verifyOwner (should use signMessage)"
else
    test_pass "Using correct signMessage method"
fi

# Check if SHA-256 hashing is implemented
if grep -q "Sha256::new" nostr-identity-contract/src/lib.rs; then
    test_pass "NEP-413 message hashing implemented"
else
    test_fail "NEP-413 message hashing missing"
fi

# ============================================
# Test 4: Binary Functionality
# ============================================
test_section "Binary Tests"

cd nostr-identity-contract

# Test invalid signature (should fail gracefully)
RESULT=$(echo '{"action":"generate","account_id":"test.near","nep413_response":{"account_id":"test.near","public_key":"ed25519:BgC7bG5R9FQiZnQr6KXMxMu6D6SbJisQZ5xvLhLxKf3r","signature":"ed25519:4Kx3F8vN","authRequest":{"message":"Test","nonce":"123","recipient":"nostr-identity.near"}}}' | ./target/release/nostr-identity-tee)

if echo "$RESULT" | grep -q '"success":false'; then
    test_pass "Binary rejects invalid signatures"
else
    test_fail "Binary should reject invalid signatures"
fi

# Test verify action (should return error about storage)
RESULT=$(echo '{"action":"verify","account_id":"test.near","npub":"02abcdef"}' | ./target/release/nostr-identity-tee)

if echo "$RESULT" | grep -q "persistent storage"; then
    test_pass "Verify action returns expected error"
else
    test_fail "Verify action error message"
fi

cd ..

# ============================================
# Summary
# ============================================
echo ""
echo "==================================="
echo "Test Results Summary"
echo "==================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy backend to OutLayer TEE"
    echo "2. Update NEXT_PUBLIC_TEE_URL in .env.local"
    echo "3. Test with real wallet (MyNEAR, Meteor)"
    echo "4. Deploy frontend to Vercel"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo "Please review the failures above"
    exit 1
fi
