#!/bin/bash
set -e

# ──────────────────────────────────────────────────────────
#  generate-site.sh — Regenerate site/index.html from
#                      examples/*/example.json manifests
# ──────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="$SCRIPT_DIR/site"
INDEX="$SITE_DIR/index.html"

mkdir -p "$SITE_DIR"

# ── Collect game cards HTML ──────────────────────────────
CARDS=""
COUNT=0

for manifest in "$SCRIPT_DIR"/examples/*/example.json; do
  [ -f "$manifest" ] || continue
  EXAMPLE_DIR="$(dirname "$manifest")"
  DIR_NAME="$(basename "$EXAMPLE_DIR")"

  NAME=$(python3 -c "import json,sys; print(json.load(open('$manifest'))['name'])")
  SLUG=$(python3 -c "import json,sys; print(json.load(open('$manifest'))['slug'])")
  DESC=$(python3 -c "import json,sys; print(json.load(open('$manifest'))['description'])")
  TAGS_JSON=$(python3 -c "import json,sys; print(json.dumps(json.load(open('$manifest'))['tags']))")

  # Build tags HTML
  TAGS_HTML=""
  TAG_COUNT=$(python3 -c "import json,sys; print(len(json.load(open('$manifest'))['tags']))")
  for (( i=0; i<TAG_COUNT; i++ )); do
    TAG=$(python3 -c "import json,sys; print(json.load(open('$manifest'))['tags'][$i])")
    TAGS_HTML+="            <span class=\"tag\">$TAG</span>"$'\n'
  done
  TAGS_HTML+="            <span class=\"tag tag-free\">FREE</span>"

  # Cover image: reference directly from example folder
  COVER_SRC="../examples/${DIR_NAME}/cover.png"

  CARDS+="
      <a href=\"/${SLUG}/\" class=\"game-card\">
        <div class=\"card-banner\">
          <img src=\"${COVER_SRC}\" alt=\"${NAME}\" />
          <div class=\"title-overlay\"><h2>${NAME}</h2></div>
        </div>
        <div class=\"card-body\">
          <div class=\"card-meta\">
${TAGS_HTML}
          </div>
          <p class=\"card-desc\">${DESC}</p>
        </div>
      </a>
"
  COUNT=$((COUNT + 1))
done

echo "📄 Found $COUNT example(s)"

# ── Write index.html ─────────────────────────────────────
cat > "$INDEX" <<'HEADER'
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>On-Chain Games</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    /* ========== RESET ========== */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* ========== DESIGN TOKENS ========== */
    :root {
      --bg:            #1a1a2e;
      --bg-card:       #16213e;
      --bg-card-hover: #1a2745;
      --accent:        #e94560;
      --accent-hover:  #ff6b81;
      --tag-bg:        rgba(233, 69, 96, 0.15);
      --tag-border:    rgba(233, 69, 96, 0.4);
      --tag-text:      #ff6b81;
      --free-bg:       rgba(20, 174, 92, 0.15);
      --free-border:   rgba(20, 174, 92, 0.4);
      --free-text:     #5cdb95;
      --text:          #eaeaea;
      --text-secondary:#8892a4;
      --text-muted:    #6c7893;
      --border:        rgba(255,255,255,0.06);
      --radius:        8px;
      --ease:          cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ========== BASE ========== */
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    /* ========== PAGE ========== */
    .page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    /* ========== HEADER ========== */
    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }
    .section-header h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .sui-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-radius: 999px;
      border: 1px solid rgba(77, 171, 247, 0.35);
      background: rgba(77, 171, 247, 0.1);
      color: #7ec8f8;
    }
    .sui-pill svg { width: 12px; height: 12px; }

    /* ========== GAMES GRID ========== */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    @media (max-width: 900px) {
      .games-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 560px) {
      .games-grid { grid-template-columns: 1fr; }
    }

    /* ========== GAME CARD ========== */
    .game-card {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--bg-card);
      border: 1px solid var(--border);
      transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease), border-color 0.25s var(--ease);
    }
    .game-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.45);
      border-color: rgba(255,255,255,0.1);
    }

    /* Banner */
    .card-banner {
      position: relative;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #0f1629;
    }
    .card-banner img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.4s var(--ease);
    }
    .game-card:hover .card-banner img {
      transform: scale(1.05);
    }
    /* Title overlay at bottom of image */
    .card-banner .title-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      padding: 32px 14px 10px;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
      pointer-events: none;
    }
    .card-banner .title-overlay h2 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
      text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }

    /* Card body */
    .card-body {
      padding: 12px 14px 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Tags row */
    .card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      background: var(--tag-bg);
      border: 1px solid var(--tag-border);
      color: var(--tag-text);
    }
    .tag-free {
      background: var(--free-bg);
      border-color: var(--free-border);
      color: var(--free-text);
    }

    /* Description */
    .card-desc {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ========== FOOTER ========== */
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-muted);
    }
    .footer a {
      color: #7ec8f8;
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer a:hover { color: #a8dcfa; }
  </style>
</head>
<body>

  <div class="page">

    <!-- HEADER -->
    <div class="section-header">
      <h1>On-Chain Games</h1>
      <span class="sui-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        Built on Sui
      </span>
    </div>

    <!-- GAMES -->
    <div class="games-grid">
HEADER

# ── Append cards ─────────────────────────────────────────
echo "$CARDS" >> "$INDEX"

# ── Close HTML ───────────────────────────────────────────
cat >> "$INDEX" <<'FOOTER'
    </div>

    <!-- FOOTER -->
    <footer class="footer">
      Built with <a href="https://sui.io" target="_blank">Sui</a> · Open-source ECS game engine
    </footer>
  </div>

</body>
</html>
FOOTER

echo "✅ Generated $INDEX with $COUNT game card(s)"
