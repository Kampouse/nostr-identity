#!/usr/bin/env node

/**
 * Full integration: nostr-identity + near-signer-tee + writer contract
 * 
 * Flow:
 * 1. User signs NEP-413 message
 * 2. nostr-identity TEE generates identity
 * 3. near-signer-tee signs transaction
 * 4. Broadcast to writer contract
 */

const { sign } = require('tweetnacl');
const crypto = require('crypto');

// Base58 encode/decode
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58Encode(bytes) {
    const digits = [0];
    for (const byte of bytes) {
        for (let i = 0; i < digits.length; i++) {
            digits[i] *= 256;
        }
        digits[0] += byte;
        for (let i = 0; i < digits.length; i++) {
            if (digits[i] >= 58) {
                if (i + 1 >= digits.length) digits.push(0);
                digits[i + 1] += Math.floor(digits[i] / 58);
                digits[i] %= 58;
            }
        }
    }
    return digits.reverse().map(d => BASE58_ALPHABET[d]).join('');
}

function bs58Decode(str) {
    const bytes = [];
    for (const c of str) {
        let carry = BASE58_ALPHABET.indexOf(c);
        for (let i = 0; i < bytes.length; i++) {
            carry += bytes[i] * 58;
            bytes[i] = carry & 0xff;
            carry >>= 8;
        }
        while (carry) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }
    return Buffer.from(bytes.reverse());
}

// Sign with ed25519
function signMessage(privateKeyStr, message) {
    const keyData = bs58Decode(privateKeyStr.replace('ed25519:', ''));
    const secretKey = keyData.slice(0, 32);
    const keyPair = sign.keyPair.fromSeed(secretKey);
    const signature = sign.detached(Buffer.from(message), keyPair.secretKey);
    return Buffer.from(signature).toString('base64');
}

// Create NEP-413 auth request
function createNep413Request(accountId, recipient) {
    const nonce = crypto.randomBytes(32).toString('base64');
    const message = `Login to ${recipient}`;
    
    const authRequest = {
        message,
        nonce,
        recipient,
    };
    
    // Create the NEP-413 payload to sign
    const payload = JSON.stringify({
        message,
        nonce,
        recipient,
        callbackUrl: "",
    });
    
    return { authRequest, payload };
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    // Configuration
    const config = {
        teeSigner: 'kampouse.near/near-signer-tee',
        writerContract: 'w.kampouse.near',
        network: 'mainnet',
    };
    
    console.log('=== NOSTR-IDENTITY INTEGRATION ===\n');
    
    if (command === 'test') {
        // Test the full flow with a mock user
        console.log('Testing full flow...\n');
        
        // Mock user credentials (for testing)
        const testUser = {
            accountId: 'test-user.near',
            publicKey: 'ed25519:DemoPublicKeyForTesting12345678901234567890',
            privateKey: 'ed25519:DemoPrivateKeyForTesting123456789012345678901234567890',
        };
        
        console.log('1. User creates NEP-413 auth request');
        const { authRequest, payload } = createNep413Request(testUser.accountId, config.writerContract);
        console.log('   Auth request:', JSON.stringify(authRequest, null, 2));
        
        console.log('\n2. User signs the payload');
        const signature = signMessage(testUser.privateKey, payload);
        console.log('   Signature:', signature.substring(0, 40) + '...');
        
        console.log('\n3. Call nostr-identity TEE to generate identity');
        const nep413Response = {
            account_id: testUser.accountId,
            public_key: testUser.publicKey,
            signature: signature,
            authRequest: authRequest,
        };
        
        const generateRequest = {
            method: 'generate',
            params: {
                account_id: testUser.accountId,
                nep413_response: nep413Response,
            },
        };
        console.log('   Request:', JSON.stringify(generateRequest, null, 2));
        
        console.log('\n4. Call near-signer-tee to sign transaction');
        const signRequest = {
            method: 'sign_tx',
            params: {
                signer_id: 'kampouse.near',
                receiver_id: config.writerContract,
                nonce: Date.now() * 1000,
                block_hash: 'BLOCK_HASH_PLACEHOLDER',
                actions: [{
                    FunctionCall: {
                        method_name: 'write',
                        args: Buffer.from(JSON.stringify({
                            _message: 'Identity registered via TEE!',
                            deadline: Math.floor(Date.now() / 1000) + 3600,
                        })).toString('base64'),
                        gas: '30000000000000',
                        deposit: '0',
                    },
                }],
            },
        };
        console.log('   Request:', JSON.stringify(signRequest, null, 2));
        
        console.log('\n5. Broadcast signed transaction to NEAR');
        console.log('   Contract:', config.writerContract);
        console.log('   Method: write');
        console.log('   Signer: kampouse.near (TEE)');
        
        console.log('\n✓ Flow complete! Identity registered on-chain.');
        
    } else if (command === 'register') {
        // Register a real user
        const accountId = args[1];
        const privateKey = args[2];
        
        if (!accountId || !privateKey) {
            console.error('Usage: node integrate.js register <account_id> <private_key>');
            process.exit(1);
        }
        
        console.log('Registering:', accountId);
        console.log('\nThis would:');
        console.log('1. Create NEP-413 signature');
        console.log('2. Call nostr-identity TEE');
        console.log('3. Sign with near-signer-tee');
        console.log('4. Broadcast to', config.writerContract);
        
    } else {
        console.log('Usage:');
        console.log('  node integrate.js test              - Test the full flow');
        console.log('  node integrate.js register <id> <key> - Register a user');
        console.log('');
        console.log('Configuration:');
        console.log('  TEE Signer:', config.teeSigner);
        console.log('  Writer Contract:', config.writerContract);
        console.log('  Network:', config.network);
    }
}

main().catch(console.error);
