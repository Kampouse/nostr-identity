# nostr-identity Deployment Checklist

**Complete verification guide for deployment**

---

## 🎯 What We're Deploying

**Recommended:** OutLayer TEE version (best privacy, free, fast)

---

## 📋 Pre-Deployment Verification

### 1. ✅ Verify WASM Binary

```bash
cd /Users/asil/.openclaw/workspace/nostr-identity/nostr-identity-contract

# Check WASM exists
ls -lh target/wasm32-wasip2/release/nostr-identity-tee.wasm

# Expected output:
# -rw-r--r--  1 user  staff   311K Mar 25 14:20 nostr-identity-tee.wasm
```

**Verify:**
- [ ] File exists
- [ ] Size is ~311K
- [ ] Built for wasm32-wasip2 target

### 2. ✅ Verify Tests Pass

```bash
# Run tests
cargo test

# Expected output:
# test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**Verify:**
- [ ] All tests passing (3/3)
- [ ] No errors
- [ ] No warnings

### 3. ✅ Verify Build is Clean

```bash
# Check for warnings
cargo build --target wasm32-wasip2 --release 2>&1 | grep -i warning

# Expected output: (empty - no warnings)
```

**Verify:**
- [ ] No warnings
- [ ] Clean build

---

## 🚀 Deployment Steps

### Step 1: Install OutLayer CLI

```bash
# Check if installed
outlayer --version

# If not installed:
npm install -g @outlayer/cli
# or
cargo install outlayer-cli
```

**Verify:**
- [ ] OutLayer CLI installed
- [ ] Version shows correctly

### Step 2: Login to OutLayer

```bash
# Login with NEAR wallet
outlayer login

# Expected: Opens browser for wallet connection
# Select: alice.near (or your account)
```

**Verify:**
- [ ] Login successful
- [ ] Correct account connected

### Step 3: Deploy WASM to OutLayer

```bash
cd /Users/asil/.openclaw/workspace/nostr-identity/nostr-identity-contract

# Deploy
outlayer deploy --name nostr-identity \
  target/wasm32-wasip2/release/nostr-identity-tee.wasm

# Expected output:
# ✓ Deployed to: https://p.outlayer.fastnear.com/<id>/execute
# ✓ Transaction: <tx-hash>
```

**What to note:**
- [ ] Deployment URL (save this!)
- [ ] Transaction hash
- [ ] Deployment ID

**Example output:**
```
✓ Deployed successfully!
URL: https://p.outlayer.fastnear.com/abc123xyz/execute
ID: nostr-identity-abc123xyz
```

### Step 4: Test Deployed TEE

```bash
# Test with stats endpoint
curl -X POST https://p.outlayer.fastnear.com/<id>/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"stats"}'

# Expected response:
# {"success":true,"created_at":0}
```

**Verify:**
- [ ] Returns success
- [ ] No errors
- [ ] TEE is running

### Step 5: Update Frontend Configuration

```bash
cd /Users/asil/.openclaw/workspace/nostr-identity

# Create/update .env.local
cat > .env.local << EOF
NEXT_PUBLIC_TEE_URL=https://p.outlayer.fastnear.com/<id>/execute
EOF

# Verify
cat .env.local
```

**Verify:**
- [ ] .env.local created
- [ ] URL is correct
- [ ] No extra spaces/characters

### Step 6: Test Frontend Locally

```bash
# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Expected:
# ▲ Next.js 14.2.3
# - Local:        http://localhost:3000
# ✓ Ready in 2.3s
```

**Verify:**
- [ ] Server starts
- [ ] No errors
- [ ] Opens at localhost:3000

### Step 7: Test Wallet Connection

**In browser (http://localhost:3000):**

1. Click "Connect Wallet"
2. Select MyNEAR or Meteor wallet
3. Approve connection
4. Verify account shows (e.g., "alice.near")

**Verify:**
- [ ] Wallet connects
- [ ] Account ID shows
- [ ] No errors in console

### Step 8: Test Identity Generation

**In browser:**

1. Click "Generate Identity"
2. Sign the message in wallet
3. Wait for response
4. Verify:
   - npub shown (starts with "npub1...")
   - nsec shown (starts with "nsec1...")
   - Success message

**Verify:**
- [ ] Message signed successfully
- [ ] npub generated
- [ ] nsec generated
- [ ] No errors

### Step 9: Verify On-Chain (Optional)

```bash
# Check if identity was created
curl -X POST https://p.outlayer.fastnear.com/<id>/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"stats"}'

# Expected: created_at should show timestamp
# {"success":true,"created_at":1712345678}
```

**Verify:**
- [ ] Stats show updated timestamp
- [ ] Identity count increased

### Step 10: Deploy Frontend (Production)

```bash
# Build for production
npm run build

# Expected:
# ✓ Compiled successfully
# Size: 105 kB First Load JS

# Deploy to Vercel
vercel --prod

# Expected:
# ✓ Deployed to production
# URL: https://nostr-identity.vercel.app
```

**Verify:**
- [ ] Build successful
- [ ] Deployed to Vercel
- [ ] URL accessible
- [ ] Works in production

---

## 📦 What You Need

### Files Required

```
nostr-identity/
├── nostr-identity-contract/
│   └── target/wasm32-wasip2/release/
│       └── nostr-identity-tee.wasm  ← 311K (REQUIRED)
│
├── app/
│   └── page.tsx  ← Frontend code (REQUIRED)
│
├── package.json  ← Dependencies (REQUIRED)
│
└── .env.local  ← Configuration (CREATE THIS)
```

### Tools Required

```
✅ Node.js 18+ (for frontend)
✅ Rust + cargo (for WASM build)
✅ OutLayer CLI (for deployment)
✅ NEAR wallet (MyNEAR or Meteor)
✅ Vercel CLI (optional, for frontend)
```

### Accounts Required

```
✅ NEAR account (e.g., alice.near)
✅ OutLayer account (auto-created on login)
✅ Vercel account (optional, for frontend)
```

---

## ✅ Verification Checklist

### Pre-Deployment

- [ ] WASM file exists (311K)
- [ ] Tests pass (3/3)
- [ ] No build warnings
- [ ] OutLayer CLI installed
- [ ] Logged into OutLayer

### Deployment

- [ ] WASM deployed to OutLayer
- [ ] Deployment URL saved
- [ ] TEE responds to stats query
- [ ] .env.local created with correct URL

### Frontend

- [ ] npm install successful
- [ ] Dev server starts
- [ ] Wallet connects
- [ ] Identity generation works
- [ ] No console errors

### Production

- [ ] Build successful
- [ ] Deployed to Vercel
- [ ] Production URL works
- [ ] All features working

---

## 🔍 Troubleshooting

### WASM Not Found

```bash
# Build it
cd nostr-identity-contract
cargo build --target wasm32-wasip2 --release
```

### OutLayer Login Fails

```bash
# Try with specific network
outlayer login --network mainnet
```

### Frontend Won't Start

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Wallet Won't Connect

- Check wallet extension installed
- Try different wallet (MyNEAR vs Meteor)
- Check browser console for errors

### Identity Generation Fails

- Check TEE URL in .env.local
- Verify TEE is running (stats endpoint)
- Check wallet has NEAR for gas (minimal)

---

## 📊 Expected Results

### After Deployment

```
TEE URL: https://p.outlayer.fastnear.com/<id>/execute
Frontend: https://nostr-identity.vercel.app

User flow:
1. Connect wallet → Shows account
2. Generate identity → Shows npub + nsec
3. Copy nsec → Import to Nostr client
4. Post on Nostr → Shows as npub identity
```

### What's Created

```
On TEE (in memory):
  - commitment → npub mapping
  - Identity metadata

On Blockchain:
  - Nothing! (Perfect privacy)

In User's Wallet:
  - nsec (Nostr private key)
  - npub (Nostr public key)
```

---

## 🚀 Quick Deploy (30 minutes)

```bash
# 1. Verify WASM (1 min)
ls -lh nostr-identity-contract/target/wasm32-wasip2/release/nostr-identity-tee.wasm

# 2. Deploy to OutLayer (5 min)
outlayer deploy --name nostr-identity \
  nostr-identity-contract/target/wasm32-wasip2/release/nostr-identity-tee.wasm

# 3. Update .env.local (1 min)
echo "NEXT_PUBLIC_TEE_URL=<url>" > .env.local

# 4. Test locally (5 min)
npm run dev

# 5. Deploy frontend (3 min)
vercel --prod

# Done! 🎉
```

---

## 📝 Notes

- **TEE URL:** Save this securely, it's your API endpoint
- **nsec:** Users must save this! Can't be recovered
- **Gas costs:** Zero for users (OutLayer pays)
- **Privacy:** Perfect (account not on blockchain)

---

**Ready to deploy? Follow the checklist step by step!**
