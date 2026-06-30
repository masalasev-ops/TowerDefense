// ============================================================
// UI — HUD rendering, tower selection, upgrade/sell panel
// ============================================================

class UIManager {
    constructor() {
        // Tower selection
        this.selectedTowerType = null;
        this.selectedPlacedTower = null;

        // Tower selection buttons (rendered below canvas in HTML)
        this.towerButtons = [];

        // Game over state
        this.showGameOver = false;
        this.gameOverWon = false;

        this._buildTowerButtons();
        this._setupWaveSplash();
    }

    _setupWaveSplash() {
        const self = this;
        const icons = {
            'grunt': '👤', 'runner': '🏃', 'tank': '🛡️', 'flyer': '🦇',
            'boss': '👹', 'healer': '💚', 'splitter': '🧨', 'splitter_minion': '⬜',
            'shielded': '🔵', 'phantom': '👻'
        };
        const names = {
            'grunt': 'Grunt', 'runner': 'Runner', 'tank': 'Tank', 'flyer': 'Flyer',
            'boss': 'Boss', 'healer': 'Healer', 'splitter': 'Splitter', 'splitter_minion': 'Fragment',
            'shielded': 'Shielded', 'phantom': 'Phantom'
        };

        window._showWaveSplash = function(waveNum, enemyTypes, gameSpeed) {
            // Remove existing splash
            const existing = document.getElementById('wave-splash');
            if (existing) existing.remove();

            const hasBoss = enemyTypes.includes('boss');

            // Build overlay
            const overlay = document.createElement('div');
            overlay.id = 'wave-splash';
            overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
                + 'display:flex;align-items:center;justify-content:center;'
                + 'background:rgba(0,0,0,0.25);z-index:100;pointer-events:none;'
                + 'animation:ws-fadein 0.3s ease-out;';

            // Build card
            const card = document.createElement('div');
            card.style.cssText = 'background:rgba(10,15,35,0.95);border:2px solid '
                + (hasBoss ? '#F44336' : '#FF9800') + ';border-radius:16px;padding:28px 40px;'
                + 'text-align:center;max-width:95%;'
                + 'animation:ws-pop 0.35s cubic-bezier(0.175,0.885,0.32,1.275);';

            // Header
            const header = document.createElement('div');
            header.style.cssText = 'color:' + (hasBoss ? '#F44336' : '#FF9800')
                + ';font-size:22px;font-weight:700;margin-bottom:20px;';
            header.textContent = '⚔ WAVE ' + waveNum + ' INCOMING ⚔';
            card.appendChild(header);

            // Enemy icons row
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:36px;justify-content:center;flex-wrap:wrap;';

            for (const t of enemyTypes) {
                const item = document.createElement('div');
                item.style.cssText = 'text-align:center;min-width:56px;';

                const icon = document.createElement('div');
                icon.style.cssText = 'font-size:48px;line-height:1.1;margin-bottom:6px;';
                icon.textContent = icons[t] || '❓';
                item.appendChild(icon);

                const label = document.createElement('div');
                label.style.cssText = 'color:#ccc;font-size:13px;font-weight:600;';
                label.textContent = names[t] || t;
                item.appendChild(label);

                row.appendChild(item);
            }
            card.appendChild(row);
            overlay.appendChild(card);

            // Add to canvas wrapper
            const wrapper = document.getElementById('canvas-wrapper');
            if (wrapper) wrapper.appendChild(overlay);

            // Auto-remove — duration scales with game speed
            const duration = Math.floor(2500 / (gameSpeed || 1));
            clearTimeout(self._splashTimer);
            self._splashTimer = setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.35s ease';
                setTimeout(() => overlay.remove(), 350);
            }, duration);
        };
    }

    _buildTowerButtons() {
        const container = document.getElementById('tower-buttons');
        if (!container) return;

        container.innerHTML = '';
        // Sort towers by tier then unlock wave
        const entries = Object.entries(TOWER_DEFS).sort((a, b) => {
            if (a[1].tier !== b[1].tier) return a[1].tier - b[1].tier;
            return (a[1].unlockWave || 0) - (b[1].unlockWave || 0);
        });

        for (const [key, def] of entries) {
            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            btn.dataset.towerKey = key;
            btn.dataset.unlockWave = def.unlockWave || 0;

            const locked = (this._currentWave || 0) < (def.unlockWave || 0);
            if (locked) {
                btn.classList.add('locked');
                btn.innerHTML = '<span class="tower-icon">🔒</span><span class="tower-name">' + def.name + '</span><span class="tower-cost">Wave ' + def.unlockWave + '</span>';
                btn.title = def.name + ' — unlocks after wave ' + def.unlockWave;
            } else {
                btn.innerHTML = '<span class="tower-icon">' + def.icon + '</span><span class="tower-name">' + def.name + '</span><span class="tower-cost">' + def.levels[0].cost + 'g</span>';
                btn.title = def.name + ' (Tier ' + def.tier + '): ' + def.description;
            }

            btn.addEventListener('click', () => {
                if (btn.classList.contains('locked')) return;
                this.selectTowerType(key);
            });
            container.appendChild(btn);
            this.towerButtons.push({ key, element: btn });
        }
    }

    // Called when wave changes — only queues unlocks, doesn't change buttons yet
    updateTowerUnlocks(currentWave) {
        this._currentWave = currentWave;
        if (!this._celebratedUnlocks) this._celebratedUnlocks = new Set();
        if (!this._pendingButtonUnlocks) this._pendingButtonUnlocks = [];

        for (const btn of this.towerButtons) {
            const unlockWave = parseInt(btn.element.dataset.unlockWave) || 0;
            const def = TOWER_DEFS[btn.key];

            // unlockWave === 0: available from start
            // unlockWave > 0: available when wave N starts (currentWave >= unlockWave)
            const locked = unlockWave === 0 ? false : currentWave < unlockWave;

            if (locked) {
                // Still locked — ensure locked visuals
                if (!btn.element.classList.contains('locked')) {
                    btn.element.classList.add('locked');
                    btn.element.innerHTML = '<span class="tower-icon">🔒</span><span class="tower-name">' + def.name + '</span><span class="tower-cost">Wave ' + unlockWave + '</span>';
                    btn.element.title = def.name + ' — unlocks after wave ' + unlockWave;
                }
            } else if (btn.element.classList.contains('locked') && unlockWave > 0) {
                // Just became eligible this wave — queue for between-waves reveal
                if (!this._celebratedUnlocks.has(btn.key)) {
                    this._celebratedUnlocks.add(btn.key);
                    if (!this._pendingUnlockCelebrations) this._pendingUnlockCelebrations = [];
                    this._pendingUnlockCelebrations.push(def);
                    this._pendingButtonUnlocks.push({ btn, def });
                }
            }
        }
    }

    // Apply queued button unlocks (call between waves with celebrations)
    applyPendingUnlocks() {
        if (!this._pendingButtonUnlocks) return;
        for (const { btn, def } of this._pendingButtonUnlocks) {
            btn.element.classList.remove('locked');
            btn.element.innerHTML = '<span class="tower-icon">' + def.icon + '</span><span class="tower-name">' + def.name + '</span><span class="tower-cost">' + def.levels[0].cost + 'g</span>';
            btn.element.title = def.name + ' (Tier ' + def.tier + '): ' + def.description;
        }
        this._pendingButtonUnlocks = [];
    }

    // Show queued tower unlock celebrations (call between waves)
    showPendingUnlockCelebrations() {
        if (!this._pendingUnlockCelebrations || this._pendingUnlockCelebrations.length === 0) return;
        if (typeof activeEffects === 'undefined') return;
        // Show first queued celebration; subsequent ones will fire as this one ends
        const def = this._pendingUnlockCelebrations.shift();
        activeEffects.spawnUnlockCelebration(def);
        // If more are queued, schedule them after a delay
        if (this._pendingUnlockCelebrations.length > 0) {
            setTimeout(() => this.showPendingUnlockCelebrations(), 3800);
        }
    }

    selectTowerType(key) {
        if (typeof debugLog !== 'undefined') debugLog('selectTowerType: ' + key + ' (current=' + this.selectedTowerType + ')');
        if (this.selectedTowerType === key) {
            this.selectedTowerType = null;
        } else {
            this.selectedTowerType = key;
            this.selectedPlacedTower = null;
        }
        this._updateButtonStyles();
    }

    selectPlacedTower(tower) {
        this.selectedPlacedTower = tower;
        this.selectedTowerType = null;
        this._updateButtonStyles();
        this._showTowerInfo(tower);
    }

    clearSelection() {
        this.selectedTowerType = null;
        this.selectedPlacedTower = null;
        this._updateButtonStyles();
        this._hideTowerInfo();
    }

    _updateButtonStyles() {
        for (const btn of this.towerButtons) {
            if (btn.key === this.selectedTowerType) {
                btn.element.classList.add('selected');
            } else {
                btn.element.classList.remove('selected');
            }
        }
    }

    _showTowerInfo(tower) {
        const panel = document.getElementById('tower-info');
        if (!panel) return;

        const def = TOWER_DEFS[tower.typeKey];
        const stats = def.levels[tower.level];
        const upgradeCost = tower.getUpgradeCost();
        const sellValue = tower.getSellValue();
        const dps = Math.round(stats.damage * stats.fireRate * 10) / 10;

        let upgradeHTML = '';
        if (upgradeCost !== null) {
            const nextStats = def.levels[tower.level + 1];
            const nextDPS = Math.round(nextStats.damage * nextStats.fireRate * 10) / 10;
            const dmgDiff = nextStats.damage - stats.damage;
            const rangeDiff = nextStats.range - stats.range;
            const dpsDiff = nextDPS - dps;
            const frDiff = nextStats.fireRate - stats.fireRate;

            let statPreview = '';
            if (dmgDiff > 0) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+${dmgDiff}</span>`;
            if (rangeDiff > 0) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+${rangeDiff}px range</span>`;
            if (dpsDiff > 0) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+${dpsDiff.toFixed(1)} DPS</span>`;
            if (nextStats.splashRadius > (stats.splashRadius || 0)) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+splash</span>`;
            if (nextStats.chainCount > (stats.chainCount || 0)) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+chain</span>`;
            if (nextStats.stunDuration && !stats.stunDuration) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+stun</span>`;

            upgradeHTML = `<button class="info-btn upgrade-btn" data-action="upgrade">
                    Upgrade to ${nextStats.name} (${upgradeCost}g)
                </button>
                <div style="font-size:10px;color:#aaa;margin-top:3px;">${statPreview}</div>`;
        } else {
            upgradeHTML = `<span class="max-level">MAX LEVEL</span>`;
        }

        const modeLabel = tower.getTargetModeLabel();
        const modeEmoji = { 'Furthest Along': '🎯', 'Strongest': '💪', 'Lowest HP': '💀', 'Fastest': '💨' }[modeLabel] || '🎯';

        panel.innerHTML = `
            <div class="tower-info-header">
                <span class="tower-info-icon">${def.icon}</span>
                <span class="tower-info-name">${stats.name}</span>
                <span class="tower-info-level">Lvl ${tower.level + 1}/3</span>
            </div>
            <div class="tower-info-stats">
                <div>Damage: <b>${stats.damage}</b></div>
                <div>Range: <b>${stats.range}</b></div>
                <div>Fire Rate: <b>${stats.fireRate.toFixed(1)}/s</b></div>
                <div>DPS: <b>${dps}</b></div>
                ${stats.splashRadius > 0 ? `<div>Splash: <b>${stats.splashRadius}px</b></div>` : ''}
                ${stats.slow > 0 ? `<div>Slow: <b>${Math.round(stats.slow * 100)}%</b></div>` : ''}
                ${stats.chainCount > 0 ? `<div>Chains: <b>${stats.chainCount}</b></div>` : ''}
                ${stats.armorPierce > 0 ? `<div>Armor Pierce: <b>${Math.round(stats.armorPierce * 100)}%</b></div>` : ''}
                ${stats.radiationDPS > 0 ? `<div>Radiation: <b>${stats.radiationDPS} DPS</b></div>` : ''}
                ${stats.stunDuration > 0 ? `<div>Stun: <b>${stats.stunDuration.toFixed(1)}s</b></div>` : ''}
                <div style="margin-top:6px;color:#FFD600;font-size:11px;">${modeEmoji} Target: ${modeLabel} <span style="color:#888;font-size:9px;">(right-click to change)</span></div>
            </div>
            <div class="tower-info-actions">
                ${upgradeHTML}
                <button class="info-btn sell-btn" data-action="sell">
                    Sell (${sellValue}g)
                </button>
            </div>
        `;
        panel.style.display = 'block';

        // Wire up data-action buttons via delegation
        this._wireTowerInfoActions();
    }

    _wireTowerInfoActions() {
        const panel = document.getElementById('tower-info');
        if (!panel || panel._wired) return;
        panel._wired = true;
        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            switch (btn.dataset.action) {
                case 'upgrade':
                    if (typeof window._upgradeTower === 'function') window._upgradeTower();
                    break;
                case 'sell':
                    if (typeof window._sellTower === 'function') window._sellTower();
                    break;
            }
        });
    }

    _hideTowerInfo() {
        const panel = document.getElementById('tower-info');
        if (panel) {
            panel.style.display = 'none';
            panel._wired = false;
        }
    }

    updateHUD(game, waveManager, waveProgress) {
        // Read directly from game object — no parameter ordering bugs
        var gold = game.gold || 0;
        var castleHP = (game.castleHP !== undefined && !isNaN(game.castleHP)) ? game.castleHP : 2000;
        var castleMaxHP = game.castleMaxHP || 2000;
        var repairUnlocked = game.repairUnlocked || false;
        var wave = game.waveNum || 0;
        var kills = game.kills || 0;
        var waveActive = waveManager ? waveManager.active : false;
        var wp = waveProgress || 0;

        document.getElementById('gold-value').textContent = gold;
        document.getElementById('wave-value').textContent = wave;

        // Update tower unlock states when wave changes
        if (this._lastWave !== wave) {
            this._lastWave = wave;
            this.updateTowerUnlocks(wave);
        }

        // Castle HP — show current number, color-coded
        var safeHP = Math.ceil(Math.max(0, castleHP));
        var hpEl = document.getElementById('castle-hp-value');
        if (hpEl) {
            hpEl.textContent = safeHP;
            var pct = safeHP / castleMaxHP;
            if (pct <= 0.25) hpEl.style.color = '#F44336';
            else if (pct <= 0.5) hpEl.style.color = '#FF9800';
            else if (pct <= 0.75) hpEl.style.color = '#FFC107';
            else hpEl.style.color = '#4CAF50';
        }

        // Repair button — only between waves, when unlocked, and damaged
        var repairBtn = document.getElementById('repair-btn');
        var repairInfo = document.getElementById('repair-info');
        if (repairBtn) {
            var missingHP = castleMaxHP - safeHP;
            var costPerHP = REPAIR_COST_PER_HP || 0.30;
            var fullCost = Math.max(1, Math.ceil(missingHP * costPerHP));
            // Show repair between waves (hidden during active wave)
            if (repairUnlocked && !waveActive) {
                repairBtn.style.display = 'inline-block';
                if (missingHP > 0) {
                    repairBtn.textContent = '🔧 Repair ' + fullCost + 'g';
                    repairBtn.disabled = (gold <= 0);
                    repairBtn.style.opacity = '1';
                } else {
                    repairBtn.textContent = '🔧 Repair';
                    repairBtn.disabled = true;
                    repairBtn.style.opacity = '0.5';
                }
                // Hide partial repair hint
                if (repairInfo) repairInfo.style.display = 'none';
            } else {
                repairBtn.style.display = 'none';
                if (repairInfo) repairInfo.style.display = 'none';
            }
        }

        // Wave button
        var waveBtn = document.getElementById('wave-btn');
        if (waveBtn) {
            if (waveActive) {
                waveBtn.textContent = 'Wave ' + wave + ' — ' + Math.round(wp * 100) + '%';
                waveBtn.disabled = true;
                waveBtn.classList.add('active-wave');
            } else {
                waveBtn.textContent = 'Start Wave ' + (wave + 1);
                waveBtn.disabled = false;
                waveBtn.classList.remove('active-wave');
            }
        }
    }

    showGameOverScreen(won, wave, kills, towerKills, totalKills, enemiesReachedBase) {
        this.showGameOver = true;
        this.gameOverWon = won;

        const overlay = document.getElementById('game-over-overlay');
        if (!overlay) return;

        const title = document.getElementById('game-over-title');
        const stats = document.getElementById('game-over-stats');
        const statsDetail = document.getElementById('game-over-stats-detail');

        if (title) {
            title.textContent = won ? 'VICTORY!' : 'DEFEATED';
            title.style.color = won ? '#4CAF50' : '#F44336';
        }
        if (stats) {
            stats.textContent = `Survived ${wave} waves • ${totalKills || kills} kills`;
        }
        if (statsDetail) {
            let detailHTML = '';
            // Tower kill breakdown
            if (towerKills && Object.keys(towerKills).length > 0) {
                detailHTML += '<div style="margin-bottom:6px;color:#fff;font-weight:700;">Tower Kills</div>';
                const sorted = Object.entries(towerKills).sort((a, b) => b[1] - a[1]);
                for (const [typeKey, count] of sorted) {
                    const def = TOWER_DEFS[typeKey];
                    const icon = def ? def.icon : '🗼';
                    const name = def ? def.name : typeKey;
                    detailHTML += `<div class="stat-row"><span class="stat-label">${icon} ${name}</span><span class="stat-value">${count}</span></div>`;
                }
            }
            if (enemiesReachedBase !== undefined && enemiesReachedBase > 0) {
                detailHTML += `<div style="margin-top:6px;" class="stat-row"><span class="stat-label">👾 Reached Castle</span><span class="stat-value" style="color:#F44336;">${enemiesReachedBase}</span></div>`;
            }
            statsDetail.innerHTML = detailHTML;
        }
        overlay.style.display = 'flex';
    }

    hideGameOverScreen() {
        this.showGameOver = false;
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.style.display = 'none';
        const statsDetail = document.getElementById('game-over-stats-detail');
        if (statsDetail) statsDetail.innerHTML = '';
    }

    // --- Setup Screen ---
    showGameSetup(onStart) {
        this._onStart = onStart;
        this._selectedMap = 'crossroads';
        this._selectedDifficulty = 'normal';
        this._celebratedUnlocks = new Set();
        this._pendingUnlockCelebrations = [];
        this._pendingButtonUnlocks = [];

        const screen = document.getElementById('game-setup-screen');
        if (!screen) return;

        // Populate map cards with unlock progression
        const mapContainer = document.getElementById('map-selection');
        if (mapContainer && typeof MAP_DEFS !== 'undefined') {
            mapContainer.innerHTML = '';
            const mapIcons = {
                'crossroads': '🌳',
                'winding_valley': '🏞️',
                'frozen_pass': '❄️',
                'fortress_siege': '🏯',
                'desert_oasis': '🌵',
                'jungle_ruins': '🌴',
                'volcanic_caldera': '🌙',
                'coastal_cliffs': '🏖️',
            };
            // Get beaten maps from localStorage
            let beatenMaps = {};
            try { beatenMaps = JSON.parse(localStorage.getItem('td_beaten_maps') || '{}'); } catch(e) {}
            // Crossroads always unlocked
            beatenMaps['crossroads'] = true;

            for (const [key, mapDef] of Object.entries(MAP_DEFS)) {
                const req = mapDef.unlockRequirement;
                const unlocked = !req || beatenMaps[req];

                const card = document.createElement('div');
                card.className = 'map-card';
                if (!unlocked) card.classList.add('locked');
                if (key === this._selectedMap && unlocked) card.classList.add('selected');
                card.dataset.mapId = key;

                if (unlocked) {
                    card.innerHTML = `
                        <div class="map-icon">${mapIcons[key] || '🗺️'}</div>
                        <div class="map-name">${mapDef.name}</div>
                        <div class="map-desc">${mapDef.description}</div>
                    `;
                    card.addEventListener('click', () => {
                        mapContainer.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        this._selectedMap = key;
                    });
                } else {
                    const reqName = MAP_DEFS[req] ? MAP_DEFS[req].name : req;
                    card.innerHTML = `
                        <div class="map-icon">🔒</div>
                        <div class="map-name">${mapDef.name}</div>
                        <div class="map-desc">Beat ${reqName} to unlock</div>
                    `;
                    card.title = 'Locked — complete ' + reqName + ' first';
                }
                mapContainer.appendChild(card);
            }
        }

        // Bind difficulty buttons
        const diffContainer = document.getElementById('difficulty-selection');
        if (diffContainer) {
            diffContainer.querySelectorAll('.diff-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.difficulty === this._selectedDifficulty);
                btn.onclick = () => {
                    diffContainer.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this._selectedDifficulty = btn.dataset.difficulty;
                };
            });
        }

        // Bind start button
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.onclick = () => {
                this.hideGameSetup();
                // Clear any existing save when starting new game
                try { localStorage.removeItem('td_save'); } catch(e) {}
                if (this._onStart) {
                    this._onStart(this._selectedMap, this._selectedDifficulty);
                }
            };
        }

        // Show Continue button if a save exists
        let saveData = null;
        try { saveData = JSON.parse(localStorage.getItem('td_save') || 'null'); } catch(e) {}
        const continueContainer = document.getElementById('continue-container');
        if (continueContainer) {
            if (saveData && saveData.mapId && saveData.waveNum > 0) {
                const mapName = (typeof MAP_DEFS !== 'undefined' && MAP_DEFS[saveData.mapId]) ? MAP_DEFS[saveData.mapId].name : saveData.mapId;
                continueContainer.innerHTML = `
                    <button id="continue-btn" class="continue-game-btn">
                        ▶ Continue — ${mapName} (Wave ${saveData.waveNum}, ${saveData.gold}g)
                    </button>
                `;
                continueContainer.style.display = 'block';
                document.getElementById('continue-btn').addEventListener('click', () => {
                    this.hideGameSetup();
                    if (typeof window._resumeGame === 'function') {
                        window._resumeGame(saveData);
                    }
                });
            } else {
                continueContainer.style.display = 'none';
                continueContainer.innerHTML = '';
            }
        }

        screen.style.display = 'flex';
    }

    hideGameSetup() {
        const screen = document.getElementById('game-setup-screen');
        if (screen) screen.style.display = 'none';
    }

    showWavePreview(enemyTypes, waveNum, gameSpeed) {
        if (typeof window._showWaveSplash === 'function') {
            window._showWaveSplash(waveNum, enemyTypes, gameSpeed || 1);
        }
    }

    renderHoverPreview(ctx, cell, canPlace, towerType) {
        if (!cell) return;

        const x = cell.col * CELL_SIZE;
        const y = cell.row * CELL_SIZE;

        if (canPlace && towerType) {
            // Valid placement preview
            ctx.fillStyle = COLOR_HOVER_VALID;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

            // Show range preview
            const def = TOWER_DEFS[towerType];
            const range = def.levels[0].range;
            const cx = x + CELL_SIZE / 2;
            const cy = y + CELL_SIZE / 2;

            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Tower preview icon
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.icon, cx, cy);

        } else if (!canPlace && cell) {
            // Invalid placement
            ctx.fillStyle = COLOR_HOVER_INVALID;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
    }

    renderPlacedTowerHighlight(ctx, tower) {
        if (!tower) return;

        const x = tower.col * CELL_SIZE;
        const y = tower.row * CELL_SIZE;

        // Highlight cell
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Pulsing border
        const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.setLineDash([]);
    }

    // Called when canvas is clicked
    handleCanvasClick(cell, game) {
        if (!cell) {
            this.clearSelection();
            return null;
        }

        // Check if clicking on an existing tower
        const clickedTower = game.getTowerAt(cell.col, cell.row);

        if (clickedTower) {
            this.selectPlacedTower(clickedTower);
            return { action: 'selectTower', tower: clickedTower };
        }

        // Try to place a new tower
        if (this.selectedTowerType) {
            const canPlace = canPlaceTower(cell.col, cell.row, game.towers);
            if (canPlace) {
                const towerType = this.selectedTowerType;
                const def = TOWER_DEFS[towerType];
                const cost = def.levels[0].cost;
                if (game.gold >= cost) {
                    this.clearSelection();
                    return { action: 'placeTower', typeKey: towerType, col: cell.col, row: cell.row, cost };
                }
            }
        }

        // Clicked empty, unselect
        this.clearSelection();
        return null;
    }
}
