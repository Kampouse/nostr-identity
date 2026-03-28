use near_sdk::{env, near, AccountId, BorshStorageKey};
use near_sdk::collections::{LookupMap, LookupSet};
use borsh::{BorshDeserialize, BorshSerialize, BorshSchema};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(BorshSerialize, BorshDeserialize, BorshStorageKey)]
enum StorageKey {
    Identities,
    Nullifiers,
    Delegators,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, BorshSchema, JsonSchema)]
pub struct Identity {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub created_at: u64,
    pub delegator: String,
}

#[near(contract_state)]
pub struct NostrWriter {
    identities: LookupMap<String, Identity>,
    nullifiers: LookupSet<String>,
    delegators: LookupSet<AccountId>,
    nonce: u64,
}

impl Default for NostrWriter {
    fn default() -> Self {
        Self {
            identities: LookupMap::new(StorageKey::Identities),
            nullifiers: LookupSet::new(StorageKey::Nullifiers),
            delegators: LookupSet::new(StorageKey::Delegators),
            nonce: 0,
        }
    }
}

#[near]
impl NostrWriter {
    #[init]
    pub fn new(delegators: Vec<AccountId>) -> Self {
        let mut contract = Self::default();
        for d in delegators {
            contract.delegators.insert(&d);
        }
        contract
    }

    pub fn register(
        &mut self,
        npub: String,
        commitment: String,
        nullifier: String,
        sig: String,
    ) -> Identity {
        let caller = env::predecessor_account_id();
        assert!(self.delegators.contains(&caller), "Unauthorized");
        assert!(!sig.is_empty(), "Missing sig");
        assert!(!self.nullifiers.contains(&nullifier), "Nullifier used");
        assert!(!self.identities.contains_key(&commitment), "Already registered");

        let identity = Identity {
            npub,
            commitment: commitment.clone(),
            nullifier: nullifier.clone(),
            created_at: env::block_timestamp(),
            delegator: caller.to_string(),
        };
        self.identities.insert(&commitment, &identity);
        self.nullifiers.insert(&nullifier);
        self.nonce += 1;
        identity
    }

    pub fn exists(&self, commitment: String) -> bool {
        self.identities.contains_key(&commitment)
    }

    pub fn get_identity(&self, commitment: String) -> Option<Identity> {
        self.identities.get(&commitment)
    }

    pub fn total(&self) -> u64 {
        self.nonce
    }

    pub fn nonce(&self) -> u64 {
        self.nonce
    }
}
