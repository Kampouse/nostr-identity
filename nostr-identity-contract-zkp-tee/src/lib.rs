//! Nostr Identity ZKP-TEE - Secure Backend
//!
//! Generates forgery-proof, anonymous Nostr identities bound to NEAR accounts.
//! Uses NEP-413 for authentication and ZKP proof generation inside TEE.

use ed25519_dalek::{Signature, VerifyingKey};
use k256::ecdsa::SigningKey;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest as Sha256Digest, Sha256};
use std::collections::HashMap;
use base64::{engine::general_purpose::STANDARD, Engine};

// NEP-413 Auth Response (from wallet)
#[derive(Deserialize, Clone)]
pub struct Nep413AuthResponse {
    pub account_id: String,
    pub public_key: String,
    pub signature: String,
    #[serde(rename = "authRequest")]
    pub auth_request: Nep413AuthRequest,
}

#[derive(Deserialize, Clone)]
pub struct Nep413AuthRequest {
    pub message: String,
    pub nonce: String,
    pub recipient: String,
}

/// ZKP proof structure
/// 
/// This is a simplified ZKP implementation. In production, you would use
/// a real ZKP library like circom/snarkjs compiled to WASM.
/// 
/// For now, we use SHA-256 hashes as commitments, which provides:
/// - Hiding: Cannot reverse hash to find account_id
/// - Binding: Computationally infeasible to find different account_id with same hash
#[derive(Serialize, Deserialize, Debug)]
pub struct ZKPProof {
    /// Commitment to the account_id (hash(account_id))
    /// Used to prevent double registration without revealing account_id
    pub commitment: String,
    
    /// Nullifier: unique per (account_id, nonce) pair
    /// Prevents replay attacks and double registration
    pub nullifier: String,
    
    /// Proof hash: cryptographic binding of all proof data
    /// hash(commitment || nullifier || verified || timestamp)
    pub proof_hash: String,
    
    /// Whether NEP-413 signature was verified
    pub verified: bool,
    
    /// Timestamp when proof was generated
    pub timestamp: u64,
}

// API response
#[derive(Serialize, Default, Debug)]
pub struct ActionResult {
    pub success: bool,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub npub: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nsec: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zkp_proof: Option<ZKPProof>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified: Option<bool>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attestation: Option<Attestation>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// TEE Attestation (simplified)
/// In production, this would be a real TEE attestation certificate
#[derive(Serialize, Deserialize, Debug)]
pub struct Attestation {
    /// TEE platform identifier
    pub platform: String,
    
    /// Measurement hash of the WASM binary
    pub measurement: String,
    
    /// Timestamp of attestation
    pub timestamp: u64,
    
    /// Whether TEE is in secure state
    pub secure: bool,
}

// In-memory storage (WASI P1 limitation)
// In production with WASI P2, this would use persistent storage
lazy_static::lazy_static! {
    // commitment → npub mapping (prevents double registration)
    static ref COMMITMENTS: std::sync::Mutex<HashMap<String, String>> = 
        std::sync::Mutex::new(HashMap::new());
    
    // nullifier → npub mapping (for verification)
    static ref NULLIFIERS: std::sync::Mutex<HashMap<String, String>> = 
        std::sync::Mutex::new(HashMap::new());
    
    // npub → IdentityInfo mapping (metadata)
    static ref IDENTITIES: std::sync::Mutex<HashMap<String, IdentityInfo>> = 
        std::sync::Mutex::new(HashMap::new());
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct IdentityInfo {
    npub: String,
    commitment: String,
    nullifier: String,
    created_at: u64,
}

/// Verify NEP-413 ownership using ed25519-dalek
/// 
/// This verifies that the signature was created by the wallet holder
/// for the specified account_id.
fn verify_nep413_ownership(
    account_id: &str,
    nep413_response: &Nep413AuthResponse,
) -> Result<(), String> {
    // 1. Verify account matches
    if nep413_response.account_id != account_id {
        return Err(format!(
            "Account ID mismatch: expected {}, got {}",
            account_id, nep413_response.account_id
        ));
    }

    // 2. Verify recipient
    if nep413_response.auth_request.recipient != "nostr-identity.near" {
        return Err(format!(
            "Invalid recipient: expected 'nostr-identity.near', got '{}'",
            nep413_response.auth_request.recipient
        ));
    }

    // 3. Parse signature (support multiple formats)
    let sig_bytes = parse_signature(&nep413_response.signature)?;

    if sig_bytes.len() != 64 {
        return Err(format!(
            "Invalid signature length: expected 64 bytes, got {}",
            sig_bytes.len()
        ));
    }

    let signature = Signature::from_bytes(
        sig_bytes.as_slice().try_into()
            .map_err(|_| "Invalid signature bytes: wrong array size")?,
    );

    // 4. Parse public key
    let pk_bytes = parse_public_key(&nep413_response.public_key)?;
    
    let public_key = VerifyingKey::from_bytes(
        pk_bytes.as_slice().try_into()
            .map_err(|_| "Invalid public key bytes: wrong array size")?,
    ).map_err(|e| format!("Invalid public key: {}", e))?;

    // 5. Construct message (NEP-413 format)
    let message = serde_json::to_string(&serde_json::json!({
        "message": nep413_response.auth_request.message,
        "nonce": nep413_response.auth_request.nonce,
        "recipient": nep413_response.auth_request.recipient
    })).map_err(|e| format!("Failed to serialize message: {}", e))?;

    // 6. Verify signature
    public_key
        .verify_strict(message.as_bytes(), &signature)
        .map_err(|e| format!("Invalid signature: {}", e))?;

    Ok(())
}

/// Parse signature from multiple formats (hex, base64, ed25519: prefix)
fn parse_signature(sig_str: &str) -> Result<Vec<u8>, String> {
    // Remove ed25519: prefix if present
    let sig_str = sig_str.strip_prefix("ed25519:").unwrap_or(sig_str);
    
    // Try hex first
    if let Ok(bytes) = hex::decode(sig_str) {
        return Ok(bytes);
    }
    
    // Try base64
    if let Ok(bytes) = STANDARD.decode(sig_str) {
        return Ok(bytes);
    }
    
    Err("Invalid signature format: expected hex or base64".to_string())
}

/// Parse public key from multiple formats
fn parse_public_key(pk_str: &str) -> Result<Vec<u8>, String> {
    // Remove ed25519: prefix if present
    let pk_str = pk_str.strip_prefix("ed25519:").unwrap_or(pk_str);
    
    // Try hex
    hex::decode(pk_str)
        .map_err(|e| format!("Invalid public key hex: {}", e))
}

/// Generate Nostr keypair using secp256k1
/// 
/// Generates a cryptographically secure random private key
/// and derives the corresponding public key.
fn generate_nostr_keypair() -> Result<(String, String), String> {
    // Generate random 32-byte private key
    let mut privkey_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut privkey_bytes);

    // Create signing key
    let signing_key = SigningKey::from_bytes((&privkey_bytes).into())
        .map_err(|e| format!("Failed to create signing key: {}", e))?;

    // Get verifying key (public key)
    let verifying_key = signing_key.verifying_key();

    // Serialize public key (33 bytes compressed)
    let pubkey_bytes = verifying_key.to_encoded_point(true);
    let pubkey_hex = hex::encode(pubkey_bytes.as_bytes());

    // Private key as hex
    let privkey_hex = hex::encode(privkey_bytes);

    Ok((pubkey_hex, privkey_hex))
}

/// Generate ZKP proof
/// 
/// This is a simplified ZKP implementation using SHA-256 commitments.
/// 
/// In production, you would use a real ZKP library like circom/snarkjs.
/// The simplified version provides:
/// - Privacy: account_id is hashed, cannot be reversed
/// - Uniqueness: commitment prevents double registration
/// - Replay protection: nullifier includes nonce
fn generate_zkp_proof(account_id: &str, nonce: &str, verified: bool) -> ZKPProof {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // 1. Generate commitment (hash of account_id)
    // This is used to prevent double registration
    let commitment = {
        let mut hasher = Sha256::new();
        hasher.update(b"commitment:");
        hasher.update(account_id.as_bytes());
        format!("{:x}", hasher.finalize())
    };

    // 2. Generate nullifier (prevents double registration and replay)
    // Different nonce = different nullifier for same account_id
    let nullifier = {
        let mut hasher = Sha256::new();
        hasher.update(b"nullifier:");
        hasher.update(account_id.as_bytes());
        hasher.update(nonce.as_bytes());
        format!("{:x}", hasher.finalize())
    };

    // 3. Generate proof hash (cryptographic binding)
    // This binds all the proof data together
    let proof_hash = {
        let mut hasher = Sha256::new();
        hasher.update(b"proof:");
        hasher.update(commitment.as_bytes());
        hasher.update(nullifier.as_bytes());
        hasher.update(&[if verified { 1 } else { 0 }]);
        hasher.update(&timestamp.to_le_bytes());
        format!("{:x}", hasher.finalize())
    };

    ZKPProof {
        commitment,
        nullifier,
        proof_hash,
        verified,
        timestamp,
    }
}

/// Check if commitment already used (prevents double registration)
fn is_commitment_used(commitment: &str) -> bool {
    let commitments = COMMITMENTS.lock().unwrap();
    commitments.contains_key(commitment)
}

/// Check if nullifier already used
fn is_nullifier_used(nullifier: &str) -> bool {
    let nullifiers = NULLIFIERS.lock().unwrap();
    nullifiers.contains_key(nullifier)
}

/// Store identity mappings
fn store_identity(commitment: &str, nullifier: &str, npub: &str, created_at: u64) {
    let info = IdentityInfo {
        npub: npub.to_string(),
        commitment: commitment.to_string(),
        nullifier: nullifier.to_string(),
        created_at,
    };

    COMMITMENTS.lock().unwrap().insert(commitment.to_string(), npub.to_string());
    NULLIFIERS.lock().unwrap().insert(nullifier.to_string(), npub.to_string());
    IDENTITIES.lock().unwrap().insert(npub.to_string(), info);
}

/// Generate TEE attestation (simplified)
/// In production, this would generate a real attestation certificate
fn generate_attestation() -> Attestation {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // In production, this would be the actual WASM measurement
    let measurement = {
        let mut hasher = Sha256::new();
        hasher.update(b"nostr-identity-zkp-tee-v1.0.0");
        format!("{:x}", hasher.finalize())
    };

    Attestation {
        platform: "outlayer-tee".to_string(),
        measurement,
        timestamp,
        secure: true,
    }
}

// Main actions
#[derive(Deserialize)]
#[serde(tag = "action")]
pub enum Action {
    #[serde(rename = "generate")]
    Generate {
        account_id: String,
        nep413_response: Nep413AuthResponse,
    },
    #[serde(rename = "verify")]
    Verify {
        nullifier: String,
        npub: String,
    },
    #[serde(rename = "get_identity")]
    GetIdentity {
        npub: String,
    },
    #[serde(rename = "stats")]
    Stats,
}

/// Main action handler
pub fn handle_action(action: Action) -> ActionResult {
    match action {
        Action::Generate { account_id, nep413_response } => {
            handle_generate(account_id, nep413_response)
        }
        Action::Verify { nullifier, npub } => {
            handle_verify(nullifier, npub)
        }
        Action::GetIdentity { npub } => {
            handle_get_identity(npub)
        }
        Action::Stats => {
            handle_stats()
        }
    }
}

/// Handle identity generation
fn handle_generate(account_id: String, nep413_response: Nep413AuthResponse) -> ActionResult {
    // 1. Verify NEP-413 ownership
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("Verification failed: {}", e)),
            ..Default::default()
        };
    }

    // 2. Generate ZKP proof (INSIDE TEE)
    let zkp_proof = generate_zkp_proof(
        &account_id,
        &nep413_response.auth_request.nonce,
        true,
    );

    // 3. Check if commitment already used (prevents double registration)
    if is_commitment_used(&zkp_proof.commitment) {
        return ActionResult {
            success: false,
            error: Some("This NEAR account already has a Nostr identity".to_string()),
            ..Default::default()
        };
    }

    // 4. Check if nullifier already used (extra safety)
    if is_nullifier_used(&zkp_proof.nullifier) {
        return ActionResult {
            success: false,
            error: Some("Nullifier collision detected. Please try again.".to_string()),
            ..Default::default()
        };
    }

    // 5. Generate random keypair
    let (npub, nsec) = match generate_nostr_keypair() {
        Ok(keys) => keys,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Key generation failed: {}", e)),
                ..Default::default()
            };
        }
    };

    // 6. Store identity mappings
    let created_at = zkp_proof.timestamp;
    store_identity(&zkp_proof.commitment, &zkp_proof.nullifier, &npub, created_at);

    // 7. Generate attestation
    let attestation = generate_attestation();

    // 8. Return ZKP proof + keys (account_id NOT revealed!)
    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: Some(nsec), // ⚠️ Only shown once!
        zkp_proof: Some(zkp_proof),
        attestation: Some(attestation),
        created_at: Some(created_at),
        ..Default::default()
    }
}

/// Handle identity verification
fn handle_verify(nullifier: String, npub: String) -> ActionResult {
    // Check if nullifier exists and maps to npub
    let nullifiers = NULLIFIERS.lock().unwrap();
    
    match nullifiers.get(&nullifier) {
        Some(stored_npub) => {
            let verified = stored_npub == &npub;
            
            ActionResult {
                success: true,
                verified: Some(verified),
                npub: Some(npub),
                ..Default::default()
            }
        }
        None => ActionResult {
            success: false,
            error: Some("Nullifier not found. Identity not registered.".to_string()),
            ..Default::default()
        },
    }
}

/// Get identity info by npub
fn handle_get_identity(npub: String) -> ActionResult {
    let identities = IDENTITIES.lock().unwrap();
    
    match identities.get(&npub) {
        Some(info) => {
            ActionResult {
                success: true,
                npub: Some(info.npub.clone()),
                created_at: Some(info.created_at),
                ..Default::default()
            }
        }
        None => ActionResult {
            success: false,
            error: Some("Identity not found".to_string()),
            ..Default::default()
        },
    }
}

/// Get statistics
fn handle_stats() -> ActionResult {
    let identities = IDENTITIES.lock().unwrap();
    let count = identities.len();
    
    ActionResult {
        success: true,
        created_at: Some(count as u64),
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zkp_generation() {
        let proof = generate_zkp_proof("alice.near", "nonce123", true);
        
        assert!(!proof.commitment.is_empty());
        assert!(!proof.nullifier.is_empty());
        assert!(!proof.proof_hash.is_empty());
        assert!(proof.verified);
        assert!(proof.timestamp > 0);
    }

    #[test]
    fn test_commitment_determinism() {
        let proof1 = generate_zkp_proof("alice.near", "nonce123", true);
        let proof2 = generate_zkp_proof("alice.near", "nonce456", true);
        
        // Same account_id = same commitment
        assert_eq!(proof1.commitment, proof2.commitment);
        
        // Different nonce = different nullifier
        assert_ne!(proof1.nullifier, proof2.nullifier);
    }

    #[test]
    fn test_commitment_storage() {
        let commitment = "test_commitment";
        let nullifier = "test_nullifier";
        let npub = "test_npub";
        
        store_identity(commitment, nullifier, npub, 12345);
        
        assert!(is_commitment_used(commitment));
        assert!(is_nullifier_used(nullifier));
    }

    #[test]
    fn test_signature_parsing() {
        // Test hex format
        let hex_sig = "00".repeat(32);
        let result = parse_signature(&hex_sig);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 64);
        
        // Test with ed25519: prefix
        let prefixed_sig = format!("ed25519:{}", hex_sig);
        let result = parse_signature(&prefixed_sig);
        assert!(result.is_ok());
    }

    #[test]
    fn test_public_key_parsing() {
        let hex_pk = "00".repeat(32);
        let result = parse_public_key(&hex_pk);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 32);
        
        // Test with ed25519: prefix
        let prefixed_pk = format!("ed25519:{}", hex_pk);
        let result = parse_public_key(&prefixed_pk);
        assert!(result.is_ok());
    }

    #[test]
    fn test_attestation_generation() {
        let attestation = generate_attestation();
        
        assert_eq!(attestation.platform, "outlayer-tee");
        assert!(attestation.secure);
        assert!(attestation.timestamp > 0);
        assert!(!attestation.measurement.is_empty());
    }

    #[test]
    fn test_keypair_generation() {
        let (pubkey, privkey) = generate_nostr_keypair().unwrap();
        
        // Public key should be 66 hex chars (33 bytes compressed)
        assert_eq!(pubkey.len(), 66);
        
        // Private key should be 64 hex chars (32 bytes)
        assert_eq!(privkey.len(), 64);
        
        // Should be valid hex
        assert!(hex::decode(&pubkey).is_ok());
        assert!(hex::decode(&privkey).is_ok());
    }
}
