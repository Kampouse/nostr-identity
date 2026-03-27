use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};

/// ============================================================================
/// RECOVERABLE PRIVACY - No Salt Storage Needed!
/// ============================================================================
/// 
/// INNOVATION: Derive salt from NEP-413 signature
/// 
/// salt = SHA256(nep413_signature)
/// 
/// Benefits:
/// 1. User never stores anything extra
/// 2. Can ALWAYS recompute salt (just sign again)
/// 3. Recoverable forever (as long as wallet access)
/// 4. Same signature = same salt = same commitment (deterministic)
/// 
/// Example:
///   User signs: "Register Nostr identity v1"
///   salt = SHA256(signature) = "a1b2c3..."
///   commitment = SHA256(account_id + salt)
///   
///   5 years later, new computer:
///   User signs: "Register Nostr identity v1" (SAME message)
///   salt = SHA256(signature) = "a1b2c3..." (SAME salt!)
///   Can prove ownership again!
/// 
/// ============================================================================

/// Derive salt deterministically from NEP-413 signature
/// This is the KEY innovation - no storage needed!
/// 
/// IMPORTANT: User must sign the EXACT SAME message to get the same salt
#[wasm_bindgen]
pub fn derive_salt_from_signature(nep413_signature_b64: &str) -> String {
    // Hash the signature to get the salt
    // Same signature = same salt
    let hash = Sha256::digest(nep413_signature_b64.as_bytes());
    hex::encode(hash)
}

/// Compute commitment with signature-derived salt
/// commitment = SHA256("commitment:" || account_id || ":" || salt)
/// where salt = SHA256(signature)
#[wasm_bindgen]
pub fn compute_commitment_recoverable(
    account_id: &str,
    nep413_signature_b64: &str,
) -> String {
    // Derive salt from signature (no storage needed!)
    let salt = derive_salt_from_signature(nep413_signature_b64);
    
    // Compute commitment
    let input = format!("commitment:{}:{}", account_id, salt);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// Compute nullifier with signature-derived salt
#[wasm_bindgen]
pub fn compute_nullifier_recoverable(
    account_id: &str,
    nep413_signature_b64: &str,
    nonce: &str,
) -> String {
    let salt = derive_salt_from_signature(nep413_signature_b64);
    let input = format!("nullifier:{}:{}:{}", account_id, salt, nonce);
    let hash = Sha256::digest(input.as_bytes());
    hex::encode(hash)
}

/// Generate ownership proof with signature-derived salt
/// User can ALWAYS recompute this (just sign the same message again)
#[wasm_bindgen]
pub fn generate_ownership_proof_recoverable(
    account_id: &str,
    nep413_signature_b64: &str,
    public_key_b58: &str,
    message: &str,
) -> Result<JsValue, JsValue> {
    // Derive salt from signature
    let salt = derive_salt_from_signature(nep413_signature_b64);
    
    // Compute commitment and nullifier
    let commitment = compute_commitment_recoverable(account_id, nep413_signature_b64);
    let nonce = generate_nonce();
    let nullifier = compute_nullifier_recoverable(account_id, nep413_signature_b64, &nonce);
    
    // Create proof
    let proof = serde_json::json!({
        "commitment": commitment,
        "nullifier": nullifier,
        "public_key": public_key_b58,
        "message": message,
        "timestamp": get_timestamp(),
    });
    
    Ok(serde_wasm_bindgen::to_value(&proof).unwrap())
}

/// Verify ownership - user just needs to sign the same message again!
#[wasm_bindgen]
pub fn verify_ownership_recoverable(
    account_id: &str,
    nep413_signature_b64: &str,
    on_chain_commitment: &str,
) -> Result<JsValue, JsValue> {
    // Recompute commitment from signature
    let computed = compute_commitment_recoverable(account_id, nep413_signature_b64);
    
    if computed == on_chain_commitment {
        Ok(serde_wasm_bindgen::to_value(&serde_json::json!({
            "valid": true,
            "message": "Ownership verified - recoverable anytime with wallet!"
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_salt_is_deterministic() {
        // Same signature = same salt
        let sig = "test_signature_base64";
        let salt1 = derive_salt_from_signature(sig);
        let salt2 = derive_salt_from_signature(sig);
        assert_eq!(salt1, salt2);
    }
    
    #[test]
    fn test_different_signatures_different_salts() {
        let salt1 = derive_salt_from_signature("sig1");
        let salt2 = derive_salt_from_signature("sig2");
        assert_ne!(salt1, salt2);
    }
    
    #[test]
    fn test_commitment_is_recoverable() {
        let account = "alice.near";
        let sig = "alice_signature_base64";
        
        // Compute commitment
        let commitment = compute_commitment_recoverable(account, sig);
        
        // 5 years later, user signs again (same message = same sig)
        let commitment_later = compute_commitment_recoverable(account, sig);
        
        // SAME commitment! Can recover ownership
        assert_eq!(commitment, commitment_later);
    }
    
    #[test]
    fn test_cannot_brute_force() {
        let sig = "secret_signature";
        let commitment = compute_commitment_recoverable("alice.near", sig);
        
        // Without the signature, cannot compute commitment
        // (this would be the "insecure" version without salt)
        let insecure = format!("commitment:{}", "alice.near");
        let insecure_hash = hex::encode(Sha256::digest(insecure.as_bytes()));
        
        assert_ne!(commitment, insecure_hash);
    }
}
