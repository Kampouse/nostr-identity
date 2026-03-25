# Nostr Identity - ZKP Implementation

**Privacy-preserving Nostr identity generation using Zero-Knowledge Proofs**

## Quick Start

### Prerequisites
- Node.js 18+
- Circom (ZKP compiler)
- SnarkJS
- Redis

### Setup

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install
cd ../circuit && ./setup.sh

# Generate identity
cd ../client
npm run generate
```

### Configuration

1. Set up NEAR wallet connection
2. Configure Redis for nullifier storage
3. Run the setup script for circuit compilation

---

## Architecture

See [COMPARISON.md](./COMPARISON.md) for detailed analysis.

---

## Security Guarantees

✅ **Forgery-Proof**: Only NEAR account holders can generate
✅ **Anonymous**: Server never sees account_id
✅ **Privacy-Preserving**: ZKP reveals nothing
✅ **No Trust Required**: Cryptographic guarantees only

---

## Limitations

⚠️ **No Recovery**: Key lost = identity lost
⚠️ **Slow UX**: 5-10 seconds for proof generation
⚠️ **Complex Setup**: Requires circuit compilation

---

## Use Cases

### When to Use ZKP Version
- Privacy is critical (anonymous registration)
- Don't trust ANY server
- Regulatory compliance (no data collection)

### When to Use TEE Version Instead
- Want fast UX
- Trust OutLayer infrastructure
- Need recovery feature
- Simpler implementation preferred

---

## License
MIT

---

## References
- [Circom](https://github.com/iden3/circom)
- [SnarkJS](https://github.com/iden3/snarkjs)
- [Circomlib](https://github.com/iden3/circomlib)
- [NEP-413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)
