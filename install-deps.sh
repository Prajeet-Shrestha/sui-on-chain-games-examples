#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📦 Installing dependencies for all examples..."

for dir in "$SCRIPT_DIR"/examples/*/frontend; do
  if [ -f "$dir/package.json" ]; then
    echo "  → $(basename "$(dirname "$dir")")/frontend"
    cd "$dir"
    npm ci
  fi
done

echo "✅ All dependencies installed!"
