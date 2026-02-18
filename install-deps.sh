#!/bin/bash
set -e

# With npm workspaces, a single install at root handles all packages.
# Shared deps (react, @mysten/sui, vite, etc.) are hoisted and installed once.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📦 Installing all workspace dependencies..."
cd "$SCRIPT_DIR"
npm ci

echo "✅ All dependencies installed!"
