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
        this.waveStartTimer = WAVE_DELAY;

        // Build spawn queue from wave composition
        const composition = getWaveComposition(waveNum);
        this.spawnQueue = [];
        this.totalEnemiesInWave = 0;

        for (const group of composition) {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({
                    typeKey: group.type,
                    delay: i * SPAWN_INTERVAL + Math.random() * 0.3,
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
        return WAVE_BONUS_GOLD + this.waveNum * 5;
    }

    getProgress() {
        if (this.totalEnemiesInWave === 0) return 0;
        const totalKilled = this.enemiesKilledThisWave;
        // Include enemies that reached the base (they're "removed" but count as progress)
        return totalKilled / this.totalEnemiesInWave;
    }
}
