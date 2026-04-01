use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey, Gas, NearToken, Promise, PromiseOrValue, PromiseResult};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet};
use base64::Engine;

const DEFAULT_TEE: &str = "kampouse.near";
const AURORA: &str = "aurora.testnet";

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    tee_authority: AccountId,
    identities: LookupMap<String, IdentityInfo>,
    commitments: LookupMap<String, String>,
    nullifiers: UnorderedSet<String>,
    total_identities: u64,
    aurora_verifier: Option<String>,
    pending: LookupMap<String, PendingReg>,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, serde::Serialize, serde::Deserialize)]
pub struct IdentityInfo {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub created_at: u64,
    pub owner: AccountId,
}

#[derive(BorshSerialize, BorshDeserialize)]
struct PendingReg {
    owner: AccountId,
    npub: String,
    commitment: String,
    nullifier: String,
}

#[derive(BorshSerialize, BorshDeserialize, BorshStorageKey)]
enum StorageKey {
    Identities,
    Commitments,
    Nullifiers,
    Pending,
}

fn vhex(v: &str, n: &str, l: usize) {
    if v.len() != l || !v.chars().all(|c| c.is_ascii_hexdigit()) {
        env::panic_str(&format!("Bad {}: need {} hex", n, l));
    }
}

fn u256be(v: u64) -> [u8; 32] {
    let mut b = [0u8; 32];
    b[24..32].copy_from_slice(&v.to_be_bytes());
    b
}

fn evm_calldata(inputs: &[[u8; 32]], proof: &[u8]) -> Vec<u8> {
    let n = inputs.len() as u64;
    let pa = 128 + 32 + n * 32;
    let pb = pa + 64;
    let pc = pb + 128;
    let mut d = Vec::with_capacity(512);
    d.extend_from_slice(&[0xb0, 0x98, 0xdf, 0xe6]);
    d.extend_from_slice(&u256be(128));
    d.extend_from_slice(&u256be(pa));
    d.extend_from_slice(&u256be(pb));
    d.extend_from_slice(&u256be(pc));
    d.extend_from_slice(&u256be(n));
    for inp in inputs { d.extend_from_slice(inp); }
    d.extend_from_slice(&proof[0..64]);
    d.extend_from_slice(&proof[64..192]);
    d.extend_from_slice(&proof[192..256]);
    d
}

fn aurora_args(verifier_hex: &str, calldata: &[u8]) -> Vec<u8> {
    let mut a = Vec::new();
    a.push(0u8);
    let caller = env::current_account_id().to_string();
    borsh::BorshSerialize::serialize(&caller, &mut a).unwrap();
    borsh::BorshSerialize::serialize(&0u64, &mut a).unwrap();
    a.extend_from_slice(&[0u8; 32]);
    let mut fee = [0u8; 32]; fee[0] = 100;
    a.extend_from_slice(&fee);
    borsh::BorshSerialize::serialize(&5_000_000u64, &mut a).unwrap();
    a.push(1u8);
    a.extend_from_slice(&hex::decode(verifier_hex).expect("bad addr"));
    a.extend_from_slice(&[0u8; 32]);
    borsh::BorshSerialize::serialize(&calldata.to_vec(), &mut a).unwrap();
    a
}

#[near_bindgen]
impl NostrIdentityContract {
    #[init]
    pub fn new(tee_authority: Option<AccountId>) -> Self {
        Self {
            tee_authority: tee_authority.unwrap_or_else(|| DEFAULT_TEE.parse().unwrap()),
            identities: LookupMap::new(StorageKey::Identities),
            commitments: LookupMap::new(StorageKey::Commitments),
            nullifiers: UnorderedSet::new(StorageKey::Nullifiers),
            total_identities: 0,
            aurora_verifier: None,
            pending: LookupMap::new(StorageKey::Pending),
        }
    }

    pub fn set_aurora_verifier(&mut self, address: String) {
        assert_eq!(env::predecessor_account_id(), self.tee_authority);
        vhex(&address, "address", 40);
        self.aurora_verifier = Some(address);
    }

    /// Register identity with Aurora cross-contract ZK verification.
    /// No account_hash stored on-chain — zero link to NEAR accounts.
    /// account_hash dedup handled internally by TEE (salted hash).
    pub fn register(
        &mut self,
        owner: AccountId,
        npub: String,
        commitment: String,
        nullifier: String,
        proof_b64: String,
        public_inputs_b64: String,
    ) -> PromiseOrValue<()> {
        assert_eq!(env::predecessor_account_id(), self.tee_authority);
        vhex(&npub, "npub", 64);
        vhex(&commitment, "commitment", 64);
        vhex(&nullifier, "nullifier", 64);

        let verifier = self.aurora_verifier.clone().unwrap_or_else(|| env::panic_str("No Aurora verifier"));
        let proof = base64::engine::general_purpose::STANDARD.decode(&proof_b64).unwrap_or_else(|_| env::panic_str("Bad proof"));
        let pi_raw = base64::engine::general_purpose::STANDARD.decode(&public_inputs_b64).unwrap_or_else(|_| env::panic_str("Bad inputs"));
        if proof.len() != 256 { env::panic_str("Proof=256 bytes"); }

        let inputs: Vec<[u8; 32]> = pi_raw.chunks_exact(32).map(|c| {
            let mut a = [0u8; 32]; a.copy_from_slice(c); a
        }).collect();

        let cd = evm_calldata(&inputs, &proof);
        let aa = aurora_args(&verifier, &cd);

        let key = format!("{}:{}", npub, env::block_timestamp());
        self.pending.insert(&key, &PendingReg {
            owner, npub: npub.clone(), commitment: commitment.clone(),
            nullifier: nullifier.clone(),
        });

        let aurora: AccountId = AURORA.parse().unwrap();
        Promise::new(aurora)
            .function_call(
                "call".to_string(),
                aa,
                NearToken::from_yoctonear(0),
                Gas::from_tgas(100),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(50))
                    .on_verify(key)
            )
            .into()
    }

    pub fn on_verify(&mut self, key: String) {
        assert_eq!(env::predecessor_account_id(), env::current_account_id());
        let ok = match env::promise_result(0) {
            PromiseResult::Successful(d) => d.last() == Some(&1),
            _ => false,
        };
        if !ok { env::panic_str("Proof rejected by Aurora"); }

        let p = self.pending.get(&key).unwrap_or_else(|| env::panic_str("No pending"));
        if self.identities.contains_key(&p.npub) { env::panic_str("npub exists"); }
        if self.commitments.contains_key(&p.commitment) { env::panic_str("commitment exists"); }
        if self.nullifiers.contains(&p.nullifier) { env::panic_str("nullifier used"); }

        let id = IdentityInfo {
            npub: p.npub.clone(), commitment: p.commitment.clone(),
            nullifier: p.nullifier.clone(), created_at: env::block_timestamp_ms(),
            owner: p.owner,
        };
        self.identities.insert(&id.npub, &id);
        self.commitments.insert(&id.commitment, &id.npub);
        self.nullifiers.insert(&id.nullifier);
        self.total_identities += 1;
        self.pending.remove(&key);
    }

    pub fn get_identity_by_npub(&self, npub: String) -> Option<IdentityInfo> { self.identities.get(&npub) }
    pub fn is_registered(&self, npub: String) -> bool { self.identities.contains_key(&npub) }
    pub fn get_total_identities(&self) -> u64 { self.total_idunities }
    pub fn get_tee_authority(&self) -> AccountId { self.tee_authority.clone() }
    pub fn is_aurora_verifier_set(&self) -> bool { self.aurora_verifier.is_some() }
}
