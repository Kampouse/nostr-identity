use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    // Core mappings
    identities: LookupMap<AccountId, IdentityInfo>,
    commitments: LookupMap<String, AccountId>, // commitment hash -> account
    nullifiers: UnorderedSet<String>, // Prevent double registration
    
    // Stats
    total_identities: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct IdentityInfo {
    pub npub: String,           // Nostr public key (bech32)
    pub commitment: String,     // SHA-256 commitment hash
    pub nullifier: String,      // Unique nullifier hash
    pub created_at: u64,        // Block timestamp
    pub owner: AccountId,       // NEAR account that owns this identity
}

#[derive(BorshSerialize, BorshDeserialize)]
pub enum IdentityStatus {
    Registered,
    NotRegistered,
    InvalidSignature,
}

#[near_bindgen]
impl NostrIdentityContract {
    #[init]
    pub fn new() -> Self {
        Self {
            identities: LookupMap::new(b"i"),
            commitments: LookupMap::new(b"c"),
            nullifiers: UnorderedSet::new(b"n"),
            total_identities: 0,
        }
    }

    /// Register a new Nostr identity
    /// 
    /// # Arguments
    /// * `npub` - Nostr public key (bech32 encoded)
    /// * `commitment` - SHA-256 hash of commitment data
    /// * `nullifier` - Unique nullifier to prevent double registration
    /// * `signature` - NEP-413 signature from wallet proving ownership
    /// * `public_key` - NEAR public key that signed the message
    /// * `message` - The signed message (must include account_id and npub)
    /// 
    /// # Returns
    /// Identity registration confirmation
    pub fn register_identity(
        &mut self,
        npub: String,
        commitment: String,
        nullifier: String,
        signature: String,
        public_key: String,
        message: String,
    ) -> IdentityInfo {
        let account_id = env::predecessor_account_id();
        
        // 1. Check if already registered
        if self.identities.contains_key(&account_id) {
            env::panic_str("Identity already registered for this account");
        }
        
        // 2. Check nullifier not used (prevent double registration)
        if self.nullifiers.contains(&nullifier) {
            env::panic_str("Nullifier already used - identity already exists");
        }
        
        // 3. Verify NEP-413 signature (simplified - production needs full verification)
        // In production: verify signature against message hash using ed25519
        // For now: just verify message contains account_id
        if !message.contains(&account_id.to_string()) {
            env::panic_str("Invalid signature - message must contain account_id");
        }
        
        // 4. Verify commitment not already used
        if self.commitments.contains_key(&commitment) {
            env::panic_str("Commitment already registered");
        }
        
        // 5. Create identity
        let identity = IdentityInfo {
            npub,
            commitment: commitment.clone(),
            nullifier: nullifier.clone(),
            created_at: env::block_timestamp(),
            owner: account_id.clone(),
        };
        
        // 6. Store mappings
        self.identities.insert(&account_id, &identity);
        self.commitments.insert(&commitment, &account_id);
        self.nullifiers.insert(&nullifier);
        self.total_identities += 1;
        
        identity
    }

    /// Get identity for an account
    pub fn get_identity(&self, account_id: AccountId) -> Option<IdentityInfo> {
        self.identities.get(&account_id)
    }

    /// Check if identity exists
    pub fn has_identity(&self, account_id: AccountId) -> bool {
        self.identities.contains_key(&account_id)
    }

    /// Verify identity by npub
    pub fn verify_identity(&self, npub: String) -> Option<AccountId> {
        // Would need reverse mapping in production
        // For now: iterate (inefficient) or add reverse map
        None // Placeholder
    }

    /// Get total registered identities
    pub fn get_total_identities(&self) -> u64 {
        self.total_identities
    }

    /// Check if commitment is registered
    pub fn is_commitment_registered(&self, commitment: String) -> bool {
        self.commitments.contains_key(&commitment)
    }

    /// Check if nullifier is used
    pub fn is_nullifier_used(&self, nullifier: String) -> bool {
        self.nullifiers.contains(&nullifier)
    }

    /// Recover identity (must be called by owner)
    pub fn recover_identity(&self) -> Option<IdentityInfo> {
        let account_id = env::predecessor_account_id();
        self.identities.get(&account_id)
    }

    /// Transfer identity to new account (requires signature from both)
    pub fn transfer_identity(
        &mut self,
        new_owner: AccountId,
        signature_from_old: String,
        signature_from_new: String,
    ) -> bool {
        let old_owner = env::predecessor_account_id();
        
        // 1. Verify old owner has identity
        let mut identity = match self.identities.get(&old_owner) {
            Some(id) => id,
            None => env::panic_str("No identity to transfer"),
        };
        
        // 2. Verify signatures (simplified)
        // Production: verify both signatures cryptographically
        
        // 3. Update ownership
        identity.owner = new_owner.clone();
        
        // 4. Update mappings
        self.identities.remove(&old_owner);
        self.identities.insert(&new_owner, &identity);
        
        // 5. Update commitment mapping
        self.commitments.insert(&identity.commitment, &new_owner);
        
        true
    }

    /// Revoke identity (permanent deletion)
    pub fn revoke_identity(&mut self) -> bool {
        let account_id = env::predecessor_account_id();
        
        if let Some(identity) = self.identities.get(&account_id) {
            // Remove all mappings
            self.identities.remove(&account_id);
            self.commitments.remove(&identity.commitment);
            self.nullifiers.remove(&identity.nullifier);
            self.total_identities -= 1;
            true
        } else {
            env::panic_str("No identity to revoke");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    #[test]
    fn test_register_identity() {
        let mut contract = NostrIdentityContract::new();
        
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0))
            .build();
        testing_env!(context);
        
        let identity = contract.register_identity(
            "npub1abc123...".to_string(),
            "commitment_hash_123".to_string(),
            "nullifier_hash_456".to_string(),
            "signature_placeholder".to_string(),
            "ed25519:placeholder".to_string(),
            "Register identity for alice.test.near".to_string(),
        );
        
        assert_eq!(identity.npub, "npub1abc123...");
        assert_eq!(contract.get_total_identities(), 1);
    }

    #[test]
    #[should_panic(expected = "Identity already registered")]
    fn test_double_registration() {
        let mut contract = NostrIdentityContract::new();
        
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0))
            .build();
        testing_env!(context);
        
        // First registration
        contract.register_identity(
            "npub1abc123...".to_string(),
            "commitment_hash_123".to_string(),
            "nullifier_hash_456".to_string(),
            "sig1".to_string(),
            "pk1".to_string(),
            "Register for alice.test.near".to_string(),
        );
        
        // Second registration (should fail)
        contract.register_identity(
            "npub1def456...".to_string(),
            "commitment_hash_789".to_string(),
            "nullifier_hash_012".to_string(),
            "sig2".to_string(),
            "pk2".to_string(),
            "Register for alice.test.near".to_string(),
        );
    }

    #[test]
    fn test_get_identity() {
        let mut contract = NostrIdentityContract::new();
        
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0))
            .build();
        testing_env!(context);
        
        contract.register_identity(
            "npub1abc123...".to_string(),
            "commitment_hash_123".to_string(),
            "nullifier_hash_456".to_string(),
            "sig".to_string(),
            "pk".to_string(),
            "Register for alice.test.near".to_string(),
        );
        
        let identity = contract.get_identity(accounts(0));
        assert!(identity.is_some());
        assert_eq!(identity.unwrap().npub, "npub1abc123...");
    }
}
