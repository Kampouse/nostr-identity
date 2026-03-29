// near_tx.rs - NEAR Transaction types with proper borsh serialization

use borsh::{BorshSerialize, BorshDeserialize};

/// NEAR PublicKey
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
#[borsh(use_discriminant = true)]
#[repr(u8)]
pub enum PublicKey {
    ED25519([u8; 32]) = 0,
    SECP256K1([u8; 64]) = 1,
}

/// NEAR Signature
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
#[borsh(use_discriminant = true)]
#[repr(u8)]
pub enum Signature {
    ED25519([u8; 64]) = 0,
    SECP256K1([u8; 65]) = 1,
}

/// AccessKeyPermission
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
#[borsh(use_discriminant = true)]
#[repr(u8)]
pub enum AccessKeyPermission {
    FullAccess = 0,
    FunctionCall { allowance: Option<u128>, receiver_id: String, method_names: Vec<String> } = 1,
}

/// AccessKey
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AccessKey {
    pub nonce: u64,
    pub permission: AccessKeyPermission,
}

/// FunctionCall action
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct FunctionCallAction {
    pub method_name: String,
    pub args: Vec<u8>,
    pub gas: u64,
    pub deposit: u128,
}

/// NEAR Action enum
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
#[borsh(use_discriminant = true)]
#[repr(u8)]
pub enum Action {
    CreateAccount = 0,
    DeployContract { code: Vec<u8> } = 1,
    FunctionCall(FunctionCallAction) = 2,
    Transfer { deposit: u128 } = 3,
    Stake { stake: u128, public_key: PublicKey } = 4,
    AddKey { public_key: PublicKey, access_key: AccessKey } = 5,
    DeleteKey { public_key: PublicKey } = 6,
    DeleteAccount { beneficiary_id: String } = 7,
}

/// Transaction
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Transaction {
    pub signer_id: String,
    pub public_key: PublicKey,
    pub nonce: u64,
    pub receiver_id: String,
    pub block_hash: [u8; 32],
    pub actions: Vec<Action>,
}

/// SignedTransaction - nearcore: transaction FIRST, signature AFTER
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SignedTransaction {
    pub transaction: Transaction,
    pub signature: Signature,
}
