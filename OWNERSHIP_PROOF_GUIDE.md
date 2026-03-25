# Proving Ownership of npub

**Date:** March 25, 2026
**Question:** Can you prove an npub is yours?

---

## ✅ YES! Multiple Ways to Prove Ownership

You can prove you own an npub while keeping your NEAR account private.

---

## 🎯 Method 1: Sign with Nostr Key (Basic)

### How It Works

```
You have:
- npub (public): npub1abc123...
- nsec (private): nsec1xyz789... (secret!)

To prove ownership:
1. Someone gives you a challenge: "Sign this message: Hello World"
2. You sign with nsec
3. Anyone can verify with npub
4. ✅ Proved ownership!
```

### Example

```typescript
// Verifier creates challenge
const challenge = "Prove you own npub1abc123... at " + Date.now()

// You sign with Nostr private key
const signature = await nostr.sign(challenge, nsec)

// Verifier checks
const isValid = verifySignature(challenge, signature, npub)

if (isValid) {
  // ✅ You proved ownership!
  // ❌ But verifier still doesn't know your NEAR account
}
```

**Privacy:** ⭐⭐⭐ Perfect (account stays hidden)  
**Trust:** ✅ Cryptographic (signature)  
**Cost:** ✅ Free

---

## 🔐 Method 2: Sign with NEAR Wallet (Link Proofs)

### How It Works

```
You prove:
- "I own alice.near" (NEP-413 signature)
- "I own npub1abc123..." (Nostr signature)
- "Both belong to same person" (cross-signing)

Without revealing:
- Which NEAR account (if using ZK)
- Or revealing selectively (your choice)
```

### Example A: Public Link Proof

```typescript
// You want to publicly link your NEAR account to your npub

// 1. Sign with NEAR wallet
const nearSignature = await wallet.signMessage({
  message: `I own Nostr identity ${npub}`,
  nonce: crypto.randomUUID(),
  recipient: 'nostr-identity.near'
})

// 2. Sign with Nostr key
const nostrSignature = await nostr.sign(
  `I own NEAR account ${accountId}`,
  nsec
)

// 3. Publish both signatures
{
  near_account: "alice.near",  // ✅ Public now!
  npub: "npub1abc123...",
  near_signature: nearSignature,
  nostr_signature: nostrSignature
}

// Result: Everyone knows alice.near owns npub1abc123...
// Trade-off: ❌ Privacy lost (you chose to reveal)
```

### Example B: Private Link Proof (ZK)

```typescript
// You want to prove link WITHOUT revealing account

// 1. Generate ZK proof
const zkProof = await generateZKProof({
  near_account: "alice.near",  // ❌ NOT revealed!
  near_signature: nearSignature,
  nostr_npub: npub,
  nostr_signature: nostrSignature
})

// 2. Publish proof
{
  npub: "npub1abc123...",
  zk_proof: zkProof,
  // ❌ NO near_account field!
}

// 3. Anyone can verify
const isValid = verifyZKProof(zkProof)

if (isValid) {
  // ✅ Proved: "I own both a NEAR account AND this npub"
  // ❌ But nobody knows which NEAR account!
}
```

**Privacy:** ⭐⭐⭐ Perfect (with ZK)  
**Trust:** ✅ Cryptographic  
**Cost:** ✅ Free (verification)

---

## 🎭 Method 3: Challenge-Response (Interactive)

### How It Works

```
Verifier asks: "Prove you own npub1abc123..."
You respond: "Here's my signature"
Contract verifies: "✅ Valid"
Result: Ownership proved, account still hidden
```

### Implementation

```typescript
// Smart contract method
pub fn prove_ownership(
    &mut self,
    npub: String,
    challenge: String,
    signature: String,
    commitment: String,
) -> bool {
    // 1. Verify identity exists
    let identity = self.identities.get(&commitment)?;
    
    // 2. Verify npub matches
    if identity.npub != npub {
        return false;
    }
    
    // 3. Verify signature (Nostr key signed challenge)
    verify_nostr_signature(challenge, signature, npub)
    
    // ✅ Ownership proved!
    // ❌ Account still hidden (only commitment known)
}
```

### Usage

```typescript
// Verifier creates challenge
const challenge = await contract.create_challenge(npub)

// You sign challenge
const signature = await nostr.sign(challenge, nsec)

// Verify
const isValid = await contract.prove_ownership(
  npub,
  challenge,
  signature,
  commitment
)

// ✅ Proved ownership
// ❌ Account still private
```

**Privacy:** ⭐⭐⭐ Perfect  
**Trust:** ✅ Cryptographic  
**Cost:** ⚠️ 0.0001 NEAR

---

## 🔍 Method 4: Selective Disclosure (Your Choice)

### How It Works

```
Default: Nobody knows your account
Option: Reveal to specific party (KYC, dApp, etc.)
Control: You decide who sees what
```

### Example: KYC Verification

```typescript
// 1. KYC provider asks for verification
const kycRequest = {
  npub: "npub1abc123...",
  requested_data: ["account_id", "country"]
}

// 2. You choose to reveal
const disclosure = {
  near_account: "alice.near",  // ✅ Revealed to KYC only!
  country: "Canada",
  npub: "npub1abc123...",
  signature: await wallet.signMessage(...)
}

// 3. Send privately to KYC (off-chain)
await kycProvider.verify(disclosure)

// 4. KYC verifies and issues certificate
const kycCert = await kycProvider.issueCert({
  npub: "npub1abc123...",
  kyc_level: "basic",
  expires: "2027-01-01"
  // ❌ NO account_id in certificate!
})

// Result:
// ✅ KYC knows your account
// ❌ Public doesn't know
// ✅ You get KYC badge
// ⭐ Privacy preserved publicly
```

**Privacy:** ⭐⭐ (revealed to specific party)  
**Trust:** ✅ Your choice  
**Cost:** ✅ Free (off-chain)

---

## 🌐 Method 5: Cross-Platform Proof

### How It Works

```
Prove ownership across platforms:
- NEAR blockchain
- Nostr network
- Ethereum (optional)
- Other chains

All link to same identity (npub)
```

### Example

```typescript
// Generate unified proof
const crossPlatformProof = {
  // Nostr identity
  npub: "npub1abc123...",
  nostr_signature: await nostr.sign("Prove identity"),
  
  // NEAR proof (ZK - account hidden)
  near_proof: await generateZKProof({
    account: "alice.near",
    signature: nearSignature
  }),
  
  // Ethereum proof (optional)
  eth_address: "0x123...",
  eth_signature: await ethWallet.sign("Prove identity"),
  
  // Timestamp
  timestamp: Date.now()
}

// Verify on any platform
const isValid = verifyCrossPlatformProof(crossPlatformProof)

// ✅ Proved: Same person owns all these identities
// ❌ Still don't know which NEAR account (ZK proof)
```

**Privacy:** ⭐⭐⭐ Perfect (with ZK)  
**Trust:** ✅ Multi-chain cryptographic  
**Cost:** ⚠️ Gas on each chain

---

## 📊 Comparison Table

| Method | Proves Ownership | Reveals Account | Privacy | Trust | Cost |
|--------|------------------|-----------------|---------|-------|------|
| **Nostr Signature** | ✅ Yes | ❌ No | ⭐⭐⭐ | ✅ Crypto | Free |
| **NEAR Link (Public)** | ✅ Yes | ✅ Yes | ⭐ | ✅ Crypto | Free |
| **NEAR Link (ZK)** | ✅ Yes | ❌ No | ⭐⭐⭐ | ✅ Crypto | Free |
| **Challenge-Response** | ✅ Yes | ❌ No | ⭐⭐⭐ | ✅ Crypto | 0.0001 NEAR |
| **Selective Disclosure** | ✅ Yes | ⚠️ Choice | ⭐⭐ | ✅ User | Free |
| **Cross-Platform** | ✅ Yes | ❌ No | ⭐⭐⭐ | ✅ Multi | Gas |

---

## 🎯 Real-World Use Cases

### Use Case 1: dApp Login

```typescript
// dApp needs to verify you own the npub

// Method: Challenge-Response
const challenge = await dApp.getChallenge()
const signature = await nostr.sign(challenge)
const isValid = await dApp.verify(npub, challenge, signature)

// ✅ Logged in
// ❌ dApp doesn't know your account
// ⭐ Privacy preserved
```

### Use Case 2: KYC Verification

```typescript
// KYC provider needs to verify identity

// Method: Selective Disclosure
const kycData = {
  account: "alice.near",  // Revealed to KYC only
  npub: "npub1abc123...",
  government_id: "encrypted..."
}

await kycProvider.verify(kycData)

// ✅ KYC verified
// ❌ Public doesn't know your account
// ⭐ Private by default, revealed when needed
```

### Use Case 3: DAO Voting

```typescript
// DAO wants to verify members without doxxing them

// Method: ZK Proof
const votingProof = await generateZKProof({
  npub: "npub1abc123...",
  near_account: "alice.near",
  dao_membership: true
})

await daoContract.vote(proof, vote)

// ✅ Vote counted
// ❌ Nobody knows how alice.near voted
// ⭐ Anonymous voting
```

### Use Case 4: Content Verification

```typescript
// Content creator wants to prove authorship

// Method: Nostr Signature
const article = "My amazing article..."
const signature = await nostr.sign(article)

publish({
  article,
  author_npub: "npub1abc123...",
  signature
})

// ✅ Proved authorship
// ❌ Don't know which NEAR account
// ⭐ Credibility without doxxing
```

---

## 🔧 Implementation Examples

### Smart Contract Method

```rust
pub fn verify_nostr_ownership(
    &self,
    npub: String,
    message: String,
    signature: String,
) -> bool {
    // 1. Parse npub to get public key
    let pubkey = parse_npub(&npub)?;
    
    // 2. Verify signature
    verify_ed25519_signature(
        message.as_bytes(),
        &signature,
        &pubkey
    )
    
    // ✅ Returns true if valid
    // ❌ No account_id involved
}
```

### Frontend Integration

```typescript
// React component
function ProveOwnership({ npub }: { npub: string }) {
  const [challenge, setChallenge] = useState('')
  
  const proveOwnership = async () => {
    // 1. Get challenge from server
    const challenge = await fetch('/api/challenge').then(r => r.text())
    
    // 2. Sign with Nostr key
    const signature = await nostr.sign(challenge)
    
    // 3. Verify
    const isValid = await fetch('/api/verify', {
      method: 'POST',
      body: JSON.stringify({ npub, challenge, signature })
    }).then(r => r.json())
    
    if (isValid) {
      alert('✅ Ownership proved! Account still private.')
    }
  }
  
  return <button onClick={proveOwnership}>Prove I Own This</button>
}
```

---

## 🎭 Privacy Levels

### Level 1: Anonymous (Default)
```
npub: npub1abc123...
Prove ownership: ✅ Yes (sign with nsec)
Account revealed: ❌ No
Privacy: ⭐⭐⭐ Perfect
```

### Level 2: Pseudonymous
```
npub: npub1abc123...
Display name: "Alice" (self-attested)
Prove ownership: ✅ Yes
Account revealed: ❌ No
Privacy: ⭐⭐⭐ Perfect
```

### Level 3: Semi-Private (Selective)
```
npub: npub1abc123...
Prove ownership: ✅ Yes
Account revealed: ✅ To specific parties (KYC, etc.)
Privacy: ⭐⭐ Good (you control disclosure)
```

### Level 4: Public (Full Transparency)
```
npub: npub1abc123...
Prove ownership: ✅ Yes
Account revealed: ✅ Everyone
Privacy: ⭐ None (you chose this)
```

---

## 📋 Decision Matrix

| Need | Method | Reveals Account | Privacy |
|------|--------|-----------------|---------|
| **Just verify ownership** | Nostr signature | ❌ No | ⭐⭐⭐ |
| **Link accounts publicly** | Public link proof | ✅ Yes | ⭐ |
| **Link privately** | ZK proof | ❌ No | ⭐⭐⭐ |
| **KYC/compliance** | Selective disclosure | ⚠️ To verifier only | ⭐⭐ |
| **Multi-platform** | Cross-platform proof | ❌ No | ⭐⭐⭐ |

---

## 🚀 Quick Start

### Prove Ownership (5 seconds)

```typescript
// 1. Get challenge
const challenge = "Prove you own npub1abc123... at 1234567890"

// 2. Sign with Nostr key
const signature = await nostr.sign(challenge, nsec)

// 3. Submit proof
const isValid = verify(challenge, signature, npub)

// ✅ Done! Ownership proved, account private.
```

---

## 🎉 Summary

| Question | Answer |
|----------|--------|
| **Can you prove ownership?** | ✅ YES! |
| **Must reveal account?** | ❌ NO! |
| **Methods available?** | ✅ 5+ methods |
| **Privacy preserved?** | ✅ YES (your choice) |
| **Cryptographic proof?** | ✅ YES |

---

## 💡 Key Insight

**You can ALWAYS prove ownership, but you NEVER have to reveal your account!**

- ✅ Prove: "This npub is mine"
- ❌ Don't reveal: "My NEAR account is alice.near"
- ⭐ **Best of both worlds: Verification + Privacy**

**Ownership ≠ Identity Exposure**

---

*Prove it's yours. Keep your privacy. Have both.*
