// ============================================================
// Projectile — Projectile movement, collision, special effects
// ============================================================

class Projectile {
    constructor(fireData, enemies) {
        this.x = fireData.tower.x;
        this.y = fireData.tower.y;
        this.typeKey = fireData.typeKey;
        this.damage = fireData.damage;
        this.splashRadius = fireData.splashRadius;
        this.slowAmount = fireData.slowAmount;
        this.slowDuration = fireData.slowDuration;
        this.color = fireData.projColor;
        this.speed = fireData.projSpeed;
        this.armorPierce = fireData.armorPierce;
        this.chainCount = fireData.chainCount;
        this.radiationDPS = fireData.radiationDPS;
        this.radiationDur = fireData.radiationDur;
        this.stunDuration = fireData.stunDuration || 0;
        this.tower = fireData.tower;

        // Target data
        this.targetEnemy = fireData.target;
        this.targetX = fireData.target.x;
        this.targetY = fireData.target.y;
        this.alive = true;

        // For non-instant projectiles
        this.angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        this.trail = [];

        // Chain lightning already-hit set
        this.hitEnemies = new Set();
        this.hitEnemies.add(fireData.target);

        // Nuke: instant, handled separately
        this.hasHit = false;

        // Lifespan
        this.maxLifetime = 5; // seconds before auto-destruct
        this.lifetime = 0;
    }

    update(dt, enemies, gameSpeed) {
        if (!this.alive) return null;

        const effectiveDt = dt * gameSpeed;
        this.lifetime += effectiveDt;

        if (this.lifetime > this.maxLifetime) {
            this.alive = false;
            return null;
        }

        // Nuke is instant — skip projectile movement
        if (this.typeKey === 'nuke') {
            if (!this.hasHit) {
                this.hasHit = true;
                return this._doNukeImpact(enemies);
            }
            this.alive = false;
            return null;
        }

        // Tesla lightning is instant chain
        if (this.typeKey === 'tesla') {
            if (!this.hasHit) {
                this.hasHit = true;
                return this._doChainLightning(enemies);
            }
            this.alive = false;
            return null;
        }

        // Plasma is instant beam — single-target massive hit
        if (this.typeKey === 'plasma') {
            if (!this.hasHit) {
                this.hasHit = true;
                return this._doPlasmaBeam(enemies);
            }
            this.alive = false;
            return null;
        }

        // Move projectile toward target's last known position
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5 || (this.targetEnemy && !this.targetEnemy.alive)) {
            // Hit or target died — apply damage
            return this._doImpact(enemies);
        }

        const moveAmount = this.speed * effectiveDt;
        const ratio = Math.min(moveAmount / dist, 1);
        this.x += dx * ratio;
        this.y += dy * ratio;

        // Trail (gradient-style: larger fresher particles at front, smaller older at back)
        this.trail.push({ x: this.x, y: this.y, life: 0.2 });
        if (this.trail.length > 10) this.trail.shift();
        for (const t of this.trail) t.life -= effectiveDt;

        // Check if we're close enough to hit
        const newDist = Math.sqrt(
            (this.targetX - this.x) ** 2 + (this.targetY - this.y) ** 2
        );
        if (newDist < 8) {
            return this._doImpact(enemies);
        }

        return null;
    }

    _markKiller(enemy) {
        // Track which tower type last damaged this enemy (for post-game stats)
        if (this.tower && this.tower.typeKey) {
            enemy._killedByTowerType = this.tower.typeKey;
        }
    }

    _doImpact(enemies) {
        this.alive = false;
        const effects = [];

        // Splash damage (cannon, upgraded frost, mortar)
        if (this.splashRadius > 0) {
            const hitEnemies = [];
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= this.splashRadius) {
                    const falloff = 1 - (dist / this.splashRadius) * 0.5; // 50% at edge
                    const dmg = Math.floor(this.damage * falloff);
                    const result = enemy.takeDamage(dmg, this.armorPierce);
                    const actualDmg = result.damage;
                    if (actualDmg > 0) this._markKiller(enemy);
                    hitEnemies.push(enemy);
                    if (this.slowAmount > 0) {
                        enemy.applySlow(this.slowAmount, this.slowDuration);
                    }
                    if (this.stunDuration > 0) {
                        enemy.applyStun(this.stunDuration);
                    }
                    if (result.shieldBroke) {
                        effects.push({ type: 'shieldBreak', enemy, pos: { x: enemy.x, y: enemy.y } });
                    }
                    if (actualDmg > 0) {
                        effects.push({ type: 'hit', enemy, damage: actualDmg, pos: { x: enemy.x, y: enemy.y } });
                    }
                }
            }
            effects.push({ type: 'explosion', pos: { x: this.x, y: this.y }, radius: this.splashRadius });
        } else {
            // Single target hit
            if (this.targetEnemy && this.targetEnemy.alive) {
                const result = this.targetEnemy.takeDamage(this.damage, this.armorPierce);
                const actualDmg = result.damage;
                if (actualDmg > 0) this._markKiller(this.targetEnemy);
                if (this.slowAmount > 0) {
                    this.targetEnemy.applySlow(this.slowAmount, this.slowDuration);
                }
                if (this.stunDuration > 0) {
                    this.targetEnemy.applyStun(this.stunDuration);
                }
                if (result.shieldBroke) {
                    effects.push({ type: 'shieldBreak', enemy: this.targetEnemy, pos: { x: this.targetEnemy.x, y: this.targetEnemy.y } });
                }
                if (actualDmg > 0) {
                    effects.push({ type: 'hit', enemy: this.targetEnemy, damage: actualDmg, pos: { x: this.targetEnemy.x, y: this.targetEnemy.y } });
                }
            }
            effects.push({ type: 'spark', pos: { x: this.x, y: this.y } });
        }

        return effects;
    }

    _doChainLightning(enemies) {
        this.alive = false;
        const effects = [];
        let currentSource = this.targetEnemy;
        let damage = this.damage;
        const maxChains = this.chainCount;
        const chainRange = 100;

        // First hit
        if (currentSource && currentSource.alive) {
            const result = currentSource.takeDamage(damage, 0);
            const dmg = result.damage;
            if (dmg > 0) {
                this._markKiller(currentSource);
                effects.push({ type: 'lightning', enemy: currentSource, damage: dmg, pos: { x: currentSource.x, y: currentSource.y } });
            }
        }

        // Chain to nearby enemies
        for (let i = 0; i < maxChains - 1; i++) {
            let closestEnemy = null;
            let closestDist = chainRange;
            for (const enemy of enemies) {
                if (!enemy.alive || this.hitEnemies.has(enemy)) continue;
                const dx = enemy.x - currentSource.x;
                const dy = enemy.y - currentSource.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }

            if (!closestEnemy) break;

            this.hitEnemies.add(closestEnemy);
            damage = Math.floor(damage * 0.75); // Each chain does 75% of previous

            const result = closestEnemy.takeDamage(damage, 0);
            const dmg = result.damage;
            if (dmg > 0) {
                this._markKiller(closestEnemy);
                effects.push({
                    type: 'lightning',
                    enemy: closestEnemy,
                    damage: dmg,
                    pos: { x: closestEnemy.x, y: closestEnemy.y },
                    from: { x: currentSource.x, y: currentSource.y }
                });
            }
            currentSource = closestEnemy;
        }

        return effects;
    }

    _doPlasmaBeam(enemies) {
        this.alive = false;
        const effects = [];
        // Single-target massive hit with purple beam visual
        if (this.targetEnemy && this.targetEnemy.alive) {
            const result = this.targetEnemy.takeDamage(this.damage, 1.0); // plasma ignores armor
            const dmg = result.damage;
            if (dmg > 0) {
                this._markKiller(this.targetEnemy);
                effects.push({ type: 'plasmaBeam', enemy: this.targetEnemy, damage: dmg, pos: { x: this.targetEnemy.x, y: this.targetEnemy.y }, from: { x: this.x, y: this.y } });
            }
        }
        return effects;
    }

    _doNukeImpact(enemies) {
        this.alive = false;
        const effects = [];

        // Global damage to ALL enemies
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const result = enemy.takeDamage(this.damage, 1.0); // Nuke ignores armor
            const dmg = result.damage;
            if (dmg > 0) {
                this._markKiller(enemy);
                effects.push({ type: 'nukeHit', enemy, damage: dmg, pos: { x: enemy.x, y: enemy.y } });
            }
            // Apply radiation DoT
            if (this.radiationDPS > 0) {
                enemy.applyRadiation(this.radiationDPS, this.radiationDur);
            }
        }

        // Visual effects
        effects.push({ type: 'nukeFlash' });
        effects.push({ type: 'nukeShockwave', pos: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 } });

        return effects;
    }

    render(ctx) {
        if (!this.alive) return;

        // Trail with gradient falloff (larger+brighter near projectile, smaller+dimmer at tail)
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const lifeRatio = Math.max(0, t.life / 0.2);
            const alpha = lifeRatio * 0.45;
            const size = 1.2 + lifeRatio * 2.5;
            const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, size);
            grad.addColorStop(0, `rgba(255,255,220,${alpha})`);
            grad.addColorStop(0.5, `rgba(255,255,180,${alpha * 0.6})`);
            grad.addColorStop(1, `rgba(255,200,100,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.typeKey === 'archer') {
            // Arrow shape
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
            // Cannonball / mortar shell
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.typeKey === 'mortar' ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Glow trail
            ctx.fillStyle = this.typeKey === 'mortar' ? 'rgba(255,100,0,0.7)' : 'rgba(255,150,0,0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.typeKey === 'mortar' ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.typeKey === 'frost') {
            // Ice shard
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

        // Nuke and tesla are instant, no projectile to render
    }
}
