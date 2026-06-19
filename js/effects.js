// ============================================================
// Effects — Particle systems, explosions, nuke effects, visuals
// ============================================================

class Particle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * (config.speed || 60);
        this.vy = (Math.random() - 0.5) * (config.speed || 60);
        this.life = config.life || 0.5;
        this.maxLife = this.life;
        this.color = config.color || '#fff';
        this.size = config.size || 3;
        this.gravity = config.gravity || 0;
    }

    update(dt) {
        this.life -= dt;
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        return this.life > 0;
    }

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

class FloatingText {
    constructor(x, y, text, color = '#FFD600') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 0.8;
        this.maxLife = 0.8;
    }

    update(dt) {
        this.life -= dt;
        this.y -= 30 * dt; // Float upward
        return this.life > 0;
    }

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

class NukeFlash {
    constructor() {
        this.life = 1.0;
        this.maxLife = 1.0;
        this.phase = 'flash'; // flash → fade
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

        // Second ring
        ctx.strokeStyle = `rgba(255,200,100,${alpha * 0.4})`;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.85, 0, Math.PI * 2);
        ctx.stroke();
    }
}

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

class LightningBolt {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.life = 0.25;
        this.maxLife = 0.25;
        this.segments = this._generateSegments();
    }

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

// Effects manager
const activeEffects = {
    particles: [],
    floatingTexts: [],
    nukeFlashes: [],
    shockwaves: [],
    lightningBolts: [],

    update(dt) {
        this.particles = this.particles.filter(p => p.update(dt));
        this.floatingTexts = this.floatingTexts.filter(t => t.update(dt));
        this.nukeFlashes = this.nukeFlashes.filter(f => f.update(dt));
        this.shockwaves = this.shockwaves.filter(s => s.update(dt));
        this.lightningBolts = this.lightningBolts.filter(l => l.update(dt));
    },

    render(ctx) {
        for (const p of this.particles) p.render(ctx);
        for (const t of this.floatingTexts) t.render(ctx);
        for (const l of this.lightningBolts) l.render(ctx);
        for (const s of this.shockwaves) s.render(ctx);
        // Nuke flashes render on top
        for (const f of this.nukeFlashes) f.render(ctx);
    },

    clear() {
        this.particles = [];
        this.floatingTexts = [];
        this.nukeFlashes = [];
        this.shockwaves = [];
        this.lightningBolts = [];
    },

    // Helper to spawn death explosion
    spawnEnemyDeath(enemy) {
        const numParticles = enemy.typeKey === 'boss' ? 30 : 8;
        for (let i = 0; i < numParticles; i++) {
            this.particles.push(new Particle(enemy.x, enemy.y, {
                speed: 40 + Math.random() * 80,
                life: 0.3 + Math.random() * 0.4,
                color: enemy.color,
                size: 2 + Math.random() * 4,
                gravity: 20,
            }));
        }
        this.floatingTexts.push(new FloatingText(
            enemy.x, enemy.y - enemy.size,
            `+${enemy.gold}g`, '#FFD600'
        ));
    },

    // Helper for projectile hit
    spawnHitSpark(x, y, color = '#FFEB3B') {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(x, y, {
                speed: 30 + Math.random() * 50,
                life: 0.15 + Math.random() * 0.2,
                color: color,
                size: 1 + Math.random() * 2,
            }));
        }
    },

    // Helper for explosion
    spawnExplosion(x, y, radius) {
        const numParticles = Math.floor(radius / 3);
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            this.particles.push(new Particle(
                x + Math.cos(angle) * dist * 0.5,
                y + Math.sin(angle) * dist * 0.5, {
                speed: 50 + Math.random() * 120,
                life: 0.3 + Math.random() * 0.5,
                color: Math.random() > 0.5 ? '#FF6D00' : '#FFAB00',
                size: 2 + Math.random() * 5,
                gravity: 10,
            }));
        }
    },

    // Nuke effects
    spawnNukeFlash() {
        this.nukeFlashes.push(new NukeFlash());
        this.shockwaves.push(new ShockwaveRing(GAME_WIDTH / 2, GAME_HEIGHT / 2));
    },

    spawnLightningBolt(from, to) {
        this.lightningBolts.push(new LightningBolt(from, to));
    },

    spawnPlasmaBolt(from, to) {
        this.lightningBolts.push(new PlasmaBolt(from, to));
    },

    spawnDamageText(x, y, damage) {
        this.floatingTexts.push(new FloatingText(x, y, `${Math.floor(damage)}`, '#FF5252'));
    },

    // Process impact effects from projectiles
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
