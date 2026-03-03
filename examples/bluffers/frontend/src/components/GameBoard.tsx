import { useState, useEffect, useRef, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useGameActions } from '../hooks/useGameActions';
import { useGameEvents } from '../hooks/useGameEvents';
import { useUIStore } from '../stores/uiStore';
import { EventLog } from './EventLog';
import type { BlufferGame } from '../lib/types';
import {
    CARD_NAMES, CARD_COLORS, CARD_BG,
    STATE_LOBBY, STATE_ACTIVE, STATE_FINISHED, PENDING_PLAYED, PENDING_ROULETTE, CARD_SUITS,
} from '../constants';
import {
    playCardPlay, playCardAccept, playLiarCalled,
    playGunClick, playElimination, playNewRound,
    playGameStart, playClick,
} from '../lib/audio';




// ─── Card image paths ──────────────────────────────
const BASE = import.meta.env.BASE_URL;
const CARD_IMAGES: Record<number, string | null> = {
    0: `${BASE}cards/king.png`,
    1: `${BASE}cards/queen.png`,
    2: `${BASE}cards/jack.png`,
    3: null,  // Joker — use SVG
};

// ─── Joker SVG (no image) ─────────────────────────
function JokerArt({ size }: { size: 'xs' | 'sm' | 'md' | 'lg' }) {
    const dim = size === 'xs' ? 28 : size === 'sm' ? 54 : size === 'md' ? 72 : 96;
    const h = size === 'xs' ? 39 : size === 'sm' ? 76 : size === 'md' ? 101 : 134;
    return (
        <svg width={dim} height={h} viewBox="0 0 96 134" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="jbg" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor="#220a3a" />
                    <stop offset="100%" stopColor="#0e0516" />
                </radialGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Background */}
            <rect width="96" height="134" rx="12" fill="url(#jbg)" />
            <rect x="4" y="4" width="88" height="126" rx="9" fill="none" stroke="rgba(189,147,249,0.35)" strokeWidth="1" />
            <rect x="7" y="7" width="82" height="120" rx="7" fill="none" stroke="rgba(189,147,249,0.15)" strokeWidth="0.5" />

            {/* Hat */}
            <polygon points="48,10 34,40 62,40" fill="#bd93f9" opacity="0.9" />
            <rect x="30" y="38" width="36" height="5" rx="2" fill="#7c5cbc" />
            {/* Hat bells */}
            <circle cx="48" cy="10" r="3" fill="#f8c" stroke="#bd93f9" strokeWidth="0.5" />
            <circle cx="34" cy="40" r="3" fill="#f8c" stroke="#bd93f9" strokeWidth="0.5" />
            <circle cx="62" cy="40" r="3" fill="#f8c" stroke="#bd93f9" strokeWidth="0.5" />

            {/* Face */}
            <ellipse cx="48" cy="68" rx="20" ry="22" fill="#fde8c0" />
            {/* Eyes */}
            <ellipse cx="41" cy="63" rx="3.5" ry="4" fill="#220a3a" />
            <ellipse cx="55" cy="63" rx="3.5" ry="4" fill="#220a3a" />
            <circle cx="42.5" cy="62" r="1" fill="white" />
            <circle cx="56.5" cy="62" r="1" fill="white" />
            {/* Wink/twinkle */}
            <path d="M38 60 Q41 58 44 60" stroke="#bd93f9" strokeWidth="1" fill="none" />
            {/* Smile */}
            <path d="M40 74 Q48 80 56 74" stroke="#d44" fill="none" strokeWidth="1.5" strokeLinecap="round" />
            {/* Cheeks */}
            <circle cx="36" cy="70" r="4" fill="rgba(255,100,100,0.2)" />
            <circle cx="60" cy="70" r="4" fill="rgba(255,100,100,0.2)" />

            {/* Stars */}
            {[[18, 30], [74, 28], [12, 85], [80, 90], [22, 110], [72, 108]].map(([x, y], i) => (
                <text key={i} x={x} y={y} fontSize={i % 2 === 0 ? "10" : "7"} fill="rgba(189,147,249,0.55)" textAnchor="middle" filter="url(#glow)">★</text>
            ))}

            {/* Corner labels */}
            <text x="8" y="20" fontFamily="'Cinzel',serif" fontSize="13" fontWeight="900" fill="#bd93f9">★</text>
            <text x="88" y="126" fontFamily="'Cinzel',serif" fontSize="13" fontWeight="900" fill="#bd93f9"
                transform="rotate(180 86 120)">★</text>
        </svg>
    );
}

// ─── PlayingCard ──────────────────────────────────
function PlayingCard({
    cardType, selected, faceDown, onClick, disabled, size = 'md', glow,
}: {
    cardType?: number;
    selected?: boolean;
    faceDown?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    glow?: boolean;
}) {
    const cls = ['playing-card', `card-sz-${size}`,
        selected ? 'card-selected' : '', disabled ? 'card-disabled' : '',
        faceDown || cardType === undefined ? 'card-facedown' : '',
        glow ? 'card-glow' : ''
    ].filter(Boolean).join(' ');

    // Face-down — ornate back
    if (faceDown || cardType === undefined) {
        return (
            <button className={cls} onClick={onClick} disabled={disabled} aria-label="Face-down card">
                <svg className="card-back-svg" viewBox="0 0 96 134" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="wb" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                            <path d="M0 6 L6 0 L12 6 L6 12 Z" fill="none" stroke="rgba(255,210,60,0.16)" strokeWidth="0.8" />
                        </pattern>
                    </defs>
                    <rect width="96" height="134" rx="12" fill="#11112a" />
                    <rect width="96" height="134" rx="12" fill="url(#wb)" />
                    <rect x="5" y="5" width="86" height="124" rx="9" fill="none" stroke="rgba(255,210,60,0.28)" strokeWidth="1.2" />
                    <rect x="9" y="9" width="78" height="116" rx="7" fill="none" stroke="rgba(255,210,60,0.1)" strokeWidth="0.6" />
                    {/* Medallion */}
                    <circle cx="48" cy="67" r="20" fill="none" stroke="rgba(255,210,60,0.25)" strokeWidth="1" />
                    <circle cx="48" cy="67" r="12" fill="none" stroke="rgba(255,210,60,0.14)" strokeWidth="0.7" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                        const r = deg * Math.PI / 180;
                        return <circle key={i} cx={48 + Math.cos(r) * 16} cy={67 + Math.sin(r) * 16} r="1.8" fill="rgba(255,210,60,0.3)" />;
                    })}
                    {/* Star */}
                    <path d="M48,55 L50.4,62.8 L58.5,62.8 L52.1,67.4 L54.5,75.2 L48,70.5 L41.5,75.2 L43.9,67.4 L37.5,62.8 L45.6,62.8 Z"
                        fill="rgba(255,210,60,0.38)" />
                    <text x="11" y="22" fontFamily="serif" fontSize="10" fill="rgba(255,210,60,0.3)">♦</text>
                    <text x="85" y="118" fontFamily="serif" fontSize="10" fill="rgba(255,210,60,0.3)"
                        transform="rotate(180,83,112)">♦</text>
                </svg>
            </button>
        );
    }

    // Joker — SVG only
    if (cardType === 3) {
        return (
            <button
                className={cls}
                onClick={onClick}
                disabled={disabled}
                style={{ borderColor: selected || glow ? CARD_COLORS[3] : undefined, padding: 0, background: CARD_BG[3] }}
                aria-label="Joker"
            >
                <JokerArt size={size} />
            </button>
        );
    }

    // King / Queen / Jack — real image
    const img = CARD_IMAGES[cardType];
    const color = CARD_COLORS[cardType];
    const suits = CARD_SUITS[cardType];
    const rankLabels: Record<number, string> = { 0: 'K', 1: 'Q', 2: 'J' };
    const rankLabel = rankLabels[cardType];

    return (
        <button
            className={cls}
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: 0,
                borderColor: selected || glow ? color : 'rgba(255,255,255,0.1)',
                boxShadow: selected ? `0 0 22px ${color}55, 0 -16px 0 2px ${color}22` : undefined,
                background: CARD_BG[cardType],
            }}
            aria-label={CARD_NAMES[cardType]}
        >
            {img && (
                <img
                    src={img}
                    alt={CARD_NAMES[cardType]}
                    className="card-image"
                    draggable={false}
                />
            )}
            {/* Corner overlays on top of image */}
            <div className="card-corner-overlay c-tl" style={{ color }}>
                <span className="cco-rank">{rankLabel}</span>
                <span className="cco-suit">{suits}</span>
            </div>
            <div className="card-corner-overlay c-br" style={{ color }}>
                <span className="cco-rank">{rankLabel}</span>
                <span className="cco-suit">{suits}</span>
            </div>
        </button>
    );
}

// ─── Card Reveal (inline on felt) ───────────────────────────
// Shows a flip animation when cards are accepted or liar is called
function CardRevealInline({
    cards,
    tableCard,
    headline,
    subtext,
    onClose,
}: {
    cards: number[];
    tableCard: number;
    headline: string;
    subtext: string;
    onClose: () => void;
}) {
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        const flipTimer = setTimeout(() => setFlipped(true), 800);
        const closeTimer = setTimeout(onClose, 6000);
        return () => { clearTimeout(flipTimer); clearTimeout(closeTimer); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const tableName = CARD_NAMES[tableCard] ?? '?';
    const tableColor = CARD_COLORS[tableCard] ?? '#fff';
    const allMatch = cards.every(c => c === tableCard || c === 3);
    const cardNames = cards.map(c => CARD_NAMES[c] ?? '?').join(', ');

    return (
        <div className="pt-felt-anim pt-felt-reveal">
            <div className="felt-anim-headline">{headline}</div>
            <div className="felt-anim-sub">{subtext}</div>

            <div className="cr-cards-row">
                {cards.map((cardVal, i) => (
                    <div
                        key={i}
                        className={`cr-flip-container ${flipped ? 'cr-flipped' : ''}`}
                        style={{ animationDelay: `${i * 0.15}s`, transitionDelay: `${i * 0.15}s` }}
                    >
                        <div className="cr-flip-inner">
                            <div className="cr-flip-front">
                                <PlayingCard faceDown size="md" />
                            </div>
                            <div className="cr-flip-back">
                                <PlayingCard cardType={cardVal} size="md" glow={cardVal !== tableCard && cardVal !== 3} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {flipped && (
                <>
                    <div className="cr-table-ref">
                        Table card: <span style={{ color: tableColor, fontWeight: 700 }}>{tableName}</span>
                        <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
                        <span style={{ opacity: 0.8 }}>Played: <strong>{cardNames}</strong></span>
                    </div>
                    <div className={`cr-verdict-banner ${allMatch ? 'cr-verdict-truth' : 'cr-verdict-lie'}`}>
                        {allMatch ? 'Cards matched — was being honest.' : 'Cards did NOT match — was lying.'}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Slot reel chambers ──────────────────────────
// Build a 6-symbol strip: 5 safe slots + 1 skull at the bullet position.
// The strip is rendered taller (×3 repeats) so the spin loop looks seamless.
const SAFE_SYM = '✓';
const DEAD_SYM = '💀';

function buildChambers(bulletPos: number): string[] {
    return Array.from({ length: 6 }, (_, i) => (i === bulletPos ? DEAD_SYM : SAFE_SYM));
}

// ─── Roulette Animation (inline on felt) — Slot Machine ──────
function RouletteInline({
    playerAddr: _playerAddr,
    playerName,
    trigger,
    bullet,
    eliminated,
    onClose,
    reason,
    revealedCards,
    tableCard,
    challengerName,
    accusedName,
    wasLying,
}: {
    playerAddr: string;
    playerName: string;
    trigger: number;
    bullet: number;
    eliminated: boolean;
    onClose: () => void;
    reason?: 'liar' | 'empty-hand';
    revealedCards?: number[];
    tableCard?: number;
    challengerName?: string;
    accusedName?: string;
    wasLying?: boolean;
}) {
    const hasCards = revealedCards && revealedCards.length > 0;
    const REVEAL_MS = hasCards ? 5000 : 0;
    const PREAMBLE_MS = 2500;
    const TOTAL_PRE = REVEAL_MS + PREAMBLE_MS;

    const [phase, setPhase] = useState<'reveal' | 'preamble' | 'spinning' | 'suspense' | 'result'>(hasCards ? 'reveal' : 'preamble');
    const [cardsFlipped, setCardsFlipped] = useState(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const stripRef = useRef<HTMLDivElement>(null);

    const chambers = buildChambers(bullet);
    const repeats = 8;
    const allSymbols = Array.from({ length: repeats }, () => chambers).flat();

    const targetChamber = eliminated
        ? bullet
        : (trigger !== bullet ? trigger : (trigger + 1) % 6);
    const landingIdx = (repeats - 1) * 6 + targetChamber;
    const symbolHeight = 60; // smaller for inline
    const landingOffset = landingIdx * symbolHeight - symbolHeight;

    useEffect(() => {
        const schedule = (fn: () => void, delay: number) => {
            const id = setTimeout(fn, delay);
            timersRef.current.push(id);
        };

        if (hasCards) {
            schedule(() => setCardsFlipped(true), 800);
            schedule(() => setPhase('preamble'), REVEAL_MS);
        }

        schedule(() => setPhase('spinning'), TOTAL_PRE);
        for (let i = 0; i < 18; i++) schedule(() => playGunClick(), TOTAL_PRE + i * 160);
        schedule(() => setPhase('suspense'), TOTAL_PRE + 2900);
        schedule(() => {
            setPhase('result');
            if (eliminated) playElimination(); else playGunClick();
        }, TOTAL_PRE + 4400);
        schedule(onClose, TOTAL_PRE + 9000);

        return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;

        if (phase === 'reveal' || phase === 'preamble') {
            strip.style.transition = 'none';
            strip.style.animation = 'none';
            strip.style.transform = 'translateY(0)';
        } else if (phase === 'spinning') {
            strip.style.transition = 'none';
            strip.style.animation = 'slotSpinFast 0.3s linear infinite';
        } else if (phase === 'suspense') {
            strip.style.animation = 'none';
            strip.style.transition = 'transform 1.5s cubic-bezier(0.12, 0, 0.04, 1)';
            strip.style.transform = `translateY(-${landingOffset}px)`;
        } else if (phase === 'result') {
            strip.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
            strip.style.transform = `translateY(-${landingOffset}px)`;
        }
    }, [phase, landingOffset]);

    const displayName = playerName;
    const pullNum = trigger + 1;
    const dangerPct = Math.round((pullNum / 6) * 100);
    const dangerColor = dangerPct < 34 ? '#50fa7b' : dangerPct < 67 ? '#f1fa8c' : '#ff5555';

    const allMatch = hasCards && tableCard !== undefined
        ? revealedCards!.every(c => c === tableCard || c === 3)
        : false;
    const cardNames = hasCards ? revealedCards!.map(c => CARD_NAMES[c] ?? '?').join(', ') : '';

    return (
        <div className={`pt-felt-anim pt-felt-roulette ${phase === 'result' && eliminated ? 'pt-felt-bang' : ''}`}>

            {/* ══ Phase 1: CARD REVEAL ══ */}
            {phase === 'reveal' && hasCards && tableCard !== undefined && (
                <div className="felt-reveal-phase">
                    <div className="felt-anim-headline">🔥 LIAR Called!</div>
                    <div className="felt-anim-who">
                        <strong>{challengerName || 'Someone'}</strong> challenged <strong>{accusedName || 'a player'}</strong>
                    </div>

                    <div className="cr-cards-row">
                        {revealedCards!.map((cardVal, i) => (
                            <div
                                key={i}
                                className={`cr-flip-container ${cardsFlipped ? 'cr-flipped' : ''}`}
                                style={{ animationDelay: `${i * 0.15}s`, transitionDelay: `${i * 0.15}s` }}
                            >
                                <div className="cr-flip-inner">
                                    <div className="cr-flip-front">
                                        <PlayingCard faceDown size="md" />
                                    </div>
                                    <div className="cr-flip-back">
                                        <PlayingCard cardType={cardVal} size="md" glow={cardVal !== tableCard && cardVal !== 3} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {cardsFlipped && (
                        <>
                            <div className="cr-table-ref">
                                Table card: <span style={{ color: CARD_COLORS[tableCard], fontWeight: 700 }}>{CARD_NAMES[tableCard]}</span>
                                <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
                                <span style={{ opacity: 0.8 }}>Played: <strong>{cardNames}</strong></span>
                            </div>
                            <div className={`cr-verdict-banner ${(wasLying ?? !allMatch) ? 'cr-verdict-lie' : 'cr-verdict-truth'}`}>
                                {(wasLying ?? !allMatch)
                                    ? `Cards did NOT match — ${accusedName || 'Player'} was lying.`
                                    : `All cards matched — ${accusedName || 'Player'} was honest!`
                                }
                            </div>
                            <div className="felt-trigger-note">
                                🔫 <strong>{displayName}</strong> is pulling the trigger…
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ══ Phase 2: PREAMBLE ══ */}
            {phase === 'preamble' && (
                <div className="felt-preamble">
                    <div className="felt-preamble-icon">{reason === 'empty-hand' ? '⚠️' : '🎰'}</div>
                    <div className="felt-preamble-text">
                        {reason === 'empty-hand'
                            ? <><strong>{displayName}</strong> ran out of cards!</>
                            : <><strong>{displayName}</strong> spins the chamber…</>
                        }
                    </div>
                    <div className="felt-preamble-danger">
                        Pull <strong>{pullNum}</strong>/6 · <span style={{ color: dangerColor }}>{dangerPct}% lethal</span>
                    </div>
                    <div className="felt-preamble-bar-wrap">
                        <div className="felt-preamble-bar" style={{ animationDuration: `${PREAMBLE_MS}ms` }} />
                    </div>
                </div>
            )}

            {/* ══ Spinning / Suspense / Result ══ */}
            {phase !== 'reveal' && phase !== 'preamble' && (
                <>
                    <div className="felt-slot-header">
                        <span className={`rm-tag ${reason === 'empty-hand' ? 'rm-tag-empty' : 'rm-tag-liar'}`}>
                            {reason === 'empty-hand' ? '⚠️ Empty Hand' : '🎰 Fate Roulette'}
                        </span>
                        <div className="felt-slot-who"><strong>{displayName}</strong> spins</div>
                    </div>

                    <div className="felt-slot-machine">
                        <div className={`rm-slot-viewport felt-slot-vp ${phase === 'result' ? (eliminated ? 'rm-slot-result-dead' : 'rm-slot-result-safe') : ''}`}>
                            <div className="rm-slot-mask-top" />
                            <div className="rm-slot-mask-bottom" />
                            <div className="rm-slot-center-line" />
                            <div className="rm-slot-strip felt-slot-strip" ref={stripRef}>
                                {allSymbols.map((sym, i) => (
                                    <div
                                        key={i}
                                        className={`rm-slot-cell felt-slot-cell ${sym === DEAD_SYM ? 'rm-slot-cell-dead' : 'rm-slot-cell-safe'}`}
                                    >
                                        <span className="rm-slot-sym">{sym}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pull pips */}
                    <div className="rm-pull-row">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div
                                key={i}
                                className={`rm-pip${i < pullNum ? ' rm-pip-past' : ''}${i === trigger ? ' rm-pip-now' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="rm-pull-meta">
                        <span>Pull <strong>{pullNum}</strong>/6</span>
                        <span style={{ color: dangerColor }}>{dangerPct}%</span>
                    </div>
                </>
            )}

            {/* ══ Result ══ */}
            {phase === 'result' && (
                <div className={`felt-result ${eliminated ? 'felt-result-dead' : 'felt-result-safe'}`}>
                    {eliminated ? (
                        <>
                            <div className="felt-result-big">💀 DEAD</div>
                            <div className="felt-result-copy"><strong>{displayName}</strong> eliminated!</div>
                        </>
                    ) : (
                        <>
                            <div className="felt-result-big">😮‍💨 SAFE</div>
                            <div className="felt-result-copy"><strong>{displayName}</strong> survives!</div>
                        </>
                    )}
                    <button className="felt-continue-btn" onClick={onClose}>Continue →</button>
                </div>
            )}

            {/* ══ Phase copy (spinning/suspense) ══ */}
            {phase === 'spinning' && (
                <div className="felt-spin-copy">Spinning…</div>
            )}
            {phase === 'suspense' && (
                <div className="felt-suspense-copy">. . .</div>
            )}
        </div>
    );
}




// ─── Round Splash (inline on felt) ─────────────────────────────────
function RoundSplashInline({ round, tableCard, onDone }: { round: number; tableCard: number; onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div className="pt-felt-anim pt-felt-round">
            <div className="felt-round-label">Round {round}</div>
            <div className="felt-round-card-wrap">
                <PlayingCard cardType={tableCard} size="lg" />
            </div>
            <div className="felt-round-info">
                New Table Card: <strong style={{ color: CARD_COLORS[tableCard] }}>{CARD_NAMES[tableCard]}</strong>
            </div>
        </div>
    );
}

// ─── Main GameBoard ───────────────────────────────
export function GameBoard({ game, onGameOverReady }: { game: BlufferGame; onGameOverReady?: () => void }) {
    const account = useCurrentAccount();
    const { startGame, playCards, pass, callLiar, triggerPull } = useGameActions();
    const { gameId, setGameId, getPlayerName } = useUIStore();
    const myAddress = account?.address ?? '';
    const { logs } = useGameEvents(gameId, myAddress);

    // Helper: returns the player's username
    const myAlias = getPlayerName(myAddress);
    const displayName = (addr: string) => getPlayerName(addr);

    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [copyMsg, setCopyMsg] = useState('📋 Copy Code');
    const [roundSplash, setRoundSplash] = useState<{ round: number; tableCard: number } | null>(null);
    const [rouletteModal, setRouletteModal] = useState<{
        playerAddr: string; playerName: string; trigger: number; bullet: number; eliminated: boolean; reason?: 'liar' | 'empty-hand'; revealedCards?: number[]; tableCard?: number; challengerName?: string; accusedName?: string; wasLying?: boolean;
    } | null>(null);
    const [cardReveal, setCardReveal] = useState<{
        cards: number[]; headline: string; subtext: string;
    } | null>(null);
    // Deferred display states: only update when animations finish
    const [displayTableCard, setDisplayTableCard] = useState(game.tableCard);
    const [displayAlive, setDisplayAlive] = useState([...game.alive]);
    const [displayTriggers, setDisplayTriggers] = useState([...game.rouletteTriggers]);
    // Queue roulette to show AFTER card reveal closes
    const queuedRouletteRef = useRef<typeof rouletteModal>(null);

    const myIdx = game.players.indexOf(myAddress);
    const myHand = myIdx >= 0 ? (game.hands[myIdx] ?? []) : [];
    const isMyTurn = game.state === STATE_ACTIVE && game.currentPlayerIdx === myIdx && myIdx >= 0;

    const nextAfterPending = (() => {
        let idx = (game.pendingPlayerIdx + 1) % game.players.length;
        let tries = 0;
        while (!game.alive[idx] && tries < game.players.length) { idx = (idx + 1) % game.players.length; tries++; }
        return idx;
    })();
    const isNextPlayer = game.state === STATE_ACTIVE && game.pendingState === PENDING_PLAYED && myIdx === nextAfterPending;
    const isPendingRoulettePlayer = game.state === STATE_ACTIVE && game.pendingState === PENDING_ROULETTE && myIdx === game.pendingPlayerIdx;

    const prevRoundRef = useRef<number>(game.round);
    const prevTableCardRef = useRef<number>(game.tableCard);
    const prevTriggersRef = useRef<number[]>([...game.rouletteTriggers]);
    const prevAliveRef = useRef<boolean[]>([...game.alive]);
    const prevLogCountRef = useRef<number>(logs.length);
    // Keep a ref to latest logs so delayed callbacks can read fresh data
    const logsRef = useRef(logs);
    logsRef.current = logs;
    // Track which liar events we already showed so we don't re-show stale data
    const shownLiarIdsRef = useRef<Set<string>>(new Set());
    // Queue round splash to show AFTER roulette animation completes
    const pendingRoundSplashRef = useRef<{ round: number; tableCard: number } | null>(null);
    // Track if roulette is active (including between effect cycles)
    const rouletteActiveRef = useRef(false);
    rouletteActiveRef.current = rouletteModal !== null;

    // Only sync display state on game-start transition (LOBBY → ACTIVE)
    // All other syncs happen in explicit close handlers (roulette, round splash)
    const prevGameStateRef = useRef(game.state);
    useEffect(() => {
        if (prevGameStateRef.current === STATE_LOBBY && game.state === STATE_ACTIVE) {
            setDisplayTableCard(game.tableCard);
            setDisplayAlive([...game.alive]);
            setDisplayTriggers([...game.rouletteTriggers]);
        }
        prevGameStateRef.current = game.state;
    }, [game.state, game.tableCard, game.alive]);




    // Detect round change → queue splash (show after roulette if one is active)
    useEffect(() => {
        if (game.round > 1 && game.round !== prevRoundRef.current) {
            // If roulette is active or about to start, queue the splash for later
            const splashData = { round: game.round, tableCard: game.tableCard };
            if (rouletteActiveRef.current) {
                pendingRoundSplashRef.current = splashData;
            } else {
                // Check if a trigger also changed in this same render (roulette will start)
                const prevArr = prevTriggersRef.current;
                const currArr = game.rouletteTriggers;
                const triggerChanged = currArr.some((v, i) => (prevArr[i] ?? 0) !== v);
                if (triggerChanged) {
                    pendingRoundSplashRef.current = splashData;
                } else {
                    setRoundSplash(splashData);
                    playNewRound();
                }
            }
            prevRoundRef.current = game.round;
        }
    }, [game.round, game.tableCard]);

    // Capture the previous table card during render (before any effects execute)
    // This ensures the trigger effect reads the OLD value even if the round effect runs first
    const savedTableCard = prevTableCardRef.current;

    // Mount timestamp — events arriving shortly after mount are historical (not from user actions)
    const mountTimeRef = useRef(Date.now());

    // Detect new accept/liar events → card reveal
    useEffect(() => {
        if (logs.length <= prevLogCountRef.current) {
            prevLogCountRef.current = logs.length;
            return;
        }
        // Check new entries
        const newEntries = logs.slice(prevLogCountRef.current);
        prevLogCountRef.current = logs.length;

        // Skip events from the initial historical load (first ~4s after mount)
        // This prevents stale accept/liar events from triggering animations on refresh
        if (Date.now() - mountTimeRef.current < 4000) return;

        for (const entry of newEntries) {
            if (entry.type === 'accept' && entry.cards && entry.cards.length > 0) {
                // Only show standalone card reveal for accept events
                // Liar events are handled by the roulette modal's reveal phase
                setCardReveal({
                    cards: entry.cards,
                    headline: `✅  Cards Accepted`,
                    subtext: `The cards were accepted and will be discarded.`,
                });
                break;
            }
        }
    }, [logs.length]);

    // Detect roulette trigger change for ANY player → show modal
    // Serialize triggers to string so React detects value changes (arrays are compared by ref)
    const triggersKey = JSON.stringify(game.rouletteTriggers);
    useEffect(() => {
        const prevArr = prevTriggersRef.current;
        const currArr = game.rouletteTriggers;

        // Skip if a roulette animation is already playing
        // (death resets all triggers to 0, which would re-fire this effect and clobber the active animation)
        if (rouletteActiveRef.current) {
            prevTriggersRef.current = [...currArr];
            prevAliveRef.current = [...game.alive];
            prevTableCardRef.current = game.tableCard;
            return;
        }

        // Find which player's trigger actually changed
        let changedIdx = -1;
        for (let i = 0; i < currArr.length; i++) {
            if ((prevArr[i] ?? 0) !== currArr[i]) { changedIdx = i; break; }
        }

        if (changedIdx >= 0 && (game.state === STATE_ACTIVE || game.state === STATE_FINISHED)) {
            const eliminatedIdx = prevAliveRef.current.findIndex((a, i) => a && !game.alive[i]);
            const eliminated = eliminatedIdx >= 0;
            const roulettePlayer = game.players[eliminated ? eliminatedIdx : changedIdx] ?? '';
            const rouletteName = displayName(roulettePlayer);

            // Helper: extract liar event data from logs using structured fields
            // Validates: (1) event not already shown, (2) roulettePlayer matches challenger or accused
            const extractLiarData = () => {
                const currentLogs = logsRef.current;
                const lastLiarEvent = [...currentLogs].reverse().find(l =>
                    l.type === 'liar' &&
                    l.cards && l.cards.length > 0 &&
                    !shownLiarIdsRef.current.has(l.id) &&
                    // The roulette player must be either the challenger or the accused
                    (l.challenger === roulettePlayer || l.accused === roulettePlayer)
                );
                if (!lastLiarEvent) return null;

                // Use structured fields from the log entry (addresses → display names)
                const challengerAddr = lastLiarEvent.challenger;
                const accusedAddr = lastLiarEvent.accused;

                return {
                    eventId: lastLiarEvent.id,
                    challengerName: challengerAddr ? displayName(challengerAddr) : 'Someone',
                    accusedName: accusedAddr ? displayName(accusedAddr) : 'a player',
                    wasLying: lastLiarEvent.wasLying ?? false,
                    cards: lastLiarEvent.cards,
                    tableCard: savedTableCard, // use the saved table card before round advanced
                };
            };

            // Build and show roulette modal, polling for liar event data
            // Event logs may arrive after the game state change, so we poll
            const showRoulette = (liarData: ReturnType<typeof extractLiarData>) => {
                // Mark this liar event as shown so we don't reuse it
                if (liarData?.eventId) shownLiarIdsRef.current.add(liarData.eventId);

                setRouletteModal({
                    playerAddr: roulettePlayer,
                    playerName: rouletteName,
                    trigger: eliminated ? (prevArr[eliminatedIdx] ?? 0) : (prevArr[changedIdx] ?? 0),
                    bullet: game.bulletChamber,
                    eliminated,
                    tableCard: liarData?.tableCard ?? savedTableCard,
                    revealedCards: liarData?.cards,
                    challengerName: liarData?.challengerName,
                    accusedName: liarData?.accusedName,
                    wasLying: liarData?.wasLying,
                });
            };

            // Try immediately
            const immediateData = extractLiarData();
            if (immediateData) {
                showRoulette(immediateData);
            } else {
                // Poll for up to 2s waiting for the liar event to arrive
                let attempts = 0;
                const maxAttempts = 7; // 7 × 300ms = 2.1s
                const poll = setInterval(() => {
                    attempts++;
                    const data = extractLiarData();
                    if (data || attempts >= maxAttempts) {
                        clearInterval(poll);
                        showRoulette(data);
                    }
                }, 300);
            }
        }

        // Always sync refs after comparison
        prevTriggersRef.current = [...currArr];
        prevAliveRef.current = [...game.alive];
        prevTableCardRef.current = game.tableCard;
    }, [triggersKey, game.alive, game.state, game.players, game.pendingPlayerIdx, game.bulletChamber]);

    function toggleCard(i: number) {
        setSelectedIndices(prev =>
            prev.includes(i) ? prev.filter(x => x !== i) : prev.length < 3 ? [...prev, i] : prev
        );
    }

    async function handlePlay() {
        if (!gameId || selectedIndices.length === 0) return;
        playCardPlay();
        await playCards(gameId, selectedIndices, myAddress);
        setSelectedIndices([]);
    }
    async function handlePass() {
        if (!gameId) return;
        playCardAccept();
        await pass(gameId, myAddress);
    }
    async function handleCallLiar() {
        if (!gameId) return;
        playLiarCalled();
        await callLiar(gameId, myAddress);
    }
    async function handleTriggerPull() {
        if (!gameId) return;
        playLiarCalled();
        await triggerPull(gameId, myAddress);
    }
    async function handleStartGame() {
        if (!gameId) return;
        playGameStart();
        await startGame(gameId, myAddress);
    }

    // Helper: close card reveal and show queued roulette
    const closeCardReveal = useCallback(() => {
        setCardReveal(null);
        // Small delay before showing roulette so the transition feels smooth
        setTimeout(() => {
            if (queuedRouletteRef.current) {
                setRouletteModal(queuedRouletteRef.current);
                queuedRouletteRef.current = null;
            }
        }, 400);
    }, []);

    const tableName = CARD_NAMES[displayTableCard] ?? '?';
    const tableColor = CARD_COLORS[displayTableCard] ?? '#fff';
    const pendingPlayerAddr = game.players[game.pendingPlayerIdx] ?? '';

    return (
        <div className="poker-root">

            {/* ── Top Bar ── */}
            <div className="pt-topbar">
                <button className="pt-back" onClick={() => { playClick(); setGameId(null); }}>← Leave</button>
                <div className="pt-round-chip">
                    {game.state === STATE_LOBBY ? '⏳ Lobby' : `Round ${game.round}`}
                </div>
                {/* Table card in topbar */}
                {game.state === STATE_ACTIVE && (
                    <div className="pt-topbar-card">
                        <span className="pt-topbar-card-label">Play as</span>
                        <PlayingCard cardType={displayTableCard} size="sm" />
                        <span className="pt-topbar-card-name" style={{ color: tableColor }}>{tableName}</span>
                    </div>
                )}
                <div className="pt-room-code" onClick={async () => {
                    await navigator.clipboard.writeText(gameId ?? '');
                    playClick(); setCopyMsg('✓ Copied!');
                    setTimeout(() => setCopyMsg('📋 Copy Code'), 1500);
                }}>
                    <span className="pt-room-label">Room</span>
                    <span className="pt-room-id">{gameId?.slice(0, 12)}…{gameId?.slice(-6)}</span>
                    <span className="pt-room-copy">{copyMsg === '📋 Copy Code' ? '📋 Copy Code' : '✓ Copied!'}</span>
                </div>
            </div>

            {/* ── The Table ── */}
            <div className="pt-table">
                {/* Deck info strip (shown during active game) */}
                {game.state === STATE_ACTIVE && (
                    <div className="pt-deck-strip">
                        <div className="pt-deck-strip-item">
                            <img src={`${import.meta.env.BASE_URL}cards/king.png`} alt="King" className="pt-deck-img" />
                            <span style={{ color: CARD_COLORS[0] }}>6×</span>
                        </div>
                        <div className="pt-deck-strip-item">
                            <img src={`${import.meta.env.BASE_URL}cards/queen.png`} alt="Queen" className="pt-deck-img" />
                            <span style={{ color: CARD_COLORS[1] }}>6×</span>
                        </div>
                        <div className="pt-deck-strip-item">
                            <img src={`${import.meta.env.BASE_URL}cards/jack.png`} alt="Jack" className="pt-deck-img" />
                            <span style={{ color: CARD_COLORS[2] }}>6×</span>
                        </div>
                        <div className="pt-deck-strip-item">
                            <div className="pt-deck-img-wrap"><JokerArt size="sm" /></div>
                            <span style={{ color: CARD_COLORS[3] }}>2×</span>
                        </div>
                    </div>
                )}
                {/* Opponent seats — arc across the top */}
                <div className="pt-opponents">
                    {game.players.map((addr, i) => {
                        if (addr === myAddress) return null;
                        const alive = displayAlive[i] ?? game.alive[i];
                        const isCurrent = game.currentPlayerIdx === i && game.state === STATE_ACTIVE;
                        const isPending = game.pendingPlayerIdx === i && game.pendingState === PENDING_PLAYED;
                        const cardCount = game.hands[i]?.length ?? 0;
                        const trigger = displayTriggers[i] ?? game.rouletteTriggers[i] ?? 0;
                        return (
                            <div key={addr} className={`pt-opp-seat ${!alive ? 'pt-opp-dead' : ''} ${isCurrent ? 'pt-opp-active' : ''} ${isPending ? 'pt-opp-pending' : ''}`}>
                                <div className="pt-opp-avatar">{alive ? '🎭' : '💀'}</div>
                                <div className="pt-opp-name">
                                    {displayName(addr)}
                                    {!alive && <span style={{ fontSize: '0.65rem', color: '#ff5555', marginLeft: 4, opacity: 0.8 }}>(eliminated)</span>}
                                </div>
                                <div className="pt-opp-meta">
                                    <span className="pt-opp-cards">{cardCount}🃏</span>
                                    {alive && <span className="pt-opp-danger" style={{
                                        color: trigger <= 1 ? '#50fa7b' : trigger <= 3 ? '#f1fa8c' : '#ff5555',
                                    }}>{Math.round(((trigger + 1) / 6) * 100)}%</span>}
                                </div>
                                {isCurrent && <div className="pt-opp-turn-dot" />}
                            </div>
                        );
                    })}
                </div>

                {/* ── Felt Center ── */}
                <div className={`pt-felt ${(cardReveal || rouletteModal || roundSplash) ? 'pt-felt-animating' : ''}`}>

                    {/* ══ INLINE ANIMATIONS (replace normal content when active) ══ */}
                    {cardReveal && !rouletteModal && (
                        <CardRevealInline
                            {...cardReveal}
                            tableCard={game.tableCard}
                            onClose={closeCardReveal}
                        />
                    )}

                    {rouletteModal && (
                        <RouletteInline
                            {...rouletteModal}
                            onClose={() => {
                                // Sync alive + triggers state now (death animation has played)
                                setDisplayAlive([...game.alive]);
                                setDisplayTriggers([...game.rouletteTriggers]);
                                setRouletteModal(null);
                                if (pendingRoundSplashRef.current) {
                                    const splash = pendingRoundSplashRef.current;
                                    pendingRoundSplashRef.current = null;
                                    setTimeout(() => {
                                        setRoundSplash(splash);
                                        playNewRound();
                                    }, 400);
                                } else {
                                    // No splash coming — sync all display state
                                    setDisplayTableCard(game.tableCard);
                                    setDisplayAlive([...game.alive]);
                                    setDisplayTriggers([...game.rouletteTriggers]);
                                }
                                // If game just finished, signal App to show game-over
                                if (game.state === STATE_FINISHED && onGameOverReady) {
                                    // Small delay so result phase is visible
                                    setTimeout(onGameOverReady, 800);
                                }
                            }}
                        />
                    )}

                    {roundSplash && !rouletteModal && (
                        <RoundSplashInline
                            round={roundSplash.round}
                            tableCard={roundSplash.tableCard}
                            onDone={() => {
                                setRoundSplash(null);
                                // Now that user has seen the new card, update all display state
                                setDisplayTableCard(game.tableCard);
                                setDisplayAlive([...game.alive]);
                                setDisplayTriggers([...game.rouletteTriggers]);
                            }}
                        />
                    )}

                    {/* ══ NORMAL CONTENT (when no animation active) ══ */}
                    {!cardReveal && !rouletteModal && !roundSplash && (
                        <>
                            {/* Pending play area */}
                            {game.state === STATE_ACTIVE && game.pendingState === PENDING_PLAYED && (
                                <div className="pt-pending">
                                    <div className="pt-pend-cards">
                                        {Array(game.pendingCount).fill(0).map((_, i) => (
                                            <PlayingCard key={i} faceDown size="sm" />
                                        ))}
                                    </div>
                                    <div className="pt-pend-text">
                                        <strong>{displayName(pendingPlayerAddr)}</strong> played{' '}
                                        <strong>{game.pendingCount}</strong> as{' '}
                                        <span style={{ color: tableColor }}>{tableName}</span>
                                    </div>
                                    {isNextPlayer && (
                                        <div className="pt-pend-actions">
                                            <button className="pt-btn-accept" onClick={handlePass}>
                                                ✅ Accept
                                            </button>
                                            <button className="pt-btn-liar" onClick={handleCallLiar}>
                                                🔫 Call Liar!
                                            </button>
                                        </div>
                                    )}
                                    {!isNextPlayer && (
                                        <div className="pt-pend-wait">Waiting for {displayName(game.players[nextAfterPending])}…</div>
                                    )}
                                </div>
                            )}

                            {/* Forced trigger pull */}
                            {game.state === STATE_ACTIVE && game.pendingState === PENDING_ROULETTE && (() => {
                                const accepterAddr = game.players[game.pendingPlayerIdx] ?? '';
                                // Find who emptied their hand (player with 0 cards who is still alive)
                                const emptyHandIdx = game.players.findIndex((_, i) =>
                                    i !== game.pendingPlayerIdx && game.alive[i] && (game.hands[i]?.length ?? 0) === 0
                                );
                                const emptyHandName = emptyHandIdx >= 0 ? displayName(game.players[emptyHandIdx]) : 'A player';
                                return (
                                    <div className="pt-pending pt-pending-danger">
                                        <div className="pt-pend-text" style={{ marginBottom: 6 }}>
                                            ⚠️ <strong>{emptyHandName}</strong> emptied their hand!
                                        </div>
                                        <div className="pt-pend-text">
                                            🔫 <strong>{displayName(accepterAddr)}</strong> accepted those cards — must pull the trigger.
                                        </div>
                                        {isPendingRoulettePlayer ? (
                                            <button className="pt-btn-trigger" onClick={handleTriggerPull}>
                                                🔫 Pull Trigger
                                            </button>
                                        ) : (
                                            <div className="pt-pend-wait">Waiting for trigger pull…</div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Lobby panel */}
                            {game.state === STATE_LOBBY && (
                                <div className="pt-lobby">
                                    <div className="pt-lobby-title">Waiting for Players</div>
                                    <div className="pt-lobby-invite">📋 Copy and share room code to invite others</div>
                                    <div className="pt-lobby-seats">
                                        {Array.from({ length: game.maxPlayers }, (_, i) => (
                                            <div key={i} className={`pt-lobby-seat ${i < game.players.length ? 'pt-lobby-filled' : ''}`}>
                                                {i < game.players.length
                                                    ? <><span>🎭</span><small>{displayName(game.players[i])}</small></>
                                                    : <><span>◦</span><small>Empty</small></>
                                                }
                                            </div>
                                        ))}
                                    </div>
                                    {myAddress === game.creator && (
                                        <button className="pt-start-btn" onClick={handleStartGame} disabled={game.players.length < 2}>
                                            🚀 Start Game
                                        </button>
                                    )}
                                    {myAddress !== game.creator && <div className="pt-pend-wait">Waiting for host…</div>}
                                    <div className="pt-deck-info">
                                        <div className="pt-deck-title">🃏 Deck (20 cards)</div>
                                        <div className="pt-deck-cards">
                                            <span style={{ color: CARD_COLORS[0] }}>6× King</span>
                                            <span className="pt-deck-dot">·</span>
                                            <span style={{ color: CARD_COLORS[1] }}>6× Queen</span>
                                            <span className="pt-deck-dot">·</span>
                                            <span style={{ color: CARD_COLORS[2] }}>6× Jack</span>
                                            <span className="pt-deck-dot">·</span>
                                            <span style={{ color: CARD_COLORS[3] }}>2× Joker</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Your Turn indicator */}
                            {game.state === STATE_ACTIVE && game.pendingState !== PENDING_PLAYED && game.pendingState !== PENDING_ROULETTE && isMyTurn && (
                                <div className="pt-your-turn">
                                    <div className="pt-your-turn-label">YOUR TURN</div>
                                    <div className="pt-your-turn-sub">Select cards from your hand to play</div>
                                </div>
                            )}

                            {/* Waiting for turn */}
                            {game.state === STATE_ACTIVE && game.pendingState !== PENDING_PLAYED && game.pendingState !== PENDING_ROULETTE && !isMyTurn && (
                                <div className="pt-waiting">
                                    <div className="pt-wait-spinner" />
                                    <div>Waiting for <strong>{game.players[game.currentPlayerIdx] ? displayName(game.players[game.currentPlayerIdx]) : '…'}</strong></div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Your seat indicator ── */}
                {myIdx >= 0 && (
                    <div className={`pt-my-seat ${!(displayAlive[myIdx] ?? game.alive[myIdx]) ? 'pt-my-dead' : ''}`}>
                        <span className="pt-my-avatar">{(displayAlive[myIdx] ?? game.alive[myIdx]) ? '🎭' : '💀'}</span>
                        <span className="pt-my-name">You ({myAlias})</span>
                        {(displayAlive[myIdx] ?? game.alive[myIdx]) && (
                            <span className="pt-my-danger" style={{
                                color: (displayTriggers[myIdx] ?? game.rouletteTriggers[myIdx] ?? 0) <= 1 ? '#50fa7b' : (displayTriggers[myIdx] ?? game.rouletteTriggers[myIdx] ?? 0) <= 3 ? '#f1fa8c' : '#ff5555',
                            }}>{Math.round((((displayTriggers[myIdx] ?? game.rouletteTriggers[myIdx] ?? 0) + 1) / 6) * 100)}% danger</span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Your Hand ── */}
            <div className="pt-hand-area">
                {myIdx < 0 && <div className="pt-spectator">Spectating</div>}
                {myIdx >= 0 && !game.alive[myIdx] && (
                    <div className="pt-eliminated">💀 You were eliminated</div>
                )}
                {myIdx >= 0 && game.alive[myIdx] && myHand.length === 0 && (
                    <div className="pt-no-cards">New cards next round</div>
                )}
                {myIdx >= 0 && game.alive[myIdx] && myHand.length > 0 && (
                    <div className="pt-hand-fan">
                        {myHand.map((c, i) => {
                            const total = myHand.length;
                            const mid = (total - 1) / 2;
                            const angle = (i - mid) * 5; // fan spread
                            const yOff = Math.abs(i - mid) * 4;
                            return (
                                <div key={i} className="pt-hand-card-wrap" style={{
                                    transform: `rotate(${angle}deg) translateY(${yOff}px)`,
                                }}>
                                    <PlayingCard
                                        cardType={c}
                                        selected={selectedIndices.includes(i)}
                                        size="lg"
                                        onClick={() => {
                                            if (isMyTurn && game.pendingState !== PENDING_PLAYED) {
                                                playClick();
                                                toggleCard(i);
                                            }
                                        }}
                                        disabled={!isMyTurn || game.pendingState === PENDING_PLAYED}
                                        glow={selectedIndices.includes(i)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Action buttons */}
                {game.state === STATE_ACTIVE && myIdx >= 0 && game.alive[myIdx] && game.pendingState !== PENDING_PLAYED && isMyTurn && (
                    <div className="pt-action-bar">
                        <div className="pt-action-hint">
                            Select 1–3 cards to play as <span style={{ color: tableColor }}>{tableName}</span>
                            {selectedIndices.length > 0 && <span> · {selectedIndices.length} selected</span>}
                        </div>
                        <button className="pt-play-btn" onClick={handlePlay} disabled={selectedIndices.length === 0}>
                            🃏 Play {selectedIndices.length || ''} as {tableName}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Event Log (collapsible) ── */}
            <details className="pt-log-details">
                <summary className="pt-log-summary">📜 Event Log ({logs.length})</summary>
                <EventLog logs={logs} />
            </details>
        </div>
    );
}
