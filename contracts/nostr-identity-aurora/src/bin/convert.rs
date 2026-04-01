use ark_bn254::{Bn254, Fq, Fq2, G1Affine, G2Affine, Fr, G1Projective, G2Projective};
use ark_ec::{AffineRepr, CurveGroup};
use ark_ff::{One, Zero, PrimeField, Field};
use ark_groth16::{Proof, VerifyingKey};
use ark_serialize::CanonicalSerialize;
use num_bigint::BigInt;
use std::io::Write;

fn main() {
    let vk_json: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string("/tmp/circom-identity/verification_key.json").unwrap()
    ).unwrap();
    
    let proof_json: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string("/tmp/circom-identity/proof.json").unwrap()
    ).unwrap();
    
    let public_json: Vec<String> = serde_json::from_str(
        &std::fs::read_to_string("/tmp/circom-identity/public.json").unwrap()
    ).unwrap();

    let vk = parse_vk(&vk_json);
    let proof = parse_proof(&proof_json);
    
    // Parse public inputs to Fr
    let public_inputs: Vec<Fr> = public_json.iter().map(|s| parse_fr(s)).collect();

    // Compute ic_sum = IC[0] + sum(input_i * IC[i+1])
    let mut ic_sum = G1Projective::from(vk.gamma_abc_g1[0]);
    for (i, input) in public_inputs.iter().enumerate() {
        let scalar_mul = G1Projective::from(vk.gamma_abc_g1[i + 1]) * input;
        ic_sum += scalar_mul;
    }
    let ic_sum_affine = G1Affine::from(ic_sum);

    // Verify locally
    let pvk = ark_groth16::prepare_verifying_key(&vk);
    let valid = ark_groth16::Groth16::<Bn254>::verify_proof(&pvk, &proof, &public_inputs).unwrap();
    println!("Local verification: {}", if valid { "VALID ✅" } else { "INVALID ❌" });

    // Build pairing input for NEAR alt_bn128_pairing_check
    // Equation: e(-alpha, beta) * e(-ic_sum, gamma) * e(-proof_c, delta) * e(proof_a, proof_b) == 1
    // 4 tuples of (G1[64], G2[128]) = 768 bytes
    
    let neg_alpha = negate_g1(vk.alpha_g1);
    let neg_ic_sum = negate_g1(ic_sum_affine);
    let neg_proof_c = negate_g1(proof.c);
    
    let mut pairing_input = Vec::with_capacity(768);
    
    // Tuple 1: (-alpha_g1, beta_g2)
    pairing_input.extend_from_slice(&encode_g1(&neg_alpha));
    pairing_input.extend_from_slice(&encode_g2(&vk.beta_g2));
    
    // Tuple 2: (-ic_sum, gamma_g2)
    pairing_input.extend_from_slice(&encode_g1(&neg_ic_sum));
    pairing_input.extend_from_slice(&encode_g2(&vk.gamma_g2));
    
    // Tuple 3: (-proof_c, delta_g2)
    pairing_input.extend_from_slice(&encode_g1(&neg_proof_c));
    pairing_input.extend_from_slice(&encode_g2(&vk.delta_g2));
    
    // Tuple 4: (proof_a, proof_b)
    pairing_input.extend_from_slice(&encode_g1(&proof.a));
    pairing_input.extend_from_slice(&encode_g2(&proof.b));
    
    assert_eq!(pairing_input.len(), 768);
    
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &pairing_input);
    std::fs::write("/tmp/circom-identity/pairing_input.b64", &b64).unwrap();
    std::fs::write("/tmp/circom-identity/pairing_input.bin", &pairing_input).unwrap();
    
    println!("Pairing input: {} bytes, written to pairing_input.b64", pairing_input.len());
}

fn negate_g1(p: G1Affine) -> G1Affine {
    if p.is_zero() { return p; }
    let mut neg = p;
    neg.y = -neg.y;
    neg
}

fn encode_g1(p: &G1Affine) -> [u8; 64] {
    let mut buf = [0u8; 64];
    let x = p.x;
    let y = p.y;
    // Serialize as big-endian 32 bytes each
    x.serialize_uncompressed(&mut buf[0..32]).unwrap();
    y.serialize_uncompressed(&mut buf[32..64]).unwrap();
    buf
}

fn encode_g2(p: &G2Affine) -> [u8; 128] {
    let mut buf = [0u8; 128];
    // G2 = Fq2 x, Fq2 y
    // Fq2 = (c0, c1)
    // EVM format: x_c0(32) | x_c1(32) | y_c0(32) | y_c1(32)
    p.x.c0.serialize_uncompressed(&mut buf[0..32]).unwrap();
    p.x.c1.serialize_uncompressed(&mut buf[32..64]).unwrap();
    p.y.c0.serialize_uncompressed(&mut buf[64..96]).unwrap();
    p.y.c1.serialize_uncompressed(&mut buf[96..128]).unwrap();
    buf
}

fn parse_vk(json: &serde_json::Value) -> VerifyingKey<Bn254> {
    VerifyingKey {
        alpha_g1: parse_g1(json["vk_alpha_1"].as_array().unwrap()),
        beta_g2: parse_g2(json["vk_beta_2"].as_array().unwrap()),
        gamma_g2: parse_g2(json["vk_gamma_2"].as_array().unwrap()),
        delta_g2: parse_g2(json["vk_delta_2"].as_array().unwrap()),
        gamma_abc_g1: json["IC"].as_array().unwrap()
            .iter().map(|p| parse_g1(p.as_array().unwrap())).collect(),
    }
}

fn parse_proof(json: &serde_json::Value) -> Proof<Bn254> {
    Proof {
        a: parse_g1(json["pi_a"].as_array().unwrap()),
        b: parse_g2(json["pi_b"].as_array().unwrap()),
        c: parse_g1(json["pi_c"].as_array().unwrap()),
    }
}

fn parse_g1(arr: &[serde_json::Value]) -> G1Affine {
    let x = parse_fq(arr[0].as_str().unwrap());
    let y = parse_fq(arr[1].as_str().unwrap());
    if x.is_zero() && y.is_zero() { G1Affine::zero() }
    else { G1Affine::new_unchecked(x, y) }
}

fn parse_g2(arr: &[serde_json::Value]) -> G2Affine {
    let x = parse_fq2(arr[0].as_array().unwrap());
    let y = parse_fq2(arr[1].as_array().unwrap());
    if x.is_zero() && y.is_zero() { G2Affine::zero() }
    else { G2Affine::new_unchecked(x, y) }
}

fn parse_fq2(arr: &[serde_json::Value]) -> Fq2 {
    Fq2::new(parse_fq(arr[0].as_str().unwrap()), parse_fq(arr[1].as_str().unwrap()))
}

fn parse_fq(s: &str) -> Fq {
    let n = big_to_uint(s);
    let bytes = n.to_biguint().unwrap().to_bytes_le();
    Fq::from_random_bytes(&bytes).unwrap()
}

fn parse_fr(s: &str) -> Fr {
    let n = big_to_uint(s);
    let bytes = n.to_biguint().unwrap().to_bytes_le();
    Fr::from_random_bytes(&bytes).unwrap()
}

fn big_to_uint(s: &str) -> BigInt {
    if s.starts_with("0x") {
        BigInt::parse_bytes(s[2..].as_bytes(), 16).unwrap()
    } else {
        BigInt::parse_bytes(s.as_bytes(), 10).unwrap()
    }
}
