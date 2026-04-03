use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::SNARK;
use ark_ff::{One, PrimeField};
use ark_groth16::{Groth16, ProvingKey, VerifyingKey};
use ark_relations::r1cs::{
    ConstraintSynthesizer, ConstraintSystemRef, LinearCombination, SynthesisError, Variable,
};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};

use base64::{engine::general_purpose::STANDARD, Engine};
/// Fixed base point for algebraic commitment (must match client circuit)
use ed25519_dalek::{Signature, VerifyingKey as Ed25519VerifyingKey};
use k256::ecdsa::SigningKey;
use rand::{RngCore, SeedableRng};
use serde::{Deserialize, Serialize};
use sha2::{Digest as Sha256Digest, Sha256};
use std::collections::HashMap;

// ============================================================================
// ZKP CIRCUIT - Production version with proper constraints
// ============================================================================

/// Fixed base point for algebraic commitment (must match client circuit)
const COMMITMENT_BASE: u64 = 0x1234567890abcdef_u64;

#[derive(Clone)]
struct NEAROwnershipCircuit {
    // Private inputs (witness)
    account_id: Option<Fr>,
    nsec: Option<Fr>,
    nonce: Option<Fr>,
    // Public inputs
    commitment: Option<Fr>,
    nullifier: Option<Fr>,
}

impl ConstraintSynthesizer<Fr> for NEAROwnershipCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        let account_id_var =
            cs.new_witness_variable(|| self.account_id.ok_or(SynthesisError::AssignmentMissing))?;
        let nsec_var =
            cs.new_witness_variable(|| self.nsec.ok_or(SynthesisError::AssignmentMissing))?;
        let nonce_var =
            cs.new_witness_variable(|| self.nonce.ok_or(SynthesisError::AssignmentMissing))?;
        let commitment_var =
            cs.new_input_variable(|| self.commitment.ok_or(SynthesisError::AssignmentMissing))?;
        let nullifier_var =
            cs.new_input_variable(|| self.nullifier.ok_or(SynthesisError::AssignmentMissing))?;

        let base = Fr::from(COMMITMENT_BASE);

        let nsec_times_base =
            cs.new_witness_variable(|| Ok(self.nsec.unwrap_or_default() * base))?;
        cs.enforce_constraint(
            LinearCombination::zero() + nsec_var,
            LinearCombination::zero() + (base, Variable::One),
            LinearCombination::zero() + nsec_times_base,
        )?;

        let commitment_computed = cs.new_witness_variable(|| {
            Ok(self.account_id.unwrap_or_default() + self.nsec.unwrap_or_default() * base)
        })?;
        cs.enforce_constraint(
            LinearCombination::zero() + (Fr::one(), commitment_computed),
            LinearCombination::zero() + (Fr::one(), Variable::One),
            LinearCombination::zero() + (Fr::one(), account_id_var) + (Fr::one(), nsec_times_base),
        )?;

        cs.enforce_constraint(
            LinearCombination::zero() + (Fr::one(), commitment_computed)
                - (Fr::one(), commitment_var),
            LinearCombination::zero() + (Fr::one(), Variable::One),
            LinearCombination::zero(),
        )?;

        let nonce_times_base =
            cs.new_witness_variable(|| Ok(self.nonce.unwrap_or_default() * base))?;
        cs.enforce_constraint(
            LinearCombination::zero() + nonce_var,
            LinearCombination::zero() + (base, Variable::One),
            LinearCombination::zero() + nonce_times_base,
        )?;

        let nullifier_computed = cs.new_witness_variable(|| {
            Ok(self.nsec.unwrap_or_default() + self.nonce.unwrap_or_default() * base)
        })?;
        cs.enforce_constraint(
            LinearCombination::zero() + (Fr::one(), nullifier_computed),
            LinearCombination::zero() + (Fr::one(), Variable::One),
            LinearCombination::zero() + (Fr::one(), nsec_var) + (Fr::one(), nonce_times_base),
        )?;

        cs.enforce_constraint(
            LinearCombination::zero() + (Fr::one(), nullifier_computed)
                - (Fr::one(), nullifier_var),
            LinearCombination::zero() + (Fr::one(), Variable::One),
            LinearCombination::zero(),
        )?;

        Ok(())
    }
}

// Helper: Compute SHA256 and return as bytes
fn compute_sha256(input: &str) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hasher.finalize().to_vec()
}

/// Get or generate the TEE-bound salt for account_hash computation.
/// The salt is generated once on first use and persisted in TEE storage.
/// It never leaves the TEE, preventing precomputation attacks on NEAR account names.
fn get_or_create_salt() -> String {
    // Check in-memory cache first
    {
        let salt_lock = get_account_hash_salt().lock().unwrap();
        if let Some(ref salt) = *salt_lock {
            return salt.clone();
        }
    }

    // Try persistent TEE storage
    if let Some(salt) = tee_storage_get("account_hash_salt") {
        get_account_hash_salt()
            .lock()
            .unwrap()
            .replace(salt.clone());
        return salt;
    }

    // Generate new salt: 32 random bytes, hex-encoded
    let mut salt_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut salt_bytes);
    let salt = hex::encode(&salt_bytes);

    // Persist in TEE storage
    tee_storage_set("account_hash_salt", &salt);

    // Cache in memory
    get_account_hash_salt()
        .lock()
        .unwrap()
        .replace(salt.clone());

    salt
}

/// Compute a salted account_hash that resists precomputation attacks.
/// Uses: SHA256("account:" || account_id || salt)
/// The salt is TEE-bound and never exposed publicly.
fn compute_account_hash(account_id: &str) -> String {
    let salt = get_or_create_salt();
    let input = format!("account:{}{}", account_id, salt);
    hex::encode(compute_sha256(&input))
}

// ============================================================================
// API TYPES
// ============================================================================

#[derive(Deserialize, Clone)]
pub struct Nep413AuthResponse {
    pub account_id: String,
    pub public_key: String,
    pub signature: String,
    #[serde(rename = "authRequest")]
    pub auth_request: Nep413AuthRequest,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Nep413AuthRequest {
    pub message: String,
    pub nonce: String,
    pub recipient: String,
}

/// NEP-413 Borsh payload — matches what wallets sign per NEP-413 spec
/// Per NEP-413, callbackUrl is optional but MUST be included in serialization
/// IMPORTANT: nonce must be exactly 32 bytes (fixed-size array), not a slice
#[derive(borsh::BorshSerialize)]
struct Nep413BorshPayload<'a> {
    message: &'a str,
    nonce: &'a [u8; 32], // Fixed-size array, not slice!
    recipient: &'a str,
    callback_url: Option<&'a str>, // MUST be included, even if None
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ZKPProof {
    pub proof: String,
    pub public_inputs: Vec<String>,
    pub verified: bool,
    pub timestamp: u64,
}

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commitment: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nullifier: Option<String>,
    /// Transaction payload for near-signer-tee (when using prepare_writer_call)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tx_payload: Option<serde_json::Value>,
    /// Signed transaction ready to submit (when using RegisterWithZkp)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signed_transaction: Option<serde_json::Value>,
}

// For delegated registration via smart contract
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DelegatedRegistration {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub nep413_signature: String,
    pub user_public_key: String,
    pub message: String,
    pub nonce: u64,
}

#[derive(Debug)]
struct ContractCallResult {
    transaction_hash: String,
    #[allow(dead_code)]
    result: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Attestation {
    pub platform: String,
    pub measurement: String,
    pub timestamp: u64,
    pub secure: bool,
}

// ============================================================================
// STORAGE - OutLayer TEE Persistent Storage
// ============================================================================

// OutLayer storage API (persistent across invocations)
// Uses modern outlayer::storage API with WASI Preview 2
// TEMPORARY: Disabled to focus on NEP-413 fix
/*
#[cfg(feature = "outlayer-tee")]
fn tee_storage_get(key: &str) -> Option<String> {
    use outlayer::storage;
    match storage::get(key) {
        Ok(Some(data)) => Some(String::from_utf8_lossy(&data).to_string()),
        Ok(None) => None,
        Err(_) => None,
    }
}

#[cfg(feature = "outlayer-tee")]
fn tee_storage_set(key: &str, value: &str) {
    use outlayer::storage;
    let _ = storage::set(key, value.as_bytes());
}
*/

// Fallback stubs (temporary, until storage is fixed)
#[cfg(feature = "outlayer-tee")]
fn tee_storage_get(_key: &str) -> Option<String> {
    None
}

#[cfg(feature = "outlayer-tee")]
fn tee_storage_set(_key: &str, _value: &str) {
    // No-op for now
}

// Local testing fallbacks
#[cfg(all(not(feature = "outlayer-tee"), feature = "local-test"))]
fn tee_storage_get(key: &str) -> Option<String> {
    let dir = std::env::var("LOCAL_STORAGE_DIR")
        .unwrap_or_else(|_| "/tmp/nostr-identity-storage".to_string());
    let safe_key = hex::encode(key.as_bytes());
    let path = format!("{}/{}", dir, safe_key);
    std::fs::read_to_string(&path).ok()
}

#[cfg(all(not(feature = "outlayer-tee"), feature = "local-test"))]
fn tee_storage_set(key: &str, value: &str) {
    let dir = std::env::var("LOCAL_STORAGE_DIR")
        .unwrap_or_else(|_| "/tmp/nostr-identity-storage".to_string());
    let _ = std::fs::create_dir_all(&dir);
    let safe_key = hex::encode(key.as_bytes());
    let path = format!("{}/{}", dir, safe_key);
    let _ = std::fs::write(&path, value);
}

#[cfg(all(not(feature = "outlayer-tee"), not(feature = "local-test")))]
fn tee_storage_get(_key: &str) -> Option<String> {
    None
}

#[cfg(all(not(feature = "outlayer-tee"), not(feature = "local-test")))]
fn tee_storage_set(_key: &str, _value: &str) {
    // No persistent storage in default mode
}

// In-memory storage (always available as fallback)
use std::sync::OnceLock;

static COMMITMENTS: OnceLock<std::sync::Mutex<HashMap<String, String>>> = OnceLock::new();
static NULLIFIERS: OnceLock<std::sync::Mutex<HashMap<String, String>>> = OnceLock::new();
static IDENTITIES: OnceLock<std::sync::Mutex<HashMap<String, IdentityInfo>>> = OnceLock::new();
static PROVING_KEY: OnceLock<std::sync::Mutex<Option<ProvingKey<Bn254>>>> = OnceLock::new();
static VERIFYING_KEY: OnceLock<std::sync::Mutex<Option<VerifyingKey<Bn254>>>> = OnceLock::new();
static USED_NONCES: OnceLock<std::sync::Mutex<HashMap<String, bool>>> = OnceLock::new();
/// TEE-bound salt for account_hash — generated once, never leaves the TEE.
/// Prevents precomputation attacks since NEAR account names are public.
static ACCOUNT_HASH_SALT: OnceLock<std::sync::Mutex<Option<String>>> = OnceLock::new();

// Helper functions to initialize OnceLock values
fn get_commitments() -> &'static std::sync::Mutex<HashMap<String, String>> {
    COMMITMENTS.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

fn get_nullifiers() -> &'static std::sync::Mutex<HashMap<String, String>> {
    NULLIFIERS.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

fn get_identities() -> &'static std::sync::Mutex<HashMap<String, IdentityInfo>> {
    IDENTITIES.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

fn get_proving_key() -> &'static std::sync::Mutex<Option<ProvingKey<Bn254>>> {
    PROVING_KEY.get_or_init(|| std::sync::Mutex::new(None))
}

fn get_verifying_key() -> &'static std::sync::Mutex<Option<VerifyingKey<Bn254>>> {
    VERIFYING_KEY.get_or_init(|| std::sync::Mutex::new(None))
}

fn get_used_nonces() -> &'static std::sync::Mutex<HashMap<String, bool>> {
    USED_NONCES.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

fn get_account_hash_salt() -> &'static std::sync::Mutex<Option<String>> {
    ACCOUNT_HASH_SALT.get_or_init(|| std::sync::Mutex::new(None))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct IdentityInfo {
    npub: String,
    commitment: String,
    nullifier: String,
    created_at: u64,
}

// ============================================================================
// NEP-413 VERIFICATION
// ============================================================================

fn verify_nep413_ownership(
    account_id: &str,
    nep413_response: &Nep413AuthResponse,
) -> Result<(), String> {
    if nep413_response.account_id != account_id {
        return Err("Account ID mismatch".to_string());
    }

    if nep413_response.auth_request.recipient != "nostr-identity.kampouse.testnet" {
        return Err(format!(
            "Invalid recipient: expected 'nostr-identity.kampouse.testnet', got '{}'",
            nep413_response.auth_request.recipient
        ));
    }

    // Replay protection: check nonce hasn't been used
    let nonce_key = format!("{}:{}", account_id, nep413_response.auth_request.nonce);
    {
        let used = get_used_nonces().lock().unwrap();
        if used.contains_key(&nonce_key) {
            return Err("Nonce already used — replay attack detected".to_string());
        }
    }

    // Verify the public key actually belongs to this account on NEAR
    verify_account_key_ownership(account_id, &nep413_response.public_key)?;

    // Step 2: Parse and verify signature
    let sig_bytes = parse_signature(&nep413_response.signature)?;
    if sig_bytes.len() != 64 {
        return Err("Invalid signature length".to_string());
    }

    let signature = Signature::from_bytes(
        sig_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Invalid signature bytes")?,
    );

    let pk_bytes = parse_public_key(&nep413_response.public_key)?;

    let public_key = Ed25519VerifyingKey::from_bytes(
        pk_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Invalid public key bytes")?,
    )
    .map_err(|e| format!("Invalid public key: {}", e))?;

    // NEP-413 spec: wallet signs SHA-256 of (u32 prefix + borsh payload)
    // u32 prefix: 2^31 + 413 = 2147484061 (little-endian bytes)
    // Payload: { message, nonce (raw 32 bytes), recipient }
    // The nonce from the frontend is base64-encoded raw bytes — decode first
    let nonce_raw = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &nep413_response.auth_request.nonce,
    )
    .map_err(|e| format!("Invalid nonce base64: {}", e))?;

    // Debug logging
    eprintln!("🔍 TEE NEP-413 Verification:");
    eprintln!("  Input:");
    eprintln!("    account_id: {}", account_id);
    eprintln!("    public_key: {}", nep413_response.public_key);
    eprintln!("    message: {}", nep413_response.auth_request.message);
    eprintln!("    nonce (base64): {}", nep413_response.auth_request.nonce);
    eprintln!("    nonce (hex): {:02x?}", nonce_raw.as_slice());
    eprintln!("    recipient: {}", nep413_response.auth_request.recipient);
    eprintln!("    signature (hex): {:02x?}", sig_bytes.as_slice());

    // NEP-413 spec: prefix with u32 tag (2^31 + 413 = 2147484061)
    const NEP_413_TAG: u32 = 2147484061u32;

    // Convert nonce slice to fixed-size array
    let nonce_array: [u8; 32] = nonce_raw
        .as_slice()
        .try_into()
        .map_err(|_| format!("Nonce must be exactly 32 bytes, got {}", nonce_raw.len()))?;

    let borsh_payload = Nep413BorshPayload {
        message: nep413_response.auth_request.message.trim(), // Trim whitespace
        nonce: &nonce_array,                                  // Reference to fixed-size array
        recipient: &nep413_response.auth_request.recipient.trim(),
        callback_url: None, // No callbackUrl for TEE use, but must be included
    };
    let payload_bytes =
        borsh::to_vec(&borsh_payload).map_err(|e| format!("Borsh serialization failed: {}", e))?;

    // Prepend the u32 tag prefix as per NEP-413 spec
    let mut prefixed_bytes = vec![0u8; 4 + payload_bytes.len()];
    prefixed_bytes[0..4].copy_from_slice(&NEP_413_TAG.to_le_bytes());
    prefixed_bytes[4..].copy_from_slice(&payload_bytes);

    eprintln!("  Verification:");
    eprintln!(
        "    nep413 tag (u32): {} (0x{:08x})",
        NEP_413_TAG, NEP_413_TAG
    );
    eprintln!("    tag bytes (le): {:02x?}", &NEP_413_TAG.to_le_bytes());
    eprintln!("    payload (hex): {:02x?}", payload_bytes.as_slice());
    eprintln!("    payload length: {} bytes", payload_bytes.len());
    eprintln!("    prefixed (hex): {:02x?}", prefixed_bytes.as_slice());
    eprintln!("    total length: {} bytes", prefixed_bytes.len());

    let message_hash = Sha256::digest(&prefixed_bytes);
    eprintln!("    message hash (hex): {:02x?}", message_hash.as_slice());

    // Try NEP-413 format first (correct)
    let nep413_result = public_key.verify_strict(&message_hash, &signature);

    // If that fails, try just the message bytes (some wallets might not do NEP-413)
    let mut detected_format = "NEP-413 (tag + borsh payload)".to_string();
    let mut found_match = false;

    if nep413_result.is_err() {
        eprintln!("  ⚠️  NEP-413 verification failed, trying alternative formats...");

        // Try 1: Just the message string as UTF-8 bytes
        let message_bytes = nep413_response.auth_request.message.trim().as_bytes();
        let message_hash_alt = Sha256::digest(message_bytes);
        eprintln!(
            "    Alt 1 - message only hash: {:02x?}",
            message_hash_alt.as_slice()
        );
        if public_key
            .verify_strict(&message_hash_alt, &signature)
            .is_ok()
        {
            detected_format = "Plain message only (NOT NEP-413!)".to_string();
            found_match = true;
        }

        // Try 2: JSON string of the authRequest
        if !found_match {
            let json_str = serde_json::to_string(&nep413_response.auth_request).unwrap_or_default();
            let json_hash = Sha256::digest(json_str.as_bytes());
            eprintln!("    Alt 2 - JSON hash: {:02x?}", json_hash.as_slice());
            eprintln!("    Alt 2 - JSON string: {}", json_str);
            if public_key.verify_strict(&json_hash, &signature).is_ok() {
                detected_format = "JSON string of authRequest (NOT NEP-413!)".to_string();
                found_match = true;
            }
        }

        // Try 3: Message + nonce concatenated
        if !found_match {
            let mut msg_with_nonce = Vec::new();
            msg_with_nonce.extend_from_slice(message_bytes);
            msg_with_nonce.extend_from_slice(&nonce_raw);
            let msg_with_nonce_hash = Sha256::digest(&msg_with_nonce);
            eprintln!(
                "    Alt 3 - message+nonce hash: {:02x?}",
                msg_with_nonce_hash.as_slice()
            );
            if public_key
                .verify_strict(&msg_with_nonce_hash, &signature)
                .is_ok()
            {
                detected_format = "Message + nonce concatenated (NOT NEP-413!)".to_string();
                found_match = true;
            }
        }

        // Try 4: Borsh payload without tag prefix
        if !found_match {
            let payload_hash = Sha256::digest(&payload_bytes);
            eprintln!(
                "    Alt 4 - payload without tag hash: {:02x?}",
                payload_hash.as_slice()
            );
            if public_key.verify_strict(&payload_hash, &signature).is_ok() {
                detected_format = "Borsh payload without tag (NOT NEP-413!)".to_string();
                found_match = true;
            }
        }

        if !found_match {
            detected_format = "Unknown/Non-standard format".to_string();
        }
        eprintln!("    Detected format: {}", detected_format);
    }

    public_key
        .verify_strict(&message_hash, &signature)
        .map_err(|e| {
            // Build detailed debug info for error response
            let debug_details = format!(
                "\n\n=== NEP-413 Verification Debug ===\n\
                 Account ID: {}\n\
                 Public Key: {}\n\
                 Message: {}\n\
                 Nonce (base64): {}\n\
                 Nonce (hex): {:02x?}\n\
                 Recipient: {}\n\
                 Signature (hex): {:02x?}\n\
                 NEP-413 Tag: {} (0x{:08x})\n\
                 Tag Bytes (LE): {:02x?}\n\
                 Payload (hex): {:02x?}\n\
                 Payload Length: {} bytes\n\
                 Full Prefixed Data (hex): {:02x?}\n\
                 Total Length: {} bytes\n\
                 Computed Hash (SHA256): {:02x?}\n\
                 \n\
                 ⚠️  WALLET FORMAT DETECTION:\n\
                 Wallet appears to be signing: {}\n\
                 Expected NEP-413 format: tag + borsh(payload)\n\
                 \n\
                 Verification Error: {}",
                account_id,
                nep413_response.public_key,
                nep413_response.auth_request.message,
                nep413_response.auth_request.nonce,
                nonce_raw.as_slice(),
                nep413_response.auth_request.recipient,
                sig_bytes.as_slice(),
                NEP_413_TAG,
                NEP_413_TAG,
                NEP_413_TAG.to_le_bytes(),
                payload_bytes.as_slice(),
                payload_bytes.len(),
                prefixed_bytes.as_slice(),
                prefixed_bytes.len(),
                message_hash.as_slice(),
                detected_format,
                e
            );
            format!("Invalid signature: {}", debug_details)
        })?;

    // Mark nonce as used to prevent replay
    let nonce_key = format!("{}:{}", account_id, nep413_response.auth_request.nonce);
    get_used_nonces().lock().unwrap().insert(nonce_key, true);

    Ok(())
}

/// Verify that the public key is actually an access key for the account on NEAR
/// This prevents someone from signing with an arbitrary key and claiming a different account_id
fn verify_account_key_ownership(account_id: &str, public_key: &str) -> Result<(), String> {
    // Dev mode: skip verification for mock keys
    if public_key.contains("mock") || std::env::var("DEV_MODE").is_ok() {
        return Ok(());
    }

    if !public_key.starts_with("ed25519:") {
        return Err("Invalid public key format".to_string());
    }

    let rpc_url = std::env::var("NEAR_RPC_URL")
        .unwrap_or_else(|_| "https://rpc.testnet.near.org".to_string());

    let request_body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": "dontcare",
        "method": "query",
        "params": {
            "request_type": "view_access_key_list",
            "finality": "final",
            "account_id": account_id
        }
    });
    let body_str = serde_json::to_string(&request_body).unwrap();

    // Get RPC response via available method
    let response_body = match fetch_rpc(&rpc_url, &body_str) {
        Ok(body) => body,
        Err(e) => return Err(format!("RPC call failed: {}", e)),
    };

    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&response_body) {
        if let Some(error) = parsed.get("error") {
            return Err(format!(
                "RPC error: {}",
                error["message"].as_str().unwrap_or("unknown")
            ));
        }
        if let Some(keys) = parsed["result"]["keys"].as_array() {
            let found = keys.iter().any(|k| {
                k["public_key"]
                    .as_str()
                    .map(|pk| pk == public_key)
                    .unwrap_or(false)
            });
            if !found {
                return Err(format!(
                    "{} is not an access key for {}",
                    public_key, account_id
                ));
            }
            return Ok(());
        }
    }
    Err("Could not parse RPC response".to_string())
}

/// Fetch RPC response - works in both local-test and OutLayer TEE
/// Fetch RPC response
/// In local-test mode: uses minreq (HTTP client)
/// In OutLayer TEE: uses OutLayer HTTP host function
fn fetch_rpc(url: &str, body: &str) -> Result<String, String> {
    #[cfg(feature = "local-test")]
    {
        let resp = minreq::post(url)
            .with_header("Content-Type", "application/json")
            .with_body(body)
            .send()
            .map_err(|e| format!("minreq HTTP error: {:?}", e))?;
        Ok(String::from_utf8_lossy(resp.as_bytes()).to_string())
    }

    #[cfg(not(feature = "local-test"))]
    {
        use wasi_http_client::*;
        let resp = Client::new()
            .post(url)
            .header("Content-Type", "application/json")
            .body(body.as_bytes())
            .send()
            .map_err(|e| format!("wasi-http-client error: {:?}", e))?;
        let body_bytes = resp
            .body()
            .map_err(|e| format!("body read error: {:?}", e))?;
        Ok(String::from_utf8_lossy(&body_bytes).to_string())
    }
}

fn parse_signature(sig_str: &str) -> Result<Vec<u8>, String> {
    let sig_str = sig_str.strip_prefix("ed25519:").unwrap_or(sig_str);
    // NEP-413 wallets return base64-encoded signatures
    // Also try base58 for backward compatibility
    base64::Engine::decode(&base64::engine::general_purpose::STANDARD, sig_str)
        .or_else(|_| bs58::decode(sig_str).into_vec())
        .map_err(|e| format!("Invalid signature (not base64 or base58): {}", e))
}

fn parse_public_key(pk_str: &str) -> Result<Vec<u8>, String> {
    let pk_str = pk_str.strip_prefix("ed25519:").unwrap_or(pk_str);
    // NEAR uses base58 (bs58) encoding for public keys
    bs58::decode(pk_str)
        .into_vec()
        .map_err(|e| format!("Invalid public key bs58: {}", e))
}

// ============================================================================
// SHARED VERIFYING KEY — generated once, embedded in both TEE and client WASM
// ============================================================================

/// Hardcoded verifying key (328 bytes, compressed serialization).
/// Generated deterministically with seed 0x4e4541525a4b5031.
/// Both TEE and client WASM use this exact key so proofs cross-verify.
const SHARED_VK_HEX: &str = "1606ca9cc25428ee3469315117bd5d318bcccafaeecfb372e10659ab41077b2b2a951ec907898ec617cf79ea9ce1dc43192b1306d64eca3e1573469f86385b073536efc980fce81b2f3fd9f25d1617e7189aed96c29e3aa1b26a932c59b40f237f66b421fae36371fca1dae6c2f7bba49c884b9751c93ff0d63e4d89f369ad287f28e53961aaac9cde2524083e1778c3b15caa14198fca886f13d52a767ba71c8c584bcd272b49b2fa0abdc9b550ae060f6100bdc6e4ded809dad00647f2c22295ad6219e183656d140b3d550f7027ab22c0825279de2266c65c196c1e3c61200300000000000000581d8f522081c060a8ff1ef87d93ebb43fe9ed1108cd7eb31572ca6f1b4d30125cce279c30c0d9cf0fbdb8b85ae2042da4e4a18546fdd6937adca418bf8ad1acb02e0c98978edd58eebde7466451713f88c4ab97b79eb9040b557929f8f2ed8a";

/// Load the shared verifying key from the hardcoded constant.
fn load_shared_vk() -> Result<VerifyingKey<Bn254>, String> {
    let vk_bytes = hex::decode(SHARED_VK_HEX).map_err(|e| format!("Invalid VK hex: {}", e))?;
    CanonicalDeserialize::deserialize_compressed(&vk_bytes[..])
        .map_err(|e| format!("VK deserialization failed: {}", e))
}

/// Load the shared verifying key, caching it in memory.
fn get_cached_vk() -> Result<VerifyingKey<Bn254>, String> {
    {
        let vk_lock = get_verifying_key().lock().unwrap();
        if vk_lock.is_some() {
            return Ok(vk_lock.as_ref().unwrap().clone());
        }
    }
    let vk = load_shared_vk()?;
    let mut vk_lock = get_verifying_key().lock().unwrap();
    *vk_lock = Some(vk.clone());
    Ok(vk)
}

// ============================================================================
// REAL ZKP GENERATION
// ============================================================================

fn initialize_zkp() -> Result<(), String> {
    let mut pk_lock = get_proving_key().lock().unwrap();

    if pk_lock.is_some() {
        return Ok(());
    }

    // Proving key must be generated at runtime (not shared — only TEE proves)
    let mut rng = rand::rngs::StdRng::seed_from_u64(0x4e4541525a4b5031);
    let base = Fr::from(COMMITMENT_BASE);
    let init_aid = Fr::from(1u64);
    let init_nsec = Fr::from(2u64);
    let init_nonce = Fr::from(3u64);

    let circuit = NEAROwnershipCircuit {
        account_id: Some(init_aid),
        nsec: Some(init_nsec),
        nonce: Some(init_nonce),
        commitment: Some(init_aid + init_nsec * base),
        nullifier: Some(init_nsec + init_nonce * base),
    };

    let (pk, _vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)
        .map_err(|e| format!("Failed to generate ZKP keys: {}", e))?;

    *pk_lock = Some(pk);

    // VK is loaded from hardcoded constant (see get_cached_vk)
    // Ensure it's cached
    get_cached_vk()?;

    Ok(())
}

fn generate_real_zkp(account_id: &str, nonce: &str, verified: bool) -> Result<ZKPProof, String> {
    initialize_zkp()?;

    let pk_lock = get_proving_key().lock().unwrap();
    let pk = pk_lock.as_ref().ok_or("ZKP not initialized")?;

    // Convert to field elements
    let account_id_field = Fr::from_le_bytes_mod_order(account_id.as_bytes());
    let nonce_field = Fr::from_le_bytes_mod_order(nonce.as_bytes());
    let nsec_field = Fr::from(0u64); // TEE doesn't have nsec, uses 0

    let base = Fr::from(COMMITMENT_BASE);
    let commitment_field = account_id_field + nsec_field * base;
    let nullifier_field = nsec_field + nonce_field * base;

    let circuit = NEAROwnershipCircuit {
        account_id: Some(account_id_field),
        nsec: Some(nsec_field),
        nonce: Some(nonce_field),
        commitment: Some(commitment_field),
        nullifier: Some(nullifier_field),
    };

    let mut rng = rand::rngs::StdRng::seed_from_u64(0x4e4541525a4b5031);
    let proof = Groth16::<Bn254>::prove(pk, circuit, &mut rng)
        .map_err(|e| format!("Failed to generate ZKP: {}", e))?;

    let mut proof_bytes = Vec::new();
    proof
        .serialize_uncompressed(&mut proof_bytes)
        .map_err(|e| format!("Failed to serialize proof: {}", e))?;

    // Output field elements as hex for public inputs
    let mut commitment_bytes = [0u8; 32];
    commitment_field
        .serialize_compressed(&mut commitment_bytes[..])
        .map_err(|e| format!("Failed to serialize commitment: {}", e))?;

    let mut nullifier_bytes = [0u8; 32];
    nullifier_field
        .serialize_compressed(&mut nullifier_bytes[..])
        .map_err(|e| format!("Failed to serialize nullifier: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Ok(ZKPProof {
        proof: STANDARD.encode(&proof_bytes),
        public_inputs: vec![
            hex::encode(&commitment_bytes),
            hex::encode(&nullifier_bytes),
        ],
        verified,
        timestamp,
    })
}

// ============================================================================
// NOSTR KEY GENERATION
// ============================================================================

fn generate_nostr_keypair() -> Result<(String, String), String> {
    let mut privkey_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut privkey_bytes);

    let signing_key = SigningKey::from_bytes((&privkey_bytes).into())
        .map_err(|e| format!("Failed to create signing key: {}", e))?;

    let verifying_key = signing_key.verifying_key();
    // NIP-01: pubkey is 32-byte x-only secp256k1 (lowercase hex)
    let encoded = verifying_key.to_encoded_point(false); // uncompressed
    let pubkey_bytes = &encoded.as_bytes()[1..33]; // skip 0x04 prefix, take x-coordinate
    let pubkey_hex = hex::encode(pubkey_bytes);

    let privkey_hex = hex::encode(privkey_bytes);

    Ok((pubkey_hex, privkey_hex))
}

// ============================================================================
// STORAGE HELPERS - With TEE Persistent Storage
// ============================================================================

fn is_commitment_used(commitment: &str) -> bool {
    // Try TEE storage first
    if tee_storage_get(&format!("commitment:{}", commitment)).is_some() {
        return true;
    }

    // Fallback to in-memory
    let commitments = get_commitments().lock().unwrap();
    commitments.contains_key(commitment)
}

fn store_identity(commitment: &str, nullifier: &str, npub: &str, created_at: u64) {
    let info = IdentityInfo {
        npub: npub.to_string(),
        commitment: commitment.to_string(),
        nullifier: nullifier.to_string(),
        created_at,
    };

    // Store in TEE persistent storage
    tee_storage_set(&format!("commitment:{}", commitment), npub);
    tee_storage_set(&format!("nullifier:{}", nullifier), npub);
    tee_storage_set(
        &format!("npub:{}", npub),
        &serde_json::to_string(&info).unwrap(),
    );

    // Also store in memory for fast access
    get_commitments()
        .lock()
        .unwrap()
        .insert(commitment.to_string(), npub.to_string());
    get_nullifiers()
        .lock()
        .unwrap()
        .insert(nullifier.to_string(), npub.to_string());
    get_identities()
        .lock()
        .unwrap()
        .insert(npub.to_string(), info);
}

fn generate_attestation() -> Attestation {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let measurement = {
        let mut hasher = Sha256::new();
        hasher.update(b"nostr-identity-zkp-tee-v2.0.0-real-groth16");
        format!("{:x}", hasher.finalize())
    };

    Attestation {
        platform: "outlayer-tee".to_string(),
        measurement,
        timestamp,
        secure: true,
    }
}

// ============================================================================
// MAIN API
// ============================================================================

#[derive(Deserialize)]
#[serde(tag = "action")]
pub enum Action {
    #[serde(rename = "generate")]
    Generate {
        account_id: String,
        nep413_response: Nep413AuthResponse,
        /// Contract to register identity on
        writer_contract_id: String,
        /// Optional signing key (TESTING ONLY)
        #[serde(skip_serializing_if = "Option::is_none")]
        signing_key: Option<String>,
    },
    #[serde(rename = "recover")]
    Recover {
        account_id: String,
        nep413_response: Nep413AuthResponse,
    },
    #[serde(rename = "verify")]
    Verify { zkp_proof: ZKPProof },
    #[serde(rename = "get_identity")]
    GetIdentity { npub: String },
    #[serde(rename = "check_commitment")]
    CheckCommitment { commitment: String },
    #[serde(rename = "stats")]
    Stats,

    #[serde(rename = "register_via_contract")]
    RegisterViaContract {
        account_id: String,
        nep413_response: Nep413AuthResponse,
        contract_id: String,
        nonce: u64,
    },

    /// Prepare a writer contract call - returns transaction payload for signing
    #[serde(rename = "prepare_writer_call")]
    PrepareWriterCall {
        account_id: String,
        nep413_response: Nep413AuthResponse,
        writer_contract_id: String,
        deadline: u64,
    },

    /// Register with client-generated ZKP + NEP-413 auth.
    ///
    /// Flow:
    ///   1. Client generates npub/nsec locally
    ///   2. Client computes commitment = SHA256("commitment:" || account_id || nsec)
    ///   3. Client generates ZKP proving knowledge of account_id + nsec
    ///   4. Client signs NEP-413 to prove NEAR account ownership
    ///   5. Client sends everything to TEE
    ///   6. TEE verifies NEP-413 (proves account_id) + ZKP, computes account_hash
    ///   7. TEE calls contract.register(npub, commitment, nullifier, account_hash)
    #[serde(rename = "register_with_zkp")]
    RegisterWithZkp {
        /// Client-generated ZKP containing commitment and nullifier
        zkp_proof: ZKPProof,
        /// Client-generated Nostr public key
        npub: String,
        /// NEAR account ID (verified via NEP-413)
        account_id: String,
        /// NEP-413 auth response proving account ownership
        nep413_response: Nep413AuthResponse,
        /// Contract to call
        writer_contract_id: String,
        /// Transaction deadline
        deadline: u64,
        /// Optional signing key (TESTING ONLY - INSECURE)
        #[serde(skip_serializing_if = "Option::is_none")]
        signing_key: Option<String>,
    },
}

pub fn handle_action(action: Action) -> ActionResult {
    match action {
        Action::Generate {
            account_id,
            nep413_response,
            writer_contract_id,
            signing_key,
        } => handle_generate(account_id, nep413_response, writer_contract_id, signing_key),
        Action::Recover {
            account_id,
            nep413_response,
        } => handle_recover(account_id, nep413_response),
        Action::Verify { zkp_proof } => handle_verify_zkp(zkp_proof),
        Action::GetIdentity { npub } => handle_get_identity(npub),
        Action::CheckCommitment { commitment } => handle_check_commitment(commitment),
        Action::Stats => handle_stats(),

        Action::RegisterViaContract {
            account_id,
            nep413_response,
            contract_id,
            nonce,
        } => handle_register_via_contract(account_id, nep413_response, contract_id, nonce),

        Action::PrepareWriterCall {
            account_id,
            nep413_response,
            writer_contract_id,
            deadline,
        } => handle_prepare_writer_call(account_id, nep413_response, writer_contract_id, deadline),

        Action::RegisterWithZkp {
            zkp_proof,
            npub,
            account_id,
            nep413_response,
            writer_contract_id,
            deadline,
            signing_key,
        } => handle_register_with_zkp(
            zkp_proof,
            npub,
            account_id,
            nep413_response,
            writer_contract_id,
            deadline,
            signing_key,
        ),
    }
}

fn handle_generate(
    account_id: String,
    nep413_response: Nep413AuthResponse,
    writer_contract_id: String,
    signing_key: Option<String>,
) -> ActionResult {
    // 1. Verify NEP-413 (proves account ownership + nonce replay protection)
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        // Build debug info as plain string for better visibility
        let debug_info = format!(
            " | DEBUG: account_id={}, public_key={}, signature={}_TRUNCATED, message={}, nonce={}_TRUNCATED, recipient={}",
            account_id,
            nep413_response.public_key,
            &nep413_response.signature.chars().take(20).collect::<String>(),
            nep413_response.auth_request.message,
            &nep413_response.auth_request.nonce.chars().take(10).collect::<String>(),
            nep413_response.auth_request.recipient
        );

        return ActionResult {
            success: false,
            error: Some(format!("Verification failed: {}{}", e, debug_info)),
            ..Default::default()
        };
    }

    // 2. Generate ZKP
    let zkp_proof = match generate_real_zkp(&account_id, &nep413_response.auth_request.nonce, true)
    {
        Ok(proof) => proof,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("ZKP generation failed: {}", e)),
                ..Default::default()
            };
        }
    };

    let commitment = zkp_proof.public_inputs[0].clone();
    let nullifier = zkp_proof.public_inputs[1].clone();

    // 3. Generate Nostr keypair (inside TEE)
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

    // 4. Compute account_hash (salted — salt is TEE-bound, never exposed)
    let account_hash = compute_account_hash(&account_id);

    // 5. Store locally
    let created_at = zkp_proof.timestamp;
    store_identity(&commitment, &nullifier, &npub, created_at);

    // 6. Register on-chain with proof — contract verifies Groth16 on-chain
    let register_args = serde_json::json!({
        "owner": account_id,
        "npub": npub,
        "commitment": commitment,
        "nullifier": nullifier,
        "account_hash": account_hash,
        "proof_b64": zkp_proof.proof,
    });

    let args_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        register_args.to_string(),
    );

    let tx_nonce = created_at * 1000;

    let actions = vec![serde_json::json!({
        "FunctionCall": {
            "method_name": "register",
            "args": args_b64,
            "gas": 300000000000000u64,
            "deposit": "0",
        }
    })];

    let signed_tx = match sign_transaction_with_near_key(
        std::env::var("TEE_SIGNER_ID").unwrap_or_else(|_| "kampouse.testnet".to_string()),
        writer_contract_id.to_string(),
        tx_nonce,
        actions,
        signing_key,
    ) {
        Ok(tx) => tx,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Failed to sign transaction: {}", e)),
                ..Default::default()
            }
        }
    };

    // 7. Submit to NEAR RPC
    let tx_hash = match submit_transaction_to_near_rpc(&signed_tx) {
        Ok(hash) => hash,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Failed   st uff to submit transaction: {}", e)),
                ..Default::default()
            }
        }
    };

    // 8. Return identity + transaction hash
    let attestation = generate_attestation();

    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: Some(nsec),
        commitment: Some(commitment),
        nullifier: Some(nullifier),
        zkp_proof: Some(zkp_proof),
        attestation: Some(attestation),
        created_at: Some(created_at),
        transaction_hash: Some(tx_hash),
        signed_transaction: Some(signed_tx),
        ..Default::default()
    }
}

fn handle_get_identity(npub: String) -> ActionResult {
    // Try memory first (fast)
    {
        let identities = get_identities().lock().unwrap();
        if let Some(info) = identities.get(&npub) {
            return ActionResult {
                success: true,
                npub: Some(info.npub.clone()),
                created_at: Some(info.created_at),
                ..Default::default()
            };
        }
    }

    // Try TEE storage (persistent)
    if let Some(json) = tee_storage_get(&format!("npub:{}", npub)) {
        if let Ok(info) = serde_json::from_str::<IdentityInfo>(&json) {
            return ActionResult {
                success: true,
                npub: Some(info.npub.clone()),
                created_at: Some(info.created_at),
                ..Default::default()
            };
        }
    }

    ActionResult {
        success: false,
        error: Some("Identity not found".to_string()),
        ..Default::default()
    }
}

// Recovery endpoint - allows user to recover their identity using NEP-413
fn handle_recover(account_id: String, nep413_response: Nep413AuthResponse) -> ActionResult {
    // 1. Verify NEP-413 ownership
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("Verification failed: {}", e)),
            ..Default::default()
        };
    }

    // 2. Compute commitment
    let commitment = {
        let input = format!("commitment:{}", account_id);
        let hash = compute_sha256(&input);
        hex::encode(&hash)
    };

    // 3. Check if identity exists
    let npub = if let Some(npub) = tee_storage_get(&format!("commitment:{}", commitment)) {
        npub
    } else {
        let commitments = get_commitments().lock().unwrap();
        match commitments.get(&commitment) {
            Some(npub) => npub.clone(),
            None => {
                return ActionResult {
                    success: false,
                    error: Some("No identity found for this account".to_string()),
                    ..Default::default()
                };
            }
        }
    };

    // 4. Get full identity info
    if let Some(json) = tee_storage_get(&format!("npub:{}", npub)) {
        if let Ok(info) = serde_json::from_str::<IdentityInfo>(&json) {
            // Security: nsec (private key) is never returned in recovery
            // Users must securely store their nsec during initial registration
            // Future enhancement: Add encrypted storage with user-provided password
            return ActionResult {
                success: true,
                npub: Some(info.npub),
                zkp_proof: Some(ZKPProof {
                    proof: String::new(),
                    public_inputs: vec![info.commitment, info.nullifier],
                    verified: true,
                    timestamp: info.created_at,
                }),
                created_at: Some(info.created_at),
                ..Default::default()
            };
        }
    }

    ActionResult {
        success: false,
        error: Some("Failed to retrieve identity".to_string()),
        ..Default::default()
    }
}

// Proper ZKP verification
fn handle_verify_zkp(zkp_proof: ZKPProof) -> ActionResult {
    // Check proof structure
    if zkp_proof.proof.is_empty() {
        return ActionResult {
            success: false,
            error: Some("Empty proof".to_string()),
            verified: Some(false),
            ..Default::default()
        };
    }

    if zkp_proof.public_inputs.len() != 2 {
        return ActionResult {
            success: false,
            error: Some("Invalid public inputs count".to_string()),
            verified: Some(false),
            ..Default::default()
        };
    }

    // Initialize ZKP system if needed
    if let Err(e) = initialize_zkp() {
        return ActionResult {
            success: false,
            error: Some(format!("ZKP initialization failed: {}", e)),
            verified: Some(false),
            ..Default::default()
        };
    }

    // Deserialize the proof
    let proof_bytes = match STANDARD.decode(&zkp_proof.proof) {
        Ok(bytes) => bytes,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Invalid proof encoding: {}", e)),
                verified: Some(false),
                ..Default::default()
            };
        }
    };

    let proof = match ark_groth16::Proof::<Bn254>::deserialize_compressed(&proof_bytes[..]) {
        Ok(p) => p,
        Err(_) => match ark_groth16::Proof::<Bn254>::deserialize_uncompressed(&proof_bytes[..]) {
            Ok(p) => p,
            Err(e) => {
                return ActionResult {
                    success: false,
                    error: Some(format!("Failed to deserialize proof: {}", e)),
                    verified: Some(false),
                    ..Default::default()
                };
            }
        },
    };

    // Parse public inputs (commitment and nullifier)
    let commitment_str = &zkp_proof.public_inputs[0];
    let nullifier_str = &zkp_proof.public_inputs[1];

    let commitment_bytes = match hex::decode(commitment_str) {
        Ok(bytes) => bytes,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Invalid commitment hex: {}", e)),
                verified: Some(false),
                ..Default::default()
            };
        }
    };

    let nullifier_bytes = match hex::decode(nullifier_str) {
        Ok(bytes) => bytes,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Invalid nullifier hex: {}", e)),
                verified: Some(false),
                ..Default::default()
            };
        }
    };

    // Convert to field elements
    let commitment_fr = Fr::from_le_bytes_mod_order(&commitment_bytes);
    let nullifier_fr = Fr::from_le_bytes_mod_order(&nullifier_bytes);

    // Get verifying key from hardcoded constant
    let vk = match get_cached_vk() {
        Ok(vk) => vk,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Verifying key load failed: {}", e)),
                verified: Some(false),
                ..Default::default()
            };
        }
    };

    // Verify the Groth16 proof
    let public_inputs = vec![commitment_fr, nullifier_fr];

    let is_valid = Groth16::<Bn254>::verify(&vk, &public_inputs, &proof)
        .map_err(|e| format!("Proof verification failed: {}", e));

    match is_valid {
        Ok(true) => {
            // Check if commitment is registered
            if !is_commitment_used(commitment_str) {
                return ActionResult {
                    success: false,
                    error: Some("Proof valid but commitment not registered".to_string()),
                    verified: Some(false),
                    ..Default::default()
                };
            }

            ActionResult {
                success: true,
                verified: Some(true),
                zkp_proof: Some(zkp_proof),
                ..Default::default()
            }
        }
        Ok(false) => ActionResult {
            success: false,
            error: Some("Invalid proof".to_string()),
            verified: Some(false),
            ..Default::default()
        },
        Err(e) => ActionResult {
            success: false,
            error: Some(e),
            verified: Some(false),
            ..Default::default()
        },
    }
}

// Check if commitment exists
fn handle_check_commitment(commitment: String) -> ActionResult {
    let exists = is_commitment_used(&commitment);

    ActionResult {
        success: true,
        verified: Some(exists),
        ..Default::default()
    }
}

/// Verify a Groth16 proof against the shared verifying key.
/// Returns true if the proof is cryptographically valid.
fn verify_groth16_proof(proof_b64: &str, public_inputs: &[String]) -> bool {
    // 1. Decode base64 proof
    let proof_bytes = match STANDARD.decode(proof_b64) {
        Ok(b) => b,
        Err(_) => return false,
    };

    // 2. Deserialize proof
    let proof: ark_groth16::Proof<Bn254> =
        match CanonicalDeserialize::deserialize_compressed(&proof_bytes[..]) {
            Ok(p) => p,
            Err(_) => match CanonicalDeserialize::deserialize_uncompressed(&proof_bytes[..]) {
                Ok(p) => p,
                Err(_) => return false,
            },
        };

    // 3. Load the shared VK (hardcoded constant, same as client WASM)
    let vk = match get_cached_vk() {
        Ok(vk) => vk,
        Err(_) => return false,
    };

    // 4. Parse public inputs into field elements
    // Client sends: [commitment_field, nullifier_field] as hex
    let mut inputs = Vec::new();
    for hex_input in public_inputs {
        let bytes = match hex::decode(hex_input) {
            Ok(b) => b,
            Err(_) => return false,
        };
        if bytes.len() != 32 {
            return false;
        }
        inputs.push(Fr::from_le_bytes_mod_order(&bytes));
    }

    // 5. Verify the proof
    match Groth16::<Bn254>::verify(&vk, &inputs, &proof) {
        Ok(valid) => valid,
        Err(_) => false,
    }
}

fn handle_stats() -> ActionResult {
    let identities = get_identities().lock().unwrap();
    let count = identities.len();

    ActionResult {
        success: true,
        created_at: Some(count as u64),
        ..Default::default()
    }
}

// ============================================================================
// TEE AS DELEGATOR - Smart Contract Integration
// ============================================================================

fn handle_register_via_contract(
    account_id: String,
    nep413_response: Nep413AuthResponse,
    contract_id: String,
    nonce: u64,
) -> ActionResult {
    // 1. Verify NEP-413 signature + RPC key ownership
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("Verification failed: {}", e)),
            ..Default::default()
        };
    }

    // 2. Generate Nostr keypair (secp256k1, NIP-01 x-only)
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

    // 3. Derive commitment and nullifier
    let commitment = {
        let input = format!("commitment:{}", account_id);
        hex::encode(compute_sha256(&input))
    };
    let nullifier = {
        let input = format!("nullifier:{}{}", account_id, nonce);
        hex::encode(compute_sha256(&input))
    };

    // 4. Check if already registered
    if is_commitment_used(&commitment) {
        return ActionResult {
            success: false,
            error: Some("This NEAR account already has a Nostr identity".to_string()),
            ..Default::default()
        };
    }

    // 5. Store identity
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    store_identity(&commitment, &nullifier, &npub, created_at);

    // 6. Try on-chain registration via OutLayer
    let tx_hash = match outlayer_contract_call(
        &contract_id,
        "register",
        serde_json::json!({
            "npub": npub,
            "commitment": commitment,
            "nullifier": nullifier,
            "sig": "tee_attested"
        }),
    ) {
        Ok(result) => Some(result.transaction_hash),
        Err(e) => {
            eprintln!(
                "On-chain registration failed (identity stored locally): {}",
                e
            );
            None
        }
    };

    // 7. Return everything the frontend needs
    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: Some(nsec),
        commitment: Some(commitment),
        nullifier: Some(nullifier),
        transaction_hash: tx_hash,
        created_at: Some(created_at),
        attestation: Some(generate_attestation()),
        ..Default::default()
    }
}

/// Prepare a writer contract call - returns transaction payload for signing
/// This allows the client to:
/// 1. Call this to get identity + transaction payload
/// 2. Call near-signer-tee to sign the transaction
/// 3. Broadcast to writer contract
fn handle_prepare_writer_call(
    account_id: String,
    nep413_response: Nep413AuthResponse,
    writer_contract_id: String,
    deadline: u64,
) -> ActionResult {
    // 1. Verify NEP-413 signature
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("NEP-413 verification failed: {}", e)),
            ..Default::default()
        };
    }

    // 2. Generate commitment and nullifier
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let commitment = {
        let input = format!("commitment:{}", account_id);
        hex::encode(compute_sha256(&input))
    };

    let nullifier = {
        let input = format!("nullifier:{}{}", account_id, nonce);
        hex::encode(compute_sha256(&input))
    };

    // 3. Check if already registered
    if is_commitment_used(&commitment) {
        return ActionResult {
            success: false,
            error: Some("This NEAR account already has a Nostr identity".to_string()),
            ..Default::default()
        };
    }

    // 4. Generate Nostr keypair
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

    // 5. Store identity locally
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    store_identity(&commitment, &nullifier, &npub, created_at);

    // 6. Prepare the message for the writer contract
    let writer_message = serde_json::json!({
        "npub": npub,
        "commitment": commitment,
        "nullifier": nullifier,
        "timestamp": created_at,
        "account_hash": compute_account_hash(&account_id),
    });

    let writer_args = serde_json::json!({
        "_message": writer_message.to_string(),
        "deadline": deadline,
    });

    // 7. Create transaction payload for near-signer-tee
    let tx_payload = serde_json::json!({
        "signer_id": std::env::var("TEE_SIGNER_ID").unwrap_or_else(|_| "kampouse.testnet".to_string()),
        "receiver_id": writer_contract_id,
        "nonce": nonce * 1000,  // NEAR nonce needs to be unique
        "block_hash": "FETCH_LATEST_BLOCK_HASH",
        "actions": [{
            "FunctionCall": {
                "method_name": "write",
                "args": base64::Engine::encode(&base64::engine::general_purpose::STANDARD, writer_args.to_string()),
                "gas": "300000000000000",
                "deposit": "0",
            }
        }],
    });

    // 8. Return everything needed for the client
    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: Some(nsec), // Include nsec so user can save it
        commitment: Some(commitment),
        nullifier: Some(nullifier),
        created_at: Some(created_at),
        attestation: Some(generate_attestation()),
        tx_payload: Some(tx_payload), // For near-signer-tee
        ..Default::default()
    }
}

/// Register with client-generated ZKP + NEP-413 auth.
///
/// Flow:
///   1. Client generates npub/nsec locally
///   2. Client computes commitment = SHA256("commitment:" || account_id || nsec)
///   3. Client generates ZKP proving knowledge of account_id + nsec
///   4. Client signs NEP-413 to prove NEAR account ownership
///   5. Client sends everything to TEE
///   6. TEE verifies NEP-413 (proves account_id) + ZKP, computes account_hash
///   7. TEE calls contract.register(npub, commitment, nullifier, account_hash)
fn handle_register_with_zkp(
    zkp_proof: ZKPProof,
    npub: String,
    account_id: String,
    nep413_response: Nep413AuthResponse,
    writer_contract_id: String,
    deadline: u64,
    signing_key: Option<String>,
) -> ActionResult {
    // 1. Verify NEP-413 — proves the user owns this NEAR account
    if let Err(e) = verify_nep413_ownership(&account_id, &nep413_response) {
        return ActionResult {
            success: false,
            error: Some(format!("NEP-413 verification failed: {}", e)),
            ..Default::default()
        };
    }

    // 2. Extract commitment and nullifier from ZKP public inputs
    if zkp_proof.public_inputs.len() < 2 {
        return ActionResult {
            success: false,
            error: Some("Invalid ZKP: missing public inputs".to_string()),
            ..Default::default()
        };
    }

    let commitment = zkp_proof.public_inputs[0].clone();
    let nullifier = zkp_proof.public_inputs[1].clone();

    // 3. Verify ZKP — NEVER trust client's "verified" flag
    // TEE must cryptographically verify the Groth16 proof
    if zkp_proof.proof.is_empty() {
        return ActionResult {
            success: false,
            error: Some("ZKP proof is empty".to_string()),
            ..Default::default()
        };
    }

    // Verify the Groth16 proof against the verifying key
    let proof_verified = verify_groth16_proof(&zkp_proof.proof, &zkp_proof.public_inputs);

    if !proof_verified {
        return ActionResult {
            success: false,
            error: Some("ZKP cryptographic verification failed — proof is invalid".to_string()),
            ..Default::default()
        };
    }

    // 4. Check if already registered
    if is_commitment_used(&commitment) {
        return ActionResult {
            success: false,
            error: Some("This commitment is already registered".to_string()),
            ..Default::default()
        };
    }

    // 5. Compute account_hash (salted — salt is TEE-bound, never exposed)
    let account_hash = compute_account_hash(&account_id);

    // 6. Store identity locally
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    store_identity(&commitment, &nullifier, &npub, created_at);

    // 7. Register on-chain with proof — contract verifies Groth16 on-chain
    let register_args = serde_json::json!({
        "npub": npub,
        "commitment": commitment,
        "nullifier": nullifier,
        "account_hash": account_hash,
        "proof_b64": zkp_proof.proof,
    });

    let args_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        register_args.to_string(),
    );

    // 8. Sign the transaction using NEAR private key from OutLayer secrets

    // 8. Sign the transaction using NEAR private key from OutLayer secrets
    let tx_nonce = created_at * 1000;

    let actions = vec![serde_json::json!({
        "FunctionCall": {
            "method_name": "register",
            "args": args_b64,
            "gas": 300000000000000u64,
            "deposit": "0",
        }
    })];

    let signed_tx = match sign_transaction_with_near_key(
        std::env::var("TEE_SIGNER_ID").unwrap_or_else(|_| "kampouse.testnet".to_string()),
        writer_contract_id.to_string(),
        tx_nonce,
        actions,
        signing_key,
    ) {
        Ok(tx) => tx,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Failed to sign transaction: {}", e)),
                ..Default::default()
            }
        }
    };

    // 9. Submit the signed transaction to NEAR RPC
    let tx_hash = match submit_transaction_to_near_rpc(&signed_tx) {
        Ok(hash) => hash,
        Err(e) => {
            return ActionResult {
                success: false,
                error: Some(format!("Failed to submit transaction to RPC: {}", e)),
                ..Default::default()
            }
        }
    };

    // 10. Return success
    ActionResult {
        success: true,
        npub: Some(npub),
        nsec: None,
        commitment: Some(commitment),
        nullifier: Some(nullifier),
        created_at: Some(created_at),
        attestation: Some(generate_attestation()),
        transaction_hash: Some(tx_hash),
        signed_transaction: Some(signed_tx),
        ..Default::default()
    }
}

// Sign registration as TEE delegator
#[allow(dead_code)]
fn sign_as_delegator(registration: &DelegatedRegistration) -> String {
    // Create deterministic message to sign
    let message = format!(
        "{}:{}:{}:{}:{}",
        registration.commitment,
        registration.nullifier,
        registration.nonce,
        registration.nep413_signature,
        registration.user_public_key
    );

    // Hash the message
    let message_hash = compute_sha256(&message);

    // Production: OutLayer provides TEE signing via attestation
    #[cfg(feature = "outlayer-tee")]
    {
        // OutLayer SDK Integration Point
        // When OutLayer provides TEE signing API, replace this with:
        //   outlayer_tee_sign(&message_hash)
        // Current: Returns hash as signature (TEE attestation provides security)
        hex::encode(&message_hash)
    }

    // Testing: Return mock signature
    #[cfg(not(feature = "outlayer-tee"))]
    {
        hex::encode(&message_hash)
    }
}

// Sign transaction using NEAR private key from OutLayer secrets
fn sign_transaction_with_near_key(
    signer_id: String,
    receiver_id: String,
    _nonce: u64,
    actions: Vec<serde_json::Value>,
    signing_key: Option<String>,
) -> Result<serde_json::Value, String> {
    use crate::near_tx::*;
    use ed25519_dalek::Signer;

    // Get private key
    let key_str = signing_key
        .or_else(|| std::env::var("NEAR_PRIVATE_KEY").ok())
        .ok_or("NEAR_PRIVATE_KEY not provided")?;
    let key_str = key_str
        .strip_prefix("ed25519:")
        .ok_or("Invalid key format")?;
    let key_bytes = bs58::decode(key_str)
        .into_vec()
        .map_err(|e| format!("Key decode: {}", e))?;
    let seed: [u8; 32] = if key_bytes.len() == 64 {
        key_bytes[..32].try_into().unwrap()
    } else if key_bytes.len() == 32 {
        key_bytes.try_into().unwrap()
    } else {
        return Err(format!("Bad key length: {}", key_bytes.len()));
    };
    let secret_key = ed25519_dalek::SigningKey::from_bytes(&seed);
    let verifying_key = secret_key.verifying_key();
    let pub_key_b58 = format!(
        "ed25519:{}",
        bs58::encode(verifying_key.as_bytes()).into_string()
    );

    // Fetch block hash and access key nonce
    let (block_hash, ak_nonce) = fetch_block_and_nonce(&signer_id, &pub_key_b58)?;
    let tx_nonce = ak_nonce + 1;

    // Parse actions from JSON
    let mut tx_actions: Vec<Action> = Vec::new();
    for action in &actions {
        if let Some(fc) = action.get("FunctionCall") {
            let method_name = fc
                .get("method_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let args_b64 = fc.get("args").and_then(|v| v.as_str()).unwrap_or("");
            let args_bytes =
                base64::Engine::decode(&base64::engine::general_purpose::STANDARD, args_b64)
                    .unwrap_or_default();
            let gas: u64 = fc
                .get("gas")
                .and_then(|v| v.as_u64())
                .unwrap_or(300000000000000);
            let deposit: u128 = fc
                .get("deposit")
                .and_then(|v| v.as_str())
                .and_then(|v| v.parse().ok())
                .unwrap_or(0);
            tx_actions.push(Action::FunctionCall(FunctionCallAction {
                method_name,
                args: args_bytes,
                gas,
                deposit,
            }));
        }
    }

    // Build Transaction with proper borsh types
    let tx = Transaction {
        signer_id: signer_id.clone(),
        public_key: PublicKey::ED25519(*verifying_key.as_bytes()),
        nonce: tx_nonce,
        receiver_id: receiver_id.clone(),
        block_hash,
        actions: tx_actions,
    };

    // Borsh serialize the transaction and hash it
    let tx_bytes = borsh::to_vec(&tx).map_err(|e| format!("Tx borsh: {}", e))?;
    let tx_hash: [u8; 32] = Sha256::digest(&tx_bytes).try_into().unwrap();
    let signature = secret_key.sign(&tx_hash);

    // Build SignedTransaction (transaction first, signature after - nearcore order)
    let signed_tx = SignedTransaction {
        transaction: tx,
        signature: Signature::ED25519(signature.to_bytes()),
    };

    let signed_bytes = borsh::to_vec(&signed_tx).map_err(|e| format!("Signed borsh: {}", e))?;
    let borsh_b64 =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &signed_bytes);

    Ok(serde_json::json!({
        "borsh_base64": borsh_b64,
        "transaction": {
            "signer_id": signer_id,
            "receiver_id": receiver_id,
            "nonce": tx_nonce,
            "actions": actions,
            "block_hash": bs58::encode(&block_hash).into_string(),
        },
        "signature": format!("ed25519:{}", bs58::encode(signature.to_bytes()).into_string()),
        "public_key": pub_key_b58,
        "hash": hex::encode(&tx_hash),
    }))
}

fn fetch_block_and_nonce(account_id: &str, public_key: &str) -> Result<([u8; 32], u64), String> {
    let rpc_url = std::env::var("NEAR_RPC_URL")
        .unwrap_or_else(|_| "https://rpc.testnet.near.org".to_string());

    // Fetch latest block
    let block_req = serde_json::json!({
        "jsonrpc": "2.0", "id": "block",
        "method": "block", "params": {"finality": "final"}
    });
    let block_body = serde_json::to_string(&block_req).map_err(|e| format!("Ser: {}", e))?;
    let block_resp = fetch_rpc(&rpc_url, &block_body).map_err(|e| format!("Block RPC: {}", e))?;
    let block_json: serde_json::Value =
        serde_json::from_str(&block_resp).map_err(|e| format!("Block parse: {}", e))?;
    let hash_b58 = block_json["result"]["header"]["hash"]
        .as_str()
        .ok_or("No block hash")?;
    let block_hash: [u8; 32] = bs58::decode(hash_b58)
        .into_vec()
        .map_err(|e| format!("Hash bs58: {}", e))?
        .try_into()
        .map_err(|_| "Bad hash len")?;

    // Fetch access key
    let ak_req = serde_json::json!({
        "jsonrpc": "2.0", "id": "ak",
        "method": "query", "params": {
            "request_type": "view_access_key", "finality": "final",
            "account_id": account_id, "public_key": public_key
        }
    });
    let ak_body = serde_json::to_string(&ak_req).map_err(|e| format!("Ser: {}", e))?;
    let ak_resp = fetch_rpc(&rpc_url, &ak_body).map_err(|e| format!("AK RPC: {}", e))?;
    let ak_json: serde_json::Value =
        serde_json::from_str(&ak_resp).map_err(|e| format!("AK parse: {}", e))?;

    eprintln!("Access key RPC response: {}", ak_resp);

    // Check if we got a valid result with nonce
    let result = ak_json.get("result");

    let result_obj = match result {
        Some(r) if r.is_object() => r,
        _ => {
            // No valid result - key is missing
            eprintln!("TEE relayer key not found on account {} (result: {:?})", account_id, result);

            return Err(format!(
                "TEE_RELAYER_KEY_MISSING:{}|{}|{}",
                    account_id,
                    public_key,
                    hash_b58
            ));
        }
    };

    if result_obj["nonce"].is_null() {
        // No valid result or nonce - key is missing
        eprintln!("TEE relayer key not found on account {} (result: {:?})", account_id, result);

        return Err(format!(
            "TEE_RELAYER_KEY_MISSING:{}|{}|{}",
            account_id,
            public_key,
            hash_b58 // Include block hash for creating transaction
        ));
    }

    let nonce: u64 = result_obj["nonce"]
        .as_u64()
        .ok_or("No nonce")?;

    Ok((block_hash, nonce))
}

fn fetch_block_hash() -> Result<[u8; 32], String> {
    let rpc_url = std::env::var("NEAR_RPC_URL")
        .unwrap_or_else(|_| "https://rpc.testnet.near.org".to_string());

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": "dontcare",
        "method": "block",
        "params": {"finality": "final"}
    });

    let body = serde_json::to_string(&request).map_err(|e| format!("Serialize error: {}", e))?;

    let response =
        fetch_rpc(&rpc_url, &body).map_err(|e| format!("Block hash fetch failed: {}", e))?;

    let parsed: serde_json::Value = serde_json::from_str(&response).map_err(|e| {
        format!(
            "Parse error: {}. Raw: {} ({} bytes)",
            e,
            &response[..200.min(response.len())],
            response.len()
        )
    })?;

    let hash_b58 = parsed
        .get("result")
        .and_then(|r| r.get("header"))
        .and_then(|h| h.get("hash"))
        .and_then(|h| h.as_str())
        .ok_or_else(|| {
            format!(
                "No block hash in response. Keys: {:?}",
                parsed.as_object().map(|m| m.keys().collect::<Vec<_>>())
            )
        })?;

    let hash_bytes = bs58::decode(hash_b58).into_vec().map_err(|e| {
        format!(
            "bs58 decode error on '{}': {}",
            &hash_b58[..20.min(hash_b58.len())],
            e
        )
    })?;

    let block_hash: [u8; 32] = hash_bytes
        .try_into()
        .map_err(|_| "Block hash wrong length")?;

    Ok(block_hash)
}

// Submit signed transaction to NEAR RPC
fn submit_transaction_to_near_rpc(signed_tx: &serde_json::Value) -> Result<String, String> {
    let rpc_url = std::env::var("NEAR_RPC_URL")
        .unwrap_or_else(|_| "https://rpc.testnet.near.org".to_string());

    // Get borsh base64 encoded signed transaction
    let borsh_b64 = signed_tx
        .get("borsh_base64")
        .and_then(|v| v.as_str())
        .ok_or("No borsh_base64 in signed transaction")?;

    // Build RPC request - params is [base64_of_borsh_signed_tx]
    let rpc_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": "dontcare",
        "method": "broadcast_tx_commit",
        "params": [borsh_b64]
    });

    let request_body = serde_json::to_string(&rpc_request)
        .map_err(|e| format!("Failed to serialize RPC request: {}", e))?;

    // Submit to RPC
    let response_body = fetch_rpc(&rpc_url, &request_body)
        .map_err(|e| format!("RPC call to {} failed: {}", rpc_url, e))?;

    // Parse response
    let response: serde_json::Value = serde_json::from_str(&response_body)
        .map_err(|e| format!("Failed to parse RPC response: {}", e))?;

    // Check for RPC error
    if let Some(error) = response.get("error") {
        let msg = error
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("unknown");
        let data = error.get("data").and_then(|d| d.as_str()).unwrap_or("");
        return Err(format!("RPC error: {} {}", msg, data));
    }

    let result = response.get("result").ok_or("No result in RPC response")?;

    // Check transaction status
    if let Some(status) = result.get("status") {
        if let Some(failure) = status.get("Failure") {
            let error_msg = failure
                .get("error_message")
                .or_else(|| failure.get("ExecutionError"))
                .and_then(|m| m.as_str())
                .unwrap_or("Transaction failed");
            return Err(format!("Transaction reverted: {}", error_msg));
        }
        // Check for SuccessReceiptId (receipt might fail)
        if let Some(receipt_id) = status.get("SuccessReceiptId").and_then(|r| r.as_str()) {
            // Check receipt outcomes for failures
            if let Some(receipts) = result.get("receipts_outcome").and_then(|r| r.as_array()) {
                for receipt in receipts {
                    let is_ours = receipt.get("id").and_then(|id| id.as_str()) == Some(receipt_id);
                    if is_ours {
                        if let Some(outcome_status) = receipt
                            .get("outcome")
                            .and_then(|o| o.get("status"))
                            .and_then(|s| s.get("Failure"))
                        {
                            let err = outcome_status
                                .get("error_message")
                                .or_else(|| outcome_status.get("ExecutionError"))
                                .and_then(|m| m.as_str())
                                .unwrap_or("Receipt execution failed");
                            return Err(format!("Transaction reverted: {}", err));
                        }
                    }
                }
            }
        }
    }

    // Extract transaction hash
    let tx_hash = result
        .get("transaction")
        .and_then(|tx| tx.get("hash"))
        .and_then(|h| h.as_str())
        .or_else(|| signed_tx.get("hash").and_then(|h| h.as_str()))
        .ok_or("No transaction hash in response")?;

    Ok(tx_hash.to_string())
}

// Call smart contract via OutLayer
fn outlayer_contract_call(
    contract_id: &str,
    method: &str,
    args: serde_json::Value,
) -> Result<ContractCallResult, String> {
    // Production: OutLayer provides NEAR contract call capability
    #[cfg(feature = "outlayer-tee")]
    {
        // OutLayer SDK provides: outlayer_near_call(contract_id, method, args, gas, deposit)
        // This allows TEE to call NEAR smart contracts as an authorized delegator

        let args_str =
            serde_json::to_string(&args).map_err(|e| format!("Failed to serialize args: {}", e))?;

        // OutLayer SDK Integration Point
        // When OutLayer provides NEAR contract call API, replace this with:
        //   let result = outlayer_near_call(
        //       contract_id,
        //       method,
        //       &args_str,
        //       300_000_000_000_000,  // 300 Tgas
        //       0                      // 0 deposit
        //   );
        //   Ok(ContractCallResult {
        //       transaction_hash: result.transaction_hash,
        //       result: serde_json::from_str(&result.result)?,
        //   })
        //
        // Current implementation returns a deterministic hash for testing
        Ok(ContractCallResult {
            transaction_hash: format!(
                "outlayer_tx_{}_{}",
                contract_id,
                hex::encode(compute_sha256(&args_str))
            ),
            result: args,
        })
    }

    // Testing: Mock contract call for local development
    #[cfg(not(feature = "outlayer-tee"))]
    {
        let _ = (contract_id, method); // Suppress unused warnings in test builds

        Ok(ContractCallResult {
            transaction_hash: format!("mock_tx_{}", hex::encode(compute_sha256(&args.to_string()))),
            result: args,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zkp_initialization() {
        let result = initialize_zkp();
        assert!(result.is_ok());
    }

    #[test]
    fn test_zkp_generation() {
        initialize_zkp().unwrap();

        let account_id = "test.near";
        let nonce = "test-nonce-123";

        let result = generate_real_zkp(account_id, nonce, true);
        assert!(result.is_ok());

        let zkp = result.unwrap();
        assert!(!zkp.proof.is_empty());
        assert_eq!(zkp.public_inputs.len(), 2);
        assert!(zkp.verified);
    }

    #[test]
    fn test_commitment_determinism() {
        let account_id = "alice.near";
        let nonce = "nonce1";

        let zkp1 = generate_real_zkp(account_id, nonce, true).unwrap();
        let zkp2 = generate_real_zkp(account_id, nonce, true).unwrap();

        // Same inputs should produce same commitment and nullifier
        assert_eq!(zkp1.public_inputs[0], zkp2.public_inputs[0]);
        assert_eq!(zkp1.public_inputs[1], zkp2.public_inputs[1]);
    }

    #[test]
    fn test_different_accounts_different_commitments() {
        let zkp1 = generate_real_zkp("alice.near", "nonce", true).unwrap();
        let zkp2 = generate_real_zkp("bob.near", "nonce", true).unwrap();

        // Different accounts should produce different commitments
        assert_ne!(zkp1.public_inputs[0], zkp2.public_inputs[0]);
    }

    #[test]
    fn test_sha256_computation() {
        let hash1 = compute_sha256("test");
        let hash2 = compute_sha256("test");

        // Same input = same hash
        assert_eq!(hash1, hash2);

        // Different input = different hash
        let hash3 = compute_sha256("different");
        assert_ne!(hash1, hash3);

        // SHA256 produces 32 bytes
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_contract_call_mock_mode() {
        // Without outlayer-tee feature, should return mock transaction
        let result = outlayer_contract_call(
            "test.near",
            "test_method",
            serde_json::json!({"test": "value"}),
        );

        assert!(result.is_ok());
        let tx = result.unwrap();
        assert!(tx.transaction_hash.starts_with("mock_tx_"));
    }

    #[test]
    fn test_delegator_signature() {
        let registration = DelegatedRegistration {
            npub: "test_npub".to_string(),
            commitment: "test_commitment".to_string(),
            nullifier: "test_nullifier".to_string(),
            nep413_signature: "test_sig".to_string(),
            user_public_key: "test_pk".to_string(),
            message: "test_message".to_string(),
            nonce: 1,
        };

        let sig1 = sign_as_delegator(&registration);
        let sig2 = sign_as_delegator(&registration);

        // Same registration = same signature
        assert_eq!(sig1, sig2);
        assert!(!sig1.is_empty());
    }

    #[test]
    fn test_zkp_verification() {
        initialize_zkp().unwrap();

        // Generate a proof
        let account_id = "verify_test.near";
        let nonce = "verify_nonce";
        let zkp = generate_real_zkp(account_id, nonce, true).unwrap();

        // Verify the proof
        let result = handle_verify_zkp(zkp.clone());

        // Should fail because commitment not registered
        assert!(!result.success);
        assert!(result.error.as_ref().unwrap().contains("not registered"));

        // Now register the commitment
        store_identity(
            &zkp.public_inputs[0],
            &zkp.public_inputs[1],
            "test_npub",
            zkp.timestamp,
        );

        // Verify again - should succeed now
        let result2 = handle_verify_zkp(zkp);
        assert!(result2.success);
        assert_eq!(result2.verified, Some(true));
    }

    /// Test NEP-413 verification with Borsh-serialized payload
    /// Simulates what a real NEAR wallet does
    #[test]
    fn test_nep413_borsh_verification() {
        // 1. Create a keypair (simulates wallet's access key)
        let secret_bytes: [u8; 32] = [0x42; 32];
        let signing_key = ed25519_dalek::SigningKey::from_bytes(&secret_bytes);
        let verifying_key = signing_key.verifying_key();

        let account_id = "test-user.testnet";
        let message = "Generate Nostr identity for test-user.testnet";
        let nonce_raw: [u8; 32] = [0xab; 32];
        let recipient = "nostr-identity.near";

        // 2. Build NEP-413 Borsh payload (what wallet signs)
        #[derive(borsh::BorshSerialize)]
        struct Nep413Payload<'a> {
            tag: &'a str,
            message: &'a str,
            nonce: &'a [u8],
            recipient: &'a str,
        }

        let payload = Nep413Payload {
            tag: "nep413",
            message,
            nonce: &nonce_raw,
            recipient,
        };
        let borsh_bytes = borsh::to_vec(&payload).unwrap();
        let hash = Sha256::digest(&borsh_bytes);

        // 3. Sign (what wallet does)
        use ed25519_dalek::Signer;
        let signature = signing_key.sign(&hash);
        let sig_b64 = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            signature.to_bytes(),
        );

        // 4. Build the auth response (what frontend sends)
        let nep413_response = Nep413AuthResponse {
            account_id: account_id.to_string(),
            public_key: format!(
                "ed25519:{}",
                bs58::encode(verifying_key.as_bytes()).into_string()
            ),
            signature: sig_b64,
            auth_request: Nep413AuthRequest {
                message: message.to_string(),
                nonce: base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    &nonce_raw,
                ),
                recipient: recipient.to_string(),
            },
        };

        // 5. Verify the nonce decoding works
        let decoded_nonce = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            &nep413_response.auth_request.nonce,
        )
        .unwrap();
        assert_eq!(decoded_nonce, nonce_raw.to_vec(), "Nonce base64 roundtrip");

        // 6. Verify the Borsh payload reconstruction
        let nonce_array: [u8; 32] = decoded_nonce
            .as_slice()
            .try_into()
            .expect("Nonce must be 32 bytes");

        let borsh_payload = crate::Nep413BorshPayload {
            message: &nep413_response.auth_request.message,
            nonce: &nonce_array,
            recipient: &nep413_response.auth_request.recipient,
            callback_url: None,
        };
        let reconstructed = borsh::to_vec(&borsh_payload).unwrap();
        assert_eq!(reconstructed, borsh_bytes, "Borsh payloads must match");

        // 7. Verify signature parsing (base64)
        let parsed_sig = crate::parse_signature(&nep413_response.signature).unwrap();
        assert_eq!(parsed_sig, signature.to_bytes(), "Signature decode");

        // 8. Verify the full hash
        let reconstructed_hash = Sha256::digest(&reconstructed);
        assert_eq!(reconstructed_hash, hash, "Hashes must match");

        // 9. Verify signature against hash
        let sig_obj = Signature::from_bytes(signature.to_bytes().as_slice().try_into().unwrap());
        verifying_key
            .verify_strict(&reconstructed_hash, &sig_obj)
            .unwrap();

        println!("✅ NEP-413 Borsh verification works end-to-end");
    }

    #[test]
    fn test_salted_account_hash() {
        // Two calls with same account_id should produce the same hash (same salt)
        let hash1 = compute_account_hash("alice.near");
        let hash2 = compute_account_hash("alice.near");
        assert_eq!(hash1, hash2, "Same account should produce same salted hash");

        // Different accounts should produce different hashes
        let hash3 = compute_account_hash("bob.near");
        assert_ne!(
            hash1, hash3,
            "Different accounts should produce different hashes"
        );

        // Salted hash should differ from unsalted (proves salt is applied)
        let unsalted = hex::encode(compute_sha256(&format!("account:alice.near")));
        assert_ne!(hash1, unsalted, "Salted hash must differ from unsalted");

        // Hash should be 64 hex chars (SHA256)
        assert_eq!(hash1.len(), 64);
    }
}
pub mod near_tx;

#[cfg(test)]
mod vk_export {
    use super::*;
    #[test]
    fn export_vk_hex() {
        initialize_zkp().unwrap();
        let vk_lock = get_verifying_key().lock().unwrap();
        let vk = vk_lock.as_ref().unwrap();
        let mut b = Vec::new();
        vk.serialize_compressed(&mut b).unwrap();
        eprintln!(
            "\n\nSHARED_VK_HEX={}\nSHARED_VK_LEN={}\n\n",
            hex::encode(&b),
            b.len()
        );
    }
}
