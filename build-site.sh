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

# ── Build each example (parallel where possible) ─────────
PIDS=()
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
      (
        cd "$FRONTEND_DIR"
        npx vite build
        mkdir -p "$DIST_DIR/$SLUG"
        cp -r dist/* "$DIST_DIR/$SLUG/"
      ) &
      PIDS+=($!)
    else
      echo "⚠️  Skipping $NAME — no frontend/package.json found"
    fi
  fi
done

# Wait for all parallel builds to finish
FAILED=0
for pid in "${PIDS[@]}"; do
  if ! wait "$pid"; then
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo "❌ One or more game builds failed!"
  exit 1
fi

# ── Copy landing page (simple HTML redirect) ─────────────
echo "🏠 Copying landing page..."
cp "$SCRIPT_DIR/index.html" "$DIST_DIR/index.html"

# ── Copy cover images ────────────────────────────────────
for manifest in "$SCRIPT_DIR"/examples/*/example.json; do
  [ -f "$manifest" ] || continue
  EXAMPLE_DIR="$(dirname "$manifest")"
  SLUG=$(python3 -c "import json; print(json.load(open('$manifest'))['slug'])")

  if [ -f "$EXAMPLE_DIR/cover.png" ]; then
    mkdir -p "$DIST_DIR/$SLUG"
    cp "$EXAMPLE_DIR/cover.png" "$DIST_DIR/$SLUG/cover.png"
    echo "🖼️  Copied cover.png → /$SLUG/cover.png"
  fi
done

# ── Generate games.json ──────────────────────────────────
echo "📋 Generating games.json..."
node "$SCRIPT_DIR/scripts/collect-games.mjs"

# ── Summary ──────────────────────────────────────────────
echo ""
echo "✅ Build complete! Output: $DIST_DIR"
echo ""
echo "   /                → Redirect (google.com placeholder)"
echo "   /api/games.json  → Game list"
for manifest in "$SCRIPT_DIR"/examples/*/example.json; do
  [ -f "$manifest" ] || continue
  SLUG=$(python3 -c "import json; print(json.load(open('$manifest'))['slug'])")
  NAME=$(python3 -c "import json; print(json.load(open('$manifest'))['name'])")
  echo "   /$SLUG/   → $NAME"
done
echo ""
echo "To preview locally:"
echo "   npx serve $DIST_DIR"
