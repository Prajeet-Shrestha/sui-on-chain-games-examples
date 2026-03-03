/**
 * Bluffers Audio Engine v3 — Simple, quiet, tasteful sounds.
 * All gains are deliberately low (max 0.06) so they don't startle players.
 */

let ctx: AudioContext | null = null;

function ac(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.04, delay = 0) {
    const c = ac();
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
}

function click(freq: number, dur: number, gain = 0.05, delay = 0) {
    const c = ac();
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
}

function noise(dur: number, gain = 0.03, lp = 2000, delay = 0) {
    const c = ac();
    const t = c.currentTime + delay;
    const sr = c.sampleRate;
    const buf = c.createBuffer(1, Math.ceil(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t);
}

// ── Exports ──────────────────────────────────────

/** Soft paper tap when playing cards */
export function playCardPlay() {
    noise(0.07, 0.04, 3000);
    click(200, 0.06, 0.025, 0.04);
}

/** Card flip reveal */
export function playCardFlip() {
    noise(0.05, 0.035, 5000);
    click(300, 0.04, 0.018, 0.03);
}

/** Acceptance — gentle two-note chime */
export function playCardAccept() {
    tone(523, 0.3, 'sine', 0.04);
    tone(659, 0.3, 'sine', 0.035, 0.1);
}

/** Liar called — low subtle tension drop */
export function playLiarCalled() {
    tone(180, 0.35, 'sine', 0.04);
    tone(140, 0.4, 'sine', 0.03, 0.1);
}

/** Gun hammer on empty — quiet metallic tick */
export function playGunClick() {
    click(2400, 0.02, 0.06);
    click(800, 0.03, 0.025, 0.008);
}

/** Gun fires — soft muffled thud (not loud) */
export function playGunBang() {
    noise(0.3, 0.07, 400);           // body
    click(60, 0.2, 0.06);           // sub thump
    noise(0.04, 0.05, 10000, 0.005); // crack
}

/** Player eliminated */
export function playElimination() {
    playGunBang();
    tone(200, 0.6, 'sine', 0.025, 0.15);
    tone(120, 0.8, 'sine', 0.02, 0.3);
}

/** Riffle shuffle — quick series of soft taps */
export function playNewRound() {
    for (let i = 0; i < 10; i++) {
        noise(0.03, 0.025 + Math.random() * 0.01, 5000, i * 0.03);
    }
    tone(440, 0.25, 'sine', 0.03, 0.36);
    tone(550, 0.25, 'sine', 0.028, 0.46);
}

/** Victory — short two-tone rising chime */
export function playVictory() {
    [523, 659, 784, 1047].forEach((f, i) => {
        tone(f, 0.4, 'sine', 0.04, i * 0.16);
    });
}

/** UI button click — very subtle tick */
export function playClick() {
    click(900, 0.015, 0.04);
}

/** Game start — gentle rising arpeggio */
export function playGameStart() {
    [220, 330, 440, 550].forEach((f, i) => {
        tone(f, 0.3, 'sine', 0.035, i * 0.1);
    });
}

/** Roulette spinning — repeating soft ticks that speed up */
export function playRouletteSpin(onDone: () => void) {
    let delay = 0;
    const ticks = 18;
    for (let i = 0; i < ticks; i++) {
        const interval = 0.18 * Math.pow(0.82, i); // accelerate
        delay += interval;
        noise(0.02, 0.04, 4000, delay);
        click(1200 + i * 80, 0.01, 0.055, delay + 0.005);
    }
    setTimeout(onDone, (delay + 0.3) * 1000);
}
