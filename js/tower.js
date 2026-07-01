// ============================================================
// Tower — Tower class, targeting, firing logic
//
// This file defines the Tower class. Each tower is placed on the
// grid (col, row) and shoots at enemies within range. Towers have
// a 3-level upgrade system (0 = base, 1 = upgrade1, 2 = upgrade2).
// Stats per level are loaded from TOWER_DEFS[typeKey].levels[].
// When sold, the player recovers 40% of the total invested gold.
// ============================================================

class Tower {
    /**
     * Construct a tower at the given grid position.
     *
     * Level system: towers start at level 0 (base) and can be upgraded
     * twice (level 1 and level 2). Each upgrade increases stats and
     * costs gold. The totalInvested property tracks all gold spent so
     * that sell value can be calculated (40% refund).
     *
     * All runtime stats (damage, range, fireRate, etc.) are loaded from
     * TOWER_DEFS[typeKey].levels[this.level] via _applyLevelStats().
     *
     * @param {string} typeKey - Key into TOWER_DEFS (e.g. 'archer', 'cannon', 'tesla')
     * @param {number} col - Grid column (0-based)
     * @param {number} row - Grid row (0-based)
     */
    constructor(typeKey, col, row) {
        const towerDefinition = TOWER_DEFS[typeKey];
        if (!towerDefinition) throw new Error(`Unknown tower type: ${typeKey}`);

        this.typeKey = typeKey;
        this.col = col;
        this.row = row;
        this.x = col * CELL_SIZE + CELL_SIZE / 2;
        this.y = row * CELL_SIZE + CELL_SIZE / 2;
        this.level = 0; // 0=base, 1=upgrade1, 2=upgrade2

        this.name = towerDefinition.name;
        this.icon = towerDefinition.icon;
        this.description = towerDefinition.description;

        // Load level 0 stats as initial values
        this._applyLevelStats();

        // Runtime state
        this.cooldown = 0;
        this.target = null;
        this.angle = 0;            // facing direction (radians)
        this.totalInvested = this.currentCost;

        // Targeting mode (cycles through 4 options)
        this.targetMode = 'progress';

        // Nuke specific: visual charge indicator (0 to 1)
        this.nukeCharge = 0;
    }

    /**
     * Load the combat stats from the current level's definition.
     *
     * Called during construction and after each upgrade. Reads the
     * appropriate entry from TOWER_DEFS[typeKey].levels[this.level]
     * and copies all relevant properties onto the tower instance.
     */
    _applyLevelStats() {
        const towerDefinition = TOWER_DEFS[this.typeKey];
        const levelStats = towerDefinition.levels[this.level];

        this.currentCost = levelStats.cost;
        this.damage = levelStats.damage;
        this.range = levelStats.range;
        this.fireRate = levelStats.fireRate;
        this.fireCooldown = 1 / levelStats.fireRate;
        this.splashRadius = levelStats.splashRadius || 0;
        this.slowAmount = levelStats.slow || 0;
        this.slowDuration = levelStats.slowDuration || 2.5;
        this.projColor = levelStats.projColor;
        this.projSpeed = levelStats.projSpeed;
        this.armorPierce = levelStats.armorPierce || 0;
        this.chainCount = levelStats.chainCount || 0;
        this.radiationDPS = levelStats.radiationDPS || 0;
        this.radiationDur = levelStats.radiationDur || 0;
        this.stunDuration = levelStats.stunDuration || 0;
        this.statsName = levelStats.name;
        this.statsColor = levelStats.color;
    }

    /**
     * Get the gold cost required to upgrade to the next level.
     * @returns {number|null} Cost in gold, or null if already at max level (2)
     */
    getUpgradeCost() {
        if (this.level >= 2) return null;
        const towerDefinition = TOWER_DEFS[this.typeKey];
        return towerDefinition.levels[this.level + 1].cost;
    }

    /**
     * Upgrade this tower to the next level.
     * Increments level, adds the upgrade cost to totalInvested,
     * and reloads stats via _applyLevelStats().
     * @returns {boolean} True if upgrade succeeded, false if already max level
     */
    upgrade() {
        if (this.level >= 2) return false;
        const cost = this.getUpgradeCost();
        if (cost === null) return false;
        this.level++;
        this.totalInvested += cost;
        this._applyLevelStats();
        return true;
    }

    /**
     * Calculate the sell value of this tower.
     * Formula: 40% of total gold invested (base cost + upgrade costs),
     * rounded down to the nearest integer.
     * @returns {number} Gold refunded when selling
     */
    getSellValue() {
        return Math.floor(this.totalInvested * 0.4);
    }

    /**
     * Cycle to the next targeting mode.
     * The 4 modes cycle in order: progress -> strongest -> weakest -> fastest -> (repeat)
     * @returns {string} The newly selected target mode key
     */
    cycleTargetMode() {
        const modes = ['progress', 'strongest', 'weakest', 'fastest'];
        const currentIndex = modes.indexOf(this.targetMode);
        this.targetMode = modes[(currentIndex + 1) % modes.length];
        return this.targetMode;
    }

    /**
     * Get a human-readable label for the current targeting mode.
     * @returns {string} Display label
     */
    getTargetModeLabel() {
        const labels = {
            progress: 'Furthest Along',
            strongest: 'Strongest',
            weakest: 'Lowest HP',
            fastest: 'Fastest'
        };
        return labels[this.targetMode] || 'Furthest Along';
    }

    /**
     * Find the best target enemy within range based on the current targeting mode.
     *
     * Filtering: only alive enemies within Euclidean distance <= this.range.
     *
     * Sort modes:
     * - 'progress' (default): highest distanceToEnd() first (closest to base/end of path)
     * - 'strongest': highest maxHp first
     * - 'weakest': lowest current HP first (cleanup / last-hitting)
     * - 'fastest': highest current speed first
     *
     * @param {Enemy[]} enemies - Array of all active enemies on the map
     * @returns {Enemy|null} The selected target, or null if none in range
     */
    findTarget(enemies) {
        const inRange = [];
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.range) {
                inRange.push({ enemy, distance });
            }
        }

        if (inRange.length === 0) return null;

        // Sort by the selected targeting mode (ascending order, first element is target)
        switch (this.targetMode) {
            case 'strongest':
                // Highest max HP first
                inRange.sort((a, b) => b.enemy.maxHp - a.enemy.maxHp);
                break;
            case 'weakest':
                // Lowest current HP first (finish off weakened enemies)
                inRange.sort((a, b) => a.enemy.hp - b.enemy.hp);
                break;
            case 'fastest':
                // Highest speed first (catch runners)
                inRange.sort((a, b) => b.enemy.speed - a.enemy.speed);
                break;
            case 'progress':
            default:
                // Closest to the base (furthest along the path) — default mode
                inRange.sort((a, b) => {
                    const distA = a.enemy.distanceToEnd();
                    const distB = b.enemy.distanceToEnd();
                    return distA - distB;
                });
                break;
        }

        return inRange[0].enemy;
    }

    /**
     * Update the tower each frame: cooldown, targeting, and firing.
     *
     * Process:
     * 1. Decrement cooldown by scaled delta time
     * 2. (Nuke only) Advance visual charge indicator
     * 3. Find the best target via findTarget()
     * 4. If a target exists, update facing angle toward it
     * 5. If cooldown is ready and target alive, fire:
     *    - Reset cooldown to fireCooldown
     *    - (Nuke only) Reset charge indicator
     *    - Play shoot sound via SoundManager
     *    - Return a firing data object describing the shot
     *
     * @param {number} dt - Raw delta time in seconds
     * @param {Enemy[]} enemies - Array of all active enemies
     * @param {number} gameSpeed - Game speed multiplier
     * @returns {object|null} Firing data object if a shot was fired, null otherwise
     */
    update(dt, enemies, gameSpeed) {
        const scaledDeltaTime = dt * gameSpeed;

        // Step 1: Cooldown decay
        if (this.cooldown > 0) {
            this.cooldown -= scaledDeltaTime;
        }

        // Step 2: Nuke charge animation (visual only, fills bar over cooldown period)
        if (this.typeKey === 'nuke') {
            this.nukeCharge = Math.min(1, this.nukeCharge + scaledDeltaTime / this.fireCooldown);
        }

        // Step 3: Find target
        this.target = this.findTarget(enemies);

        // Step 4: Face target
        if (this.target) {
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        }

        // Step 5: Fire if cooldown is ready and we have a valid target
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

    /**
     * Render the tower on the canvas.
     *
     * Rendering order:
     * 1. Ground shadow (offset ellipse)
     * 2. Dark brown base platform with lighter inner fill
     * 3. Tower body (rotated to face target) — per-type rendering:
     *    - archer: Wooden watchtower with plank lines, pointed triangular roof,
     *      bow arc with bowstring in front
     *    - cannon: Circular base with rectangular barrel
     *    - frost: 6-point crystal/star shape with white center gem
     *    - tesla: Rectangular coil body with yellow coil arcs and blue spark ball at top
     *    - sniper: Low-profile bunker with camo stripes, bipod legs, long barrel,
     *      scope with blue lens glint
     *    - nuke: Silo with dome top, radiation symbol orb (glows based on charge),
     *      yellow warning stripes
     *    - plasma: Crystalline energy turret with purple gradient core and glowing orb tip
     *    - mortar: Wide dome base with upward-angled barrel
     * 4. Level stars (drawn above tower body after rotation reset)
     * 5. (Nuke only) Charge bar below tower + countdown / "READY" text
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const x = this.x;
        const y = this.y;
        const baseSize = CELL_SIZE * 0.38;
        const levelBonus = this.level * 1.2; // body grows slightly per level
        const bodySize = baseSize + levelBonus;

        // Step 1: Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(x + SHADOW_OFFSET_X, y + SHADOW_OFFSET_Y + 2, bodySize * 1.3, bodySize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Step 2: Base platform
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x - bodySize - 2, y - bodySize - 2, (bodySize + 2) * 2, (bodySize + 2) * 2);
        ctx.fillStyle = '#795548';
        ctx.fillRect(x - bodySize, y - bodySize, bodySize * 2, bodySize * 2);
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bodySize, y - bodySize, bodySize * 2, bodySize * 2);

        // Step 3: Tower body (rotated toward target)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.angle);

        const color = this.statsColor;

        if (this.typeKey === 'archer') {
            // Wooden watchtower with pointed roof
            // Wider wooden base
            ctx.fillStyle = '#6D4C41';
            ctx.fillRect(-8, 0, 16, 10);
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(-7, -10, 14, 12);
            // Wood plank lines
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 0.5;
            for (let plankY = -8; plankY <= 0; plankY += 4) {
                ctx.beginPath(); ctx.moveTo(-7, plankY); ctx.lineTo(7, plankY); ctx.stroke();
            }
            // Pointed triangular roof
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
            // Bow arc
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, -3, 8, -1.0, 1.0);
            ctx.stroke();
            // Bowstring
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, -10); ctx.lineTo(0, 6); ctx.stroke();

        } else if (this.typeKey === 'cannon') {
            // Cannon: circular base with rectangular barrel
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
            // Frost: 6-point crystal / star shape
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let pointIndex = 0; pointIndex < 6; pointIndex++) {
                const angle = (pointIndex / 6) * Math.PI * 2 - Math.PI / 2;
                const pointRadius = pointIndex % 2 === 0 ? 12 : 7;
                const px = Math.cos(angle) * pointRadius;
                const py = Math.sin(angle) * pointRadius;
                if (pointIndex === 0) ctx.moveTo(px, py);
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
            // Tesla: coil with spark ball at top
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-5, -12, 10, 24);
            // Coil arcs
            ctx.strokeStyle = '#FFC107';
            ctx.lineWidth = 2;
            for (let coilY = -10; coilY <= 10; coilY += 5) {
                ctx.beginPath();
                ctx.arc(0, coilY, 6, -Math.PI, 0);
                ctx.stroke();
            }
            // Spark ball at top with glow
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
            // Camo stripes
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-8, -0, 16, 3);
            ctx.fillStyle = '#607D8B';
            ctx.fillRect(-8, -4, 16, 2);
            // Bipod legs at front
            ctx.strokeStyle = '#37474F';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-7, 11); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(7, 11); ctx.stroke();
            // Long barrel extending forward
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
            // Nuke Silo: dome with radiation symbol and charge indicator
            ctx.fillStyle = '#455A64';
            ctx.fillRect(-10, -4, 20, 14);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, -4, 10, Math.PI, 0);
            ctx.fill();
            // Radiation symbol orb — brightness follows charge level
            const chargeGlow = this.nukeCharge;
            ctx.fillStyle = 'rgba(255,200,0,' + (0.5 + chargeGlow * 0.5) + ')';
            ctx.shadowColor = '#FF6D00';
            ctx.shadowBlur = chargeGlow * 12;
            ctx.beginPath();
            ctx.arc(0, -6, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Warning stripes at base
            ctx.fillStyle = '#FFC107';
            ctx.fillRect(-8, 4, 16, 2);
            ctx.fillRect(-8, 8, 16, 2);

        } else if (this.typeKey === 'plasma') {
            // Plasma Turret: crystalline energy weapon
            // Base
            ctx.fillStyle = '#37474F';
            ctx.fillRect(-7, -2, 14, 10);
            // Crystal core (pointed polygon)
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
            // Angled barrel pointing upward
            ctx.save();
            ctx.rotate(-0.5);
            ctx.fillStyle = '#4E342E';
            ctx.fillRect(-2, -18, 5, 16);
            ctx.fillStyle = '#3E2723';
            ctx.fillRect(-1.5, -18, 4, 14);
            ctx.restore();
        }

        ctx.restore();

        // Step 4: Level stars (above tower, not rotated)
        if (this.level > 0) {
            ctx.fillStyle = '#FFD600';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const starCount = '★'.repeat(this.level);
            ctx.fillText(starCount, x, y - bodySize - 6);
        }

        // Step 5: Nuke charge bar and cooldown text
        if (this.typeKey === 'nuke') {
            const barWidth = CELL_SIZE - 4;
            const barHeight = 3;
            const barX = x - barWidth / 2;
            const barY = y + bodySize + 6;
            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            // Gradient fill (green -> yellow -> red)
            const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            grad.addColorStop(0, '#4CAF50');
            grad.addColorStop(0.5, '#FFC107');
            grad.addColorStop(1, '#F44336');
            ctx.fillStyle = grad;
            ctx.fillRect(barX, barY, barWidth * this.nukeCharge, barHeight);

            // Countdown text or READY indicator
            if (this.cooldown > 0) {
                ctx.fillStyle = 'rgba(255,200,50,0.9)';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('☢ ' + this.cooldown.toFixed(1) + 's', x, barY - 3);
            } else {
                ctx.fillStyle = 'rgba(255,50,50,0.85)';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('READY', x, barY - 3);
            }
        }
    }

    /**
     * Render the tower's attack range as a dashed circle with a faint fill.
     * Used when the tower is selected by the player.
     * @param {CanvasRenderingContext2D} ctx
     */
    renderRange(ctx) {
        ctx.strokeStyle = COLOR_RANGE_VALID;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Faint range fill
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Lighten a hex color by blending it toward white.
     * Used for rendering highlights.
     * @param {string} hex - 6-digit hex color string (e.g. '#FF0000')
     * @param {number} amount - Lighten factor (0 to 1)
     * @returns {string} CSS rgb() string
     */
    _lighten(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const lighterR = Math.min(255, r + Math.floor((255 - r) * amount));
        const lighterG = Math.min(255, g + Math.floor((255 - g) * amount));
        const lighterB = Math.min(255, b + Math.floor((255 - b) * amount));
        return `rgb(${lighterR},${lighterG},${lighterB})`;
    }
}
