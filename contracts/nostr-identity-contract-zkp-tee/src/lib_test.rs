// Test version - accepts key via input (INSECURE - TESTING ONLY)

fn sign_transaction_with_near_key_test(
    signer_id: String,
    receiver_id: String,
    nonce: u64,
    actions: Vec<serde_json::Value>,
    private_key: Option<String>,  // Accept via input
) -> Result<serde_json::Value, String> {
    use sha2::{Sha256, Digest};
    use ed25519_dalek::Signer;

    // Get private key from input OR environment
    let key_str = private_key
        .or_else(|| std::env::var("NEAR_PRIVATE_KEY").ok())
        .ok_or("NEAR_PRIVATE_KEY not provided")?;

    // Rest is same...
    let key_str = key_str.strip_prefix("ed25519:")
        .ok_or("Invalid key format")?;
    let key_bytes = bs58::decode(key_str)
        .into_vec()
        .map_err(|e| format!("Failed to decode key: {}", e))?;

    let secret_key = ed25519_dalek::SigningKey::from_bytes(
        &key_bytes.try_into()
            .map_err(|_| "Invalid key length")?
    );

    // Build and sign transaction...
    let mut tx_data = Vec::new();
    tx_data.extend_from_slice(signer_id.as_bytes());
    tx_data.extend_from_slice(receiver_id.as_bytes());
    tx_data.extend_from_slice(&nonce.to_le_bytes());
    for action in &actions {
        tx_data.extend_from_slice(&action.to_string().as_bytes());
    }

    let mut hasher = Sha256::new();
    hasher.update(&tx_data);
    let tx_hash = hasher.finalize();
    let tx_hash_array: [u8; 32] = tx_hash.try_into().map_err(|_| "Hash length mismatch")?;
    let signature = secret_key.sign(&tx_hash_array);

    Ok(serde_json::json!({
        "transaction": {
            "signer_id": signer_id,
            "receiver_id": receiver_id,
            "nonce": nonce,
            "actions": actions,
        },
        "signature": format!("ed25519:{}", bs58::encode(signature.to_bytes()).into_string()),
        "public_key": format!("ed25519:{}", bs58::encode(secret_key.verifying_key().as_bytes()).into_string()),
        "hash": hex::encode(tx_hash),
    }))
}
