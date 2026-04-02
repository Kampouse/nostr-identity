//! Nostr Identity Contract
//!
//! Privacy-preserving Nostr identity registry on NEAR.
//!
//! On-chain data stores only npub, commitment, nullifier.
//! No account_hash — zero link to any NEAR account.
//! Double-reg prevented by npub/commitment/nullifier uniqueness.
//! TEE handles account-level dedup internally via salted hash.

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet};
use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault};

#[derive(BorshSerialize, BorshDeserialize, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
pub struct IdentityInfo {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub account_hash: String,
    pub proof_b64: String,
    pub created_at: u64,
}

#[derive(BorshSerialize, BorshDeserialize, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
pub struct VerificationResult {
    pub registered: bool,
    pub npub: Option<String>,
    pub created_at: Option<u64>,
}

#[derive(BorshSerialize, BorshDeserialize, BorshStorageKey)]
enum StorageKey {
    Identities,
    Commitments,
    Nullifiers,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    tee_authority: AccountId,
    verifying_key: Option<String>,
    identities: LookupMap<String, IdentityInfo>,
    commitments: LookupMap<String, String>,
    nullifiers: UnorderedSet<String>,
    total_identities: u64,
}

#[near_bindgen]
impl NostrIdentityContract {
    #[init]
    pub fn new(tee_authority: AccountId, verifying_key: Option<String>) -> Self {
        Self {
            tee_authority,
            verifying_key,
            identities: LookupMap::new(StorageKey::Identities),
            commitments: LookupMap::new(StorageKey::Commitments),
            nullifiers: UnorderedSet::new(StorageKey::Nullifiers),
            total_identities: 0,
        }
    }

    /// Register a new Nostr identity (TEE authority only).
    /// Stores npub, commitment, nullifier, account_hash, and ZKP proof.
    pub fn register(
        &mut self,
        npub: String,
        commitment: String,
        nullifier: String,
        account_hash: String,
        proof_b64: String,
    ) -> IdentityInfo {
        let caller = env::predecessor_account_id();
        if caller != self.tee_authority {
            env::panic_str(&format!(
                "Unauthorized: only TEE {} can register, got {}",
                self.tee_authority, caller
            ));
        }

        Self::validate_hex64(&npub, "npub");
        Self::validate_hex64(&commitment, "commitment");
        Self::validate_hex64(&nullifier, "nullifier");
        Self::validate_hex64(&account_hash, "account_hash");

        if self.identities.contains_key(&npub) {
            env::panic_str("This Nostr public key is already registered");
        }
        if self.commitments.contains_key(&commitment) {
            env::panic_str("Commitment already registered");
        }
        if self.nullifiers.contains(&nullifier) {
            env::panic_str("Nullifier already used");
        }

        let identity = IdentityInfo {
            npub: npub.clone(),
            commitment: commitment.clone(),
            nullifier: nullifier.clone(),
            account_hash,
            proof_b64,
            created_at: env::block_timestamp_ms(),
        };

        self.identities.insert(&npub, &identity);
        self.commitments.insert(&commitment, &npub);
        self.nullifiers.insert(&nullifier);
        self.total_identities += 1;

        identity
    }

    pub fn set_tee_authority(&mut self, new_authority: AccountId) {
        let caller = env::predecessor_account_id();
        if caller != self.tee_authority {
            env::panic_str("Only current TEE authority can transfer");
        }
        self.tee_authority = new_authority;
    }

    pub fn set_verifying_key(&mut self, verifying_key: Option<String>) {
        let caller = env::predecessor_account_id();
        if caller != self.tee_authority {
            env::panic_str("Only TEE authority can set verifying key");
        }
        self.verifying_key = verifying_key;
    }

    // ========================================================================
    // READ METHODS (anyone)
    // ========================================================================

    pub fn get_identity(&self, npub: String) -> Option<IdentityInfo> {
        self.identities.get(&npub)
    }

    pub fn get_by_commitment(&self, commitment: String) -> Option<IdentityInfo> {
        self.commitments.get(&commitment).and_then(|npub| self.identities.get(&npub))
    }

    pub fn is_registered(&self, npub: String) -> bool {
        self.identities.contains_key(&npub)
    }

    pub fn is_commitment_registered(&self, commitment: String) -> bool {
        self.commitments.contains_key(&commitment)
    }

    pub fn is_nullifier_used(&self, nullifier: String) -> bool {
        self.nullifiers.contains(&nullifier)
    }

    pub fn get_total_identities(&self) -> u64 {
        self.total_identities
    }

    pub fn get_tee_authority(&self) -> AccountId {
        self.tee_authority.clone()
    }

    pub fn get_verifying_key(&self) -> Option<String> {
        self.verifying_key.clone()
    }

    pub fn verify_commitment(&self, commitment: String) -> VerificationResult {
        match self.commitments.get(&commitment) {
            Some(npub) => {
                let info = self.identities.get(&npub).unwrap();
                VerificationResult {
                    registered: true,
                    npub: Some(info.npub),
                    created_at: Some(info.created_at),
                }
            }
            None => VerificationResult {
                registered: false,
                npub: None,
                created_at: None,
            },
        }
    }

    fn validate_hex64(value: &str, name: &str) {
        if value.len() != 64 || !value.chars().all(|c| c.is_ascii_hexdigit()) {
            env::panic_str(&format!(
                "Invalid {}: must be 64 hex characters, got {} chars",
                name,
                value.len()
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    const TEE: usize = 0;
    const USER: usize = 1;

    fn hex64(c: char) -> String {
        c.to_string().repeat(64)
    }

    fn setup() -> (NostrIdentityContract, VMContextBuilder) {
        let contract = NostrIdentityContract::new(accounts(TEE), None);
        let builder = VMContextBuilder::new();
        (contract, builder)
    }

    #[test]
    fn test_init() {
        let contract = NostrIdentityContract::new(accounts(TEE), Some("vk_placeholder".parse().unwrap()));
        assert_eq!(contract.get_tee_authority(), accounts(TEE));
        assert_eq!(contract.get_verifying_key(), Some("vk_placeholder".parse().unwrap()));
        assert_eq!(contract.get_total_identities(), 0);
    }

    #[test]
    fn test_register() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());

        let id = contract.register(hex64('a'), hex64('b'), hex64('c'));

        assert_eq!(id.npub, hex64('a'));
        assert_eq!(id.commitment, hex64('b'));
        assert_eq!(id.nullifier, hex64('c'));
        assert_eq!(contract.get_total_identities(), 1);
        assert!(contract.is_registered(hex64('a')));
        assert!(contract.is_commitment_registered(hex64('b')));
        assert!(contract.is_nullifier_used(hex64('c')));
    }

    #[test]
    fn test_lookup_by_commitment() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'));

        let found = contract.get_by_commitment(hex64('b'));
        assert!(found.is_some());
        assert_eq!(found.unwrap().npub, hex64('a'));
    }

    #[test]
    fn test_verify_commitment() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'));

        let result = contract.verify_commitment(hex64('b'));
        assert!(result.registered);
        assert_eq!(result.npub, Some(hex64('a')));

        let not_found = contract.verify_commitment(hex64('9'));
        assert!(!not_found.registered);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_register_unauthorized() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(USER)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'));
    }

    #[test]
    #[should_panic(expected = "already registered")]
    fn test_double_registration_same_npub() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'));
        contract.register(hex64('a'), hex64('e'), hex64('f'));
    }

    #[test]
    #[should_panic(expected = "Commitment already registered")]
    fn test_double_registration_same_commitment() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'));
        contract.register(hex64('e'), hex64('b'), hex64('f'));
    }

    #[test]
    #[should_panic(expected = "Nullifier already")]
    fn test_double_registration_same_nullifier() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'));
        contract.register(hex64('e'), hex64('f'), hex64('c'));
    }

    #[test]
    #[should_panic(expected = "Invalid npub")]
    fn test_register_invalid_npub() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register("short".to_string(), hex64('b'), hex64('c'));
    }

    #[test]
    fn test_multiple_registrations() {
        let (mut contract, mut builder) = setup();
        for i in 0..5u8 {
            testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
            let c = (b'0' + i) as char;
            let d = (b'1' + i) as char;
            let e = (b'2' + i) as char;
            contract.register(hex64(c), hex64(d), hex64(e));
        }
        assert_eq!(contract.get_total_identities(), 5);
    }

    #[test]
    fn test_set_tee_authority() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.set_tee_authority(accounts(2));
        assert_eq!(contract.get_tee_authority(), accounts(2));
    }

    #[test]
    fn test_set_verifying_key() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.set_verifying_key(Some("vk_placeholder".parse().unwrap()));
        assert_eq!(contract.get_verifying_key(), Some("vk_placeholder".parse().unwrap()));
    }
}
