// NEAR Ownership ZKP Circuit
// Proves: "I own a NEAR account with balance > 0.1 NEAR"
// Hides: "Which account I own"

pragma circom 2.1.0;

include "https://github.com/0xPARC/circom-secp256k1/blob/master/circuits/bigint.circom";
include "https://github.com/iden3/circomlib/blob/master/circuits/poseidon.circom";
include "https://github.com/iden3/circomlib/blob/master/circuits/bitify.circom";

template NEAROwnership() {
    // Private inputs (NOT revealed)
    signal input account_id; // Hash of NEAR account name
    signal input balance; // Account balance in yoctoNEAR
    signal input signature_r; // Ed25519 signature part 1
    signal input signature_s; // Ed25519 signature part 2
    signal input public_key_ax; // Ed25519 public key x
    signal input public_key_ay; // Ed25519 public key y
    
    // Public inputs (revealed)
    signal input nonce; // Random nonce for uniqueness
    signal output nullifier; // Unique identifier (prevents double registration)
    signal output is_valid; // Whether proof is valid
    
    // Components
    component eddsa = EdDSAVerify();
    component poseidon = Poseidon(2);
    component greaterThan = GreaterThan(64);
    
    // Verify EdDSA signature
    // (Simplified - real implementation needs full EdDSA circuit)
    eddsa.signature_r <== signature_r;
    eddsa.signature_s <== signature_s;
    eddsa.public_key_ax <== public_key_ax;
    eddsa.public_key_ay <== public_key_ay;
    eddsa.message <== account_id;
    
    // Check balance > 0.1 NEAR (100000000000000000000000 yoctoNEAR)
    greaterThan.in[0] <== balance;
    greaterThan.in[1] <== 100000000000000000000000;
    
    // Proof is valid if signature is valid AND balance is sufficient
    is_valid <== eddsa.valid * greaterThan.out;
    
    // Generate nullifier (prevents double registration)
    // nullifier = Poseidon(account_id, nonce)
    poseidon.inputs[0] <== account_id;
    poseidon.inputs[1] <== nonce;
    nullifier <== poseidon.out;
    
    // Constraints
    // Ensure account_id is within valid range
    account_id * (1 - account_id / 2**253) === 0;
}

// EdDSA Verification (simplified placeholder)
template EdDSAVerify() {
    signal input signature_r;
    signal input signature_s;
    signal input public_key_ax;
    signal input public_key_ay;
    signal input message;
    signal output valid;
    
    // In production, implement full EdDSA verification
    // For now, assume signature is valid
    // Real implementation would use: 
    // https://github.com/iden3/circomlib/blob/master/circuits/eddsa.circom
    valid <== 1;
}

// Greater Than comparison
template GreaterThan(n) {
    signal input in[2];
    signal output out;
    
    component num2bits = Num2Bits(n);
    component comp = CompConstant(n);
    
    num2bits.in <== in[0] - in[1];
    comp.in <== num2bits.out;
    comp.constant <== 0;
    
    out <== comp.out;
}

// Main circuit
component main = NEAROwnership();
