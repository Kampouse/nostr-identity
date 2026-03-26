#!/bin/bash
set -e

echo "🧹 Cleaning nostr-identity monorepo..."

# Clean root
echo "Cleaning root..."
rm -rf node_modules

# Clean apps
echo "Cleaning apps..."
rm -rf apps/*/node_modules
rm -rf apps/*/.next
rm -rf apps/*/out

# Clean packages
echo "Cleaning packages..."
rm -rf packages/*/dist
rm -rf packages/*/node_modules

# Clean services
echo "Cleaning services..."
rm -rf services/*/node_modules

# Clean contracts
echo "Cleaning contracts..."
for dir in contracts/*/; do
  if [ -f "$dir/Cargo.toml" ]; then
    echo "  Cleaning $(basename $dir)..."
    (cd "$dir" && cargo clean 2>/dev/null || true)
  fi
done

echo "✅ Clean complete!"
