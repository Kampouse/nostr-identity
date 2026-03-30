/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nostr-identity/crypto', '@nostr-identity/zkp-wasm', '@nostr-identity/types', '@nostr-identity/nostr'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;

// Enable Cloudflare bindings during local dev
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
