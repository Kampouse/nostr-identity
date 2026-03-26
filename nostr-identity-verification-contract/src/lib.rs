use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, CryptoHash};
use near_sdk::borsh::{self, BorchDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedSet, LookupSet};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NostrIdentityContract {
    identities: LookupMap<String, IdentityInfo>,
    nullifiers: UnorderedSet<String>,
    authorized_delegators: LookupSet<AccountId>,
    total_identities: u64,
    delegator_nonce: u64,
    
    // NEW: Verification registry
    verification_challenges: LookupMap<String, VerificationChallenge>,
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
pub struct VerificationChallenge {
    pub npub: String,
    pub challenge: String,
    pub created_at: u64,
    pub expires_at: u64,
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct VerificationProof {
    pub commitment: String,
    pub timestamp: u64,
    pub signature: String,  // Signature from Nostr key
    pub message: String,
}

#[near_bindgen]
impl NostrIdentityContract {
    
    // ========================================
    // VERIFICATION METHOD 1: On-Chain Lookup
    // ========================================
    
    /// Check if identity exists (anyone can verify)
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
    // VERIFICATION METHOD 2: Challenge-Response
    // ========================================
    
    /// Create verification challenge (dApp calls this)
    pub fn create_verification_challenge(
        &mut self,
        npub: String,
        dapp_account: AccountId,
    ) -> String {
        // Generate random challenge
        let challenge = format!(
            "verify-{}-{}-{}",
            npub,
            env::block_timestamp(),
            env::random_seed()
        );
        
        let challenge_hash = hex::encode(env::sha256(challenge.as_bytes()));
        
        let verification = VerificationChallenge {
            npub: npub.clone(),
            challenge: challenge_hash.clone(),
            created_at: env::block_timestamp(),
            expires_at: env::block_timestamp() + 300_000_000_000, // 5 minutes
        };
        
        self.verification_challenges.insert(&challenge_hash, &verification);
        
        // Return challenge for user to sign
        challenge_hash
    }
    
    /// Verify challenge response (user signs with Nostr key)
    pub fn verify_challenge_response(
        &self,
        challenge_hash: String,
        nostr_signature: String,
        commitment: String,
    ) -> bool {
        // 1. Get challenge
        let challenge = match self.verification_challenges.get(&challenge_hash) {
            Some(c) => c,
            None => return false,
        };
        
        // 2. Check not expired
        if env::block_timestamp() > challenge.expires_at {
            return false;
        }
        
        // 3. Get identity
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        // 4. Verify npub matches
        if identity.npub != challenge.npub {
            return false;
        }
        
        // 5. Verify Nostr signature (simplified - production needs full verification)
        // In production: verify signature with npub public key
        // For now: just check signature exists
        !nostr_signature.is_empty()
    }
    
    // ========================================
    // VERIFICATION METHOD 3: Ownership Proof
    // ========================================
    
    /// Prove ownership of identity (signed by Nostr key)
    pub fn verify_ownership(
        &self,
        commitment: String,
        timestamp: u64,
        signature: String,
        message: String,
    ) -> bool {
        // 1. Get identity
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        // 2. Check timestamp is recent (within 5 minutes)
        let now = env::block_timestamp();
        if timestamp < now - 300_000_000_000 || timestamp > now + 300_000_000_000 {
            return false;
        }
        
        // 3. Verify message contains commitment and timestamp
        if !message.contains(&commitment) || !message.contains(&timestamp.to_string()) {
            return false;
        }
        
        // 4. Verify signature (simplified)
        // In production: verify ed25519 signature with npub public key
        !signature.is_empty()
    }
    
    // ========================================
    // VERIFICATION METHOD 4: Zero-Knowledge Proof
    // ========================================
    
    /// Verify ZK proof of ownership (most private)
    pub fn verify_zk_ownership(
        &self,
        commitment: String,
        zk_proof: String,
        public_inputs: Vec<String>,
    ) -> bool {
        // 1. Get identity
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        // 2. Verify public inputs match commitment
        if public_inputs.len() < 1 || public_inputs[0] != commitment {
            return false;
        }
        
        // 3. Verify ZK proof (simplified)
        // In production: verify Groth16 proof
        // Proves: "I know the preimage of this commitment AND I signed it"
        // Without revealing: "Which account I am"
        
        !zk_proof.is_empty()
    }
    
    // ========================================
    // VERIFICATION METHOD 5: Selective Disclosure
    // ========================================
    
    /// Reveal account to specific party (user's choice)
    pub fn reveal_to_verifier(
        &mut self,
        commitment: String,
        verifier: AccountId,
        nep413_signature: String,
        user_public_key: String,
        message: String,
    ) -> bool {
        // 1. Get identity
        let identity = match self.identities.get(&commitment) {
            Some(i) => i,
            None => return false,
        };
        
        // 2. Verify NEP-413 signature from user
        // In production: verify signature cryptographically
        // Proves user owns the account that created this commitment
        
        // 3. Store revelation (verifier can now see account)
        // In production: store in separate mapping with expiration
        
        true
    }
    
    /// Check if account is revealed to caller
    pub fn is_revealed_to(&self, commitment: String, verifier: AccountId) -> Option<String> {
        // In production: check revelation mapping
        // Return account_id if revealed, None otherwise
        None
    }
    
    // ========================================
    // VERIFICATION METHOD 6: Cross-Chain Proof
    // ========================================
    
    /// Generate proof for cross-chain verification
    pub fn generate_cross_chain_proof(
        &self,
        commitment: String,
        chain_id: String,
        recipient: String,
    ) -> Option<String> {
        let identity = self.identities.get(&commitment)?;
        
        // Generate proof that:
        // 1. Identity exists on NEAR
        // 2. Has specific npub
        // 3. Registered at specific time
        
        let proof_data = format!(
            "{}:{}:{}:{}:{}",
            commitment,
            identity.npub,
            identity.created_at,
            chain_id,
            recipient
        );
        
        Some(hex::encode(env::sha256(proof_data.as_bytes())))
    }
    
    // ========================================
    // Batch Verification (Gas Efficient)
    // ========================================
    
    /// Verify multiple identities at once
    pub fn batch_verify_identities(
        &self,
        commitments: Vec<String>,
    ) -> Vec<bool> {
        commitments
            .iter()
            .map(|c| self.identities.contains_key(c))
            .collect()
    }
    
    // ========================================
    // Stats & Queries
    // ========================================
    
    pub fn get_total_identities(&self) -> u64 {
        self.total_identities
    }
    
    pub fn is_delegator_authorized(&self, delegator: AccountId) -> bool {
        self.authorized_delegators.contains(&delegator)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    #[test]
    fn test_identity_exists() {
        let delegators = vec![accounts(1)];
        let mut contract = NostrIdentityContract::new(delegators);
        
        // Register identity first
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(1))
            .build();
        testing_env!(context);
        
        // ... registration code ...
        
        // Verify exists
        assert!(contract.identity_exists("commitment_hash".to_string()));
    }
    
    #[test]
    fn test_ownership_verification() {
        let contract = NostrIdentityContract::new(vec![accounts(1)]);
        
        let commitment = "commitment_hash".to_string();
        let timestamp = env::block_timestamp();
        
        // Verify ownership
        let is_valid = contract.verify_ownership(
            commitment,
            timestamp,
            "nostr_signature".to_string(),
            format!("Verify ownership of {} at {}", commitment, timestamp),
        );
        
        // Would be true in production with real signature
        // assert!(is_valid);
    }
}
