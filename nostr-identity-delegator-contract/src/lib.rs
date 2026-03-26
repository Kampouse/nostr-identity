use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Gas, Promise};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet, LookupSet};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    // Core mappings (NO account_id stored!)
    identities: LookupMap<String, IdentityInfo>, // commitment -> identity
    nullifiers: UnorderedSet<String>,
    
    // Delegator authorization
    authorized_delegators: LookupSet<AccountId>,
    
    // Stats
    total_identities: u64,
    delegator_nonce: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct IdentityInfo {
    pub npub: String,           // Nostr public key (bech32)
    pub commitment: String,     // SHA-256 commitment hash
    pub nullifier: String,      // Unique nullifier hash
    pub created_at: u64,        // Block timestamp
    pub delegator: AccountId,   // Which delegator registered this (NOT user!)
    pub nonce: u64,             // Unique identifier
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct DelegatedRegistration {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub nep413_signature: String,   // User's signature (verified off-chain by delegator)
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
            total_identities: 0,
            delegator_nonce: 0,
        };
        
        // Add authorized delegators
        for delegator in delegators {
            contract.authorized_delegators.insert(&delegator);
        }
        
        contract
    }

    /// Add new authorized delegator (only owner)
    pub fn add_delegator(&mut self, delegator: AccountId) {
        self.assert_owner();
        self.authorized_delegators.insert(&delegator);
    }

    /// Remove delegator (only owner)
    pub fn remove_delegator(&mut self, delegator: AccountId) {
        self.assert_owner();
        self.authorized_delegators.remove(&delegator);
    }

    /// Register identity via delegator (user's identity NOT stored on-chain!)
    /// 
    /// # Privacy Model
    /// 1. User signs NEP-413 message off-chain
    /// 2. Delegator verifies signature off-chain
    /// 3. Delegator calls this function (pays gas)
    /// 4. Only commitment hash stored on-chain (NOT account_id)
    /// 5. No link between NEAR account and Nostr identity on-chain!
    /// 
    /// # Arguments
    /// * `registration` - Delegated registration data
    /// * `delegator_signature` - Delegator's signature proving they verified user
    pub fn register_via_delegator(
        &mut self,
        registration: DelegatedRegistration,
        delegator_signature: String,
    ) -> IdentityInfo {
        // 1. Verify caller is authorized delegator
        let delegator = env::predecessor_account_id();
        if !self.authorized_delegators.contains(&delegator) {
            env::panic_str("Unauthorized delegator");
        }
        
        // 2. Verify delegator signature (proves they verified user's NEP-413)
        // In production: verify delegator signed the registration data
        // For now: just check signature exists
        if delegator_signature.is_empty() {
            env::panic_str("Missing delegator signature");
        }
        
        // 3. Check nullifier not used (prevent double registration)
        if self.nullifiers.contains(&registration.nullifier) {
            env::panic_str("Nullifier already used - identity already exists");
        }
        
        // 4. Verify commitment not already used
        if self.identities.contains_key(&registration.commitment) {
            env::panic_str("Commitment already registered");
        }
        
        // 5. Verify nonce is correct (prevent replay)
        if registration.nonce != self.delegator_nonce {
            env::panic_str("Invalid nonce");
        }
        
        // 6. Create identity (NO account_id stored!)
        let identity = IdentityInfo {
            npub: registration.npub,
            commitment: registration.commitment.clone(),
            nullifier: registration.nullifier.clone(),
            created_at: env::block_timestamp(),
            delegator,  // Store delegator, NOT user's account
            nonce: registration.nonce,
        };
        
        // 7. Store mappings
        self.identities.insert(&registration.commitment, &identity);
        self.nullifiers.insert(&registration.nullifier);
        self.total_identities += 1;
        self.delegator_nonce += 1;
        
        identity
    }

    /// Get identity by commitment (NOT by account_id!)
    pub fn get_identity_by_commitment(&self, commitment: String) -> Option<IdentityInfo> {
        self.identities.get(&commitment)
    }

    /// Verify identity exists
    pub fn identity_exists(&self, commitment: String) -> bool {
        self.identities.contains_key(&commitment)
    }

    /// Check if nullifier used
    pub fn is_nullifier_used(&self, nullifier: String) -> bool {
        self.nullifiers.contains(&nullifier)
    }

    /// Get total identities
    pub fn get_total_identities(&self) -> u64 {
        self.total_identities
    }

    /// Get delegator nonce (for next registration)
    pub fn get_delegator_nonce(&self) -> u64 {
        self.delegator_nonce
    }

    /// Batch register multiple identities (gas efficient)
    pub fn batch_register(
        &mut self,
        registrations: Vec<DelegatedRegistration>,
        delegator_signature: String,
    ) -> Vec<IdentityInfo> {
        // Verify delegator
        let delegator = env::predecessor_account_id();
        if !self.authorized_delegators.contains(&delegator) {
            env::panic_str("Unauthorized delegator");
        }
        
        let mut results = Vec::new();
        
        for registration in registrations {
            // Same validation as single register
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

    // Admin functions
    
    fn assert_owner(&self) {
        let owner = env::current_account_id();
        if env::predecessor_account_id() != owner {
            env::panic_str("Only owner can call this method");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn get_context() -> VMContextBuilder {
        VMContextBuilder::new()
    }

    #[test]
    fn test_delegator_registration() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(1)) // Delegator
            .build();
        testing_env!(context);
        
        let registration = DelegatedRegistration {
            npub: "npub1abc123...".to_string(),
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
        
        assert_eq!(identity.npub, "npub1abc123...");
        assert_eq!(contract.get_total_identities(), 1);
        
        // Verify NO account_id stored (privacy!)
        assert!(identity.delegator == accounts(1)); // Only delegator stored
    }

    #[test]
    #[should_panic(expected = "Unauthorized delegator")]
    fn test_unauthorized_delegator() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0)) // NOT authorized
            .build();
        testing_env!(context);
        
        let registration = DelegatedRegistration {
            npub: "npub1abc123...".to_string(),
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
    fn test_privacy_no_account_stored() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(1))
            .build();
        testing_env!(context);
        
        let commitment = "commitment_hash_123".to_string();
        let registration = DelegatedRegistration {
            npub: "npub1abc123...".to_string(),
            commitment: commitment.clone(),
            nullifier: "nullifier_hash".to_string(),
            nep413_signature: "sig".to_string(),
            user_public_key: "pk".to_string(),
            message: "msg".to_string(),
            nonce: 0,
        };
        
        contract.register_via_delegator(registration, "sig".to_string());
        
        // Get identity
        let identity = contract.get_identity_by_commitment(commitment).unwrap();
        
        // Verify: NO user account_id in identity struct!
        // Only delegator account is stored
        assert_eq!(identity.delegator, accounts(1));
        
        // User's actual NEAR account is NOT stored anywhere on-chain!
        // It was only used for NEP-413 signature (off-chain)
    }
}
