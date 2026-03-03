// ═══════════════════════════════════════════════
// Audio Controller — Rich Synthesized SFX using Web Audio API
// Layered oscillators, noise buffers, filters, proper ADSR.
// No external assets required.
// ═══════════════════════════════════════════════

class AudioController {
    private ctx: AudioContext | null = null;
    private enabled: boolean = false;
    private masterGain: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;

    constructor() {
        try {
            // @ts-ignore - Handle various browser prefixes
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.15; // Lower master volume
            this.masterGain.connect(this.ctx.destination);
            this.enabled = true;
            this.noiseBuffer = this.buildNoiseBuffer();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    // Call this on first user interaction to unlock audio context
    public async init() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    // ─── Helpers ───

    private buildNoiseBuffer(): AudioBuffer | null {
        if (!this.ctx) return null;
        const length = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buf;
    }

    private createOsc(type: OscillatorType, freq: number): OscillatorNode {
        if (!this.ctx) throw new Error('No audio context');
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        return osc;
    }

    private createGain(val: number): GainNode {
        if (!this.ctx) throw new Error('No audio context');
        const g = this.ctx.createGain();
        g.gain.value = val;
        return g;
    }

    private createFilter(type: BiquadFilterType, freq: number, q: number = 1): BiquadFilterNode {
        if (!this.ctx) throw new Error('No audio context');
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        return f;
    }

    private playNoiseBurst(
        duration: number,
        filterFreq: number,
        filterQ: number,
        volume: number,
        filterType: BiquadFilterType = 'bandpass'
    ) {
        if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
        const t = this.ctx.currentTime;

        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = this.createFilter(filterType, filterFreq, filterQ);
        const gain = this.createGain(0);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Quick ADSR: fast attack, short sustain, smooth decay
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.008);
        gain.gain.setValueAtTime(volume, t + duration * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        src.start(t);
        src.stop(t + duration);
    }

    // ─── SFX Methods ───

    /** Paper swoosh — noise burst through bandpass with pitch sweep */
    public playThrow() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Layer 1: Noise swoosh through bandpass
        this.playNoiseBurst(0.18, 2000, 0.8, 0.5, 'bandpass');

        // Layer 2: Subtle tonal sweep to give direction feel
        const osc = this.createOsc('sine', 400);
        const gain = this.createGain(0);
        const filter = this.createFilter('lowpass', 1200, 0.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.start(t);
        osc.stop(t + 0.18);
    }

    /** Tiered hit sounds — each tier has distinct character */
    public playHit(tier: number) {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        if (tier === 3) return this.playMiss();

        const t = this.ctx.currentTime;

        if (tier === 0) {
            // ★ PERFECT — rich shimmer chord with sparkle
            this.playPerfectHit(t);
        } else if (tier === 1) {
            // GOOD — two-note pleasant chime
            this.playGoodHit(t);
        } else {
            // OK — soft muted blip
            this.playOkHit(t);
        }
    }

    private playPerfectHit(t: number) {
        if (!this.ctx || !this.masterGain) return;

        // Layered chord: root (C6), fifth (G6), detuned shimmer
        const freqs = [1046.5, 1318.5, 1568.0];
        const detunes = [0, 3, -4]; // Slight detune for chorus effect

        freqs.forEach((freq, i) => {
            const osc = this.createOsc('sine', freq);
            osc.detune.value = detunes[i];
            const gain = this.createGain(0);
            const filter = this.createFilter('lowpass', 4000, 0.5);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            // Soft attack, gentle sustain, smooth release
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.2 - i * 0.04, t + 0.02);
            gain.gain.setValueAtTime(0.18 - i * 0.04, t + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.start(t);
            osc.stop(t + 0.55);
        });

        // Sparkle ping (delayed high sine)
        const sparkle = this.createOsc('sine', 2637);
        const sGain = this.createGain(0);
        sparkle.connect(sGain);
        sGain.connect(this.masterGain);

        sGain.gain.setValueAtTime(0, t + 0.06);
        sGain.gain.linearRampToValueAtTime(0.08, t + 0.08);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        sparkle.start(t + 0.06);
        sparkle.stop(t + 0.4);

        // Subtle noise shimmer on perfect
        this.playNoiseBurst(0.12, 6000, 2, 0.06, 'highpass');
    }

    private playGoodHit(t: number) {
        if (!this.ctx || !this.masterGain) return;

        // Two-note chime: E5 → G5
        const notes = [659.25, 783.99];
        notes.forEach((freq, i) => {
            const start = t + i * 0.07;
            const osc = this.createOsc('sine', freq);
            const gain = this.createGain(0);
            const filter = this.createFilter('lowpass', 3000, 0.5);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
            gain.gain.setValueAtTime(0.16, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

            osc.start(start);
            osc.stop(start + 0.4);
        });
    }

    private playOkHit(t: number) {
        if (!this.ctx || !this.masterGain) return;

        // Soft tonal blip — muted C5
        const osc = this.createOsc('triangle', 523.25);
        const gain = this.createGain(0);
        const filter = this.createFilter('lowpass', 1500, 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.25);

        // Subtle impact thud
        this.playNoiseBurst(0.08, 300, 0.5, 0.08, 'lowpass');
    }

    /** Miss — dull filtered thud, no tonal character */
    public playMiss() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Noise thump through lowpass
        this.playNoiseBurst(0.15, 250, 0.6, 0.18, 'lowpass');

        // Very low frequency body
        const osc = this.createOsc('sine', 80);
        const gain = this.createGain(0);
        const filter = this.createFilter('lowpass', 200, 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    /** Level complete — rich rising arpeggio resolving on major chord */
    public playLevelComplete() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Rising arpeggio: C5, E5, G5, then resolved C6 chord
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const durations = [0.5, 0.5, 0.5, 0.8];

        notes.forEach((freq, i) => {
            const start = t + i * 0.12;
            const dur = durations[i];

            // Main note
            const osc = this.createOsc('sine', freq);
            const gain = this.createGain(0);
            const filter = this.createFilter('lowpass', 3500, 0.4);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.025);
            gain.gain.setValueAtTime(0.13, start + dur * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            osc.start(start);
            osc.stop(start + dur + 0.05);

            // Harmonic overtone (subtle octave above)
            const harm = this.createOsc('sine', freq * 2);
            const hGain = this.createGain(0);
            harm.connect(hGain);
            hGain.connect(this.masterGain!);

            hGain.gain.setValueAtTime(0, start);
            hGain.gain.linearRampToValueAtTime(0.04, start + 0.03);
            hGain.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.6);

            harm.start(start);
            harm.stop(start + dur);
        });

        // Final shimmer tail (noise high)
        if (this.noiseBuffer && this.ctx) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            const filter = this.createFilter('highpass', 5000, 1);
            const gain = this.createGain(0);

            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            const shimStart = t + 0.48;
            gain.gain.setValueAtTime(0, shimStart);
            gain.gain.linearRampToValueAtTime(0.03, shimStart + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, shimStart + 0.5);

            src.start(shimStart);
            src.stop(shimStart + 0.55);
        }
    }

    /** Game over — melancholy descending tones, muted and warm */
    public playGameOver() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Descending minor sequence: G4, Eb4, C4, G3
        const notes = [392.0, 311.13, 261.63, 196.0];
        const durations = [0.5, 0.5, 0.6, 1.2];

        notes.forEach((freq, i) => {
            const start = t + i * 0.35;
            const dur = durations[i];

            const osc = this.createOsc('triangle', freq);
            const gain = this.createGain(0);
            const filter = this.createFilter('lowpass', 800 - i * 100, 0.3);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.04);
            gain.gain.setValueAtTime(0.12, start + dur * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            osc.start(start);
            osc.stop(start + dur + 0.05);
        });
    }

    /** Combo chime — quick ascending two notes on combo ≥3 */
    public playCombo() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Quick A5 → C#6 (major third, bright)
        const notes = [880, 1108.73];
        notes.forEach((freq, i) => {
            const start = t + i * 0.05;
            const osc = this.createOsc('sine', freq);
            const gain = this.createGain(0);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    /** Pedal tick — very subtle rhythmic click for immersion */
    public playPedalTick() {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Tiny click: very high-frequency noise spike, extremely short
        if (!this.noiseBuffer) return;

        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.createFilter('bandpass', 3500, 3);
        const gain = this.createGain(0);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

        src.start(t);
        src.stop(t + 0.03);
    }
}

export const audio = new AudioController();
