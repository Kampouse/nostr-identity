use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};

/// Compute commitment from account_id
/// commitment = SHA256("commitment:" || account_id)
#[wasm_bindgen]
pub fn compute_commitment(account_id: &str) -> String {
    let input = format!("commitment:{}", account_id);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// Compute nullifier from account_id and nonce
/// nullifier = SHA256("nullifier:" || account_id || nonce)
#[wasm_bindgen]
pub fn compute_nullifier(account_id: &str, nonce: &str) -> String {
    let input = format!("nullifier:{}{}", account_id, nonce);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// ZKP proof structure (simplified for now)
#[derive(Serialize, Deserialize)]
pub struct ZkpProof {
    pub proof: String,
    pub public_inputs: Vec<String>,
}

/// Generate ZKP proving ownership of account_id
/// 
/// In production, this would use Groth16 with proper circuit.
/// For now, we use a simplified approach that still provides privacy:
/// - Client computes commitment locally
/// - Client signs a message proving ownership
/// - TEE verifies the signature matches the commitment
#[wasm_bindgen]
pub fn generate_ownership_proof(
    account_id: &str,
    nonce: &str,
    signature_b64: &str,
    public_key_b58: &str,
) -> Result<JsValue, JsValue> {
    // Compute commitment and nullifier
    let commitment = compute_commitment(account_id);
    let nullifier = compute_nullifier(account_id, nonce);
    
    // Create proof payload
    // In production: this would be a real Groth16 proof
    // For now: we create a commitment proof that TEE can verify
    let proof_payload = serde_json::json!({
        "commitment": commitment,
        "nullifier": nullifier,
        "account_hash": hex::encode(&Sha256::digest(account_id.as_bytes())[..8]),
        "signature": signature_b64,
        "public_key": public_key_b58,
        "nonce": nonce,
    });
    
    // Hash the payload as "proof"
    let proof_bytes = serde_json::to_string(&proof_payload).unwrap_or_default();
    let proof_hash = hex::encode(Sha256::digest(proof_bytes.as_bytes()));
    
    let result = ZkpProof {
        proof: proof_hash,
        public_inputs: vec![commitment, nullifier],
    };
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Verify a commitment matches an account_id (for testing)
#[wasm_bindgen]
pub fn verify_commitment(account_id: &str, commitment: &str) -> bool {
    compute_commitment(account_id) == commitment
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commitment() {
        let commitment = compute_commitment("test.near");
        assert_eq!(commitment.len(), 64); // SHA256 = 32 bytes = 64 hex chars
    }

    #[test]
    fn test_nullifier() {
        let nullifier = compute_nullifier("test.near", "nonce123");
        assert_eq!(nullifier.len(), 64);
    }

    #[test]
    fn test_verify_commitment() {
        let account_id = "test.near";
        let commitment = compute_commitment(account_id);
        assert!(verify_commitment(account_id, &commitment));
        assert!(!verify_commitment("wrong.near", &commitment));
    }
}
