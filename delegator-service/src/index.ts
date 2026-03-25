import { connect, keyStores, utils } from 'near-api-js';
import { sha256 } from 'js-sha256';
import { verify } from '@noble/ed25519';

// Configuration
const config = {
  networkId: 'testnet',
  keyStore: new keyStores.InMemoryKeyStore(),
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  contractId: 'nostr-identity.testnet',
};

// Types
interface DelegatedRegistration {
  npub: string;
  commitment: string;
  nullifier: string;
  nep413_signature: string;
  user_public_key: string;
  message: string;
  nonce: number;
}

interface VerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Delegator Service for nostr-identity
 * 
 * Responsibilities:
 * 1. Verify user's NEP-413 signature (off-chain)
 * 2. Generate commitment and nullifier
 * 3. Call smart contract to register identity
 * 4. Maintain private database (optional)
 */
export class DelegatorService {
  private near: any;
  private account: any;
  private contract: any;
  private db: Map<string, string>; // In-memory database (use real DB in production)
  
  constructor(private delegatorAccountId: string, privateKey: string) {
    this.db = new Map();
  }
  
  /**
   * Initialize connection to NEAR
   */
  async init() {
    // Add delegator's private key to keystore
    const keyPair = utils.KeyPair.fromString(privateKey);
    await config.keyStore.setKey(config.networkId, this.delegatorAccountId, keyPair);
    
    this.near = await connect(config);
    this.account = await this.near.account(this.delegatorAccountId);
    
    console.log(`✅ Delegator service initialized: ${this.delegatorAccountId}`);
  }
  
  /**
   * Get current nonce from contract
   */
  async getNonce(): Promise<number> {
    const nonce = await this.account.viewFunction(
      config.contractId,
      'get_delegator_nonce',
      {}
    );
    return parseInt(nonce);
  }
  
  /**
   * Verify NEP-413 signature
   */
  async verifyNEP413Signature(
    accountId: string,
    message: string,
    signature: string,
    publicKey: string
  ): Promise<VerificationResult> {
    try {
      // 1. Verify message contains account_id
      if (!message.includes(accountId)) {
        return { isValid: false, error: 'Message must contain account_id' };
      }
      
      // 2. Parse public key
      const pubKeyBytes = this.parsePublicKey(publicKey);
      
      // 3. Hash message (NEP-413 spec)
      const messageHash = sha256(message);
      const messageBytes = new Uint8Array(messageHash);
      
      // 4. Parse signature
      const signatureBytes = this.parseSignature(signature);
      
      // 5. Verify signature
      const isValid = await verify(signatureBytes, messageBytes, pubKeyBytes);
      
      if (!isValid) {
        return { isValid: false, error: 'Invalid signature' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }
  
  /**
   * Generate commitment hash
   */
  generateCommitment(accountId: string, nonce: number): string {
    const input = `commitment:${accountId}:${nonce}`;
    return sha256(input);
  }
  
  /**
   * Generate nullifier hash
   */
  generateNullifier(accountId: string, nonce: number): string {
    const input = `nullifier:${accountId}:${nonce}`;
    return sha256(input);
  }
  
  /**
   * Register user identity
   */
  async registerIdentity(
    accountId: string,
    npub: string,
    nep413Signature: string,
    userPublicKey: string,
    message: string
  ): Promise<{ success: boolean; commitment?: string; error?: string }> {
    try {
      // 1. Verify NEP-413 signature
      const verification = await this.verifyNEP413Signature(
        accountId,
        message,
        nep413Signature,
        userPublicKey
      );
      
      if (!verification.isValid) {
        return { success: false, error: verification.error };
      }
      
      // 2. Get nonce
      const nonce = await this.getNonce();
      
      // 3. Generate commitment and nullifier
      const commitment = this.generateCommitment(accountId, nonce);
      const nullifier = this.generateNullifier(accountId, nonce);
      
      // 4. Create registration
      const registration: DelegatedRegistration = {
        npub,
        commitment,
        nullifier,
        nep413_signature: nep413Signature,
        user_public_key: userPublicKey,
        message,
        nonce,
      };
      
      // 5. Sign as delegator
      const delegatorSignature = await this.signAsDelegator(registration);
      
      // 6. Call smart contract
      const result = await this.account.functionCall({
        contractId: config.contractId,
        methodName: 'register_via_delegator',
        args: {
          registration,
          delegator_signature: delegatorSignature,
        },
        gas: '30000000000000',
        attachedDeposit: '0',
      });
      
      // 7. Store in private database (optional)
      this.db.set(commitment, accountId);
      this.db.set(`npub:${npub}`, accountId);
      
      console.log(`✅ Identity registered: ${accountId} -> ${npub}`);
      
      return { success: true, commitment };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Batch register multiple identities
   */
  async batchRegisterIdentities(
    users: Array<{
      accountId: string;
      npub: string;
      nep413Signature: string;
      userPublicKey: string;
      message: string;
    }>
  ): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = [];
    const registrations: DelegatedRegistration[] = [];
    
    for (const user of users) {
      // Verify each signature
      const verification = await this.verifyNEP413Signature(
        user.accountId,
        user.message,
        user.nep413Signature,
        user.userPublicKey
      );
      
      if (!verification.isValid) {
        errors.push(`${user.accountId}: ${verification.error}`);
        continue;
      }
      
      const nonce = await this.getNonce() + registrations.length;
      
      registrations.push({
        npub: user.npub,
        commitment: this.generateCommitment(user.accountId, nonce),
        nullifier: this.generateNullifier(user.accountId, nonce),
        nep413_signature: user.nep413Signature,
        user_public_key: user.userPublicKey,
        message: user.message,
        nonce,
      });
    }
    
    if (registrations.length === 0) {
      return { success: false, count: 0, errors };
    }
    
    // Batch call
    const delegatorSignature = await this.signAsDelegator(registrations);
    
    const result = await this.account.functionCall({
      contractId: config.contractId,
      methodName: 'batch_register',
      args: {
        registrations,
        delegator_signature: delegatorSignature,
      },
      gas: '300000000000000',
      attachedDeposit: '0',
    });
    
    // Store in database
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const reg = registrations[i];
      if (reg) {
        this.db.set(reg.commitment, user.accountId);
        this.db.set(`npub:${user.npub}`, user.accountId);
      }
    }
    
    console.log(`✅ Batch registered ${registrations.length} identities`);
    
    return { success: true, count: registrations.length, errors };
  }
  
  /**
   * Get account by commitment (from private database)
   */
  getAccountByCommitment(commitment: string): string | undefined {
    return this.db.get(commitment);
  }
  
  /**
   * Get account by npub (from private database)
   */
  getAccountByNpub(npub: string): string | undefined {
    return this.db.get(`npub:${npub}`);
  }
  
  /**
   * Sign registration as delegator
   */
  private async signAsDelegator(data: any): Promise<string> {
    const message = JSON.stringify(data);
    const messageHash = sha256(message);
    const signature = await this.account.signMessage(new Uint8Array(messageHash));
    return signature.signature;
  }
  
  /**
   * Parse public key from string
   */
  private parsePublicKey(publicKey: string): Uint8Array {
    // Remove 'ed25519:' prefix if present
    const key = publicKey.replace('ed25519:', '');
    return new Uint8Array(Buffer.from(key, 'base64'));
  }
  
  /**
   * Parse signature from string
   */
  private parseSignature(signature: string): Uint8Array {
    // Remove 'ed25519:' prefix if present
    const sig = signature.replace('ed25519:', '');
    return new Uint8Array(Buffer.from(sig, 'base64'));
  }
}

// Example usage
async function main() {
  const delegatorService = new DelegatorService(
    'delegator.testnet',
    'ed25519:...' // Your delegator's private key
  );
  
  await delegatorService.init();
  
  // Register single identity
  const result = await delegatorService.registerIdentity(
    'alice.testnet',
    'npub1abc123...',
    'ed25519:...',
    'ed25519:...',
    'Register Nostr identity for alice.testnet'
  );
  
  if (result.success) {
    console.log('✅ Identity registered:', result.commitment);
  } else {
    console.log('❌ Registration failed:', result.error);
  }
  
  // Batch register
  const batchResult = await delegatorService.batchRegisterIdentities([
    {
      accountId: 'bob.testnet',
      npub: 'npub1def456...',
      nep413Signature: 'ed25519:...',
      userPublicKey: 'ed25519:...',
      message: 'Register Nostr identity for bob.testnet',
    },
    {
      accountId: 'carol.testnet',
      npub: 'npub1ghi789...',
      nep413Signature: 'ed25519:...',
      userPublicKey: 'ed25519:...',
      message: 'Register Nostr identity for carol.testnet',
    },
  ]);
  
  console.log(`✅ Batch registered ${batchResult.count} identities`);
  
  // Query private database
  const account = delegatorService.getAccountByCommitment(result.commitment);
  console.log('Account for commitment:', account);
}

// Export for use in other modules
export default DelegatorService;
