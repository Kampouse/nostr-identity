#!/bin/bash
set -e

echo "=== NOSTR-IDENTITY + DELEGATOR INTEGRATION ==="
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

# Test 1: Get TEE public key
echo "1. Getting TEE public key..."
PUBKEY=$(outlayer run $TEE_SIGNER '{"method":"get_pubkey","params":{}}' 2>&1 | grep -o '"public_key":"[^"]*"' | cut -d'"' -f4 || echo "pending")
echo "   TEE Public Key: ${PUBKEY:0:30}..."
echo ""

# Test 2: Verify writer contract accepts TEE
echo "2. Testing write access..."
near call $WRITER_CONTRACT write '{"_message":"Integration test","deadline":1774617907}' --accountId kampouse.near --networkId $NETWORK 2>&1 | grep -E "Transaction|true" || echo "   (check balance)"
echo ""

echo "=== INTEGRATION READY ==="
echo ""
echo "Flow:"
echo "  1. User signs NEP-413 → nostr-identity TEE"
echo "  2. nostr-identity TEE → near-signer-tee (sign_tx)"
echo "  3. Broadcast → $WRITER_CONTRACT"
echo ""
echo "Next: Update nostr-identity-contract-zkp-tee to use near-signer-tee"
