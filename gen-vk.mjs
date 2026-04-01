import { execSync } from 'child_process';

// Generate VK using cargo test inside the zkp-wasm crate
const output = execSync(
  'cargo test print_vk -- --nocapture 2>&1',
  { cwd: '/Users/asil/.openclaw/workspace/nostr-identity/packages/zkp-wasm', encoding: 'utf8', timeout: 180000 }
);

const match = output.match(/VK_HEX=([0-9a-f]+)/);
if (match) {
  console.log(match[1]);
} else {
  console.error('VK not found in output');
  console.error(output.slice(-500));
  process.exit(1);
}
