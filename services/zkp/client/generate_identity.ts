import { generatePrivateKey, getPublicKey } from "@noble/secp256k1"
import { poseidon } from "circomlibjs"
import { groth16 } from "snarkjs"
import { randomBytes } from "crypto"
import { bech32 } from "@scure/base"
import * as fs from "fs"

export class NostrIdentityZKP {
  private zkpProvingKey: any
  private wasmBuffer: Buffer

  constructor(provingKeyPath: string, wasmPath: string) {
    this.zkpProvingKey = JSON.parse(fs.readFileSync(provingKeyPath, "utf-8"))
    this.wasmBuffer = fs.readFileSync(wasmPath)
  }

  // Generate random Nostr keypair locally
  async generateNostrKeypair(): Promise<{ nsec: string; npub: string }> {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey, true) // compressed

    const nsecHex = Buffer.from(privateKey).toString("hex")
    const npubHex = Buffer.from(publicKey).toString("hex")

    const nsecBech32 = bech32.encode("nsec", bech32.toWords(privateKey))
    const npubBech32 = bech32.encode("npub", bech32.toWords(publicKey))

    return {
      nsec: nsecBech32,
      npub: npubBech32,
      nsecHex,
      npubHex,
    }
  }

  // Create ZKP proof of NEAR account ownership
  async proveOwnership(
    accountId: string,
    signature: string,
    publicKey: string,
    balance: string
  ): Promise<{
    proof: any
    nullifier: string
    publicSignals: any
  }> {
    // 1. Parse inputs
    const accountHash = await this.hashAccountId(accountId)
    const sigR = signature.slice(0, 64)
    const sigS = signature.slice(64, 128)
    const pubKeyX = publicKey.slice(0, 64)
    const pubKeyY = publicKey.slice(64, 128)

    // 2. Prepare circuit inputs
    const input = {
      account_id: accountHash,
      signature_r: sigR,
      signature_s: sigS,
      public_key_ax: pubKeyX,
      public_key_ay: pubKeyY,
      balance: balance,
    }

    // 3. Generate ZKP proof (takes ~5-10 seconds)
    console.log("Generating ZKP proof (this takes 5-10 seconds)...")
    const { proof, publicSignals } = await groth16.fullProve(
      input,
      this.wasmBuffer,
      this.zkpProvingKey
    )

    // 4. Generate nullifier (prevents double registration)
    const nullifier = await this.generateNullifier(accountId)

    return {
      proof,
      nullifier,
      publicSignals,
    }
  }

  // Hash account ID for privacy
  private async hashAccountId(accountId: string): Promise<string> {
    const hash = await poseidon([BigInt("0x" + Buffer.from(accountId).toString("hex"))])
    return hash.toString()
  }

  // Generate nullifier (unique per account, but doesn't reveal account)
  private async generateNullifier(accountId: string): Promise<string> {
    const hash = await poseidon([
      BigInt("0x" + Buffer.from(accountId).toString("hex")),
      BigInt(1), // salt
    ])
    return hash.toString()
  }

  // Create registration payload
  async createRegistrationPayload(
    accountId: string,
    nearSignature: string,
    nearPublicKey: string,
    nearBalance: string
  ): Promise<{
    zkp_proof: any
    nullifier: string
    npub: string
    signature: string
  }> {
    // 1. Generate Nostr keypair
    const { nsec, npub, nsecHex, npubHex } = await this.generateNostrKeypair()
    console.log("✅ Generated Nostr keypair")
    console.log("npub:", npub)
    console.log("nsec:", nsec, "(SAVE THIS!)")

    // 2. Generate ZKP proof
    const { proof, nullifier } = await this.proveOwnership(
      accountId,
      nearSignature,
      nearPublicKey,
      nearBalance
    )
    console.log("✅ Generated ZKP proof")

    // 3. Sign npub with nsec (proves we own the npub)
    const npubSignature = await this.signWithNsec(npubHex, nsecHex)

    // 4. Return registration payload
    return {
      zkp_proof: proof,
      nullifier,
      npub: npubHex,
      signature: npubSignature,
    }
  }

  // Sign message with Nostr private key
  private async signWithNsec(message: string, nsecHex: string): Promise<string> {
    // In production, use proper Nostr signing (nip-07 or noble/secp256k1)
    // For now, placeholder
    return "signature_placeholder"
  }
}

// Example usage
async function main() {
  const zkp = new NostrIdentityZKP(
    "./circuit/proving_key.json",
    "./circuit/near_ownership.wasm"
  )

  const payload = await zkp.createRegistrationPayload(
    "alice.near",
    "ed25519:7f2c...",
    "ed25519:3a7b...",
    "1000000000000000000000000" // 1 NEAR in yocto
  )

  console.log("\nRegistration payload:")
  console.log(JSON.stringify(payload, null, 2))
}

main().catch(console.error)
