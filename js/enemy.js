// ============================================================
// Enemy — Enemy class, movement, status effects, rendering
// ============================================================

class Enemy {
    constructor(typeKey, waveNum) {
        const def = ENEMY_DEFS[typeKey];
        if (!def) throw new Error(`Unknown enemy type: ${typeKey}`);

        this.typeKey = typeKey;
        this.name = def.name;
        this.flyer = def.flyer;
        this.size = def.size;
        this.color = def.color;
        this.gold = def.gold;
        this.regen = def.regen || 0;
        this.dodgeChance = def.dodgeChance || 0;

        // Apply difficulty scaling
        const diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[CURRENT_DIFFICULTY])
            ? DIFFICULTY_DEFS[CURRENT_DIFFICULTY] : { eliteInterval: 5, eliteHpMult: 1.4, eliteSpeedMult: 1.2, hpMult: 1, speedMult: 1 };
        const isElite = (waveNum % diff.eliteInterval === 0);
        const isBossWave = (waveNum % BOSS_WAVE_INTERVAL === 0);
        this._isElite = isElite;

        let hpMult = 1 + (waveNum - 1) * DIFFICULTY_HP_SCALE;
        let speedMult = 1 + (waveNum - 1) * DIFFICULTY_SPEED_SCALE;
        hpMult *= diff.hpMult;
        speedMult *= diff.speedMult;
        if (isElite) {
            hpMult *= diff.eliteHpMult;
            speedMult *= diff.eliteSpeedMult;
        }
        // Bosses get extra HP scaling
        if (typeKey === 'boss') {
            hpMult *= 1 + Math.floor(waveNum / 10) * 0.35;
        }

        this.maxHp = Math.floor(def.hp * hpMult);
        this.hp = this.maxHp;
        this.baseSpeed = def.speed * speedMult;
        this.speed = this.baseSpeed;
        this.baseArmor = def.armor;
        this.armor = this.baseArmor;

        // Movement state
        this.waypointIndex = 0;
        this.x = WAYPOINTS[0].x;
        this.y = WAYPOINTS[0].y;
        this.reachedBase = false;
        this.alive = true;

        // Status effects
        this.slowAmount = 0;       // 0 to 1 (fraction of speed reduced)
        this.slowDuration = 0;     // seconds remaining
        this.radiationDamage = 0;  // DPS
        this.radiationDuration = 0;
        this.frozen = false;       // visual

        // New enemy type properties
        // Healer
        this.healRadius = def.healRadius || 0;
        this.healAmount = def.healAmount || 0;
        this.healInterval = def.healInterval || 0;
        this.healTimer = 0;
        // Splitter
        this.splitCount = def.splitCount || 0;
        this.splitChildType = def.splitChildType || null;
        // Shielded
        this.shieldHits = def.shieldHits || 0;
        this.shieldDmgReduction = def.shieldDmgReduction || 0;
        this.shieldActive = this.shieldHits > 0;
        // Phantom
        this.phaseInterval = def.phaseInterval || 0;
        this.phaseDuration = def.phaseDuration || 0;
        this.phaseTimer = 0;
        this.phaseCooldown = 0;
        this.phased = false;

        // Visual
        this.bobOffset = Math.random() * Math.PI * 2;
        this.hitFlash = 0;         // seconds of white flash after hit
    }

    update(dt, gameSpeed) {
        if (!this.alive) return;

        const effectiveDt = dt * gameSpeed;

        // Update status effects
        if (this.slowDuration > 0) {
            this.slowDuration -= effectiveDt;
            if (this.slowDuration <= 0) {
                this.slowAmount = 0;
                this.frozen = false;
            }
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.speed = this.baseSpeed;
        }

        // Radiation damage over time
        if (this.radiationDuration > 0) {
            this.radiationDuration -= effectiveDt;
            this.takeDamage(this.radiationDamage * effectiveDt, true);
        }

        // Regen
        if (this.regen > 0 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen * effectiveDt);
        }

        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= effectiveDt;
        }

        // Healer timer (healing session managed by main.js)
        if (this.healAmount > 0 && this.healInterval > 0) {
            this.healTimer += effectiveDt;
        }

        // Phantom phase logic
        if (this.phaseInterval > 0 && !this.phased) {
            this.phaseTimer += effectiveDt;
            if (this.phaseTimer >= this.phaseInterval) {
                this.phaseTimer = 0;
                this.phased = true;
                this.phaseCooldown = this.phaseDuration;
            }
        }
        if (this.phased) {
            this.phaseCooldown -= effectiveDt;
            if (this.phaseCooldown <= 0) {
                this.phased = false;
            }
        }

        // Move along path
        if (this.waypointIndex >= WAYPOINTS.length) {
            this.reachedBase = true;
            this.alive = false;
            return;
        }

        const target = WAYPOINTS[this.waypointIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            // Reached waypoint, move to next
            this.waypointIndex++;
            if (this.waypointIndex >= WAYPOINTS.length) {
                this.x = target.x;
                this.y = target.y;
            }
        } else {
            // Move toward waypoint
            const moveAmount = this.speed * effectiveDt;
            const ratio = Math.min(moveAmount / dist, 1);
            this.x += dx * ratio;
            this.y += dy * ratio;
        }

        this.bobOffset += effectiveDt * 4;
    }

    takeDamage(amount, ignoreArmor = false, ignoreDodge = false) {
        if (!this.alive) return 0;

        // Phased immunity (phantoms): ignoreArmor doubles as "ignore defenses"
        if (this.phased && !ignoreArmor) {
            return 0;
        }

        // Dodge chance (runners)
        if (!ignoreDodge && this.dodgeChance > 0) {
            if (Math.random() < this.dodgeChance) {
                return 0; // Dodged!
            }
        }

        // Shield absorption (shielded): reduces damage before armor
        if (this.shieldActive && !ignoreArmor && amount > 0) {
            const absorbed = amount * this.shieldDmgReduction;
            amount -= absorbed;
            this.shieldHits--;
            if (this.shieldHits <= 0) {
                this.shieldActive = false;
            }
        }

        // Armor reduction
        let effectiveDamage = amount;
        if (!ignoreArmor && this.armor > 0) {
            effectiveDamage = amount * (1 - this.armor);
        }

        this.hp -= effectiveDamage;
        this.hitFlash = 0.1;

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }

        return effectiveDamage;
    }

    applySlow(amount, duration) {
        // Only apply if stronger slow than current
        if (amount >= this.slowAmount) {
            this.slowAmount = Math.max(this.slowAmount, amount);
            this.slowDuration = Math.max(this.slowDuration, duration);
            this.frozen = true;
        }
    }

    applyRadiation(dps, duration) {
        this.radiationDamage = dps;
        this.radiationDuration = Math.max(this.radiationDuration, duration);
    }

    render(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Bob animation for non-flyers
        if (!this.flyer) {
            const bob = Math.sin(this.bobOffset) * 2;
            ctx.translate(0, bob);
        } else {
            // Flyers hover higher
            const hover = Math.sin(this.bobOffset * 1.5) * 4;
            ctx.translate(0, hover - 6);
        }

        // Hit flash
        let bodyColor = this.color;
        if (this.hitFlash > 0) {
            bodyColor = '#ffffff';
        }

        // Draw enemy body
        const s = this.size;

        if (this.typeKey === 'grunt') {
            // Round blob
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-4, -3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(4, -3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(-4, -3, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(4, -3, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.typeKey === 'runner') {
            // Sleek fast shape
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.moveTo(s, 0);
            ctx.lineTo(-s * 0.6, -s * 0.7);
            ctx.lineTo(-s * 0.3, 0);
            ctx.lineTo(-s * 0.6, s * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Eye
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.typeKey === 'tank') {
            // Heavy square-ish shape
            const r = s * 1.2;
            ctx.fillStyle = bodyColor;
            ctx.fillRect(-r, -r * 0.8, r * 2, r * 1.6);
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-r, -r * 0.8, r * 2, r * 1.6);
            // Armor plates
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-r + 3, -r * 0.8 + 3, r * 2 - 6, 4);
            ctx.fillRect(-r + 3, r * 0.8 - 7, r * 2 - 6, 4);
            // Eyes
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(-5, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(5, -4, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.typeKey === 'flyer') {
            // Bat-like wings
            ctx.fillStyle = bodyColor;
            // Body
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            const wingPhase = Math.sin(this.bobOffset * 2) * 0.3;
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(-7, -2, 8, 5 + wingPhase * 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(7, -2, 8, 5 - wingPhase * 3, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(2, -2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(-2, -2, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(2, -2, 1.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.typeKey === 'boss') {
            // Large menacing shape
            const r = s * 1.1;
            // Body
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(0, -4, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            // Spikes
            ctx.fillStyle = '#b71c1c';
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + this.bobOffset * 0.2;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r - 4;
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            // Glowing eyes
            ctx.fillStyle = '#ff0';
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(-5, -8, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(5, -8, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

        } else if (this.typeKey === 'healer') {
            // Round body with green cross
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(0, -2, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Green cross symbol
            ctx.fillStyle = '#A5D6A7';
            const crossW = s * 0.25;
            const crossL = s * 0.55;
            ctx.fillRect(-crossW, -crossL - 2, crossW * 2, crossL * 2);
            ctx.fillRect(-crossL, -crossW - 2, crossL * 2, crossW * 2);
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(-3, -5, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -5, 1.2, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'splitter') {
            // Jagged orange shape
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            const jagPoints = 8;
            for (let i = 0; i < jagPoints; i++) {
                const angle = (i / jagPoints) * Math.PI * 2 - Math.PI / 2;
                const r = s * (i % 2 === 0 ? 1.0 : 0.7);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#BF360C';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Cracks
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(2, 0); ctx.lineTo(5, 3); ctx.stroke();
            // Eyes
            ctx.fillStyle = '#FFE0B2';
            ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -2, 2, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'splitter_minion') {
            // Small fragment
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(0, 1, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Tiny eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-2, -1, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(2, -1, 1.5, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'shielded') {
            // Blue armored shape
            const r = s * 1.1;
            ctx.fillStyle = bodyColor;
            ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
            ctx.strokeStyle = '#1565C0';
            ctx.lineWidth = 2;
            ctx.strokeRect(-r, -r * 0.7, r * 2, r * 1.4);
            // Armor plating
            ctx.fillStyle = '#1976D2';
            ctx.fillRect(-r + 3, -r * 0.7 + 3, r * 2 - 6, 4);
            ctx.fillRect(-r + 3, r * 0.7 - 7, r * 2 - 6, 4);
            // Shield visual when active
            if (this.shieldActive) {
                ctx.strokeStyle = 'rgba(100,181,246,0.6)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([6, 3]);
                ctx.beginPath();
                ctx.arc(0, 0, s + 5, -Math.PI * 0.7, Math.PI * 0.7);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            // Eyes
            ctx.fillStyle = '#BBDEFB';
            ctx.beginPath(); ctx.arc(-4, -3, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -3, 2.5, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'phantom') {
            // Semi-transparent if phased
            const alpha = this.phased ? 0.35 : 1.0;
            ctx.globalAlpha = alpha;
            // Purple wispy body
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
            // Wispy aura
            ctx.fillStyle = 'rgba(156,39,176,0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, s + 4, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (glowing)
            ctx.globalAlpha = this.phased ? 0.6 : 1.0;
            ctx.fillStyle = '#E1BEE7';
            ctx.shadowColor = '#CE93D8';
            ctx.shadowBlur = this.phased ? 8 : 3;
            ctx.beginPath(); ctx.arc(-3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }

        // Slow/frozen indicator
        if (this.frozen && this.slowDuration > 0) {
            ctx.strokeStyle = 'rgba(100,180,255,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
            ctx.stroke();
            // Ice crystals
            ctx.fillStyle = 'rgba(200,230,255,0.6)';
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + this.bobOffset;
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * (s + 5), Math.sin(angle) * (s + 5), 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Radiation indicator
        if (this.radiationDuration > 0) {
            ctx.fillStyle = 'rgba(255,50,0,0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, s + 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Elite indicator — golden ring + badge
        if (this._isElite) {
            ctx.strokeStyle = 'rgba(255,215,0,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, -s - 5);
        }

        ctx.restore();

        // HP bar (above enemy, not affected by bob)
        this.renderHpBar(ctx);
    }

    renderHpBar(ctx) {
        const barWidth = this.size * 2.2;
        const barHeight = 4;
        const barY = this.y - this.size - 10;
        // Adjust for flyers
        const yOffset = this.flyer ? -6 : 0;
        const bx = this.x - barWidth / 2;
        const by = barY + yOffset;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);

        // HP fill
        const hpRatio = this.hp / this.maxHp;
        let hpColor;
        if (hpRatio > 0.6) hpColor = '#4CAF50';
        else if (hpRatio > 0.3) hpColor = '#FFC107';
        else hpColor = '#F44336';

        ctx.fillStyle = hpColor;
        ctx.fillRect(bx, by, barWidth * hpRatio, barHeight);

        // Boss gets a fancier HP bar
        if (this.typeKey === 'boss') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for (let i = 0; i < barWidth; i += 6) {
                ctx.fillRect(bx + i, by, 3, barHeight);
            }
        }

        // Shield indicator bar
        if (this.shieldActive && this.shieldHits > 0) {
            const shieldY = by - 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx - 1, shieldY - 1, barWidth + 2, 3);
            ctx.fillStyle = '#64B5F6';
            ctx.fillRect(bx, shieldY, barWidth, 2);
        }
    }

    // Distance to the end (base) — higher = closer to end
    distanceToEnd() {
        if (this.waypointIndex >= WAYPOINTS.length) return 0;
        let dist = 0;
        // Remaining distance to current waypoint
        const currentTarget = WAYPOINTS[this.waypointIndex];
        const dx = currentTarget.x - this.x;
        const dy = currentTarget.y - this.y;
        dist += Math.sqrt(dx * dx + dy * dy);
        // Distance between remaining waypoints
        for (let i = this.waypointIndex; i < WAYPOINTS.length - 1; i++) {
            const a = WAYPOINTS[i];
            const b = WAYPOINTS[i + 1];
            dist += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        }
        return dist;
    }
}
