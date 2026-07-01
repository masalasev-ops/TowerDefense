// ============================================================
// Projectile — Projectile movement, collision, special effects
//
// This file defines the Projectile class. Projectiles are created
// when a tower fires, using data from the tower (damage, splash,
// slow, etc.) and the target enemy. Most projectile types move
// toward the target's position, but several are instant and
// resolve immediately (nuke, tesla, plasma).
// ============================================================

class Projectile {
    /**
     * Construct a projectile from tower firing data.
     *
     * Projectile behavior by type:
     * - archer/cannon/frost/mortar (moving): Travel toward the target's
     *   position. On arrival or proximity, call _doImpact() for splash
     *   or single-target damage. Rendered as arrow, cannonball, ice shard,
     *   or mortar shell respectively.
     * - nuke (instant): On first update, calls _doNukeImpact() — deals
     *   global damage to ALL enemies on the map with full armor pierce
     *   and applies radiation DoT. No projectile sprite rendered.
     * - tesla (instant): On first update, calls _doChainLightning() —
     *   hits the primary target then chains to nearby enemies with 75%
     *   damage decay per hop. No projectile sprite rendered.
     * - plasma (instant): On first update, calls _doPlasmaBeam() —
     *   single-target massive hit with full armor pierce.
     *   No projectile sprite rendered.
     *
     * @param {object} firingData - Data object returned by Tower.update()
     * @param {Enemy[]} enemies - Array of all active enemies (needed for instant types)
     */
    constructor(firingData, enemies) {
        this.x = firingData.tower.x;
        this.y = firingData.tower.y;
        this.typeKey = firingData.typeKey;
        this.damage = firingData.damage;
        this.splashRadius = firingData.splashRadius;
        this.slowAmount = firingData.slowAmount;
        this.slowDuration = firingData.slowDuration;
        this.color = firingData.projColor;
        this.speed = firingData.projSpeed;
        this.armorPierce = firingData.armorPierce;
        this.chainCount = firingData.chainCount;
        this.radiationDPS = firingData.radiationDPS;
        this.radiationDur = firingData.radiationDur;
        this.stunDuration = firingData.stunDuration || 0;
        this.tower = firingData.tower;

        // Target tracking
        this.targetEnemy = firingData.target;
        this.targetX = firingData.target.x;
        this.targetY = firingData.target.y;
        this.alive = true;

        // Movement direction (for moving projectile types)
        this.angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        this.trail = [];

        // Chain lightning tracking: set of enemies already hit by this bolt
        this.hitEnemies = new Set();
        this.hitEnemies.add(firingData.target);

        // Guard: ensures instant types only fire once
        this.hasHit = false;

        // Lifespan: auto-destruct after 5 seconds
        this.maxLifetime = 5;
        this.lifetime = 0;
    }

    /**
     * Update the projectile each frame.
     *
     * For instant types (nuke, tesla, plasma):
     * - Resolve the effect immediately on first update, then mark dead.
     *
     * For moving types (archer, cannon, frost, mortar):
     * - Move toward the target's last known position each frame.
     * - On proximity (distance < 5) or if the target died, call _doImpact().
     * - If lifetime exceeds maxLifetime (5s), self-destruct without effect.
     *
     * @param {number} dt - Raw delta time in seconds
     * @param {Enemy[]} enemies - Array of all active enemies on the map
     * @param {number} gameSpeed - Game speed multiplier
     * @returns {Array|null} Array of effect objects if impact occurred, null otherwise
     */
    update(dt, enemies, gameSpeed) {
        if (!this.alive) return null;

        const scaledDeltaTime = dt * gameSpeed;
        this.lifetime += scaledDeltaTime;

        if (this.lifetime > this.maxLifetime) {
            this.alive = false;
            return null;
        }

        // --- Instant types: resolve immediately on first update ---

        if (this.typeKey === 'nuke') {
            if (!this.hasHit) {
                this.hasHit = true;
                return this._doNukeImpact(enemies);
            }
            this.alive = false;
            return null;
        }

        if (this.typeKey === 'tesla') {
            if (!this.hasHit) {
                this.hasHit = true;
                return this._doChainLightning(enemies);
            }
            this.alive = false;
            return null;
        }

        if (this.typeKey === 'plasma') {
            if (!this.hasHit) {
                this.hasHit = true;
                return this._doPlasmaBeam(enemies);
            }
            this.alive = false;
            return null;
        }

        // --- Moving projectile: advance toward target ---

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        // Check for arrival: close enough or target died
        if (distanceToTarget < 5 || (this.targetEnemy && !this.targetEnemy.alive)) {
            return this._doImpact(enemies);
        }

        // Move toward target position
        const moveAmount = this.speed * scaledDeltaTime;
        const ratio = Math.min(moveAmount / distanceToTarget, 1);
        this.x += dx * ratio;
        this.y += dy * ratio;

        // Trail (gradient style: larger/fresher at front, smaller/older at back)
        this.trail.push({ x: this.x, y: this.y, life: 0.2 });
        if (this.trail.length > 10) this.trail.shift();
        for (const trailPoint of this.trail) trailPoint.life -= scaledDeltaTime;

        // Secondary distance check after movement
        const newDistance = Math.sqrt(
            (this.targetX - this.x) ** 2 + (this.targetY - this.y) ** 2
        );
        if (newDistance < 8) {
            return this._doImpact(enemies);
        }

        return null;
    }

    /**
     * Record which tower type damaged this enemy (used for post-game stats).
     * @param {Enemy} enemy - The enemy that was damaged
     */
    _markKiller(enemy) {
        if (this.tower && this.tower.typeKey) {
            enemy._killedByTowerType = this.tower.typeKey;
        }
    }

    /**
     * Apply impact damage at the projectile's current position.
     *
     * Splash damage (used by cannon, upgraded frost, mortar):
     * - Every enemy within splashRadius takes damage with linear falloff:
     *   damage = this.damage * (1 - (distance / splashRadius) * 0.5)
     *   This means enemies at the outer edge take 50% damage.
     * - Slow and stun effects are applied to all enemies in the splash zone.
     * - Shield break and hit effects are emitted for each affected enemy.
     * - An explosion visual effect is emitted at the impact point.
     *
     * Single-target (default):
     * - Only the original target takes full damage.
     * - Slow and stun applied to the target only.
     * - A spark visual effect is emitted at the impact point.
     *
     * @param {Enemy[]} enemies - All active enemies on the map
     * @returns {Array} Array of effect objects for the renderer
     */
    _doImpact(enemies) {
        this.alive = false;
        const effects = [];

        if (this.splashRadius > 0) {
            // --- Splash damage with linear falloff ---
            const hitEnemies = [];
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= this.splashRadius) {
                    // Falloff: full damage at center, 50% at the edge
                    const falloff = 1 - (distance / this.splashRadius) * 0.5;
                    const splashDamage = Math.floor(this.damage * falloff);
                    const result = enemy.takeDamage(splashDamage, this.armorPierce);
                    const actualDamage = result.damage;
                    if (actualDamage > 0) this._markKiller(enemy);
                    hitEnemies.push(enemy);
                    // Apply secondary effects
                    if (this.slowAmount > 0) {
                        enemy.applySlow(this.slowAmount, this.slowDuration);
                    }
                    if (this.stunDuration > 0) {
                        enemy.applyStun(this.stunDuration);
                    }
                    if (result.shieldBroke) {
                        effects.push({ type: 'shieldBreak', enemy, pos: { x: enemy.x, y: enemy.y } });
                    }
                    if (actualDamage > 0) {
                        effects.push({ type: 'hit', enemy, damage: actualDamage, pos: { x: enemy.x, y: enemy.y } });
                    }
                }
            }
            effects.push({ type: 'explosion', pos: { x: this.x, y: this.y }, radius: this.splashRadius });
        } else {
            // --- Single-target hit ---
            if (this.targetEnemy && this.targetEnemy.alive) {
                const result = this.targetEnemy.takeDamage(this.damage, this.armorPierce);
                const actualDamage = result.damage;
                if (actualDamage > 0) this._markKiller(this.targetEnemy);
                if (this.slowAmount > 0) {
                    this.targetEnemy.applySlow(this.slowAmount, this.slowDuration);
                }
                if (this.stunDuration > 0) {
                    this.targetEnemy.applyStun(this.stunDuration);
                }
                if (result.shieldBroke) {
                    effects.push({ type: 'shieldBreak', enemy: this.targetEnemy, pos: { x: this.targetEnemy.x, y: this.targetEnemy.y } });
                }
                if (actualDamage > 0) {
                    effects.push({ type: 'hit', enemy: this.targetEnemy, damage: actualDamage, pos: { x: this.targetEnemy.x, y: this.targetEnemy.y } });
                }
            }
            effects.push({ type: 'spark', pos: { x: this.x, y: this.y } });
        }

        return effects;
    }

    /**
     * Execute chain lightning — hits primary target then chains to nearby enemies.
     *
     * Chain logic:
     * 1. Primary target takes full damage (no armor pierce).
     * 2. Up to (chainCount - 1) additional enemies are found within chainRange (100px)
     *    of the current target, starting from the primary.
     * 3. Each chain hop deals 75% of the previous hop's damage (damage *= 0.75),
     *    floored to an integer.
     * 4. Enemies already hit (tracked in hitEnemies Set) are skipped.
     * 5. If no valid enemy is found within range, the chain ends early.
     * 6. A 'lightning' effect is emitted for each enemy hit, with a 'from' position
     *    for the visual arc between jumps.
     *
     * @param {Enemy[]} enemies - All active enemies on the map
     * @returns {Array} Array of 'lightning' effect objects
     */
    _doChainLightning(enemies) {
        this.alive = false;
        const effects = [];
        let currentSource = this.targetEnemy;
        let remainingDamage = this.damage;
        const maxChains = this.chainCount;
        const chainRange = 100;

        // Primary target hit
        if (currentSource && currentSource.alive) {
            const result = currentSource.takeDamage(remainingDamage, 0);
            const damageDealt = result.damage;
            if (damageDealt > 0) {
                this._markKiller(currentSource);
                effects.push({ type: 'lightning', enemy: currentSource, damage: damageDealt, pos: { x: currentSource.x, y: currentSource.y } });
            }
        }

        // Chain to additional enemies
        for (let chainIndex = 0; chainIndex < maxChains - 1; chainIndex++) {
            let closestEnemy = null;
            let closestDistance = chainRange;
            for (const enemy of enemies) {
                if (!enemy.alive || this.hitEnemies.has(enemy)) continue;
                const dx = enemy.x - currentSource.x;
                const dy = enemy.y - currentSource.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }

            if (!closestEnemy) break;

            this.hitEnemies.add(closestEnemy);
            // 75% damage decay per chain hop
            remainingDamage = Math.floor(remainingDamage * 0.75);

            const result = closestEnemy.takeDamage(remainingDamage, 0);
            const damageDealt = result.damage;
            if (damageDealt > 0) {
                this._markKiller(closestEnemy);
                effects.push({
                    type: 'lightning',
                    enemy: closestEnemy,
                    damage: damageDealt,
                    pos: { x: closestEnemy.x, y: closestEnemy.y },
                    from: { x: currentSource.x, y: currentSource.y }
                });
            }
            currentSource = closestEnemy;
        }

        return effects;
    }

    /**
     * Execute plasma beam — single-target massive damage hit.
     * Plasma ignores all armor (full pierce = 1.0).
     * Renders as a purple beam visual between tower and target.
     * @param {Enemy[]} enemies - All active enemies (unused, target is pre-selected)
     * @returns {Array} Array with a single 'plasmaBeam' effect object
     */
    _doPlasmaBeam(enemies) {
        this.alive = false;
        const effects = [];
        if (this.targetEnemy && this.targetEnemy.alive) {
            // Full pierce: ignores armor entirely
            const result = this.targetEnemy.takeDamage(this.damage, 1.0);
            const damageDealt = result.damage;
            if (damageDealt > 0) {
                this._markKiller(this.targetEnemy);
                effects.push({
                    type: 'plasmaBeam',
                    enemy: this.targetEnemy,
                    damage: damageDealt,
                    pos: { x: this.targetEnemy.x, y: this.targetEnemy.y },
                    from: { x: this.x, y: this.y }
                });
            }
        }
        return effects;
    }

    /**
     * Execute nuke impact — global damage to ALL enemies on the map.
     *
     * Behavior:
     * - Every alive enemy on the map takes full damage with armor ignore (pierce = 1.0).
     * - Each enemy also receives radiation DoT (if this.radiationDPS > 0).
     * - A 'nukeHit' effect is emitted per enemy.
     * - Global visual effects ('nukeFlash', 'nukeShockwave') are emitted once.
     *
     * @param {Enemy[]} enemies - All active enemies on the map
     * @returns {Array} Array of nuke effect objects
     */
    _doNukeImpact(enemies) {
        this.alive = false;
        const effects = [];

        // Apply damage to every enemy on the map
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const result = enemy.takeDamage(this.damage, 1.0); // Nuke ignores armor
            const damageDealt = result.damage;
            if (damageDealt > 0) {
                this._markKiller(enemy);
                effects.push({ type: 'nukeHit', enemy, damage: damageDealt, pos: { x: enemy.x, y: enemy.y } });
            }
            // Apply radiation damage-over-time to all enemies (even if nuke didn't kill)
            if (this.radiationDPS > 0) {
                enemy.applyRadiation(this.radiationDPS, this.radiationDur);
            }
        }

        // Global visual effects
        effects.push({ type: 'nukeFlash' });
        effects.push({ type: 'nukeShockwave', pos: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 } });

        return effects;
    }

    /**
     * Render the projectile on the canvas.
     *
     * For moving projectiles, draws:
     * 1. Trail particles with gradient falloff (brighter/larger near projectile,
     *    dimmer/smaller at tail)
     * 2. Projectile body per type:
     *    - archer: Triangular arrowhead shape, rotated in flight direction,
     *      with dark stroke
     *    - cannon: Circular cannonball (radius 5) with orange glow overlay
     *    - mortar: Circular shell (radius 6) with stronger orange glow overlay
     *    - frost: Triangular ice shard rotated in flight direction, with
     *      trailing frost particles
     *
     * Nuke, tesla, and plasma are instant and render no projectile sprite
     * (their visual effects are handled by the effect system in main.js).
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.alive) return;

        // 1. Trail with gradient falloff
        for (let trailIndex = 0; trailIndex < this.trail.length; trailIndex++) {
            const trailPoint = this.trail[trailIndex];
            const lifeRatio = Math.max(0, trailPoint.life / 0.2);
            const alpha = lifeRatio * 0.45;
            const size = 1.2 + lifeRatio * 2.5;
            const grad = ctx.createRadialGradient(trailPoint.x, trailPoint.y, 0, trailPoint.x, trailPoint.y, size);
            grad.addColorStop(0, `rgba(255,255,220,${alpha})`);
            grad.addColorStop(0.5, `rgba(255,255,180,${alpha * 0.6})`);
            grad.addColorStop(1, `rgba(255,200,100,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(trailPoint.x, trailPoint.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Projectile body per type
        if (this.typeKey === 'archer') {
            // Arrowhead shape
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -2.5);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-6, 2.5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        } else if (this.typeKey === 'cannon' || this.typeKey === 'mortar') {
            // Cannonball / mortar shell (circular)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.typeKey === 'mortar' ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Inner glow
            ctx.fillStyle = this.typeKey === 'mortar' ? 'rgba(255,100,0,0.7)' : 'rgba(255,150,0,0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.typeKey === 'mortar' ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.typeKey === 'frost') {
            // Ice shard (triangular)
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(-4, -3);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-4, 3);
            ctx.closePath();
            ctx.fill();
            // Frost particles trailing
            ctx.fillStyle = 'rgba(200,230,255,0.6)';
            ctx.beginPath();
            ctx.arc(-2, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Nuke, tesla, and plasma have no visible projectile — their visual
        // effects (nukeFlash, nukeShockwave, lightning, plasmaBeam) are
        // created as effect objects and rendered by main.js
    }
}
