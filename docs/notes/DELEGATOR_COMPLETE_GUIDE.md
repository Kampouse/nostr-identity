# The Delegator - Complete Technical Guide

**Everything you need to know about the delegator pattern**

---

## 🎯 What is the Delegator?

**Simple definition:** An off-chain service that verifies users and calls the smart contract on their behalf.

**Why needed:** To register identities WITHOUT revealing user accounts on the blockchain.

---

## 🏗️ The Problem (Without Delegator)

### Direct Contract Call

```typescript
// User calls contract directly
await contract.register({
  account_id: "alice.near",  // ❌ PUBLIC on blockchain!
  npub: "npub1abc123..."
})
```

**What happens:**
1. Transaction recorded on blockchain
2. Everyone sees: "alice.near called register()"
3. Everyone sees: "alice.near owns npub1abc123..."
4. **Privacy:** ❌ ZERO

**Blockchain record:**
```
Transaction from: alice.near
Method: register
Args: { account_id: "alice.near", npub: "npub1abc123..." }
Result: Identity registered
```

**Anyone can query:**
```sql
SELECT * FROM transactions WHERE signer = 'alice.near'
→ Reveals: alice.near owns npub1abc123...
```

---

## ✅ The Solution (With Delegator)

### Delegator Pattern

```typescript
// User sends to delegator (OFF-CHAIN)
await fetch('https://delegator.example.com/register', {
  method: 'POST',
  body: JSON.stringify({
    account_id: "alice.near",
    npub: "npub1abc123...",
    signature: "..."  // Proves ownership
  })
})

// Delegator verifies (OFF-CHAIN)
// Then calls contract (ON-CHAIN)
await contract.register_via_delegator({
  npub: "npub1abc123...",
  commitment: "abc123...",  // Hash only!
  delegator_signature: "..."
})
```

**What happens:**
1. User sends data to delegator (private)
2. Delegator verifies signature (private)
3. Delegator calls contract (public)
4. Contract stores hash (not account!)

**Blockchain record:**
```
Transaction from: delegator.near  // ❌ NOT alice.near!
Method: register_via_delegator
Args: { npub: "npub1abc123...", commitment: "abc123..." }
Result: Identity registered
```

**Anyone can query:**
```sql
SELECT * FROM transactions WHERE signer = 'alice.near'
→ Result: NOTHING (alice.near never called contract!)

SELECT * FROM transactions WHERE signer = 'delegator.near'
→ Result: Many registrations, but NO account_ids!
```

**Privacy:** ⭐⭐⭐ PERFECT

---

## 🔧 How the Delegator Works (Step by Step)

### Architecture Overview

```
┌─────────────────┐
│  User (Alice)   │
│  alice.near     │
└────────┬────────┘
         │ 1. Sign message
         │ 2. Send to delegator
         ↓
┌─────────────────┐
│  Delegator      │
│  delegator.near │
│                 │
│  3. Verify sig  │
│  4. Gen hashes  │
│  5. Call contract│
└────────┬────────┘
         │ 6. Register identity
         ↓
┌─────────────────┐
│ Smart Contract  │
│  nostr-id.near  │
│                 │
│ 7. Store hash   │
│    (NO account!)│
└─────────────────┘
```

### Detailed Flow

#### Step 1: User Creates NEP-413 Signature

```typescript
// User (alice.near) signs message
const message = `Register Nostr identity for alice.near`
const nonce = crypto.randomUUID()
const recipient = "nostr-identity.near"

const signature = await wallet.signMessage({
  message,
  nonce: new TextEncoder().encode(nonce),
  recipient
})
```

**What this creates:**
```json
{
  "account_id": "alice.near",
  "public_key": "ed25519:BgC7bG5R9FQiZnQr6KXMxMu6D6SbJisQZ5xvLhLxKf3r",
  "signature": "ed25519:4Kx3F8vN...",
  "authRequest": {
    "message": "Register Nostr identity for alice.near",
    "nonce": "550e8400-e29b-41d4-a716-446655440000",
    "recipient": "nostr-identity.near"
  }
}
```

**What this proves:** "I own alice.near" (cryptographically verified)

#### Step 2: User Sends to Delegator (Off-Chain)

```typescript
// User sends to delegator API (NOT blockchain!)
const response = await fetch('https://delegator.example.com/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account_id: "alice.near",
    npub: "npub1abc123...",
    nep413_response: signature,
    timestamp: Date.now()
  })
})
```

**Important:** This is an HTTP request, NOT a blockchain transaction!

**What's sent:**
- account_id: "alice.near"
- npub: "npub1abc123..."
- NEP-413 signature (proves ownership)
- Timestamp

**Who sees this:**
- ✅ Delegator (private server)
- ❌ NOT on blockchain
- ❌ NOT public

#### Step 3: Delegator Verifies Signature (Off-Chain)

```typescript
// Delegator service verifies
async function verifyNEP413Signature(
  accountId: string,
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  // 1. Verify message contains account_id
  if (!message.includes(accountId)) {
    return false
  }
  
  // 2. Hash message (NEP-413 spec)
  const messageHash = sha256(message)
  
  // 3. Parse public key
  const pubKeyBytes = parsePublicKey(publicKey)
  
  // 4. Parse signature
  const signatureBytes = parseSignature(signature)
  
  // 5. Verify signature
  const isValid = await verify(
    signatureBytes,
    messageHash,
    pubKeyBytes
  )
  
  return isValid
}
```

**What's checked:**
1. ✅ Signature is valid (ed25519)
2. ✅ Message contains account_id
3. ✅ Timestamp is recent (< 5 minutes)
4. ✅ Nonce hasn't been used (replay attack prevention)

**If verification fails:**
```typescript
if (!isValid) {
  return { error: "Invalid signature" }
}
```

**If verification succeeds:**
```typescript
// Continue to step 4
```

#### Step 4: Delegator Generates Hashes (Off-Chain)

```typescript
// Get nonce from contract
const nonce = await contract.view('get_delegator_nonce')

// Generate commitment hash
const commitment = sha256(`commitment:${accountId}:${nonce}`)
// Result: "a1b2c3d4e5f6..."

// Generate nullifier hash
const nullifier = sha256(`nullifier:${accountId}:${nonce}`)
// Result: "e5f6g7h8i9j0..."
```

**Why hashes?**
- **Commitment:** Proves "some account" registered (without revealing which)
- **Nullifier:** Prevents double registration (unique per account)

**Important properties:**
1. **One-way:** Cannot reverse "a1b2c3d4..." to find "alice.near"
2. **Deterministic:** Same input = same hash
3. **Collision-resistant:** Different accounts = different hashes

**Example:**
```typescript
sha256("commitment:alice.near:0") = "a1b2c3d4..."
sha256("commitment:bob.near:0")   = "x9y8z7w6..."
// Completely different!
```

#### Step 5: Delegator Signs Registration (Off-Chain)

```typescript
// Create registration object
const registration = {
  npub: "npub1abc123...",
  commitment: "a1b2c3d4...",
  nullifier: "e5f6g7h8...",
  nep413_signature: signature,
  user_public_key: publicKey,
  message: message,
  nonce: nonce
}

// Delegator signs it
const delegatorSignature = await delegatorWallet.sign(
  JSON.stringify(registration)
)
```

**Why delegator signs?**
- Proves delegator verified the user
- Smart contract checks this signature
- Prevents unauthorized registrations

#### Step 6: Delegator Calls Contract (On-Chain)

```typescript
// Delegator calls smart contract
const result = await delegator.account.functionCall({
  contractId: "nostr-identity.near",
  methodName: "register_via_delegator",
  args: {
    registration: registration,
    delegator_signature: delegatorSignature
  },
  gas: "30000000000000",
  attachedDeposit: "0"
})
```

**What's sent to blockchain:**
```json
{
  "registration": {
    "npub": "npub1abc123...",
    "commitment": "a1b2c3d4...",
    "nullifier": "e5f6g7h8...",
    "nep413_signature": "...",
    "user_public_key": "...",
    "message": "...",
    "nonce": 0
  },
  "delegator_signature": "..."
}
```

**What's NOT sent:**
- ❌ account_id ("alice.near")

**Transaction signer:**
- ✅ delegator.near (NOT alice.near!)

#### Step 7: Contract Verifies and Stores (On-Chain)

```rust
pub fn register_via_delegator(
    &mut self,
    registration: DelegatedRegistration,
    delegator_signature: String,
) -> IdentityInfo {
    // 1. Verify caller is authorized delegator
    let delegator = env::predecessor_account_id()
    if !self.authorized_delegators.contains(&delegator) {
        panic!("Unauthorized delegator")
    }
    
    // 2. Verify delegator signature
    verify_delegator_signature(&delegator_signature, &registration)?
    
    // 3. Check nullifier not used
    if self.nullifiers.contains(&registration.nullifier) {
        panic!("Already registered")
    }
    
    // 4. Check commitment not used
    if self.identities.contains_key(&registration.commitment) {
        panic!("Already registered")
    }
    
    // 5. Store identity (NO account_id!)
    let identity = IdentityInfo {
        npub: registration.npub,
        commitment: registration.commitment,
        nullifier: registration.nullifier,
        created_at: env::block_timestamp(),
        delegator,  // Store delegator, NOT user!
        nonce: registration.nonce,
    }
    
    self.identities.insert(&registration.commitment, &identity)
    self.nullifiers.insert(&registration.nullifier)
    
    identity
}
```

**What's stored:**
```rust
{
  npub: "npub1abc123...",
  commitment: "a1b2c3d4...",
  nullifier: "e5f6g7h8...",
  delegator: "delegator.near",
  created_at: 1712345678,
  nonce: 0
  // ❌ NO account_id!
}
```

#### Step 8: Delegator Stores Mapping (Off-Chain)

```typescript
// Delegator stores in private database
await database.insert({
  table: 'identity_mappings',
  data: {
    commitment: "a1b2c3d4...",
    account_id: "alice.near",  // Private!
    npub: "npub1abc123...",
    created_at: Date.now()
  }
})
```

**Why store this?**
- For recovery (user can retrieve their identity)
- For selective disclosure (reveal to KYC)
- For administration (prevent abuse)

**Who sees this:**
- ✅ Delegator only (private database)
- ❌ NOT on blockchain
- ❌ NOT public

---

## 🔐 Security Guarantees

### What's Secure

✅ **Cryptographic Verification**
- NEP-413 signature proves account ownership
- Ed25519 signatures (quantum-resistant)
- SHA-256 hashing (collision-resistant)

✅ **Delegator Authorization**
- Smart contract only accepts calls from authorized delegators
- Delegator must sign registration
- Prevents unauthorized registrations

✅ **Replay Attack Prevention**
- Nonce prevents reusing signatures
- Nullifier prevents double registration
- Timestamp prevents old signatures

✅ **Privacy**
- User's account NEVER on blockchain
- Only hash stored publicly
- Delegator database is private

### What's NOT Secure (Yet)

⚠️ **Delegator Trust**
- User must trust delegator with account info
- Delegator could leak database
- **Fix:** Use ZK proofs (delegator doesn't know either)

⚠️ **Single Point of Failure**
- If delegator goes down, registrations stop
- **Fix:** Multiple authorized delegators

⚠️ **No Encryption**
- Delegator database not encrypted
- **Fix:** Encrypt at rest

---

## 🏢 Delegator Implementation

### TypeScript Implementation

```typescript
import { connect, keyStores, utils } from 'near-api-js'
import { sha256 } from 'js-sha256'
import { verify } from '@noble/ed25519'

class DelegatorService {
  private near: any
  private account: any
  private db: Database
  
  constructor(
    private delegatorId: string,
    private privateKey: string
  ) {
    this.db = new Database('delegator.db')
  }
  
  async init() {
    // Connect to NEAR
    const keyStore = new keyStores.InMemoryKeyStore()
    const keyPair = utils.KeyPair.fromString(this.privateKey)
    await keyStore.setKey('testnet', this.delegatorId, keyPair)
    
    this.near = await connect({
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org'
    })
    
    this.account = await this.near.account(this.delegatorId)
  }
  
  async registerIdentity(
    accountId: string,
    npub: string,
    nep413Signature: string,
    userPublicKey: string,
    message: string
  ) {
    // 1. Verify NEP-413 signature
    const isValid = await this.verifySignature(
      accountId,
      message,
      nep413Signature,
      userPublicKey
    )
    
    if (!isValid) {
      throw new Error('Invalid signature')
    }
    
    // 2. Get nonce
    const nonce = await this.getNonce()
    
    // 3. Generate hashes
    const commitment = this.generateCommitment(accountId, nonce)
    const nullifier = this.generateNullifier(accountId, nonce)
    
    // 4. Create registration
    const registration = {
      npub,
      commitment,
      nullifier,
      nep413_signature: nep413Signature,
      user_public_key: userPublicKey,
      message,
      nonce
    }
    
    // 5. Sign as delegator
    const delegatorSignature = await this.signRegistration(registration)
    
    // 6. Call contract
    const result = await this.account.functionCall({
      contractId: 'nostr-identity.near',
      methodName: 'register_via_delegator',
      args: {
        registration,
        delegator_signature: delegatorSignature
      },
      gas: '30000000000000'
    })
    
    // 7. Store in database
    await this.db.insert({
      commitment,
      account_id: accountId,
      npub,
      created_at: Date.now()
    })
    
    return { success: true, commitment }
  }
  
  private async verifySignature(
    accountId: string,
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    // Verify message contains account_id
    if (!message.includes(accountId)) {
      return false
    }
    
    // Hash message
    const messageHash = sha256(message)
    
    // Verify signature
    const isValid = await verify(
      parseSignature(signature),
      new Uint8Array(messageHash),
      parsePublicKey(publicKey)
    )
    
    return isValid
  }
  
  private generateCommitment(accountId: string, nonce: number): string {
    return sha256(`commitment:${accountId}:${nonce}`)
  }
  
  private generateNullifier(accountId: string, nonce: number): string {
    return sha256(`nullifier:${accountId}:${nonce}`)
  }
  
  private async getNonce(): Promise<number> {
    const nonce = await this.account.viewFunction(
      'nostr-identity.near',
      'get_delegator_nonce'
    )
    return parseInt(nonce)
  }
  
  private async signRegistration(registration: any): Promise<string> {
    const message = JSON.stringify(registration)
    const hash = sha256(message)
    const signature = await this.account.signMessage(new Uint8Array(hash))
    return signature.signature
  }
}
```

---

## 💰 Cost Analysis

### Who Pays What?

**User pays:** ❌ NOTHING
- Signature creation: Free (local)
- HTTP request: Free (tiny)

**Delegator pays:** ✅ Gas costs
- Contract call: ~0.001 NEAR ($0.001)
- Storage: ~0.01 NEAR ($0.01)

**Business models:**

1. **Free service (subsidized)**
   - Project pays all costs
   - User pays nothing
   - Good for: MVP, testing

2. **Per-registration fee**
   - User pays $0.10 off-chain
   - Delegator pays $0.001 on-chain
   - Profit: $0.099 per registration
   - Good for: Sustainable business

3. **Subscription**
   - User pays $5/month
   - Unlimited registrations
   - Good for: Power users

---

## 🚀 Deployment

### Step 1: Deploy Smart Contract

```bash
cd nostr-identity-complete-contract
cargo build --target wasm32-unknown-unknown --release
near deploy --accountId nostr-identity.near --wasmFile ...
near call nostr-identity.near new '{"delegators": ["delegator.near"]}'
```

### Step 2: Setup Delegator Service

```bash
cd delegator-service
npm install
npm run build
```

### Step 3: Configure

```env
DELEGATOR_ACCOUNT_ID=delegator.near
DELEGATOR_PRIVATE_KEY=ed25519:...
CONTRACT_ID=nostr-identity.near
DATABASE_URL=postgresql://...
```

### Step 4: Run

```bash
npm start
```

### Step 5: Test

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "alice.near",
    "npub": "npub1abc123...",
    "nep413_signature": "...",
    "user_public_key": "...",
    "message": "Register identity"
  }'
```

---

## 📊 Monitoring

### Health Check

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    delegator: process.env.DELEGATOR_ACCOUNT_ID,
    nonce: await getNonce(),
    db_status: 'connected',
    timestamp: Date.now()
  })
})
```

### Metrics

```typescript
let stats = {
  total_registrations: 0,
  failed_verifications: 0,
  last_registration: null
}

app.get('/metrics', (req, res) => {
  res.json(stats)
})
```

---

## 🔍 Common Questions

### Q: Can user register without delegator?

**A:** No. Contract only accepts registrations from authorized delegators.

```rust
if !self.authorized_delegators.contains(&delegator) {
    panic!("Unauthorized delegator")
}
```

### Q: What if delegator goes offline?

**A:** Use multiple authorized delegators for redundancy.

```typescript
// Contract stores multiple delegators
authorized_delegators: ["delegator1.near", "delegator2.near"]
```

### Q: Can delegator steal identities?

**A:** Delegator never sees user's private key (nsec). Only sees account_id and npub.

**User keeps:** nsec (Nostr private key)
**Delegator sees:** account_id + npub (public info)

### Q: Can delegator fake registrations?

**A:** No. Delegator must provide valid NEP-413 signature from user.

```typescript
// Contract verifies signature
if !verify_signature(registration.nep413_signature) {
    panic!("Invalid signature")
}
```

### Q: What if delegator database is leaked?

**A:** Privacy compromised for registered users.

**Fix:** Use ZK proofs so delegator doesn't know account_id either.

---

## 🎯 Summary

### What Delegator Does

1. ✅ Verifies user's signature (off-chain)
2. ✅ Generates commitment hash (off-chain)
3. ✅ Calls smart contract (on-chain)
4. ✅ Stores mapping in database (off-chain)

### What Delegator Doesn't Do

- ❌ Doesn't see user's private key
- ❌ Doesn't store account on blockchain
- ❌ Doesn't compromise privacy (if implemented correctly)

### Why Delegator is Needed

- ✅ Privacy: Account not on blockchain
- ✅ Verification: Proves ownership cryptographically
- ✅ Gas: Delegator pays, user doesn't
- ✅ UX: User just signs message, delegator handles rest

### Security Model

**Trust assumptions:**
- ✅ Cryptography (NEP-413, Ed25519)
- ✅ Smart contract (enforced on blockchain)
- ⚠️ Delegator (trusted with account info)

**Privacy guarantees:**
- ✅ On-chain: Perfect (no account stored)
- ⚠️ Off-chain: Depends on delegator security

---

## 🚀 Next Steps

1. ✅ **Understand delegator** - Done!
2. ⏳ **Deploy contract** - 5 min
3. ⏳ **Deploy delegator service** - 10 min
4. ⏳ **Test with real wallet** - 5 min
5. ⏳ **Monitor and secure** - Ongoing

---

**Bottom line:** The delegator is the critical component that enables privacy by verifying users off-chain and only storing hashes on-chain. Without it, privacy would be impossible!

---

*Questions? Ask away!*
