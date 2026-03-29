use near_sdk::{env, near, PanicOnDefault};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use borsh::BorshSchema;
use schemars::JsonSchema;
use serde::{Serialize, Deserialize};

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, JsonSchema, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct IdentityInfo {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub created_at: u64,
    pub delegator: String,
    pub nonce: u64,
}

#[derive(BorshSerialize, BorshDeserialize, BorshSchema, JsonSchema, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Registration {
    pub npub: String,
    pub commitment: String,
    pub nullifier: String,
    pub nep413_signature: String,
    pub user_public_key: String,
    pub message: String,
    pub nonce: u64,
}

#[near(serializers=[borsh])]
#[derive(PanicOnDefault)]
pub struct Contract {
    identities: Vec<IdentityInfo>,
    delegators: Vec<String>,
    nonce: u64,
}

#[near]
impl Contract {
    pub fn new(delegators: Vec<String>) -> Contract {
        Contract {
            identities: Vec::new(),
            delegators,
            nonce: 0,
        }
    }

    pub fn register(&mut self, reg: Registration, sig: String) -> IdentityInfo {
        let caller = env::predecessor_account_id().to_string();
        assert!(self.delegators.contains(&caller), "Unauthorized");
        assert!(!sig.is_empty(), "Missing sig");
        assert!(reg.nonce == self.nonce, "Bad nonce");
        assert!(
            !self.identities.iter().any(|i| i.nullifier == reg.nullifier),
            "Nullifier used"
        );
        assert!(
            !self.identities.iter().any(|i| i.commitment == reg.commitment),
            "Commitment exists"
        );

        let info = IdentityInfo {
            npub: reg.npub,
            commitment: reg.commitment.clone(),
            nullifier: reg.nullifier.clone(),
            created_at: env::block_timestamp(),
            delegator: caller,
            nonce: reg.nonce,
        };
        self.identities.push(info.clone());
        self.nonce += 1;
        info
    }

    pub fn get_identity(&self, commitment: String) -> Option<IdentityInfo> {
        self.identities.iter().find(|i| i.commitment == commitment).cloned()
    }

    pub fn exists(&self, commitment: String) -> bool {
        self.identities.iter().any(|i| i.commitment == commitment)
    }

    pub fn nullifier_used(&self, nullifier: String) -> bool {
        self.identities.iter().any(|i| i.nullifier == nullifier)
    }

    pub fn total(&self) -> u64 {
        self.identities.len() as u64
    }

    pub fn nonce(&self) -> u64 {
        self.nonce
    }
}
