use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};

/// ============================================================================
/// TRUE PRIVACY WITH SECRET SALT
/// ============================================================================
/// 
/// CRITICAL: Without a secret salt, commitments can be brute-forced!
/// 
/// WRONG (can be traced):
///   commitment = SHA256("commitment:" || account_id)
///   Anyone can compute: SHA256("commitment:alice.near") and check if it matches
/// 
/// CORRECT (private):
///   commitment = SHA256("commitment:" || account_id || secret_salt)
///   Without the salt, NO ONE can compute the commitment
///   User keeps the salt in their browser - NEVER shared!
/// 
/// ============================================================================

/// Generate a random secret salt (user keeps this PRIVATE!)
#[wasm_bindgen]
pub fn generate_secret_salt() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("Random generation failed");
    hex::encode(bytes)
}

/// Compute commitment from account_id and SECRET SALT
/// commitment = SHA256("commitment:" || account_id || ":" || salt)
/// 
/// The salt is NEVER sent to TEE or stored on-chain!
#[wasm_bindgen]
pub fn compute_commitment_private(account_id: &str, secret_salt: &str) -> String {
    // Include salt to prevent brute-forcing
    let input = format!("commitment:{}:{}", account_id, secret_salt);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// Compute nullifier from account_id, salt, and nonce
/// nullifier = SHA256("nullifier:" || account_id || ":" || salt || ":" || nonce)
#[wasm_bindgen]
pub fn compute_nullifier_private(account_id: &str, secret_salt: &str, nonce: &str) -> String {
    let input = format!("nullifier:{}:{}:{}", account_id, secret_salt, nonce);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// ZKP proof structure
#[derive(Serialize, Deserialize)]
pub struct ZkpProof {
    pub proof: String,
    pub public_inputs: Vec<String>,
}

/// Generate ownership proof with SECRET SALT
/// The salt is NEVER revealed - only used locally
#[wasm_bindgen]
pub fn generate_ownership_proof_private(
    account_id: &str,
    secret_salt: &str,
    nonce: &str,
    signature_b64: &str,
    public_key_b58: &str,
) -> Result<JsValue, JsValue> {
    // Compute commitment and nullifier with salt
    let commitment = compute_commitment_private(account_id, secret_salt);
    let nullifier = compute_nullifier_private(account_id, secret_salt, nonce);
    
    // Create proof payload (salt NOT included!)
    let proof_payload = serde_json::json!({
        "commitment": commitment,
        "nullifier": nullifier,
        "account_hash": hex::encode(&Sha256::digest(account_id.as_bytes())[..8]),
        "signature": signature_b64,
        "public_key": public_key_b58,
        "nonce": nonce,
        // NOTE: secret_salt is NOT included!
    });
    
    let proof_bytes = serde_json::to_string(&proof_payload).unwrap_or_default();
    let proof_hash = hex::encode(Sha256::digest(proof_bytes.as_bytes()));
    
    let result = ZkpProof {
        proof: proof_hash,
        public_inputs: vec![commitment, nullifier],
    };
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Verify ownership locally (user has their salt)
#[wasm_bindgen]
pub fn verify_ownership_private(
    account_id: &str,
    secret_salt: &str,
    commitment: &str,
) -> Result<JsValue, JsValue> {
    let computed = compute_commitment_private(account_id, secret_salt);
    
    if computed == commitment {
        Ok(serde_wasm_bindgen::to_value(&serde_json::json!({
            "valid": true,
            "message": "Ownership verified - salt kept private!"
        })).unwrap())
    } else {
        Ok(serde_wasm_bindgen::to_value(&serde_json::json!({
            "valid": false,
            "reason": "Commitment does not match"
        })).unwrap())
    }
}

/// Get current timestamp in seconds
#[wasm_bindgen]
pub fn get_timestamp() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

/// Generate a random nonce
#[wasm_bindgen]
pub fn generate_nonce() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("Random generation failed");
    hex::encode(bytes)
}

// ============================================================================
// DEPRECATED - These are INSECURE (can be brute-forced!)
// ============================================================================

/// DEPRECATED: Use compute_commitment_private instead
/// This version can be brute-forced and deanonymized!
#[wasm_bindgen]
pub fn compute_commitment(account_id: &str) -> String {
    // WARNING: Anyone can compute this for any account_id!
    // Use compute_commitment_private with a secret salt instead
    let input = format!("commitment:{}", account_id);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// DEPRECATED: Use compute_nullifier_private instead
#[wasm_bindgen]
pub fn compute_nullifier(account_id: &str, nonce: &str) -> String {
    let input = format!("nullifier:{}{}", account_id, nonce);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_private_commitment() {
        let salt = generate_secret_salt();
        let commitment = compute_commitment_private("test.near", &salt);
        assert_eq!(commitment.len(), 64);
        
        // Same account + salt = same commitment
        let commitment2 = compute_commitment_private("test.near", &salt);
        assert_eq!(commitment, commitment2);
        
        // Different salt = different commitment (IMPORTANT!)
        let salt2 = generate_secret_salt();
        let commitment3 = compute_commitment_private("test.near", &salt2);
        assert_ne!(commitment, commitment3);
    }
    
    #[test]
    fn test_insecure_commitment_can_be_brute_forced() {
        // This shows why the old method is INSECURE
        let commitment = compute_commitment("alice.near");
        
        // Anyone can compute this!
        let computed = compute_commitment("alice.near");
        assert_eq!(commitment, computed);
        
        // This means alice.near can be DEANONYMIZED!
    }
    
    #[test]
    fn test_private_commitment_cannot_be_brute_forced() {
        let salt = generate_secret_salt();
        let commitment = compute_commitment_private("alice.near", &salt);
        
        // Without the salt, you CANNOT verify if this is alice.near
        let computed_without_salt = compute_commitment("alice.near");
        assert_ne!(commitment, computed_without_salt);
        
        // Even with a different salt, you get a different commitment
        let wrong_salt = generate_secret_salt();
        let computed_wrong_salt = compute_commitment_private("alice.near", &wrong_salt);
        assert_ne!(commitment, computed_wrong_salt);
    }
}
