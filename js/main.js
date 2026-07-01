// ============================================================
// Tower Defense — Main game initialization and loop
// ============================================================
//
// This file is the core orchestrator. It owns the game state,
// runs the per-frame update/render loop, and wires up all
// subsystems (WaveManager, UIManager, InputManager) together.
//
// Architecture:
//   init()           — one-time setup at page load
//   gameLoop()       — requestAnimationFrame callback (infinite)
//     update(dt)     — process game logic for this frame
//     render()       — draw everything to canvas
//
// The game state object (game) is the single source of truth
// for player resources, entity lists, and game status. Every
// subsystem reads from and writes to it.

// Debug logger (disable by setting DEBUG = false)
const DEBUG = false;
function debugLog(msg) {
    if (!DEBUG) return;
    console.log('[TD]', msg);
    const el = document.getElementById('debug-msg');
    if (el) el.textContent = msg;
}

(function() {
    'use strict';
    debugLog('Script started');

    /**
     * Game State Object — central data store for the entire game.
     *
     * FIELD                    LIFECYCLE / NOTES
     * -----                    -----------------
     * gold                     Persisted across waves. Earned from kills and
     *                          wave-completion bonuses. Spent on towers and
     *                          upgrades. Reset on game start/restart.
     *
     * castleHP / castleMaxHP   Current and maximum castle health. Depleted
     *                          when enemies reach the base. If castleHP <= 0,
     *                          the game is lost (gameOver = true). castleMaxHP
     *                          is constant; castleHP is reset on restart.
     *
     * waveNum                  Current wave number (0 before first wave).
     *                          Incremented by startNextWave(). Determines
     *                          difficulty scaling and tower unlock gates.
     *
     * kills / totalKills       kills: enemies slain this wave (resets each
     *                          wave? No — only increments). totalKills:
     *                          cumulative across all waves. Both increment
     *                          when an enemy dies without reaching the base.
     *
     * towers                   Array of Tower instances. Built by placeTower(),
     *                          filtered on sell. Each tower updates per frame.
     *
     * enemies                  Array of Enemy instances. Added via
     *                          waveManager.onEnemySpawn, filtered every frame
     *                          to remove dead/base-reached entities.
     *
     * projectiles              Array of Projectile instances. Created by tower
     *                          fire events, filtered when they expire/impact.
     *
     * healers                  Rebuilt every frame from alive enemies with
     *                          healAmount > 0. Separate list avoids iterating
     *                          all enemies for healing logic.
     *
     * gameOver / gameWon       Terminal flags. gameOver = true when castleHP
     *                          hits 0. gameWon = true after the last predefined
     *                          wave (endless mode continues after that).
     *
     * gameSpeed                Multiplier for dt in update calls (1x/2x/3x).
     *                          Does not affect rendering, only logic timesteps.
     *
     * paused                   When true, update() returns immediately —
     *                          nothing advances. Render still runs (shows
     *                          PAUSED overlay).
     *
     * repairUnlocked           Becomes true after wave REPAIR_UNLOCK_WAVE or
     *                          on game start if REPAIR_UNLOCK_WAVE <= 0.
     *
     * mapId                    Currently active map identifier (e.g. 'crossroads').
     *                          Used to look up MAP_DEFS for rendering.
     *
     * difficulty / diff        difficulty: string key ('easy'/'normal'/'hard').
     *                          diff: cached reference to the corresponding
     *                          DIFFICULTY_DEFS entry (enemy HP multiplier,
     *                          gold modifiers, wave count, etc.).
     *
     * towerKills               Object mapping tower typeKey strings to kill
     *                          counts. Updated when an enemy dies with a
     *                          _killedByTowerType set. Used for stats display.
     *
     * enemiesReachedBase       Cumulative count of enemies that reached the
     *                          castle (alive or not). Incremented in the death
     *                          processing loop and displayed in wave summaries.
     *
     * totalKills               Total enemies killed across all waves (not just
     *                          this session — persists in save data).
     *
     * endless                  Set to true after the final victory wave.
     *                          Disables future win checks and shows an
     *                          "ENDLESS" indicator on the HUD.
     *
     * getTowerAt(col, row)     Helper method to find a tower at a given grid
     *                          position. Returns the Tower instance or null.
     */
    const game = {
        gold: STARTING_GOLD || 280,
        castleHP: CASTLE_STARTING_HP || 2000,
        castleMaxHP: CASTLE_MAX_HP || 2000,
        waveNum: 0,
        kills: 0,
        towers: [],
        enemies: [],
        projectiles: [],
        healers: [],          // separate ref to healers for fast tick
        gameOver: false,
        gameWon: false,
        gameSpeed: 1.0,
        paused: false,
        repairUnlocked: (REPAIR_UNLOCK_WAVE <= 0),
        mapId: 'crossroads',
        difficulty: 'normal',
        diff: DIFFICULTY_DEFS.normal,  // cached active difficulty
        towerKills: {},      // per-tower-type kill tracking
        enemiesReachedBase: 0,
        totalKills: 0,
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
        // Initialize audio context on user gesture (browsers require
        // user interaction before AudioContext can be created)
        if (typeof SoundManager !== 'undefined') SoundManager.init();

        // Set globals before initializing game state
        if (typeof CURRENT_DIFFICULTY !== 'undefined') {
            CURRENT_DIFFICULTY = difficulty;
        }
        game.mapId = mapId;
        game.difficulty = difficulty;
        game.diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[difficulty])
            ? DIFFICULTY_DEFS[difficulty] : DIFFICULTY_DEFS.normal;

        // Apply map — builds GRID_DATA, waypoints, decorations via setActiveMap
        if (typeof setActiveMap === 'function') {
            setActiveMap(mapId);
        }

        // Apply difficulty-aware starting gold
        game.gold = game.diff.startingGold || STARTING_GOLD;
        game.castleHP = CASTLE_STARTING_HP || 2000;
        game.castleMaxHP = CASTLE_MAX_HP || 2000;
        game.waveNum = 0;
        game.kills = 0;
        game.towers = [];
        game.enemies = [];
        game.healers = [];
        game.projectiles = [];
        game.gameOver = false;
        game.gameWon = false;
        game.endless = false;
        game.gameSpeed = 1;
        game.repairUnlocked = (REPAIR_UNLOCK_WAVE <= 0);
        game.towerKills = {};
        game.enemiesReachedBase = 0;
        game.totalKills = 0;
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
    /**
     * One-time initialization called on DOMContentLoaded.
     *
     * LOAD ORDER (critical):
     *   1. Canvas lookup and sizing — must succeed before any drawing.
     *   2. setActiveMap('crossroads') — GRID_DATA must be populated before
     *      anything reads it (e.g. tower defs, waypoint calculations).
     *      The default map is loaded here so that clicking "Start" on the
     *      setup screen immediately has a valid map already configured.
     *   3. WaveManager — depends on wave definitions being available.
     *   4. UIManager — depends on GRID_DATA for tower placement preview,
     *      and on canvas dimensions for layout calculations.
     *   5. InputManager — depends on canvas for event listeners.
     *   6. Callback wiring (onClick, onRightClick, onEnemySpawn) — these
     *      reference game state and other managers, so they must be wired
     *      after all managers are instantiated.
     *   7. UI button event listeners — DOM elements must exist in the page.
     *   8. Keyboard shortcuts — global listeners, no dependency.
     *   9. requestAnimationFrame(gameLoop) — starts the infinite update/render
     *      loop. This runs even while the setup screen is shown (the loop
     *      renders behind the setup overlay).
     *  10. uiManager.showGameSetup() — shows the map/difficulty selection
     *      screen. Called last so everything is ready.
     */
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
            // This must happen early because UIManager and tower placement
            // logic need to read GRID_DATA immediately.
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

            inputManager.onRightClick = (cell) => {
                // Check if right-clicking on a placed tower — cycle targeting mode
                if (cell) {
                    const tower = game.getTowerAt(cell.col, cell.row);
                    if (tower) {
                        const newMode = tower.cycleTargetMode();
                        debugLog('Tower targeting mode cycled to: ' + newMode);
                        uiManager.selectPlacedTower(tower); // refresh info panel
                        return;
                    }
                }
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

            // Pause button
            document.getElementById('pause-btn')?.addEventListener('click', togglePause);

            // Mute button
            document.getElementById('mute-btn')?.addEventListener('click', toggleMute);

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
                    case '1': setGameSpeed(1); break;
                    case '2': setGameSpeed(2); break;
                    case '3': setGameSpeed(3); break;
                    case 'p': case 'P': togglePause(); break;
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
            const fullCost = Math.max(REPAIR_MIN_COST || 25, Math.ceil(missingHP * (REPAIR_COST_PER_HP || 0.30)));
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

    // --- Save / Resume ---
    /**
     * Save current game state to localStorage.
     *
     * SAVED FIELDS:
     *   mapId, difficulty    — needed to restore the correct map and difficulty modifiers
     *   waveNum              — which wave to resume from
     *   gold                 — player's treasury
     *   castleHP             — base health (castleMaxHP is constant, not saved)
     *   kills, totalKills    — kill statistics for display
     *   towerKills           — per-tower-type kill tracking for stats
     *   enemiesReachedBase   — cumulative counter for wave summaries
     *   endless              — whether endless mode was unlocked
     *   towers               — array of {typeKey, col, row, level, totalInvested}
     *                         Serialized as minimal data (not full Tower instances)
     *                         so they can be reconstructed with new Tower() on load.
     *
     * WHAT IS NOT SAVED (and why):
     *   enemies/projectiles/healers  — these are transient per-wave state.
     *                                   Saving mid-wave would introduce complexity
     *                                   with little benefit since waves are short.
     *   active effects/floating texts — purely visual, not worth serializing.
     *   waveManager internals         — too coupled to internal implementation.
     *                                   Simplest to just resume between waves.
     *
     * Save is written to localStorage key 'td_save' after each wave completion.
     * It is cleared on game over (defeat) so the player cannot resume a lost game.
     */
    function saveGame() {
        try {
            const saveData = {
                mapId: game.mapId,
                difficulty: game.difficulty,
                waveNum: game.waveNum,
                gold: game.gold,
                castleHP: game.castleHP,
                kills: game.kills,
                totalKills: game.totalKills,
                towerKills: game.towerKills,
                enemiesReachedBase: game.enemiesReachedBase,
                endless: game.endless || false,
                towers: game.towers.map(t => ({ typeKey: t.typeKey, col: t.col, row: t.row, level: t.level, totalInvested: t.totalInvested })),
            };
            localStorage.setItem('td_save', JSON.stringify(saveData));
        } catch(e) { /* storage full or unavailable — silently fail */ }
    }

    function loadGame() {
        try {
            const raw = localStorage.getItem('td_save');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch(e) { return null; }
    }

    function clearSave() {
        try { localStorage.removeItem('td_save'); } catch(e) {}
    }

    // Exposed for UI: resume from saved game
    window._resumeGame = function(saveData) {
        if (!saveData) return;
        if (typeof SoundManager !== 'undefined') SoundManager.init();

        game.mapId = saveData.mapId;
        game.difficulty = saveData.difficulty;
        game.diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[saveData.difficulty])
            ? DIFFICULTY_DEFS[saveData.difficulty] : DIFFICULTY_DEFS.normal;

        if (typeof CURRENT_DIFFICULTY !== 'undefined') {
            CURRENT_DIFFICULTY = saveData.difficulty;
        }

        if (typeof setActiveMap === 'function') {
            setActiveMap(saveData.mapId);
        }

        game.gold = saveData.gold;
        game.castleHP = saveData.castleHP;
        game.castleMaxHP = CASTLE_MAX_HP || 2000;
        game.waveNum = saveData.waveNum;
        game.kills = saveData.kills || 0;
        game.totalKills = saveData.totalKills || 0;
        game.towerKills = saveData.towerKills || {};
        game.enemiesReachedBase = saveData.enemiesReachedBase || 0;
        game.endless = saveData.endless || false;
        game.gameOver = false;
        game.gameWon = false;
        game.gameSpeed = 1;
        game.paused = false;
        game.repairUnlocked = (saveData.waveNum >= REPAIR_UNLOCK_WAVE);
        gameTime = 0;

        // Restore towers from serialized data
        // Towers must be reconstructed as Tower instances so their methods
        // (update, render, getUpgradeCost, etc.) work correctly.
        game.towers = [];
        for (const tData of (saveData.towers || [])) {
            const tower = new Tower(tData.typeKey, tData.col, tData.row);
            tower.level = tData.level || 0;
            tower.totalInvested = tData.totalInvested || 0;
            tower._applyLevelStats();
            game.towers.push(tower);
        }

        // Clear transient state — enemies/projectiles/healers are not saved
        game.enemies = [];
        game.healers = [];
        game.projectiles = [];

        waveManager = new WaveManager();
        waveManager.onEnemySpawn = (enemy) => { game.enemies.push(enemy); };

        activeEffects.clear();
        uiManager.clearSelection();
        uiManager.hideGameOverScreen();
        uiManager.updateTowerUnlocks(saveData.waveNum);
        uiManager.applyPendingUnlocks();
        uiManager._pendingUnlockCelebrations = [];
        uiManager._pendingButtonUnlocks = [];
        updateSpeedButtons();

        debugLog('Game resumed: map=' + saveData.mapId + ' wave=' + saveData.waveNum);
    };

    // Clear save on game over (defeat) — prevents resuming a lost game
    function handleGameOver() {
        clearSave();
        game.gameOver = true;
        if (typeof SoundManager !== 'undefined') SoundManager.gameOver();
        uiManager.showGameOverScreen(false, game.waveNum, game.kills, game.towerKills, game.totalKills, game.enemiesReachedBase);
    }

    function togglePause() {
        game.paused = !game.paused;
        const btn = document.getElementById('pause-btn');
        if (btn) {
            btn.textContent = game.paused ? '▶' : '⏸';
            btn.classList.toggle('paused', game.paused);
            btn.title = game.paused ? 'Resume (P)' : 'Pause (P)';
        }
    }

    function toggleMute() {
        const enabled = (typeof SoundManager !== 'undefined') ? !SoundManager.isEnabled() : true;
        if (typeof SoundManager !== 'undefined') {
            if (enabled) SoundManager.setVolume(0.35);
            else SoundManager.setVolume(0);
            SoundManager.toggle();
        }
        const btn = document.getElementById('mute-btn');
        if (btn) {
            btn.textContent = SoundManager && SoundManager.isEnabled() ? '🔊' : '🔇';
            btn.classList.toggle('muted', !SoundManager || !SoundManager.isEnabled());
            btn.title = (SoundManager && SoundManager.isEnabled()) ? 'Mute Sound' : 'Unmute Sound';
        }
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
        // Unlocks are queued during the round by updateHUD -> updateTowerUnlocks
        // and applied only after the round ends (in the wave completion block).
        waveManager.startWave(game.waveNum);
        if (typeof SoundManager !== 'undefined') SoundManager.waveStart();

        // Wave preview — show enemy types that will appear
        const enemyTypes = new Set();
        for (const spawn of waveManager.spawnQueue) {
            enemyTypes.add(spawn.typeKey);
        }
        uiManager.showWavePreview(Array.from(enemyTypes), game.waveNum, game.gameSpeed);
    }

    function restartGame() {
        // Determine starting gold from difficulty
        game.diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[game.difficulty])
            ? DIFFICULTY_DEFS[game.difficulty] : DIFFICULTY_DEFS.normal;
        game.gold = game.diff.startingGold || STARTING_GOLD;
        game.castleHP = CASTLE_STARTING_HP || 2000;
        game.castleMaxHP = CASTLE_MAX_HP || 2000;
        game.waveNum = 0;
        game.kills = 0;
        game.towers = [];
        game.enemies = [];
        game.healers = [];
        game.projectiles = [];
        game.gameOver = false;
        game.gameWon = false;
        game.endless = false;
        game.gameSpeed = 1;
        game.repairUnlocked = (REPAIR_UNLOCK_WAVE <= 0);
        game.towerKills = {};
        game.enemiesReachedBase = 0;
        game.totalKills = 0;
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
    /**
     * Per-frame game logic update. Called once per animation frame with
     * the real elapsed time (dt). The dt is clamped to avoid physics
     * instability from long frame gaps (e.g. tab was backgrounded).
     *
     * PIPELINE (executed in order every frame):
     *
     *   1. EARLY RETURN — skip everything if game is over or paused.
     *
     *   2. WAVE UPDATE — if waveManager.active, tick waveManager to
     *      spawn enemies and advance wave state.
     *
     *   3. ENEMY UPDATE — iterate all enemies:
     *        - Call enemy.update() for movement, waypoint progression.
     *        - Rebuild game.healers array: collect alive enemies with
     *          healAmount > 0 for the dedicated heal loop below.
     *
     *   4. HEALER TICK — for each healer whose healTimer >= healInterval:
     *        - Find the nearest damaged enemy within healRadius.
     *        - Apply healing, spawn floating green "+N" text.
     *        - Break (one heal per tick per healer).
     *
     *   5. DEATH PROCESSING — single pass over all enemies:
     *        a) BASE-REACH DAMAGE: if the enemy has reachedBase and
     *           was not yet counted (e._countedAsLost), apply damage
     *           to castleHP, increment enemiesReachedBase, spawn
     *           floating red "-DMG HP" text. If castleHP <= 0, trigger
     *           game over.
     *
     *        b) DEATH HANDLING: if the enemy is !alive && !_cleanedUp,
     *           mark as cleaned, award gold (+kills/+totalKills), call
     *           waveManager.onEnemyKilled(), spawn death effects, track
     *           per-tower-type kill, and — critically — spawn splitter
     *           minions if splitCount > 0.
     *
     *        c) SURVIVOR FILTER: if the enemy is alive OR was not yet
     *           cleaned up, keep it in the survivors list. Otherwise
     *           discard (dead + cleaned = removed from game.enemies).
     *
     *   6. TOWER UPDATE — for each tower, call tower.update(). If it
     *      returns fireData, create a new Projectile and push it.
     *
     *   7. PROJECTILE UPDATE — for each projectile, call update().
     *      If it returns impact effects, process them. Filter out dead
     *      projectiles.
     *
     *   8. EFFECTS UPDATE — tick activeEffects (floating texts, particle
     *      animations, screen shakes).
     *
     *   9. WAVE COMPLETION — if the wave just finished:
     *        - Award wave bonus gold.
     *        - Unlock castle repair if threshold reached.
     *        - Heal castle on Easy mode.
     *        - Check win condition (waveNum === wavesToWin).
     *        - Show wave summary floating text.
     *        - Auto-save.
     *        - Apply tower unlocks + celebrations.
     *
     *  10. UI UPDATE — refresh HUD with latest state.
     */
    function update(dt) {
        if (game.gameOver || game.paused) return;

        // Clamp delta time to prevent physics tunneling when the tab
        // is backgrounded (browsers pause requestAnimationFrame, so the
        // first frame after resume can have a very large dt).
        const clampedDeltaTime = Math.min(dt, 0.1);
        gameTime += clampedDeltaTime;

        if (waveManager.active) {
            waveManager.update(clampedDeltaTime, game.gameSpeed);
        }

        // Update enemies & rebuild healers list
        game.healers = [];
        for (const enemy of game.enemies) {
            enemy.update(clampedDeltaTime, game.gameSpeed);
            if (enemy.alive && enemy.healAmount > 0) {
                game.healers.push(enemy);
            }
        }

        // Healer tick: heal nearby damaged enemies (only iterates healers)
        for (const healer of game.healers) {
            if (healer.healTimer >= healer.healInterval) {
                healer.healTimer = 0;
                for (const other of game.enemies) {
                    if (!other.alive || other === healer) continue;
                    if (other.hp >= other.maxHp) continue;
                    const dx = other.x - healer.x;
                    const dy = other.y - healer.y;
                    if (dx * dx + dy * dy <= healer.healRadius * healer.healRadius) {
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

        /**
         * DEATH PROCESSING LOOP — Single pass over all enemies each frame.
         *
         * This loop handles three cases for each enemy:
         *
         * CASE A — Reached base (reachedBase=true, alive=false):
         *   The enemy has already arrived at the castle flag in enemy.update().
         *   On the first frame we detect this:
         *     - Set _countedAsLost = true (prevents duplicate processing)
         *     - Set _cleanedUp = true (prevents the death block below from firing)
         *     - Increment enemiesReachedBase counter
         *     - Increment waveManager._enemiesRemoved (for wave completion tracking)
         *     - Calculate damage = Math.floor(enemy.hp) (min 1)
         *     - Subtract damage from castleHP
         *     - Show floating red "-N HP" text at the base
         *     - If castleHP <= 0: trigger handleGameOver()
         *
         * CASE B — Killed in combat (alive=false, reachedBase=false):
         *   The enemy was slain by a tower. On first detection:
         *     - Set _cleanedUp = true (prevents reprocessing)
         *     - Increment waveManager._enemiesRemoved
         *     - Award gold to player
         *     - Increment kills and totalKills
         *     - Call waveManager.onEnemyKilled()
         *     - Spawn death particles and sound
         *     - Track killedByTowerType in game.towerKills
         *     - SPLITTER SPAWN: if enemy.splitCount > 0, create that many
         *       minion enemies of splitChildType, positioned near the dead
         *       enemy's location, inheriting its waypointIndex. These minions
         *       are pushed into the survivors array (added to game.enemies
         *       after the loop ends).
         *
         * CASE C — Still alive or not yet cleaned:
         *   Keep the enemy in the survivors list for next frame.
         *
         * The survivors array replaces game.enemies at the end of the loop.
         */
        const survivors = [];
        for (let i = 0; i < game.enemies.length; i++) {
            const enemy = game.enemies[i];

            // === CASE A: Base-reach damage ===
            // The enemy.update() method sets reachedBase=true and alive=false
            // when the enemy arrives at the final waypoint. This block runs
            // once (guarded by _countedAsLost).
            if (enemy.reachedBase && enemy.alive === false && !enemy._countedAsLost) {
                enemy._countedAsLost = true;
                enemy._cleanedUp = true; // prevent double-count in death block below
                game.enemiesReachedBase++;
                if (waveManager._enemiesRemoved !== undefined) waveManager._enemiesRemoved++;
                const rawDamage = Math.floor(enemy.hp);
                const damage = isNaN(rawDamage) ? 1 : Math.max(1, rawDamage);
                game.castleHP -= damage;
                if (isNaN(game.castleHP)) game.castleHP = CASTLE_STARTING_HP;
                if (typeof SoundManager !== 'undefined') SoundManager.enemyReachBase();
                const baseCell = PATH_CELLS[PATH_CELLS.length - 1];
                const baseCenterX = baseCell.c * CELL_SIZE + CELL_SIZE / 2;
                const baseCenterY = baseCell.r * CELL_SIZE + CELL_SIZE / 2;
                activeEffects.floatingTexts.push(new FloatingText(baseCenterX, baseCenterY - 20, '-' + damage + ' HP', '#F44336'));
                if (game.castleHP <= 0) {
                    game.castleHP = 0;
                    handleGameOver();
                }
            }

            // === CASE B: Death from combat ===
            if (!enemy.alive && !enemy._cleanedUp) {
                enemy._cleanedUp = true;
                if (waveManager._enemiesRemoved !== undefined) waveManager._enemiesRemoved++;
                if (!enemy.reachedBase) {
                    // Award kill rewards
                    game.gold += enemy.gold;
                    game.kills++;
                    game.totalKills++;
                    waveManager.onEnemyKilled();
                    activeEffects.spawnEnemyDeath(enemy);
                    if (typeof SoundManager !== 'undefined') SoundManager.enemyDie(enemy.typeKey);

                    // Track per-tower kill (last damaging tower stored on enemy)
                    if (enemy._killedByTowerType) {
                        game.towerKills[enemy._killedByTowerType] = (game.towerKills[enemy._killedByTowerType] || 0) + 1;
                    }

                    // Splitter spawn on death — some enemies (e.g. "Nest" type)
                    // explode into multiple smaller enemies when killed.
                    if (enemy.splitCount > 0 && enemy.splitChildType) {
                        for (let j = 0; j < enemy.splitCount; j++) {
                            const minion = new Enemy(enemy.splitChildType, game.waveNum);
                            minion.x = enemy.x + (Math.random() - 0.5) * 16;
                            minion.y = enemy.y + (Math.random() - 0.5) * 16;
                            minion.waypointIndex = Math.min(enemy.waypointIndex, WAYPOINTS.length - 1);
                            survivors.push(minion);
                            waveManager.totalEnemiesInWave++;
                        }
                    }
                }
            }

            // === CASE C: Keep alive or not yet cleaned ===
            if (enemy.alive || !enemy._cleanedUp) {
                survivors.push(enemy);
            }
        }
        game.enemies = survivors;

        // Towers — each tower checks range, acquires targets, and may fire
        for (const tower of game.towers) {
            const fireData = tower.update(clampedDeltaTime, game.enemies, game.gameSpeed);
            if (fireData) {
                const projectile = new Projectile(fireData, game.enemies);
                game.projectiles.push(projectile);
            }
        }

        // Projectiles — move toward target, apply damage/effects on impact
        for (const projectile of game.projectiles) {
            const effects = projectile.update(clampedDeltaTime, game.enemies, game.gameSpeed);
            if (effects) {
                activeEffects.processImpactEffects(effects);
            }
        }
        game.projectiles = game.projectiles.filter(projectile => projectile.alive);

        // Tick visual effects (floating texts, particles, screen shake)
        activeEffects.update(clampedDeltaTime);

        // Wave completion — detect when the waveManager's spawn queue is
        // exhausted AND all enemies have been removed (killed or reached base).
        if (waveManager.active && waveManager.isWaveComplete()) {
            const bonus = waveManager.getWaveBonusGold();
            game.gold += bonus;
            waveManager.active = false;
            if (typeof SoundManager !== 'undefined') SoundManager.waveComplete();
            // Unlock castle repair after certain wave threshold
            if (game.waveNum >= REPAIR_UNLOCK_WAVE) {
                game.repairUnlocked = true;
            }

            // Castle healing on Easy mode — restorative wave bonus
            if (game.diff.healCastlePerWave > 0) {
                const healAmount = Math.min(game.diff.healCastlePerWave, game.castleMaxHP - game.castleHP);
                game.castleHP += healAmount;
                if (healAmount > 0) {
                    const midX = GAME_WIDTH / 2;
                    const midY = GAME_HEIGHT / 2 - 60;
                    activeEffects.floatingTexts.push(new FloatingText(
                        midX, midY, '+ ' + healAmount + ' Castle HP', '#4CAF50'
                    ));
                }
            }

            // Win condition — use difficulty-defined wavesToWin for victory.
            // After victory, the game enters endless mode (continues indefinitely).
            const WAVES_TO_WIN = game.diff.wavesToWin || 20;
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

                // Unlock next map on victory (persisted to localStorage)
                if (game.mapId) {
                    try {
                        const beaten = JSON.parse(localStorage.getItem('td_beaten_maps') || '{}');
                        if (!beaten[game.mapId]) {
                            beaten[game.mapId] = true;
                            localStorage.setItem('td_beaten_maps', JSON.stringify(beaten));
                        }
                    } catch(e) {}
                }
            }

            const midX = GAME_WIDTH / 2;
            const midY = GAME_HEIGHT / 2 - 40;
            const reached = game.enemiesReachedBase || 0;

            // Post-wave summary floating text
            let summaryText = 'Wave ' + game.waveNum + ' done';
            summaryText += ' • ' + waveManager.enemiesKilledThisWave + ' kills';
            if (reached > 0) {
                summaryText += ' • ' + reached + ' reached base';
            }
            summaryText += ' • +' + bonus + 'g';

            activeEffects.floatingTexts.push(new FloatingText(
                midX, midY,
                summaryText,
                reached > 0 ? '#FF9800' : '#4CAF50'
            ));

            // Log enemies that reached base (cleared after summary)
            game._lastWaveReached = reached;

            // Auto-save after each wave
            saveGame();

            // Apply tower unlocks + celebrations between rounds (nothing mid-round)
            uiManager.applyPendingUnlocks();
            uiManager.showPendingUnlockCelebrations();
        }

        const waveProgress = waveManager.active ? waveManager.getProgress() : 0;
        uiManager.updateHUD(game, waveManager, waveProgress);
    }

    // --- Render ---
    /**
     * Per-frame rendering. Draw order is critical for correct
     * layering (painter's algorithm — later draws on top):
     *
     *   1. CLEAR CANVAS — erase previous frame.
     *
     *   2. MAP TERRAIN (renderMap) — draws the base terrain grid,
     *      decorations (trees, rocks, houses), and the smooth path
     *      ribbon. This is the bottom-most layer.
     *
     *   3. PATH ARROWS (renderPathArrows) — optional directional
     *      indicators overlaid on the path (helpful for new players).
     *
     *   4. TOWER PLACEMENT PREVIEW — when hovering a valid tower
     *      placement cell, draws the tower preview (transparent + range
     *      circle). Drawn above the map so the player can see where
     *      the tower will go.
     *
     *   5. SELECTED TOWER RANGE — range circle and highlight for the
     *      currently selected placed tower. Drawn above the preview
     *      layer for visibility.
     *
     *   6. TOWERS — all placed towers. Drawn above terrain so they
     *      visually sit on top of the grid. Includes turret rotation
     *      and any visual effects.
     *
     *   7. ENEMIES — all alive enemies. Drawn above towers so their
     *      movement is visible over tower bases.
     *
     *   8. PROJECTILES — bullets, arrows, missiles in flight. Drawn
     *      on top of everything game-world so they're always visible.
     *
     *   9. ACTIVE EFFECTS — floating texts (damage numbers, gold gains,
     *      wave summaries), particles (explosions, splashes), screen
     *      shake overlay. Top of the game world.
     *
     *  10. WAVE INCOMING TEXT — "Wave N incoming..." announcement that
     *      fades in at the start of each wave. Drawn above game world.
     *
     *  11. PAUSE OVERLAY — semi-transparent dark overlay + centered
     *      "PAUSED" text when game.paused is true.
     *
     *  12. GAME OVER OVERLAY — dark overlay + "GAME OVER" text (only
     *      when game is lost, not won).
     *
     *  13. ENDLESS MODE INDICATOR — subtle "ENDLESS" label in top-right
     *      corner.
     *
     *  14. VIGNETTE — radial gradient overlay around edges for a subtle
     *      3D depth effect. Applied as the very last draw to create a
     *      "letterbox" vignette.
     *
     * This order ensures that UI overlays (pause, game over) cover
     * everything, while game-world elements are layered logically
     * (terrain -> previews -> entities -> effects).
     */
    function render() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Pass castle HP to map renderer for visual damage state on the castle sprite
        window._castleHPPercent = game.castleHP / game.castleMaxHP;
        renderMap(ctx);
        renderPathArrows(ctx);

        // Tower placement preview (hover ghost + range circle)
        if (inputManager.hoveredCell && uiManager.selectedTowerType && !game.gameOver) {
            const cell = inputManager.hoveredCell;
            const canPlace = canPlaceTower(cell.col, cell.row, game.towers);
            uiManager.renderHoverPreview(ctx, cell, canPlace, uiManager.selectedTowerType);
        }

        // Selected placed tower highlight + range
        if (uiManager.selectedPlacedTower) {
            uiManager.selectedPlacedTower.renderRange(ctx);
            uiManager.renderPlacedTowerHighlight(ctx, uiManager.selectedPlacedTower);
        }

        // Game entities (towers, enemies, projectiles)
        for (const tower of game.towers) {
            tower.render(ctx);
        }

        for (const enemy of game.enemies) {
            if (enemy.alive) enemy.render(ctx);
        }

        for (const projectile of game.projectiles) {
            projectile.render(ctx);
        }

        // Visual effects on top of game world
        activeEffects.render(ctx);

        // Wave incoming announcement
        if (waveManager.active && waveManager.waveStartTimer > 0) {
            const waveDelay = game.diff.waveDelay || WAVE_DELAY;
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

        // Pause overlay
        if (game.paused) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 42px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⏸  PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText('Press P to resume', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35);
        }

        // Game over overlay (defeat only — victory shows celebration text)
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

        // Subtle vignette overlay for 3D depth perception
        const vignetteGrad = ctx.createRadialGradient(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.35,
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.72
        );
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
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
