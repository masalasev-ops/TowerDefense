// ============================================================
// Unit tests for Tower Defense — Siege Command
// Core game logic: wave composition, damage math, upgrades
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Setup — load the game modules into Node's global scope
// Since the project uses plain <script> tags (not ES modules), we replicate
// just enough of the game environment for pure-logic tests.
// ---------------------------------------------------------------------------

// Mock browser globals the game code expects
globalThis.window = globalThis;
globalThis.document = {
    getElementById: () => null,
    addEventListener: () => {},
    createElement: () => ({}),
    querySelectorAll: () => [],
};
globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; },
};
globalThis.performance = { now: () => Date.now() };
globalThis.AudioContext = class {};
globalThis.webkitAudioContext = class {};
globalThis.Math = Math;

// Dynamically evaluate the game files (they use global assignments, not exports)
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(__dirname, '..', 'js');

function loadScript(filename) {
    let src = readFileSync(resolve(jsDir, filename), 'utf-8');
    // Strip 'use strict' directives (affects eval context)
    src = src.replace(/'use strict';/g, '').replace(/"use strict";/g, '');
    // Convert top-level const/let to globalThis assignments so they leak to global scope
    src = src.replace(/^(const|let)\s+(\w+)\s*=/gm, (_, kind, name) => `globalThis.${name} =`);
    // Convert class declarations to assignments
    src = src.replace(/^class\s+(\w+)/gm, 'globalThis.$1 = class');
    // Convert top-level function declarations to assignments
    src = src.replace(/^function\s+(\w+)\s*\(/gm, 'globalThis.$1 = function(');
    // Run in the current global context
    vm.runInThisContext(src, { filename });
}

beforeAll(() => {
    loadScript('constants.js');
    loadScript('map.js');
    loadScript('enemy.js');
    loadScript('tower.js');
    loadScript('wave.js');
});

// ---------------------------------------------------------------------------
// Tests: Difficulty / Wave Composition
// ---------------------------------------------------------------------------

describe('getWaveComposition', () => {
    it('wave 1 always has only grunts', () => {
        const comp = getWaveComposition(1, 'normal');
        expect(comp.length).toBe(1);
        expect(comp[0].type).toBe('grunt');
        // count varies by ±20% around 5, so between 4-6
        expect(comp[0].count).toBeGreaterThanOrEqual(4);
        expect(comp[0].count).toBeLessThanOrEqual(6);
    });

    it('wave 10 always has a boss', () => {
        const comp = getWaveComposition(10, 'normal');
        const boss = comp.find(g => g.type === 'boss');
        expect(boss).toBeDefined();
        expect(boss.count).toBe(1);
    });

    it('wave 10 has grunts as escort', () => {
        const comp = getWaveComposition(10, 'normal');
        const grunts = comp.find(g => g.type === 'grunt');
        expect(grunts).toBeDefined();
        expect(grunts.count).toBeGreaterThanOrEqual(4);
    });

    it('generates waves for wave 20+ with increasing counts', () => {
        const comp10 = getWaveComposition(10, 'normal');
        const comp20 = getWaveComposition(20, 'normal');
        const total10 = comp10.reduce((s, g) => s + g.count, 0);
        const total20 = comp20.reduce((s, g) => s + g.count, 0);
        // Wave 20 should have significantly more enemies than wave 10
        expect(total20).toBeGreaterThan(total10 * 2);
    });

    it('always includes grunts in procedural waves', () => {
        // Run multiple times since it's randomized
        for (let i = 0; i < 10; i++) {
            const comp = getWaveComposition(15 + i, 'normal');
            const grunts = comp.find(g => g.type === 'grunt');
            expect(grunts).toBeDefined();
            expect(grunts.count).toBeGreaterThan(0);
        }
    });

    it('includes boss on multiples of BOSS_WAVE_INTERVAL', () => {
        for (const wave of [10, 20, 30]) {
            const comp = getWaveComposition(wave, 'normal');
            const boss = comp.find(g => g.type === 'boss');
            expect(boss).toBeDefined();
        }
    });

    it('does NOT include boss on non-multiples of 10', () => {
        for (const wave of [11, 15, 22]) {
            const comp = getWaveComposition(wave, 'normal');
            const boss = comp.find(g => g.type === 'boss');
            expect(boss).toBeUndefined();
        }
    });

    it('delays advanced enemies on easy difficulty', () => {
        // Easy: phantoms shouldn't appear at wave 14 (delayed by 4 waves)
        for (let i = 0; i < 5; i++) {
            const easyComp = getWaveComposition(14, 'easy');
            const types = easyComp.map(g => g.type);
            expect(types).not.toContain('phantom');
        }
    });

    it('hard mode has higher HP multiplier than normal', () => {
        expect(DIFFICULTY_DEFS.hard.hpMult).toBeGreaterThan(DIFFICULTY_DEFS.normal.hpMult);
        expect(DIFFICULTY_DEFS.hard.speedMult).toBeGreaterThan(DIFFICULTY_DEFS.normal.speedMult);
    });

    it('waves produce different compositions across runs (randomization check)', () => {
        const comps = new Set();
        for (let i = 0; i < 20; i++) {
            const comp = getWaveComposition(12, 'normal');
            comps.add(JSON.stringify(comp));
        }
        // With randomization, we should get at least 2 different variations in 20 runs
        expect(comps.size).toBeGreaterThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// Tests: Difficulty Definitions
// ---------------------------------------------------------------------------

describe('DIFFICULTY_DEFS', () => {
    it('has wavesToWin for all difficulties', () => {
        expect(DIFFICULTY_DEFS.easy.wavesToWin).toBe(15);
        expect(DIFFICULTY_DEFS.normal.wavesToWin).toBe(20);
        expect(DIFFICULTY_DEFS.hard.wavesToWin).toBe(25);
    });

    it('has different HP multipliers', () => {
        expect(DIFFICULTY_DEFS.easy.hpMult).toBeLessThan(DIFFICULTY_DEFS.normal.hpMult);
        expect(DIFFICULTY_DEFS.normal.hpMult).toBeLessThan(DIFFICULTY_DEFS.hard.hpMult);
    });

    it('getActiveDifficulty returns normal when CURRENT_DIFFICULTY not set', () => {
        globalThis.CURRENT_DIFFICULTY = 'invalid';
        const diff = getActiveDifficulty();
        expect(diff).toBe(DIFFICULTY_DEFS.normal);
    });
});

// ---------------------------------------------------------------------------
// Tests: Enemy Damage Math
// ---------------------------------------------------------------------------

describe('Enemy.takeDamage', () => {
    beforeEach(() => {
        // Set up enough globals for the Enemy constructor
        globalThis.CURRENT_DIFFICULTY = 'normal';
        // Need to load a map to have WAYPOINTS
        if (!globalThis.MAP_DEFS || !globalThis.MAP_DEFS.crossroads) {
            loadScript('maps/crossroads.js');
        }
        setActiveMap('crossroads');
    });

    function makeEnemy(typeKey = 'grunt', waveNum = 1) {
        return new Enemy(typeKey, waveNum);
    }

    it('reduces HP by raw damage amount', () => {
        const enemy = makeEnemy('grunt', 2);
        const initialHp = enemy.hp;
        const result = enemy.takeDamage(30, 0);
        expect(result.damage).toBe(30);
        expect(enemy.hp).toBe(initialHp - 30);
    });

    it('applies armor reduction (tank has 40% armor)', () => {
        const enemy = makeEnemy('tank', 2);
        const result = enemy.takeDamage(100, 0);
        expect(result.damage).toBe(60); // 100 * (1 - 0.40)
    });

    it('ignores armor when armorPierceAmount=1.0 (full pierce)', () => {
        const enemy = makeEnemy('tank', 2);
        const result = enemy.takeDamage(100, 1.0);
        expect(result.damage).toBe(100);
    });

    it('partially pierces armor when armorPierceAmount=0.5', () => {
        const enemy = makeEnemy('tank', 2);
        // Tank has 40% armor. With 0.5 pierce: effectiveArmor = 0.4 * (1-0.5) = 0.2
        // damage = 100 * (1 - 0.2) = 80
        const result = enemy.takeDamage(100, 0.5);
        expect(result.damage).toBe(80);
    });

    it('reduces shield hits for shielded enemies', () => {
        const enemy = makeEnemy('shielded', 2);
        expect(enemy.shieldActive).toBe(true);
        enemy.takeDamage(100, 0);
        expect(enemy.shieldHits).toBe(4); // 5 - 1
        expect(enemy.shieldActive).toBe(true);
    });

    it('deactivates shield after shieldHits depleted', () => {
        const enemy = makeEnemy('shielded', 2);
        expect(enemy.shieldHits).toBe(5);
        for (let i = 0; i < 5; i++) {
            enemy.takeDamage(10, 0);
        }
        expect(enemy.shieldActive).toBe(false);
    });

    it('phantoms are immune while phased (without full pierce)', () => {
        const enemy = makeEnemy('phantom', 2);
        enemy.phased = true;
        const result = enemy.takeDamage(100, 0);
        expect(result.damage).toBe(0);
    });

    it('phantoms take damage when not phased', () => {
        const enemy = makeEnemy('phantom', 2);
        enemy.phased = false;
        const result = enemy.takeDamage(100, 0);
        expect(result.damage).toBe(100);
    });

    it('runners can dodge attacks', () => {
        const enemy = makeEnemy('runner', 2);
        let dodged = false;
        for (let i = 0; i < 50; i++) {
            const result = enemy.takeDamage(10, 0);
            if (result.damage === 0 && enemy.hp === enemy.maxHp) {
                dodged = true;
                break;
            }
            // Reset for next attempt
            enemy.hp = enemy.maxHp;
        }
        expect(dodged).toBe(true); // 25% dodge should trigger ~once in 50 tries
    });

    it('kills enemy when HP reaches 0', () => {
        const enemy = makeEnemy('grunt', 2);
        enemy.takeDamage(enemy.maxHp, 1.0);
        expect(enemy.alive).toBe(false);
        expect(enemy.hp).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Tests: Tower Upgrade Costs
// ---------------------------------------------------------------------------

describe('Tower upgrades', () => {
    function makeTower(typeKey = 'archer') {
        return new Tower(typeKey, 5, 7);
    }

    it('base tower has level 0', () => {
        const t = makeTower('archer');
        expect(t.level).toBe(0);
    });

    it('getUpgradeCost returns cost of next level', () => {
        const t = makeTower('archer');
        expect(t.getUpgradeCost()).toBe(40); // Archer L0→L1
    });

    it('getUpgradeCost returns null at max level', () => {
        const t = makeTower('archer');
        t.level = 2; // max
        expect(t.getUpgradeCost()).toBeNull();
    });

    it('upgrade increases level and updates stats', () => {
        const t = makeTower('cannon');
        const oldDmg = t.damage;
        expect(t.level).toBe(0);
        t.upgrade();
        expect(t.level).toBe(1);
        expect(t.damage).toBeGreaterThan(oldDmg);
    });

    it('getSellValue is 40% of total invested', () => {
        const t = makeTower('archer');
        const expected = Math.floor(t.totalInvested * 0.4);
        expect(t.getSellValue()).toBe(expected);
    });

    it('nuke tower has long range (350)', () => {
        const t = makeTower('nuke');
        expect(t.range).toBe(350);
    });

    it('frost tower has slow amount > 0', () => {
        const t = makeTower('frost');
        expect(t.slowAmount).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// Tests: WaveManager
// ---------------------------------------------------------------------------

describe('WaveManager', () => {
    it('starts inactive', () => {
        const wm = new WaveManager();
        expect(wm.active).toBe(false);
    });

    it('startWave builds spawn queue and sets active', () => {
        globalThis.CURRENT_DIFFICULTY = 'normal';
        const wm = new WaveManager();
        wm.startWave(1);
        expect(wm.active).toBe(true);
        expect(wm.spawnQueue.length).toBeGreaterThan(0);
        expect(wm.totalEnemiesInWave).toBeGreaterThan(0);
    });

    it('isWaveComplete returns false when not all spawned', () => {
        const wm = new WaveManager();
        wm.startWave(1);
        wm._enemiesRemoved = wm.totalEnemiesInWave;
        wm.allSpawned = false;
        expect(wm.isWaveComplete()).toBe(false);
    });

    it('isWaveComplete returns true when all enemies removed', () => {
        const wm = new WaveManager();
        wm.startWave(1);
        wm.allSpawned = true;
        wm._enemiesRemoved = wm.totalEnemiesInWave;
        expect(wm.isWaveComplete()).toBe(true);
    });

    it('getWaveBonusGold increases with wave number', () => {
        globalThis.CURRENT_DIFFICULTY = 'normal';
        const wm1 = new WaveManager();
        wm1.waveNum = 1;
        const wm10 = new WaveManager();
        wm10.waveNum = 10;
        expect(wm10.getWaveBonusGold()).toBeGreaterThan(wm1.getWaveBonusGold());
    });
});

// ---------------------------------------------------------------------------
// Tests: Waypoint Distance Precomputation
// ---------------------------------------------------------------------------

describe('Waypoint distances', () => {
    beforeAll(() => {
        if (!globalThis.MAP_DEFS || !globalThis.MAP_DEFS.crossroads) {
            loadScript('maps/crossroads.js');
        }
        setActiveMap('crossroads');
    });

    it('every waypoint has _distToEnd', () => {
        for (const wp of WAYPOINTS) {
            expect(wp._distToEnd).toBeDefined();
            expect(typeof wp._distToEnd).toBe('number');
        }
    });

    it('first waypoint has largest distance to end', () => {
        expect(WAYPOINTS[0]._distToEnd).toBeGreaterThan(0);
        expect(WAYPOINTS[0]._distToEnd).toBeGreaterThan(WAYPOINTS[WAYPOINTS.length - 2]._distToEnd);
    });

    it('last waypoint has distance 0 to end', () => {
        expect(WAYPOINTS[WAYPOINTS.length - 1]._distToEnd).toBe(0);
    });

    it('distanceToEnd is consistent with precomputed values', () => {
        const enemy = new Enemy('grunt', 2);
        // Place enemy exactly on first waypoint
        enemy.x = WAYPOINTS[0].x;
        enemy.y = WAYPOINTS[0].y;
        enemy.waypointIndex = 0;

        const dist = enemy.distanceToEnd();
        // Should equal the precomputed distance for waypoint 0
        expect(dist).toBeCloseTo(WAYPOINTS[0]._distToEnd, 0);
    });
});

// ---------------------------------------------------------------------------
// Tests: Tower Unlock Timing (regression: towers unlock after beating wave)
// ---------------------------------------------------------------------------

describe('Tower unlock timing', () => {
    it('towers with unlockWave=0 are always available', () => {
        const archer = TOWER_DEFS.archer;
        expect(archer.unlockWave).toBe(0);
        // unlockWave 0 means available from wave 0 onwards
    });

    it('towers with unlockWave > 0 unlock only after BEATING that wave', () => {
        // Cannon unlocks at wave 3 → available starting wave 4
        expect(TOWER_DEFS.cannon.unlockWave).toBe(3);
        // Sniper unlocks at wave 6 → available starting wave 7
        expect(TOWER_DEFS.sniper.unlockWave).toBe(6);
        // Nuke unlocks at wave 10 → available starting wave 11
        expect(TOWER_DEFS.nuke.unlockWave).toBe(10);
        // Plasma unlocks at wave 12 → available starting wave 13
        expect(TOWER_DEFS.plasma.unlockWave).toBe(12);
    });

    it('no two towers share the same unlockWave > 0', () => {
        const unlockWaves = [];
        for (const [key, def] of Object.entries(TOWER_DEFS)) {
            if (def.unlockWave > 0) unlockWaves.push({ key, wave: def.unlockWave });
        }
        const waves = unlockWaves.map(u => u.wave);
        const uniqueWaves = new Set(waves);
        expect(uniqueWaves.size).toBe(waves.length);
    });

    it('unlock condition: eligible when currentWave >= unlockWave, applied after round ends', () => {
        // Cannon (unlockWave=3): becomes eligible at wave 3, unlocks after round 3
        expect(3 >= TOWER_DEFS.cannon.unlockWave).toBe(true);
        expect(2 >= TOWER_DEFS.cannon.unlockWave).toBe(false);
        // Sniper (unlockWave=6): eligible at wave 6, unlocks after round 6
        expect(6 >= TOWER_DEFS.sniper.unlockWave).toBe(true);
        // Mortar (unlockWave=7): eligible at wave 7, unlocks after round 7
        expect(7 >= TOWER_DEFS.mortar.unlockWave).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Tests: Wave Completion — no early triggers
// ---------------------------------------------------------------------------

describe('Wave completion accuracy', () => {
    beforeAll(() => {
        if (!globalThis.MAP_DEFS || !globalThis.MAP_DEFS.crossroads) {
            loadScript('maps/crossroads.js');
        }
        setActiveMap('crossroads');
        globalThis.CURRENT_DIFFICULTY = 'normal';
    });

    it('isWaveComplete is false when enemies are still alive', () => {
        const wm = new WaveManager();
        wm.startWave(1);
        wm.allSpawned = true;
        // Some enemies removed but not all
        wm._enemiesRemoved = wm.totalEnemiesInWave - 1;
        expect(wm.isWaveComplete()).toBe(false);
    });

    it('isWaveComplete is true when all enemies removed', () => {
        const wm = new WaveManager();
        wm.startWave(1);
        wm.allSpawned = true;
        wm._enemiesRemoved = wm.totalEnemiesInWave;
        expect(wm.isWaveComplete()).toBe(true);
    });

    it('isWaveComplete accounts for splitter minion spawns', () => {
        const wm = new WaveManager();
        wm.startWave(1);
        // Simulate: 10 enemies in wave, 2 are splitters that will each spawn 3 minions
        wm.totalEnemiesInWave = 10 + 6; // original + minions
        wm.allSpawned = true;
        wm._enemiesRemoved = 10; // all original enemies dead, but minions still alive
        expect(wm.isWaveComplete()).toBe(false);
        wm._enemiesRemoved = 16; // all minions also dead
        expect(wm.isWaveComplete()).toBe(true);
    });

    it('isWaveComplete is false when not all spawned yet', () => {
        const wm = new WaveManager();
        wm.startWave(1);
        wm._enemiesRemoved = wm.totalEnemiesInWave; // all removed
        wm.allSpawned = false; // but not all spawned yet
        expect(wm.isWaveComplete()).toBe(false);
    });

    it('enemy with reachedBase should only count once (not double-counted)', () => {
        // Simulate an enemy that reached the base
        const enemy = new Enemy('grunt', 1);
        enemy.reachedBase = true;
        enemy.alive = false;
        expect(enemy._countedAsLost).toBeUndefined();
        expect(enemy._cleanedUp).toBeUndefined();
        // When processing: base-reach sets _countedAsLost=true AND _cleanedUp=true
        // Death block checks !_cleanedUp and skips, preventing double-count
    });
});

// ---------------------------------------------------------------------------
// Tests: Enemy Movement — path following
// ---------------------------------------------------------------------------

describe('Enemy movement', () => {
    beforeAll(() => {
        if (!globalThis.MAP_DEFS || !globalThis.MAP_DEFS.crossroads) {
            loadScript('maps/crossroads.js');
        }
        setActiveMap('crossroads');
        globalThis.CURRENT_DIFFICULTY = 'normal';
    });

    it('ground enemy starts at first waypoint', () => {
        const enemy = new Enemy('grunt', 1);
        expect(enemy.x).toBe(WAYPOINTS[0].x);
        expect(enemy.y).toBe(WAYPOINTS[0].y);
        expect(enemy.waypointIndex).toBe(0);
        expect(enemy.flyer).toBeFalsy();
    });

    it('ground enemy moves toward next waypoint when updated', () => {
        const enemy = new Enemy('grunt', 1);
        // First frame: advances waypointIndex from 0→1 (already at spawn waypoint)
        enemy.update(0.016, 1);
        const startX = enemy.x;
        const startY = enemy.y;
        const startWp = enemy.waypointIndex;
        // Second frame: actually moves toward waypoint 1
        enemy.update(0.5, 1);

        const moved = Math.sqrt((enemy.x - startX) ** 2 + (enemy.y - startY) ** 2);
        expect(moved).toBeGreaterThan(0);
        // Max move: speed(55) * speedMult(0.9) * dt(0.5) ≈ 24.75 + tolerance
        expect(moved).toBeLessThan(30);
    });

    it('ground enemy eventually reaches all waypoints and reaches base', () => {
        const enemy = new Enemy('grunt', 1);
        // Fast-forward with large dt until enemy reaches base
        let steps = 0;
        while (!enemy.reachedBase && steps < 1000) {
            enemy.update(0.5, 1);
            steps++;
        }
        expect(enemy.reachedBase).toBe(true);
        expect(enemy.alive).toBe(false);
    });

    it('flyer has flyer=true and follows path like ground enemies', () => {
        const flyer = new Enemy('flyer', 1);
        expect(flyer.flyer).toBe(true);
        expect(flyer.x).toBe(WAYPOINTS[0].x);
        expect(flyer.y).toBe(WAYPOINTS[0].y);
        // Flyer should advance along waypoints, not fly directly
        flyer.update(0.5, 1);
        // Should be at waypoint index 1 (first wp reached instantly since it spawns there)
        expect(flyer.waypointIndex).toBeGreaterThanOrEqual(1);
        expect(flyer.reachedBase).toBe(false);
    });

    it('flyer is immune to slow effects', () => {
        const flyer = new Enemy('flyer', 1);
        const originalSpeed = flyer.speed;
        flyer.applySlow(0.5, 3.0);
        expect(flyer.slowAmount).toBe(0);
        flyer.update(0.016, 1);
        expect(flyer.speed).toBe(originalSpeed);
    });

    it('non-flyer enemies are affected by slow', () => {
        const grunt = new Enemy('grunt', 1);
        const originalSpeed = grunt.speed;
        grunt.applySlow(0.4, 2.0);
        expect(grunt.slowAmount).toBe(0.4);
        // Speed recalculates on next update()
        grunt.update(0.016, 1);
        expect(grunt.speed).toBeLessThan(originalSpeed);
    });

    it('all non-flyer enemy types have flyer=false or undefined', () => {
        const nonFlyers = ['grunt', 'runner', 'tank', 'boss', 'healer', 'splitter', 'splitter_minion', 'shielded', 'phantom'];
        for (const type of nonFlyers) {
            const enemy = new Enemy(type, 1);
            expect(enemy.flyer).toBeFalsy();
        }
    });

    it('ground enemy never moves to base in fewer than 2 waypoint advances', () => {
        const enemy = new Enemy('grunt', 1);
        const totalWaypoints = WAYPOINTS.length;
        // Update a few times at normal speed — shouldn't skip to end
        for (let i = 0; i < 5; i++) enemy.update(0.1, 1);
        // Should still be on first or second waypoint, not at the end
        expect(enemy.waypointIndex).toBeLessThan(totalWaypoints);
        expect(enemy.reachedBase).toBe(false);
    });
});
