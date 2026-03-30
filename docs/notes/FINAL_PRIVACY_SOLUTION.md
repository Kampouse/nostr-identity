# TRUE PRIVACY - FINAL ARCHITECTURE

## The Breakthrough: Use nsec as Salt

**Jean's insight:** Use the Nostr private key (nsec) as the salt!

This solves all problems:
- ✅ Already part of the system
- ✅ Already kept secret
- ✅ Already stored by user
- ✅ 256-bit entropy (impossible to brute-force)
- ✅ No additional secrets to manage

## Architecture

```
User generates Nostr keypair:
  nsec = 32 random bytes (256-bit entropy)
  npub = derive_public_key(nsec)

Compute commitment with nsec as salt:
  commitment = SHA256(account_id || nsec)
  commitment_hash = SHA256(commitment)

On-chain (public):
  - commitment_hash: SHA256(SHA256(account_id || nsec))
  - proof: Groth16 ZKP
  - npub: Nostr public key

Private (user's browser):
  - account_id: "alice.near"
  - nsec: Nostr private key (already stored!)
```

## Why This is Secure

**Attacker sees:**
- `commitment_hash`: SHA256(SHA256(account_id || nsec))
- `proof`: Zero-knowledge proof
- `npub`: Nostr public key

**Attacker tries to brute-force:**
```javascript
for (const account of all_near_accounts) {  // ~millions
    for (let i = 0; i < 2^256; i++) {       // nsec space
        const nsec = i_to_32_bytes(i);
        if (SHA256(SHA256(account + nsec)) == commitment_hash) {
            // FOUND!
        }
    }
}
```

**Time to break:** `millions * 2^256` = **IMPOSSIBLE**

Even with all computers in the universe working together: **IMPOSSIBLE**

## Why Double Hash?

```
commitment = SHA256(account_id || nsec)
commitment_hash = SHA256(commitment)
```

**Without double hash:**
- Attacker sees: `commitment`
- Could try to find collisions (theoretically)

**With double hash:**
- Attacker sees: `commitment_hash`
- Must find: `commitment` AND `account_id || nsec`
- Double the work, double the security

## Privacy Guarantee

| Data | Who Knows | Can Derive Account? |
|------|-----------|-------------------|
| commitment_hash | Everyone (on-chain) | ❌ NO (need nsec) |
| proof | Everyone (on-chain) | ❌ NO (zero-knowledge) |
| npub | Everyone (on-chain) | ❌ NO (not linked) |
| account_id | User only | ✅ YES |
| nsec | User only | ✅ YES |

**Mathematical guarantee:**
- Without nsec: CANNOT compute commitment
- Without commitment: CANNOT verify against commitment_hash
- Brute-forcing nsec: 2^256 attempts = IMPOSSIBLE

## Comparison with All Approaches

| Approach | Brute-Forceable? | Storage Needed | Recoverable? |
|----------|-----------------|----------------|--------------|
| Plain SHA256 | ❌ YES (seconds) | None | N/A |
| Random salt | ❌ YES (if salt leaked) | Salt | ❌ NO |
| Signature-derived | ❌ YES (if sig shared) | None | ✅ YES |
| **nsec as salt** | **✅ NO (impossible)** | **nsec (already stored)** | **✅ YES** |

## Usage

```javascript
// Generate Nostr keypair (standard Nostr)
const nsec = generateNostrPrivateKey(); // 32 random bytes
const npub = derivePublicKey(nsec);

// Generate proof with nsec as salt
const proof = zkp.generate_ownership_proof_with_nsec(
    "alice.near",      // account_id
    nsec.toString('hex'), // nsec (32 bytes hex)
    zkp.generate_nonce()
);

// On-chain:
// {
//   commitment_hash: "abc123...",  // SHA256(SHA256(account_id || nsec))
//   proof: "...",                  // Groth16 ZKP
//   npub: "npub1..."               // Nostr public key
// }

// Verify (anyone can verify)
const valid = zkp.verify_ownership_proof(
    proof.proof,
    proof.commitment_hash
);
```

## The Beautiful Part

**User already knows:**
- "I must backup my nsec"
- "If I lose my nsec, I lose my Nostr identity"
- This is standard Nostr education

**No new concepts:**
- No "additional secret"
- No "recovery phrase"
- nsec IS the secret

**If user loses nsec:**
- They lose their Nostr identity
- They lose access to their commitment proof
- They would need to generate new Nostr identity
- This is consistent with Nostr philosophy

## Implementation Status

- ✅ `generate_ownership_proof_with_nsec()` added
- ✅ Double-hash commitment
- ✅ 256-bit entropy salt (nsec)
- ✅ Zero-knowledge proofs
- ⏳ Needs rebuild and testing

## The Answer

**"Can malicious actor know who owns what?"**

**NO.** 

To deanonymize, attacker would need:
1. List of all NEAR accounts (easy)
2. The nsec (2^256 possibilities)

**Time to brute-force:** Longer than age of universe

**This is THE solution.**

## Next Steps

1. Rebuild WASM with new function
2. Test with real nsec
3. Update documentation
4. Deploy to OutLayer

---

*Created: March 27, 2026*
*Breakthrough: Jean (Jemartel.near)*
*Concept: Use nsec as salt for unbrute-forceable commitments*
