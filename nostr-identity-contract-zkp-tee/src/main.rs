//! Nostr Identity ZKP-TEE - REAL Zero-Knowledge Proofs
//!
//! Uses Arkworks Groth16 for mathematical zero-knowledge proofs.

use nostr_identity_zkp_tee::{handle_action, Action};
use std::io::{self, Read, Write};

fn main() {
    // Read input from stdin
    let mut input = String::new();
    if let Err(e) = io::stdin().read_to_string(&mut input) {
        let error_response = serde_json::json!({
            "success": false,
            "error": format!("Failed to read stdin: {}", e)
        });
        let _ = io::stdout().write_all(serde_json::to_string(&error_response).unwrap().as_bytes());
        return;
    }

    // Parse action
    let action: Action = match serde_json::from_str(&input) {
        Ok(a) => a,
        Err(e) => {
            let result = nostr_identity_zkp_tee::ActionResult {
                success: false,
                error: Some(format!("Invalid input: {}", e)),
                ..Default::default()
            };
            let output = serde_json::to_string(&result).unwrap();
            let _ = io::stdout().write_all(output.as_bytes());
            return;
        }
    };

    // Execute action
    let result = handle_action(action);

    // Write output to stdout
    let output = match serde_json::to_string(&result) {
        Ok(s) => s,
        Err(e) => {
            let error_response = serde_json::json!({
                "success": false,
                "error": format!("Failed to serialize response: {}", e)
            });
            serde_json::to_string(&error_response).unwrap()
        }
    };
    
    if let Err(e) = io::stdout().write_all(output.as_bytes()) {
        eprintln!("Failed to write stdout: {}", e);
    }
}
