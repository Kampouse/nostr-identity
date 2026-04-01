use ark_bn254::Bn254;
use ark_ff::{PrimeField, One};
use ark_groth16::Groth16;
use ark_crypto_primitives::snark::SNARK;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError, LinearCombination, Variable};
use ark_serialize::CanonicalSerialize;
use std::io::Write;

const COMMITMENT_BASE: u64 = 0x1234567890abcdef_u64;

#[derive(Clone)]
struct NEAROwnershipCircuit {
    account_id: Option<ark_bn254::Fr>,
    nsec: Option<ark_bn254::Fr>,
    nonce: Option<ark_bn254::Fr>,
    commitment: Option<ark_bn254::Fr>,
    nullifier: Option<ark_bn254::Fr>,
}

impl ConstraintSynthesizer<ark_bn254::Fr> for NEAROwnershipCircuit {
    fn generate_constraints(
        self,
        cs: ConstraintSystemRef<ark_bn254::Fr>,
    ) -> Result<(), SynthesisError> {
        let base = ark_bn254::Fr::from(COMMITMENT_BASE);

        let account_id_var = cs.new_witness_variable(|| {
            self.account_id.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let nsec_var = cs.new_witness_variable(|| {
            self.nsec.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let nonce_var = cs.new_witness_variable(|| {
            self.nonce.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let commitment_var = cs.new_input_variable(|| {
            self.commitment.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let nullifier_var = cs.new_input_variable(|| {
            self.nullifier.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let nsec_times_base = cs.new_witness_variable(|| {
            Ok(self.nsec.unwrap_or_default() * base)
        })?;
        cs.enforce_constraint(
            lc!() + nsec_var,
            lc!() + (base, Variable::One),
            lc!() + nsec_times_base,
        )?;

        let commitment_computed = cs.new_witness_variable(|| {
            Ok(self.account_id.unwrap_or_default() + self.nsec.unwrap_or_default() * base)
        })?;
        cs.enforce_constraint(
            lc!() + (ark_bn254::Fr::one(), commitment_computed),
            lc!() + (ark_bn254::Fr::one(), Variable::One),
            lc!() + (ark_bn254::Fr::one(), account_id_var) + (ark_bn254::Fr::one(), nsec_times_base),
        )?;
        cs.enforce_constraint(
            lc!() + (ark_bn254::Fr::one(), commitment_computed) - (ark_bn254::Fr::one(), commitment_var),
            lc!() + (ark_bn254::Fr::one(), Variable::One),
            lc!(),
        )?;

        let nonce_times_base = cs.new_witness_variable(|| {
            Ok(self.nonce.unwrap_or_default() * base)
        })?;
        cs.enforce_constraint(
            lc!() + nonce_var,
            lc!() + (base, Variable::One),
            lc!() + nonce_times_base,
        )?;

        let nullifier_computed = cs.new_witness_variable(|| {
            Ok(self.nsec.unwrap_or_default() + self.nonce.unwrap_or_default() * base)
        })?;
        cs.enforce_constraint(
            lc!() + (ark_bn254::Fr::one(), nullifier_computed),
            lc!() + (ark_bn254::Fr::one(), Variable::One),
            lc!() + (ark_bn254::Fr::one(), nsec_var) + (ark_bn254::Fr::one(), nonce_times_base),
        )?;
        cs.enforce_constraint(
            lc!() + (ark_bn254::Fr::one(), nullifier_computed) - (ark_bn254::Fr::one(), nullifier_var),
            lc!() + (ark_bn254::Fr::one(), Variable::One),
            lc!(),
        )?;

        Ok(())
    }
}

fn main() {
    let mut rng = rand::rngs::StdRng::seed_from_u64(0x4e4541525a4b5031);
    let base = ark_bn254::Fr::from(COMMITMENT_BASE);
    let init_aid = ark_bn254::Fr::from(1u64);
    let init_nsec = ark_bn254::Fr::from(2u64);
    let init_nonce = ark_bn254::Fr::from(3u64);

    let circuit = NEAROwnershipCircuit {
        account_id: Some(init_aid),
        nsec: Some(init_nsec),
        nonce: Some(init_nonce),
        commitment: Some(init_aid + init_nsec * base),
        nullifier: Some(init_nsec + init_nonce * base),
    };

    let (_pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)
        .expect("setup failed");

    let mut vk_bytes = Vec::new();
    vk.serialize_compressed(&mut vk_bytes).unwrap();

    let hex = hex::encode(&vk_bytes);
    println!("VK length: {} bytes", vk_bytes.len());
    println!("VK hex: {}", hex);

    // Write to file
    let mut file = std::fs::File::create("verifying_key.txt").unwrap();
    file.write_all(hex.as_bytes()).unwrap();

    println!("Written to verifying_key.txt");
}
