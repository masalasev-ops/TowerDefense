// ============================================================
// SoundManager — Procedural Sound Effects via Web Audio API
// ============================================================
//
// This module uses the revealing module pattern (IIFE) to provide
// procedural sound effects using the Web Audio API. No external audio
// files are required — every sound is synthesized at runtime using
// oscillators, noise buffers, and biquad filters.
//
// --- AudioContext Lifecycle ---
//   init() creates an AudioContext and master gain node. It must be
//   called from a user gesture (click/tap) due to browser autoplay
//   policies. Once initialized, the context is reused for all sound.
//
//   ensureContext() checks if the context is suspended (common on
//   mobile after inactivity) and resumes it before playing.
//
//   masterGain (initialized to 0.35) controls the global volume level
//   for all sounds. Individual sound volumes are multiplied by this.
//
// --- Sound Generators ---
//   playTone(frequency, duration, type, volume, ramp)
//     Creates an OscillatorNode connected to a GainNode. Plays a single
//     frequency for the given duration. Waveform types: sine, square,
//     sawtooth, triangle. If ramp is true, gain exponentially decays to
//     near-zero for a natural fade-out.
//
//   playNoise(duration, volume, filterFreq)
//     Generates white noise by filling an AudioBuffer with random samples
//     (amplitude linearly decays over the duration). Optionally passes
//     through a low-pass BiquadFilterNode for shaping. Used for
//     explosions, impacts, and gunshot-like sounds.
//
// --- Parameter Reference ---
//   frequency   — pitch in Hz (e.g., 440 = A4)
//   duration    — sound length in seconds
//   type        — OscillatorNode waveform: 'sine'|'square'|'sawtooth'|'triangle'
//   volume      — gain level 0.0–1.0 (multiplied by masterGain internally)
//   ramp        — boolean; if true, applies exponential fade-out
//   filterFreq  — low-pass filter cutoff in Hz (0 or undefined disables)
//
// --- Game Event Sounds ---
//   towerShoot(type)   — different frequencies/waveforms per tower type
//   enemyHit()         — short square-wave blip
//   enemyDie(type)     — boss gets longer noise burst;
//                        splitter/shielded have distinct sounds
//   enemyReachBase()   — descending sawtooth + triangle
//   waveStart()        — ascending sine arpeggio (C4 -> E4 -> G4)
//   waveComplete()     — ascending sine arpeggio (C5 -> E5 -> G5 -> C6)
//   gameOver()         — descending sawtooth (G4 -> D4 -> G3)
//   towerPlace()       — two ascending triangle tones
//   towerUpgrade()     — three ascending sine tones
//   towerSell()        — two descending triangle tones
//   shieldBreak()      — descending square/sawtooth
//   castleRepair()     — two ascending sine tones
//   buttonClick()      — very short sine blip
//   setVolume(volume)  — clamp and set master gain 0.0–1.0
//   toggle()           — toggle enabled state, return new state
//   isEnabled()        — return current enabled state
// ============================================================

const SoundManager = (function() {
    'use strict';

    /** @type {AudioContext|null} Web Audio API context, created on first user gesture */
    let audioCtx = null;
    /** @type {GainNode|null} Master gain node controlling global volume for all sounds */
    let masterGain = null;
    /** @type {boolean} Whether sound output is enabled */
    let enabled = true;
    /** @type {boolean} Whether init() has been called and succeeded */
    let initialized = false;

    /**
     * Initialize the AudioContext and master gain node.
     * Must be triggered from a user gesture (click/tap) to comply with
     * browser autoplay policies. Safe to call multiple times.
     */
    function init() {
        if (initialized) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.35;
            masterGain.connect(audioCtx.destination);
            initialized = true;
        } catch(e) {
            console.warn('Web Audio not available:', e.message);
            enabled = false;
        }
    }

    /**
     * Ensure the AudioContext is ready to play sound.
     * Calls init() if needed and resumes a suspended context
     * (common after user inactivity on mobile devices).
     */
    function ensureContext() {
        if (!initialized) init();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // ================================================================
    // Sound Generators
    // ================================================================

    /**
     * Play a single oscillator tone.
     * @param {number} frequency - Pitch in Hz (e.g., 440 = A4)
     * @param {number} duration - Sound length in seconds
     * @param {OscillatorType} [type='sine'] - Waveform: 'sine'|'square'|'sawtooth'|'triangle'
     * @param {number} [volume=0.15] - Gain level 0.0–1.0 (multiplied by masterGain internally)
     * @param {boolean} [ramp=false] - If true, apply exponential gain fade-out
     */
    function playTone(frequency, duration, type, volume, ramp) {
        if (!enabled || !audioCtx) return;
        ensureContext();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.type = type || 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime((volume || 0.15) * masterGain.gain.value, audioCtx.currentTime);
        if (ramp) {
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        }
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }

    /**
     * Play white noise, optionally shaped by a low-pass filter.
     * Noise amplitude linearly ramps down over the duration for a natural decay.
     * @param {number} duration - Sound length in seconds
     * @param {number} [volume=0.1] - Gain level 0.0–1.0 (multiplied by masterGain internally)
     * @param {number} [filterFreq=0] - Low-pass filter cutoff in Hz; 0 or undefined disables filter
     */
    function playNoise(duration, volume, filterFreq) {
        if (!enabled || !audioCtx) return;
        ensureContext();
        const sampleCount = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.value = (volume || 0.1) * masterGain.gain.value;

        let destination = gain;
        if (filterFreq) {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            gain.connect(filter);
            destination = filter;
        }

        source.connect(gain);
        destination.connect(audioCtx.destination);
        source.start();
    }

    // ================================================================
    // Public API — Game Event Sounds
    // ================================================================

    /**
     * Play a tower shoot sound based on tower type.
     * Each tower type has a distinct audio signature:
     *   archer:  short high square wave
     *   frost:   dual high sine tones
     *   cannon:  noise burst + low triangle rumble
     *   tesla:   dual sawtooth crackle
     *   sniper:  short noise burst + square ping
     *   mortar:  low triangle thump + noise
     *   nuke:    long noise + deep sawtooth + sine rumble
     *   plasma:  sawtooth + sine dual tone
     * @param {string} type - Tower type identifier
     */
    function towerShoot(type) {
        ensureContext();
        switch(type) {
            case 'archer':
                playTone(800, 0.08, 'square', 0.06);
                break;
            case 'frost':
                playTone(1200, 0.12, 'sine', 0.07);
                playTone(1400, 0.08, 'sine', 0.04);
                break;
            case 'cannon':
                playNoise(0.18, 0.12, 400);
                playTone(90, 0.2, 'triangle', 0.1);
                break;
            case 'tesla':
                playTone(2000, 0.06, 'sawtooth', 0.05);
                playTone(3000, 0.04, 'sawtooth', 0.03);
                break;
            case 'sniper':
                playNoise(0.08, 0.15, 800);
                playTone(600, 0.06, 'square', 0.04);
                break;
            case 'mortar':
                playTone(60, 0.35, 'triangle', 0.12);
                playNoise(0.25, 0.1, 300);
                break;
            case 'nuke':
                playNoise(0.5, 0.2, 200);
                playTone(40, 0.6, 'sawtooth', 0.15);
                playTone(25, 0.8, 'sine', 0.12);
                break;
            case 'plasma':
                playTone(1500, 0.1, 'sawtooth', 0.06);
                playTone(2000, 0.08, 'sine', 0.04);
                break;
            default:
                playTone(600, 0.06, 'square', 0.05);
        }
    }

    /** Play a generic enemy hit sound — short square wave blip. */
    function enemyHit() {
        playTone(300, 0.04, 'square', 0.04);
    }

    /**
     * Play an enemy death sound based on enemy type.
     * boss:      long noise burst + deep sawtooth
     * splitter:  medium noise burst + square ping
     * shielded:  dual descending triangle tones
     * default:   short square blip
     * @param {string} type - Enemy type identifier
     */
    function enemyDie(type) {
        ensureContext();
        if (type === 'boss') {
            playNoise(0.4, 0.18, 600);
            playTone(50, 0.5, 'sawtooth', 0.1);
        } else if (type === 'splitter') {
            playNoise(0.15, 0.1, 500);
            playTone(400, 0.08, 'square', 0.05);
        } else if (type === 'shielded') {
            playTone(500, 0.1, 'triangle', 0.06);
            playTone(300, 0.15, 'triangle', 0.04);
        } else {
            playTone(200, 0.06, 'square', 0.04);
        }
    }

    /** Play sound when an enemy reaches the base — descending sawtooth + triangle. */
    function enemyReachBase() {
        playTone(150, 0.3, 'sawtooth', 0.08);
        playTone(100, 0.4, 'triangle', 0.06);
    }

    /** Play wave start fanfare — ascending sine arpeggio (C4 -> E4 -> G4). */
    function waveStart() {
        ensureContext();
        playTone(440, 0.15, 'sine', 0.08);
        setTimeout(() => playTone(554, 0.15, 'sine', 0.08), 120);
        setTimeout(() => playTone(660, 0.2, 'sine', 0.1), 240);
    }

    /** Play wave complete fanfare — ascending sine arpeggio (C5 -> E5 -> G5 -> C6). */
    function waveComplete() {
        ensureContext();
        playTone(523, 0.12, 'sine', 0.08);
        setTimeout(() => playTone(659, 0.12, 'sine', 0.08), 100);
        setTimeout(() => playTone(784, 0.12, 'sine', 0.08), 200);
        setTimeout(() => playTone(1047, 0.25, 'sine', 0.1), 300);
    }

    /** Play tower placement sound — two ascending triangle tones. */
    function towerPlace() {
        playTone(600, 0.06, 'triangle', 0.06);
        setTimeout(() => playTone(800, 0.05, 'triangle', 0.05), 50);
    }

    /** Play tower upgrade sound — three ascending sine tones. */
    function towerUpgrade() {
        playTone(800, 0.06, 'sine', 0.06);
        setTimeout(() => playTone(1000, 0.06, 'sine', 0.06), 60);
        setTimeout(() => playTone(1200, 0.08, 'sine', 0.08), 120);
    }

    /** Play tower sell sound — two descending triangle tones. */
    function towerSell() {
        playTone(500, 0.06, 'triangle', 0.05);
        setTimeout(() => playTone(400, 0.06, 'triangle', 0.05), 60);
    }

    /** Play game over sound — descending sawtooth (G4 -> D4 -> G3). */
    function gameOver() {
        ensureContext();
        playTone(400, 0.2, 'sawtooth', 0.08);
        setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.08), 180);
        setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.1), 360);
    }

    /** Play shield break sound — descending square then sawtooth. */
    function shieldBreak() {
        playTone(800, 0.04, 'square', 0.06);
        setTimeout(() => playTone(500, 0.06, 'square', 0.05), 50);
        setTimeout(() => playTone(300, 0.08, 'sawtooth', 0.04), 100);
    }

    /** Play castle repair sound — two ascending sine tones. */
    function castleRepair() {
        playTone(700, 0.06, 'sine', 0.05);
        setTimeout(() => playTone(900, 0.08, 'sine', 0.06), 80);
    }

    /** Play UI button click sound — very short sine blip. */
    function buttonClick() {
        playTone(1000, 0.03, 'sine', 0.03);
    }

    /**
     * Set the master volume level.
     * @param {number} volume - Volume level 0.0–1.0 (clamped to valid range)
     */
    function setVolume(volume) {
        if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }

    /**
     * Toggle sound on/off.
     * @returns {boolean} The new enabled state
     */
    function toggle() {
        enabled = !enabled;
        return enabled;
    }

    /** @returns {boolean} Whether sound is currently enabled */
    function isEnabled() { return enabled; }

    return {
        init, towerShoot, enemyHit, enemyDie, enemyReachBase,
        waveStart, waveComplete, towerPlace, towerUpgrade, towerSell,
        gameOver, castleRepair, shieldBreak, buttonClick, setVolume, toggle, isEnabled
    };
})();
