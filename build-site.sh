#!/bin/bash
set -e

# ──────────────────────────────────────────────────────────
#  build-site.sh — Build all examples and assemble the
#                  dist/ directory for deployment
# ──────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "🧹 Cleaning previous build..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# ── Build each example ───────────────────────────────────
for manifest in "$SCRIPT_DIR"/examples/*/example.json; do
  [ -f "$manifest" ] || continue
  EXAMPLE_DIR="$(dirname "$manifest")"
  DIR_NAME="$(basename "$EXAMPLE_DIR")"

  NAME=$(python3 -c "import json; print(json.load(open('$manifest'))['name'])")
  SLUG=$(python3 -c "import json; print(json.load(open('$manifest'))['slug'])")
  HAS_FRONTEND=$(python3 -c "import json; print(json.load(open('$manifest')).get('hasFrontend', False))")

  if [ "$HAS_FRONTEND" = "True" ]; then
    FRONTEND_DIR="$EXAMPLE_DIR/frontend"
    if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
      echo "🔨 Building $NAME..."
      cd "$FRONTEND_DIR"
      npx vite build
      cp -r dist/ "$DIST_DIR/$SLUG"
    else
      echo "⚠️  Skipping $NAME — no frontend/package.json found"
    fi
  fi
done

# ── Build landing site (React + Vite) ────────────────────
echo "🏠 Building landing site..."
cd "$SCRIPT_DIR/site"
npm run build
cp -r dist/* "$DIST_DIR/"

for manifest in "$SCRIPT_DIR"/examples/*/example.json; do
  [ -f "$manifest" ] || continue
  EXAMPLE_DIR="$(dirname "$manifest")"
  DIR_NAME="$(basename "$EXAMPLE_DIR")"

  if [ -f "$EXAMPLE_DIR/cover.png" ]; then
    mkdir -p "$DIST_DIR/examples/$DIR_NAME"
    cp "$EXAMPLE_DIR/cover.png" "$DIST_DIR/examples/$DIR_NAME/cover.png"
  fi
done

# ── Summary ──────────────────────────────────────────────
echo ""
echo "✅ Build complete! Output: $DIST_DIR"
echo ""
echo "   /                → Landing page"
for manifest in "$SCRIPT_DIR"/examples/*/example.json; do
  [ -f "$manifest" ] || continue
  SLUG=$(python3 -c "import json; print(json.load(open('$manifest'))['slug'])")
  NAME=$(python3 -c "import json; print(json.load(open('$manifest'))['name'])")
  echo "   /$SLUG/   → $NAME"
done
echo ""
echo "To preview locally:"
echo "   npx serve $DIST_DIR"
