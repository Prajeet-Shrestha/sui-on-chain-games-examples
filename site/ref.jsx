import { useState, useMemo } from "react";

// ─── JSON Data ────────────────────────────────────────────────────────────────
// serials chosen from high-coverage prefixes (SLES 95%, SLUS 89%, SLPM 82%)
// cover URL: https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg
const GAMES = [
  {
    dirName: "card_crawler",
    name: "Card Crawler",
    slug: "card-crawler",
    tags: ["Strategy", "Deck Builder"],
    description: "A deck-building dungeon crawler. Draft cards, fight monsters, and survive the dungeon — all verified on-chain.",
    hasFrontend: true,
    serial: "SLES-51228",
  },
  {
    dirName: "flappy_bird",
    name: "Flappy Bird",
    slug: "flappy-bird",
    tags: ["Arcade", "Casual"],
    description: "A decentralized clone of the classic Flappy Bird game.",
    hasFrontend: true,
    serial: "SLES-50504",
  },
  {
    dirName: "maze_game",
    name: "Maze Game",
    slug: "maze-game",
    tags: ["Puzzle", "Strategy"],
    description: "Navigate through a maze on the Sui blockchain.",
    hasFrontend: true,
    serial: "SCES-51221",
  },
  {
    dirName: "sandbox_game",
    name: "SuiCraft",
    slug: "suicraft",
    tags: ["Sandbox", "Building"],
    description: "A fully on-chain sandbox game on Sui.",
    hasFrontend: true,
    serial: "SLES-50533",
  },
  {
    dirName: "sokoban",
    name: "Sokoban",
    slug: "sokoban",
    tags: ["Puzzle", "Pixel Art"],
    description: "The classic box-pushing puzzle game, reimagined with pixel art and on-chain solution verification.",
    hasFrontend: true,
    serial: "SLES-51080",
  },
  {
    dirName: "tactics_ogre",
    name: "Tactics Ogre",
    slug: "tactics-ogre",
    tags: ["Tactics", "RPG"],
    description: "A tactical RPG with squad management, turn-based combat on isometric grids, and full on-chain battles.",
    hasFrontend: true,
    serial: "SLES-53776",
  },
  {
    dirName: "tetris_game",
    name: "Sui Tetris",
    slug: "sui-tetris",
    tags: ["Arcade", "Puzzle"],
    description: "A fully on-chain Tetris game.",
    hasFrontend: true,
    serial: "SLES-50330",
  },
];

// PS2 cover from xlenore/ps2-covers repo; fallback to picsum on error
const PS2_BASE = "https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default";
const coverOf  = (g) =>
  g.serial
    ? `${PS2_BASE}/${g.serial}.jpg`
    : `https://picsum.photos/seed/${g.dirName}/300/420`;
const fallback = (e, g) => { e.target.src = `https://picsum.photos/seed/${g.dirName}/300/420`; };

const ALL_TAGS = ["All", ...Array.from(new Set(GAMES.flatMap((g) => g.tags)))];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Tag({ label }) {
  return <span className="tag-chip">{label}</span>;
}

function OnChainBadge() {
  return <span className="onchain-badge">⛓ ON-CHAIN</span>;
}

function GameCard({ game, index }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className={`game-card${hov ? " hov" : ""}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="card-img-wrap">
        <img
          src={coverOf(game)}
          alt={game.name}
          className={`card-img${hov ? " hov" : ""}`}
          onError={(e) => fallback(e, game)}
        />
        <div className="card-img-top">
          <span className={`card-badge badge-${index % 5}`}>{game.tags[0]}</span>
          {game.hasFrontend && <OnChainBadge />}
        </div>
        <div className="card-serial">{game.serial}</div>
        <div className="card-img-fade" />
      </div>

      <div className="card-body">
        <p className={`card-title${hov ? " hov" : ""}`}>{game.name}</p>
        <p className="card-desc">{game.description}</p>
        <div className="card-tags">
          {game.tags.map((t, j) => <Tag key={j} label={t} />)}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [search,    setSearch]    = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [activeTop, setActiveTop] = useState("Today");
  const [heroIdx,   setHeroIdx]   = useState(0);

  const featured = GAMES[heroIdx];

  const filtered = useMemo(() => {
    let list = GAMES;
    if (activeTag !== "All") list = list.filter((g) => g.tags.includes(activeTag));
    if (search.trim())       list = list.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [search, activeTag]);

  return (
    <div className="root">
      <style>{`
        /* ── Design tokens ──────────────────────────────────────── */
        :root {
          --color--grey-500:     #6c7584;
          --color--grey-700:     #343940;
          --color--grey-600:     #4b515b;
          --color--grey-800:     #222529;
          --color--grey-900:     #131518;
          --color--grey-400:     #89919f;
          --color--grey-300:     #a1a7b2;
          --color--grey-200:     #c2c6cd;
          --color--grey-100:     #e0e2e6;
          --color--grey-50:      #f4f5f7;
          --color--cultured:     #f7f7f7;
          --color--primary-blue: #298dff;
          --color--white:        white;
          --color--black:        black;

          --global--padding-global:     1.25em;
          --global--padding-global-mob: .75em;
          --global--no-padd:            0em;

          --gaps--gap-2:   .125em;
          --gaps--gap-4:   .25em;
          --gaps--gap-6:   .375em;
          --gaps--gap-8:   .5em;
          --gaps--gap-10:  .625em;
          --gaps--gap-12:  .75em;
          --gaps--gap-16:  1em;
          --gaps--gap-18:  1.125em;
          --gaps--gap-20:  1.25em;
          --gaps--gap-24:  1.5em;
          --gaps--gap-32:  2em;
          --gaps--gap-40:  2.5em;
          --gaps--gap-48:  3em;
          --gaps--gap-64:  4em;
          --gaps--gap-80:  5em;
          --gaps--gap-96:  6em;
          --gaps--gap-112: 7em;
          --gaps--gap-128: 8em;

          --blocks--size-block-2:  .125em;
          --blocks--size-block-4:  .25em;
          --blocks--size-block-6:  .375em;
          --blocks--size-block-8:  .5em;
          --blocks--size-block-12: .75em;
          --blocks--size-block-14: .875em;
          --blocks--size-block-16: 1em;
          --blocks--size-block-18: 1.125em;
          --blocks--size-block-20: 1.25em;
        }

        /* ── Reset ─────────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--color--black); }
        ::-webkit-scrollbar-thumb { background: var(--color--grey-700); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--color--primary-blue); }

        /* ── Root ──────────────────────────────────────────────── */
        .root {
          background-color: var(--color--black);
          color: var(--color--grey-300);
          font-family: "TWK Everett", Arial, sans-serif;
          line-height: 1.25;
          min-height: 100vh;
        }

        /* ── Navbar ────────────────────────────────────────────── */
        .navbar {
          background-color: var(--color--grey-900);
          border-bottom: 1px solid var(--color--grey-800);
          position: sticky; top: 0; z-index: 100;
          padding: 0 var(--global--padding-global);
          display: flex; align-items: center;
          height: 3.5em; gap: var(--gaps--gap-16);
        }
        .logo {
          display: flex; align-items: center;
          gap: var(--gaps--gap-8); cursor: pointer;
          flex-shrink: 0; text-decoration: none;
        }
        .logo-icon {
          width: 2em; height: 2em;
          background-color: var(--color--primary-blue);
          border-radius: var(--gaps--gap-6);
          display: flex; align-items: center;
          justify-content: center;
          font-size: .875em; font-weight: 700;
          color: var(--color--white); letter-spacing: -.5px;
        }
        .logo-text {
          font-size: var(--blocks--size-block-16);
          font-weight: 700; color: var(--color--white); letter-spacing: -.3px;
        }
        .search-wrap {
          flex: 1; max-width: 24em; position: relative;
        }
        .search-icon {
          position: absolute; left: var(--gaps--gap-10);
          top: 50%; transform: translateY(-50%);
          color: var(--color--grey-500); font-size: .8em;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: var(--color--grey-800);
          border: 1px solid var(--color--grey-700);
          border-radius: var(--gaps--gap-6);
          padding: var(--gaps--gap-8) var(--gaps--gap-12) var(--gaps--gap-8) 2em;
          color: var(--color--white);
          font-family: inherit; font-size: var(--blocks--size-block-14);
          line-height: 1.25; outline: none;
          transition: border-color .2s;
        }
        .search-input::placeholder { color: var(--color--grey-500); }
        .search-input:focus { border-color: var(--color--primary-blue); }
        .nav-right {
          margin-left: auto; display: flex;
          align-items: center; gap: var(--gaps--gap-12);
        }
        .nav-count {
          font-size: var(--blocks--size-block-12);
          color: var(--color--grey-500); font-weight: 600;
        }
        .connect-btn {
          background: var(--color--primary-blue);
          color: var(--color--white); border: none;
          border-radius: var(--gaps--gap-6);
          padding: var(--gaps--gap-8) var(--gaps--gap-16);
          font-weight: 700; font-size: var(--blocks--size-block-12);
          cursor: pointer; font-family: inherit;
          transition: opacity .2s;
        }
        .connect-btn:hover { opacity: .82; }

        /* ── Layout ────────────────────────────────────────────── */
        .layout {
          display: flex; max-width: 86em;
          margin: 0 auto;
          padding: 0 var(--global--padding-global) var(--gaps--gap-64);
        }
        .main { flex: 1; min-width: 0; }
        .sidebar {
          width: 17.5em; flex-shrink: 0;
          margin-left: var(--gaps--gap-24);
        }
        .sidebar-inner { position: sticky; top: 4em; }

        /* ── Hero ──────────────────────────────────────────────── */
        .hero {
          position: relative; overflow: hidden;
          border-radius: 0 0 var(--gaps--gap-12) var(--gaps--gap-12);
          margin-bottom: var(--gaps--gap-24); height: 21em;
        }
        .hero-img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to right,
            rgba(0,0,0,.95) 36%, rgba(0,0,0,.15));
        }
        .hero-content {
          position: absolute; bottom: 0; left: 0;
          padding: var(--gaps--gap-24) var(--gaps--gap-32);
          max-width: 32em;
        }
        .hero-pills {
          display: flex; flex-wrap: wrap;
          gap: var(--gaps--gap-6);
          margin-bottom: var(--gaps--gap-12);
        }
        .hero-serial {
          font-size: var(--blocks--size-block-12);
          color: var(--color--grey-600);
          font-weight: 600; letter-spacing: .5px;
          margin-bottom: var(--gaps--gap-6);
          font-variant-numeric: tabular-nums;
        }
        .hero-title {
          font-size: 1.75em; font-weight: 700;
          color: var(--color--white); line-height: 1.15;
          margin-bottom: var(--gaps--gap-8); letter-spacing: -.4px;
        }
        .hero-desc {
          font-size: var(--blocks--size-block-14);
          color: var(--color--grey-300); line-height: 1.6;
          margin-bottom: var(--gaps--gap-20);
        }
        .play-btn {
          display: inline-flex; align-items: center;
          gap: var(--gaps--gap-6);
          background: var(--color--white); color: var(--color--black);
          border: none; border-radius: 100px;
          padding: var(--gaps--gap-10) var(--gaps--gap-24);
          font-weight: 700; font-size: var(--blocks--size-block-14);
          cursor: pointer; font-family: inherit;
          transition: background .2s, color .2s, transform .2s;
        }
        .play-btn:hover {
          background: var(--color--primary-blue);
          color: var(--color--white); transform: scale(1.03);
        }
        .hero-dots {
          position: absolute; top: var(--gaps--gap-12);
          left: 50%; transform: translateX(-50%);
          display: flex; gap: var(--gaps--gap-6);
        }
        .dot {
          height: 6px; border-radius: 3px;
          background: rgba(255,255,255,.28);
          cursor: pointer; transition: all .3s;
        }
        .dot.active {
          background: var(--color--primary-blue);
          width: 1.375em !important;
        }

        /* ── Filter pills ──────────────────────────────────────── */
        .filter-row {
          display: flex; flex-wrap: wrap;
          gap: var(--gaps--gap-8);
          margin-bottom: var(--gaps--gap-20);
        }
        .fpill {
          cursor: pointer;
          padding: var(--gaps--gap-6) var(--gaps--gap-12);
          border-radius: 100px;
          font-size: var(--blocks--size-block-12); font-weight: 600;
          border: 1px solid var(--color--grey-700);
          background: transparent; color: var(--color--grey-400);
          font-family: inherit; line-height: 1.25;
          transition: all .2s; user-select: none;
        }
        .fpill:hover {
          border-color: var(--color--primary-blue);
          color: var(--color--primary-blue);
        }
        .fpill.active {
          background: var(--color--primary-blue);
          border-color: var(--color--primary-blue);
          color: var(--color--white);
        }

        /* ── Section header ────────────────────────────────────── */
        .section-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: var(--gaps--gap-16);
        }
        .section-title {
          font-size: var(--blocks--size-block-16); font-weight: 700;
          color: var(--color--white);
          border-left: 2px solid var(--color--primary-blue);
          padding-left: var(--gaps--gap-10);
          display: flex; align-items: center; gap: var(--gaps--gap-8);
        }
        .section-count {
          font-size: var(--blocks--size-block-12);
          font-weight: 500; color: var(--color--grey-500);
        }
        .reset-btn {
          background: none; border: 1px solid var(--color--grey-700);
          color: var(--color--grey-500); border-radius: var(--gaps--gap-6);
          padding: var(--gaps--gap-4) var(--gaps--gap-10);
          font-size: var(--blocks--size-block-12);
          cursor: pointer; font-family: inherit; transition: all .2s;
        }
        .reset-btn:hover {
          border-color: var(--color--grey-500);
          color: var(--color--grey-200);
        }

        /* ── Game grid ─────────────────────────────────────────── */
        .game-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(11em, 1fr));
          gap: var(--gaps--gap-16);
        }

        /* ── Game card ─────────────────────────────────────────── */
        .game-card {
          cursor: pointer; border-radius: var(--gaps--gap-8);
          overflow: hidden;
          background: var(--color--grey-900);
          border: 1px solid var(--color--grey-800);
          display: flex; flex-direction: column;
          transition: border-color .25s, box-shadow .25s, transform .25s;
        }
        .game-card.hov {
          border-color: var(--color--primary-blue);
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(41,141,255,.18);
        }
        .card-img-wrap {
          position: relative; overflow: hidden;
          padding-bottom: 140%;
        }
        .card-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
          transition: transform .35s;
        }
        .card-img.hov { transform: scale(1.06); }
        .card-img-top {
          position: absolute; top: var(--gaps--gap-8);
          left: var(--gaps--gap-8); right: var(--gaps--gap-8);
          display: flex; justify-content: space-between;
          align-items: flex-start;
        }
        .card-img-fade {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 5em;
          background: linear-gradient(to top, var(--color--grey-900), transparent);
        }
        .card-serial {
          position: absolute; bottom: var(--gaps--gap-6);
          right: var(--gaps--gap-8);
          font-size: var(--blocks--size-block-8);
          color: var(--color--grey-600);
          font-weight: 600; letter-spacing: .4px;
          font-variant-numeric: tabular-nums;
        }
        .card-badge {
          font-size: var(--blocks--size-block-8); font-weight: 700;
          padding: .2em .55em; border-radius: var(--gaps--gap-4);
          text-transform: uppercase; letter-spacing: .4px;
          color: var(--color--white);
        }
        .badge-0 { background: var(--color--primary-blue); }
        .badge-1 { background: var(--color--grey-600); }
        .badge-2 { background: #1a5e38; }
        .badge-3 { background: #6b3a10; }
        .badge-4 { background: #3a1a5a; }
        .onchain-badge {
          font-size: var(--blocks--size-block-8); font-weight: 700;
          color: #4ade80; border: 1px solid rgba(74,222,128,.4);
          background: rgba(0,0,0,.65); backdrop-filter: blur(4px);
          border-radius: var(--gaps--gap-4); padding: .2em .5em;
          white-space: nowrap;
        }
        .card-body {
          padding: var(--gaps--gap-10) var(--gaps--gap-12) var(--gaps--gap-12);
          flex: 1; display: flex; flex-direction: column;
          gap: var(--gaps--gap-6);
        }
        .card-title {
          font-size: var(--blocks--size-block-14); font-weight: 700;
          color: var(--color--white); line-height: 1.25;
          transition: color .2s;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .card-title.hov { color: var(--color--primary-blue); }
        .card-desc {
          font-size: var(--blocks--size-block-12); color: var(--color--grey-500);
          line-height: 1.55; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .card-tags {
          display: flex; flex-wrap: wrap;
          gap: var(--gaps--gap-4); margin-top: var(--gaps--gap-4);
        }
        .tag-chip {
          font-size: var(--blocks--size-block-8); font-weight: 600;
          color: var(--color--grey-400);
          background: var(--color--grey-800);
          border: 1px solid var(--color--grey-700);
          border-radius: var(--gaps--gap-4); padding: .2em .55em;
          white-space: nowrap;
        }

        /* ── Empty ─────────────────────────────────────────────── */
        .empty {
          text-align: center;
          padding: var(--gaps--gap-64) var(--gaps--gap-20);
          color: var(--color--grey-600);
        }
        .empty-icon { font-size: 3em; margin-bottom: var(--gaps--gap-12); }
        .empty-title {
          font-size: var(--blocks--size-block-16); font-weight: 700;
          color: var(--color--grey-500); margin-bottom: var(--gaps--gap-6);
        }
        .empty-sub { font-size: var(--blocks--size-block-12); }

        /* ── Sidebar panels ────────────────────────────────────── */
        .panel {
          background: var(--color--grey-900);
          border: 1px solid var(--color--grey-800);
          border-radius: var(--gaps--gap-8);
          padding: var(--gaps--gap-16);
          margin-bottom: var(--gaps--gap-16);
        }
        .panel-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: var(--gaps--gap-12);
        }
        .panel-title {
          font-size: var(--blocks--size-block-14);
          font-weight: 700; color: var(--color--white); margin: 0;
        }
        .qf-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: var(--gaps--gap-6); margin-bottom: var(--gaps--gap-10);
        }
        .qf-btn {
          background: var(--color--grey-800);
          border: 1px solid var(--color--grey-700);
          border-radius: var(--gaps--gap-6);
          padding: var(--gaps--gap-6) var(--gaps--gap-8);
          color: var(--color--grey-400);
          font-size: var(--blocks--size-block-12); font-weight: 600;
          cursor: pointer; text-align: left; font-family: inherit;
          line-height: 1.4; transition: border-color .2s;
        }
        .qf-btn:hover { border-color: var(--color--primary-blue); }
        .qf-label {
          color: var(--color--grey-600); font-size: .7em;
          display: block; margin-bottom: 2px;
        }
        .qf-val { color: var(--color--grey-200); }
        .qf-input {
          width: 100%; background: var(--color--grey-800);
          border: 1px solid var(--color--grey-700);
          border-radius: var(--gaps--gap-6);
          padding: var(--gaps--gap-8) var(--gaps--gap-10);
          color: var(--color--white); font-family: inherit;
          font-size: var(--blocks--size-block-12); line-height: 1.25;
          margin-bottom: var(--gaps--gap-10); outline: none;
          transition: border-color .2s;
        }
        .qf-input::placeholder { color: var(--color--grey-600); }
        .qf-input:focus { border-color: var(--color--primary-blue); }
        .apply-btn {
          width: 100%; background: var(--color--primary-blue);
          color: var(--color--white); border: none;
          border-radius: var(--gaps--gap-6); padding: var(--gaps--gap-8);
          font-weight: 700; font-size: var(--blocks--size-block-12);
          cursor: pointer; font-family: inherit; line-height: 1.25;
          transition: opacity .2s;
        }
        .apply-btn:hover { opacity: .82; }
        .top-tabs { display: flex; gap: var(--gaps--gap-4); }
        .ttab {
          cursor: pointer;
          padding: var(--gaps--gap-4) var(--gaps--gap-8);
          border-radius: var(--gaps--gap-4);
          font-size: var(--blocks--size-block-12); font-weight: 600;
          color: var(--color--grey-500); transition: all .2s;
          user-select: none; border: none; background: none;
          font-family: inherit; line-height: 1.25;
        }
        .ttab:hover { color: var(--color--white); }
        .ttab.active {
          background: var(--color--grey-700);
          color: var(--color--white);
        }
        .top-hero {
          border-radius: var(--gaps--gap-6); overflow: hidden;
          position: relative; height: 7.5em; cursor: pointer;
          margin-bottom: var(--gaps--gap-2);
        }
        .top-hero-img {
          width: 100%; height: 100%; object-fit: cover;
          object-position: center top; display: block;
        }
        .top-hero-fade {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,.92) 30%, transparent);
        }
        .top-hero-content {
          position: absolute; bottom: var(--gaps--gap-8);
          left: var(--gaps--gap-8); right: var(--gaps--gap-8);
          display: flex; align-items: flex-end; gap: var(--gaps--gap-8);
        }
        .rank-badge {
          background: var(--color--primary-blue);
          color: var(--color--white); font-weight: 900;
          font-size: .9em; width: 1.75em; height: 1.75em;
          border-radius: var(--gaps--gap-4);
          display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .rank-badge.grey {
          background: var(--color--grey-700);
          color: var(--color--grey-300); font-size: .75em;
        }
        .top-name {
          font-size: var(--blocks--size-block-12); font-weight: 700;
          color: var(--color--white); line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .top-serial {
          font-size: var(--blocks--size-block-8);
          color: var(--color--grey-600); font-weight: 600;
          letter-spacing: .3px; margin-top: 2px;
        }
        .top-chip-row {
          display: flex; gap: var(--gaps--gap-4); margin-top: 3px;
        }
        .top-row {
          display: flex; align-items: center;
          gap: var(--gaps--gap-8);
          padding: var(--gaps--gap-8) var(--gaps--gap-4);
          border-top: 1px solid var(--color--grey-800);
          cursor: pointer; border-radius: var(--gaps--gap-6);
          transition: background .15s;
        }
        .top-row:hover { background: rgba(41,141,255,.06); }
        .top-thumb {
          width: 2.5em; height: 2.5em;
          border-radius: var(--gaps--gap-6); object-fit: cover;
          object-position: center top; flex-shrink: 0;
        }
        .top-info { min-width: 0; flex: 1; }

        /* ── Chain panel ───────────────────────────────────────── */
        .chain-panel {
          background: var(--color--grey-900);
          border: 1px solid rgba(41,141,255,.2);
          border-radius: var(--gaps--gap-8);
          padding: var(--gaps--gap-16); margin-top: var(--gaps--gap-16);
        }
        .chain-header {
          display: flex; align-items: center;
          gap: var(--gaps--gap-8); margin-bottom: var(--gaps--gap-8);
        }
        .chain-icon {
          width: 2em; height: 2em;
          background: var(--color--primary-blue);
          border-radius: var(--gaps--gap-4);
          display: flex; align-items: center;
          justify-content: center; font-size: .875em;
        }
        .chain-title {
          font-size: var(--blocks--size-block-14);
          font-weight: 700; color: var(--color--white);
        }
        .chain-desc {
          font-size: var(--blocks--size-block-12);
          color: var(--color--grey-500); line-height: 1.6;
          margin-bottom: var(--gaps--gap-16);
        }
        .chain-stats {
          display: flex; justify-content: space-between;
          border-top: 1px solid var(--color--grey-800);
          padding-top: var(--gaps--gap-12);
        }
        .chain-stat-val {
          font-size: 1.125em; font-weight: 700;
          color: var(--color--primary-blue);
        }
        .chain-stat-lbl {
          font-size: var(--blocks--size-block-12);
          color: var(--color--grey-500); font-weight: 600; margin-top: 2px;
        }

        /* ── Footer ────────────────────────────────────────────── */
        .footer {
          border-top: 1px solid var(--color--grey-800);
          background: var(--color--grey-900);
          padding: var(--gaps--gap-16) var(--global--padding-global);
          text-align: center; color: var(--color--grey-600);
          font-size: var(--blocks--size-block-12);
          display: flex; align-items: center;
          justify-content: center; gap: var(--gaps--gap-8);
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <a href="#" className="logo">
          <div className="logo-icon">⛓</div>
          <span className="logo-text">SuiGames</span>
        </a>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
          />
        </div>
        <div className="nav-right">
          <span className="nav-count">{GAMES.length} Games</span>
          <button className="connect-btn">Connect Wallet</button>
        </div>
      </nav>

      {/* ── Layout ── */}
      <div className="layout">

        {/* ── Main ── */}
        <div className="main">

          {/* Hero */}
          <div className="hero">
            <img
              src={coverOf(featured)}
              alt={featured.name}
              className="hero-img"
              onError={(e) => fallback(e, featured)}
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <div className="hero-pills">
                {featured.tags.map((t, i) => <Tag key={i} label={t} />)}
                {featured.hasFrontend && <OnChainBadge />}
              </div>
              {featured.serial && (
                <p className="hero-serial">{featured.serial}</p>
              )}
              <h1 className="hero-title">{featured.name}</h1>
              <p className="hero-desc">{featured.description}</p>
              <button className="play-btn">▶ Play Now</button>
            </div>
            <div className="hero-dots">
              {GAMES.map((_, i) => (
                <div
                  key={i}
                  className={`dot${i === heroIdx ? " active" : ""}`}
                  style={{ width: i === heroIdx ? undefined : "6px" }}
                  onClick={() => setHeroIdx(i)}
                />
              ))}
            </div>
          </div>

          {/* Tag filter row */}
          <div className="filter-row">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                className={`fpill${activeTag === tag ? " active" : ""}`}
                onClick={() => setActiveTag(tag)}
              >{tag}</button>
            ))}
          </div>

          {/* Section header */}
          <div className="section-header">
            <h2 className="section-title">
              {activeTag === "All" ? "All Games" : activeTag}
              <span className="section-count">({filtered.length})</span>
            </h2>
            {(search || activeTag !== "All") && (
              <button className="reset-btn"
                onClick={() => { setSearch(""); setActiveTag("All"); }}>
                ✕ Reset
              </button>
            )}
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🎮</div>
              <p className="empty-title">No games found</p>
              <p className="empty-sub">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="game-grid">
              {filtered.map((game) => (
                <GameCard key={game.slug} game={game} index={GAMES.indexOf(game)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-inner">

            {/* Quick Filter */}
            <div className="panel">
              <p className="panel-title" style={{ marginBottom: "var(--gaps--gap-12)" }}>Quick Filter</p>
              <div className="qf-grid">
                {[["Genre","All"],["Chain","Sui"],["Type","All"],["Status","Live"],["Sort","Popular"],["Year","2024"]].map(([lbl, val]) => (
                  <button key={lbl} className="qf-btn">
                    <span className="qf-label">{lbl}</span>
                    <span className="qf-val">{val} ▾</span>
                  </button>
                ))}
              </div>
              <input className="qf-input" placeholder="Search..." />
              <button className="apply-btn">⚙ Apply Filter</button>
            </div>

            {/* Top Games */}
            <div className="panel">
              <div className="panel-header">
                <p className="panel-title">Top Games</p>
                <div className="top-tabs">
                  {["Today","Week","Month"].map(t => (
                    <button key={t}
                      className={`ttab${activeTop === t ? " active" : ""}`}
                      onClick={() => setActiveTop(t)}>{t}</button>
                  ))}
                </div>
              </div>

              {/* #1 hero */}
              <div className="top-hero">
                <img
                  src={coverOf(GAMES[0])}
                  alt={GAMES[0].name}
                  className="top-hero-img"
                  onError={(e) => fallback(e, GAMES[0])}
                />
                <div className="top-hero-fade" />
                <div className="top-hero-content">
                  <div className="rank-badge">1</div>
                  <div style={{ minWidth: 0 }}>
                    <p className="top-name">{GAMES[0].name}</p>
                    <p className="top-serial">{GAMES[0].serial}</p>
                  </div>
                </div>
              </div>

              {/* Ranks 2–7 */}
              {GAMES.slice(1).map((g, i) => (
                <div key={g.slug} className="top-row">
                  <div className="rank-badge grey">{i + 2}</div>
                  <img
                    src={coverOf(g)}
                    alt={g.name}
                    className="top-thumb"
                    onError={(e) => fallback(e, g)}
                  />
                  <div className="top-info">
                    <p className="top-name">{g.name}</p>
                    <div className="top-chip-row">
                      {g.tags.slice(0, 1).map((t, j) => <Tag key={j} label={t} />)}
                    </div>
                    <p className="top-serial">{g.serial}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Sui chain info */}
            <div className="chain-panel">
              <div className="chain-header">
                <div className="chain-icon">⛓</div>
                <span className="chain-title">Powered by Sui</span>
              </div>
              <p className="chain-desc">
                All games run fully on-chain. Your moves, scores, and assets are verifiable and owned by you forever.
              </p>
              <div className="chain-stats">
                {[["7","Games"],["100%","On-chain"],["0","Fees"]].map(([val, lbl]) => (
                  <div key={lbl} style={{ textAlign: "center" }}>
                    <p className="chain-stat-val">{val}</p>
                    <p className="chain-stat-lbl">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <span>⛓</span> SuiGames — Fully on-chain gaming on the Sui blockchain
      </div>
    </div>
  );
}