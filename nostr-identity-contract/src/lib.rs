//! Nostr Identity TEE - Secure Backend
//!
//! Provides forgery-proof Nostr identity generation bound to NEAR accounts.
//! Uses NEP-413 for authentication and random key generation in TEE.

use ed25519_dalek::{Signature, VerifyingKey};
use k256::ecdsa::SigningKey;
use rand::RngCore;
use serde::{Deserialize, Serialize};

// NEP-413 Auth Request (from wallet)
#[derive(Deserialize, Clone)]
pub struct Nep413AuthRequest {
    pub message: String,
    pub nonce: String,
    pub recipient: String,
    #[serde(rename = "callbackUrl")]
    pub callback_url: Option<String>,
}

// NEP-413 Auth Response (signed by wallet)
#[derive(Deserialize, Clone)]
pub struct Nep413AuthResponse {
    pub account_id: String,
    pub public_key: String,
    pub signature: String,
    #[serde(rename = "authRequest")]
    pub auth_request: Nep413AuthRequest,
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
    pub verified: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
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
        account_id: String,
        npub: String,
    },
}

/// Verify NEP-413 ownership using ed25519-dalek
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

    // 3. Parse signature (hex or base64)
    let sig_bytes = if nep413_response.signature.starts_with("ed25519:") {
        // Handle ed25519:prefix format
        let hex = nep413_response.signature.strip_prefix("ed25519:").unwrap();
        hex::decode(hex).map_err(|_| "Invalid signature hex")?
    } else {
        // Try hex first, then base64
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

    // 5. Construct message (NEP-413 format)
    // The message to verify is the JSON serialization of the auth request
    let message = serde_json::to_string(&serde_json::json!({
        "message": nep413_response.auth_request.message,
        "nonce": nep413_response.auth_request.nonce,
        "recipient": nep413_response.auth_request.recipient
    })).map_err(|_| "Failed to serialize message")?;

    // 6. Verify signature
    // NEAR wallets sign the message bytes directly (not hashed)
    public_key
        .verify_strict(message.as_bytes(), &signature)
        .map_err(|e| format!("Invalid signature: {}", e))?;

    Ok(())
}

/// Generate Nostr keypair using secp256k1 (k256)
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

/// Handle generate action
fn handle_generate(account_id: String, nep413_response: Nep413AuthResponse) -> ActionResult {
    // 1. Verify NEP-413 ownership
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("Verification failed: {}", e)),
            ..Default::default()
        };
    }

    // 2. Generate random keypair
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

    // 3. Return keys (WARNING: nsec only shown once!)
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: Some(nsec),
        created_at: Some(created_at),
        ..Default::default()
    }
}

/// Handle verify action (public endpoint)
fn handle_verify(_account_id: String, _npub: String) -> ActionResult {
    // In v1 (no storage), we can't verify without the original key
    // This would require storage to work properly
    // For now, return an error explaining this limitation
    
    ActionResult {
        success: false,
        error: Some("Verification requires persistent storage (coming in v2). For now, generate a new identity.".to_string()),
        ..Default::default()
    }
}

/// Main action handler
pub fn handle_action(action: Action) -> ActionResult {
    match action {
        Action::Generate { account_id, nep413_response } => {
            handle_generate(account_id, nep413_response)
        }
        Action::Verify { account_id, npub } => {
            handle_verify(account_id, npub)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nep413_parsing() {
        let auth_request = Nep413AuthRequest {
            message: "Test".to_string(),
            nonce: "nonce".to_string(),
            recipient: "nostr-identity.near".to_string(),
            callback_url: None,
        };

        assert_eq!(auth_request.recipient, "nostr-identity.near");
    }

    #[test]
    fn test_key_generation() {
        let (pubkey, privkey) = generate_nostr_keypair().unwrap();
        
        // Public key should be 66 hex chars (33 bytes)
        assert_eq!(pubkey.len(), 66);
        
        // Private key should be 64 hex chars (32 bytes)
        assert_eq!(privkey.len(), 64);
        
        // Should be valid hex
        assert!(hex::decode(&pubkey).is_ok());
        assert!(hex::decode(&privkey).is_ok());
    }
}
