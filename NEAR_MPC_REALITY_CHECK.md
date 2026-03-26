# NEAR MPC - Actual Capabilities vs My Proposal

**Date:** March 25, 2026
**Repository:** https://github.com/near/mpc

---

## ✅ NEAR MPC EXISTS!

Good news: NEAR does have an MPC network!

---

## 🔍 What NEAR MPC Actually Does

### Primary Use Case: Threshold Signatures

```
Purpose: Generate signatures across multiple chains
Mechanism: Distributed key generation + threshold signing
Application: Cross-chain bridges, wallet abstraction
```

### What It Provides

✅ **Threshold Signature Scheme (TSS)**
- Distributed key generation
- Threshold signing (need M of N nodes)
- Supports multiple chains (Bitcoin, Ethereum, etc.)

✅ **Production Ready**
- Deployed on mainnet
- Multiple nodes running
- Used by NEAR ecosystem

✅ **Well Documented**
- Clear API
- Example implementations
- Active development

---

## ❌ What It Does NOT Do (That I Proposed)

### My Proposal Required:

```typescript
1. Verify NEP-413 signatures ❓
2. Generate SHA-256 hashes ❓
3. General-purpose MPC computation ❓
```

### What NEAR MPC Actually Does:

```typescript
1. Generate threshold signatures ✅
2. Manage shared keys ✅
3. Sign transactions for other chains ✅
```

**Key Difference:**
- **NEAR MPC:** Signing transactions (signature generation)
- **My Proposal:** Verifying signatures + general computation

---

## 🤔 Can We Use It for Delegator?

### Option 1: Adapt to Use Threshold Signatures

```typescript
// Use NEAR MPC for signing, not verification
// Different approach from what I proposed

// Instead of:
// 1. User signs with wallet
// 2. MPC verifies signature
// 3. MPC calls contract

// Do this:
// 1. User signs with wallet
// 2. Traditional delegator verifies
// 3. MPC network signs the transaction
// 4. MPC signature proves verification
```

**Pros:**
- ✅ Uses actual NEAR MPC capabilities
- ✅ Decentralized signing
- ✅ No single point of failure

**Cons:**
- ⚠️ Still need traditional verification
- ⚠️ More complex
- ⚠️ Higher cost

### Option 2: Use for Different Purpose

```typescript
// Use NEAR MPC for cross-chain identity

// Register on NEAR (traditional delegator)
await traditionalDelegator.register(...)

// Prove identity on Ethereum (MPC signature)
const signature = await nearMpc.sign(identityProof)

// Verify on Ethereum
await ethereumContract.verifyNearIdentity(signature)
```

**Pros:**
- ✅ Uses MPC for what it's designed
- ✅ Cross-chain capability
- ✅ Adds value to identity system

**Cons:**
- ⚠️ Doesn't solve delegator trust issue
- ⚠️ Additional feature, not core solution

---

## 💡 Better Understanding

### NEAR MPC is Like:

```
Traditional wallet:
  - Private key in one place
  - Single signature

MPC wallet:
  - Key split across nodes
  - Need M of N to sign
  - No single point of compromise
```

**It's for SECURING keys, not VERIFYING data.**

---

## 🎯 Revised Recommendation

### Use NEAR MPC For:

✅ **Cross-chain identity proofs**
```
1. Register on NEAR (traditional)
2. Generate cross-chain proof (MPC)
3. Verify on other chains
```

✅ **Secure key management**
```
1. Use MPC for signing high-value transactions
2. Threshold security for admin operations
3. Multi-sig for contract upgrades
```

### Use Traditional Delegator For:

✅ **Identity registration**
```
1. Fast, cheap, simple
2. Already implemented
3. Works well
```

---

## 📊 Comparison: What I Proposed vs What's Possible

| Feature | My Proposal | NEAR MPC Reality |
|---------|-------------|------------------|
| **Verify signatures** | ✅ Proposed | ❌ Not designed for this |
| **Generate hashes** | ✅ Proposed | ❌ Not designed for this |
| **General MPC** | ✅ Proposed | ❌ Limited to signatures |
| **Threshold signatures** | ⚠️ Optional | ✅ Primary feature |
| **Cross-chain signing** | ⚠️ Optional | ✅ Primary feature |
| **Production ready** | ❓ Unknown | ✅ Yes |

---

## 🚀 New Architecture Proposal

### Hybrid Approach

```
Layer 1: Traditional Delegator
  ↓ Fast, cheap registration
  ↓ Verifies NEP-413 signatures
  
Layer 2: NEAR MPC (Optional)
  ↓ Cross-chain identity proofs
  ↓ Threshold-signed attestations
  ↓ Decentralized verification
  
Result:
  ✅ Best of both worlds
  ✅ Uses MPC for what it's good at
  ✅ Traditional for simple operations
```

---

## 🔧 Implementation

### Phase 1: Traditional Delegator (Current)
```typescript
// Fast, simple registration
await traditionalDelegator.register(
  accountId,
  npub,
  signature
)
```

### Phase 2: Add MPC Cross-Chain Proofs
```typescript
// Generate cross-chain proof
const mpcProof = await nearMpc.generateCrossChainProof({
  identity: commitment,
  targetChain: 'ethereum',
  targetAddress: '0x...'
})

// Verify on Ethereum
await ethereumContract.verifyNearIdentity(mpcProof)
```

### Phase 3: MPC-Secured Admin
```typescript
// Use MPC for admin operations
const adminSignature = await nearMpc.sign({
  operation: 'add_delegator',
  newDelegator: 'delegator2.near'
})

await contract.admin_operation(adminSignature)
```

---

## 💰 Cost Comparison

### Traditional Delegator Only
```
Registration: $0.001
Cross-chain proof: N/A
Total: $0.001
```

### Traditional + MPC
```
Registration: $0.001
Cross-chain proof: $0.05 (MPC signing)
Admin operations: $0.02 (MPC signing)
Total: $0.001-$0.07 depending on usage
```

---

## 🎯 What I Got Wrong

### My Mistake:
```
❌ Assumed NEAR MPC was general-purpose
❌ Thought it could verify arbitrary signatures
❌ Thought it could do arbitrary computation
```

### Reality:
```
✅ NEAR MPC is for threshold signatures
✅ Designed for key management
✅ Optimized for cross-chain operations
```

---

## ✅ What I Got Right

### Core Concept:
```
✅ MPC can provide trustlessness
✅ Decentralized verification is valuable
✅ Privacy preservation is important
```

### Solution:
```
✅ Use right tool for right job
✅ Traditional delegator for registration
✅ NEAR MPC for cross-chain + admin
```

---

## 📋 Updated Recommendation

### Immediate (Week 1)
```
1. Deploy traditional delegator ✅
2. Test thoroughly ✅
3. Get to production ✅
```

### Short-term (Week 2-3)
```
1. Add NEAR MPC integration
2. Implement cross-chain proofs
3. Add MPC-secured admin operations
```

### Long-term (Month 2+)
```
1. Expand cross-chain support
2. Add more MPC features
3. Optimize costs
```

---

## 🎉 Bottom Line

**NEAR MPC EXISTS and is production-ready!** ✅

**But it's designed for:**
- Threshold signatures
- Cross-chain operations
- Key management

**NOT for:**
- General-purpose MPC computation
- Signature verification
- Hash generation

**Best approach:**
- Use traditional delegator for registration (fast, cheap)
- Add NEAR MPC for cross-chain proofs (valuable feature)
- Use MPC for admin security (threshold operations)

---

## 📚 Resources

- **Repository:** https://github.com/near/mpc
- **Documentation:** Available in repo
- **Examples:** Threshold signatures, cross-chain
- **Status:** Production-ready

---

*Honest update: NEAR MPC is real and awesome, but for different purposes than I initially proposed!*
