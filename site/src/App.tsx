import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import GameCard, { Tag, OnChainBadge } from './components/GameCard';
import games from './data/games.json';
import type { Game } from './types';

const GAMES = games as Game[];
const ALL_TAGS = ['All', ...Array.from(new Set(GAMES.flatMap((g) => g.tags)))];

const coverOf = (g: Game) =>
  g.cover ?? `https://picsum.photos/seed/${g.dirName}/300/420`;

export default function App() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [activeTop, setActiveTop] = useState('Today');
  const [heroIdx, setHeroIdx] = useState(0);
  const [displayIdx, setDisplayIdx] = useState(0);
  const [slideClass, setSlideClass] = useState('');
  const isAnimating = useRef(false);

  const goToSlide = useCallback((next: number) => {
    if (isAnimating.current || next === heroIdx) return;
    isAnimating.current = true;
    setSlideClass('slide-out');
    setTimeout(() => {
      setDisplayIdx(next);
      setSlideClass('slide-in');
      setTimeout(() => {
        setSlideClass('');
        setHeroIdx(next);
        isAnimating.current = false;
      }, 400);
    }, 400);
  }, [heroIdx]);

  const advanceHero = useCallback(() => {
    const next = (heroIdx + 1) % GAMES.length;
    goToSlide(next);
  }, [heroIdx, goToSlide]);

  useEffect(() => {
    const id = setInterval(advanceHero, 5000);
    return () => clearInterval(id);
  }, [heroIdx, advanceHero]);

  const featured = GAMES[displayIdx];

  const filtered = useMemo(() => {
    let list = GAMES;
    if (activeTag !== 'All') list = list.filter((g) => g.tags.includes(activeTag));
    if (search.trim())
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.description.toLowerCase().includes(search.toLowerCase()),
      );
    return list;
  }, [search, activeTag]);

  return (
    <div className="root">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <a href="#" className="logo">
          <div className="logo-icon">⛓</div>
          <span className="logo-text">Makara Games</span>
        </a>
        <div className="search-wrap">
          {/* <span className="search-icon">🔍</span> */}
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
          />
        </div>
        <div className="nav-right">
          <span className="nav-count">{GAMES.length} Games</span>
        </div>
      </nav>

      {/* ── Layout ── */}
      <div className="layout">
        {/* ── Main ── */}
        <div className="main">
          {/* Hero */}
          <div className={`hero ${slideClass}`}>
            <img
              src={coverOf(featured)}
              alt={featured.name}
              className="hero-img"
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <div className="hero-pills">
                {featured.tags.map((t, i) => (
                  <Tag key={i} label={t} />
                ))}
                {featured.hasFrontend && <OnChainBadge />}
              </div>
              <h1 className="hero-title">{featured.name}</h1>
              <p className="hero-desc">{featured.description}</p>
              <a href={`/${featured.slug}/`} className="play-btn">
                ▶ Play Now
              </a>
            </div>
            <div className="hero-dots">
              {GAMES.map((_, i) => (
                <div
                  key={i}
                  className={`dot${i === heroIdx ? ' active' : ''}`}
                  style={{ width: i === heroIdx ? undefined : '6px' }}
                  onClick={() => goToSlide(i)}
                />
              ))}
            </div>
          </div>

          {/* Tag filter row */}
          <div className="filter-row">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                className={`fpill${activeTag === tag ? ' active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className="section-header">
            <h2 className="section-title">
              {activeTag === 'All' ? 'All Games' : activeTag}
              <span className="section-count">({filtered.length})</span>
            </h2>
            {(search || activeTag !== 'All') && (
              <button
                className="reset-btn"
                onClick={() => {
                  setSearch('');
                  setActiveTag('All');
                }}
              >
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
                <GameCard
                  key={game.slug}
                  game={game}
                  index={GAMES.indexOf(game)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-inner">
            {/* Quick Filter */}
            {/* <div className="panel">
              <p className="panel-title" style={{ marginBottom: 'var(--gaps--gap-12)' }}>
                Quick Filter
              </p>
              <div className="qf-grid">
                {(
                  [
                    ['Genre', 'All'],
                    ['Chain', 'Sui'],
                    ['Type', 'All'],
                    ['Status', 'Live'],
                    ['Sort', 'Popular'],
                    ['Year', '2025'],
                  ] as const
                ).map(([lbl, val]) => (
                  <button key={lbl} className="qf-btn">
                    <span className="qf-label">{lbl}</span>
                    <span className="qf-val">{val} ▾</span>
                  </button>
                ))}
              </div>
              <input className="qf-input" placeholder="Search..." />
              <button className="apply-btn">⚙ Apply Filter</button>
            </div> */}
   {/* Sui chain info */}
            <div className="chain-panel" style={{marginBottom:'24px'}}>
              <div className="chain-header">
                <div className="chain-icon">
                  <img style={{width:"100%"}} src="https://img.cryptorank.io/coins/sui1750268474192.png" />
                </div>
                <span className="chain-title">Powered by Sui</span>
              </div>
              <p className="chain-desc">
                All games run fully on-chain. Your moves, scores, and assets are
                verifiable and owned by you forever.
              </p>
              <div className="chain-stats">
                {(
                  [
                    [String(GAMES.length), 'Games'],
                    ['100%', 'On-chain'],
                    ['0', 'Fees'],
                  ] as const
                ).map(([val, lbl]) => (
                  <div key={lbl} style={{ textAlign: 'center' }}>
                    <p className="chain-stat-val">{val}</p>
                    <p className="chain-stat-lbl">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Top Games */}
            <div className="panel">
              <div className="panel-header">
                <p className="panel-title">Top Games</p>
                <div className="top-tabs">
                  {['Today', 'Week', 'Month'].map((t) => (
                    <button
                      key={t}
                      className={`ttab${activeTop === t ? ' active' : ''}`}
                      onClick={() => setActiveTop(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* #1 hero */}
              <div className="top-hero">
                <img
                  src={coverOf(GAMES[0])}
                  alt={GAMES[0].name}
                  className="top-hero-img"
                />
                <div className="top-hero-fade" />
                <div className="top-hero-content">
                  <div className="rank-badge">1</div>
                  <div style={{ minWidth: 0 }}>
                    <p className="top-name">{GAMES[0].name}</p>
                  </div>
                </div>
              </div>

              {/* Ranks 2+ */}
              {GAMES.slice(1).map((g, i) => (
                <div key={g.slug} className="top-row">
                  <div className="rank-badge grey">{i + 2}</div>
                  <img
                    src={coverOf(g)}
                    alt={g.name}
                    className="top-thumb"
                  />
                  <div className="top-info">
                    <p className="top-name">{g.name}</p>
                    <div className="top-chip-row">
                      {g.tags.slice(0, 1).map((t, j) => (
                        <Tag key={j} label={t} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
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
