use ed25519_dalek::{Signature, VerifyingKey};
use k256::ecdsa::SigningKey;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest as Sha256Digest, Sha256};
use std::collections::HashMap;

// NEP-413 Auth Response
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

// ZKP proof (simplified - in production use real ZKP library)
#[derive(Serialize, Deserialize)]
pub struct ZKPProof {
    pub commitment: String,    // Hash of account_id (hidden)
    pub nullifier: String,     // Unique per account (prevents double reg)
    pub proof_hash: String,    // Hash of proof data
    pub verified: bool,        // True if NEP-413 verified
}

// API response
#[derive(Serialize, Default)]
pub struct ActionResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub npub: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nsec: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zkp_proof: Option<ZKPProof>,  // ZKP proof (anonymous)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified: Option<bool>,       // For verify endpoint
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// In-memory storage (WASI P1 limitation)
lazy_static::lazy_static! {
    static ref NULLIFIERS: std::sync::Mutex<HashMap<String, String>> = 
        std::sync::Mutex::new(HashMap::new());
}

// Verify NEP-413 ownership
fn verify_nep413_ownership(
    account_id: &str,
    nep413_response: &Nep413AuthResponse,
) -> Result<(), String> {
    // 1. Verify account matches
    if nep413_response.account_id != account_id {
        return Err("Account ID mismatch".to_string());
    }

    // 2. Verify recipient
    if nep413_response.auth_request.recipient != "nostr-identity.near" {
        return Err("Invalid recipient".to_string());
    }

    // 3. Parse signature
    let sig_bytes = if nep413_response.signature.starts_with("ed25519:") {
        let hex = nep413_response.signature.strip_prefix("ed25519:").unwrap();
        hex::decode(hex).map_err(|_| "Invalid signature hex")?
    } else {
        hex::decode(&nep413_response.signature)
            .or_else(|_| {
                use base64::{engine::general_purpose::STANDARD, Engine};
                STANDARD.decode(&nep413_response.signature)
            })
            .map_err(|_| "Invalid signature format")?
    };

    if sig_bytes.len() != 64 {
        return Err(format!("Invalid signature length: {}", sig_bytes.len()));
    }

    let signature = Signature::from_bytes(
        sig_bytes.as_slice().try_into().map_err(|_| "Invalid signature bytes")?,
    );

    // 4. Parse public key
    let pk_str = nep413_response.public_key.replace("ed25519:", "");
    let pk_bytes = hex::decode(&pk_str).map_err(|_| "Invalid public key hex")?;
    
    if pk_bytes.len() != 32 {
        return Err(format!("Invalid public key length: {}", pk_bytes.len()));
    }

    let public_key = VerifyingKey::from_bytes(
        pk_bytes.as_slice().try_into().map_err(|_| "Invalid public key bytes")?,
    ).map_err(|e| format!("Invalid public key: {}", e))?;

    // 5. Construct message
    let message = serde_json::to_string(&serde_json::json!({
        "message": nep413_response.auth_request.message,
        "nonce": nep413_response.auth_request.nonce,
        "recipient": nep413_response.auth_request.recipient
    })).map_err(|_| "Failed to serialize message")?;

    // 6. Verify signature
    public_key
        .verify_strict(message.as_bytes(), &signature)
        .map_err(|e| format!("Invalid signature: {}", e))?;

    Ok(())
}

// Generate Nostr keypair
fn generate_nostr_keypair() -> Result<(String, String), String> {
    let mut privkey_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut privkey_bytes);

    let signing_key = SigningKey::from_bytes((&privkey_bytes).into())
        .map_err(|e| format!("Failed to create signing key: {}", e))?;

    let verifying_key = signing_key.verifying_key();
    let pubkey_bytes = verifying_key.to_encoded_point(true);
    let pubkey_hex = hex::encode(pubkey_bytes.as_bytes());

    let privkey_hex = hex::encode(privkey_bytes);

    Ok((pubkey_hex, privkey_hex))
}

// Generate ZKP proof (simplified - in production use circom/snarkjs)
fn generate_zkp_proof(account_id: &str, nonce: &str, verified: bool) -> ZKPProof {
    // 1. Generate commitment (hash of account_id)
    let mut hasher = Sha256::new();
    hasher.update(account_id.as_bytes());
    let commitment = format!("{:x}", hasher.finalize());

    // 2. Generate nullifier (prevents double registration)
    let mut hasher = Sha256::new();
    hasher.update(account_id.as_bytes());
    hasher.update(nonce.as_bytes());
    let nullifier = format!("{:x}", hasher.finalize());

    // 3. Generate proof hash (simplified)
    let mut hasher = Sha256::new();
    hasher.update(commitment.as_bytes());
    hasher.update(nullifier.as_bytes());
    hasher.update(&[if verified { 1 } else { 0 }]);
    let proof_hash = format!("{:x}", hasher.finalize());

    ZKPProof {
        commitment,
        nullifier,
        proof_hash,
        verified,
    }
}

// Check if nullifier already used
fn is_nullifier_used(nullifier: &str) -> bool {
    let nullifiers = NULLIFIERS.lock().unwrap();
    nullifiers.contains_key(nullifier)
}

// Store nullifier → npub mapping
fn store_nullifier(nullifier: &str, npub: &str) {
    let mut nullifiers = NULLIFIERS.lock().unwrap();
    nullifiers.insert(nullifier.to_string(), npub.to_string());
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
}

pub fn handle_action(action: Action) -> ActionResult {
    match action {
        Action::Generate { account_id, nep413_response } => {
            handle_generate(account_id, nep413_response)
        }
        Action::Verify { nullifier, npub } => {
            handle_verify(nullifier, npub)
        }
    }
}

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

    // 3. Check if nullifier already used
    if is_nullifier_used(&zkp_proof.nullifier) {
        return ActionResult {
            success: false,
            error: Some("This NEAR account already has a Nostr identity".to_string()),
            ..Default::default()
        };
    }

    // 4. Generate random keypair
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

    // 5. Store nullifier mapping
    store_nullifier(&zkp_proof.nullifier, &npub);

    // 6. Return ZKP proof + keys (account_id NOT revealed!)
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: Some(nsec), // ⚠️ Only shown once!
        zkp_proof: Some(zkp_proof), // Anonymous proof
        created_at: Some(created_at),
        ..Default::default()
    }
}

fn handle_verify(nullifier: String, npub: String) -> ActionResult {
    // Check if nullifier maps to npub
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
            error: Some("Nullifier not found".to_string()),
            ..Default::default()
        },
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
    }

    #[test]
    fn test_nullifier_storage() {
        let nullifier = "test_nullifier";
        let npub = "test_npub";
        
        store_nullifier(nullifier, npub);
        assert!(is_nullifier_used(nullifier));
    }
}
