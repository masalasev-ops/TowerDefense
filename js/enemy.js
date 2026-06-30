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
        const diff = (typeof getActiveDifficulty === 'function') ? getActiveDifficulty()
            : { eliteInterval: 5, eliteHpMult: 1.4, eliteSpeedMult: 1.2, hpMult: 1, speedMult: 1 };
        const isElite = (waveNum >= 10 && waveNum % diff.eliteInterval === 0);
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

        // Waves 11+: enemies get +10% HP
        if (waveNum >= 11) {
            hpMult *= 1.10;
        }

        this.maxHp = Math.floor(def.hp * hpMult);
        this.hp = this.maxHp;
        this.baseSpeed = def.speed * speedMult;
        this.speed = this.baseSpeed;
        this.baseArmor = def.armor;
        this.armor = this.baseArmor;

        // Movement state — guard against uninitialized waypoints
        if (!WAYPOINTS || WAYPOINTS.length === 0) {
            throw new Error('Enemy created before waypoints are initialized — map not loaded');
        }
        this.waypointIndex = 0;
        this.x = WAYPOINTS[0].x;
        this.y = WAYPOINTS[0].y;
        this.reachedBase = false;
        this.alive = true;

        // Flyers follow the path like ground enemies but are immune to slow effects

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

        // Stun (Mortar)
        this.stunTimer = 0;

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
            this.takeDamage(this.radiationDamage * effectiveDt, 1.0);
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

        // Stun timer (Mortar)
        if (this.stunTimer > 0) {
            this.stunTimer -= effectiveDt;
        }

        // Stunned enemies don't move (but still take damage and have status effects)
        if (this.stunTimer > 0) {
            this.bobOffset += effectiveDt * 4; // still animate bob
            this.hitFlash -= effectiveDt;
            if (this.hitFlash < 0) this.hitFlash = 0;
            return;
        }

        // All enemies follow the path waypoints
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

    takeDamage(amount, armorPierceAmount = 0, ignoreDodge = false) {
        if (!this.alive) return { damage: 0, shieldBroke: false };

        const fullPierce = armorPierceAmount >= 1.0;
        let shieldBroke = false;

        // Phased immunity (phantoms): only full pierce bypasses phase
        if (this.phased && !fullPierce) {
            return { damage: 0, shieldBroke: false };
        }

        // Dodge chance (runners)
        if (!ignoreDodge && this.dodgeChance > 0) {
            if (Math.random() < this.dodgeChance) {
                return { damage: 0, shieldBroke: false }; // Dodged!
            }
        }

        // Shield absorption (shielded): only full pierce bypasses shield
        if (this.shieldActive && !fullPierce && amount > 0) {
            const absorbed = amount * this.shieldDmgReduction;
            amount -= absorbed;
            this.shieldHits--;
            if (this.shieldHits <= 0) {
                this.shieldActive = false;
                shieldBroke = true;
            }
        }

        // Armor reduction — proportional pierce for non-full values
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

    applyStun(duration) {
        this.stunTimer = Math.max(this.stunTimer, duration);
    }

    applySlow(amount, duration) {
        // Flyers are immune to slow effects
        if (this.flyer) return;
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

    // ---- Shared rendering helpers ----

    _drawShadow(ctx) {
        const alpha = this.flyer ? 0.08 : 0.18;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.beginPath();
        const sy = this.flyer ? 16 : 2;
        ctx.ellipse(SHADOW_OFFSET_X, SHADOW_OFFSET_Y + sy, this.size * 0.85, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _makeBodyGradient(ctx, cx, cy, r, topColor, bottomColor) {
        const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, bottomColor);
        return grad;
    }

    _renderTrailParticles(ctx) {
        // Emit trail while moving
        if (this.speed > 15 && Math.random() < 0.35 && this.alive) {
            if (!this._trailParticles) this._trailParticles = [];
            this._trailParticles.push({ x: this.x, y: this.y, life: 0.5, maxLife: 0.5 });
        }
        if (!this._trailParticles) return;
        // Age and filter
        this._trailParticles = this._trailParticles.filter(p => {
            p.life -= 0.016;
            p.y -= 0.5;
            return p.life > 0;
        });
        // Render
        for (const p of this._trailParticles) {
            const alpha = Math.max(0, p.life / p.maxLife) * 0.3;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.size * 0.12, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    render(ctx) {
        if (!this.alive) return;

        // Trail particles (behind enemy, not affected by bob/translate)
        this._renderTrailParticles(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Directional ground shadow
        this._drawShadow(ctx);

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

        const s = this.size;

        // ===== PER-TYPE RENDERING =====

        if (this.typeKey === 'grunt') {
            // Enhanced: gradient body, walking legs, detailed eyes
            const grad = this._makeBodyGradient(ctx, 0, 0, s, '#A1887F', '#5D4037');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Walking legs — two small rounded rects alternating
            const legPhase = Math.sin(this.bobOffset * 3);
            ctx.fillStyle = '#4E342E';
            ctx.beginPath();
            ctx.ellipse(-4 + legPhase * 2, s * 0.7, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(4 - legPhase * 2, s * 0.7, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes with iris rings
            for (const ex of [-4, 4]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(ex, -3, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#6D4C41';
                ctx.beginPath(); ctx.arc(ex, -3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(ex, -3, 1.2, 0, Math.PI * 2); ctx.fill();
                // Specular highlight
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(ex - 0.8, -4, 0.6, 0, Math.PI * 2); ctx.fill();
            }

        } else if (this.typeKey === 'runner') {
            // Enhanced: warm gradient, motion afterimages, side fins, cat-eye
            if (this.speed > 40) {
                // Motion blur afterimages
                for (let a = 1; a <= 2; a++) {
                    ctx.globalAlpha = 0.12 * (3 - a);
                    ctx.fillStyle = bodyColor;
                    ctx.beginPath();
                    ctx.moveTo(s, 0);
                    ctx.lineTo(-s * 0.6, -s * 0.7);
                    ctx.lineTo(-s * 0.3, 0);
                    ctx.lineTo(-s * 0.6, s * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.translate(-a * 4, 0);
                }
                ctx.globalAlpha = 1;
            }
            // Body gradient
            const grad = this._makeBodyGradient(ctx, 0, 0, s, '#FFE0B2', '#E65100');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
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
            // Side fins
            ctx.fillStyle = '#FF9800';
            ctx.beginPath(); ctx.moveTo(-2, -s * 0.4); ctx.lineTo(-s * 0.5, -s * 0.8); ctx.lineTo(-4, -s * 0.3); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-2, s * 0.4); ctx.lineTo(-s * 0.5, s * 0.8); ctx.lineTo(-4, s * 0.3); ctx.closePath(); ctx.fill();
            // Elongated cat-eye
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(3, -2, 2.8, 1.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.ellipse(3.5, -2, 1.2, 2, 0, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'tank') {
            // Enhanced: metal gradient, rivets, treads, footstep scale
            const r = s * 1.2;
            const stepScale = 1 + Math.abs(Math.sin(this.bobOffset * 2)) * 0.08;
            ctx.scale(stepScale, 1 / stepScale);
            // Metal gradient
            const grad = this._makeBodyGradient(ctx, 0, 0, r * 1.5, '#90A4AE', '#37474F');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.fillRect(-r, -r * 0.8, r * 2, r * 1.6);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-r, -r * 0.8, r * 2, r * 1.6);
            // Overlapping armor plates
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(-r + 3, -r * 0.8 + 3, r * 2 - 6, 4);
            ctx.fillRect(-r + 3, r * 0.8 - 7, r * 2 - 6, 4);
            // Rivet dots
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            for (let rx = -r + 6; rx < r - 3; rx += 7) {
                ctx.beginPath(); ctx.arc(rx, -r * 0.8 + 5, 1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(rx, r * 0.8 - 5, 1, 0, Math.PI * 2); ctx.fill();
            }
            // Tread marks on sides
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            for (let ty = -r * 0.6; ty < r * 0.6; ty += 5) {
                ctx.beginPath(); ctx.moveTo(-r - 1, ty); ctx.lineTo(-r + 3, ty + 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(r + 1, ty); ctx.lineTo(r - 3, ty + 1); ctx.stroke();
            }
            // Yellow eyes
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath(); ctx.arc(-5, -4, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -4, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(-5, -4, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -4, 1.5, 0, Math.PI * 2); ctx.fill();

        } else if (this.typeKey === 'flyer') {
            // Enhanced: gradient body, wing bone strokes, compound eyes, distant shadow
            const grad = this._makeBodyGradient(ctx, 0, 0, s, '#CE93D8', '#4A148C');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
            // Wings with bone structure
            const wingPhase = Math.sin(this.bobOffset * 2) * 0.3;
            for (const side of [-1, 1]) {
                ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
                ctx.beginPath();
                ctx.ellipse(side * 7, -2, 8, 5 + wingPhase * 3 * side, side * -0.3, 0, Math.PI * 2);
                ctx.fill();
                // Wing bones
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 0.6;
                for (let b = 0; b < 3; b++) {
                    ctx.beginPath();
                    ctx.moveTo(side * 3, -2);
                    ctx.lineTo(side * (8 + b * 3), -4 + b * 2 - wingPhase * 4 * side);
                    ctx.stroke();
                }
            }
            // Compound insect eyes
            for (const ex of [-2, 2]) {
                ctx.fillStyle = '#BBDEFB';
                ctx.beginPath(); ctx.arc(ex, -2, 2.8, 0, Math.PI * 2); ctx.fill();
                // Facet dots
                for (let f = 0; f < 4; f++) {
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.beginPath();
                    ctx.arc(ex + (f - 1.5) * 1.3, -2 + (f % 2 - 0.5) * 1.5, 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

        } else if (this.typeKey === 'boss') {
            // Enhanced: multi-layer gradient, pulsing aura, triangular spikes, crown, mouth, heart
            const r = s * 1.1;
            // Pulsing aura
            const auraAlpha = 0.15 + Math.sin(this.bobOffset * 2) * 0.08;
            const auraGrad = ctx.createRadialGradient(0, -4, r * 0.6, 0, -4, r * 1.8);
            auraGrad.addColorStop(0, `rgba(211,47,47,${auraAlpha + 0.1})`);
            auraGrad.addColorStop(1, 'rgba(211,47,47,0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath(); ctx.arc(0, -4, r * 1.8, 0, Math.PI * 2); ctx.fill();

            // Body with deep gradient
            const bodyGrad = ctx.createRadialGradient(-r * 0.3, -4 - r * 0.3, r * 0.1, 0, -4, r);
            bodyGrad.addColorStop(0, '#EF5350');
            bodyGrad.addColorStop(0.5, '#D32F2F');
            bodyGrad.addColorStop(1, '#7F0000');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : bodyGrad;
            ctx.beginPath(); ctx.arc(0, -4, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Dark underside
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(0, 2, r * 0.8, 0, Math.PI); ctx.fill();

            // Triangular spikes (inner ring + outer)
            ctx.fillStyle = '#B71C1C';
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + this.bobOffset * 0.15;
                const sx = Math.cos(angle) * r, sy = Math.sin(angle) * r - 4;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - 4, sy + 8);
                ctx.lineTo(sx + 4, sy + 8);
                ctx.closePath();
                ctx.fill();
            }
            // Crown horns on top
            ctx.fillStyle = '#8B0000';
            for (let i = 0; i < 3; i++) {
                const cx = (i - 1) * 10;
                ctx.beginPath();
                ctx.moveTo(cx, -r - 5);
                ctx.lineTo(cx - 3, -r - 12);
                ctx.lineTo(cx + 3, -r - 12);
                ctx.closePath();
                ctx.fill();
            }

            // Glowing heart (central orb pulsing)
            const heartAlpha = 0.5 + Math.sin(this.bobOffset * 1.7) * 0.3;
            ctx.fillStyle = `rgba(255,60,60,${heartAlpha})`;
            ctx.shadowColor = '#FF1744';
            ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(0, -2, r * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Menacing mouth
            ctx.strokeStyle = '#3E0000';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 4, r * 0.35, 0.2, Math.PI - 0.2); ctx.stroke();
            // Small teeth dots
            ctx.fillStyle = '#fff';
            for (let t = 0; t < 3; t++) {
                ctx.beginPath();
                ctx.arc(-3 + t * 3, 2, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Glowing deep-set eyes
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
            // Enhanced: gradient, pulsing aura, floating + particles
            // Pulsing heal aura
            const auraPhase = Math.sin(this.bobOffset * 2.5) * 0.5 + 0.5;
            const auraGrad = ctx.createRadialGradient(0, -2, s * 0.5, 0, -2, s + 6);
            auraGrad.addColorStop(0, `rgba(129,199,132,${0.15 + auraPhase * 0.15})`);
            auraGrad.addColorStop(1, 'rgba(129,199,132,0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath(); ctx.arc(0, -2, s + 6, 0, Math.PI * 2); ctx.fill();

            // Body gradient
            const grad = this._makeBodyGradient(ctx, 0, -2, s, '#81C784', '#2E7D32');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath(); ctx.arc(0, -2, s, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // White-outlined green cross
            ctx.fillStyle = '#fff';
            const crossW = s * 0.25, crossL = s * 0.55;
            ctx.fillRect(-crossW - 1, -crossL - 3, crossW * 2 + 2, crossL * 2 + 2);
            ctx.fillRect(-crossL - 1, -crossW - 3, crossL * 2 + 2, crossW * 2 + 2);
            ctx.fillStyle = '#A5D6A7';
            ctx.fillRect(-crossW, -crossL - 2, crossW * 2, crossL * 2);
            ctx.fillRect(-crossL, -crossW - 2, crossL * 2, crossW * 2);

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(-3, -5, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -5, 1.2, 0, Math.PI * 2); ctx.fill();

            // Floating + particles
            if (auraPhase > 0.3) {
                for (let p = 0; p < 2; p++) {
                    const px = (p - 0.5) * 12, py = -s - 5 - auraPhase * 10;
                    ctx.fillStyle = `rgba(165,214,167,${auraPhase * 0.5})`;
                    ctx.font = '8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('+', px, py);
                }
            }

        } else if (this.typeKey === 'splitter') {
            // Enhanced: orange gradient, internal glow, multiple cracks, orbiting fragments
            // Internal glow
            const glowGrad = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s);
            glowGrad.addColorStop(0, 'rgba(255,200,150,0.35)');
            glowGrad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();

            // Jagged body with gradient
            const grad = this._makeBodyGradient(ctx, 0, 0, s, '#FF8A65', '#BF360C');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath();
            const jagPoints = 10;
            for (let i = 0; i < jagPoints; i++) {
                const angle = (i / jagPoints) * Math.PI * 2 - Math.PI / 2;
                const r = s * (i % 2 === 0 ? 1.0 : 0.55);
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

            // Light rim on top-left facets
            ctx.strokeStyle = 'rgba(255,200,100,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(-2, -3, s * 0.7, -Math.PI * 0.7, -Math.PI * 0.05);
            ctx.stroke();

            // Multiple cracks
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 0.8;
            for (let c = 0; c < 4; c++) {
                const ca = (c / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ca) * 2, Math.sin(ca) * 2);
                ctx.lineTo(Math.cos(ca) * s * 0.7, Math.sin(ca) * s * 0.7);
                ctx.stroke();
            }

            // Eyes
            ctx.fillStyle = '#FFE0B2';
            ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -2, 2, 0, Math.PI * 2); ctx.fill();

            // Orbiting fragment dots
            for (let o = 0; o < 3; o++) {
                const oa = this.bobOffset * 1.3 + (o / 3) * Math.PI * 2;
                ctx.fillStyle = 'rgba(255,138,101,0.6)';
                ctx.beginPath();
                ctx.arc(Math.cos(oa) * (s + 4), Math.sin(oa) * (s + 4), 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (this.typeKey === 'splitter_minion') {
            // Small fragment with gradient
            const grad = this._makeBodyGradient(ctx, 0, 1, s, '#FFAB91', '#D84315');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.beginPath(); ctx.arc(0, 1, s, 0, Math.PI * 2); ctx.fill();
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
            // Enhanced: blue metal gradient, proportional shield arc, rivets, energy overlay
            const r = s * 1.1;
            // Metal gradient body
            const grad = this._makeBodyGradient(ctx, 0, 0, r * 1.5, '#64B5F6', '#0D47A1');
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : grad;
            ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
            ctx.strokeStyle = '#1565C0';
            ctx.lineWidth = 2;
            ctx.strokeRect(-r, -r * 0.7, r * 2, r * 1.4);

            // Armor plating with rivets
            ctx.fillStyle = '#1976D2';
            ctx.fillRect(-r + 3, -r * 0.7 + 3, r * 2 - 6, 4);
            ctx.fillRect(-r + 3, r * 0.7 - 7, r * 2 - 6, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            for (let rx = -r + 6; rx < r - 3; rx += 8) {
                ctx.beginPath(); ctx.arc(rx, -r * 0.7 + 5, 1, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(rx, r * 0.7 - 5, 1, 0, Math.PI * 2); ctx.fill();
            }

            // Shield visual — proportional to remaining hits
            if (this.shieldActive) {
                const maxHits = this.shieldHits > 5 ? this.shieldHits : ENEMY_DEFS.shielded.shieldHits || 5;
                const shieldRatio = this.shieldHits / maxHits;
                const shieldAngle = Math.PI * 1.4 * shieldRatio;
                // Outer energy ring
                ctx.strokeStyle = 'rgba(100,181,246,0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.beginPath();
                ctx.arc(0, 0, s + 6, -shieldAngle, shieldAngle);
                ctx.stroke();
                ctx.setLineDash([]);
                // Hexagonal energy overlay
                const hexAlpha = 0.08 + shieldRatio * 0.1;
                ctx.fillStyle = `rgba(130,200,255,${hexAlpha})`;
                ctx.beginPath();
                for (let h = 0; h < 6; h++) {
                    const ha = (h / 6) * Math.PI * 2;
                    const hx = Math.cos(ha) * (s + 2), hy = Math.sin(ha) * (s + 2);
                    h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
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
            // Enhanced: layered circles, wispy tendrils, dark core, dissolve transition
            const phased = this.phased;
            const alpha = phased ? 0.35 : 1.0;

            // Outer wispy layers (3 concentric at different opacities)
            for (let layer = 2; layer >= 0; layer--) {
                const la = (0.06 + layer * 0.04) * alpha;
                const lr = s + 2 + layer * 3;
                ctx.fillStyle = `rgba(156,39,176,${la})`;
                ctx.beginPath(); ctx.arc(0, 0, lr + Math.sin(this.bobOffset * 2 + layer) * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Main body
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.hitFlash > 0 ? '#fff' : bodyColor;
            ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();

            // Dark core center
            ctx.fillStyle = `rgba(0,0,0,${0.3 * alpha})`;
            ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2); ctx.fill();

            // Wispy tendrils
            ctx.strokeStyle = `rgba(156,39,176,${0.3 * alpha})`;
            ctx.lineWidth = 1.5;
            for (let w = 0; w < 5; w++) {
                const wa = this.bobOffset * 1.2 + (w / 5) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(wa) * s * 0.7, Math.sin(wa) * s * 0.7);
                ctx.quadraticCurveTo(
                    Math.cos(wa) * (s + 6), Math.sin(wa) * (s + 6),
                    Math.cos(wa + 0.3) * (s + 10), Math.sin(wa + 0.3) * (s + 10)
                );
                ctx.stroke();
            }

            // Glowing eyes
            ctx.globalAlpha = phased ? 0.6 : 1.0;
            ctx.fillStyle = '#E1BEE7';
            ctx.shadowColor = '#CE93D8';
            ctx.shadowBlur = phased ? 10 : 4;
            ctx.beginPath(); ctx.arc(-3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }

        // ===== STATUS EFFECTS =====

        // Slow/frozen indicator
        if (this.frozen && this.slowDuration > 0) {
            ctx.strokeStyle = 'rgba(100,180,255,0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
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
            const radGrad = ctx.createRadialGradient(0, 0, s, 0, 0, s + 7);
            radGrad.addColorStop(0, 'rgba(255,50,0,0.15)');
            radGrad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath(); ctx.arc(0, 0, s + 7, 0, Math.PI * 2); ctx.fill();
        }

        // Elite indicator — golden ring + badge
        if (this._isElite) {
            ctx.strokeStyle = 'rgba(255,215,0,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 9px sans-serif';
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
        // Use precomputed cumulative distances (set in map.js setActiveMap)
        const waypointBase = WAYPOINTS[this.waypointIndex]._distToEnd || 0;
        const currentTarget = WAYPOINTS[this.waypointIndex];
        const dx = currentTarget.x - this.x;
        const dy = currentTarget.y - this.y;
        return waypointBase + Math.sqrt(dx * dx + dy * dy);
    }
}
