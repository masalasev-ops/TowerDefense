// ============================================================
// Tower Defense — Central Game Balance Configuration
// ============================================================
// This file is the single source of truth for all game balance
// parameters. Every system (grid, towers, enemies, waves,
// difficulty modes, spawn timing, rendering) reads its tuning
// values from the constants defined here.
//
// Design philosophy:
//   - All values are centralized so balance changes propagate
//     automatically without touching gameplay code.
//   - Gold costs are tuned so players can afford ~3-4 towers
//     by wave 3 (280 starting gold, cheapest tower costs 50).
//   - Enemy HP/speed scaling (+16% / +3% per wave) ensures
//     steady difficulty progression without sharp spikes.
//   - Procedural wave generation (waves 11+) prevents rote
//     memorization while templated waves 1-10 provide a
//     consistent early-game learning curve.
//
// === File Structure ===
//   Lines     Section
//   -----     -------
//    ~ 48    Grid dimensions and cell types
//    ~ 64    Starting resources (gold, castle HP, repair costs)
//    ~130    Tower definitions (8 towers, 3 upgrade levels each)
//    ~240    Enemy definitions (9 types with specialized abilities)
//    ~275    Wave composition (generation and randomization helpers)
//    ~390    Wave difficulty scaling constants
//    ~405    Difficulty mode definitions (easy / normal / hard)
//    ~452    Spawn timing and lighting/shadow values
//    ~462    Color palette and utility functions
// ============================================================

// --- Grid ---
// Controls the play field dimensions. The grid is 20 columns by
// 14 rows, each cell 40px square. Total canvas: 800x560 px.
// Grid size affects tower placement density and path routing
// complexity — more cells means more strategic options but also
// more enemies to track.
const GRID_COLS = 20;
const GRID_ROWS = 14;
const CELL_SIZE = 40;
const GAME_WIDTH = GRID_COLS * CELL_SIZE;   // 800
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;  // 560

// Cell types determine what the player can place on each tile.
//   BUILDABLE — towers can be placed here (grass)
//   PATH      — enemies walk along these tiles (road)
//   BLOCKED   — impassable terrain (trees, rocks, houses)
const CELL_BUILDABLE = 0;
const CELL_PATH = 1;
const CELL_BLOCKED = 2;

// Decoration types (used by sprites and maps)
// These are visual-only sub-flags on BLOCKED cells.
const BLOCKED_TREE = 1;
const BLOCKED_ROCK = 2;
const BLOCKED_HOUSE = 3;

// --- Starting Resources ---
// Gold and castle HP are the player's primary survivability
// resources. STARTING_GOLD (280) allows buying 3-4 basic towers
// before wave 1, with a bit of reserve for upgrades. Repair
// costs are priced so a full rebuild from 0 HP costs ~600 gold,
// making it an expensive but viable emergency option.
const STARTING_GOLD = 280;
const CASTLE_MAX_HP = 2000;
const CASTLE_STARTING_HP = 2000;
const REPAIR_COST_PER_HP = 0.30; // Cost per missing HP (full repair from 0 = 600g)
const REPAIR_MIN_COST = 25;      // Minimum repair cost
const REPAIR_UNLOCK_WAVE = 0;    // Repair always available (unlocked from start)

// --- Tower Definitions ---
// Each tower has an unlockWave (which wave must be reached before it's available)
// and 3 upgrade levels (0=base, 1=upgrade1, 2=upgrade2).
//
// Towers are organized into 4 tiers that gate by wave:
//   Tier 1 (wave 0):  Archer, Frost       — cheap, foundational
//   Tier 2 (wave 3-4): Cannon, Tesla       — splash / multi-target
//   Tier 3 (wave 6-7): Sniper, Mortar      — specialized long-range
//   Tier 4 (wave 10+): Nuke, Plasma        — expensive endgame powerhouses
//
// Upgrade cost follows a pattern: level 1 costs ~80% of base, level 2 costs ~160%.
// This lets players incrementally invest rather than saving for one big spend.
const TOWER_DEFS = {
    // --- Level 1: available from start ---
    archer: {
        // Archer Tower: Bread-and-butter single-target DPS.
        // Low cost (50g) and fast fire rate make it an ideal starting tower.
        // Scales poorly into late game against armored foes.
        // Best use: fill early gaps, sell or upgrade to Longbow mid-game.
        name: 'Archer',
        description: 'Fast single-target shots',
        icon: '\u{1F3F9}',
        unlockWave: 0,
        tier: 1,
        levels: [
            { cost: 50,  damage: 15,  range: 130, fireRate: 1.0,  splashRadius: 0,   slow: 0,    name: 'Archer Tower',   color: '#4CAF50', projColor: '#8BC34A', projSpeed: 350 },
            { cost: 40,  damage: 23,  range: 150, fireRate: 1.1,  splashRadius: 0,   slow: 0,    name: 'Longbow Tower',  color: '#388E3C', projColor: '#C0CA33', projSpeed: 420 },
            { cost: 80,  damage: 36,  range: 170, fireRate: 1.2,  splashRadius: 0,   slow: 0,    name: 'Crossbow Tower', color: '#1B5E20', projColor: '#FFEB3B', projSpeed: 500 },
        ]
    },
    frost: {
        // Frost Tower: Area slow support.
        // Its slowing effect stacks with each hit, reducing enemy speed by up to 60%.
        // Low raw damage means it relies on other towers for kills.
        // Best use: place at chokepoints or before kill zones to maximize exposure time.
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
        // Cannon Tower: Area-of-effect splash damage.
        // Low fire rate (0.45) but hits groups of enemies for full damage each.
        // Splash radius grows with upgrades, covering up to 3 cells at max.
        // Best use: position near path curves where enemies cluster.
        name: 'Cannon',
        description: 'Splash damage artillery',
        icon: '\u{1F4A3}',
        unlockWave: 3,
        tier: 2,
        levels: [
            { cost: 100, damage: 42,  range: 110, fireRate: 0.45, splashRadius: 45,  slow: 0,    name: 'Cannon Tower',   color: '#FF5722', projColor: '#333', projSpeed: 200 },
            { cost: 75,  damage: 63,  range: 120, fireRate: 0.5,  splashRadius: 55,  slow: 0,    name: 'Bombard Tower',  color: '#E64A19', projColor: '#555', projSpeed: 220 },
            { cost: 150, damage: 95,  range: 135, fireRate: 0.55, splashRadius: 65,  slow: 0,    name: 'Howitzer Tower', color: '#BF360C', projColor: '#777', projSpeed: 250 },
        ]
    },
    tesla: {
        // Tesla Coil: Chain lightning that bounces between targets.
        // The chainCount property controls how many additional enemies are hit.
        // Each bounce deals full damage — extremely efficient against clustered enemies.
        // Best use: defend dense path sections for maximum bounces.
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
        // Sniper Nest: Extreme-range armor-piercing single target damage.
        // The armorPierce stat bypasses a fraction of enemy armor (0.5 = 50% ignore).
        // Very slow fire rate but hits hard enough to one-shot grunts at max level.
        // Best use: placed at the start of long straightaways to pick off priority targets.
        name: 'Sniper',
        description: 'Long range armor pierce',
        icon: '\u{1F52B}',
        unlockWave: 6,
        tier: 3,
        levels: [
            { cost: 125, damage: 68,  range: 220, fireRate: 0.3,  splashRadius: 0,   slow: 0,    name: 'Sniper Nest',    color: '#9E9E9E', projColor: '#FFEB3B', projSpeed: 800, armorPierce: 0.5 },
            { cost: 100, damage: 105, range: 250, fireRate: 0.35, splashRadius: 0,   slow: 0,    name: 'Marksman Nest',  color: '#757575', projColor: '#FFD600', projSpeed: 900, armorPierce: 0.7 },
            { cost: 180, damage: 158, range: 280, fireRate: 0.4,  splashRadius: 0,   slow: 0,    name: 'Eliminator Nest',color: '#424242', projColor: '#FF6D00', projSpeed: 1000, armorPierce: 1.0 },
        ]
    },
    mortar: {
        // Mortar Pit: Long-range area-denial with stun utility.
        // Shells arc overhead (ignoring line-of-sight) and stun enemies at higher levels.
        // Stun duration (0.3-0.5s) interrupts enemy attacks and resets dodge timers.
        // Best use: deploy behind obstacles to cover blind spots.
        name: 'Mortar',
        description: 'Long-range explosive shells',
        icon: '\u{1F3AF}',
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
        // Nuke Silo: Devastating long-range strike with lingering radiation.
        // Radiation applies damage-over-time (radiationDPS) for several seconds
        // after the initial blast, melting even the toughest enemies.
        // Extremely expensive (400g base) and fires very slowly (0.06 rate).
        // Best use: deploy at central position covering most of the map.
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
        // Plasma Turret: Massive sustained energy beam damage.
        // Highest single-target DPS of any tower, but no splash or utility.
        // Shortish range (150) forces careful positioning near the path.
        // Best use: place at the end of the path to finish off survivors.
        name: 'Plasma Turret',
        description: 'Massive energy beam damage',
        icon: '\u{1F52E}',
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
// Each enemy type fills a specific tactical role. The interplay
// between speed, HP, armor, and special abilities creates
// situations that reward different tower combinations:
//
//   Many weak enemies  ->  splash/cannon
//   Fast single target ->  archer/sniper
//   Armored threats    ->  sniper (armor pierce)
//   Mixed formations   ->  frost + aoe
//
// Gold reward is proportional to the threat each enemy poses
// (boss = 150g, grunt = 12g).
const ENEMY_DEFS = {
    grunt: {
        // Grunt: Basic melee enemy with no special abilities.
        // Provides steady gold income and tests raw DPS output.
        // Appears from wave 1 in every difficulty mode.
        // Tactical role: cannon fodder that pads enemy count.
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
        // Runner: Fast and fragile — punishes slow-firing or poorly placed defenses.
        // High speed (115) lets it slip past towers that are busy with grunts.
        // 25% dodge chance frustrates single-shot towers like Snipers.
        // Low gold reward (10) reflects its easy kill potential.
        // Tactical role: pressure test for fire rate and targeting priority.
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
        // Tank: High HP and 40% armor makes it a damage sponge.
        // Slow speed (30) means it soaks up hits for a long time.
        // Synergizes with healers — can become nearly unkillable.
        // Tactical role: absorb tower fire while faster enemies slip through.
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
        // Flyer: Ignores ground-based towers (no ground targeting).
        // Only towers with flyer targeting (or global range) can hit it.
        // Moderate HP (200) and speed (75) make it a mid-tier threat.
        // Tactical role: force the player to diversify their tower lineup.
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
        // Boss: Extremely high HP (1000) with 35% armor and health regen.
        // Spawns every 10 waves as a progression gate.
        // Regen (8 HP/s) means even slow damage lets it recover.
        // Highest gold reward (150) — killing one is a major economy boost.
        // Tactical role: ultimate threat requiring all-in focus fire.
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
        // Healer: Support unit that restores HP to nearby allies.
        // Heals 8 HP every 1.3s within an 80px radius.
        // Low HP (100) means it dies quickly if focused.
        // Tactical role: sustain the enemy wave — must be prioritized.
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
        // Splitter: When killed, splits into multiple smaller enemies.
        // Split count (3) and child type (splitter_minion) determine
        // the swarm that erupts on death.
        // Tactical role: punish overkill and splash-only defenses.
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
        // Fragment: The small enemy released when a Splitter dies.
        // Weak and fragile (50 HP) but numerous — can overwhelm
        // single-target towers through sheer numbers.
        // Tactical role: swarm the player with cheap bodies.
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
        // Shielded: Carries a damage-reducing shield.
        // shieldHits (5) means it absorbs the first 5 hits at 80% reduction.
        // Fast-firing towers (Archer, Tesla) burn through the shield quickly.
        // Tactical role: counter slow, high-damage towers like Sniper.
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
        // Phantom: Periodically phases out of existence, becoming untargetable.
        // Phases every 4.0s for 1.5s — during this time it takes no damage.
        // High speed (85) means it covers ground quickly between phases.
        // Tactical role: frustrate auto-targeting and force manual intervention.
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
// Waves 1-10 use fixed templates with mild count variation (+-20%) to keep early game
// approachable while preventing memorization.
// Waves 11+ are fully procedural with increasing enemy counts and randomization.

// Helper: vary a count by +-pct (min 1).
// Used to add subtle randomness to enemy counts without making
// the wave drastically harder or easier than intended.
function varyCount(base, pct) {
    const countVariation = Math.floor(base * pct);   // Absolute amount the count can vary
    const min = Math.max(1, base - countVariation);  // Lower bound (at least 1)
    const max = base + countVariation;               // Upper bound
    return min + Math.floor(Math.random() * (max - min + 1));
}

// Generate any wave composition with randomization.
//
// === Two-phase structure ===
// Waves 1-10: Uses fixed templates (one per wave number) that define exactly which
//   enemy types appear. Each count has +-20% variation applied via varyCount so
//   replays feel different but the difficulty envelope stays predictable.
// Waves 11+: Fully procedural. Enemy count scales with waveNum (baseCount formula),
//   and enemy types are gated by wave thresholds so they are introduced gradually.
//
// === Enemy type introduction ===
//   Grunt:      always present
//   Runner:     from wave 3
//   Tank:       from wave 5
//   Flyer:      from wave 8
//   Healer:     from wave 8 (alongside Flyer)
//   Shielded:   from wave 11
//   Splitter:   from wave 13
//   Phantom:    from wave 15
//   Boss:       every 10th wave (BOSS_WAVE_INTERVAL)
//
// These thresholds are shifted earlier or later by the difficulty mode's
// advancedEnemyWaveOffset (e.g. Hard mode offset = -2 means enemies arrive 2 waves sooner).
//
// === Wildcard system ===
// From wave 6 onward, there is a ~12% chance each wave of inserting one bonus enemy
// of a type that would normally appear in a *later* wave. This creates surprise spikes
// without being unfair — the wildcard only adds a single unit (or 2 if the type hasn't
// appeared yet). The wildcard pool is restricted to types within a few waves of unlocking,
// so players never face enemies they couldn't reasonably counter.
//
// === Difficulty adjustments ===
// Hard:  25% chance each group gets +1 enemy (bosses excluded)
// Easy:  12% chance each group gets -1 enemy (min 1, bosses excluded)
function getWaveComposition(waveNum, difficulty) {
    // Resolve the difficulty config, defaulting to Normal if unspecified or unknown.
    const difficultyConfig = (difficulty && DIFFICULTY_DEFS[difficulty])
        ? DIFFICULTY_DEFS[difficulty] : DIFFICULTY_DEFS.normal;
    // How many waves enemy types appear earlier (negative) or later (positive).
    const enemyIntroWaveOffset = difficultyConfig.advancedEnemyWaveOffset || 0;
    // Local alias for Math.random — used for all RNG decisions in wave generation.
    const randomGenerator = Math.random;

    // The list of enemy groups that will form this wave.
    const waveComposition = [];

    // -- Waves 1-10: fixed templates, mild count randomization ---
    // Same total difficulty as before, just slight variety so it's not memorizable
    if (waveNum <= 10) {
        // Wave 1: tutorial-level, only grunts
        if (waveNum <= 2) {
            waveComposition.push({ type: 'grunt', count: waveNum === 1 ? varyCount(5, 0.2) : varyCount(8, 0.2) });
        // Wave 3: introduce runners — faster enemies that test positioning
        } else if (waveNum === 3) {
            waveComposition.push({ type: 'grunt', count: varyCount(6, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(3, 0.2) });
        // Wave 4: more runners, increased pressure
        } else if (waveNum === 4) {
            waveComposition.push({ type: 'grunt', count: varyCount(7, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(5, 0.2) });
        // Wave 5: first tanks appear — tests whether the player has anti-armor options
        } else if (waveNum === 5) {
            waveComposition.push({ type: 'grunt', count: varyCount(6, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(4, 0.2) });
            waveComposition.push({ type: 'tank', count: varyCount(2, 0.3) });
        // Wave 6: escalate tank count
        } else if (waveNum === 6) {
            waveComposition.push({ type: 'grunt', count: varyCount(7, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(5, 0.2) });
            waveComposition.push({ type: 'tank', count: varyCount(3, 0.3) });
        // Wave 7: more of everything — middle of tier 2 progression
        } else if (waveNum === 7) {
            waveComposition.push({ type: 'grunt', count: varyCount(9, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(6, 0.2) });
            waveComposition.push({ type: 'tank', count: varyCount(3, 0.3) });
        // Wave 8: first flyers — forces anti-air tower investment
        } else if (waveNum === 8) {
            waveComposition.push({ type: 'grunt', count: varyCount(7, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(5, 0.2) });
            waveComposition.push({ type: 'tank', count: varyCount(2, 0.3) });
            waveComposition.push({ type: 'flyer', count: varyCount(4, 0.2) });
        // Wave 9: heavier flyer mix
        } else if (waveNum === 9) {
            waveComposition.push({ type: 'grunt', count: varyCount(9, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(7, 0.2) });
            waveComposition.push({ type: 'tank', count: varyCount(3, 0.3) });
            waveComposition.push({ type: 'flyer', count: varyCount(5, 0.2) });
        // Wave 10: first boss wave — milestone that requires consolidated defenses
        } else if (waveNum === 10) {
            waveComposition.push({ type: 'grunt', count: varyCount(6, 0.2) });
            waveComposition.push({ type: 'runner', count: varyCount(4, 0.2) });
            waveComposition.push({ type: 'boss', count: 1 });
        }
        return ensureMinCounts(waveComposition);
    }

    // -- Waves 11+: fully procedural with randomization --
    // Base enemy count scales with wave number: ~2 new enemies per wave on average.
    const baseCount = 5 + Math.floor(waveNum * 2.0);

    // Grunts are always present as the bulk of the wave (35% of base count).
    waveComposition.push({ type: 'grunt', count: varyCount(Math.floor(baseCount * 0.35), 0.25) });

    // Runners appear from wave 3 onward (adjusted by enemyIntroWaveOffset).
    if (waveNum >= Math.max(1, 3 + enemyIntroWaveOffset)) {
        waveComposition.push({ type: 'runner', count: varyCount(Math.floor(baseCount * 0.22), 0.25) });
    }

    // Tanks appear from wave 5 onward.
    if (waveNum >= Math.max(1, 5 + enemyIntroWaveOffset)) {
        waveComposition.push({ type: 'tank', count: varyCount(Math.floor(baseCount * 0.14), 0.3) });
    }

    // Flyers and healers appear from wave 8 onward — healers sustain the wave.
    if (waveNum >= Math.max(1, 8 + enemyIntroWaveOffset)) {
        waveComposition.push({ type: 'flyer', count: varyCount(Math.floor(baseCount * 0.15), 0.25) });
        waveComposition.push({ type: 'healer', count: varyCount(Math.max(2, Math.floor(baseCount * 0.10)), 0.3) });
    }

    // Shielded enemies appear from wave 11 onward — they counter slow heavy hitters.
    if (waveNum >= Math.max(1, 11 + enemyIntroWaveOffset)) {
        waveComposition.push({ type: 'shielded', count: varyCount(Math.max(2, Math.floor(baseCount * 0.10)), 0.25) });
    }

    // Splitters appear from wave 13 onward — they punish overkill and pure-splash builds.
    if (waveNum >= Math.max(1, 13 + enemyIntroWaveOffset)) {
        waveComposition.push({ type: 'splitter', count: varyCount(Math.max(1, Math.floor(baseCount * 0.07)), 0.35) });
    }

    // Phantoms appear from wave 15 onward — they phase out to dodge attacks.
    if (waveNum >= Math.max(1, 15 + enemyIntroWaveOffset)) {
        waveComposition.push({ type: 'phantom', count: varyCount(Math.max(1, Math.floor(baseCount * 0.07)), 0.35) });
    }

    // Boss every 10th wave as a milestone challenge.
    if (waveNum % BOSS_WAVE_INTERVAL === 0) waveComposition.push({ type: 'boss', count: 1 });

    // Wildcard surprise (~12% chance): sneak in an enemy type that shouldn't appear yet.
    // This prevents the player from completely specializing their defenses.
    if (waveNum >= 6 && randomGenerator() < 0.12) {
        const wildcards = [];
        // Collect enemy types that are close to unlocking but not yet available.
        if (waveNum < 8 + enemyIntroWaveOffset) wildcards.push('flyer');
        if (waveNum < 5 + enemyIntroWaveOffset) wildcards.push('tank');
        if (waveNum < 11 + enemyIntroWaveOffset && waveNum >= 7) wildcards.push('shielded');
        if (waveNum < 13 + enemyIntroWaveOffset && waveNum >= 9) wildcards.push('splitter');
        if (wildcards.length > 0) {
            // Randomly pick one of the candidate wildcard types.
            const wildcardType = wildcards[Math.floor(randomGenerator() * wildcards.length)];
            // If this enemy type already exists in the wave composition, just increment its count.
            const existingGroup = waveComposition.find(g => g.type === wildcardType);
            if (existingGroup) existingGroup.count += 1;
            else waveComposition.push({ type: wildcardType, count: varyCount(2, 0.3) });
        }
    }

    // Difficulty-specific adjustments to group sizes.
    if (difficulty === 'hard') {
        // Hard mode: 25% chance each enemy group gets +1 (except bosses).
        for (const enemyGroup of waveComposition) {
            if (enemyGroup.type !== 'boss' && randomGenerator() < 0.25) enemyGroup.count += 1;
        }
    } else if (difficulty === 'easy') {
        // Easy mode: 12% chance each group (except bosses) gets -1, never below 1.
        for (const enemyGroup of waveComposition) {
            if (enemyGroup.type !== 'boss' && enemyGroup.count > 1 && randomGenerator() < 0.12) enemyGroup.count -= 1;
        }
    }

    return ensureMinCounts(waveComposition);
}

// Ensure no enemy group has a count below 1 (prevents zero-enemy groups from RNG).
function ensureMinCounts(waveComposition) {
    for (const enemyGroup of waveComposition) {
        if (enemyGroup.count < 1) enemyGroup.count = 1;
    }
    return waveComposition;
}

// --- Wave Difficulty Scaling ---
// These multipliers are applied to ALL enemies each wave to create
// a natural difficulty curve without requiring more enemies.
// At wave 20: enemies have ~320% base HP and ~60% more speed.
const DIFFICULTY_HP_SCALE = 0.16;    // +16% HP per wave (base scaling)
const DIFFICULTY_SPEED_SCALE = 0.03; // +3% speed per wave (base scaling)
const ELITE_WAVE_INTERVAL = 5;       // Default: every 5 waves = elite
const ELITE_HP_MULT = 1.4;           // Default elite multipliers
const ELITE_SPEED_MULT = 1.2;
const BOSS_WAVE_INTERVAL = 10;
const WAVE_BONUS_GOLD = 45;          // Base gold bonus for completing a wave

// --- Difficulty Modes ---
// Each difficulty overrides key gameplay parameters.
// These modifiers stack multiplicatively with the base wave scaling
// so the difficulty gap widens in late game:
//   Easy:   0.58x HP,  0.75x speed,  400 starting gold,  win by wave 15
//   Normal: 0.95x HP,  0.90x speed,  250 starting gold,  win by wave 20
//   Hard:   1.45x HP,  1.10x speed,  220 starting gold,  win by wave 25
//
// The advancedEnemyWaveOffset is the most impactful parameter:
// it shifts when each enemy type first appears. Hard mode (-2)
// means tanks appear at wave 3 instead of wave 5, creating
// intense early pressure.
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
// Controls how quickly enemies are released into the field.
// Faster spawn intervals mean enemies stack up closer together,
// increasing the effective threat density.
const SPAWN_INTERVAL = 0.7;   // Seconds between enemy spawns
const WAVE_DELAY = 2.0;       // Seconds before first enemy of a wave

// --- Lighting Direction (top-left light source) ---
// Used for shadow calculations in the sprite renderer.
// A top-left light means shadows fall down and to the right.
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
// Terrain and UI color palette. All values are designed to work
// together visually: warm path tones, cool grass, and distinct
// highlight colors for player interactions.
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
