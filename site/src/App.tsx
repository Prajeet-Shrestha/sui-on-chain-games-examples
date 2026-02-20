import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import GameCard, { Tag, OnChainBadge } from './components/GameCard';
import AuthButton from './components/AuthButton';
import { useUserProfile } from './hooks/useUserProfile';
import { isWhitelisted } from './config/whitelist';
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
  const currentAccount = useCurrentAccount();
  const { profile } = useUserProfile();
  const userAddress = currentAccount?.address || profile?.address;
  const canCreate = isWhitelisted(userAddress);

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
        <button className="hamburger" aria-label="Menu">
          <span /><span /><span />
        </button>

        <a href="#" className="logo">
          <img src="/logo_full.png" alt="Makara Gaming" className="logo-img" />
        </a>

        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${GAMES.length} games...`}
          />
        </div>

        <div className="nav-socials">
          {/* Twitter / X */}
          <a href="#" className="social-btn social-twitter" aria-label="Twitter">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          {/* Telegram */}
          <a href="#" className="social-btn social-telegram" aria-label="Telegram">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12.056 0h-.112zM17.05 7.31c.149-.01.31.035.384.13.06.08.078.186.068.3-.11 1.17-.585 4.01-0.827 5.32-.102.555-.303.74-.498.758-.423.04-.744-.28-1.154-.548-.641-.42-1.003-.68-1.626-1.09-.72-.473-.253-.733.157-1.158.107-.11 1.972-1.808 2.008-1.963.005-.02.009-.089-.033-.126-.042-.036-.104-.024-.149-.014-.064.014-1.078.685-3.042 2.013-.288.198-.549.295-.782.29-.257-.005-.752-.146-1.12-.266-.451-.148-.81-.226-.779-.477.017-.131.196-.265.539-.402 2.112-.92 3.52-1.527 4.224-1.823 2.013-.843 2.432-0.99 2.705-0.995z"/></svg>
          </a>
          {/* Reddit */}
          <a href="#" className="social-btn social-reddit" aria-label="Reddit">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.462.342.342 0 0 0-.461 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.206-.095z"/></svg>
          </a>
        </div>

        {canCreate && (
          <Link to="/create" className="create-game-btn">Create a Game</Link>
        )}
        <AuthButton />
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
