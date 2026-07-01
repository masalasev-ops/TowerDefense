// ============================================================
// UI — HUD rendering, tower selection, upgrade/sell panel
// ============================================================
//
// UIManager is responsible for all user interface concerns:
//
//   1. Tower Selection
//      _buildTowerButtons() creates the HTML buttons below the
//      canvas, sorted by tier then unlock wave. Clicking a button
//      calls selectTowerType() to set the placement mode.
//
//   2. Tower Info Panel
//      _showTowerInfo() builds and displays a detailed stats panel
//      for a placed tower, including damage, range, fire rate, DPS,
//      special abilities (splash, chain, stun, radiation, slow),
//      an upgrade preview with stat diffs, and a sell button.
//
//   3. HUD Updates
//      updateHUD() reads game state (gold, castle HP, wave number,
//      kills, repair info) and updates the corresponding DOM elements
//      every frame. Castle HP is color-coded: green >75%, yellow >50%,
//      orange >25%, red <=25%.
//
//   4. Game Setup Screen
//      showGameSetup() renders the map selection screen with cards
//      for each map (locked/unlocked based on beatenMaps in
//      localStorage), difficulty buttons, a start button, and a
//      continue button if a saved game exists.
//
//   5. Game Over Screen
//      showGameOverScreen() displays victory/defeat stats including
//      per-tower kill breakdowns and enemies that reached the castle.
//
//   6. Tower Unlock System
//      updateTowerUnlocks() is called each wave to detect newly
//      eligible towers. It queues unlock data in _pendingButtonUnlocks
//      and _pendingUnlockCelebrations. Between waves, the caller
//      invokes applyPendingUnlocks() to update button visuals and
//      showPendingUnlockCelebrations() to display celebration cards.
//      This prevents mid-wave UI disruptions.
//
//   7. Wave Preview Splash
//      showWavePreview() delegates to the CSS-based HTML splash
//      overlay (built in _setupWaveSplash) to avoid canvas state issues.
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

    /**
     * Build the CSS-based wave splash system.
     *
     * Exposes window._showWaveSplash() which is called by
     * activeEffects.spawnWavePreview() to avoid canvas rendering
     * for the splash card. Creates a full-overlay HTML div with
     * a styled card showing enemy icons/names for the upcoming wave.
     * The splash auto-removes after a duration scaled by gameSpeed.
     */
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

    /**
     * Build the HTML tower selection buttons below the canvas.
     *
     * Towers are sorted by tier then unlock wave. Locked towers
     * show a lock icon and their unlock wave; unlocked towers
     * show their icon, name, and base cost. Clicking a button
     * sets the selected tower type for placement.
     *
     * Each button is stored in this.towerButtons as:
     *   { key: towerTypeKey, element: buttonElement }
     */
    _buildTowerButtons() {
        const container = document.getElementById('tower-buttons');
        if (!container) return;

        container.innerHTML = '';
        // Sort towers by tier then unlock wave
        const entries = Object.entries(TOWER_DEFS).sort((a, b) => {
            if (a[1].tier !== b[1].tier) return a[1].tier - b[1].tier;
            return (a[1].unlockWave || 0) - (b[1].unlockWave || 0);
        });

        for (const [key, towerDefinition] of entries) {
            const buttonEntry = document.createElement('button');
            buttonEntry.className = 'tower-btn';
            buttonEntry.dataset.towerKey = key;
            buttonEntry.dataset.unlockWave = towerDefinition.unlockWave || 0;

            const locked = (this._currentWave || 0) < (towerDefinition.unlockWave || 0);
            if (locked) {
                buttonEntry.classList.add('locked');
                buttonEntry.innerHTML = '<span class="tower-icon">🔒</span><span class="tower-name">' + towerDefinition.name + '</span><span class="tower-cost">Wave ' + towerDefinition.unlockWave + '</span>';
                buttonEntry.title = towerDefinition.name + ' — unlocks after wave ' + towerDefinition.unlockWave;
            } else {
                buttonEntry.innerHTML = '<span class="tower-icon">' + towerDefinition.icon + '</span><span class="tower-name">' + towerDefinition.name + '</span><span class="tower-cost">' + towerDefinition.levels[0].cost + 'g</span>';
                buttonEntry.title = towerDefinition.name + ' (Tier ' + towerDefinition.tier + '): ' + towerDefinition.description;
            }

            buttonEntry.addEventListener('click', () => {
                if (buttonEntry.classList.contains('locked')) return;
                this.selectTowerType(key);
            });
            container.appendChild(buttonEntry);
            this.towerButtons.push({ key, element: buttonEntry });
        }
    }

    // ================================================================
    // Tower Unlock System
    // ================================================================
    //
    // updateTowerUnlocks(currentWave) is called on wave change (from
    // updateHUD). It iterates all tower buttons and detects towers
    // that just became eligible (unlockWave <= currentWave but button
    // was still locked). Such towers are queued in:
    //
    //   _pendingButtonUnlocks   — { btn, def } entries for applyPendingUnlocks
    //   _pendingUnlockCelebrations — towerDef entries for showPendingUnlockCelebrations
    //
    // Between waves, applyPendingUnlocks() updates the button HTML
    // (removes lock icon, shows tower icon/name/cost). Then
    // showPendingUnlockCelebrations() plays the celebration card(s)
    // one at a time with a delay between each.
    //
    // This two-phase approach prevents mid-wave DOM manipulation
    // and gives the player a clear "reveal" moment between waves.

    /**
     * Called when the wave number changes. Scans tower buttons for
     * newly eligible towers and queues their unlock data without
     * modifying the DOM yet.
     */
    updateTowerUnlocks(currentWave) {
        this._currentWave = currentWave;
        if (!this._celebratedUnlocks) this._celebratedUnlocks = new Set();
        if (!this._pendingButtonUnlocks) this._pendingButtonUnlocks = [];

        for (const buttonEntry of this.towerButtons) {
            const unlockWave = parseInt(buttonEntry.element.dataset.unlockWave) || 0;
            const towerDefinition = TOWER_DEFS[buttonEntry.key];

            // unlockWave === 0: available from start
            // unlockWave > 0: available when wave N starts (currentWave >= unlockWave)
            const locked = unlockWave === 0 ? false : currentWave < unlockWave;

            if (locked) {
                // Still locked — ensure locked visuals
                if (!buttonEntry.element.classList.contains('locked')) {
                    buttonEntry.element.classList.add('locked');
                    buttonEntry.element.innerHTML = '<span class="tower-icon">🔒</span><span class="tower-name">' + towerDefinition.name + '</span><span class="tower-cost">Wave ' + unlockWave + '</span>';
                    buttonEntry.element.title = towerDefinition.name + ' — unlocks after wave ' + unlockWave;
                }
            } else if (buttonEntry.element.classList.contains('locked') && unlockWave > 0) {
                // Just became eligible this wave — queue for between-waves reveal
                if (!this._celebratedUnlocks.has(buttonEntry.key)) {
                    this._celebratedUnlocks.add(buttonEntry.key);
                    if (!this._pendingUnlockCelebrations) this._pendingUnlockCelebrations = [];
                    this._pendingUnlockCelebrations.push(towerDefinition);
                    this._pendingButtonUnlocks.push({ btn: buttonEntry, def: towerDefinition });
                }
            }
        }
    }

    /**
     * Apply queued button unlocks (call between waves).
     * Updates button HTML to show the tower icon, name, and cost,
     * and removes the locked class/title.
     */
    applyPendingUnlocks() {
        if (!this._pendingButtonUnlocks) return;
        for (const { btn: buttonEntry, def: towerDefinition } of this._pendingButtonUnlocks) {
            buttonEntry.element.classList.remove('locked');
            buttonEntry.element.innerHTML = '<span class="tower-icon">' + towerDefinition.icon + '</span><span class="tower-name">' + towerDefinition.name + '</span><span class="tower-cost">' + towerDefinition.levels[0].cost + 'g</span>';
            buttonEntry.element.title = towerDefinition.name + ' (Tier ' + towerDefinition.tier + '): ' + towerDefinition.description;
        }
        this._pendingButtonUnlocks = [];
    }

    /**
     * Show queued tower unlock celebrations (call between waves).
     * Plays one celebration card at a time. If multiple unlocks are
     * queued, each subsequent one is delayed by 3.8s.
     */
    showPendingUnlockCelebrations() {
        if (!this._pendingUnlockCelebrations || this._pendingUnlockCelebrations.length === 0) return;
        if (typeof activeEffects === 'undefined') return;
        // Show first queued celebration; subsequent ones will fire as this one ends
        const towerDefinition = this._pendingUnlockCelebrations.shift();
        activeEffects.spawnUnlockCelebration(towerDefinition);
        // If more are queued, schedule them after a delay
        if (this._pendingUnlockCelebrations.length > 0) {
            setTimeout(() => this.showPendingUnlockCelebrations(), 3800);
        }
    }

    // ================================================================

    /**
     * Select or deselect a tower type for placement.
     * Toggling the same type deselects it. Selecting a new type
     * clears any placed-tower selection.
     */
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

    /**
     * Select a placed tower (shows info panel, clears type selection).
     */
    selectPlacedTower(tower) {
        this.selectedPlacedTower = tower;
        this.selectedTowerType = null;
        this._updateButtonStyles();
        this._showTowerInfo(tower);
    }

    /**
     * Clear all selections and hide the tower info panel.
     */
    clearSelection() {
        this.selectedTowerType = null;
        this.selectedPlacedTower = null;
        this._updateButtonStyles();
        this._hideTowerInfo();
    }

    /**
     * Update the CSS 'selected' class on tower buttons to reflect
     * the currently selected tower type.
     */
    _updateButtonStyles() {
        for (const buttonEntry of this.towerButtons) {
            if (buttonEntry.key === this.selectedTowerType) {
                buttonEntry.element.classList.add('selected');
            } else {
                buttonEntry.element.classList.remove('selected');
            }
        }
    }

    /**
     * Build and display the tower info panel for a placed tower.
     *
     * Shows:
     *   - Header: tower icon, current level name, level number (e.g., "Lvl 2/3")
     *   - Stats: damage, range, fire rate, DPS, plus conditional fields
     *     (splash radius, slow %, chain count, armor pierce, radiation DPS,
     *     stun duration)
     *   - Target mode label with emoji and hint to right-click to change
     *   - Upgrade button (or "MAX LEVEL" label) with cost and stat preview
     *   - Sell button with refund value
     *
     * Stat diffs between current and next level are shown in green
     * (+X damage, +Y range, +Z DPS, +splash, +chain, +stun).
     */
    _showTowerInfo(tower) {
        const panel = document.getElementById('tower-info');
        if (!panel) return;

        const towerDefinition = TOWER_DEFS[tower.typeKey];
        const levelStats = towerDefinition.levels[tower.level];
        const nextLevelCost = tower.getUpgradeCost();
        const refundValue = tower.getSellValue();
        const damagePerSecond = Math.round(levelStats.damage * levelStats.fireRate * 10) / 10;

        let upgradeHTML = '';
        if (nextLevelCost !== null) {
            const nextStats = towerDefinition.levels[tower.level + 1];
            const nextDPS = Math.round(nextStats.damage * nextStats.fireRate * 10) / 10;
            const dmgDiff = nextStats.damage - levelStats.damage;
            const rangeDiff = nextStats.range - levelStats.range;
            const dpsDiff = nextDPS - damagePerSecond;
            const frDiff = nextStats.fireRate - levelStats.fireRate;

            let statPreview = '';
            if (dmgDiff > 0) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+${dmgDiff}</span>`;
            if (rangeDiff > 0) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+${rangeDiff}px range</span>`;
            if (dpsDiff > 0) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+${dpsDiff.toFixed(1)} DPS</span>`;
            if (nextStats.splashRadius > (levelStats.splashRadius || 0)) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+splash</span>`;
            if (nextStats.chainCount > (levelStats.chainCount || 0)) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+chain</span>`;
            if (nextStats.stunDuration && !levelStats.stunDuration) statPreview += ` <span style="color:#4CAF50;font-size:11px;">+stun</span>`;

            upgradeHTML = `<button class="info-btn upgrade-btn" data-action="upgrade">
                    Upgrade to ${nextStats.name} (${nextLevelCost}g)
                </button>
                <div style="font-size:10px;color:#aaa;margin-top:3px;">${statPreview}</div>`;
        } else {
            upgradeHTML = `<span class="max-level">MAX LEVEL</span>`;
        }

        const modeLabel = tower.getTargetModeLabel();
        const modeEmoji = { 'Furthest Along': '🎯', 'Strongest': '💪', 'Lowest HP': '💀', 'Fastest': '💨' }[modeLabel] || '🎯';

        panel.innerHTML = `
            <div class="tower-info-header">
                <span class="tower-info-icon">${towerDefinition.icon}</span>
                <span class="tower-info-name">${levelStats.name}</span>
                <span class="tower-info-level">Lvl ${tower.level + 1}/3</span>
            </div>
            <div class="tower-info-stats">
                <div>Damage: <b>${levelStats.damage}</b></div>
                <div>Range: <b>${levelStats.range}</b></div>
                <div>Fire Rate: <b>${levelStats.fireRate.toFixed(1)}/s</b></div>
                <div>DPS: <b>${damagePerSecond}</b></div>
                ${levelStats.splashRadius > 0 ? `<div>Splash: <b>${levelStats.splashRadius}px</b></div>` : ''}
                ${levelStats.slow > 0 ? `<div>Slow: <b>${Math.round(levelStats.slow * 100)}%</b></div>` : ''}
                ${levelStats.chainCount > 0 ? `<div>Chains: <b>${levelStats.chainCount}</b></div>` : ''}
                ${levelStats.armorPierce > 0 ? `<div>Armor Pierce: <b>${Math.round(levelStats.armorPierce * 100)}%</b></div>` : ''}
                ${levelStats.radiationDPS > 0 ? `<div>Radiation: <b>${levelStats.radiationDPS} DPS</b></div>` : ''}
                ${levelStats.stunDuration > 0 ? `<div>Stun: <b>${levelStats.stunDuration.toFixed(1)}s</b></div>` : ''}
                <div style="margin-top:6px;color:#FFD600;font-size:11px;">${modeEmoji} Target: ${modeLabel} <span style="color:#888;font-size:9px;">(right-click to change)</span></div>
            </div>
            <div class="tower-info-actions">
                ${upgradeHTML}
                <button class="info-btn sell-btn" data-action="sell">
                    Sell (${refundValue}g)
                </button>
            </div>
        `;
        panel.style.display = 'block';

        // Wire up data-action buttons via delegation
        this._wireTowerInfoActions();
    }

    /**
     * Set up event delegation on the tower info panel for
     * upgrade and sell buttons (identified by data-action).
     */
    _wireTowerInfoActions() {
        const panel = document.getElementById('tower-info');
        if (!panel || panel._wired) return;
        panel._wired = true;
        panel.addEventListener('click', (e) => {
            const buttonEntry = e.target.closest('[data-action]');
            if (!buttonEntry) return;
            switch (buttonEntry.dataset.action) {
                case 'upgrade':
                    if (typeof window._upgradeTower === 'function') window._upgradeTower();
                    break;
                case 'sell':
                    if (typeof window._sellTower === 'function') window._sellTower();
                    break;
            }
        });
    }

    /**
     * Hide the tower info panel.
     */
    _hideTowerInfo() {
        const panel = document.getElementById('tower-info');
        if (panel) {
            panel.style.display = 'none';
            panel._wired = false;
        }
    }

    /**
     * Update all HUD elements from game state.
     *
     * Reads from the game object directly:
     *   - Gold (documented via debug log if not found)
     *   - Castle HP with color coding:
     *       > 75%  -> green (#4CAF50)
     *       > 50%  -> yellow (#FFC107)
     *       > 25%  -> orange (#FF9800)
     *       <= 25% -> red (#F44336)
     *   - Wave number
     *   - Kills
     *   - Wave button (shows progress during active wave, "Start Wave N" otherwise)
     *   - Repair button (visible between waves when repair is unlocked and
     *     castle is damaged; shows cost and disables if insufficient gold)
     *
     * Also calls updateTowerUnlocks() when the wave number changes.
     */
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

    /**
     * Display the game over overlay with victory/defeat stats.
     *
     * Shows:
     *   - VICTORY! / DEFEATED title (color-coded green/red)
     *   - Summary: waves survived, total kills
     *   - Per-tower kill breakdown (icon + name + count, sorted by most kills)
     *   - Number of enemies that reached the castle (if any)
     */
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
                const sortedKills = Object.entries(towerKills).sort((a, b) => b[1] - a[1]);
                for (const [towerTypeKey, count] of sortedKills) {
                    const towerDefinition = TOWER_DEFS[towerTypeKey];
                    const icon = towerDefinition ? towerDefinition.icon : '🗼';
                    const name = towerDefinition ? towerDefinition.name : towerTypeKey;
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

    /**
     * Hide the game over overlay and clear stats detail.
     */
    hideGameOverScreen() {
        this.showGameOver = false;
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.style.display = 'none';
        const statsDetail = document.getElementById('game-over-stats-detail');
        if (statsDetail) statsDetail.innerHTML = '';
    }

    // ================================================================
    // Setup Screen
    // ================================================================

    /**
     * Build and display the game setup screen.
     *
     * Elements:
     *   Map cards — Each map from MAP_DEFS gets a card showing its
     *     icon, name, and description. Locked maps (those whose
     *     unlockRequirement hasn't been beaten) show a lock icon
     *     and the name of the map required to unlock them. "Crossroads"
     *     is always unlocked. Beat status is read from localStorage
     *     key "td_beaten_maps".
     *
     *   Difficulty buttons — Toggle-selection for difficulty modes
     *     (easy/normal/hard/insane). Default: "normal".
     *
     *   Start button — Hides the setup screen, clears any saved
     *     game, and fires the onStart callback with the selected
     *     map and difficulty.
     *
     *   Continue button — If a save exists in localStorage
     *     ("td_save"), shows a button to resume that game.
     */
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
                const unlockRequirement = mapDef.unlockRequirement;
                const unlocked = !unlockRequirement || beatenMaps[unlockRequirement];

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
                    const requiredMapName = MAP_DEFS[unlockRequirement] ? MAP_DEFS[unlockRequirement].name : unlockRequirement;
                    card.innerHTML = `
                        <div class="map-icon">🔒</div>
                        <div class="map-name">${mapDef.name}</div>
                        <div class="map-desc">Beat ${requiredMapName} to unlock</div>
                    `;
                    card.title = 'Locked — complete ' + requiredMapName + ' first';
                }
                mapContainer.appendChild(card);
            }
        }

        // Bind difficulty buttons
        const diffContainer = document.getElementById('difficulty-selection');
        if (diffContainer) {
            diffContainer.querySelectorAll('.diff-btn').forEach(buttonEntry => {
                buttonEntry.classList.toggle('selected', buttonEntry.dataset.difficulty === this._selectedDifficulty);
                buttonEntry.onclick = () => {
                    diffContainer.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
                    buttonEntry.classList.add('selected');
                    this._selectedDifficulty = buttonEntry.dataset.difficulty;
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

    /**
     * Hide the game setup screen.
     */
    hideGameSetup() {
        const screen = document.getElementById('game-setup-screen');
        if (screen) screen.style.display = 'none';
    }

    /**
     * Show the wave preview splash (delegates to CSS-based HTML overlay).
     */
    showWavePreview(enemyTypes, waveNum, gameSpeed) {
        if (typeof window._showWaveSplash === 'function') {
            window._showWaveSplash(waveNum, enemyTypes, gameSpeed || 1);
        }
    }

    /**
     * Render hover preview on the canvas at the given cell.
     *
     * If a tower type is selected and placement is valid:
     *   - Fills the cell with a valid-placement color
     *   - Draws a dashed range circle
     *   - Shows the tower icon at reduced opacity
     *
     * If placement is invalid:
     *   - Fills the cell with an invalid-placement color
     */
    renderHoverPreview(ctx, cell, canPlace, towerType) {
        if (!cell) return;

        const x = cell.col * CELL_SIZE;
        const y = cell.row * CELL_SIZE;

        if (canPlace && towerType) {
            // Valid placement preview
            ctx.fillStyle = COLOR_HOVER_VALID;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

            // Show range preview
            const towerDefinition = TOWER_DEFS[towerType];
            const range = towerDefinition.levels[0].range;
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
            ctx.fillText(towerDefinition.icon, cx, cy);

        } else if (!canPlace && cell) {
            // Invalid placement
            ctx.fillStyle = COLOR_HOVER_INVALID;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
    }

    /**
     * Render a pulsing highlight on a placed tower's cell.
     * Used to indicate the currently selected tower.
     */
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

    /**
     * Handle a canvas click event at the given cell.
     *
     * Resolution order:
     *   1. If a placed tower is at the clicked cell, select it.
     *   2. Else if a tower type is selected for placement and the
     *      cell is valid and affordable, queue a placeTower action.
     *   3. Otherwise, clear selection.
     *
     * Returns an action object or null:
     *   { action: 'selectTower', tower }   — existing tower selected
     *   { action: 'placeTower', typeKey, col, row, cost } — new tower to place
     *   null  — nothing actionable
     */
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
                const towerDefinition = TOWER_DEFS[towerType];
                const cost = towerDefinition.levels[0].cost;
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
