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
        mapId: 'crossroads',
        difficulty: 'normal',
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

    // --- Game Start Callback (from setup screen) ---
    function onGameStart(mapId, difficulty) {
        // Initialize audio context on user gesture
        if (typeof SoundManager !== 'undefined') SoundManager.init();

        // Set globals before initializing game state
        if (typeof CURRENT_DIFFICULTY !== 'undefined') {
            CURRENT_DIFFICULTY = difficulty;
        }
        game.mapId = mapId;
        game.difficulty = difficulty;

        // Apply map
        if (typeof setActiveMap === 'function') {
            setActiveMap(mapId);
        }

        // Apply difficulty-aware starting gold
        const diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[difficulty])
            ? DIFFICULTY_DEFS[difficulty] : { startingGold: STARTING_GOLD };
        game.gold = diff.startingGold || STARTING_GOLD;
        game.castleHP = CASTLE_STARTING_HP || 2000;
        game.castleMaxHP = CASTLE_MAX_HP || 2000;
        game.waveNum = 0;
        game.kills = 0;
        game.towers = [];
        game.enemies = [];
        game.projectiles = [];
        game.gameOver = false;
        game.gameWon = false;
        game.endless = false;
        game.gameSpeed = 1;
        game.repairUnlocked = (REPAIR_UNLOCK_WAVE <= 0);
        gameTime = 0;

        // Reset systems
        waveManager = new WaveManager();
        waveManager.onEnemySpawn = (enemy) => {
            game.enemies.push(enemy);
        };

        activeEffects.clear();
        uiManager.clearSelection();
        uiManager.hideGameOverScreen();
        updateSpeedButtons();

        // Update tower unlock states for fresh game
        uiManager.updateTowerUnlocks(0);

        debugLog('Game started: map=' + mapId + ' difficulty=' + difficulty);
    }

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

            // Load default map before anything touches GRID_DATA
            if (typeof setActiveMap === 'function' && typeof MAP_DEFS !== 'undefined' && MAP_DEFS.crossroads) {
                setActiveMap('crossroads');
            }

            // Check that key globals exist
            debugLog('TOWER_DEFS keys: ' + (typeof TOWER_DEFS !== 'undefined' ? Object.keys(TOWER_DEFS).join(', ') : 'UNDEFINED!'));
            debugLog('GRID_DATA: ' + (typeof GRID_DATA !== 'undefined' && GRID_DATA.length ? GRID_DATA.length + 'x' + GRID_DATA[0].length : 'UNDEFINED!'));

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
                // Initialize audio on first interaction
                if (typeof SoundManager !== 'undefined') SoundManager.init();
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

            // Restart button — play again with same map/difficulty
            document.getElementById('restart-btn')?.addEventListener('click', restartGame);

            // Main Menu button — go back to setup
            document.getElementById('main-menu-btn')?.addEventListener('click', () => {
                uiManager.hideGameOverScreen();
                uiManager.showGameSetup(onGameStart);
            });

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
                    if (typeof SoundManager !== 'undefined') SoundManager.towerUpgrade();
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
                if (typeof SoundManager !== 'undefined') SoundManager.towerSell();
                uiManager.clearSelection();
            };

            // Start game loop (renders in background behind setup screen)
            lastTimestamp = performance.now();
            requestAnimationFrame(gameLoop);
            debugLog('Game loop started');

            // Initial HUD update
            uiManager.updateHUD(game, waveManager, 0);
            debugLog('Init complete');

            // Show setup screen on top
            uiManager.showGameSetup(onGameStart);
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
        if (typeof SoundManager !== 'undefined') SoundManager.towerPlace();
    }

    function startNextWave() {
        game.waveNum++;
        waveManager.startWave(game.waveNum);
        if (typeof SoundManager !== 'undefined') SoundManager.waveStart();
    }

    function restartGame() {
        // Determine starting gold from difficulty
        const diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[game.difficulty])
            ? DIFFICULTY_DEFS[game.difficulty] : { startingGold: STARTING_GOLD };
        game.gold = diff.startingGold || STARTING_GOLD;
        game.castleHP = CASTLE_STARTING_HP || 2000;
        game.castleMaxHP = CASTLE_MAX_HP || 2000;
        game.waveNum = 0;
        game.kills = 0;
        game.towers = [];
        game.enemies = [];
        game.projectiles = [];
        game.gameOver = false;
        game.gameWon = false;
        game.endless = false;
        game.gameSpeed = 1;
        game.repairUnlocked = (REPAIR_UNLOCK_WAVE <= 0);
        gameTime = 0;

        // Apply active map and difficulty
        if (typeof setActiveMap === 'function') {
            setActiveMap(game.mapId);
        }
        if (typeof CURRENT_DIFFICULTY !== 'undefined') {
            CURRENT_DIFFICULTY = game.difficulty;
        }

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

        // Healer tick: heal nearby damaged enemies
        for (const healer of game.enemies) {
            if (!healer.alive || !healer.healAmount) continue;
            if (healer.healTimer >= healer.healInterval) {
                healer.healTimer = 0;
                for (const other of game.enemies) {
                    if (!other.alive || other === healer) continue;
                    if (other.hp >= other.maxHp) continue;
                    const dx = other.x - healer.x;
                    const dy = other.y - healer.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= healer.healRadius) {
                        const healed = Math.min(other.maxHp - other.hp, healer.healAmount);
                        other.hp += healed;
                        activeEffects.floatingTexts.push(new FloatingText(
                            other.x, other.y - other.size, '+' + Math.floor(healed), '#4CAF50'
                        ));
                        break; // heal one per tick
                    }
                }
            }
        }

        const reachedBase = game.enemies.filter(e => e.reachedBase && e.alive === false && !e._countedAsLost);
        for (const enemy of reachedBase) {
            enemy._countedAsLost = true;
            // Damage = enemy's remaining HP (weakened enemies deal less)
            const rawDmg = Math.floor(enemy.hp);
            const dmg = isNaN(rawDmg) ? 1 : Math.max(1, rawDmg);
            game.castleHP -= dmg;
            if (isNaN(game.castleHP)) game.castleHP = CASTLE_STARTING_HP;
            if (typeof SoundManager !== 'undefined') SoundManager.enemyReachBase();
            const baseCell = PATH_CELLS[PATH_CELLS.length - 1];
            const bx = baseCell.c * CELL_SIZE + CELL_SIZE / 2;
            const by = baseCell.r * CELL_SIZE + CELL_SIZE / 2;
            activeEffects.floatingTexts.push(new FloatingText(bx, by - 20, '-' + dmg + ' HP', '#F44336'));
            if (game.castleHP <= 0) {
                game.castleHP = 0;
                game.gameOver = true;
                if (typeof SoundManager !== 'undefined') SoundManager.gameOver();
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
                if (typeof SoundManager !== 'undefined') SoundManager.enemyDie(enemy.typeKey);

                // Splitter spawn on death
                if (enemy.splitCount > 0 && enemy.splitChildType) {
                    for (let i = 0; i < enemy.splitCount; i++) {
                        const minion = new Enemy(enemy.splitChildType, game.waveNum);
                        minion.x = enemy.x + (Math.random() - 0.5) * 16;
                        minion.y = enemy.y + (Math.random() - 0.5) * 16;
                        minion.waypointIndex = Math.min(enemy.waypointIndex, WAYPOINTS.length - 1);
                        game.enemies.push(minion);
                        // Count minion in wave total
                        waveManager.totalEnemiesInWave++;
                    }
                }
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
            if (typeof SoundManager !== 'undefined') SoundManager.waveComplete();
            // Unlock castle repair after certain wave
            if (game.waveNum >= REPAIR_UNLOCK_WAVE) {
                game.repairUnlocked = true;
            }

            // Castle healing on Easy mode
            const diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[game.difficulty])
                ? DIFFICULTY_DEFS[game.difficulty] : { healCastlePerWave: 0 };
            if (diff.healCastlePerWave > 0) {
                const healAmt = Math.min(diff.healCastlePerWave, game.castleMaxHP - game.castleHP);
                game.castleHP += healAmt;
                if (healAmt > 0) {
                    const midX = GAME_WIDTH / 2;
                    const midY = GAME_HEIGHT / 2 - 60;
                    activeEffects.floatingTexts.push(new FloatingText(
                        midX, midY, '+ ' + healAmt + ' Castle HP', '#4CAF50'
                    ));
                }
            }

            // Unlock next map after wave 10
            if (game.waveNum >= 10 && game.mapId) {
                try {
                    const beaten = JSON.parse(localStorage.getItem('td_beaten_maps') || '{}');
                    if (!beaten[game.mapId]) {
                        beaten[game.mapId] = true;
                        localStorage.setItem('td_beaten_maps', JSON.stringify(beaten));
                    }
                } catch(e) {}
            }

            // Win condition — difficulty-based wave threshold
            const WAVES_TO_WIN = game.difficulty === 'hard' ? 25 : game.difficulty === 'easy' ? 15 : 20;
            if (game.waveNum === WAVES_TO_WIN) {
                game.gameWon = true;
                const mapName = (typeof MAP_DEFS !== 'undefined' && MAP_DEFS[game.mapId]) ? MAP_DEFS[game.mapId].name : '';
                if (typeof SoundManager !== 'undefined') SoundManager.waveComplete();
                activeEffects.floatingTexts.push(new FloatingText(
                    GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
                    mapName + ' Conquered! 🏆', '#FFD700'
                ));
                activeEffects.floatingTexts.push(new FloatingText(
                    GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20,
                    'Endless mode — keep going!', '#FF9800'
                ));
                game.endless = true;
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
            const waveDelay = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[game.difficulty])
                ? DIFFICULTY_DEFS[game.difficulty].waveDelay : WAVE_DELAY;
            const alpha = Math.min(1, waveManager.waveStartTimer / waveDelay);
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

        // Endless mode indicator
        if (game.endless && !game.gameOver) {
            ctx.fillStyle = 'rgba(255,152,0,0.8)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('ENDLESS', GAME_WIDTH - 10, 18);
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
