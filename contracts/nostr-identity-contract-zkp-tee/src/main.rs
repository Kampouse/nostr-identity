//! Nostr Identity ZKP-TEE - REAL Zero-Knowledge Proofs
//!
//! Uses Arkworks Groth16 for mathematical zero-knowledge proofs.

use nostr_identity_zkp_tee::{handle_action, Action};
use std::io::{self, Read, Write};

fn main() {
    // Set panic handler to log panics before crashing
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("❌ TEE PANIC: {}", panic_info);
        if let Some(location) = panic_info.location() {
            eprintln!("   Location: {}:{}:{}", location.file(), location.line(), location.column());
        }
    }));

    // Read input from stdin
    // Read input from stdin
    let mut input = String::new();
    eprintln!("🔵 DEBUG: Reading stdin...");
    if let Err(e) = io::stdin().read_to_string(&mut input) {
        let error_response = serde_json::json!({
            "success": false,
            "error": format!("Failed to read stdin: {}", e)
        });
        let _ = io::stdout().write_all(serde_json::to_string(&error_response).unwrap().as_bytes());
        return;
    }
    eprintln!("🔵 DEBUG: Stdin read, input length: {}", input.len());

    // Parse action
    eprintln!("🔵 DEBUG: Parsing action...");
    let action: Action = match serde_json::from_str(&input) {
        Ok(a) => a,
        Err(e) => {
            eprintln!("🔵 DEBUG: Parse failed: {}", e);
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
    eprintln!("🔵 DEBUG: Action parsed successfully");

    // Execute action (with panic catching)
    eprintln!("🔵 DEBUG: Executing action...");
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        handle_action(action)
    })).unwrap_or_else(|panic_info| {
        eprintln!("❌ TEE PANIC CAUGHT: {:?}", panic_info);
        nostr_identity_zkp_tee::ActionResult {
            success: false,
            error: Some(format!("TEE internal error: operation panicked - {:?}", panic_info)),
            ..Default::default()
        }
    });
    eprintln!("🔵 DEBUG: Action executed");

    // Log result for debugging
    if result.success {
        eprintln!("✅ TEE operation successful");
    } else {
        eprintln!("❌ TEE operation failed: {:?}", result.error);
    }

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
