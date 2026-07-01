// ============================================================
// Effects — Particle systems, explosions, nuke effects, visuals
// ============================================================
//
// This module provides the complete visual effects pipeline for the game.
// It includes:
//
//   Particle            — Small moving/fading dots used for death explosions,
//                         hit sparks, smoke residue, and bloom flashes
//   FloatingText        — Damage numbers and gold pickups that float upward
//                         and fade out (e.g., "+25g", "17")
//   NukeFlash           — Full-screen white flash followed by an orange/red
//                         fade, used for nuclear tower detonations
//   ShockwaveRing       — Expanding concentric circle(s) that emanate from
//                         nuke impact point
//   PlasmaBolt          — Glowing projectile trail (outer glow + bright core
//                         + white-hot center) between tower and impact point
//   LightningBolt       — Procedural jagged lightning arc with glow and core
//                         strokes, randomly branched along the path
//   TowerUnlockCelebration
//                       — Animated splash card ("NEW TOWER UNLOCKED!") with
//                         a particle burst, gold border, tower icon/stats
//   WavePreviewSplash   — Centered animated card listing upcoming enemy types
//                         for the next wave, with boss/regular accent colors
//
// The activeEffects manager object owns arrays of every effect type and
// orchestrates their update/render lifecycle. The render order is:
//   particles → floatingTexts → lightningBolts → shockwaves →
//   nukeFlashes → wavePreviews → unlockCelebrations
// ============================================================

/**
 * Particle — A small dot that moves, fades, and optionally falls with gravity.
 * Used for death explosions, hit sparks, smoke, and bloom flashes.
 *
 * Fields:
 *   velocityX, velocityY  — Per-second movement deltas
 *   life, maxLife         — Remaining / total lifetime in seconds
 *   color                 — CSS color string
 *   size                  — Base radius in pixels
 *   gravity               — Downward acceleration (px/s^2)
 */
class Particle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.velocityX = (Math.random() - 0.5) * (config.speed || 60);
        this.velocityY = (Math.random() - 0.5) * (config.speed || 60);
        this.life = config.life || 0.5;
        this.maxLife = this.life;
        this.color = config.color || '#fff';
        this.size = config.size || 3;
        this.gravity = config.gravity || 0;
    }

    /**
     * Advance the particle by dt seconds.
     * Applies gravity, updates position from velocity, decreases life.
     * Returns true while the particle is still alive.
     */
    update(dt) {
        this.life -= dt;
        this.velocityY += this.gravity * dt;
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
        return this.life > 0;
    }

    /**
     * Draw the particle as a filled circle.
     * Alpha and size fade with remaining life.
     */
    render(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const size = this.size * (0.5 + alpha * 0.5);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

/**
 * FloatingText — A short piece of text that floats upward and fades out.
 * Used for damage numbers ("17", "+25g") and status messages.
 */
class FloatingText {
    constructor(x, y, text, color = '#FFD600') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 0.8;
        this.maxLife = 0.8;
    }

    /**
     * Drift upward and decrease life. Returns true while alive.
     */
    update(dt) {
        this.life -= dt;
        this.y -= 30 * dt; // Float upward
        return this.life > 0;
    }

    /**
     * Render the text centered at (x, y) with fading alpha.
     */
    render(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

/**
 * NukeFlash — A two-phase full-screen effect.
 *   Phase 1 ("flash"): bright white overlay that fades in quickly.
 *   Phase 2 ("fade"):  orange/red overlay that fades out slowly.
 */
class NukeFlash {
    constructor() {
        this.life = 1.0;
        this.maxLife = 1.0;
        this.phase = 'flash'; // flash -> fade
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0.7 && this.phase === 'flash') {
            this.phase = 'fade';
        }
        return this.life > 0;
    }

    render(ctx) {
        if (this.phase === 'flash') {
            // White flash filling screen
            const alpha = Math.min(1, (1 - this.life) * 3);
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        } else {
            // Orange/red fade
            const alpha = this.life / 0.7;
            ctx.fillStyle = `rgba(255,60,0,${alpha * 0.35})`;
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
    }
}

/**
 * ShockwaveRing — An expanding concentric circle pair that radiates from a
 * central point. Used as the secondary effect for nuke detonations.
 */
class ShockwaveRing {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.maxRadius = Math.max(GAME_WIDTH, GAME_HEIGHT);
        this.life = 0.8;
        this.maxLife = 0.8;
    }

    update(dt) {
        this.life -= dt;
        const progress = 1 - this.life / this.maxLife;
        this.radius = 20 + (this.maxRadius - 20) * progress;
        return this.life > 0;
    }

    render(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.strokeStyle = `rgba(255,120,0,${alpha * 0.6})`;
        ctx.lineWidth = 4 * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Second (inner) ring
        ctx.strokeStyle = `rgba(255,200,100,${alpha * 0.4})`;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.85, 0, Math.PI * 2);
        ctx.stroke();
    }
}

/**
 * PlasmaBolt — A three-layer glowing line between a source and target point.
 * Renders as an outer glow, a bright inner core, and a white-hot center.
 * Used for the Tesla / plasma tower projectile trail.
 */
class PlasmaBolt {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.life = 0.3;
        this.maxLife = 0.3;
    }
    update(dt) { this.life -= dt; return this.life > 0; }
    render(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        // Outer glow
        ctx.strokeStyle = 'rgba(180,130,255,' + (alpha * 0.5) + ')';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(this.from.x, this.from.y); ctx.lineTo(this.to.x, this.to.y); ctx.stroke();
        // Inner bright core
        ctx.strokeStyle = 'rgba(220,200,255,' + alpha + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(this.from.x, this.from.y); ctx.lineTo(this.to.x, this.to.y); ctx.stroke();
        // White-hot center
        ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.8) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(this.from.x, this.from.y); ctx.lineTo(this.to.x, this.to.y); ctx.stroke();
    }
}

/**
 * TowerUnlockCelebration — An animated splash card announcing a new tower.
 *
 * Phases:
 *   "enter" — card scales up from 30% to 100% over 0.4s
 *   "hold"  — card stays fully visible
 *   "exit"  — card fades and scales up slightly over 0.6s
 *
 * Visual layers (bottom to top):
 *   - Gold spark burst radiating from screen center
 *   - Radial gold glow aura behind the card
 *   - Dark glass card with gold border and rounded corners
 *   - "NEW TOWER UNLOCKED!" header
 *   - Tower icon, name, tier badge, description, cost
 *   - Recent sparks rendered on top of the card
 */
class TowerUnlockCelebration {
    constructor(towerDef) {
        this.towerDef = towerDef;
        this.life = 3.5;         // total display time
        this.maxLife = 3.5;
        this.phase = 'enter';    // enter -> hold -> exit
        this.phaseTimer = 0;
        this.cardY = GAME_HEIGHT / 2;
        // Spawn initial spark burst
        this._sparks = [];
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 180;
            this._sparks.push({
                x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.2 + Math.random() * 1.0,
                maxLife: 1.2 + Math.random() * 1.0,
                color: Math.random() > 0.5 ? '#FFD700' : '#FFAB00',
                size: 2 + Math.random() * 4,
            });
        }
    }

    update(dt) {
        this.life -= dt;
        this.phaseTimer += dt;
        if (this.phaseTimer < 0.4) this.phase = 'enter';
        else if (this.life < 0.6) this.phase = 'exit';
        else this.phase = 'hold';
        // Update sparks
        for (const sparkParticle of this._sparks) {
            sparkParticle.life -= dt;
            sparkParticle.x += sparkParticle.vx * dt;
            sparkParticle.y += sparkParticle.vy * dt;
            sparkParticle.vy += 30 * dt; // gravity
        }
        return this.life > 0;
    }

    render(ctx) {
        const def = this.towerDef;
        const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
        let cardAlpha, cardScale;

        if (this.phase === 'enter') {
            const t = this.phaseTimer / 0.4; // 0->1 over 0.4s
            cardAlpha = Math.min(1, t * 3);
            cardScale = 0.3 + t * 0.7;
        } else if (this.phase === 'exit') {
            const t = this.life / 0.6; // 1->0 over 0.6s
            cardAlpha = t;
            cardScale = 0.8 + t * 0.2;
        } else {
            cardAlpha = 1;
            cardScale = 1;
        }

        // Render sparks behind card
        for (const sparkParticle of this._sparks) {
            if (sparkParticle.life <= 0) continue;
            const sa = Math.max(0, sparkParticle.life / sparkParticle.maxLife);
            ctx.fillStyle = sparkParticle.color;
            ctx.globalAlpha = sa * cardAlpha;
            ctx.beginPath();
            ctx.arc(sparkParticle.x, sparkParticle.y, sparkParticle.size * (0.3 + sa * 0.7), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Card dimensions
        const cardW = 320, cardH = 160;
        const bx = cx - cardW / 2, by = cy - cardH / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cardScale, cardScale);
        ctx.globalAlpha = cardAlpha;

        // Glow aura behind card
        const auraGrad = ctx.createRadialGradient(0, 0, 40, 0, 0, cardW * 0.7);
        auraGrad.addColorStop(0, 'rgba(255,215,0,0.2)');
        auraGrad.addColorStop(0.5, 'rgba(255,180,0,0.08)');
        auraGrad.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-cardW / 2 - 20, -cardH / 2 - 20, cardW + 40, cardH + 40);

        // Card background (dark glass)
        ctx.fillStyle = 'rgba(10, 15, 35, 0.92)';
        ctx.strokeStyle = 'rgba(255,215,0,0.7)';
        ctx.lineWidth = 2.5;
        // Rounded rect card
        const r = 14, hw = cardW / 2, hh = cardH / 2;
        ctx.beginPath();
        ctx.moveTo(-hw + r, -hh);
        ctx.lineTo(hw - r, -hh);
        ctx.arcTo(hw, -hh, hw, -hh + r, r);
        ctx.lineTo(hw, hh - r);
        ctx.arcTo(hw, hh, hw - r, hh, r);
        ctx.lineTo(-hw + r, hh);
        ctx.arcTo(-hw, hh, -hw, hh - r, r);
        ctx.lineTo(-hw, -hh + r);
        ctx.arcTo(-hw, -hh, -hw + r, -hh, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner glow border
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // "NEW TOWER UNLOCKED!" header
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ NEW TOWER UNLOCKED! ⚡', 0, -hh + 26);

        // Tower icon (large)
        ctx.font = '44px sans-serif';
        ctx.fillText(def.icon, -hw + 55, -5);

        // Tower name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, -hw + 95, -22);

        // Tier badge
        ctx.fillStyle = '#FFAB00';
        ctx.font = 'bold 10px sans-serif';
        const tierLabel = 'Tier ' + def.tier + ' — Wave ' + def.unlockWave + '+';
        ctx.fillText(tierLabel, -hw + 95, 2);

        // Description
        ctx.fillStyle = '#aaa';
        ctx.font = '11px sans-serif';
        ctx.fillText(def.description, -hw + 95, 22);

        // Cost hint
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Cost: ' + def.levels[0].cost + 'g', -hw + 95, 44);

        ctx.restore();

        // Render sparks on top (recent ones)
        ctx.globalAlpha = cardAlpha * 0.6;
        for (const sparkParticle of this._sparks) {
            if (sparkParticle.life <= 0 || sparkParticle.life > sparkParticle.maxLife * 0.3) continue;
            const sa = sparkParticle.life / (sparkParticle.maxLife * 0.3);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sparkParticle.x, sparkParticle.y, sparkParticle.size * 0.5 * sa, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

/**
 * WavePreviewSplash — A centered animated card showing upcoming enemy types.
 *
 * Phases:
 *   "enter" — card scales up from 40% to 100% over 0.35s
 *   "hold"  — card stays fully visible
 *   "exit"  — card fades and scales up slightly over 0.5s
 *
 * Features:
 *   - Subtle particle burst behind card
 *   - Radial glow aura (color changes for boss waves)
 *   - Dark glass card with accent-colored border
 *   - "WAVE N INCOMING" header
 *   - Enemy type icons with labels in a horizontal row
 *
 * All rendering is wrapped in save/restore to prevent canvas state corruption.
 */
class WavePreviewSplash {
    constructor(waveNum, enemyTypes) {
        this.waveNum = waveNum;
        this.enemyTypes = enemyTypes;
        this.life = 2.8;
        this.maxLife = 2.8;
        this.phase = 'enter';
        this.phaseTimer = 0;

        // Subtle particle burst
        this._sparks = [];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 120;
            this._sparks.push({
                x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + Math.random() * 0.7,
                maxLife: 0.8 + Math.random() * 0.7,
                color: Math.random() > 0.5 ? '#FFD700' : '#FF9800',
                size: 1.5 + Math.random() * 3,
            });
        }
    }

    update(dt) {
        this.life -= dt;
        this.phaseTimer += dt;
        if (this.phaseTimer < 0.35) this.phase = 'enter';
        else if (this.life < 0.5) this.phase = 'exit';
        else this.phase = 'hold';
        for (const sparkParticle of this._sparks) {
            sparkParticle.life -= dt;
            sparkParticle.x += sparkParticle.vx * dt;
            sparkParticle.y += sparkParticle.vy * dt;
            sparkParticle.vy += 25 * dt;
        }
        return this.life > 0;
    }

    render(ctx) {
        ctx.save(); // Isolate all state changes
        const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT * 0.42;
        let cardAlpha, cardScale;

        if (this.phase === 'enter') {
            const t = Math.min(1, this.phaseTimer / 0.35);
            cardAlpha = Math.min(1, t * 3);
            cardScale = 0.4 + t * 0.6;
        } else if (this.phase === 'exit') {
            const t = Math.max(0, this.life / 0.5);
            cardAlpha = t;
            cardScale = 0.85 + t * 0.15;
        } else {
            cardAlpha = 1;
            cardScale = 1;
        }

        // Sparks behind card
        ctx.save();
        for (const sparkParticle of this._sparks) {
            if (sparkParticle.life <= 0) continue;
            const sa = Math.max(0, sparkParticle.life / sparkParticle.maxLife);
            ctx.globalAlpha = sa * cardAlpha;
            ctx.fillStyle = sparkParticle.color;
            ctx.beginPath();
            ctx.arc(sparkParticle.x, sparkParticle.y, sparkParticle.size * (0.3 + sa * 0.7), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Card layout
        const hasBoss = this.enemyTypes.includes('boss');
        const accentColor = hasBoss ? '#F44336' : '#FF9800';
        const enemyCount = this.enemyTypes.length;
        const cardW = Math.min(380, 200 + enemyCount * 50);
        const cardH = 170;
        const hw = cardW / 2, hh = cardH / 2;
        const r = 16;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cardScale, cardScale);
        ctx.globalAlpha = cardAlpha;

        // Glow aura
        const auraGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, cardW * 0.6);
        auraGrad.addColorStop(0, hasBoss ? 'rgba(244,67,54,0.18)' : 'rgba(255,152,0,0.15)');
        auraGrad.addColorStop(0.5, 'rgba(255,180,0,0.05)');
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-hw - 20, -hh - 20, cardW + 40, cardH + 40);

        // Card background
        ctx.fillStyle = 'rgba(10, 15, 35, 0.94)';
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-hw + r, -hh);
        ctx.lineTo(hw - r, -hh);
        ctx.arcTo(hw, -hh, hw, -hh + r, r);
        ctx.lineTo(hw, hh - r);
        ctx.arcTo(hw, hh, hw - r, hh, r);
        ctx.lineTo(-hw + r, hh);
        ctx.arcTo(-hw, hh, -hw, hh - r, r);
        ctx.lineTo(-hw, -hh + r);
        ctx.arcTo(-hw, -hh, -hw + r, -hh, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner border
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Wave header
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔ WAVE ' + this.waveNum + ' INCOMING ⚔', 0, -hh + 28);

        // Enemy type icons in a row
        const iconMap = {
            'grunt': '👤', 'runner': '🏃', 'tank': '🛡️', 'flyer': '🦇',
            'boss': '👹', 'healer': '💚', 'splitter': '🧨', 'splitter_minion': '⬜',
            'shielded': '🔵', 'phantom': '👻'
        };
        const nameMap = {
            'grunt': 'Grunt', 'runner': 'Runner', 'tank': 'Tank', 'flyer': 'Flyer',
            'boss': 'Boss', 'healer': 'Healer', 'splitter': 'Splitter', 'splitter_minion': 'Fragment',
            'shielded': 'Shielded', 'phantom': 'Phantom'
        };

        const iconSize = 32;
        const spacing = Math.min(48, (cardW - 60) / Math.max(enemyCount, 1));
        const startX = -((enemyCount - 1) * spacing) / 2;

        for (let i = 0; i < enemyCount; i++) {
            const t = enemyTypes[i];
            const ix = startX + i * spacing;
            const iy = 10;

            ctx.fillStyle = t === 'boss' ? 'rgba(244,67,54,0.2)' : 'rgba(255,255,255,0.06)';
            ctx.beginPath();
            ctx.arc(ix, iy, iconSize / 2 + 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = iconSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(iconMap[t] || '❓', ix, iy - 1);

            ctx.fillStyle = '#ccc';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(nameMap[t] || t, ix, iy + iconSize / 2 + 10);
        }

        ctx.restore(); // card scale/translate/alpha
        ctx.restore(); // top-level isolation
    }
}

/**
 * LightningBolt — A procedurally-generated jagged lightning arc between two
 * points. Segments are randomized on creation to create a natural fork.
 * Renders with a yellow glow stroke and a bright white core stroke.
 */
class LightningBolt {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.life = 0.25;
        this.maxLife = 0.25;
        this.segments = this._generateSegments();
    }

    /**
     * Build the list of intermediate points that form the forked arc.
     * Each segment is ~15px long with a random perpendicular offset of up
     * to 20px to create the jagged look.
     */
    _generateSegments() {
        const points = [this.from];
        const dx = this.to.x - this.from.x;
        const dy = this.to.y - this.from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const numSegments = Math.floor(dist / 15);

        for (let i = 1; i < numSegments; i++) {
            const t = i / numSegments;
            const offset = (Math.random() - 0.5) * 20;
            const perpX = -dy / dist * offset;
            const perpY = dx / dist * offset;
            points.push({
                x: this.from.x + dx * t + perpX,
                y: this.from.y + dy * t + perpY
            });
        }
        points.push(this.to);
        return points;
    }

    update(dt) {
        this.life -= dt;
        return this.life > 0;
    }

    render(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);

        // Glow
        ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.6})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].x, this.segments[i].y);
        }
        ctx.stroke();

        // Core
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].x, this.segments[i].y);
        }
        ctx.stroke();
    }
}

// ==================================================================
// activeEffects — The global effects manager
// ==================================================================
//
// Owns all active visual effects and orchestrates their lifecycle.
//
// Render order (bottom to top):
//   1. particles          — death explosions, hit sparks, smoke
//   2. floatingTexts      — damage numbers, gold pickups
//   3. lightningBolts     — lightning arcs and plasma bolts
//   4. shockwaves         — expanding concentric rings
//   5. nukeFlashes        — full-screen white/orange flash
//   6. wavePreviews       — wave preview splash card
//   7. unlockCelebrations — tower unlock celebration card
// ==================================================================
const activeEffects = {
    particles: [],
    floatingTexts: [],
    nukeFlashes: [],
    shockwaves: [],
    lightningBolts: [],
    unlockCelebrations: [],
    wavePreviews: [],

    /**
     * Advance all effects by dt seconds. Filters out dead effects.
     */
    update(dt) {
        this.particles = this.particles.filter(particle => particle.update(dt));
        this.floatingTexts = this.floatingTexts.filter(textElement => textElement.update(dt));
        this.nukeFlashes = this.nukeFlashes.filter(flashEffect => flashEffect.update(dt));
        this.shockwaves = this.shockwaves.filter(sparkParticle => sparkParticle.update(dt));
        this.lightningBolts = this.lightningBolts.filter(lightningBolt => lightningBolt.update(dt));
        this.unlockCelebrations = this.unlockCelebrations.filter(c => c.update(dt));
        this.wavePreviews = this.wavePreviews.filter(w => w.update(dt));
    },

    /**
     * Render all effects in the defined draw order.
     */
    render(ctx) {
        for (const particle of this.particles) particle.render(ctx);
        for (const textElement of this.floatingTexts) textElement.render(ctx);
        for (const lightningBolt of this.lightningBolts) lightningBolt.render(ctx);
        for (const sparkParticle of this.shockwaves) sparkParticle.render(ctx);
        // Nuke flashes render on top
        for (const flashEffect of this.nukeFlashes) flashEffect.render(ctx);
        // Wave preview splashes render above celebrations
        for (const w of this.wavePreviews) w.render(ctx);
        // Tower unlock celebrations render on top of everything
        for (const c of this.unlockCelebrations) c.render(ctx);
    },

    /**
     * Clear all effects (e.g., on game restart).
     */
    clear() {
        this.particles = [];
        this.floatingTexts = [];
        this.nukeFlashes = [];
        this.shockwaves = [];
        this.lightningBolts = [];
        this.unlockCelebrations = [];
        this.wavePreviews = [];
    },

    /**
     * Spawn a tower unlock celebration card (only one at a time).
     */
    spawnUnlockCelebration(towerDef) {
        // Don't stack multiple celebrations
        if (this.unlockCelebrations.length > 0) return;
        this.unlockCelebrations.push(new TowerUnlockCelebration(towerDef));
    },

    /**
     * Spawn a wave preview splash (delegated to ui.js for CSS-based display).
     */
    spawnWavePreview(waveNum, enemyTypes) {
        // Delegated to ui.js for CSS-based splash (avoids canvas state issues)
        if (typeof window._showWaveSplash === 'function') {
            window._showWaveSplash(waveNum, enemyTypes);
        }
    },

    // ================================================================
    // spawnEnemyDeath — Multi-phase death explosion
    // ================================================================
    //
    // Phase 1 — Bloom flash:  4 large white particles that expand and
    //           fade very quickly (0.1-0.25s).
    // Phase 2 — Explosion:    N colored particles (10 for normal, 35 for
    //           boss) that burst outward with gravity.
    // Phase 3 — Smoke:         3 dark puffs that float upward with
    //           negative gravity, representing residue.
    //
    // A floating gold text ("+Ng") is also spawned at the death location.
    // ================================================================
    spawnEnemyDeath(enemy) {
        const numParticles = enemy.typeKey === 'boss' ? 35 : 10;

        // Phase 1: Bloom flash (white expansion) — spawn larger white particles that fade fast
        for (let i = 0; i < 4; i++) {
            this.particles.push(new Particle(enemy.x, enemy.y, {
                speed: 15 + Math.random() * 25,
                life: 0.1 + Math.random() * 0.15,
                color: '#ffffff',
                size: enemy.size * 0.5 + Math.random() * enemy.size * 0.3,
                gravity: 0,
            }));
        }

        // Phase 2: Colored explosion particles
        for (let i = 0; i < numParticles; i++) {
            this.particles.push(new Particle(enemy.x, enemy.y, {
                speed: 40 + Math.random() * 100,
                life: 0.25 + Math.random() * 0.5,
                color: enemy.color,
                size: 2 + Math.random() * 4,
                gravity: 25,
            }));
        }

        // Phase 3: Smoke residue (dark puffs that expand and fade slowly)
        for (let i = 0; i < 3; i++) {
            const smokeAngle = Math.random() * Math.PI * 2;
            const smokeDist = Math.random() * 8;
            this.particles.push(new Particle(
                enemy.x + Math.cos(smokeAngle) * smokeDist,
                enemy.y + Math.sin(smokeAngle) * smokeDist, {
                speed: 3 + Math.random() * 5,
                life: 0.3 + Math.random() * 0.3,
                color: '#555555',
                size: 3 + Math.random() * 3,
                gravity: -5, // float upward
            }));
        }

        // Gold text
        this.floatingTexts.push(new FloatingText(
            enemy.x, enemy.y - enemy.size,
            `+${enemy.gold}g`, '#FFD600'
        ));
    },

    /**
     * spawnHitSpark — Small impact burst at a point.
     * Spawns 6 quick-fading spark particles plus a small white ring particle.
     */
    spawnHitSpark(x, y, color = '#FFEB3B') {
        // Spark particles
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Particle(x, y, {
                speed: 30 + Math.random() * 60,
                life: 0.12 + Math.random() * 0.2,
                color: color,
                size: 1 + Math.random() * 2.5,
            }));
        }
        // Small impact ring (growing circle particle)
        this.particles.push(new Particle(x, y, {
            speed: 40, life: 0.25, color: 'rgba(255,255,255,0.7)', size: 1, gravity: 0,
        }));
    },

    /**
     * spawnExplosion — Larger area burst with flash center, colored debris,
     * and a dark smoke ring that expands outward.
     */
    spawnExplosion(x, y, radius) {
        const numParticles = Math.floor(radius / 2.5);
        // Flash center
        for (let i = 0; i < 4; i++) {
            this.particles.push(new Particle(x, y, {
                speed: 10 + Math.random() * 20,
                life: 0.1 + Math.random() * 0.1,
                color: '#ffffff',
                size: 2 + Math.random() * 3,
                gravity: 0,
            }));
        }
        // Explosion particles
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            this.particles.push(new Particle(
                x + Math.cos(angle) * dist * 0.4,
                y + Math.sin(angle) * dist * 0.4, {
                speed: 50 + Math.random() * 130,
                life: 0.3 + Math.random() * 0.5,
                color: Math.random() > 0.5 ? '#FF6D00' : '#FFAB00',
                size: 2 + Math.random() * 5,
                gravity: 12,
            }));
        }
        // Smoke ring (dark particles expanding outward slowly)
        for (let i = 0; i < 5; i++) {
            const sa = Math.random() * Math.PI * 2;
            this.particles.push(new Particle(
                x + Math.cos(sa) * radius * 0.3,
                y + Math.sin(sa) * radius * 0.3, {
                speed: 15 + Math.random() * 25,
                life: 0.4 + Math.random() * 0.4,
                color: '#666666',
                size: 2 + Math.random() * 3,
                gravity: -8,
            }));
        }
    },

    /**
     * spawnNukeFlash — Full-screen nuke flash + centered shockwave ring.
     */
    spawnNukeFlash() {
        this.nukeFlashes.push(new NukeFlash());
        this.shockwaves.push(new ShockwaveRing(GAME_WIDTH / 2, GAME_HEIGHT / 2));
    },

    /**
     * Spawn a jagged lightning bolt between two points.
     */
    spawnLightningBolt(from, to) {
        this.lightningBolts.push(new LightningBolt(from, to));
    },

    /**
     * Spawn a plasma bolt (glowing straight line) between two points.
     */
    spawnPlasmaBolt(from, to) {
        this.lightningBolts.push(new PlasmaBolt(from, to));
    },

    /**
     * Spawn floating red damage text at a position.
     */
    spawnDamageText(x, y, damage) {
        this.floatingTexts.push(new FloatingText(x, y, `${Math.floor(damage)}`, '#FF5252'));
    },

    // ================================================================
    // processImpactEffects — Effect dispatch table
    // ================================================================
    //
    // Converts projectile hit data (from tower damage callbacks) into
    // appropriate visual effects. Each effect object should have:
    //   type  — string identifying the effect kind
    //   pos   — { x, y } impact point
    //   damage, radius, from  — optional parameter fields
    //
    // Supported effect types:
    //   hit          — Basic impact sparks + damage number
    //   explosion    — Area burst with flash, debris, and smoke ring
    //   spark        — Quick spark particles only
    //   lightning    — Sparks + damage + jagged bolt from source
    //   plasmaBeam   — Sparks + damage + plasma bolt from source
    //   nukeHit      — Damage text only (flash/shockwave handled separately)
    //   shieldBreak  — Blue sparks + "Shield Down!" text + sound
    //   nukeFlash    — Full-screen flash + shockwave ring
    //   nukeShockwave— No-op (handled by nukeFlash)
    // ================================================================
    processImpactEffects(effects) {
        if (!effects) return;

        for (const effect of effects) {
            switch (effect.type) {
                case 'hit':
                    this.spawnHitSpark(effect.pos.x, effect.pos.y);
                    this.spawnDamageText(effect.pos.x, effect.pos.y - 10, effect.damage);
                    break;
                case 'explosion':
                    this.spawnExplosion(effect.pos.x, effect.pos.y, effect.radius);
                    break;
                case 'spark':
                    this.spawnHitSpark(effect.pos.x, effect.pos.y);
                    break;
                case 'lightning':
                    this.spawnHitSpark(effect.pos.x, effect.pos.y, '#FFF176');
                    this.spawnDamageText(effect.pos.x, effect.pos.y - 10, effect.damage);
                    if (effect.from) {
                        this.spawnLightningBolt(effect.from, effect.pos);
                    }
                    break;
                case 'plasmaBeam':
                    this.spawnHitSpark(effect.pos.x, effect.pos.y, '#B388FF');
                    this.spawnDamageText(effect.pos.x, effect.pos.y - 10, effect.damage);
                    if (effect.from) {
                        this.spawnPlasmaBolt(effect.from, effect.pos);
                    }
                    break;
                case 'nukeHit':
                    this.spawnDamageText(effect.pos.x, effect.pos.y - 10, effect.damage);
                    break;
                case 'shieldBreak':
                    this.spawnHitSpark(effect.pos.x, effect.pos.y, '#64B5F6');
                    this.floatingTexts.push(new FloatingText(
                        effect.pos.x, effect.pos.y - 14, '💥 Shield Down!', '#64B5F6'
                    ));
                    if (typeof SoundManager !== 'undefined') SoundManager.shieldBreak();
                    break;
                case 'nukeFlash':
                    this.spawnNukeFlash();
                    break;
                case 'nukeShockwave':
                    // Already handled by nukeFlash
                    break;
            }
        }
    }
};
