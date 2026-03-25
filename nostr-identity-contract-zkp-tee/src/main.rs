//! Nostr Identity ZKP-TEE - WASI P1 Entry Point
//!
//! Generates ZKP proofs inside TEE for anonymous identity creation.

use nostr_identity_zkp_tee::{handle_action, Action};
use std::io::{self, Read, Write};

fn main() {
    // Read input from stdin
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .expect("Failed to read stdin");

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
            io::stdout().write_all(output.as_bytes()).ok();
            return;
        }
    };

    // Execute action
    let result = handle_action(action);

    // Write output to stdout
    let output = serde_json::to_string(&result).unwrap();
    io::stdout()
        .write_all(output.as_bytes())
        .expect("Failed to write stdout");
}
