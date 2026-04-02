use ed25519_dalek::Signer;
use std::process;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    match args.get(1).map(|s| s.as_str()) {
        Some("sign") => {
            let key_index: usize = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
            
            let keys = [
                // Key 0: test-validation.near
                ("ed25519:4p7N1W15ZTNk8e6uionpr5jc1CpFmdsmVcaTeR55fxoNeTU5CcJX82hUDAToFrfeUvxS5uUchmzHJXNp91r5L95v",
                 "ed25519:C4W13iNQ5Qre5VdTsobj2v3Xp47tUdTGg4ek7htstE6g",
                 "test-validation.near"),
                // Key 1: test-writer.near
                ("ed25519:2wfKzKVyGWwoYVZ2Kj9HcWRpnq3NScTuRs2ZqvxuNwX3tk4hUPqR1fK27SKG64Nd8HSNJm1nWc3rQDjj1vf3Uq2p",
                 "ed25519:Bhwrm7J1VD6YS3cNxpTv6xpApGcjvXbmAGottR5v6kZW",
                 "test-writer.near"),
                // Key 2: kampouse.testnet (funded on testnet)
                ("REDACTED",
                 "ed25519:Eqp85WhR2xvT3SMMLzHvLue44bm7GuW2WPgKUx3yizuy",
                 "kampouse.testnet"),
            ];
            
            let (private_key, public_key, account_id) = &keys[key_index % keys.len()];
            let message = args.get(3).map(|s| s.as_str()).unwrap_or("Verify NEAR account ownership for Nostr identity");
            let nonce = args.get(4).map(|s| s.as_str()).unwrap_or("test-nonce-12345");
            let recipient = "nostr-identity.kampouse.testnet";

            // Parse private key
            let key_str = private_key.strip_prefix("ed25519:").unwrap();
            let key_bytes = bs58::decode(key_str).into_vec().unwrap();
            let seed: [u8; 32] = key_bytes[..32].try_into().unwrap();
            let signing_key = ed25519_dalek::SigningKey::from_bytes(&seed);

            // Build NEP-413 message
            let nep413_message = serde_json::json!({
                "message": message,
                "nonce": nonce,
                "recipient": recipient
            });
            let message_str = serde_json::to_string(&nep413_message).unwrap();

            // Hash with SHA-256 (NEP-413 spec)
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(message_str.as_bytes());
            let hash = hasher.finalize();
            let hash_array: [u8; 32] = hash.try_into().unwrap();

            let signature = signing_key.sign(&hash_array);

            let response = serde_json::json!({
                "account_id": account_id,
                "public_key": public_key,
                "signature": format!("ed25519:{}", bs58::encode(signature.to_bytes()).into_string()),
                "authRequest": {
                    "message": message,
                    "nonce": nonce,
                    "recipient": recipient
                }
            });

            println!("{}", serde_json::to_string(&response).unwrap());
        }
        Some("keyinfo") => {
            let key_index: usize = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
            let keys = [
                ("ed25519:4p7N1W15ZTNk8e6uionpr5jc1CpFmdsmVcaTeR55fxoNeTU5CcJX82hUDAToFrfeUvxS5uUchmzHJXNp91r5L95v",
                 "ed25519:C4W13iNQ5Qre5VdTsobj2v3Xp47tUdTGg4ek7htstE6g",
                 "test-validation.near"),
                ("ed25519:2wfKzKVyGWwoYVZ2Kj9HcWRpnq3NScTuRs2ZqvxuNwX3tk4hUPqR1fK27SKG64Nd8HSNJm1nWc3rQDjj1vf3Uq2p",
                 "ed25519:Bhwrm7J1VD6YS3cNxpTv6xpApGcjvXbmAGottR5v6kZW",
                 "test-writer.near"),
            ];
            let (pk, pubk, acc) = &keys[key_index % keys.len()];
            println!("{}", serde_json::json!({
                "private_key": pk,
                "public_key": pubk,
                "account_id": acc
            }).to_string());
        }
        _ => {
            eprintln!("Usage: test_helper sign [key_index] [message] [nonce]");
            eprintln!("       test_helper keyinfo [key_index]");
            eprintln!("       key_index: 0=test-validation.near, 1=test-writer.near");
            process::exit(1);
        }
    }
}
