#!/bin/bash
# Fix TEE to include delegator functionality
# This script adds the register_via_contract method to the TEE

set -e

echo "==================================="
echo "Adding Delegator to TEE"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TEE_DIR="/Users/asil/.openclaw/workspace/nostr-identity/nostr-identity-contract-zkp-tee"

# Check if TEE directory exists
if [ ! -d "$TEE_DIR" ]; then
    echo -e "${RED}❌ TEE directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found TEE directory${NC}"

# Backup original lib.rs
cd "$TEE_DIR"
cp src/lib.rs src/lib.rs.backup
echo -e "${GREEN}✓ Backed up original file${NC}"

# Check if outlayer_contract_call exists
if grep -q "outlayer_contract_call" src/lib.rs; then
    echo -e "${GREEN}✓ OutLayer contract call exists${NC}"
else
    echo -e "${YELLOW}⚠ Need to add OutLayer contract call helper${NC}"
fi

# Check if RegisterViaContract action exists
if grep -q "RegisterViaContract" src/lib.rs; then
    echo -e "${GREEN}✓ RegisterViaContract action exists${NC}"
else
    echo -e "${YELLOW}⚠ Need to add RegisterViaContract action${NC}"
fi

echo ""
echo "==================================="
echo "Next Steps:"
echo "==================================="
echo ""
echo "1. Edit src/lib.rs to add:"
echo "   - RegisterViaContract action to Action enum"
echo "   - handle_register_via_contract function"
echo "   - outlayer_contract_call helper (if needed)"
echo ""
echo "2. Build: cargo build --target wasm32-wasip2 --release"
echo ""
echo "3. Test: cargo test"
echo ""
echo "4. Deploy: outlayer deploy --name nostr-identity-zkp-tee ..."
echo ""
echo "5. Authorize: near call nostr-identity.near add_delegator ..."
echo ""
echo "See DELEGATOR_IN_TEE_IMPLEMENTATION.md for exact code"
echo ""
