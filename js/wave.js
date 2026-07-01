// ============================================================
// Wave — Wave spawner, difficulty scaling, wave management
// ============================================================
//
// WaveManager lifecycle:
//
//   1. startWave(waveNum) is called externally to begin a wave.
//      It fetches the wave composition from getWaveComposition(),
//      builds a spawn queue sorted by delay, and resets counters.
//
//   2. update(dt, gameSpeed) is called each frame.
//      - An initial waveStartTimer delay ticks down (from difficulty config).
//      - After the delay, the spawnTimer accumulates and enemies are
//        dequeued from spawnQueue when their delay elapses.
//      - Newly spawned enemies are returned as an array so the caller
//        can add them to the game world.
//
//   3. isWaveComplete() checks whether all enemies have been spawned
//      AND all have been killed or reached the base (counter-based).
//
// Spawn queue structure:
//   [
//     { typeKey: 'grunt', delay: 0.5 },   // spawned at t=0.5s
//     { typeKey: 'tank',  delay: 1.2 },   // spawned at t=1.2s
//     ...
//   ]
//   Each enemy type+delay entry is built by iterating over the wave
//   composition groups and applying the difficulty config's spawnInterval.
//   A small random jitter (up to 0.3s) is added per enemy for variety.
//
// Wave bonus gold:
//   Base gold = WAVE_BONUS_GOLD + waveNum * 3, multiplied by the
//   difficulty config's waveBonusGoldMult.
// ============================================================

class WaveManager {
    constructor() {
        this.waveNum = 0;
        this.active = false;
        this.spawnQueue = [];       // Enemies left to spawn
        this.spawnTimer = 0;
        this.waveStartTimer = 0;   // Initial delay before first spawn
        this.allSpawned = false;
        this.totalEnemiesInWave = 0;
        this.enemiesKilledThisWave = 0;
        this._enemiesRemoved = 0;  // counter: enemies killed + reached base

        // Callbacks
        this.onWaveComplete = null;
        this.onEnemySpawn = null;
    }

    /**
     * Start a new wave.
     *
     * Steps:
     *   1. Reset all counters and flags.
     *   2. Read the active difficulty config for wave delay and spawn interval.
     *   3. Call getWaveComposition() to get the enemy groups for this wave.
     *   4. Build the spawn queue by expanding each group into individual
     *      { typeKey, delay } entries, staggering them by spawnInterval.
     *   5. Sort the queue by delay for natural staggered spawning.
     */
    startWave(waveNum) {
        this.waveNum = waveNum;
        this.active = true;
        this.allSpawned = false;
        this.enemiesKilledThisWave = 0;
        this._enemiesRemoved = 0;

        const difficultyConfig = getActiveDifficulty();
        this.waveStartTimer = difficultyConfig.waveDelay;
        const spawnInterval = difficultyConfig.spawnInterval;

        // Build spawn queue from wave composition
        const composition = getWaveComposition(waveNum, CURRENT_DIFFICULTY);
        this.spawnQueue = [];
        this.totalEnemiesInWave = 0;

        for (const enemyGroup of composition) {
            for (let i = 0; i < enemyGroup.count; i++) {
                this.spawnQueue.push({
                    typeKey: enemyGroup.type,
                    delay: i * spawnInterval + Math.random() * 0.3,
                });
                this.totalEnemiesInWave++;
            }
        }

        // Sort by delay for natural spawning
        this.spawnQueue.sort((a, b) => a.delay - b.delay);
        this.spawnTimer = 0;
    }

    /**
     * Advance the wave by dt seconds (scaled by gameSpeed).
     *
     * During the initial waveStartTimer period, no enemies spawn.
     * After the delay, each frame spawns all enemies whose delay has
     * elapsed (typically one per frame given the staggered sorting).
     *
     * Returns an array of newly spawned Enemy instances, or null if
     * the wave is not active.
     */
    update(dt, gameSpeed) {
        if (!this.active) return null;

        const effectiveDt = dt * gameSpeed;
        const newlySpawnedEnemies = [];

        // Initial delay before wave starts
        if (this.waveStartTimer > 0) {
            this.waveStartTimer -= effectiveDt;
            return newlySpawnedEnemies;
        }

        // Spawn enemies whose delay has elapsed
        this.spawnTimer += effectiveDt;

        while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
            const enemySpawnData = this.spawnQueue.shift();
            const enemy = new Enemy(enemySpawnData.typeKey, this.waveNum);
            newlySpawnedEnemies.push(enemy);

            if (this.onEnemySpawn) {
                this.onEnemySpawn(enemy);
            }
        }

        if (this.spawnQueue.length === 0) {
            this.allSpawned = true;
        }

        return newlySpawnedEnemies;
    }

    /**
     * Record that an enemy was killed (for progress tracking).
     */
    onEnemyKilled() {
        this.enemiesKilledThisWave++;
    }

    /**
     * Check whether the wave is fully complete.
     *
     * Requirements:
     *   - Wave is active.
     *   - All enemies have been spawned (allSpawned === true).
     *   - All enemies have been removed (killed + reached base >= total).
     */
    isWaveComplete() {
        if (!this.active) return false;
        if (!this.allSpawned) return false;
        // Counter-based: all enemies either killed or reached base
        return this._enemiesRemoved >= this.totalEnemiesInWave;
    }

    /**
     * Calculate the gold bonus awarded for completing this wave.
     * Formula: (WAVE_BONUS_GOLD + waveNum * 3) * difficulty multiplier.
     */
    getWaveBonusGold() {
        const base = WAVE_BONUS_GOLD + this.waveNum * 3;
        const difficultyConfig = getActiveDifficulty();
        return Math.floor(base * difficultyConfig.waveBonusGoldMult);
    }

    /**
     * Return the wave's kill progress as a fraction (0.0 - 1.0).
     * Only counts enemies killed (not reached-base) toward progress.
     */
    getProgress() {
        if (this.totalEnemiesInWave === 0) return 0;
        const totalKilled = this.enemiesKilledThisWave;
        // Include enemies that reached the base (they're "removed" but count as progress)
        return totalKilled / this.totalEnemiesInWave;
    }
}
