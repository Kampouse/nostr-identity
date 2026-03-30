import { KeyPair } from 'near-api-js';
import { createHash, randomBytes } from 'crypto';
import bs58 from 'bs58';
import fs from 'fs';

async function main() {
  const cred = JSON.parse(fs.readFileSync('/Users/asil/.near-credentials/testnet/nostr-test-001.kampouse.testnet.json', 'utf8'));
  const kp = KeyPair.fromString(cred.private_key);

  const accountId = cred.account_id;
  const nonce = randomBytes(32).toString('base64'); // ONE nonce, reused twice
  const recipient = 'nostr-identity.near';
  const message = `Generate Nostr identity for ${accountId}`;

  const payload = JSON.stringify({ message, nonce, recipient });
  const hash = createHash('sha256').update(payload).digest();

  const sig = kp.sign(hash);
  const sigBytes = Buffer.from(sig.signature);
  const sigB58 = bs58.encode(sigBytes);

  const teePayload = {
    action: 'generate',
    account_id: accountId,
    nep413_response: {
      account_id: accountId,
      public_key: sig.publicKey.toString(),
      signature: `ed25519:${sigB58}`,
      authRequest: { message, nonce, recipient }
    }
  };

  console.log('Nonce:', nonce);
  console.log('\n=== FIRST CALL ===');
  const r1 = await fetch('https://api.outlayer.fastnear.com/call/kampouse.near/nostr-identity-tee', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Key': 'kampouse.near:REDACTED_PAYMENT_KEY',
    },
    body: JSON.stringify({ input: teePayload, async: false }),
  });
  const j1 = await r1.json();
  console.log('Success:', j1.output?.success, '| Error:', j1.output?.error || 'none');

  console.log('\n=== SECOND CALL (same nonce) ===');
  const r2 = await fetch('https://api.outlayer.fastnear.com/call/kampouse.near/nostr-identity-tee', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Key': 'kampouse.near:REDACTED_PAYMENT_KEY',
    },
    body: JSON.stringify({ input: teePayload, async: false }),
  });
  const j2 = await r2.json();
  console.log('Success:', j2.output?.success, '| Error:', j2.output?.error || 'none');
}

main().catch(console.error);
