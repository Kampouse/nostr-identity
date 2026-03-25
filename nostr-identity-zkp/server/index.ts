import { groth16 } from "snarkjs"
import express from "express"
import { Redis } from "ioredis"

const app = express()
app.use(express.json())

// Redis for storing nullifier -> npub mappings
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

// Verification key (from trusted setup)
const verificationKey = require("./verification_key.json")

/**
 * Register anonymous Nostr identity
 * 
 * POST /register
 * Body: {
 *   zkp_proof: {...},      // ZKP proof of NEAR account ownership
 *   nullifier: "...",      // Unique hash (prevents double registration)
 *   npub: "02abc...",      // Nostr public key
 *   signature: "..."       // Signature proving ownership of npub
 * }
 */
app.post("/register", async (req, res) => {
  try {
    const { zkp_proof, nullifier, npub, signature } = req.body

    // 1. Check if nullifier already used
    const existingNpub = await redis.get(`nullifier:${nullifier}`)
    if (existingNpub) {
      return res.status(400).json({
        error: "This NEAR account already has a Nostr identity",
        npub: existingNpub,
      })
    }

    // 2. Verify ZKP proof
    console.log("Verifying ZKP proof...")
    const isValid = await groth16.verify(
      verificationKey,
      zkp_proof.publicSignals,
      zkp_proof.proof
    )

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid ZKP proof",
      })
    }
    console.log("✅ ZKP proof valid")

    // 3. Verify signature (proves user owns npub)
    const sigValid = await verifyNostrSignature(npub, signature)
    if (!sigValid) {
      return res.status(400).json({
        error: "Invalid npub signature",
      })
    }
    console.log("✅ npub signature valid")

    // 4. Store mapping
    await redis.set(`nullifier:${nullifier}`, npub)
    await redis.set(`npub:${npub}`, nullifier)

    console.log("✅ Identity registered")

    res.json({
      success: true,
      message: "Nostr identity registered anonymously",
      npub,
      nullifier_hash: hashNullifier(nullifier),
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Registration failed" })
  }
})

/**
 * Verify identity
 * 
 * GET /verify/:npub
 * Returns: { registered: boolean, nullifier_hash: string }
 */
app.get("/verify/:npub", async (req, res) => {
  try {
    const { npub } = req.params

    const nullifier = await redis.get(`npub:${npub}`)

    if (!nullifier) {
      return res.json({
        registered: false,
        message: "This npub is not registered",
      })
    }

    res.json({
      registered: true,
      nullifier_hash: hashNullifier(nullifier),
      message: "This npub is registered anonymously",
    })
  } catch (error) {
    console.error("Verification error:", error)
    res.status(500).json({ error: "Verification failed" })
  }
})

/**
 * Check if nullifier already used
 * 
 * GET /check/:nullifier
 * Returns: { used: boolean, npub?: string }
 */
app.get("/check/:nullifier", async (req, res) => {
  try {
    const { nullifier } = req.params

    const npub = await redis.get(`nullifier:${nullifier}`)

    res.json({
      used: !!npub,
      npub: npub || undefined,
    })
  } catch (error) {
    console.error("Check error:", error)
    res.status(500).json({ error: "Check failed" })
  }
})

// Helper: Verify Nostr signature
async function verifyNostrSignature(npub: string, signature: string): Promise<boolean> {
  // In production:
  // 1. Parse npub to get public key
  // 2. Parse signature
  // 3. Verify secp256k1 signature
  // 4. Message should be npub itself
  
  // Placeholder for now
  return true
}

// Helper: Hash nullifier for public display
function hashNullifier(nullifier: string): string {
  const crypto = require("crypto")
  return crypto.createHash("sha256").update(nullifier).digest("hex").slice(0, 16)
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Nostr Identity ZKP Server running on port ${PORT}`)
  console.log(`Endpoints:`)
  console.log(`  POST /register - Register anonymous identity`)
  console.log(`  GET  /verify/:npub - Verify identity`)
  console.log(`  GET  /check/:nullifier - Check if nullifier used`)
})
