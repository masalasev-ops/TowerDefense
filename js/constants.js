// ============================================================
// Tower Defense — All game constants and tuning values
// ============================================================

// --- Grid ---
const GRID_COLS = 20;
const GRID_ROWS = 14;
const CELL_SIZE = 40;
const GAME_WIDTH = GRID_COLS * CELL_SIZE;   // 800
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;  // 560

// Cell types
const CELL_BUILDABLE = 0;
const CELL_PATH = 1;
const CELL_BLOCKED = 2;

// Decoration types (used by sprites and maps)
const BLOCKED_TREE = 1;
const BLOCKED_ROCK = 2;
const BLOCKED_HOUSE = 3;

// --- Starting Resources ---
const STARTING_GOLD = 280;
const CASTLE_MAX_HP = 2000;
const CASTLE_STARTING_HP = 2000;
const REPAIR_COST_PER_HP = 0.30; // Cost per missing HP (full repair from 0 = 600g)
const REPAIR_MIN_COST = 25;      // Minimum repair cost
const REPAIR_UNLOCK_WAVE = 0;    // Repair always available (unlocked from start)

// --- Tower Definitions ---
// Each tower has an unlockWave (which wave must be reached before it's available)
// and 3 upgrade levels (0=base, 1=upgrade1, 2=upgrade2)
const TOWER_DEFS = {
    // --- Level 1: available from start ---
    archer: {
        name: 'Archer',
        description: 'Fast single-target shots',
        icon: '🏹',
        unlockWave: 0,
        tier: 1,
        levels: [
            { cost: 50,  damage: 15,  range: 130, fireRate: 1.0,  splashRadius: 0,   slow: 0,    name: 'Archer Tower',   color: '#4CAF50', projColor: '#8BC34A', projSpeed: 350 },
            { cost: 40,  damage: 23,  range: 150, fireRate: 1.1,  splashRadius: 0,   slow: 0,    name: 'Longbow Tower',  color: '#388E3C', projColor: '#C0CA33', projSpeed: 420 },
            { cost: 80,  damage: 36,  range: 170, fireRate: 1.2,  splashRadius: 0,   slow: 0,    name: 'Crossbow Tower', color: '#1B5E20', projColor: '#FFEB3B', projSpeed: 500 },
        ]
    },
    frost: {
        name: 'Frost',
        description: 'Slows enemies down',
        icon: '❄️',
        unlockWave: 0,
        tier: 1,
        levels: [
            { cost: 75,  damage: 11,  range: 120, fireRate: 0.60, splashRadius: 0,   slow: 0.40, name: 'Frost Tower',    color: '#64B5F6', projColor: '#B3E5FC', projSpeed: 280 },
            { cost: 60,  damage: 17,  range: 135, fireRate: 0.65, splashRadius: 25,  slow: 0.50, name: 'Ice Tower',      color: '#42A5F5', projColor: '#81D4FA', projSpeed: 320 },
            { cost: 120, damage: 26,  range: 150, fireRate: 0.75, splashRadius: 40,  slow: 0.60, name: 'Blizzard Tower',  color: '#1E88E5', projColor: '#E1F5FE', projSpeed: 360 },
        ]
    },
    // --- Level 2: unlocks after wave 3 ---
    cannon: {
        name: 'Cannon',
        description: 'Splash damage artillery',
        icon: '💣',
        unlockWave: 3,
        tier: 2,
        levels: [
            { cost: 100, damage: 42,  range: 110, fireRate: 0.45, splashRadius: 45,  slow: 0,    name: 'Cannon Tower',   color: '#FF5722', projColor: '#333', projSpeed: 200 },
            { cost: 75,  damage: 63,  range: 120, fireRate: 0.5,  splashRadius: 55,  slow: 0,    name: 'Bombard Tower',  color: '#E64A19', projColor: '#555', projSpeed: 220 },
            { cost: 150, damage: 95,  range: 135, fireRate: 0.55, splashRadius: 65,  slow: 0,    name: 'Howitzer Tower', color: '#BF360C', projColor: '#777', projSpeed: 250 },
        ]
    },
    tesla: {
        name: 'Tesla',
        description: 'Chain lightning strikes',
        icon: '⚡',
        unlockWave: 4,
        tier: 2,
        levels: [
            { cost: 150, damage: 26,  range: 140, fireRate: 0.5,  splashRadius: 0,   slow: 0,    name: 'Tesla Coil',     color: '#FFC107', projColor: '#FFF176', projSpeed: 0, chainCount: 3 },
            { cost: 120, damage: 40,  range: 160, fireRate: 0.55, splashRadius: 0,   slow: 0,    name: 'Arc Tower',      color: '#FFB300', projColor: '#FFEB3B', projSpeed: 0, chainCount: 4 },
            { cost: 200, damage: 58,  range: 180, fireRate: 0.6,  splashRadius: 0,   slow: 0,    name: 'Storm Tower',    color: '#FF8F00', projColor: '#FFD600', projSpeed: 0, chainCount: 5 },
        ]
    },
    // --- Level 3: unlocks after wave 6 ---
    sniper: {
        name: 'Sniper',
        description: 'Long range armor pierce',
        icon: '🔫',
        unlockWave: 6,
        tier: 3,
        levels: [
            { cost: 125, damage: 68,  range: 220, fireRate: 0.3,  splashRadius: 0,   slow: 0,    name: 'Sniper Nest',    color: '#9E9E9E', projColor: '#FFEB3B', projSpeed: 800, armorPierce: 0.5 },
            { cost: 100, damage: 105, range: 250, fireRate: 0.35, splashRadius: 0,   slow: 0,    name: 'Marksman Nest',  color: '#757575', projColor: '#FFD600', projSpeed: 900, armorPierce: 0.7 },
            { cost: 180, damage: 158, range: 280, fireRate: 0.4,  splashRadius: 0,   slow: 0,    name: 'Eliminator Nest',color: '#424242', projColor: '#FF6D00', projSpeed: 1000, armorPierce: 1.0 },
        ]
    },
    mortar: {
        name: 'Mortar',
        description: 'Long-range explosive shells',
        icon: '🎯',
        unlockWave: 7,
        tier: 3,
        levels: [
            { cost: 175, damage: 74,  range: 200, fireRate: 0.35, splashRadius: 55,  slow: 0,    name: 'Mortar Pit',     color: '#795548', projColor: '#FF6D00', projSpeed: 180 },
            { cost: 130, damage: 116, range: 230, fireRate: 0.38, splashRadius: 65,  slow: 0,    stunDuration: 0.3, name: 'Siege Mortar',   color: '#5D4037', projColor: '#FF9100', projSpeed: 200 },
            { cost: 220, damage: 179, range: 260, fireRate: 0.42, splashRadius: 80,  slow: 0,    stunDuration: 0.5, name: 'Artillery Pit',  color: '#3E2723', projColor: '#FF3D00', projSpeed: 230 },
        ]
    },
    // --- Level 4: unlocks after wave 10 ---
    nuke: {
        name: 'Nuke Silo',
        description: 'Devastating long-range strike!',
        icon: '☢️',
        unlockWave: 10,
        tier: 4,
        levels: [
            { cost: 400, damage: 263, range: 350, fireRate: 0.06, splashRadius: 80,  slow: 0,    name: 'Nuke Silo',      color: '#F44336', projColor: '#FF1744', projSpeed: 0, radiationDPS: 15,  radiationDur: 4 },
            { cost: 320, damage: 473, range: 380, fireRate: 0.07, splashRadius: 95,  slow: 0,    name: 'Warhead Silo',   color: '#D32F2F', projColor: '#FF1744', projSpeed: 0, radiationDPS: 30,  radiationDur: 5 },
            { cost: 500, damage: 840, range: 420, fireRate: 0.09, splashRadius: 110, slow: 0,    name: 'Doomsday Silo',  color: '#B71C1C', projColor: '#FF1744', projSpeed: 0, radiationDPS: 60,  radiationDur: 6 },
        ]
    },
    plasma: {
        name: 'Plasma Turret',
        description: 'Massive energy beam damage',
        icon: '🔮',
        unlockWave: 12,
        tier: 4,
        levels: [
            { cost: 400, damage: 126, range: 150, fireRate: 0.25, splashRadius: 0,   slow: 0,    name: 'Plasma Turret',  color: '#7C4DFF', projColor: '#B388FF', projSpeed: 600 },
            { cost: 300, damage: 210, range: 170, fireRate: 0.28, splashRadius: 0,   slow: 0,    name: 'Ion Cannon',     color: '#651FFF', projColor: '#D1C4E9', projSpeed: 700 },
            { cost: 500, damage: 336, range: 200, fireRate: 0.32, splashRadius: 0,   slow: 0,    name: 'Obliterator',    color: '#4A148C', projColor: '#EDE7F6', projSpeed: 800 },
        ]
    }
};

// --- Enemy Definitions ---
const ENEMY_DEFS = {
    grunt: {
        name: 'Grunt',
        hp: 120,
        speed: 55,
        armor: 0,
        flyer: false,
        gold: 12,
        color: '#8D6E63',
        size: 12
    },
    runner: {
        name: 'Runner',
        hp: 80,
        speed: 115,
        armor: 0,
        flyer: false,
        dodgeChance: 0.25,
        gold: 10,
        color: '#FF9800',
        size: 10
    },
    tank: {
        name: 'Tank',
        hp: 240,
        speed: 30,
        armor: 0.40,
        flyer: false,
        gold: 30,
        color: '#546E7A',
        size: 18
    },
    flyer: {
        name: 'Flyer',
        hp: 200,
        speed: 75,
        armor: 0,
        flyer: true,
        gold: 18,
        color: '#7B1FA2',
        size: 13
    },
    boss: {
        name: 'Boss',
        hp: 1000,
        speed: 26,
        armor: 0.35,
        flyer: false,
        regen: 8,
        gold: 150,
        color: '#D32F2F',
        size: 24
    },
    healer: {
        name: 'Healer',
        hp: 100,
        speed: 40,
        armor: 0.05,
        flyer: false,
        gold: 22,
        color: '#4CAF50',
        size: 13,
        healRadius: 80,
        healAmount: 8,
        healInterval: 1.3,
    },
    splitter: {
        name: 'Splitter',
        hp: 140,
        speed: 35,
        armor: 0.10,
        flyer: false,
        gold: 28,
        color: '#FF5722',
        size: 14,
        splitCount: 3,
        splitChildType: 'splitter_minion',
    },
    splitter_minion: {
        name: 'Fragment',
        hp: 50,
        speed: 50,
        armor: 0,
        flyer: false,
        gold: 5,
        color: '#FF8A65',
        size: 9,
    },
    shielded: {
        name: 'Shielded',
        hp: 200,
        speed: 30,
        armor: 0.20,
        flyer: false,
        gold: 35,
        color: '#2196F3',
        size: 16,
        shieldHits: 5,
        shieldDmgReduction: 0.80,
    },
    phantom: {
        name: 'Phantom',
        hp: 150,
        speed: 85,
        armor: 0,
        flyer: false,
        gold: 30,
        color: '#9C27B0',
        size: 12,
        phaseInterval: 4.0,
        phaseDuration: 1.5,
    },
};

// --- Wave Configuration ---
// All waves are procedurally generated with randomization so players can't memorize them.
// Waves 1-10 use fixed templates with mild count variation (±20%) to keep early game
// approachable while preventing memorization.
// Waves 11+ are fully procedural with increasing enemy counts and randomization.

// Helper: vary a count by ±pct (min 1)
function varyCount(base, pct) {
    const delta = Math.floor(base * pct);
    const min = Math.max(1, base - delta);
    const max = base + delta;
    return min + Math.floor(Math.random() * (max - min + 1));
}

// Generate any wave composition with randomization
function getWaveComposition(waveNum, difficulty) {
    const diff = (difficulty && DIFFICULTY_DEFS[difficulty])
        ? DIFFICULTY_DEFS[difficulty] : DIFFICULTY_DEFS.normal;
    const offset = diff.advancedEnemyWaveOffset || 0;
    const rng = Math.random;

    const comp = [];

    // -- Waves 1-10: fixed templates, mild count randomization ---
    // Same total difficulty as before, just slight variety so it's not memorizable
    if (waveNum <= 10) {
        if (waveNum <= 2) {
            comp.push({ type: 'grunt', count: waveNum === 1 ? varyCount(5, 0.2) : varyCount(8, 0.2) });
        } else if (waveNum === 3) {
            comp.push({ type: 'grunt', count: varyCount(6, 0.2) });
            comp.push({ type: 'runner', count: varyCount(3, 0.2) });
        } else if (waveNum === 4) {
            comp.push({ type: 'grunt', count: varyCount(7, 0.2) });
            comp.push({ type: 'runner', count: varyCount(5, 0.2) });
        } else if (waveNum === 5) {
            comp.push({ type: 'grunt', count: varyCount(6, 0.2) });
            comp.push({ type: 'runner', count: varyCount(4, 0.2) });
            comp.push({ type: 'tank', count: varyCount(2, 0.3) });
        } else if (waveNum === 6) {
            comp.push({ type: 'grunt', count: varyCount(7, 0.2) });
            comp.push({ type: 'runner', count: varyCount(5, 0.2) });
            comp.push({ type: 'tank', count: varyCount(3, 0.3) });
        } else if (waveNum === 7) {
            comp.push({ type: 'grunt', count: varyCount(9, 0.2) });
            comp.push({ type: 'runner', count: varyCount(6, 0.2) });
            comp.push({ type: 'tank', count: varyCount(3, 0.3) });
        } else if (waveNum === 8) {
            comp.push({ type: 'grunt', count: varyCount(7, 0.2) });
            comp.push({ type: 'runner', count: varyCount(5, 0.2) });
            comp.push({ type: 'tank', count: varyCount(2, 0.3) });
            comp.push({ type: 'flyer', count: varyCount(4, 0.2) });
        } else if (waveNum === 9) {
            comp.push({ type: 'grunt', count: varyCount(9, 0.2) });
            comp.push({ type: 'runner', count: varyCount(7, 0.2) });
            comp.push({ type: 'tank', count: varyCount(3, 0.3) });
            comp.push({ type: 'flyer', count: varyCount(5, 0.2) });
        } else if (waveNum === 10) {
            comp.push({ type: 'grunt', count: varyCount(6, 0.2) });
            comp.push({ type: 'runner', count: varyCount(4, 0.2) });
            comp.push({ type: 'boss', count: 1 });
        }
        return ensureMinCounts(comp);
    }

    // -- Waves 11+: fully procedural with randomization --
    const baseCount = 5 + Math.floor(waveNum * 2.0);

    comp.push({ type: 'grunt', count: varyCount(Math.floor(baseCount * 0.35), 0.25) });

    if (waveNum >= Math.max(1, 3 + offset)) {
        comp.push({ type: 'runner', count: varyCount(Math.floor(baseCount * 0.22), 0.25) });
    }

    if (waveNum >= Math.max(1, 5 + offset)) {
        comp.push({ type: 'tank', count: varyCount(Math.floor(baseCount * 0.14), 0.3) });
    }

    if (waveNum >= Math.max(1, 8 + offset)) {
        comp.push({ type: 'flyer', count: varyCount(Math.floor(baseCount * 0.15), 0.25) });
        comp.push({ type: 'healer', count: varyCount(Math.max(2, Math.floor(baseCount * 0.10)), 0.3) });
    }

    if (waveNum >= Math.max(1, 11 + offset)) {
        comp.push({ type: 'shielded', count: varyCount(Math.max(2, Math.floor(baseCount * 0.10)), 0.25) });
    }

    if (waveNum >= Math.max(1, 13 + offset)) {
        comp.push({ type: 'splitter', count: varyCount(Math.max(1, Math.floor(baseCount * 0.07)), 0.35) });
    }

    if (waveNum >= Math.max(1, 15 + offset)) {
        comp.push({ type: 'phantom', count: varyCount(Math.max(1, Math.floor(baseCount * 0.07)), 0.35) });
    }

    // Boss every 10th wave
    if (waveNum % BOSS_WAVE_INTERVAL === 0) comp.push({ type: 'boss', count: 1 });

    // Wildcard surprise (~12% chance): sneak in an enemy type that shouldn't appear yet
    if (waveNum >= 6 && rng() < 0.12) {
        const wildcards = [];
        if (waveNum < 8 + offset) wildcards.push('flyer');
        if (waveNum < 5 + offset) wildcards.push('tank');
        if (waveNum < 11 + offset && waveNum >= 7) wildcards.push('shielded');
        if (waveNum < 13 + offset && waveNum >= 9) wildcards.push('splitter');
        if (wildcards.length > 0) {
            const pick = wildcards[Math.floor(rng() * wildcards.length)];
            const existing = comp.find(g => g.type === pick);
            if (existing) existing.count += 1;
            else comp.push({ type: pick, count: varyCount(2, 0.3) });
        }
    }

    // Difficulty-specific adjustments
    if (difficulty === 'hard') {
        for (const g of comp) {
            if (g.type !== 'boss' && rng() < 0.25) g.count += 1;
        }
    } else if (difficulty === 'easy') {
        for (const g of comp) {
            if (g.type !== 'boss' && g.count > 1 && rng() < 0.12) g.count -= 1;
        }
    }

    return ensureMinCounts(comp);
}

function ensureMinCounts(comp) {
    for (const g of comp) {
        if (g.count < 1) g.count = 1;
    }
    return comp;
}

// --- Wave Difficulty Scaling ---
const DIFFICULTY_HP_SCALE = 0.16;    // +16% HP per wave (base scaling)
const DIFFICULTY_SPEED_SCALE = 0.03; // +3% speed per wave (base scaling)
const ELITE_WAVE_INTERVAL = 5;       // Default: every 5 waves = elite
const ELITE_HP_MULT = 1.4;           // Default elite multipliers
const ELITE_SPEED_MULT = 1.2;
const BOSS_WAVE_INTERVAL = 10;
const WAVE_BONUS_GOLD = 45;          // Base gold bonus for completing a wave

// --- Difficulty Modes ---
// Each difficulty overrides key gameplay parameters
const DIFFICULTY_DEFS = {
    easy: {
        name: 'Easy',
        description: 'Relaxed pace with more starting gold',
        hpMult: 0.58,
        speedMult: 0.75,
        startingGold: 400,
        waveBonusGoldMult: 1.30,
        eliteInterval: 7,
        eliteHpMult: 1.20,
        eliteSpeedMult: 1.10,
        spawnInterval: 0.9,
        waveDelay: 3.0,
        advancedEnemyWaveOffset: 4,   // New enemies appear this many waves later
        healCastlePerWave: 60,        // Castle auto-heals between waves
        wavesToWin: 15,
    },
    normal: {
        name: 'Normal',
        description: 'Standard challenge',
        hpMult: 0.95,
        speedMult: 0.90,
        startingGold: 250,
        waveBonusGoldMult: 1.00,
        eliteInterval: 4,
        eliteHpMult: 2.20,
        eliteSpeedMult: 1.30,
        spawnInterval: 0.65,
        waveDelay: 2.0,
        advancedEnemyWaveOffset: 0,
        healCastlePerWave: 0,
        wavesToWin: 20,
    },
    hard: {
        name: 'Hard',
        description: 'Tougher enemies, less gold, early threats',
        hpMult: 1.45,
        speedMult: 1.10,
        startingGold: 220,
        waveBonusGoldMult: 0.60,
        eliteInterval: 4,
        eliteHpMult: 2.00,
        eliteSpeedMult: 1.35,
        spawnInterval: 0.55,
        waveDelay: 1.2,
        advancedEnemyWaveOffset: -2,  // New enemies appear 2 waves earlier
        healCastlePerWave: 0,
        wavesToWin: 25,
    },
};

// --- Helper: get active difficulty config (cached lookup) ---
function getActiveDifficulty() {
    if (typeof CURRENT_DIFFICULTY !== 'undefined' && DIFFICULTY_DEFS[CURRENT_DIFFICULTY]) {
        return DIFFICULTY_DEFS[CURRENT_DIFFICULTY];
    }
    return DIFFICULTY_DEFS.normal;
}

let CURRENT_DIFFICULTY = 'normal';

// --- Spawn Timing ---
const SPAWN_INTERVAL = 0.7;   // Seconds between enemy spawns
const WAVE_DELAY = 2.0;       // Seconds before first enemy of a wave

// --- Lighting Direction (top-left light source) ---
const LIGHT_DX = -1;
const LIGHT_DY = -1;
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = 3;

// --- Color Utilities (used by sprites and map rendering) ---
function lightenColor(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.min(255, r + Math.floor((255 - r) * amount));
    const lg = Math.min(255, g + Math.floor((255 - g) * amount));
    const lb = Math.min(255, b + Math.floor((255 - b) * amount));
    return `rgb(${lr},${lg},${lb})`;
}

function darkenColor(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.floor(r * (1 - amount));
    const dg = Math.floor(g * (1 - amount));
    const db = Math.floor(b * (1 - amount));
    return `rgb(${dr},${dg},${db})`;
}

// --- Colors ---
const COLOR_GRASS = '#5a8a42';
const COLOR_GRASS_ALT = '#4f7d3a';
const COLOR_PATH = '#b8956a';
const COLOR_PATH_BORDER = '#9a7d56';
const COLOR_BLOCKED = '#3d5a2e';
const COLOR_GRID_LINE = 'rgba(0,0,0,0.06)';
const COLOR_RANGE_VALID = 'rgba(255,255,255,0.25)';
const COLOR_RANGE_INVALID = 'rgba(255,0,0,0.2)';
const COLOR_HOVER_VALID = 'rgba(255,255,255,0.35)';
const COLOR_HOVER_INVALID = 'rgba(255,0,0,0.25)';
const COLOR_SPAWN = '#4fc3f7';
const COLOR_BASE = '#ef5350';
