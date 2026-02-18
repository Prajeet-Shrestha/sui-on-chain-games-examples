class SoundManager {
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMuted: boolean = false;

    constructor() {
        // Initialize on first user interaction to handle autoplay policies
        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            this.context = new AudioContextClass();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = 0.3; // Default volume
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    private ensureContext() {
        if (!this.context) return;
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    setMute(muted: boolean) {
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.context?.currentTime || 0);
        }
    }

    getMute() {
        return this.isMuted;
    }

    // --- Sound Generators ---

    /** Short high-pitched blip for UI interactions */
    playClick() {
        if (this.isMuted || !this.context || !this.masterGain) return;
        this.ensureContext();

        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        osc.start(t);
        osc.stop(t + 0.05);
    }

    /** Soft footstep / move sound */
    playMove() {
        if (this.isMuted || !this.context || !this.masterGain) return;
        this.ensureContext();

        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // Filter to make it softer
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    /** Low thud for hitting walls */
    playBump() {
        if (this.isMuted || !this.context || !this.masterGain) return;
        this.ensureContext();

        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    /** Rising sweep for level start */
    playLevelStart() {
        if (this.isMuted || !this.context || !this.masterGain) return;
        this.ensureContext();

        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    /** Major arpeggio for level/game win */
    playWin() {
        if (this.isMuted || !this.context || !this.masterGain) return;
        this.ensureContext();

        const t = this.context.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major: C E G C

        notes.forEach((freq, i) => {
            const osc = this.context!.createOscillator();
            const gain = this.context!.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = 'triangle';
            osc.frequency.value = freq;

            const start = t + i * 0.1;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);

            osc.start(start);
            osc.stop(start + 0.4);
        });
    }
}

export const soundManager = new SoundManager();
