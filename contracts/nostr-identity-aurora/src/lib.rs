use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    owner: AccountId,
    relayers: UnorderedSet<AccountId>,
    identities: LookupMap<String, IdentityInfo>,
    commitments: LookupMap<String, String>,
    nullifiers: UnorderedSet<String>,
    total_identities: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, serde::Serialize, serde::Deserialize)]
pub struct IdentityInfo {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub created_at: u64,
}

#[derive(BorshSerialize, BorshDeserialize, BorshStorageKey)]
enum StorageKey {
    Identities,
    Commitments,
    Nullifiers,
    Relayers,
}

fn vhex(v: &str, n: &str, l: usize) {
    if v.len() != l || !v.chars().all(|c| c.is_ascii_hexdigit()) {
        env::panic_str(&format!("Bad {}: need {} hex chars", n, l));
    }
}

#[near_bindgen]
impl NostrIdentityContract {
    #[init]
    pub fn new(owner: Option<AccountId>, initial_relayers: Option<Vec<AccountId>>) -> Self {
        let owner = owner.unwrap_or_else(|| env::predecessor_account_id());
        let mut relayers = UnorderedSet::new(StorageKey::Relayers);
        if let Some(initial) = initial_relayers {
            for r in initial { relayers.insert(&r); }
        }
        Self {
            owner,
            relayers,
            identities: LookupMap::new(StorageKey::Identities),
            commitments: LookupMap::new(StorageKey::Commitments),
            nullifiers: UnorderedSet::new(StorageKey::Nullifiers),
            total_identities: 0,
        }
    }

    pub fn add_relayer(&mut self, relayer: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Owner only");
        self.relayers.insert(&relayer);
    }

    pub fn remove_relayer(&mut self, relayer: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Owner only");
        self.relayers.remove(&relayer);
    }

    pub fn get_relayers(&self) -> Vec<AccountId> { self.relayers.to_vec() }
    pub fn is_relayer(&self, account_id: AccountId) -> bool { self.relayers.contains(&account_id) }

    pub fn transfer_ownership(&mut self, new_owner: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Owner only");
        self.owner = new_owner;
    }

    /// Register identity with native pairing check.
    /// nullifier = SHA256(account_id) — deterministic, prevents double registration.
    /// Cannot reverse SHA256 to find the account — privacy preserved.
    pub fn register(
        &mut self,
        npub: String,
        commitment: String,
        nullifier: String,
        pairing_input: String,
    ) {
        assert!(self.relayers.contains(&env::predecessor_account_id()), "Not a registered relayer");
        vhex(&npub, "npub", 64);
        vhex(&commitment, "commitment", 64);
        vhex(&nullifier, "nullifier", 64);

        if self.identities.contains_key(&npub) { env::panic_str("npub exists"); }
        if self.commitments.contains_key(&commitment) { env::panic_str("commitment exists"); }
        if self.nullifiers.contains(&nullifier) { env::panic_str("account already registered"); }

        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &pairing_input)
            .unwrap_or_else(|_| env::panic_str("Bad base64"));
        if bytes.len() != 768 { env::panic_str("Need 768 bytes"); }

        if !env::alt_bn128_pairing_check(&bytes) {
            env::panic_str("Invalid ZK proof");
        }

        let id = IdentityInfo {
            npub, commitment, nullifier,
            created_at: env::block_timestamp_ms(),
        };
        self.identities.insert(&id.npub, &id);
        self.commitments.insert(&id.commitment, &id.npub);
        self.nullifiers.insert(&id.nullifier);
        self.total_identities += 1;
    }

    pub fn get_identity_by_npub(&self, npub: String) -> Option<IdentityInfo> { self.identities.get(&npub) }
    pub fn is_registered(&self, npub: String) -> bool { self.identities.contains_key(&npub) }
    pub fn get_total_identities(&self) -> u64 { self.total_identities }
    pub fn get_owner(&self) -> AccountId { self.owner.clone() }
}
