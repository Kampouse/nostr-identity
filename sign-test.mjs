import { KeyPair } from 'near-api-js';
import { createHash, randomBytes } from 'crypto';
import bs58 from 'bs58';
import fs from 'fs';

const cred = JSON.parse(fs.readFileSync('/Users/asil/.near-credentials/testnet/nostr-test-001.kampouse.testnet.json', 'utf8'));
const kp = KeyPair.fromString(cred.private_key);

const accountId = cred.account_id;
const nonce = randomBytes(32).toString('base64');
const recipient = 'nostr-identity.near';
const message = `Generate Nostr identity for ${accountId}`;

const payload = JSON.stringify({ message, nonce, recipient });
const hash = createHash('sha256').update(payload).digest();

const sig = kp.sign(hash);

// Convert signature from base64 to base58 (NEAR format)
const sigBytes = Buffer.from(sig.signature);
const sigB58 = bs58.encode(sigBytes);

const result = {
  accountId,
  publicKey: sig.publicKey.toString(),  // already base58
  signature: `ed25519:${sigB58}`,
  message,
  nonce,
  recipient,
};

console.log(JSON.stringify(result, null, 2));
