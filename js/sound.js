// ============================================================
// Sound Manager — Web Audio API procedural sound effects
// ============================================================

const SoundManager = (function() {
    'use strict';

    let audioCtx = null;
    let masterGain = null;
    let enabled = true;
    let initialized = false;

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

    function ensureContext() {
        if (!initialized) init();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // ---- Sound generators ----

    function playTone(freq, duration, type, vol, ramp) {
        if (!enabled || !audioCtx) return;
        ensureContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime((vol || 0.15) * masterGain.gain.value, audioCtx.currentTime);
        if (ramp) {
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        }
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration);
    }

    function playNoise(duration, vol, filterFreq) {
        if (!enabled || !audioCtx) return;
        ensureContext();
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.value = (vol || 0.1) * masterGain.gain.value;

        let dest = gain;
        if (filterFreq) {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            gain.connect(filter);
            dest = filter;
        }

        source.connect(gain);
        dest.connect(audioCtx.destination);
        source.start();
    }

    // ---- Public API ----

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

    function enemyHit() {
        playTone(300, 0.04, 'square', 0.04);
    }

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

    function enemyReachBase() {
        playTone(150, 0.3, 'sawtooth', 0.08);
        playTone(100, 0.4, 'triangle', 0.06);
    }

    function waveStart() {
        ensureContext();
        playTone(440, 0.15, 'sine', 0.08);
        setTimeout(() => playTone(554, 0.15, 'sine', 0.08), 120);
        setTimeout(() => playTone(660, 0.2, 'sine', 0.1), 240);
    }

    function waveComplete() {
        ensureContext();
        playTone(523, 0.12, 'sine', 0.08);
        setTimeout(() => playTone(659, 0.12, 'sine', 0.08), 100);
        setTimeout(() => playTone(784, 0.12, 'sine', 0.08), 200);
        setTimeout(() => playTone(1047, 0.25, 'sine', 0.1), 300);
    }

    function towerPlace() {
        playTone(600, 0.06, 'triangle', 0.06);
        setTimeout(() => playTone(800, 0.05, 'triangle', 0.05), 50);
    }

    function towerUpgrade() {
        playTone(800, 0.06, 'sine', 0.06);
        setTimeout(() => playTone(1000, 0.06, 'sine', 0.06), 60);
        setTimeout(() => playTone(1200, 0.08, 'sine', 0.08), 120);
    }

    function towerSell() {
        playTone(500, 0.06, 'triangle', 0.05);
        setTimeout(() => playTone(400, 0.06, 'triangle', 0.05), 60);
    }

    function gameOver() {
        ensureContext();
        playTone(400, 0.2, 'sawtooth', 0.08);
        setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.08), 180);
        setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.1), 360);
    }

    function castleRepair() {
        playTone(700, 0.06, 'sine', 0.05);
        setTimeout(() => playTone(900, 0.08, 'sine', 0.06), 80);
    }

    function buttonClick() {
        playTone(1000, 0.03, 'sine', 0.03);
    }

    function setVolume(v) {
        if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    }

    function toggle() {
        enabled = !enabled;
        return enabled;
    }

    function isEnabled() { return enabled; }

    return {
        init, towerShoot, enemyHit, enemyDie, enemyReachBase,
        waveStart, waveComplete, towerPlace, towerUpgrade, towerSell,
        gameOver, castleRepair, buttonClick, setVolume, toggle, isEnabled
    };
})();
