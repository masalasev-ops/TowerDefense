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
    }

    _buildTowerButtons() {
        const container = document.getElementById('tower-buttons');
        if (!container) return;

        container.innerHTML = '';
        // Sort towers by tier then name
        const entries = Object.entries(TOWER_DEFS).sort((a, b) => {
            if (a[1].tier !== b[1].tier) return a[1].tier - b[1].tier;
            return a[1].name.localeCompare(b[1].name);
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

    // Called when wave changes to update locked/unlocked state
    updateTowerUnlocks(currentWave) {
        this._currentWave = currentWave;
        for (const btn of this.towerButtons) {
            const unlockWave = parseInt(btn.element.dataset.unlockWave) || 0;
            const locked = currentWave < unlockWave;
            const def = TOWER_DEFS[btn.key];
            if (locked) {
                btn.element.classList.add('locked');
                btn.element.innerHTML = '<span class="tower-icon">🔒</span><span class="tower-name">' + def.name + '</span><span class="tower-cost">Wave ' + unlockWave + '</span>';
                btn.element.title = def.name + ' — unlocks after wave ' + unlockWave;
            } else if (btn.element.classList.contains('locked')) {
                btn.element.classList.remove('locked');
                btn.element.innerHTML = '<span class="tower-icon">' + def.icon + '</span><span class="tower-name">' + def.name + '</span><span class="tower-cost">' + def.levels[0].cost + 'g</span>';
                btn.element.title = def.name + ' (Tier ' + def.tier + '): ' + def.description;
            }
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

        let upgradeHTML = '';
        if (upgradeCost !== null) {
            const nextStats = def.levels[tower.level + 1];
            upgradeHTML = `
                <button class="info-btn upgrade-btn" onclick="window._upgradeTower()">
                    Upgrade to ${nextStats.name} (${upgradeCost}g)
                </button>
            `;
        } else {
            upgradeHTML = `<span class="max-level">MAX LEVEL</span>`;
        }

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
                ${stats.splashRadius > 0 ? `<div>Splash: <b>${stats.splashRadius}px</b></div>` : ''}
                ${stats.slow > 0 ? `<div>Slow: <b>${Math.round(stats.slow * 100)}%</b></div>` : ''}
                ${stats.chainCount > 0 ? `<div>Chains: <b>${stats.chainCount}</b></div>` : ''}
                ${stats.armorPierce > 0 ? `<div>Armor Pierce: <b>${Math.round(stats.armorPierce * 100)}%</b></div>` : ''}
                ${stats.radiationDPS > 0 ? `<div>Radiation: <b>${stats.radiationDPS} DPS</b></div>` : ''}
            </div>
            <div class="tower-info-actions">
                ${upgradeHTML}
                <button class="info-btn sell-btn" onclick="window._sellTower()">
                    Sell (${sellValue}g)
                </button>
            </div>
        `;
        panel.style.display = 'block';
    }

    _hideTowerInfo() {
        const panel = document.getElementById('tower-info');
        if (panel) panel.style.display = 'none';
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
                // Show partial repair hint
                if (repairInfo && missingHP > 0 && gold < fullCost) {
                    repairInfo.style.display = 'inline';
                    var partialHeal = Math.floor((gold / fullCost) * missingHP);
                    repairInfo.textContent = '(heals ~' + partialHeal + ' HP)';
                } else if (repairInfo) {
                    repairInfo.style.display = 'none';
                }
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

    showGameOverScreen(won, wave, kills) {
        this.showGameOver = true;
        this.gameOverWon = won;

        const overlay = document.getElementById('game-over-overlay');
        if (!overlay) return;

        const title = document.getElementById('game-over-title');
        const stats = document.getElementById('game-over-stats');

        if (title) {
            title.textContent = won ? 'VICTORY!' : 'DEFEATED';
            title.style.color = won ? '#4CAF50' : '#F44336';
        }
        if (stats) {
            stats.textContent = `Survived ${wave} waves • ${kills} kills`;
        }
        overlay.style.display = 'flex';
    }

    hideGameOverScreen() {
        this.showGameOver = false;
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // --- Setup Screen ---
    showGameSetup(onStart) {
        this._onStart = onStart;
        this._selectedMap = 'crossroads';
        this._selectedDifficulty = 'normal';

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
                if (this._onStart) {
                    this._onStart(this._selectedMap, this._selectedDifficulty);
                }
            };
        }

        screen.style.display = 'flex';
    }

    hideGameSetup() {
        const screen = document.getElementById('game-setup-screen');
        if (screen) screen.style.display = 'none';
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
