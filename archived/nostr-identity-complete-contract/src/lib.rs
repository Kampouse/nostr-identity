use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Promise};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet, LookupSet, Vector};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    // Core identity storage (NO account_id stored!)
    identities: LookupMap<String, IdentityInfo>, // commitment -> identity
    nullifiers: UnorderedSet<String>,
    
    // Delegator authorization
    authorized_delegators: LookupSet<AccountId>,
    
    // Verification challenges
    challenges: LookupMap<String, Challenge>,
    
    // Selective disclosure
    disclosures: LookupMap<String, Disclosure>, // disclosure_id -> disclosure
    
    // Stats
    total_identities: u64,
    delegator_nonce: u64,
    challenge_nonce: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct IdentityInfo {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub created_at: u64,
    pub delegator: AccountId,
    pub nonce: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct Challenge {
    pub npub: String,
    pub challenge: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub requester: AccountId,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct Disclosure {
    pub commitment: String,
    pub npub: String,
    pub account_id: AccountId,
    pub revealed_to: AccountId,
    pub revealed_at: u64,
    pub expires_at: u64,
    pub signature: String,
}

#[derive(BorshSerialize, BorshDeserialize, serde::Serialize, serde::Deserialize)]
pub struct DelegatedRegistration {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub nep413_signature: String,
    pub user_public_key: String,
    pub message: String,
    pub nonce: u64,
}

#[near_bindgen]
impl NostrIdentityContract {
    #[init]
    pub fn new(delegators: Vec<AccountId>) -> Self {
        let mut contract = Self {
            identities: LookupMap::new(b"i"),
            nullifiers: UnorderedSet::new(b"n"),
            authorized_delegators: LookupSet::new(b"d"),
            challenges: LookupMap::new(b"c"),
            disclosures: LookupMap::new(b"r"),
            total_identities: 0,
            delegator_nonce: 0,
            challenge_nonce: 0,
        };
        
        for delegator in delegators {
            contract.authorized_delegators.insert(&delegator);
        }
        
        contract
    }

    // ========================================
    // DELEGATOR REGISTRATION
    // ========================================
    
    /// Register identity via delegator (user's account NOT stored on-chain)
    pub fn register_via_delegator(
        &mut self,
        registration: DelegatedRegistration,
        delegator_signature: String,
    ) -> IdentityInfo {
        let delegator = env::predecessor_account_id();
        if !self.authorized_delegators.contains(&delegator) {
            env::panic_str("Unauthorized delegator");
        }
        
        if delegator_signature.is_empty() {
            env::panic_str("Missing delegator signature");
        }
        
        if self.nullifiers.contains(&registration.nullifier) {
            env::panic_str("Nullifier already used");
        }
        
        if self.identities.contains_key(&registration.commitment) {
            env::panic_str("Commitment already registered");
        }
        
        if registration.nonce != self.delegator_nonce {
            env::panic_str("Invalid nonce");
        }
        
        let identity = IdentityInfo {
            npub: registration.npub,
            commitment: registration.commitment.clone(),
            nullifier: registration.nullifier.clone(),
            created_at: env::block_timestamp(),
            delegator,
            nonce: registration.nonce,
        };
        
        self.identities.insert(&registration.commitment, &identity);
        self.nullifiers.insert(&registration.nullifier);
        self.total_identities += 1;
        self.delegator_nonce += 1;
        
        identity
    }
    
    /// Batch register multiple identities (gas efficient)
    pub fn batch_register(
        &mut self,
        registrations: Vec<DelegatedRegistration>,
        delegator_signature: String,
    ) -> Vec<IdentityInfo> {
        let delegator = env::predecessor_account_id();
        if !self.authorized_delegators.contains(&delegator) {
            env::panic_str("Unauthorized delegator");
        }
        
        let mut results = Vec::new();
        
        for registration in registrations {
            if !self.nullifiers.contains(&registration.nullifier) 
               && !self.identities.contains_key(&registration.commitment) {
                
                let identity = IdentityInfo {
                    npub: registration.npub,
                    commitment: registration.commitment.clone(),
                    nullifier: registration.nullifier.clone(),
                    created_at: env::block_timestamp(),
                    delegator: delegator.clone(),
                    nonce: registration.nonce,
                };
                
                self.identities.insert(&registration.commitment, &identity);
                self.nullifiers.insert(&registration.nullifier);
                self.total_identities += 1;
                
                results.push(identity);
            }
        }
        
        self.delegator_nonce += results.len() as u64;
        results
    }

    // ========================================
    // VERIFICATION METHOD 1: BASIC LOOKUP
    // ========================================
    
    /// Check if identity exists
    pub fn identity_exists(&self, commitment: String) -> bool {
        self.identities.contains_key(&commitment)
    }
    
    /// Get identity by commitment (public info only)
    pub fn get_identity(&self, commitment: String) -> Option<IdentityInfo> {
        self.identities.get(&commitment)
    }
    
    /// Get npub for commitment
    pub fn get_npub(&self, commitment: String) -> Option<String> {
        self.identities.get(&commitment).map(|i| i.npub)
    }

    // ========================================
    // VERIFICATION METHOD 2: CHALLENGE-RESPONSE
    // ========================================
    
    /// Create verification challenge
    pub fn create_challenge(
        &mut self,
        npub: String,
    ) -> String {
        let requester = env::predecessor_account_id();
        
        let challenge_data = format!(
            "verify-{}-{}-{}-{}",
            npub,
            requester,
            env::block_timestamp(),
            self.challenge_nonce
        );
        
        let challenge_hash = hex::encode(env::sha256(challenge_data.as_bytes()));
        
        let challenge = Challenge {
            npub,
            challenge: challenge_hash.clone(),
            created_at: env::block_timestamp(),
            expires_at: env::block_timestamp() + 300_000_000_000, // 5 minutes
            requester,
        };
        
        self.challenges.insert(&challenge_hash, &challenge);
        self.challenge_nonce += 1;
        
        challenge_hash
    }
    
    /// Verify challenge response
    pub fn verify_challenge(
        &self,
        challenge_hash: String,
        nostr_signature: String,
        commitment: String,
    ) -> bool {
        let challenge = match self.challenges.get(&challenge_hash) {
            Some(c) => c,
            None => return false,
        };
        
        if env::block_timestamp() > challenge.expires_at {
            return false;
        }
        
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        if identity.npub != challenge.npub {
            return false;
        }
        
        // In production: verify ed25519 signature cryptographically
        !nostr_signature.is_empty()
    }

    // ========================================
    // VERIFICATION METHOD 3: OWNERSHIP PROOF
    // ========================================
    
    /// Verify ownership proof
    pub fn verify_ownership(
        &self,
        commitment: String,
        timestamp: u64,
        nostr_signature: String,
        message: String,
    ) -> bool {
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        let now = env::block_timestamp();
        if timestamp < now - 300_000_000_000 || timestamp > now + 300_000_000_000 {
            return false;
        }
        
        if !message.contains(&commitment) || !message.contains(&timestamp.to_string()) {
            return false;
        }
        
        // In production: verify ed25519 signature with npub
        !nostr_signature.is_empty()
    }

    // ========================================
    // VERIFICATION METHOD 4: ZK PROOF
    // ========================================
    
    /// Verify ZK proof of ownership
    pub fn verify_zk_ownership(
        &self,
        commitment: String,
        zk_proof: String,
        public_inputs: Vec<String>,
    ) -> bool {
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        if public_inputs.len() < 1 || public_inputs[0] != commitment {
            return false;
        }
        
        // In production: verify Groth16 proof
        // Proves: "I know preimage of commitment AND I signed it"
        !zk_proof.is_empty()
    }

    // ========================================
    // VERIFICATION METHOD 5: SELECTIVE DISCLOSURE
    // ========================================
    
    /// Reveal identity to specific verifier
    pub fn reveal_to_verifier(
        &mut self,
        commitment: String,
        verifier: AccountId,
        nep413_signature: String,
        user_public_key: String,
        message: String,
        duration_ms: u64,
    ) -> String {
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => env::panic_str("Identity not found"),
        };
        
        // In production: verify NEP-413 signature cryptographically
        if nep413_signature.is_empty() {
            env::panic_str("Invalid signature");
        }
        
        let disclosure_id = format!(
            "disclosure-{}-{}-{}",
            commitment,
            verifier,
            env::block_timestamp()
        );
        
        // In production: decrypt and store actual account_id
        // For now: store placeholder (would be replaced with actual decryption)
        let placeholder_account: AccountId = "placeholder.near".parse().unwrap();
        
        let disclosure = Disclosure {
            commitment: commitment.clone(),
            npub: identity.npub,
            account_id: placeholder_account,
            revealed_to: verifier.clone(),
            revealed_at: env::block_timestamp(),
            expires_at: env::block_timestamp() + duration_ms,
            signature: nep413_signature,
        };
        
        self.disclosures.insert(&disclosure_id, &disclosure);
        
        disclosure_id
    }
    
    /// Check if identity is revealed to caller
    pub fn is_revealed_to(
        &self,
        disclosure_id: String,
    ) -> Option<String> {
        let disclosure = self.disclosures.get(&disclosure_id)?;
        
        let caller = env::predecessor_account_id();
        if disclosure.revealed_to != caller {
            return None;
        }
        
        if env::block_timestamp() > disclosure.expires_at {
            return None;
        }
        
        Some(disclosure.account_id.to_string())
    }

    // ========================================
    // VERIFICATION METHOD 6: BATCH
    // ========================================
    
    /// Batch verify multiple identities
    pub fn batch_verify(
        &self,
        commitments: Vec<String>,
    ) -> Vec<bool> {
        commitments
            .iter()
            .map(|c| self.identities.contains_key(c))
            .collect()
    }

    // ========================================
    // ADMIN FUNCTIONS
    // ========================================
    
    /// Add authorized delegator (only owner)
    pub fn add_delegator(&mut self, delegator: AccountId) {
        self.assert_owner();
        self.authorized_delegators.insert(&delegator);
    }
    
    /// Remove delegator (only owner)
    pub fn remove_delegator(&mut self, delegator: AccountId) {
        self.assert_owner();
        self.authorized_delegators.remove(&delegator);
    }
    
    /// Check if delegator is authorized
    pub fn is_delegator_authorized(&self, delegator: AccountId) -> bool {
        self.authorized_delegators.contains(&delegator)
    }
    
    fn assert_owner(&self) {
        let owner = env::current_account_id();
        if env::predecessor_account_id() != owner {
            env::panic_str("Only owner can call this method");
        }
    }

    // ========================================
    // STATS & QUERIES
    // ========================================
    
    pub fn get_total_identities(&self) -> u64 {
        self.total_identities
    }
    
    pub fn get_delegator_nonce(&self) -> u64 {
        self.delegator_nonce
    }
    
    pub fn get_challenge_nonce(&self) -> u64 {
        self.challenge_nonce
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder
    }

    #[test]
    fn test_new() {
        let delegators = vec![accounts(1), accounts(2)];
        let contract = NostrIdentityContract::new(delegators);
        
        assert!(contract.is_delegator_authorized(accounts(1)));
        assert!(contract.is_delegator_authorized(accounts(2)));
        assert!(!contract.is_delegator_authorized(accounts(3)));
    }

    #[test]
    fn test_register_via_delegator() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = get_context(accounts(1)).build();
        testing_env!(context);
        
        let registration = DelegatedRegistration {
            npub: "npub1abc123".to_string(),
            commitment: "commitment_hash_123".to_string(),
            nullifier: "nullifier_hash_456".to_string(),
            nep413_signature: "user_signature".to_string(),
            user_public_key: "ed25519:user_pk".to_string(),
            message: "Register identity".to_string(),
            nonce: 0,
        };
        
        let identity = contract.register_via_delegator(
            registration,
            "delegator_signature".to_string(),
        );
        
        assert_eq!(identity.npub, "npub1abc123");
        assert_eq!(contract.get_total_identities(), 1);
        assert!(contract.identity_exists("commitment_hash_123".to_string()));
    }

    #[test]
    #[should_panic(expected = "Unauthorized delegator")]
    fn test_unauthorized_delegator() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = get_context(accounts(0)).build();
        testing_env!(context);
        
        let registration = DelegatedRegistration {
            npub: "npub1abc123".to_string(),
            commitment: "commitment_hash".to_string(),
            nullifier: "nullifier_hash".to_string(),
            nep413_signature: "sig".to_string(),
            user_public_key: "pk".to_string(),
            message: "msg".to_string(),
            nonce: 0,
        };
        
        contract.register_via_delegator(registration, "sig".to_string());
    }

    #[test]
    fn test_challenge_verification() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        // Register identity first
        let context = get_context(accounts(1)).build();
        testing_env!(context);
        
        let registration = DelegatedRegistration {
            npub: "npub1abc123".to_string(),
            commitment: "commitment_hash".to_string(),
            nullifier: "nullifier_hash".to_string(),
            nep413_signature: "sig".to_string(),
            user_public_key: "pk".to_string(),
            message: "msg".to_string(),
            nonce: 0,
        };
        
        contract.register_via_delegator(registration, "sig".to_string());
        
        // Create challenge
        let challenge = contract.create_challenge("npub1abc123".to_string());
        assert!(!challenge.is_empty());
        
        // Verify challenge
        let is_valid = contract.verify_challenge(
            challenge,
            "nostr_signature".to_string(),
            "commitment_hash".to_string(),
        );
        
        assert!(is_valid);
    }

    #[test]
    fn test_ownership_proof() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        // Register identity
        let mut context = get_context(accounts(1));
        context.block_timestamp(1_000_000_000_000); // Set realistic timestamp
        testing_env!(context.build());
        
        let registration = DelegatedRegistration {
            npub: "npub1abc123".to_string(),
            commitment: "commitment_hash".to_string(),
            nullifier: "nullifier_hash".to_string(),
            nep413_signature: "sig".to_string(),
            user_public_key: "pk".to_string(),
            message: "msg".to_string(),
            nonce: 0,
        };
        
        contract.register_via_delegator(registration, "sig".to_string());
        
        // Verify ownership
        let timestamp = env::block_timestamp();
        let message = format!("Verify ownership of commitment_hash at {}", timestamp);
        
        let is_valid = contract.verify_ownership(
            "commitment_hash".to_string(),
            timestamp,
            "nostr_signature".to_string(),
            message,
        );
        
        assert!(is_valid);
    }

    #[test]
    fn test_batch_verify() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = get_context(accounts(1)).build();
        testing_env!(context);
        
        // Register two identities
        for i in 0..2 {
            let registration = DelegatedRegistration {
                npub: format!("npub{}", i),
                commitment: format!("commitment{}", i),
                nullifier: format!("nullifier{}", i),
                nep413_signature: "sig".to_string(),
                user_public_key: "pk".to_string(),
                message: "msg".to_string(),
                nonce: i,
            };
            
            contract.register_via_delegator(registration, "sig".to_string());
        }
        
        // Batch verify
        let results = contract.batch_verify(vec![
            "commitment0".to_string(),
            "commitment1".to_string(),
            "commitment999".to_string(),
        ]);
        
        assert_eq!(results, vec![true, true, false]);
    }

    #[test]
    fn test_add_remove_delegator() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        // Add delegator
        let context = get_context(env::current_account_id()).build();
        testing_env!(context);
        
        contract.add_delegator(accounts(2));
        assert!(contract.is_delegator_authorized(accounts(2)));
        
        // Remove delegator
        contract.remove_delegator(accounts(2));
        assert!(!contract.is_delegator_authorized(accounts(2)));
    }

    #[test]
    fn test_privacy_no_account_stored() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = get_context(accounts(1)).build();
        testing_env!(context);
        
        let commitment = "commitment_hash_123".to_string();
        let registration = DelegatedRegistration {
            npub: "npub1abc123".to_string(),
            commitment: commitment.clone(),
            nullifier: "nullifier_hash".to_string(),
            nep413_signature: "sig".to_string(),
            user_public_key: "pk".to_string(),
            message: "msg".to_string(),
            nonce: 0,
        };
        
        contract.register_via_delegator(registration, "sig".to_string());
        
        // Get identity
        let identity = contract.get_identity(commitment).unwrap();
        
        // Verify: NO user account_id in identity struct!
        assert_eq!(identity.delegator, accounts(1)); // Only delegator stored
        assert_eq!(identity.npub, "npub1abc123");
        assert_eq!(identity.commitment, "commitment_hash_123");
        // User's actual NEAR account is NOT stored anywhere on-chain!
    }
}
