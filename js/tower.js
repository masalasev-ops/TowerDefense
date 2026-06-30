// ============================================================
// Tower — Tower class, targeting, firing logic
// ============================================================

class Tower {
    constructor(typeKey, col, row) {
        const def = TOWER_DEFS[typeKey];
        if (!def) throw new Error(`Unknown tower type: ${typeKey}`);

        this.typeKey = typeKey;
        this.col = col;
        this.row = row;
        this.x = col * CELL_SIZE + CELL_SIZE / 2;
        this.y = row * CELL_SIZE + CELL_SIZE / 2;
        this.level = 0; // 0=base, 1=upgrade1, 2=upgrade2

        this.name = def.name;
        this.icon = def.icon;
        this.description = def.description;

        // Load stats from level 0
        this._applyLevelStats();

        // State
        this.cooldown = 0;
        this.target = null;
        this.angle = 0; // facing direction
        this.totalInvested = this.currentCost;

        // Targeting mode: 'progress' | 'strongest' | 'weakest' | 'fastest'
        this.targetMode = 'progress';

        // Nuke specific
        this.nukeCharge = 0; // 0 to 1, visual charge indicator
    }

    _applyLevelStats() {
        const def = TOWER_DEFS[this.typeKey];
        const stats = def.levels[this.level];

        this.currentCost = stats.cost;
        this.damage = stats.damage;
        this.range = stats.range;
        this.fireRate = stats.fireRate;
        this.fireCooldown = 1 / stats.fireRate;
        this.splashRadius = stats.splashRadius || 0;
        this.slowAmount = stats.slow || 0;
        this.slowDuration = stats.slowDuration || 2.5;
        this.projColor = stats.projColor;
        this.projSpeed = stats.projSpeed;
        this.armorPierce = stats.armorPierce || 0;
        this.chainCount = stats.chainCount || 0;
        this.radiationDPS = stats.radiationDPS || 0;
        this.radiationDur = stats.radiationDur || 0;
        this.stunDuration = stats.stunDuration || 0;
        this.statsName = stats.name;
        this.statsColor = stats.color;
    }

    getUpgradeCost() {
        if (this.level >= 2) return null; // Max level
        const def = TOWER_DEFS[this.typeKey];
        return def.levels[this.level + 1].cost;
    }

    upgrade() {
        if (this.level >= 2) return false;
        const cost = this.getUpgradeCost();
        if (cost === null) return false;
        this.level++;
        this.totalInvested += cost;
        this._applyLevelStats();
        return true;
    }

    getSellValue() {
        return Math.floor(this.totalInvested * 0.4);
    }

    cycleTargetMode() {
        const modes = ['progress', 'strongest', 'weakest', 'fastest'];
        const idx = modes.indexOf(this.targetMode);
        this.targetMode = modes[(idx + 1) % modes.length];
        return this.targetMode;
    }

    getTargetModeLabel() {
        const labels = { progress: 'Furthest Along', strongest: 'Strongest', weakest: 'Lowest HP', fastest: 'Fastest' };
        return labels[this.targetMode] || 'Furthest Along';
    }

    findTarget(enemies) {
        // Find all enemies in range
        const inRange = [];
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.range) {
                inRange.push({ enemy, dist });
            }
        }

        if (inRange.length === 0) return null;

        // Targeting priority based on selected mode
        switch (this.targetMode) {
            case 'strongest':
                // Highest max HP first
                inRange.sort((a, b) => b.enemy.maxHp - a.enemy.maxHp);
                break;
            case 'weakest':
                // Lowest current HP first (cleanup)
                inRange.sort((a, b) => a.enemy.hp - b.enemy.hp);
                break;
            case 'fastest':
                // Highest speed first
                inRange.sort((a, b) => b.enemy.speed - a.enemy.speed);
                break;
            case 'progress':
            default:
                // Closest to the base (highest progress) — default
                inRange.sort((a, b) => {
                    const aDist = a.enemy.distanceToEnd();
                    const bDist = b.enemy.distanceToEnd();
                    return aDist - bDist;
                });
                break;
        }

        return inRange[0].enemy;
    }

    update(dt, enemies, gameSpeed) {
        const effectiveDt = dt * gameSpeed;

        // Update cooldown
        if (this.cooldown > 0) {
            this.cooldown -= effectiveDt;
        }

        // Nuke charge animation
        if (this.typeKey === 'nuke') {
            this.nukeCharge = Math.min(1, this.nukeCharge + effectiveDt / this.fireCooldown);
        }

        // Find target
        this.target = this.findTarget(enemies);

        if (this.target) {
            // Face target
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        }

        // Return firing data if ready to shoot
        if (this.cooldown <= 0 && this.target) {
            this.cooldown = this.fireCooldown;
            if (this.typeKey === 'nuke') {
                this.nukeCharge = 0;
            }
            if (typeof SoundManager !== 'undefined') SoundManager.towerShoot(this.typeKey);
            return {
                tower: this,
                target: this.target,
                damage: this.damage,
                splashRadius: this.splashRadius,
                slowAmount: this.slowAmount,
                slowDuration: this.slowDuration,
                projColor: this.projColor,
                projSpeed: this.projSpeed,
                armorPierce: this.armorPierce,
                chainCount: this.chainCount,
                radiationDPS: this.radiationDPS,
                radiationDur: this.radiationDur,
                stunDuration: this.stunDuration,
                typeKey: this.typeKey,
            };
        }

        return null;
    }

    render(ctx) {
        const x = this.x;
        const y = this.y;
        const baseS = CELL_SIZE * 0.38;
        const levelBonus = this.level * 1.2; // larger body at higher levels
        const s = baseS + levelBonus;

        // Directional ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(x + SHADOW_OFFSET_X, y + SHADOW_OFFSET_Y + 2, s * 1.3, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Base platform
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x - s - 2, y - s - 2, (s + 2) * 2, (s + 2) * 2);
        ctx.fillStyle = '#795548';
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - s, y - s, s * 2, s * 2);

        // Tower body
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.angle);

        const color = this.statsColor;

        if (this.typeKey === 'archer') {
            // Wooden watchtower with pointed roof
            // Tower body — wider wooden base
            ctx.fillStyle = '#6D4C41';
            ctx.fillRect(-8, 0, 16, 10);
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(-7, -10, 14, 12);
            // Wood plank lines
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 0.5;
            for (let ly = -8; ly <= 0; ly += 4) {
                ctx.beginPath(); ctx.moveTo(-7, ly); ctx.lineTo(7, ly); ctx.stroke();
            }
            // Pointed roof
            ctx.fillStyle = '#4E342E';
            ctx.beginPath();
            ctx.moveTo(-10, -10);
            ctx.lineTo(0, -18);
            ctx.lineTo(10, -10);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            ctx.moveTo(-7, -10);
            ctx.lineTo(0, -17);
            ctx.lineTo(0, -10);
            ctx.closePath();
            ctx.fill();
            // Bow in front
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, -3, 8, -1.0, 1.0);
            ctx.stroke();
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, -10); ctx.lineTo(0, 6); ctx.stroke(); // bowstring

        } else if (this.typeKey === 'cannon') {
            // Cannon: circular base with barrel
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Barrel
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-3, -16, 6, 16);
            ctx.fillStyle = '#455A64';
            ctx.fillRect(-2, -16, 4, 14);

        } else if (this.typeKey === 'frost') {
            // Frost: crystal shape
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? 12 : 7;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Center gem
            ctx.fillStyle = '#E3F2FD';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.typeKey === 'tesla') {
            // Tesla: coil with spark ball
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-5, -12, 10, 24);
            // Coils
            ctx.strokeStyle = '#FFC107';
            ctx.lineWidth = 2;
            for (let cy = -10; cy <= 10; cy += 5) {
                ctx.beginPath();
                ctx.arc(0, cy, 6, -Math.PI, 0);
                ctx.stroke();
            }
            // Spark at top
            ctx.fillStyle = '#FFF176';
            ctx.shadowColor = '#FFD600';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, -13, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

        } else if (this.typeKey === 'sniper') {
            // Low-profile bunker with long barrel and bipod
            // Bunker body — wide and low
            ctx.fillStyle = '#546E7A';
            ctx.fillRect(-9, -4, 18, 12);
            ctx.fillStyle = '#455A64';
            ctx.fillRect(-8, -4, 16, 10);
            // Camo stripe
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-8, -0, 16, 3);
            ctx.fillStyle = '#607D8B';
            ctx.fillRect(-8, -4, 16, 2);
            // Bipod legs at front
            ctx.strokeStyle = '#37474F';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-7, 11); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(7, 11); ctx.stroke();
            // Long barrel extending far forward
            ctx.fillStyle = '#212121';
            ctx.fillRect(-2.5, -18, 5, 18);
            ctx.fillStyle = '#424242';
            ctx.fillRect(-1.5, -18, 3, 16);
            // Barrel tip
            ctx.fillStyle = '#111';
            ctx.fillRect(-3, -19, 6, 3);
            // Large scope on top
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-2, -15, 8, 5);
            ctx.fillStyle = '#263238';
            ctx.fillRect(-1.5, -14.5, 7, 4);
            // Scope lens glint (blue glow)
            ctx.fillStyle = '#64B5F6';
            ctx.shadowColor = '#64B5F6';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(0, -17, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

        } else if (this.typeKey === 'nuke') {
            // Nuke Silo: dome with radiation symbol
            ctx.fillStyle = '#455A64';
            ctx.fillRect(-10, -4, 20, 14);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, -4, 10, Math.PI, 0);
            ctx.fill();
            // Radiation symbol
            const chargeGlow = this.nukeCharge;
            ctx.fillStyle = 'rgba(255,200,0,' + (0.5 + chargeGlow * 0.5) + ')';
            ctx.shadowColor = '#FF6D00';
            ctx.shadowBlur = chargeGlow * 12;
            ctx.beginPath();
            ctx.arc(0, -6, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Warning stripes
            ctx.fillStyle = '#FFC107';
            ctx.fillRect(-8, 4, 16, 2);
            ctx.fillRect(-8, 8, 16, 2);
        } else if (this.typeKey === 'plasma') {
            // Plasma Turret: crystalline energy weapon
            // Base
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-7, -2, 14, 10);
            // Crystal core
            ctx.fillStyle = color;
            ctx.shadowColor = '#B388FF';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-3, -2);
            ctx.lineTo(-7, 3);
            ctx.lineTo(0, 0);
            ctx.lineTo(7, 3);
            ctx.lineTo(3, -2);
            ctx.lineTo(6, -4);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // Glowing orb at tip
            ctx.fillStyle = '#EDE7F6';
            ctx.shadowColor = '#D1C4E9';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, -12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (this.typeKey === 'mortar') {
            // Mortar: wide base with angled barrel
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(-9, -2, 18, 10);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, -2, 9, Math.PI, 0);
            ctx.fill();
            // Angled barrel pointing up
            ctx.save();
            ctx.rotate(-0.5);
            ctx.fillStyle = '#4E342E';
            ctx.fillRect(-2, -18, 5, 16);
            ctx.fillStyle = '#3E2723';
            ctx.fillRect(-1.5, -18, 4, 14);
            ctx.restore();
        }

        ctx.restore();

        // Level stars
        if (this.level > 0) {
            ctx.fillStyle = '#FFD600';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const stars = '★'.repeat(this.level);
            ctx.fillText(stars, x, y - s - 6);
        }

        // Nuke charge bar (below tower)
        if (this.typeKey === 'nuke') {
            const barW = CELL_SIZE - 4;
            const barH = 3;
            const bx = x - barW / 2;
            const by = y + s + 6;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx, by, barW, barH);
            const grad = ctx.createLinearGradient(bx, by, bx + barW, by);
            grad.addColorStop(0, '#4CAF50');
            grad.addColorStop(0.5, '#FFC107');
            grad.addColorStop(1, '#F44336');
            ctx.fillStyle = grad;
            ctx.fillRect(bx, by, barW * this.nukeCharge, barH);

            // Countdown text
            if (this.cooldown > 0) {
                ctx.fillStyle = 'rgba(255,200,50,0.9)';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('☢ ' + this.cooldown.toFixed(1) + 's', x, by - 3);
            } else {
                ctx.fillStyle = 'rgba(255,50,50,0.85)';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('READY', x, by - 3);
            }
        }
    }

    renderRange(ctx) {
        ctx.strokeStyle = COLOR_RANGE_VALID;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Range fill
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.fill();
    }

    _lighten(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const lr = Math.min(255, r + Math.floor((255 - r) * amount));
        const lg = Math.min(255, g + Math.floor((255 - g) * amount));
        const lb = Math.min(255, b + Math.floor((255 - b) * amount));
        return `rgb(${lr},${lg},${lb})`;
    }
}
