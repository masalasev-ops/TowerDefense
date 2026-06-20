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
            { cost: 50,  damage: 14,  range: 130, fireRate: 1.0,  splashRadius: 0,   slow: 0,    name: 'Archer Tower',   color: '#4CAF50', projColor: '#8BC34A', projSpeed: 350 },
            { cost: 40,  damage: 22,  range: 150, fireRate: 1.1,  splashRadius: 0,   slow: 0,    name: 'Longbow Tower',  color: '#388E3C', projColor: '#C0CA33', projSpeed: 420 },
            { cost: 80,  damage: 34,  range: 170, fireRate: 1.2,  splashRadius: 0,   slow: 0,    name: 'Crossbow Tower', color: '#1B5E20', projColor: '#FFEB3B', projSpeed: 500 },
        ]
    },
    frost: {
        name: 'Frost',
        description: 'Slows enemies down',
        icon: '❄️',
        unlockWave: 0,
        tier: 1,
        levels: [
            { cost: 75,  damage: 10,  range: 120, fireRate: 0.6,  splashRadius: 0,   slow: 0.40, name: 'Frost Tower',    color: '#64B5F6', projColor: '#B3E5FC', projSpeed: 280 },
            { cost: 60,  damage: 16,  range: 135, fireRate: 0.65, splashRadius: 25,  slow: 0.50, name: 'Ice Tower',      color: '#42A5F5', projColor: '#81D4FA', projSpeed: 320 },
            { cost: 120, damage: 25,  range: 150, fireRate: 0.75, splashRadius: 40,  slow: 0.60, name: 'Blizzard Tower',  color: '#1E88E5', projColor: '#E1F5FE', projSpeed: 360 },
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
            { cost: 100, damage: 40,  range: 110, fireRate: 0.45, splashRadius: 45,  slow: 0,    name: 'Cannon Tower',   color: '#FF5722', projColor: '#333', projSpeed: 200 },
            { cost: 75,  damage: 60,  range: 120, fireRate: 0.5,  splashRadius: 55,  slow: 0,    name: 'Bombard Tower',  color: '#E64A19', projColor: '#555', projSpeed: 220 },
            { cost: 150, damage: 90,  range: 135, fireRate: 0.55, splashRadius: 65,  slow: 0,    name: 'Howitzer Tower', color: '#BF360C', projColor: '#777', projSpeed: 250 },
        ]
    },
    tesla: {
        name: 'Tesla',
        description: 'Chain lightning strikes',
        icon: '⚡',
        unlockWave: 3,
        tier: 2,
        levels: [
            { cost: 150, damage: 25,  range: 140, fireRate: 0.5,  splashRadius: 0,   slow: 0,    name: 'Tesla Coil',     color: '#FFC107', projColor: '#FFF176', projSpeed: 0, chainCount: 3 },
            { cost: 120, damage: 38,  range: 160, fireRate: 0.55, splashRadius: 0,   slow: 0,    name: 'Arc Tower',      color: '#FFB300', projColor: '#FFEB3B', projSpeed: 0, chainCount: 4 },
            { cost: 200, damage: 55,  range: 180, fireRate: 0.6,  splashRadius: 0,   slow: 0,    name: 'Storm Tower',    color: '#FF8F00', projColor: '#FFD600', projSpeed: 0, chainCount: 5 },
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
            { cost: 125, damage: 65,  range: 220, fireRate: 0.3,  splashRadius: 0,   slow: 0,    name: 'Sniper Nest',    color: '#9E9E9E', projColor: '#FFEB3B', projSpeed: 800, armorPierce: 0.5 },
            { cost: 100, damage: 100, range: 250, fireRate: 0.35, splashRadius: 0,   slow: 0,    name: 'Marksman Nest',  color: '#757575', projColor: '#FFD600', projSpeed: 900, armorPierce: 0.7 },
            { cost: 180, damage: 150, range: 280, fireRate: 0.4,  splashRadius: 0,   slow: 0,    name: 'Eliminator Nest',color: '#424242', projColor: '#FF6D00', projSpeed: 1000, armorPierce: 1.0 },
        ]
    },
    mortar: {
        name: 'Mortar',
        description: 'Long-range explosive shells',
        icon: '🎯',
        unlockWave: 6,
        tier: 3,
        levels: [
            { cost: 175, damage: 70,  range: 200, fireRate: 0.35, splashRadius: 55,  slow: 0,    name: 'Mortar Pit',     color: '#795548', projColor: '#FF6D00', projSpeed: 180 },
            { cost: 130, damage: 110, range: 230, fireRate: 0.38, splashRadius: 65,  slow: 0,    name: 'Siege Mortar',   color: '#5D4037', projColor: '#FF9100', projSpeed: 200 },
            { cost: 220, damage: 170, range: 260, fireRate: 0.42, splashRadius: 80,  slow: 0,    name: 'Artillery Pit',  color: '#3E2723', projColor: '#FF3D00', projSpeed: 230 },
        ]
    },
    // --- Level 4: unlocks after wave 10 ---
    nuke: {
        name: 'Nuke Silo',
        description: 'Devastating global strike!',
        icon: '☢️',
        unlockWave: 10,
        tier: 4,
        levels: [
            { cost: 350, damage: 250, range: 9999, fireRate: 0.06, splashRadius: 0,  slow: 0,    name: 'Nuke Silo',      color: '#F44336', projColor: '#FF1744', projSpeed: 0, radiationDPS: 15,  radiationDur: 4 },
            { cost: 280, damage: 450, range: 9999, fireRate: 0.07, splashRadius: 0,  slow: 0,    name: 'Warhead Silo',   color: '#D32F2F', projColor: '#FF1744', projSpeed: 0, radiationDPS: 30,  radiationDur: 5 },
            { cost: 450, damage: 800, range: 9999, fireRate: 0.09, splashRadius: 0,  slow: 0,    name: 'Doomsday Silo',  color: '#B71C1C', projColor: '#FF1744', projSpeed: 0, radiationDPS: 60,  radiationDur: 6 },
        ]
    },
    plasma: {
        name: 'Plasma Turret',
        description: 'Massive energy beam damage',
        icon: '🔮',
        unlockWave: 10,
        tier: 4,
        levels: [
            { cost: 400, damage: 120, range: 150, fireRate: 0.25, splashRadius: 0,   slow: 0,    name: 'Plasma Turret',  color: '#7C4DFF', projColor: '#B388FF', projSpeed: 600 },
            { cost: 300, damage: 200, range: 170, fireRate: 0.28, splashRadius: 0,   slow: 0,    name: 'Ion Cannon',     color: '#651FFF', projColor: '#D1C4E9', projSpeed: 700 },
            { cost: 500, damage: 320, range: 200, fireRate: 0.32, splashRadius: 0,   slow: 0,    name: 'Obliterator',    color: '#4A148C', projColor: '#EDE7F6', projSpeed: 800 },
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
        healRadius: 70,
        healAmount: 6,
        healInterval: 1.5,
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
// Each entry: { enemyType, count } for the base composition
const WAVE_COMPOSITIONS = [
    // Wave 1-3: just grunts
    [{ type: 'grunt', count: 5 }],
    [{ type: 'grunt', count: 8 }],
    [{ type: 'grunt', count: 6 }, { type: 'runner', count: 3 }],
    // Wave 4-6: grunts + runners
    [{ type: 'grunt', count: 8 }, { type: 'runner', count: 5 }],
    [{ type: 'grunt', count: 6 }, { type: 'runner', count: 4 }, { type: 'tank', count: 2 }],
    [{ type: 'grunt', count: 8 }, { type: 'runner', count: 6 }, { type: 'tank', count: 3 }],
    // Wave 7-9: mixed
    [{ type: 'grunt', count: 10 }, { type: 'runner', count: 7 }, { type: 'tank', count: 3 }],
    [{ type: 'grunt', count: 8 }, { type: 'runner', count: 5 }, { type: 'tank', count: 2 }, { type: 'flyer', count: 4 }],
    [{ type: 'grunt', count: 10 }, { type: 'runner', count: 8 }, { type: 'tank', count: 3 }, { type: 'flyer', count: 5 }],
    // Wave 10: boss wave
    [{ type: 'grunt', count: 6 }, { type: 'runner', count: 4 }, { type: 'boss', count: 1 }],
];

// Generate wave compositions beyond the predefined ones
function getWaveComposition(waveNum, difficulty) {
    if (waveNum <= WAVE_COMPOSITIONS.length && (!difficulty || difficulty === 'normal')) {
        return WAVE_COMPOSITIONS[waveNum - 1];
    }

    // Get difficulty offset for when advanced enemies appear
    const diff = (difficulty && DIFFICULTY_DEFS[difficulty])
        ? DIFFICULTY_DEFS[difficulty] : { advancedEnemyWaveOffset: 0 };
    const offset = diff.advancedEnemyWaveOffset || 0;

    // Procedural generation
    const comp = [];
    const baseCount = 3 + Math.floor(waveNum * 1.3);

    // Grunts always present
    comp.push({ type: 'grunt', count: Math.floor(baseCount * 0.4) });

    // Runners from wave 3+ (shifted by offset)
    if (waveNum >= Math.max(1, 3 + offset)) {
        comp.push({ type: 'runner', count: Math.floor(baseCount * 0.25) });
    }

    // Tanks from wave 5+ (shifted)
    if (waveNum >= Math.max(1, 5 + offset)) {
        comp.push({ type: 'tank', count: Math.floor(baseCount * 0.12) });
    }

    // Flyers from wave 8+ (shifted)
    if (waveNum >= Math.max(1, 8 + offset)) {
        comp.push({ type: 'flyer', count: Math.floor(baseCount * 0.15) });
    }

    // Healers from wave 8+ (shifted)
    if (waveNum >= Math.max(1, 8 + offset)) {
        comp.push({ type: 'healer', count: Math.max(1, Math.floor(baseCount * 0.08)) });
    }

    // Shielded from wave 11+ (shifted)
    if (waveNum >= Math.max(1, 11 + offset)) {
        comp.push({ type: 'shielded', count: Math.max(1, Math.floor(baseCount * 0.08)) });
    }

    // Splitters from wave 13+ (shifted)
    if (waveNum >= Math.max(1, 13 + offset)) {
        comp.push({ type: 'splitter', count: Math.max(1, Math.floor(baseCount * 0.06)) });
    }

    // Phantoms from wave 15+ (shifted)
    if (waveNum >= Math.max(1, 15 + offset)) {
        comp.push({ type: 'phantom', count: Math.max(1, Math.floor(baseCount * 0.06)) });
    }

    // Boss every 10th wave
    if (waveNum % BOSS_WAVE_INTERVAL === 0) comp.push({ type: 'boss', count: 1 });

    return comp;
}

// --- Wave Difficulty Scaling ---
const DIFFICULTY_HP_SCALE = 0.10;    // +10% HP per wave (base scaling)
const DIFFICULTY_SPEED_SCALE = 0.02; // +2% speed per wave (base scaling)
const ELITE_WAVE_INTERVAL = 5;       // Default: every 5 waves = elite
const ELITE_HP_MULT = 1.4;           // Default elite multipliers
const ELITE_SPEED_MULT = 1.2;
const BOSS_WAVE_INTERVAL = 10;
const WAVE_BONUS_GOLD = 60;          // Base gold bonus for completing a wave

// --- Difficulty Modes ---
// Each difficulty overrides key gameplay parameters
const DIFFICULTY_DEFS = {
    easy: {
        name: 'Easy',
        description: 'Relaxed pace with more starting gold',
        hpMult: 0.65,
        speedMult: 0.75,
        startingGold: 400,
        waveBonusGoldMult: 1.40,
        eliteInterval: 7,
        eliteHpMult: 1.20,
        eliteSpeedMult: 1.10,
        spawnInterval: 0.9,
        waveDelay: 3.0,
        advancedEnemyWaveOffset: 4,   // New enemies appear this many waves later
        healCastlePerWave: 60,        // Castle auto-heals between waves
    },
    normal: {
        name: 'Normal',
        description: 'Standard challenge',
        hpMult: 1.00,
        speedMult: 1.00,
        startingGold: 280,
        waveBonusGoldMult: 1.00,
        eliteInterval: 5,
        eliteHpMult: 1.40,
        eliteSpeedMult: 1.20,
        spawnInterval: 0.7,
        waveDelay: 2.0,
        advancedEnemyWaveOffset: 0,
        healCastlePerWave: 0,
    },
    hard: {
        name: 'Hard',
        description: 'Tougher enemies, less gold, early threats',
        hpMult: 1.60,
        speedMult: 1.25,
        startingGold: 180,
        waveBonusGoldMult: 0.65,
        eliteInterval: 4,
        eliteHpMult: 1.70,
        eliteSpeedMult: 1.40,
        spawnInterval: 0.45,
        waveDelay: 1.3,
        advancedEnemyWaveOffset: -2,  // New enemies appear 2 waves earlier
        healCastlePerWave: 0,
    },
};

let CURRENT_DIFFICULTY = 'normal';

// --- Spawn Timing ---
const SPAWN_INTERVAL = 0.7;   // Seconds between enemy spawns
const WAVE_DELAY = 2.0;       // Seconds before first enemy of a wave

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
