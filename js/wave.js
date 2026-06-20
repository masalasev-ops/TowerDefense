// ============================================================
// Wave — Wave spawner, difficulty scaling, wave management
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

        // Callbacks
        this.onWaveComplete = null;
        this.onEnemySpawn = null;
    }

    startWave(waveNum) {
        this.waveNum = waveNum;
        this.active = true;
        this.allSpawned = false;
        this.enemiesKilledThisWave = 0;

        const diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[CURRENT_DIFFICULTY])
            ? DIFFICULTY_DEFS[CURRENT_DIFFICULTY] : { waveDelay: 2.0, spawnInterval: 0.7 };
        this.waveStartTimer = diff.waveDelay;
        const spawnInterval = diff.spawnInterval;

        // Build spawn queue from wave composition
        const composition = getWaveComposition(waveNum, CURRENT_DIFFICULTY);
        this.spawnQueue = [];
        this.totalEnemiesInWave = 0;

        for (const group of composition) {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({
                    typeKey: group.type,
                    delay: i * spawnInterval + Math.random() * 0.3,
                });
                this.totalEnemiesInWave++;
            }
        }

        // Sort by delay for natural spawning
        this.spawnQueue.sort((a, b) => a.delay - b.delay);
        this.spawnTimer = 0;
    }

    update(dt, gameSpeed) {
        if (!this.active) return null;

        const effectiveDt = dt * gameSpeed;
        const spawned = [];

        // Initial delay before wave starts
        if (this.waveStartTimer > 0) {
            this.waveStartTimer -= effectiveDt;
            return spawned;
        }

        // Spawn enemies whose delay has elapsed
        this.spawnTimer += effectiveDt;

        while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
            const spawnData = this.spawnQueue.shift();
            const enemy = new Enemy(spawnData.typeKey, this.waveNum);
            spawned.push(enemy);

            if (this.onEnemySpawn) {
                this.onEnemySpawn(enemy);
            }
        }

        if (this.spawnQueue.length === 0) {
            this.allSpawned = true;
        }

        return spawned;
    }

    onEnemyKilled() {
        this.enemiesKilledThisWave++;
    }

    isWaveComplete(enemies) {
        if (!this.active) return false;
        if (!this.allSpawned) return false;

        // Check all enemies are dead
        for (const enemy of enemies) {
            if (enemy.alive) return false;
        }
        return true;
    }

    getWaveBonusGold() {
        const base = WAVE_BONUS_GOLD + this.waveNum * 5;
        const diff = (typeof DIFFICULTY_DEFS !== 'undefined' && DIFFICULTY_DEFS[CURRENT_DIFFICULTY])
            ? DIFFICULTY_DEFS[CURRENT_DIFFICULTY] : { waveBonusGoldMult: 1.0 };
        return Math.floor(base * diff.waveBonusGoldMult);
    }

    getProgress() {
        if (this.totalEnemiesInWave === 0) return 0;
        const totalKilled = this.enemiesKilledThisWave;
        // Include enemies that reached the base (they're "removed" but count as progress)
        return totalKilled / this.totalEnemiesInWave;
    }
}
