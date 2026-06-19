// ============================================================
// Tower Defense — Main game initialization and loop
// ============================================================

// Debug logger
function debugLog(msg) {
    console.log('[TD]', msg);
    const el = document.getElementById('debug-msg');
    if (el) el.textContent = msg;
}

(function() {
    'use strict';
    debugLog('Script started');

    // --- Game State ---
    const game = {
        gold: STARTING_GOLD || 280,
        castleHP: CASTLE_STARTING_HP || 2000,
        castleMaxHP: CASTLE_MAX_HP || 2000,
        waveNum: 0,
        kills: 0,
        towers: [],
        enemies: [],
        projectiles: [],
        gameOver: false,
        gameWon: false,
        gameSpeed: 1.0,
        paused: false,
        repairUnlocked: (REPAIR_UNLOCK_WAVE <= 0),
    };

    // --- Systems ---
    let canvas, ctx;
    let waveManager, uiManager, inputManager;
    let lastTimestamp = 0;
    let gameTime = 0;

    // --- Helper: find tower at grid position ---
    game.getTowerAt = function(col, row) {
        return this.towers.find(t => t.col === col && t.row === row) || null;
    };

    // --- Initialize ---
    function init() {
        debugLog('init() called');
        try {
            canvas = document.getElementById('game-canvas');
            if (!canvas) {
                debugLog('ERROR: Canvas not found!');
                return;
            }
            debugLog('Canvas found');

            canvas.width = GAME_WIDTH;
            canvas.height = GAME_HEIGHT;
            ctx = canvas.getContext('2d');
            debugLog('Canvas setup: ' + GAME_WIDTH + 'x' + GAME_HEIGHT);

            // Check that key globals exist
            debugLog('TOWER_DEFS keys: ' + (typeof TOWER_DEFS !== 'undefined' ? Object.keys(TOWER_DEFS).join(', ') : 'UNDEFINED!'));
            debugLog('GRID_DATA: ' + (typeof GRID_DATA !== 'undefined' ? GRID_DATA.length + 'x' + GRID_DATA[0].length : 'UNDEFINED!'));

            // Initialize systems
            waveManager = new WaveManager();
            debugLog('WaveManager created');

            uiManager = new UIManager();
            debugLog('UIManager created, buttons: ' + uiManager.towerButtons.length);

            inputManager = new InputManager(canvas);
            debugLog('InputManager created');

            // Setup callbacks
            inputManager.onClick = (cell, event) => {
                debugLog('Canvas click at cell: ' + (cell ? cell.col + ',' + cell.row : 'null'));
                if (game.gameOver) return;
                const result = uiManager.handleCanvasClick(cell, game);
                if (!result) {
                    debugLog('handleCanvasClick returned null');
                    return;
                }
                debugLog('Action: ' + result.action);
                switch (result.action) {
                    case 'placeTower':
                        placeTower(result.typeKey, result.col, result.row, result.cost);
                        break;
                    case 'selectTower':
                        break;
                }
            };

            inputManager.onRightClick = () => {
                debugLog('Right click — clearing selection');
                uiManager.clearSelection();
            };

            waveManager.onEnemySpawn = (enemy) => {
                game.enemies.push(enemy);
            };

            // Wave button
            const waveBtn = document.getElementById('wave-btn');
            if (waveBtn) {
                waveBtn.addEventListener('click', () => {
                    if (!waveManager.active && !game.gameOver) {
                        debugLog('Starting wave ' + (game.waveNum + 1));
                        startNextWave();
                    }
                });
            }

            // Game speed buttons
            document.getElementById('speed-1x')?.addEventListener('click', () => setGameSpeed(1));
            document.getElementById('speed-2x')?.addEventListener('click', () => setGameSpeed(2));
            document.getElementById('speed-3x')?.addEventListener('click', () => setGameSpeed(3));

            // Restart button
            document.getElementById('restart-btn')?.addEventListener('click', restartGame);

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case '1': game.gameSpeed = 1; updateSpeedButtons(); break;
                    case '2': game.gameSpeed = 2; updateSpeedButtons(); break;
                    case '3': game.gameSpeed = 3; updateSpeedButtons(); break;
                    case 'Escape': uiManager.clearSelection(); break;
                    case ' ':
                        e.preventDefault();
                        if (!waveManager.active && !game.gameOver) startNextWave();
                        break;
                }
            });

            // Expose for HTML buttons
            window._upgradeTower = () => {
                const tower = uiManager.selectedPlacedTower;
                if (!tower) return;
                const cost = tower.getUpgradeCost();
                if (cost === null) return;
                if (game.gold >= cost) {
                    game.gold -= cost;
                    tower.upgrade();
                    uiManager.selectPlacedTower(tower);
                }
            };

            window._repairCastle = () => {
            const maxHP = game.castleMaxHP || CASTLE_MAX_HP || 2000;
            const currentHP = game.castleHP || 0;
            if (currentHP >= maxHP) return;
            if (game.gold <= 0) return;
            // Dynamic cost based on missing HP
            const missingHP = maxHP - currentHP;
            const fullCost = Math.max(1, Math.ceil(missingHP * (REPAIR_COST_PER_HP || 0.30)));
            // Spend whatever gold is available, up to the full cost
            const spent = Math.min(game.gold, fullCost);
            const healAmount = Math.floor((spent / fullCost) * missingHP);
            game.gold -= spent;
            game.castleHP = Math.min(maxHP, currentHP + healAmount);
            if (isNaN(game.castleHP)) game.castleHP = currentHP;
        };

        window._sellTower = () => {
                const tower = uiManager.selectedPlacedTower;
                if (!tower) return;
                const value = tower.getSellValue();
                game.gold += value;
                game.towers = game.towers.filter(t => t !== tower);
                uiManager.clearSelection();
            };

            // Start game loop
            lastTimestamp = performance.now();
            requestAnimationFrame(gameLoop);
            debugLog('Game loop started');

            // Initial HUD update
            uiManager.updateHUD(game, waveManager, 0);
            debugLog('Init complete — Castle: ' + game.castleHP + '/' + game.castleMaxHP + ' Gold: ' + game.gold);
        } catch (err) {
            debugLog('ERROR in init: ' + err.message + ' | stack: ' + err.stack);
            console.error(err);
        }
    }

    function setGameSpeed(speed) {
        game.gameSpeed = speed;
        updateSpeedButtons();
    }

    function updateSpeedButtons() {
        document.querySelectorAll('.speed-btn').forEach(btn => {
            const speed = parseInt(btn.dataset.speed);
            if (speed === game.gameSpeed) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function placeTower(typeKey, col, row, cost) {
        debugLog('Placing ' + typeKey + ' at ' + col + ',' + row + ' for ' + cost + 'g');
        const tower = new Tower(typeKey, col, row);
        game.towers.push(tower);
        game.gold -= cost;
    }

    function startNextWave() {
        game.waveNum++;
        waveManager.startWave(game.waveNum);
    }

    function restartGame() {
        game.gold = STARTING_GOLD;
        game.castleHP = CASTLE_STARTING_HP || 2000;
        game.castleMaxHP = CASTLE_MAX_HP || 2000;
        game.waveNum = 0;
        game.kills = 0;
        game.towers = [];
        game.enemies = [];
        game.projectiles = [];
        game.gameOver = false;
        game.gameWon = false;
        game.gameSpeed = 1;
        game.repairUnlocked = (REPAIR_UNLOCK_WAVE <= 0);
        gameTime = 0;

        waveManager = new WaveManager();
        waveManager.onEnemySpawn = (enemy) => {
            game.enemies.push(enemy);
        };

        activeEffects.clear();
        uiManager.clearSelection();
        uiManager.hideGameOverScreen();
        uiManager.updateHUD(game, waveManager, 0);

        updateSpeedButtons();
        debugLog('Game restarted');
    }

    // --- Update ---
    function update(dt) {
        if (game.gameOver || game.paused) return;

        const cappedDt = Math.min(dt, 0.1);
        gameTime += cappedDt;

        if (waveManager.active) {
            waveManager.update(cappedDt, game.gameSpeed);
        }

        for (const enemy of game.enemies) {
            enemy.update(cappedDt, game.gameSpeed);
        }

        const reachedBase = game.enemies.filter(e => e.reachedBase && e.alive === false && !e._countedAsLost);
        for (const enemy of reachedBase) {
            enemy._countedAsLost = true;
            // Damage = enemy's remaining HP (weakened enemies deal less)
            const rawDmg = Math.floor(enemy.hp);
            const dmg = isNaN(rawDmg) ? 1 : Math.max(1, rawDmg);
            game.castleHP -= dmg;
            if (isNaN(game.castleHP)) game.castleHP = CASTLE_STARTING_HP;
            const baseCell = PATH_CELLS[PATH_CELLS.length - 1];
            const bx = baseCell.c * CELL_SIZE + CELL_SIZE / 2;
            const by = baseCell.r * CELL_SIZE + CELL_SIZE / 2;
            activeEffects.floatingTexts.push(new FloatingText(bx, by - 20, '-' + dmg + ' HP', '#F44336'));
            if (game.castleHP <= 0) {
                game.castleHP = 0;
                game.gameOver = true;
                uiManager.showGameOverScreen(false, game.waveNum, game.kills);
            }
        }

        const deadEnemies = game.enemies.filter(e => !e.alive && !e._cleanedUp);
        for (const enemy of deadEnemies) {
            enemy._cleanedUp = true;
            if (!enemy.reachedBase) {
                game.gold += enemy.gold;
                game.kills++;
                waveManager.onEnemyKilled();
                activeEffects.spawnEnemyDeath(enemy);
            }
        }

        game.enemies = game.enemies.filter(e => e.alive || !e._cleanedUp);

        for (const tower of game.towers) {
            const fireData = tower.update(cappedDt, game.enemies, game.gameSpeed);
            if (fireData) {
                const proj = new Projectile(fireData, game.enemies);
                game.projectiles.push(proj);
            }
        }

        for (const proj of game.projectiles) {
            const effects = proj.update(cappedDt, game.enemies, game.gameSpeed);
            if (effects) {
                activeEffects.processImpactEffects(effects);
            }
        }

        game.projectiles = game.projectiles.filter(p => p.alive);

        activeEffects.update(cappedDt);

        if (waveManager.active && waveManager.isWaveComplete(game.enemies)) {
            const bonus = waveManager.getWaveBonusGold();
            game.gold += bonus;
            waveManager.active = false;
            // Unlock castle repair after certain wave
            if (game.waveNum >= REPAIR_UNLOCK_WAVE) {
                game.repairUnlocked = true;
            }

            const midX = GAME_WIDTH / 2;
            const midY = GAME_HEIGHT / 2 - 40;
            activeEffects.floatingTexts.push(new FloatingText(
                midX, midY,
                'Wave ' + game.waveNum + ' Complete! +' + bonus + 'g',
                '#4CAF50'
            ));
        }

        const waveProgress = waveManager.active ? waveManager.getProgress() : 0;
        uiManager.updateHUD(game, waveManager, waveProgress);
    }

    // --- Render ---
    function render() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Pass castle HP to map renderer for visual damage
        window._castleHPPercent = game.castleHP / game.castleMaxHP;
        renderMap(ctx);
        renderPathArrows(ctx);

        if (inputManager.hoveredCell && uiManager.selectedTowerType && !game.gameOver) {
            const cell = inputManager.hoveredCell;
            const canPlace = canPlaceTower(cell.col, cell.row, game.towers);
            uiManager.renderHoverPreview(ctx, cell, canPlace, uiManager.selectedTowerType);
        }

        if (uiManager.selectedPlacedTower) {
            uiManager.selectedPlacedTower.renderRange(ctx);
            uiManager.renderPlacedTowerHighlight(ctx, uiManager.selectedPlacedTower);
        }

        for (const tower of game.towers) {
            tower.render(ctx);
        }

        for (const enemy of game.enemies) {
            if (enemy.alive) enemy.render(ctx);
        }

        for (const proj of game.projectiles) {
            proj.render(ctx);
        }

        activeEffects.render(ctx);

        if (waveManager.active && waveManager.waveStartTimer > 0) {
            const alpha = Math.min(1, waveManager.waveStartTimer / WAVE_DELAY);
            ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.8) + ')';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                'Wave ' + game.waveNum + ' incoming...',
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2 - 30
            );
        }

        if (game.gameOver && !game.gameWon) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            ctx.fillStyle = '#F44336';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        }
    }

    // --- Game Loop ---
    function gameLoop(timestamp) {
        const dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        update(dt);
        render();

        requestAnimationFrame(gameLoop);
    }

    // --- Start ---
    debugLog('Ready state: ' + document.readyState);
    if (document.readyState === 'loading') {
        debugLog('Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
