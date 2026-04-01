use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::{CircuitSpecificSetupSNARK, SNARK};
use ark_ff::{Field, PrimeField};
use ark_groth16::Groth16;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use ark_serialize::CanonicalSerialize;
use base64::Engine;
use rand::rngs::StdRng;
use rand::SeedableRng;

#[derive(Clone)]
struct IdentityCircuit {
    secret: Option<Fr>,
    commitment: Option<Fr>,
}

impl ConstraintSynthesizer<Fr> for IdentityCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        let secret = cs.new_witness_variable(|| {
            self.secret.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let commitment = cs.new_input_variable(|| {
            self.commitment.ok_or(SynthesisError::AssignmentMissing)
        })?;
        cs.enforce_constraint(
            ark_relations::lc!() + secret,
            ark_relations::lc!() + secret,
            ark_relations::lc!() + commitment,
        )?;
        Ok(())
    }
}

fn main() {
    let mut rng = StdRng::seed_from_u64(0x4e4541525a4b5031);
    println!("Generating Groth16 trusted setup (seeded)...");

    let dummy = IdentityCircuit { secret: Some(Fr::from(1u64)), commitment: Some(Fr::from(1u64)) };
    let (pk, vk) = Groth16::<Bn254>::setup(dummy, &mut rng).unwrap();

    // Print VK as decimal strings (these are Fq base field elements)
    println!("\nVK_DECIMAL:");
    println!("alpha.x {}", vk.alpha_g1.x);
    println!("alpha.y {}", vk.alpha_g1.y);
    println!("beta.x.c0 {}", vk.beta_g2.x.c0);
    println!("beta.x.c1 {}", vk.beta_g2.x.c1);
    println!("beta.y.c0 {}", vk.beta_g2.y.c0);
    println!("beta.y.c1 {}", vk.beta_g2.y.c1);
    println!("gamma.x.c0 {}", vk.gamma_g2.x.c0);
    println!("gamma.x.c1 {}", vk.gamma_g2.x.c1);
    println!("gamma.y.c0 {}", vk.gamma_g2.y.c0);
    println!("gamma.y.c1 {}", vk.gamma_g2.y.c1);
    println!("delta.x.c0 {}", vk.delta_g2.x.c0);
    println!("delta.x.c1 {}", vk.delta_g2.x.c1);
    println!("delta.y.c0 {}", vk.delta_g2.y.c0);
    println!("delta.y.c1 {}", vk.delta_g2.y.c1);
    println!("ic0.x {}", vk.gamma_abc_g1[0].x);
    println!("ic0.y {}", vk.gamma_abc_g1[0].y);
    println!("ic1.x {}", vk.gamma_abc_g1[1].x);
    println!("ic1.y {}", vk.gamma_abc_g1[1].y);

    // Generate proof
    let mut proof_rng = StdRng::seed_from_u64(0xDEADBEEF);
    println!("\nGenerating proof...");
    let secret = Fr::from(42u64);
    let commitment = secret * secret;
    let circuit = IdentityCircuit { secret: Some(secret), commitment: Some(commitment) };
    let proof = Groth16::<Bn254>::prove(&pk, circuit, &mut proof_rng).unwrap();

    // Local verify
    let pvk = ark_groth16::prepare_verifying_key(&vk);
    let valid = Groth16::<Bn254>::verify_proof(&pvk, &proof, &[commitment]).unwrap();
    println!("\nLocal verify: {}", if valid { "VALID" } else { "INVALID" });

    // Print proof as decimal
    println!("\nPROOF_DECIMAL:");
    println!("pA.x {}", proof.a.x);
    println!("pA.y {}", proof.a.y);
    println!("pB.x.c0 {}", proof.b.x.c0);
    println!("pB.x.c1 {}", proof.b.x.c1);
    println!("pB.y.c0 {}", proof.b.y.c0);
    println!("pB.y.c1 {}", proof.b.y.c1);
    println!("pC.x {}", proof.c.x);
    println!("pC.y {}", proof.c.y);
    println!("commitment {}", commitment);

    // Save LE proof bytes
    let mut proof_le = Vec::new();
    proof.a.x.serialize_uncompressed(&mut proof_le).unwrap();
    proof.a.y.serialize_uncompressed(&mut proof_le).unwrap();
    proof.b.x.c0.serialize_uncompressed(&mut proof_le).unwrap();
    proof.b.x.c1.serialize_uncompressed(&mut proof_le).unwrap();
    proof.b.y.c0.serialize_uncompressed(&mut proof_le).unwrap();
    proof.b.y.c1.serialize_uncompressed(&mut proof_le).unwrap();
    proof.c.x.serialize_uncompressed(&mut proof_le).unwrap();
    proof.c.y.serialize_uncompressed(&mut proof_le).unwrap();

    let out = format!(
        "{{\"proof_b64\": \"{}\", \"commitment\": {}}}",
        base64::engine::general_purpose::STANDARD.encode(&proof_le),
        commitment
    );
    std::fs::write("/tmp/proof_data.json", &out).unwrap();
    println!("\nSaved to /tmp/proof_data.json");
}
