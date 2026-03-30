import { KeyPair } from 'near-api-js';
import { createHash, randomBytes } from 'crypto';
import bs58 from 'bs58';
import fs from 'fs';

async function main() {
  const cred = JSON.parse(fs.readFileSync('/Users/asil/.near-credentials/testnet/nostr-test-002.kampouse.testnet.json', 'utf8'));
  const kp = KeyPair.fromString(cred.private_key);

  const accountId = cred.account_id;
  const recipient = 'nostr-identity.near';
  const message = `Generate Nostr identity for ${accountId}`;
  const signingKey = 'ed25519:REDACTED_SIGNING_KEY';

  async function callTEE(label) {
    const nonce = randomBytes(32).toString('base64');
    const payload = JSON.stringify({ message, nonce, recipient });
    const hash = createHash('sha256').update(payload).digest();
    const sig = kp.sign(hash);
    const sigB58 = bs58.encode(Buffer.from(sig.signature));

    const resp = await fetch('https://api.outlayer.fastnear.com/call/kampouse.near/nostr-identity-tee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': 'kampouse.near:REDACTED_PAYMENT_KEY',
      },
      body: JSON.stringify({ input: {
        action: 'generate',
        account_id: accountId,
        nep413_response: {
          account_id: accountId,
          public_key: sig.publicKey.toString(),
          signature: `ed25519:${sigB58}`,
          authRequest: { message, nonce, recipient }
        },
        writer_contract_id: 'nostr-identity.kampouse.testnet',
        signing_key: signingKey,
      }, async: false }),
    });

    const result = await resp.json();
    const output = typeof result.output === 'string' ? JSON.parse(result.output) : result.output;
    console.log(`${label}: success=${output.success} error=${output.error || 'none'} tx=${output.transaction_hash || 'none'}`);
  }

  await callTEE('RUN 1');
  await callTEE('RUN 2 (should fail)');
}

main().catch(console.error);
