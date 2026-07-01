// ============================================================
// Enemy — Enemy class, movement, status effects, rendering
//
// This file defines the Enemy class used by the Tower Defense game.
// Each enemy is created from an ENEMY_DEFS template with wave-based
// difficulty scaling applied. Enemies follow waypoints along the map
// path, can have various status effects applied by towers, and are
// rendered with distinct visuals per type.
// ============================================================

class Enemy {
    /**
     * Construct an enemy with difficulty-scaled stats.
     *
     * Difficulty scaling pipeline (applied in order):
     * 1. Base stats from ENEMY_DEFS[typeKey]
     * 2. Wave-proportional HP/speed multipliers (DIFFICULTY_HP_SCALE, DIFFICULTY_SPEED_SCALE)
     * 3. Global difficulty multipliers from getActiveDifficulty()
     * 4. Elite detection: wave >= 10 && wave % eliteInterval === 0
     *    - Elites multiply HP by eliteHpMult (1.4) and speed by eliteSpeedMult (1.2)
     * 5. Boss detection: typeKey === 'boss', extra 35% HP per 10 waves
     * 6. Wave >= 11 global bonus: +10% HP
     *
     * Special enemy abilities (set from ENEMY_DEFS properties):
     * - flyer: immune to slow effects, hovers higher with different shadow
     * - regen: HP regeneration per second
     * - dodgeChance: chance to dodge incoming damage (used by runner)
     * - healRadius/healAmount/healInterval: healer periodically heals nearby enemies
     * - splitCount/splitChildType: spawns minions when killed (splitter)
     * - shieldHits/shieldDmgReduction: absorbs damage until shield depletes (shielded)
     * - phaseInterval/phaseDuration: periodic phased immunity windows (phantom)
     *
     * @param {string} typeKey - Key into ENEMY_DEFS (e.g. 'grunt', 'boss', 'phantom')
     * @param {number} waveNum - Current wave number (1-based) for difficulty scaling
     */
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

        // --- Difficulty scaling ---
        const difficulty = (typeof getActiveDifficulty === 'function') ? getActiveDifficulty()
            : { eliteInterval: 5, eliteHpMult: 1.4, eliteSpeedMult: 1.2, hpMult: 1, speedMult: 1 };
        const isElite = (waveNum >= 10 && waveNum % difficulty.eliteInterval === 0);
        const isBossWave = (waveNum % BOSS_WAVE_INTERVAL === 0);
        this._isElite = isElite;

        let hpMult = 1 + (waveNum - 1) * DIFFICULTY_HP_SCALE;
        let speedMult = 1 + (waveNum - 1) * DIFFICULTY_SPEED_SCALE;
        hpMult *= difficulty.hpMult;
        speedMult *= difficulty.speedMult;
        if (isElite) {
            hpMult *= difficulty.eliteHpMult;
            speedMult *= difficulty.eliteSpeedMult;
        }
        // Boss extra HP: +35% per 10 waves
        if (typeKey === 'boss') {
            hpMult *= 1 + Math.floor(waveNum / 10) * 0.35;
        }
        // Wave 11+ global HP bonus
        if (waveNum >= 11) {
            hpMult *= 1.10;
        }

        this.maxHp = Math.floor(def.hp * hpMult);
        this.hp = this.maxHp;
        this.baseSpeed = def.speed * speedMult;
        this.speed = this.baseSpeed;
        this.baseArmor = def.armor;
        this.armor = this.baseArmor;

        // --- Movement state — guard against uninitialized waypoints ---
        if (!WAYPOINTS || WAYPOINTS.length === 0) {
            throw new Error('Enemy created before waypoints are initialized — map not loaded');
        }
        this.waypointIndex = 0;
        this.x = WAYPOINTS[0].x;
        this.y = WAYPOINTS[0].y;
        this.reachedBase = false;
        this.alive = true;
        // Flyers follow the same path as ground enemies but are immune to slow effects

        // --- Status effect state ---
        this.slowAmount = 0;       // 0 to 1, fraction of speed reduced
        this.slowDuration = 0;     // seconds remaining
        this.radiationDamage = 0;  // DPS applied each frame
        this.radiationDuration = 0;
        this.frozen = false;       // visual indicator for slow effect

        // Healer properties
        this.healRadius = def.healRadius || 0;
        this.healAmount = def.healAmount || 0;
        this.healInterval = def.healInterval || 0;
        this.healTimer = 0;

        // Splitter properties — minions spawn on death
        this.splitCount = def.splitCount || 0;
        this.splitChildType = def.splitChildType || null;

        // Shielded properties — absorbs a portion of each hit
        this.shieldHits = def.shieldHits || 0;
        this.shieldDmgReduction = def.shieldDmgReduction || 0;
        this.shieldActive = this.shieldHits > 0;

        // Phantom phase properties — periodic immunity
        this.phaseInterval = def.phaseInterval || 0;
        this.phaseDuration = def.phaseDuration || 0;
        this.phaseTimer = 0;
        this.phaseCooldown = 0;
        this.phased = false;

        // Stun (from Mortar tower)
        this.stunTimer = 0;

        // Visual animation state
        this.bobOffset = Math.random() * Math.PI * 2;
        this.hitFlash = 0;         // seconds remaining of white flash after taking damage
    }

    /**
     * Update the enemy's state each frame.
     *
     * Status effect pipeline (executed in order each frame):
     * 1. Slow — decay slow duration, recalculate effective speed
     * 2. Radiation — apply radiation DOT (calls takeDamage with full pierce)
     * 3. Regeneration — heal toward maxHp if enemy has regen stat
     * 4. Hit flash — decay the white flash visual timer
     * 5. Healer timer — accumulate time for main.js to trigger group heals
     * 6. Phantom phase — toggle phased immunity on a periodic interval
     * 7. Stun — decay stun timer; stunned enemies skip movement but still process effects
     * 8. Movement — advance along waypoints at current (possibly slowed) speed
     *
     * @param {number} dt - Raw delta time in seconds
     * @param {number} gameSpeed - Game speed multiplier (1 = normal, 2 = fast, etc.)
     */
    update(dt, gameSpeed) {
        if (!this.alive) return;

        const scaledDeltaTime = dt * gameSpeed;

        // --- Step 1: Slow effect ---
        if (this.slowDuration > 0) {
            this.slowDuration -= scaledDeltaTime;
            if (this.slowDuration <= 0) {
                this.slowAmount = 0;
                this.frozen = false;
            }
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.speed = this.baseSpeed;
        }

        // --- Step 2: Radiation damage over time ---
        if (this.radiationDuration > 0) {
            this.radiationDuration -= scaledDeltaTime;
            this.takeDamage(this.radiationDamage * scaledDeltaTime, 1.0);
        }

        // --- Step 3: Health regeneration ---
        if (this.regen > 0 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen * scaledDeltaTime);
        }

        // --- Step 4: Hit flash decay ---
        if (this.hitFlash > 0) {
            this.hitFlash -= scaledDeltaTime;
        }

        // --- Step 5: Healer timer (consumed by main.js healing session) ---
        if (this.healAmount > 0 && this.healInterval > 0) {
            this.healTimer += scaledDeltaTime;
        }

        // --- Step 6: Phantom phase toggle ---
        if (this.phaseInterval > 0 && !this.phased) {
            this.phaseTimer += scaledDeltaTime;
            if (this.phaseTimer >= this.phaseInterval) {
                this.phaseTimer = 0;
                this.phased = true;
                this.phaseCooldown = this.phaseDuration;
            }
        }
        if (this.phased) {
            this.phaseCooldown -= scaledDeltaTime;
            if (this.phaseCooldown <= 0) {
                this.phased = false;
            }
        }

        // --- Step 7: Stun ---
        if (this.stunTimer > 0) {
            this.stunTimer -= scaledDeltaTime;
        }

        // Stunned enemies cannot move, but body animation continues
        if (this.stunTimer > 0) {
            this.bobOffset += scaledDeltaTime * 4;
            // Also continue decaying hit flash while stunned
            this.hitFlash -= scaledDeltaTime;
            if (this.hitFlash < 0) this.hitFlash = 0;
            return;
        }

        // --- Step 8: Movement along waypoint path ---
        if (this.waypointIndex >= WAYPOINTS.length) {
            this.reachedBase = true;
            this.alive = false;
            return;
        }

        const targetWaypoint = WAYPOINTS[this.waypointIndex];
        const dx = targetWaypoint.x - this.x;
        const dy = targetWaypoint.y - this.y;
        const distanceToWaypoint = Math.sqrt(dx * dx + dy * dy);

        if (distanceToWaypoint < 2) {
            // Reached waypoint, advance to next
            this.waypointIndex++;
            if (this.waypointIndex >= WAYPOINTS.length) {
                this.x = targetWaypoint.x;
                this.y = targetWaypoint.y;
            }
        } else {
            // Move toward the next waypoint at current (potentially slowed) speed
            const moveAmount = this.speed * scaledDeltaTime;
            const ratio = Math.min(moveAmount / distanceToWaypoint, 1);
            this.x += dx * ratio;
            this.y += dy * ratio;
        }

        this.bobOffset += scaledDeltaTime * 4;
    }

    /**
     * Apply damage to this enemy through the full defense pipeline.
     *
     * Damage pipeline (each step can early-return with zero damage):
     * 1. Phased immunity — if phased and armorPierce < 1.0, all damage negated.
     *    Only armorPierceAmount >= 1.0 (fullPierce) bypasses phase.
     * 2. Dodge — if ignoreDodge is false and dodgeChance > random, full dodge.
     * 3. Shield absorption — if shieldActive and not fullPierce:
     *    - shieldDmgReduction fraction of damage is absorbed and removed
     *    - shieldHits decremented; at 0 the shield breaks (shieldBroke = true)
     * 4. Armor reduction — proportional reduction:
     *    effectiveArmor = armor * (1 - min(armorPierce, 1))
     *    effectiveDamage = amount * (1 - effectiveArmor)
     *    Full pierce (>= 1.0) skips armor entirely.
     *
     * @param {number} amount - Raw damage to apply
     * @param {number} armorPierceAmount - Armor pierce fraction (0-1, >=1 = full pierce)
     * @param {boolean} ignoreDodge - If true, dodge chance is skipped entirely
     * @returns {{ damage: number, shieldBroke: boolean }} Result of damage application
     */
    takeDamage(amount, armorPierceAmount = 0, ignoreDodge = false) {
        if (!this.alive) return { damage: 0, shieldBroke: false };

        const fullPierce = armorPierceAmount >= 1.0;
        let shieldBroke = false;

        // Step 1: Phased immunity — only full pierce bypasses phase
        if (this.phased && !fullPierce) {
            return { damage: 0, shieldBroke: false };
        }

        // Step 2: Dodge chance (runners)
        if (!ignoreDodge && this.dodgeChance > 0) {
            if (Math.random() < this.dodgeChance) {
                return { damage: 0, shieldBroke: false };
            }
        }

        // Step 3: Shield absorption — only non-full-pierce damage triggers shield
        if (this.shieldActive && !fullPierce && amount > 0) {
            const absorbed = amount * this.shieldDmgReduction;
            amount -= absorbed;
            this.shieldHits--;
            if (this.shieldHits <= 0) {
                this.shieldActive = false;
                shieldBroke = true;
            }
        }

        // Step 4: Armor reduction (skipped for full pierce)
        let effectiveDamage = amount;
        if (!fullPierce && this.armor > 0) {
            const effectiveArmor = this.armor * (1 - Math.min(armorPierceAmount, 1));
            effectiveDamage = amount * (1 - effectiveArmor);
        }

        this.hp -= effectiveDamage;
        this.hitFlash = 0.1;

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }

        return { damage: effectiveDamage, shieldBroke: shieldBroke };
    }

    /**
     * Apply a stun effect. Duration stacks by taking the maximum of current and new.
     * Stun prevents the enemy from moving but does not block status effect processing.
     * @param {number} duration - Seconds to stun this enemy
     */
    applyStun(duration) {
        this.stunTimer = Math.max(this.stunTimer, duration);
    }

    /**
     * Apply a slow effect. Flyers are immune (returns immediately).
     * Only applies if the new slow amount is >= the current amount.
     * @param {number} amount - Slow factor (0 to 1, fraction of speed reduced)
     * @param {number} duration - Seconds the slow will last
     */
    applySlow(amount, duration) {
        if (this.flyer) return;
        if (amount >= this.slowAmount) {
            this.slowAmount = Math.max(this.slowAmount, amount);
            this.slowDuration = Math.max(this.slowDuration, duration);
            this.frozen = true;
        }
    }

    /**
     * Apply radiation damage-over-time. DPS overwrites the current value;
     * duration extends if the new duration is longer.
     * @param {number} dps - Damage per second from radiation
     * @param {number} duration - Seconds the radiation will last
     */
    applyRadiation(dps, duration) {
        this.radiationDamage = dps;
        this.radiationDuration = Math.max(this.radiationDuration, duration);
    }

    // ---- Shared rendering helpers ----

    /**
     * Draw an elliptical ground shadow beneath the enemy.
     * Flyers get a fainter, lower shadow to indicate they are airborne.
     * @param {CanvasRenderingContext2D} ctx
     */
    _drawShadow(ctx) {
        const alpha = this.flyer ? 0.08 : 0.18;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.beginPath();
        const shadowYOffset = this.flyer ? 16 : 2;
        ctx.ellipse(SHADOW_OFFSET_X, SHADOW_OFFSET_Y + shadowYOffset, this.size * 0.85, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Build a radial gradient for a 3D-look enemy body, with a highlight
     * offset to the top-left and shadow to the bottom-right.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx - Center X of the body
     * @param {number} cy - Center Y of the body
     * @param {number} r - Body radius
     * @param {string} topColor - Highlight color (top-left, inner)
     * @param {string} bottomColor - Shadow color (bottom-right, outer)
     * @returns {CanvasGradient}
     */
    _makeBodyGradient(ctx, cx, cy, r, topColor, bottomColor) {
        const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, bottomColor);
        return grad;
    }

    /**
     * Emit and render fading trail particles behind the moving enemy.
     * Particles are spawned while the enemy moves above a speed threshold,
     * then age, drift upward, and fade out in an alpha gradient.
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderTrailParticles(ctx) {
        if (this.speed > 15 && Math.random() < 0.35 && this.alive) {
            if (!this._trailParticles) this._trailParticles = [];
            this._trailParticles.push({ x: this.x, y: this.y, life: 0.5, maxLife: 0.5 });
        }
        if (!this._trailParticles) return;
        // Age particles and remove dead ones
        this._trailParticles = this._trailParticles.filter(particle => {
            particle.life -= 0.016;
            particle.y -= 0.5;
            return particle.life > 0;
        });
        // Draw remaining particles
        for (const particle of this._trailParticles) {
            const alpha = Math.max(0, particle.life / particle.maxLife) * 0.3;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, this.size * 0.12, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Render the enemy and all its visual indicators.
     *
     * Rendering order per frame:
     * 1. Trail particles (behind the enemy, not affected by bob/translate)
     * 2. Canvas save + translate to enemy position
     * 3. Ground shadow (via _drawShadow)
     * 4. Bob/hover vertical offset (flyers hover higher with a different wave)
     * 5. Hit flash override: if hitFlash > 0, body color becomes white
     * 6. Per-type body rendering (see below)
     * 7. Status effect overlays: frozen ring, radiation glow, elite badge
     * 8. Canvas restore
     * 9. HP bar (rendered above enemy, not affected by bob offset)
     *
     * Per-type visual designs:
     * - grunt: Brown radial-gradient circle with walking legs (alternating), layered eyes
     *   with white sclera, brown iris, black pupil, specular highlight
     * - runner: Orange radial-gradient diamond/arrow shape with motion afterimages
     *   (when speed > 40), side fins, elongated cat-slit eyes
     * - tank: Gray rectangular body with darker armor plates, rivet dots along top/bottom,
     *   tread marks on sides, yellow eyes with black pupils; body scales on footstep
     * - flyer: Purple radial-gradient circle with animated elliptical wings (with bone
     *   strokes), compound insect eyes with facet dots
     * - boss: Large red multi-layer body with pulsing radial aura, 8 triangular spikes,
     *   3 crown horns, glowing pulsing heart with shadow blur, menacing curved mouth
     *   with white teeth, glowing orange deep-set eyes with shadow blur
     * - healer: Green radial-gradient circle with pulsing green heal aura, white-outlined
     *   green cross (+), simple eyes, floating "+" particles when aura is strong
     * - splitter: Orange radial-gradient jagged 10-point star shape with internal orange
     *   glow, 4 crack lines emanating from center, light rim on top-left facets, eyes,
     *   3 orbiting fragment dots
     * - splitter_minion: Small orange radial-gradient circle with simple eyes
     * - shielded: Blue rectangular body with armor plates, rivets, proportional shield
     *   arc (dashed ring, angle based on remaining hits), hexagonal hex overlay,
     *   blue glowing eyes with shadow blur
     * - phantom: Purple layered concentric circles (3 wispy outer layers), main body,
     *   dark core center, 5 wispy quadratic tendrils, glowing eyes; when phased,
     *   globalAlpha drops to 0.35 and eyes get wider shadow blur
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.alive) return;

        // Step 1: Trail particles (behind enemy, not affected by bob/translate)
        this._renderTrailParticles(ctx);

        // Step 2: Translate origin to enemy position
        ctx.save();
        ctx.translate(this.x, this.y);

        // Step 3: Directional ground shadow
        this._drawShadow(ctx);

        // Step 4: Bob/hover animation
        if (!this.flyer) {
            const bob = Math.sin(this.bobOffset) * 2;
            ctx.translate(0, bob);
        } else {
            const hover = Math.sin(this.bobOffset * 1.5) * 4;
            ctx.translate(0, hover - 6);
        }

        // Step 5: Hit flash
        let bodyColor = this.color;
        if (this.hitFlash > 0) {
            bodyColor = '#ffffff';
        }

        const bodyRadius = this.size;

        // ===== Step 6: PER-TYPE BODY RENDERING =====

        if (this.typeKey === 'grunt') {
            // Gradient circle body with walking legs and detailed eyes
            const grad = this._makeBodyGradient(ctx, 0, 0, bodyRadius, '#A1887F', '#5D4037');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath();
            ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Walking legs — two ellipses that alternate with bob phase
            const legPhase = Math.sin(this.bobOffset * 3);
            ctx.fillStyle = '#4E342E';
            ctx.beginPath();
            ctx.ellipse(-4 + legPhase * 2, bodyRadius * 0.7, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(4 - legPhase * 2, bodyRadius * 0.7, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes with three-layer iris
            for (const eyeXOffset of [-4, 4]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(eyeXOffset, -3, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#6D4C41';
                ctx.beginPath(); ctx.arc(eyeXOffset, -3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(eyeXOffset, -3, 1.2, 0, Math.PI * 2); ctx.fill();
                // Specular highlight dot
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(eyeXOffset - 0.8, -4, 0.6, 0, Math.PI * 2); ctx.fill();
            }

        } else if (this.typeKey === 'runner') {
            // Warm gradient diamond shape with motion afterimages and side fins
            if (this.speed > 40) {
                // Motion blur: 2 afterimages trailing behind
                for (let afterimageIndex = 1; afterimageIndex <= 2; afterimageIndex++) {
                    ctx.globalAlpha = 0.12 * (3 - afterimageIndex);
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(bodyRadius, 0);
                    ctx.lineTo(-bodyRadius * 0.6, -bodyRadius * 0.7);
                    ctx.lineTo(-bodyRadius * 0.3, 0);
                    ctx.lineTo(-bodyRadius * 0.6, bodyRadius * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.translate(-afterimageIndex * 4, 0);
                }
                ctx.globalAlpha = 1;
            }
            // Main body
            const grad = this._makeBodyGradient(ctx, 0, 0, bodyRadius, '#FFE0B2', '#E65100');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath();
            ctx.moveTo(bodyRadius, 0);
            ctx.lineTo(-bodyRadius * 0.6, -bodyRadius * 0.7);
            ctx.lineTo(-bodyRadius * 0.3, 0);
            ctx.lineTo(-bodyRadius * 0.6, bodyRadius * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Side fins
            ctx.fillStyle = '#FF9800';
            ctx.beginPath(); ctx.moveTo(-2, -bodyRadius * 0.4); ctx.lineTo(-bodyRadius * 0.5, -bodyRadius * 0.8); ctx.lineTo(-4, -bodyRadius * 0.3); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-2, bodyRadius * 0.4); ctx.lineTo(-bodyRadius * 0.5, bodyRadius * 0.8); ctx.lineTo(-4, bodyRadius * 0.3); ctx.closePath(); ctx.fill();
            // Elongated cat-slit eye
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(3, -2, 2.8, 1.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.ellipse(3.5, -2, 1.2, 2, 0, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'tank') {
            // Metal rectangle with treads, rivets, and footstep scaling
            const tankRadius = bodyRadius * 1.2;
            const stepScale = 1 + Math.abs(Math.sin(this.bobOffset * 2)) * 0.08;
            ctx.scale(stepScale, 1 / stepScale);
            // Metal gradient body
            const grad = this._makeBodyGradient(ctx, 0, 0, tankRadius * 1.5, '#90A4AE', '#37474F');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.fillRect(-tankRadius, -tankRadius * 0.8, tankRadius * 2, tankRadius * 1.6);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-tankRadius, -tankRadius * 0.8, tankRadius * 2, tankRadius * 1.6);
            // Overlapping armor plate strips
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(-tankRadius + 3, -tankRadius * 0.8 + 3, tankRadius * 2 - 6, 4);
            ctx.fillRect(-tankRadius + 3, tankRadius * 0.8 - 7, tankRadius * 2 - 6, 4);
            // Rivet dots along armor plates
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            for (let rivetX = -tankRadius + 6; rivetX < tankRadius - 3; rivetX += 7) {
                ctx.beginPath(); ctx.arc(rivetX, -tankRadius * 0.8 + 5, 1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(rivetX, tankRadius * 0.8 - 5, 1, 0, Math.PI * 2); ctx.fill();
            }
            // Tread marks on sides
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            for (let treadY = -tankRadius * 0.6; treadY < tankRadius * 0.6; treadY += 5) {
                ctx.beginPath(); ctx.moveTo(-tankRadius - 1, treadY); ctx.lineTo(-tankRadius + 3, treadY + 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tankRadius + 1, treadY); ctx.lineTo(tankRadius - 3, treadY + 1); ctx.stroke();
            }
            // Yellow eyes with black pupils
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath(); ctx.arc(-5, -4, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -4, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(-5, -4, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -4, 1.5, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'flyer') {
            // Gradient circle body with animated wings and compound eyes
            const grad = this._makeBodyGradient(ctx, 0, 0, bodyRadius, '#CE93D8', '#4A148C');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius * 0.6, 0, Math.PI * 2); ctx.fill();
            // Wings with bone structure — animated by bob phase
            const wingPhase = Math.sin(this.bobOffset * 2) * 0.3;
            for (const wingSide of [-1, 1]) {
                ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
                ctx.beginPath();
                ctx.ellipse(wingSide * 7, -2, 8, 5 + wingPhase * 3 * wingSide, wingSide * -0.3, 0, Math.PI * 2);
                ctx.fill();
                // Wing bone lines
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 0.6;
                for (let boneIndex = 0; boneIndex < 3; boneIndex++) {
                    ctx.beginPath();
                    ctx.moveTo(wingSide * 3, -2);
                    ctx.lineTo(wingSide * (8 + boneIndex * 3), -4 + boneIndex * 2 - wingPhase * 4 * wingSide);
                    ctx.stroke();
                }
            }
            // Compound insect eyes with facet dots
            for (const eyeXOffset of [-2, 2]) {
                ctx.fillStyle = '#BBDEFB';
                ctx.beginPath(); ctx.arc(eyeXOffset, -2, 2.8, 0, Math.PI * 2); ctx.fill();
                for (let facetIndex = 0; facetIndex < 4; facetIndex++) {
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.beginPath();
                    ctx.arc(eyeXOffset + (facetIndex - 1.5) * 1.3, -2 + (facetIndex % 2 - 0.5) * 1.5, 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

        } else if (this.typeKey === 'boss') {
            // Multi-layer design: aura, body, spikes, crown, heart, mouth, eyes
            const bossRadius = bodyRadius * 1.1;
            // Pulsing red aura
            const auraAlpha = 0.15 + Math.sin(this.bobOffset * 2) * 0.08;
            const auraGrad = ctx.createRadialGradient(0, -4, bossRadius * 0.6, 0, -4, bossRadius * 1.8);
            auraGrad.addColorStop(0, `rgba(211,47,47,${auraAlpha + 0.1})`);
            auraGrad.addColorStop(1, 'rgba(211,47,47,0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath(); ctx.arc(0, -4, bossRadius * 1.8, 0, Math.PI * 2); ctx.fill();

            // Main body with deep red gradient
            const bodyGrad = ctx.createRadialGradient(-bossRadius * 0.3, -4 - bossRadius * 0.3, bossRadius * 0.1, 0, -4, bossRadius);
            bodyGrad.addColorStop(0, '#EF5350');
            bodyGrad.addColorStop(0.5, '#D32F2F');
            bodyGrad.addColorStop(1, '#7F0000');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : bodyGrad;
            ctx.beginPath(); ctx.arc(0, -4, bossRadius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Dark underside shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(0, 2, bossRadius * 0.8, 0, Math.PI); ctx.fill();

            // 8 triangular spikes around the body
            ctx.fillStyle = '#B71C1C';
            for (let spikeIndex = 0; spikeIndex < 8; spikeIndex++) {
                const angle = (spikeIndex / 8) * Math.PI * 2 + this.bobOffset * 0.15;
                const spikeX = Math.cos(angle) * bossRadius, spikeY = Math.sin(angle) * bossRadius - 4;
                ctx.beginPath();
                ctx.moveTo(spikeX, spikeY);
                ctx.lineTo(spikeX - 4, spikeY + 8);
                ctx.lineTo(spikeX + 4, spikeY + 8);
                ctx.closePath();
                ctx.fill();
            }
            // 3 crown horns on top
            ctx.fillStyle = '#8B0000';
            for (let hornIndex = 0; hornIndex < 3; hornIndex++) {
                const crownX = (hornIndex - 1) * 10;
                ctx.beginPath();
                ctx.moveTo(crownX, -bossRadius - 5);
                ctx.lineTo(crownX - 3, -bossRadius - 12);
                ctx.lineTo(crownX + 3, -bossRadius - 12);
                ctx.closePath();
                ctx.fill();
            }

            // Glowing heart (central orb pulsing with shadow blur)
            const heartAlpha = 0.5 + Math.sin(this.bobOffset * 1.7) * 0.3;
            ctx.fillStyle = `rgba(255,60,60,${heartAlpha})`;
            ctx.shadowColor = '#FF1744';
            ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(0, -2, bossRadius * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Menacing curved mouth
            ctx.strokeStyle = '#3E0000';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 4, bossRadius * 0.35, 0.2, Math.PI - 0.2); ctx.stroke();
            // Small teeth dots
            ctx.fillStyle = '#fff';
            for (let toothIndex = 0; toothIndex < 3; toothIndex++) {
                ctx.beginPath();
                ctx.arc(-3 + toothIndex * 3, 2, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Glowing deep-set eyes with orange shadow
            ctx.fillStyle = '#3E0000';
            ctx.beginPath(); ctx.arc(-5, -9, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -9, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FF6D00';
            ctx.shadowColor = '#FF6D00';
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(-5, -9, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -9, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

        } else if (this.typeKey === 'healer') {
            // Green body with pulsing heal aura, cross symbol, floating "+" particles
            const auraPhase = Math.sin(this.bobOffset * 2.5) * 0.5 + 0.5;
            // Pulsing green heal aura
            const auraGrad = ctx.createRadialGradient(0, -2, bodyRadius * 0.5, 0, -2, bodyRadius + 6);
            auraGrad.addColorStop(0, `rgba(129,199,132,${0.15 + auraPhase * 0.15})`);
            auraGrad.addColorStop(1, 'rgba(129,199,132,0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath(); ctx.arc(0, -2, bodyRadius + 6, 0, Math.PI * 2); ctx.fill();

            // Body gradient
            const grad = this._makeBodyGradient(ctx, 0, -2, bodyRadius, '#81C784', '#2E7D32');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath(); ctx.arc(0, -2, bodyRadius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // White-outlined green cross
            ctx.fillStyle = '#fff';
            const crossHalfWidth = bodyRadius * 0.25, crossHalfLength = bodyRadius * 0.55;
            ctx.fillRect(-crossHalfWidth - 1, -crossHalfLength - 3, crossHalfWidth * 2 + 2, crossHalfLength * 2 + 2);
            ctx.fillRect(-crossHalfLength - 1, -crossHalfWidth - 3, crossHalfLength * 2 + 2, crossHalfWidth * 2 + 2);
            ctx.fillStyle = '#A5D6A7';
            ctx.fillRect(-crossHalfWidth, -crossHalfLength - 2, crossHalfWidth * 2, crossHalfLength * 2);
            ctx.fillRect(-crossHalfLength, -crossHalfWidth - 2, crossHalfLength * 2, crossHalfWidth * 2);

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(-3, -5, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -5, 1.2, 0, Math.PI * 2); ctx.fill();

            // Floating "+" particles when aura is strong
            if (auraPhase > 0.3) {
                for (let particleIndex = 0; particleIndex < 2; particleIndex++) {
                    const plusX = (particleIndex - 0.5) * 12, plusY = -bodyRadius - 5 - auraPhase * 10;
                    ctx.fillStyle = `rgba(165,214,167,${auraPhase * 0.5})`;
                    ctx.font = '8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('+', plusX, plusY);
                }
            }

        } else if (this.typeKey === 'splitter') {
            // Orange jagged star shape with internal glow, cracks, orbiting fragments
            // Internal orange glow
            const glowGrad = ctx.createRadialGradient(0, 0, bodyRadius * 0.2, 0, 0, bodyRadius);
            glowGrad.addColorStop(0, 'rgba(255,200,150,0.35)');
            glowGrad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2); ctx.fill();

            // Jagged body: 10-point alternating-radius star
            const grad = this._makeBodyGradient(ctx, 0, 0, bodyRadius, '#FF8A65', '#BF360C');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath();
            const jaggedPointCount = 10;
            for (let pointIndex = 0; pointIndex < jaggedPointCount; pointIndex++) {
                const angle = (pointIndex / jaggedPointCount) * Math.PI * 2 - Math.PI / 2;
                const pointRadius = bodyRadius * (pointIndex % 2 === 0 ? 1.0 : 0.55);
                const pointX = Math.cos(angle) * pointRadius;
                const pointY = Math.sin(angle) * pointRadius;
                if (pointIndex === 0) ctx.moveTo(pointX, pointY);
                else ctx.lineTo(pointX, pointY);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#BF360C';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Light rim on top-left facets
            ctx.strokeStyle = 'rgba(255,200,100,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(-2, -3, bodyRadius * 0.7, -Math.PI * 0.7, -Math.PI * 0.05);
            ctx.stroke();

            // 4 crack lines radiating from center
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 0.8;
            for (let crackIndex = 0; crackIndex < 4; crackIndex++) {
                const crackAngle = (crackIndex / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(crackAngle) * 2, Math.sin(crackAngle) * 2);
                ctx.lineTo(Math.cos(crackAngle) * bodyRadius * 0.7, Math.sin(crackAngle) * bodyRadius * 0.7);
                ctx.stroke();
            }

            // Eyes
            ctx.fillStyle = '#FFE0B2';
            ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -2, 2, 0, Math.PI * 2); ctx.fill();

            // 3 orbiting fragment dots
            for (let orbitIndex = 0; orbitIndex < 3; orbitIndex++) {
                const orbitAngle = this.bobOffset * 1.3 + (orbitIndex / 3) * Math.PI * 2;
                ctx.fillStyle = 'rgba(255,138,101,0.6)';
                ctx.beginPath();
                ctx.arc(Math.cos(orbitAngle) * (bodyRadius + 4), Math.sin(orbitAngle) * (bodyRadius + 4), 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (this.typeKey === 'splitter_minion') {
            // Small orange fragment circle with simple eyes
            const grad = this._makeBodyGradient(ctx, 0, 1, bodyRadius, '#FFAB91', '#D84315');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath(); ctx.arc(0, 1, bodyRadius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1; ctx.stroke();
            // Tiny eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-2, -1, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(2, -1, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(-2, -1, 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(2, -1, 0.8, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'shielded') {
            // Blue metal rectangle with proportional shield arc and hex overlay
            const shieldRadius = bodyRadius * 1.1;
            // Metal gradient body
            const grad = this._makeBodyGradient(ctx, 0, 0, shieldRadius * 1.5, '#64B5F6', '#0D47A1');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.fillRect(-shieldRadius, -shieldRadius * 0.7, shieldRadius * 2, shieldRadius * 1.4);
            ctx.strokeStyle = '#1565C0';
            ctx.lineWidth = 2;
            ctx.strokeRect(-shieldRadius, -shieldRadius * 0.7, shieldRadius * 2, shieldRadius * 1.4);

            // Armor plating strips with rivets
            ctx.fillStyle = '#1976D2';
            ctx.fillRect(-shieldRadius + 3, -shieldRadius * 0.7 + 3, shieldRadius * 2 - 6, 4);
            ctx.fillRect(-shieldRadius + 3, shieldRadius * 0.7 - 7, shieldRadius * 2 - 6, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            for (let rivetX = -shieldRadius + 6; rivetX < shieldRadius - 3; rivetX += 8) {
                ctx.beginPath(); ctx.arc(rivetX, -shieldRadius * 0.7 + 5, 1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(rivetX, shieldRadius * 0.7 - 5, 1, 0, Math.PI * 2); ctx.fill();
            }

            // Shield visual — arc angle proportional to remaining hits
            if (this.shieldActive) {
                const maxShieldHits = this.shieldHits > 5 ? this.shieldHits : ENEMY_DEFS.shielded.shieldHits || 5;
                const shieldRatio = this.shieldHits / maxShieldHits;
                const shieldArcAngle = Math.PI * 1.4 * shieldRatio;
                // Outer energy ring (dashed)
                ctx.strokeStyle = 'rgba(100,181,246,0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.beginPath();
                ctx.arc(0, 0, bodyRadius + 6, -shieldArcAngle, shieldArcAngle);
                ctx.stroke();
                ctx.setLineDash([]);
                // Hexagonal energy overlay
                const hexAlpha = 0.08 + shieldRatio * 0.1;
                ctx.fillStyle = `rgba(130,200,255,${hexAlpha})`;
                ctx.beginPath();
                for (let hexCorner = 0; hexCorner < 6; hexCorner++) {
                    const hexAngle = (hexCorner / 6) * Math.PI * 2;
                    const hexX = Math.cos(hexAngle) * (bodyRadius + 2), hexY = Math.sin(hexAngle) * (bodyRadius + 2);
                    hexCorner === 0 ? ctx.moveTo(hexX, hexY) : ctx.lineTo(hexX, hexY);
                }
                ctx.closePath(); ctx.fill();
            }

            // Blue glowing eyes
            ctx.fillStyle = '#BBDEFB';
            ctx.shadowColor = '#64B5F6';
            ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(-4, -3, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -3, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

        } else if (this.typeKey === 'phantom') {
            // Layered purple wispy design with dissolve alpha when phased
            const isPhased = this.phased;
            const alpha = isPhased ? 0.35 : 1.0;

            // 3 concentric wispy outer layers
            for (let layerIndex = 2; layerIndex >= 0; layerIndex--) {
                const layerAlpha = (0.06 + layerIndex * 0.04) * alpha;
                const layerRadius = bodyRadius + 2 + layerIndex * 3;
                ctx.fillStyle = `rgba(156,39,176,${layerAlpha})`;
                ctx.beginPath(); ctx.arc(0, 0, layerRadius + Math.sin(this.bobOffset * 2 + layerIndex) * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Main body
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : bodyColor;
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2); ctx.fill();

            // Dark core center
            ctx.fillStyle = `rgba(0,0,0,${0.3 * alpha})`;
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius * 0.35, 0, Math.PI * 2); ctx.fill();

            // 5 wispy quadratic tendrils
            ctx.strokeStyle = `rgba(156,39,176,${0.3 * alpha})`;
            ctx.lineWidth = 1.5;
            for (let tendrilIndex = 0; tendrilIndex < 5; tendrilIndex++) {
                const tendrilAngle = this.bobOffset * 1.2 + (tendrilIndex / 5) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(tendrilAngle) * bodyRadius * 0.7, Math.sin(tendrilAngle) * bodyRadius * 0.7);
                ctx.quadraticCurveTo(
                    Math.cos(tendrilAngle) * (bodyRadius + 6), Math.sin(tendrilAngle) * (bodyRadius + 6),
                    Math.cos(tendrilAngle + 0.3) * (bodyRadius + 10), Math.sin(tendrilAngle + 0.3) * (bodyRadius + 10)
                );
                ctx.stroke();
            }

            // Glowing eyes — wider shadow blur when phased
            ctx.globalAlpha = isPhased ? 0.6 : 1.0;
            ctx.fillStyle = '#E1BEE7';
            ctx.shadowColor = '#CE93D8';
            ctx.shadowBlur = isPhased ? 10 : 4;
            ctx.beginPath(); ctx.arc(-3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }

        // ===== Step 7: STATUS EFFECT OVERLAYS =====

        // Frozen / slow indicator — dashed blue ring with ice crystals
        if (this.frozen && this.slowDuration > 0) {
            ctx.strokeStyle = 'rgba(100,180,255,0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, bodyRadius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Ice crystal dots
            ctx.fillStyle = 'rgba(200,230,255,0.6)';
            for (let crystalIndex = 0; crystalIndex < 4; crystalIndex++) {
                const crystalAngle = (crystalIndex / 4) * Math.PI * 2 + this.bobOffset;
                ctx.beginPath();
                ctx.arc(Math.cos(crystalAngle) * (bodyRadius + 5), Math.sin(crystalAngle) * (bodyRadius + 5), 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Radiation indicator — orange/red radial glow
        if (this.radiationDuration > 0) {
            const radGrad = ctx.createRadialGradient(0, 0, bodyRadius, 0, 0, bodyRadius + 7);
            radGrad.addColorStop(0, 'rgba(255,50,0,0.15)');
            radGrad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius + 7, 0, Math.PI * 2); ctx.fill();
        }

        // Elite indicator — golden ring + star badge
        if (this._isElite) {
            ctx.strokeStyle = 'rgba(255,215,0,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, bodyRadius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, -bodyRadius - 5);
        }

        ctx.restore();

        // Step 9: HP bar (above enemy, not affected by bob/translate)
        this.renderHpBar(ctx);
    }

    /**
     * Render the health bar above the enemy.
     * Shows a colored fill (green > yellow > red based on HP ratio)
     * with a black border. Boss enemies get a segmented bar pattern.
     * Shielded enemies show a thin blue shield bar above the HP bar.
     * @param {CanvasRenderingContext2D} ctx
     */
    renderHpBar(ctx) {
        const barWidth = this.size * 2.2;
        const barHeight = 4;
        const barY = this.y - this.size - 10;
        // Flyers have the bar shifted upward
        const flyerOffset = this.flyer ? -6 : 0;
        const barX = this.x - barWidth / 2;
        const barTopY = barY + flyerOffset;

        // Background (dark border)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barTopY - 1, barWidth + 2, barHeight + 2);

        // HP fill — color transitions at 60% and 30% thresholds
        const hpRatio = this.hp / this.maxHp;
        let hpColor;
        if (hpRatio > 0.6) hpColor = '#4CAF50';
        else if (hpRatio > 0.3) hpColor = '#FFC107';
        else hpColor = '#F44336';

        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barTopY, barWidth * hpRatio, barHeight);

        // Boss gets a segmented/fancy bar
        if (this.typeKey === 'boss') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for (let stripeOffset = 0; stripeOffset < barWidth; stripeOffset += 6) {
                ctx.fillRect(barX + stripeOffset, barTopY, 3, barHeight);
            }
        }

        // Shield indicator bar (thin blue bar above HP bar)
        if (this.shieldActive && this.shieldHits > 0) {
            const shieldBarY = barTopY - 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX - 1, shieldBarY - 1, barWidth + 2, 3);
            ctx.fillStyle = '#64B5F6';
            ctx.fillRect(barX, shieldBarY, barWidth, 2);
        }
    }

    /**
     * Calculate the remaining distance from this enemy to the base (end of path).
     * Uses the precomputed _distToEnd on each waypoint and adds the distance
     * from the enemy to the current target waypoint.
     * Higher return value = closer to the end.
     * @returns {number} Remaining distance to base
     */
    distanceToEnd() {
        if (this.waypointIndex >= WAYPOINTS.length) return 0;
        const waypointBaseProgress = WAYPOINTS[this.waypointIndex]._distToEnd || 0;
        const currentTarget = WAYPOINTS[this.waypointIndex];
        const dx = currentTarget.x - this.x;
        const dy = currentTarget.y - this.y;
        return waypointBaseProgress + Math.sqrt(dx * dx + dy * dy);
    }
}
