# Full System Architecture: TEE + Smart Contract

**How to leverage both for maximum privacy and trustlessness**

---

## 🎯 The Two Components

### 1. **TEE Version** (OutLayer)
```
Location: nostr-identity-contract-zkp-tee/
Purpose: Generate & store Nostr identities
Privacy: Account hidden from blockchain
Trust: Trust TEE hardware
Cost: Free for users
Speed: 100ms
```

### 2. **Smart Contract** (Blockchain)
```
Location: nostr-identity-complete-contract/
Purpose: On-chain verification & transparency
Privacy: Commitment hash only (account hidden)
Trust: Trustless (on-chain verification)
Cost: ~0.001 NEAR per operation
Speed: 1-2 seconds
```

---

## 🏗️ How They Work Together

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  USER LAYER                      │
│  User signs NEP-413 message with wallet         │
└────────────────┬────────────────────────────────┘
                 │
                 ├─────────────────────┐
                 │                     │
                 ↓                     ↓
┌────────────────────────┐  ┌────────────────────┐
│   OPTION 1: TEE ONLY   │  │ OPTION 2: TEE +    │
│   (Fast, Private)      │  │ Smart Contract     │
│                        │  │ (Transparent)      │
│  1. Verify signature   │  │ 1. Verify signature│
│  2. Generate identity  │  │ 2. Generate identity│
│  3. Store in TEE       │  │ 3. Store in TEE    │
│                        │  │ 4. Register on-chain│
│  Privacy: ⭐⭐⭐         │  │ Privacy: ⭐⭐⭐      │
│  Trust: TEE hardware   │  │ Trust: Minimal     │
│  Cost: Free            │  │ Cost: $0.001       │
└────────────────────────┘  └────────────────────┘
```

---

## 💡 The Key Insight

**Smart Contract = Backup Verification Layer**

```
TEE provides:
  ✅ Privacy (account hidden)
  ✅ Speed (100ms)
  ✅ Free for users
  
Smart Contract adds:
  ✅ Transparency (on-chain proof)
  ✅ Backup (if TEE fails)
  ✅ Decentralization (multiple verifiers)
```

---

## 🔧 Integration Design

### Option 1: TEE Primary, Contract Backup (Recommended)

```typescript
// Primary flow: Use TEE
async function registerIdentity(accountId: string, npub: string) {
  // 1. Sign with wallet
  const signature = await wallet.signMessage(...)
  
  // 2. Register via TEE (primary)
  const teeResult = await teeRegister(accountId, npub, signature)
  
  // 3. Optionally register on-chain (backup)
  if (userWantsBackup) {
    await contractRegister(accountId, npub, signature, teeResult.commitment)
  }
  
  return teeResult
}
```

**Benefits:**
- ✅ TEE for privacy & speed
- ✅ Smart contract for transparency
- ✅ User chooses backup level

### Option 2: Smart Contract Primary, TEE for Generation

```typescript
// TEE generates, contract stores
async function registerIdentity(accountId: string) {
  // 1. Generate identity in TEE
  const { npub, nsec, commitment } = await teeGenerateIdentity(accountId)
  
  // 2. Register on smart contract
  await contract.register_via_delegator({
    npub,
    commitment,
    delegator_signature: teeSignature
  })
  
  return { npub, nsec }
}
```

**Benefits:**
- ✅ On-chain verification
- ✅ TEE for secure generation
- ⚠️ Less private (contract calls visible)

---

## 🚀 Recommended Architecture

### Hybrid Approach (Best of Both Worlds)

```typescript
class NostrIdentityService {
  private teeClient: TEEClient
  private contractClient: ContractClient
  
  async registerIdentity(
    accountId: string,
    options: { backup: boolean }
  ) {
    // 1. Sign NEP-413
    const signature = await this.signNEP413(accountId)
    
    // 2. Generate identity in TEE
    const identity = await this.teeClient.generateIdentity(
      accountId,
      signature
    )
    
    // 3. Optional: Backup on smart contract
    if (options.backup) {
      await this.contractClient.register({
        npub: identity.npub,
        commitment: identity.commitment,
        nullifier: identity.nullifier,
        proof: identity.teeProof
      })
    }
    
    return identity
  }
  
  async verifyIdentity(commitment: string) {
    // Try TEE first (faster)
    const teeResult = await this.teeClient.verify(commitment)
    
    if (teeResult.valid) {
      return teeResult
    }
    
    // Fallback to smart contract (backup)
    return await this.contractClient.verify(commitment)
  }
}
```

---

## 📊 Component Responsibilities

### TEE (OutLayer) Responsibilities

```
✅ Identity Generation
  - Generate Nostr keypair
  - Compute commitment hash
  - Store private key (secure)

✅ Primary Verification
  - Fast verification (< 100ms)
  - Private (no on-chain data)
  - Free for users

✅ Recovery
  - User can recover identity
  - NEP-413 based recovery
  - Private key retrieval
```

### Smart Contract Responsibilities

```
✅ Backup Verification
  - On-chain proof of identity
  - Transparent verification
  - Decentralized

✅ Cross-Chain Proofs
  - Generate proofs for other chains
  - Verify on Ethereum, etc.
  - Interoperability

✅ Transparency Layer
  - Public verification
  - Audit trail
  - Regulatory compliance
```

---

## 🔐 Privacy Analysis

### TEE Only
```
On blockchain:
  - Nothing! (Perfect privacy)

In TEE:
  - Account → npub mapping
  - Private keys

Privacy: ⭐⭐⭐⭐⭐
Risk: TEE compromise
```

### TEE + Smart Contract
```
On blockchain:
  - commitment hash → npub
  - Transaction signer: delegator

In TEE:
  - Account → commitment mapping
  - Private keys

Privacy: ⭐⭐⭐⭐
Risk: Lower (two layers)
```

**The contract stores commitment hash, NOT account!**

---

## 💰 Cost Comparison

### TEE Only
```
Registration: $0.00
Verification: $0.00
Recovery: $0.00
Total: FREE
```

### TEE + Smart Contract
```
TEE: $0.00
Contract registration: $0.001
Contract verification: $0.0001
Total: ~$0.001 per identity
```

**For 1000 users:**
- TEE only: $0.00
- TEE + contract: $1.00

---

## 🚀 Implementation Steps

### Step 1: Deploy TEE (Week 1)

```bash
# Deploy TEE version
cd nostr-identity-contract-zkp-tee
cargo build --target wasm32-wasip2 --release
outlayer deploy --name nostr-identity-zkp-tee \
  target/wasm32-wasip2/release/nostr_identity_zkp_tee.wasm

# Get TEE URL
# https://p.outlayer.fastnear.com/<id>/execute
```

### Step 2: Deploy Smart Contract (Week 2)

```bash
# Deploy contract
cd nostr-identity-complete-contract
cargo build --target wasm32-unknown-unknown --release
near deploy --accountId nostr-identity.near \
  --wasmFile target/wasm32-unknown-unknown/release/nostr_identity_complete.wasm

# Initialize with authorized delegators
near call nostr-identity.near new \
  '{"delegators": ["delegator.near"]}' \
  --accountId nostr-identity.near
```

### Step 3: Build Integration Layer (Week 3)

```typescript
// integration.ts
export class NostrIdentityIntegration {
  private teeUrl = process.env.TEE_URL
  private contractId = process.env.CONTRACT_ID
  
  async register(userChoice: 'fast' | 'verified') {
    if (userChoice === 'fast') {
      // TEE only (fast, private)
      return await this.teeRegister(...)
    } else {
      // TEE + Contract (verified, transparent)
      const identity = await this.teeRegister(...)
      await this.contractRegister(identity)
      return identity
    }
  }
}
```

### Step 4: Frontend Integration (Week 4)

```typescript
// app/page.tsx
function RegisterIdentity() {
  const [mode, setMode] = useState<'fast' | 'verified'>('fast')
  
  return (
    <div>
      <select onChange={(e) => setMode(e.target.value)}>
        <option value="fast">Fast (TEE only, free)</option>
        <option value="verified">Verified (TEE + contract, $0.001)</option>
      </select>
      
      <button onClick={() => register(mode)}>
        Register Identity
      </button>
    </div>
  )
}
```

---

## 🎯 User Experience

### Fast Mode (TEE Only)
```
1. Connect wallet
2. Click "Register" 
3. Sign message
4. Get identity (100ms)
5. Done!

Cost: FREE
Privacy: Maximum
```

### Verified Mode (TEE + Contract)
```
1. Connect wallet
2. Select "Verified"
3. Sign message
4. Get identity (2s)
5. View on blockchain
6. Done!

Cost: $0.001
Privacy: High
Verification: On-chain
```

---

## 📊 Final Comparison

| Feature | TEE Only | TEE + Contract | Winner |
|---------|----------|----------------|--------|
| **Speed** | 100ms | 2s | TEE |
| **Cost** | Free | $0.001 | TEE |
| **Privacy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | TEE |
| **Transparency** | ⭐⭐ | ⭐⭐⭐⭐⭐ | Contract |
| **Trustlessness** | Trust TEE | Mostly trustless | Contract |
| **Backup** | TEE only | Blockchain backup | Contract |

---

## 🎉 Bottom Line

**Use BOTH:**

1. **TEE for primary operations** (fast, private, free)
2. **Smart contract for backup/verification** (transparent, on-chain)

**User chooses:**
- "I want fast & free" → TEE only
- "I want verification" → TEE + contract

**This gives maximum flexibility!**

---

## 📋 Deployment Order

```
Week 1: Deploy TEE (production ready NOW)
Week 2: Deploy smart contract (backup layer)
Week 3: Build integration (unified API)
Week 4: Frontend options (let users choose)
```

**Start with TEE, add contract as enhancement!**

---

*The full system = TEE (primary) + Smart Contract (backup/verification)*
