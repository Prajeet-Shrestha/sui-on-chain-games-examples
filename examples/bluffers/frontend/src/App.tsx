import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useUIStore } from './stores/uiStore';
import { useBlufferGame } from './hooks/useBlufferGame';
import { LobbyView } from './components/LobbyView';
import { GameBoard } from './components/GameBoard';
import { GameOverScreen } from './components/GameOverScreen';
import { STATE_FINISHED } from './constants';

export default function App() {
    const account = useCurrentAccount();
    const { gameId, isPending, error, setError } = useUIStore();
    const { data: game, isLoading } = useBlufferGame(gameId);

    // Show GameOverScreen only when GameBoard signals animations are done
    const [showGameOver, setShowGameOver] = useState(false);

    useEffect(() => {
        if (game?.state !== STATE_FINISHED) {
            setShowGameOver(false);
        }
    }, [game?.state]);

    const heroSection = (
        <div className="rules-section">
            <h3 className="rules-header">📖 How to Play</h3>

            {/* Deck Overview */}
            <div className="rules-block">
                <div className="rules-block-icon">🃏</div>
                <div className="rules-block-content">
                    <h4>The Deck — 20 Cards</h4>
                    <div className="rules-deck-grid">
                        <div className="rules-deck-item" style={{ borderColor: 'var(--gold)' }}>
                            <img src={`${import.meta.env.BASE_URL}cards/king.png`} alt="King" className="rdi-img" />
                            <span className="rdi-count" style={{ color: 'var(--gold)' }}>6×</span>
                            <span className="rdi-name">King</span>
                        </div>
                        <div className="rules-deck-item" style={{ borderColor: 'var(--pink)' }}>
                            <img src={`${import.meta.env.BASE_URL}cards/queen.png`} alt="Queen" className="rdi-img" />
                            <span className="rdi-count" style={{ color: 'var(--pink)' }}>6×</span>
                            <span className="rdi-name">Queen</span>
                        </div>
                        <div className="rules-deck-item" style={{ borderColor: 'var(--teal)' }}>
                            <img src={`${import.meta.env.BASE_URL}cards/jack.png`} alt="Jack" className="rdi-img" />
                            <span className="rdi-count" style={{ color: 'var(--teal)' }}>6×</span>
                            <span className="rdi-name">Jack</span>
                        </div>
                        <div className="rules-deck-item rules-deck-wild" style={{ borderColor: 'var(--purple)' }}>
                            <span className="rdi-emoji">★</span>
                            <span className="rdi-count" style={{ color: 'var(--purple)' }}>2×</span>
                            <span className="rdi-name">Joker</span>
                            <span className="rdi-wild">WILD</span>
                        </div>
                    </div>
                    <p className="rules-note">Cards are dealt evenly to all players. Jokers are <strong>wild</strong> — they count as any card.</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="rules-block">
                <div className="rules-block-icon">🎯</div>
                <div className="rules-block-content">
                    <h4>The Table Card</h4>
                    <p>At the start of each round, a <strong>Table Card</strong> is revealed (King, Queen, or Jack — never Joker). Every card you play must be <em>claimed</em> as the current table card.</p>
                </div>
            </div>

            {/* Gameplay flow */}
            <div className="rules-block">
                <div className="rules-block-icon">🎮</div>
                <div className="rules-block-content">
                    <h4>Gameplay</h4>
                    <ol className="rules-steps">
                        <li><strong>Play 1–3 cards face-down</strong> — Claim they're the table card. You can lie!</li>
                        <li><strong>Next player decides</strong> — Accept the cards (they're discarded) or <strong>call LIAR</strong></li>
                        <li><strong>Cards are flipped</strong> — Everyone sees the truth</li>
                    </ol>
                </div>
            </div>

            {/* Bluffing */}
            <div className="rules-block">
                <div className="rules-block-icon">🤥</div>
                <div className="rules-block-content">
                    <h4>Calling a Bluff</h4>
                    <p>When you call LIAR, the played cards are <strong>flipped face-up</strong> for everyone to see:</p>
                    <div className="rules-outcomes">
                        <div className="rules-outcome rules-outcome-right">
                            <span className="ro-tag">They lied!</span>
                            <span className="ro-text">The player who lied pulls the trigger</span>
                        </div>
                        <div className="rules-outcome rules-outcome-wrong">
                            <span className="ro-tag">They were honest!</span>
                            <span className="ro-text">You called wrong — you pull the trigger</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Roulette */}
            <div className="rules-block rules-block-danger">
                <div className="rules-block-icon">🔫</div>
                <div className="rules-block-content">
                    <h4>Russian Roulette</h4>
                    <p>A 6-chamber revolver with <strong>1 bullet</strong>. Each pull increases your danger:</p>
                    <div className="rules-roulette-pips">
                        <div className="rrp"><span className="rrp-num">1st</span> <span className="rrp-pct" style={{ color: '#50fa7b' }}>17%</span></div>
                        <div className="rrp"><span className="rrp-num">2nd</span> <span className="rrp-pct" style={{ color: '#8af77a' }}>33%</span></div>
                        <div className="rrp"><span className="rrp-num">3rd</span> <span className="rrp-pct" style={{ color: '#f1fa8c' }}>50%</span></div>
                        <div className="rrp"><span className="rrp-num">4th</span> <span className="rrp-pct" style={{ color: '#f5c542' }}>67%</span></div>
                        <div className="rrp"><span className="rrp-num">5th</span> <span className="rrp-pct" style={{ color: '#ff8844' }}>83%</span></div>
                        <div className="rrp"><span className="rrp-num">6th</span> <span className="rrp-pct" style={{ color: '#ff5555' }}>100%</span></div>
                    </div>
                    <p className="rules-note">If the bullet fires — <strong>you're eliminated</strong>. If not, you live to play another round.</p>
                </div>
            </div>

            {/* Win condition */}
            <div className="rules-block">
                <div className="rules-block-icon">🏆</div>
                <div className="rules-block-content">
                    <h4>How to Win</h4>
                    <p><strong>Last player standing wins.</strong> After an elimination, a new round begins with fresh cards and a new table card. Survive the roulette, outsmart your opponents, and be the last one alive.</p>
                </div>
            </div>

            {/* Random identity */}
            <div className="rules-block">
                <div className="rules-block-icon">🎭</div>
                <div className="rules-block-content">
                    <h4>Secret Identity</h4>
                    <p>When you join a lobby, you're assigned a <strong>random alias</strong> (like "SlyFox" or "BoldJoker"). This is your identity for the entire game — no one knows your real wallet address!</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-left">
                    <h1 className="game-title"><span className="title-icon">🃏</span>Bluffers</h1>
                    <p className="game-subtitle">On-Chain Bluffing · Sui Testnet</p>
                </div>
                <div className="header-right"><ConnectButton /></div>
            </header>

            {isPending && (
                <div className="tx-toast">
                    <div className="tx-spinner" />
                    <span>Signing transaction…</span>
                </div>
            )}

            {error && (
                <div className="error-toast" onClick={() => setError(null)}>
                    ⚠️ {error} <span className="dismiss">✕</span>
                </div>
            )}

            <main className="app-main">
                {isLoading && gameId ? (
                    <div className="loading-screen">
                        <div className="loading-spinner" />
                        <p>Loading game…</p>
                    </div>
                ) : game && gameId && game.state === STATE_FINISHED && showGameOver ? (
                    <GameOverScreen game={game} />
                ) : game && gameId ? (
                    // Active or Lobby state — full 3-column desktop board
                    <GameBoard game={game} onGameOverReady={() => setShowGameOver(true)} />
                ) : (
                    // No game yet — stacked layout: lobby top, rules below
                    <div className="connect-screen">
                        {/* ── Lobby / Connect — Top Center ── */}
                        <div className="home-lobby-top">
                            {!account ? (
                                <div className="home-connect-box">
                                    <div className="connect-right-title">Connect to Play</div>
                                    <ConnectButton />
                                    <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', textAlign: 'center', marginTop: '12px' }}>
                                        Requires a Sui wallet on Testnet.
                                    </p>
                                </div>
                            ) : (
                                <LobbyView />
                            )}
                        </div>

                        {/* ── Hero + Rules — Below ── */}
                        <div className="home-content">
                            {/* Card art showcase using actual game cards */}
                            <div className="home-card-showcase">
                                <div className="art-card art-card-k">
                                    <img src={`${import.meta.env.BASE_URL}cards/king.png`} alt="King" className="art-card-img" />
                                    <div className="art-card-sub" style={{ color: 'var(--gold)' }}>KING</div>
                                </div>
                                <div className="art-card art-card-q">
                                    <img src={`${import.meta.env.BASE_URL}cards/queen.png`} alt="Queen" className="art-card-img" />
                                    <div className="art-card-sub" style={{ color: 'var(--pink)' }}>QUEEN</div>
                                </div>
                                <div className="art-card art-card-j">
                                    <img src={`${import.meta.env.BASE_URL}cards/jack.png`} alt="Jack" className="art-card-img" />
                                    <div className="art-card-sub" style={{ color: 'var(--teal)' }}>JACK</div>
                                </div>
                                {/* Joker — SVG since no image file */}
                                <div className="art-card art-card-x art-card-joker">
                                    <svg viewBox="0 0 60 80" className="joker-hero-svg" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <radialGradient id="jbgh" cx="50%" cy="40%" r="70%">
                                                <stop offset="0%" stopColor="#3a1560" />
                                                <stop offset="100%" stopColor="#0e0516" />
                                            </radialGradient>
                                        </defs>
                                        <rect width="60" height="80" rx="6" fill="url(#jbgh)" />
                                        <polygon points="30,4 20,24 40,24" fill="#bd93f9" opacity="0.9" />
                                        <rect x="17" y="23" width="26" height="3.5" rx="1.5" fill="#7c5cbc" />
                                        <circle cx="30" cy="4" r="2.5" fill="#ff9fd4" />
                                        <circle cx="20" cy="24" r="2" fill="#ff9fd4" />
                                        <circle cx="40" cy="24" r="2" fill="#ff9fd4" />
                                        <ellipse cx="30" cy="48" rx="13" ry="14" fill="#fde8c0" />
                                        <ellipse cx="24" cy="44" rx="2.5" ry="3" fill="#220a3a" />
                                        <ellipse cx="36" cy="44" rx="2.5" ry="3" fill="#220a3a" />
                                        <circle cx="25" cy="43" r="0.8" fill="white" />
                                        <circle cx="37" cy="43" r="0.8" fill="white" />
                                        <path d="M24 54 Q30 59 36 54" stroke="#c03" fill="none" strokeWidth="1.2" strokeLinecap="round" />
                                        <circle cx="22" cy="50" r="2.5" fill="rgba(255,100,100,0.18)" />
                                        <circle cx="38" cy="50" r="2.5" fill="rgba(255,100,100,0.18)" />
                                        <text x="8" y="18" fontSize="7" fill="rgba(189,147,249,0.5)" textAnchor="middle">★</text>
                                        <text x="52" y="22" fontSize="5" fill="rgba(189,147,249,0.4)" textAnchor="middle">★</text>
                                        <text x="10" y="70" fontSize="6" fill="rgba(189,147,249,0.4)" textAnchor="middle">★</text>
                                        <text x="50" y="68" fontSize="8" fill="rgba(189,147,249,0.5)" textAnchor="middle">★</text>
                                        <text x="4" y="12" fontFamily="serif" fontSize="7" fontWeight="900" fill="#bd93f9">★</text>
                                        <text x="56" y="72" fontFamily="serif" fontSize="7" fontWeight="900" fill="#bd93f9" transform="rotate(180,55,68)">★</text>
                                    </svg>
                                    <div className="art-card-sub" style={{ color: 'var(--purple)' }}>JOKER</div>
                                </div>
                            </div>

                            <h2 className="connect-hero-title">Bluffers.<br />Lie or be honest</h2>
                            <p className="connect-hero-desc">
                                A fully <strong>on-chain multiplayer bluffing card game</strong> on Sui.
                                Every play, every challenge, every Russian Roulette pull is
                                <strong> recorded on-chain forever</strong>.
                            </p>

                            {heroSection}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
