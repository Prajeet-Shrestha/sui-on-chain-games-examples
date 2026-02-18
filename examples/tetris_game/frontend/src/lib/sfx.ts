// ═══════════════════════════════════════════════
// SuiTris — Procedural Sound Effects (Web Audio API)
// No external audio files — everything is synthesized
// ═══════════════════════════════════════════════

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// Master volume (0-1)
let masterVolume = 0.35;

function gain(ac: AudioContext, vol: number): GainNode {
    const g = ac.createGain();
    g.gain.value = vol * masterVolume;
    g.connect(ac.destination);
    return g;
}

// ─── Helper: play a tone with envelope ───
function playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.3,
    detune = 0,
) {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = gain(ac, volume);

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(g);

    // Quick attack, sustain, decay envelope
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume * masterVolume, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.05);
}

// ─── Helper: noise burst ───
function playNoise(duration: number, volume = 0.1) {
    const ac = getCtx();
    const now = ac.currentTime;
    const bufferSize = ac.sampleRate * duration;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter for more pleasant noise
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;
    source.connect(filter);

    const g = gain(ac, volume);
    filter.connect(g);

    g.gain.setValueAtTime(volume * masterVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.start(now);
    source.stop(now + duration + 0.05);
}

// ═══════════════════════════════════════════════
// Public SFX Functions
// ═══════════════════════════════════════════════

/** Piece moved left or right */
export function sfxMove() {
    playTone(220, 0.06, 'square', 0.08);
}

/** Piece rotated */
export function sfxRotate() {
    playTone(440, 0.08, 'sine', 0.15);
    playTone(660, 0.06, 'sine', 0.08);
}

/** Soft drop (each row) */
export function sfxSoftDrop() {
    playTone(150, 0.04, 'triangle', 0.06);
}

/** Hard drop — satisfying thud */
export function sfxHardDrop() {
    playNoise(0.12, 0.2);
    playTone(80, 0.15, 'sine', 0.25);
    playTone(60, 0.2, 'sine', 0.15);
}

/** Piece locked into place */
export function sfxLock() {
    playTone(200, 0.1, 'triangle', 0.12);
    playNoise(0.05, 0.06);
}

/** Hold piece swap */
export function sfxHold() {
    playTone(330, 0.06, 'sine', 0.12);
    setTimeout(() => playTone(440, 0.06, 'sine', 0.12), 50);
}

/** Line clear — pitch scales with number of lines */
export function sfxLineClear(lineCount: number) {
    const ac = getCtx();
    const now = ac.currentTime;

    // Base chord — higher for more lines
    const baseFreqs: Record<number, number[]> = {
        1: [523, 659],          // C5, E5
        2: [523, 659, 784],     // C5, E5, G5
        3: [659, 784, 988],     // E5, G5, B5
        4: [784, 988, 1175, 1319], // G5, B5, D6, E6 — Tetris!
    };

    const freqs = baseFreqs[lineCount] ?? baseFreqs[1]!;
    const duration = 0.15 + lineCount * 0.1;

    for (let i = 0; i < freqs.length; i++) {
        const osc = ac.createOscillator();
        const g = gain(ac, 0.12);

        osc.type = 'square';
        osc.frequency.value = freqs[i];
        osc.connect(g);

        const start = now + i * 0.04;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.12 * masterVolume, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.start(start);
        osc.stop(start + duration + 0.05);
    }

    // Extra shimmer for Tetris (4 lines)
    if (lineCount >= 4) {
        playNoise(0.3, 0.1);
        setTimeout(() => {
            playTone(1568, 0.2, 'sine', 0.08); // G6
            playTone(2093, 0.15, 'sine', 0.06); // C7
        }, 200);
    }
}

/** Combo — escalating pitch */
export function sfxCombo(comboCount: number) {
    const baseFreq = 440 + comboCount * 80;
    playTone(baseFreq, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(baseFreq * 1.5, 0.06, 'sine', 0.08), 40);
}

/** Level up fanfare */
export function sfxLevelUp() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.15, 'square', 0.12), i * 80);
    });
}

/** Game over — descending tone */
export function sfxGameOver() {
    const ac = getCtx();
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const g = gain(ac, 0.2);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 1.2);
    osc.connect(g);

    g.gain.setValueAtTime(0.2 * masterVolume, now);
    g.gain.linearRampToValueAtTime(0.15 * masterVolume, now + 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.start(now);
    osc.stop(now + 1.6);

    // Low rumble
    playNoise(0.6, 0.08);
}

/** Toggle pause */
export function sfxPause() {
    playTone(330, 0.1, 'triangle', 0.1);
}

/** Unpause */
export function sfxUnpause() {
    playTone(440, 0.08, 'triangle', 0.1);
    setTimeout(() => playTone(550, 0.06, 'triangle', 0.08), 60);
}

// ═══════════════════════════════════════════════
// Volume Control
// ═══════════════════════════════════════════════

export function setVolume(vol: number) {
    masterVolume = Math.max(0, Math.min(1, vol));
}

export function getVolume(): number {
    return masterVolume;
}

export function isMuted(): boolean {
    return masterVolume === 0;
}

export function toggleMute(): boolean {
    if (masterVolume > 0) {
        masterVolume = 0;
        return true; // now muted
    } else {
        masterVolume = 0.35;
        return false; // now unmuted
    }
}
