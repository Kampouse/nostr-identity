#!/bin/bash
set -e

# Setup ZKP circuit for Nostr Identity
# This requires Circom and SnarkJS installed

echo "🔧 Setting up ZKP circuit..."

# 1. Compile circuit
echo "📝 Compiling circuit..."
circom near_ownership.circom --r1cs --O1 -s near_ownership.sym

# 2. Generate witness (trusted setup)
echo "🔑 Generating witness (trusted setup)..."
snarkjs groth16 setup near_ownership.r1cs pot12_raw.ptau
snarkjs groth16 contribute pot12_raw.ptau pot12_0000.ptau
snarkjs groth16 prepare phase2 pot12_0000.ptau near_ownership_0000.zkey near_ownership_0000.wasm

# 3. Generate proving and verification keys
echo "🔐 Generating proving and verification keys..."
snarkjs groth16 export verificationkey near_ownership_0000.zkey verification_key.json
snarkjs zkey export verificationkey near_ownership_0000.zkey

# 4. Generate WASM for client
echo "📦 Generating WASM for client..."
circom --wasm --r1cs --O1 -s near_ownership.sym
cp near_ownership.wasm ../client/circuit/

# 5. Copy files
echo "📋 Copying files..."
cp verification_key.json ../server/
cp near_ownership.r1cs ../client/circuit/

echo "✅ Setup complete!"
echo ""
echo "Files generated:"
echo "  - client/circuit/near_ownership.wasm"
echo "  - client/circuit/near_ownership.r1cs"
echo "  - server/verification_key.json"
echo ""
echo "Next steps:"
echo "  1. cd client && npm install"
echo "  2. npm run generate"
echo "  3. cd server && npm install"
echo "  4. npm start"
