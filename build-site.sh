#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "🧹 Cleaning previous build..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# ── Build Card Crawler ──────────────────────────────────
echo "🃏 Building Card Crawler..."
cd "$SCRIPT_DIR/examples/card_crawler/frontend"
npx vite build
cp -r dist/ "$DIST_DIR/card-crawler"

# ── Build Sokoban ───────────────────────────────────────
echo "📦 Building Sokoban..."
cd "$SCRIPT_DIR/examples/sokoban/frontend"
npx vite build
cp -r dist/ "$DIST_DIR/sokoban"

# ── Build Tactics Ogre ──────────────────────────────────
echo "⚔️  Building Tactics Ogre..."
cd "$SCRIPT_DIR/examples/tactics_ogre/frontend"
npx vite build
cp -r dist/ "$DIST_DIR/tactics-ogre"

# ── Copy Landing Page ───────────────────────────────────
echo "🏠 Copying landing page..."
cp "$SCRIPT_DIR/site/index.html" "$DIST_DIR/index.html"
cp "$SCRIPT_DIR/site/sokoban-cover.png" "$DIST_DIR/sokoban-cover.png"
cp "$SCRIPT_DIR/site/card-crawler-cover.png" "$DIST_DIR/card-crawler-cover.png"
cp "$SCRIPT_DIR/site/tactics_ogre.png" "$DIST_DIR/tactics_ogre.png"

echo ""
echo "✅ Build complete! Output: $DIST_DIR"
echo ""
echo "   /                → Landing page"
echo "   /card-crawler/   → Card Crawler"
echo "   /sokoban/        → Sokoban"
echo "   /tactics-ogre/   → Tactics Ogre"
echo ""
echo "To preview locally:"
echo "   npx serve $DIST_DIR"
