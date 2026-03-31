# Nostr Identity — Aurora Cross-Contract ZK Verification

On-chain Groth16 proof verification via Aurora (EVM on NEAR).

## Architecture

```
Frontend → TEE → NEAR Contract → Aurora (ecPairing precompile) → callback → store identity
```

- **NEAR contract** stores identities, sends proofs to Aurora for verification
- **Aurora Solidity verifier** uses BN254 precompiles (ecAdd=0x06, ecMul=0x07, ecPairing=0x08)
- Gas cost: ~50 Tgas cross-contract call (vs 300+ Tgas for pure WASM pairing)

## Deployed (Testnet)

| Component | Address |
|-----------|---------|
| NEAR Contract | `nostr-identity.kampouse.testnet` |
| Aurora Verifier | `0xBCFA2bfaEbF47B4f8b68aE5321B36B75209B147c` |

## Build & Deploy

### NEAR Contract
```bash
cd contracts/nostr-identity-aurora
cargo +1.86 build --target wasm32-unknown-unknown --release
wasm-opt --enable-bulk-memory --strip-target-features -Oz \
  target/wasm32-unknown-unknown/release/nostr_identity.wasm \
  -o target/nostr_identity.opt.wasm
near deploy nostr-identity.kampouse.testnet target/nostr_identity.opt.wasm \
  --initFunction new --initArgs '{}' --networkId testnet
```

### Aurora Verifier
```bash
cd aurora
forge create Groth16Verifier.sol:Groth16Verifier \
  --rpc-url https://testnet.aurora.dev/ \
  --private-key <KEY> --legacy --broadcast
```

### Set Aurora Verifier Address
```bash
near call nostr-identity.kampouse.testnet set_aurora_verifier \
  '{"address":"<AURORA_CONTRACT_ADDRESS_NO_0X>"}' \
  --accountId kampouse.testnet --networkId testnet
```

## Contract Methods

### Writes (TEE authority only)
- `register(owner, npub, commitment, nullifier, account_hash, proof_b64, public_inputs_b64)` — Submit identity with Groth16 proof
- `set_aurora_verifier(address)` — Set Aurora verifier contract address

### Callbacks
- `on_verify(key)` — Processes Aurora verification result

### Reads
- `get_identity_by_npub(npub)` → `Option<IdentityInfo>`
- `is_registered(npub)` → `bool`
- `get_total_identities()` → `u64`
- `get_tee_authority()` → `AccountId`

## Files

- `src/lib.rs` — NEAR smart contract (Rust)
- `aurora/Groth16Verifier.sol` — Solidity Groth16 verifier (BN254 precompiles)
- `Cargo.toml` — Rust dependencies (near-sdk 5.8.1, no BN254 math needed)
