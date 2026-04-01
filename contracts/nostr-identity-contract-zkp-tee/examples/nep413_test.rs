// Test NEP-413 verification against real wallet behavior
// This simulates what a NEAR wallet does when signMessage is called

use borsh::BorshSerialize;
use ed25519_dalek::{SigningKey, Signer, VerifyingKey};
use sha2::{Sha256, Digest};

/// NEP-413 payload structure as defined in the spec
/// Wallet borsh-serializes this and signs the SHA256 hash
#[derive(BorshSerialize)]
struct Nep413Payload<'a> {
    tag: &'a str,       // "nep413"
    message: &'a str,
    nonce: &'a [u8],    // 32 raw bytes
    recipient: &'a str,
    callback_url: Option<&'a str>,
}

fn main() {
    // Simulate wallet signing
    let secret_bytes: [u8; 32] = [0x42; 32];
    let signing_key = SigningKey::from_bytes(&secret_bytes);
    let verifying_key = signing_key.verifying_key();
    
    let account_id = "test-user.testnet";
    let message = "Generate Nostr identity for test-user.testnet";
    let nonce_bytes: [u8; 32] = [0xab; 32]; // raw 32 bytes
    let recipient = "nostr-identity.near";
    
    // 1. Wallet creates the NEP-413 payload and borsh-serializes it
    let payload = Nep413Payload {
        tag: "nep413",
        message,
        nonce: &nonce_bytes,
        recipient,
        callback_url: None,
    };
    
    let borsh_bytes = borsh::to_vec(&payload).unwrap();
    println!("Borsh payload ({} bytes): {:02x?}", borsh_bytes.len(), &borsh_bytes[..20.min(borsh_bytes.len())]);
    
    // 2. Wallet hashes with SHA256
    let hash = Sha256::digest(&borsh_bytes);
    println!("SHA256 hash: {:02x?}", hash);
    
    // 3. Wallet signs the hash
    let signature = signing_key.sign(&hash);
    println!("Signature: {:02x?}", signature.to_bytes()[..10].to_vec());
    
    // 4. Encode signature as base64 (what wallet returns)
    let sig_b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, signature.to_bytes());
    println!("Signature base64: {}...", &sig_b64[..20]);
    
    // 5. Encode public key with ed25519: prefix (bs58)
    let pk_b58 = format!("ed25519:{}", bs58::encode(verifying_key.as_bytes()).into_string());
    let sig_b58 = format!("ed25519:{}", bs58::encode(signature.to_bytes()).into_string());
    println!("Public key: {}", pk_b58);
    
    // === Test current TEE approach (JSON) ===
    println!("\n--- Current TEE (JSON hash) ---");
    let json_message = serde_json::to_string(&serde_json::json!({
        "message": message,
        "nonce": base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &nonce_bytes),
        "recipient": recipient
    })).unwrap();
    println!("JSON message: {}", json_message);
    let json_hash = Sha256::digest(json_message.as_bytes());
    println!("JSON hash:    {:02x?}", json_hash);
    println!("Borsh hash:   {:02x?}", hash);
    println!("Hashes match: {}", json_hash == hash);
    
    // Verify with JSON hash (will fail)
    let json_result = verifying_key.verify_strict(&json_hash, &signature);
    println!("JSON verify:  {:?}", json_result.is_ok());
    
    // === Test correct approach (Borsh) ===
    println!("\n--- Correct (Borsh hash) ---");
    let borsh_result = verifying_key.verify_strict(&hash, &signature);
    println!("Borsh verify: {:?}", borsh_result.is_ok());
    
    // === Test signature decoding ===
    println!("\n--- Signature decoding ---");
    // Base64 decode
    let sig_from_b64 = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &sig_b64).unwrap();
    println!("Base64 decode: {} bytes, correct: {}", sig_from_b64.len(), sig_from_b64 == signature.to_bytes());
    
    // Base58 decode  
    let sig_from_b58 = bs58::decode(&sig_b58["ed25519:".len()..]).into_vec().unwrap();
    println!("Base58 decode: {} bytes, correct: {}", sig_from_b58.len(), sig_from_b58 == signature.to_bytes());
    
    println!("\n=== CONCLUSION ===");
    println!("Current TEE (JSON + base58): WILL FAIL");
    println!("Correct (Borsh + base64):    WILL PASS");
}
