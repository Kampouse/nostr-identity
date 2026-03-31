//! Nostr Identity Contract
//!
//! Privacy-preserving Nostr identity registry on NEAR.
//!
//! Architecture:
//!   Client generates npub/nsec locally, creates ZKP proof of ownership
//!   (knows both account_id + nsec), TEE verifies NEP-413 + ZKP, then
//!   registers the binding on-chain. An MPC verifier contract can later
//!   verify ownership proofs without revealing the underlying data.
//!
//! On-chain data is opaque:
//!   - commitment  = field_element(account_id + nsec * COMMITMENT_BASE)  (client-side ZKP)
//!   - nullifier   = field_element(nsec + nonce * COMMITMENT_BASE)        (client-side ZKP)
//!   - npub        = Nostr public key                                     (public)
//!
//! Nobody can reverse the commitment or nullifier to find account_id or nsec.

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet};
use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Registered identity information.
/// All fields except npub are opaque hashes — no private data on-chain.
#[derive(BorshSerialize, BorshDeserialize, Clone, serde::Serialize, serde::Deserialize, schemars::JsonSchema)]
pub struct IdentityInfo {
    /// Nostr public key (hex secp256k1 x-only, 64 chars)
    pub npub: String,
    /// Algebraic commitment = field_element(account_id + nsec * BASE) — 64 hex chars
    pub commitment: String,
    /// Algebraic nullifier = field_element(nsec + nonce * BASE) — 64 hex chars
    pub nullifier: String,
    /// SHA256("account:" || account_id) — used for double-reg prevention
    pub account_hash: String,
    /// Block timestamp in ms
    pub created_at: u64,
}

/// Result of a verification query
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
    AccountHashes,
}

// ============================================================================
// CONTRACT
// ============================================================================

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    tee_authority: AccountId,
    verifying_key: Option<String>,
    identities: LookupMap<String, IdentityInfo>,
    commitments: LookupMap<String, String>,
    nullifiers: UnorderedSet<String>,
    account_hashes: LookupMap<String, String>,
    total_identities: u64,
}

#[near_bindgen]
impl NostrIdentityContract {
    /// Initialize the contract with the TEE authority account.
    #[init]
    pub fn new(tee_authority: AccountId, verifying_key: Option<String>) -> Self {
        Self {
            tee_authority,
            verifying_key,
            identities: LookupMap::new(StorageKey::Identities),
            commitments: LookupMap::new(StorageKey::Commitments),
            nullifiers: UnorderedSet::new(StorageKey::Nullifiers),
            account_hashes: LookupMap::new(StorageKey::AccountHashes),
            total_identities: 0,
        }
    }

    // ========================================================================
    // WRITE METHODS (TEE authority only)
    // ========================================================================

    /// Register a new Nostr identity.
    ///
    /// Only the TEE authority can call this. The TEE has already:
    ///   1. Verified NEP-413 signature (user owns the NEAR account)
    ///   2. Verified the ZKP (prover knows account_id + nsec)
    ///   3. Verified the NEAR public key is a real access key via RPC
    ///   4. Computed account_hash = SHA256("account:" || account_id)
    ///
    /// # Commitment scheme (all hex-encoded SHA256, 64 chars)
    ///   commitment   = field_element(account_id + nsec * COMMITMENT_BASE)  — client-side ZKP
    ///   nullifier    = field_element(nsec + nonce * COMMITMENT_BASE)       — client-side ZKP
    ///   account_hash = SHA256("account:" || account_id)              — TEE-side
    pub fn register(
        &mut self,
        npub: String,
        commitment: String,
        nullifier: String,
        account_hash: String,
    ) -> IdentityInfo {
        // Access control
        let caller = env::predecessor_account_id();
        if caller != self.tee_authority {
            env::panic_str(&format!(
                "Unauthorized: only TEE {} can register, got {}",
                self.tee_authority, caller
            ));
        }

        // Input validation
        Self::validate_hex64(&npub, "npub");
        Self::validate_hex64(&commitment, "commitment");
        Self::validate_hex64(&nullifier, "nullifier");
        Self::validate_hex64(&account_hash, "account_hash");

        // Duplicate checks
        if self.identities.contains_key(&npub) {
            env::panic_str("This Nostr public key is already registered");
        }
        if self.commitments.contains_key(&commitment) {
            env::panic_str("Commitment already registered");
        }
        if self.nullifiers.contains(&nullifier) {
            env::panic_str("Nullifier already used");
        }
        if self.account_hashes.contains_key(&account_hash) {
            env::panic_str("This NEAR account already has a registered Nostr identity");
        }

        // Store identity
        let identity = IdentityInfo {
            npub: npub.clone(),
            commitment: commitment.clone(),
            nullifier: nullifier.clone(),
            account_hash: account_hash.clone(),
            created_at: env::block_timestamp_ms(),
        };

        self.identities.insert(&npub, &identity);
        self.commitments.insert(&commitment, &npub);
        self.nullifiers.insert(&nullifier);
        self.account_hashes.insert(&account_hash, &npub);
        self.total_identities += 1;

        identity
    }

    /// Update the TEE authority
    pub fn set_tee_authority(&mut self, new_authority: AccountId) {
        let caller = env::predecessor_account_id();
        if caller != self.tee_authority {
            env::panic_str("Only current TEE authority can transfer");
        }
        self.tee_authority = new_authority;
    }

    /// Set or update the MPC verifier contract
    pub fn set_verifying_key(&mut self, verifying_key: Option<String>) {
        let caller = env::predecessor_account_id();
        if caller != self.tee_authority {
            env::panic_str("Only TEE authority can set MPC verifier");
        }
        self.verifying_key = verifying_key;
    }

    // ========================================================================
    // READ METHODS (anyone)
    // ========================================================================

    /// Get identity by Nostr public key
    pub fn get_identity(&self, npub: String) -> Option<IdentityInfo> {
        self.identities.get(&npub)
    }

    /// Get identity by commitment hash
    pub fn get_by_commitment(&self, commitment: String) -> Option<IdentityInfo> {
        self.commitments.get(&commitment).and_then(|npub| self.identities.get(&npub))
    }

    /// Get identity by account hash
    pub fn get_by_account_hash(&self, account_hash: String) -> Option<IdentityInfo> {
        self.account_hashes.get(&account_hash).and_then(|npub| self.identities.get(&npub))
    }

    /// Check if an npub is registered
    pub fn is_registered(&self, npub: String) -> bool {
        self.identities.contains_key(&npub)
    }

    /// Check if a commitment exists
    pub fn is_commitment_registered(&self, commitment: String) -> bool {
        self.commitments.contains_key(&commitment)
    }

    /// Check if a nullifier is used
    pub fn is_nullifier_used(&self, nullifier: String) -> bool {
        self.nullifiers.contains(&nullifier)
    }

    /// Check if an account hash already has an identity
    pub fn is_account_registered(&self, account_hash: String) -> bool {
        self.account_hashes.contains_key(&account_hash)
    }

    /// Get total registered identities
    pub fn get_total_identities(&self) -> u64 {
        self.total_identities
    }

    /// Get the TEE authority account
    pub fn get_tee_authority(&self) -> AccountId {
        self.tee_authority.clone()
    }

    /// Get the MPC verifier contract (if set)
    pub fn get_verifying_key(&self) -> Option<String> {
        self.verifying_key.clone()
    }

    /// Verify an identity by commitment.
    /// Client recomputes commitment locally and checks on-chain.
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

    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

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

// ============================================================================
// TESTS
// ============================================================================

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

        let id = contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));

        assert_eq!(id.npub, hex64('a'));
        assert_eq!(id.commitment, hex64('b'));
        assert_eq!(id.nullifier, hex64('c'));
        assert_eq!(id.account_hash, hex64('d'));
        assert_eq!(contract.get_total_identities(), 1);
        assert!(contract.is_registered(hex64('a')));
        assert!(contract.is_commitment_registered(hex64('b')));
        assert!(contract.is_nullifier_used(hex64('c')));
        assert!(contract.is_account_registered(hex64('d')));
    }

    #[test]
    fn test_lookup_by_commitment() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));

        let found = contract.get_by_commitment(hex64('b'));
        assert!(found.is_some());
        assert_eq!(found.unwrap().npub, hex64('a'));
    }

    #[test]
    fn test_lookup_by_account_hash() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));

        let found = contract.get_by_account_hash(hex64('d'));
        assert!(found.is_some());
        assert_eq!(found.unwrap().npub, hex64('a'));
    }

    #[test]
    fn test_verify_commitment() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));

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
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));
    }

    #[test]
    #[should_panic(expected = "already registered")]
    fn test_double_registration_same_npub() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));
        contract.register(hex64('a'), hex64('e'), hex64('f'), hex64('1'));
    }

    #[test]
    #[should_panic(expected = "NEAR account already")]
    fn test_double_registration_same_account() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));
        contract.register(hex64('e'), hex64('f'), hex64('1'), hex64('d'));
    }

    #[test]
    #[should_panic(expected = "Commitment already registered")]
    fn test_double_registration_same_commitment() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register(hex64('a'), hex64('b'), hex64('c'), hex64('d'));
        contract.register(hex64('e'), hex64('b'), hex64('f'), hex64('1'));
    }

    #[test]
    #[should_panic(expected = "Invalid npub")]
    fn test_register_invalid_npub() {
        let (mut contract, mut builder) = setup();
        testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
        contract.register("short".to_string(), hex64('b'), hex64('c'), hex64('d'));
    }

    #[test]
    fn test_multiple_registrations() {
        let (mut contract, mut builder) = setup();
        for i in 0..5u8 {
            testing_env!(builder.predecessor_account_id(accounts(TEE)).build());
            let c = (b'0' + i) as char;
            let d = (b'1' + i) as char;
            let e = (b'2' + i) as char;
            let f = (b'3' + i) as char;
            contract.register(hex64(c), hex64(d), hex64(e), hex64(f));
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
