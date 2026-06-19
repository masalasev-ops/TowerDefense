# Tower Defense — Nuke Command

A browser-based tower defense game built with vanilla JavaScript and HTML5 Canvas. Defend your castle by strategically placing towers along a winding path to stop waves of enemies.

## How to Play

Open `index.html` in any modern browser — no build step, no dependencies.

| Action | How |
|---|---|
| **Place a tower** | Click a tower button in the bottom panel, then click a green buildable cell on the grid |
| **Upgrade a tower** | Click an existing tower, then click **Upgrade** in the info panel (up to level 3) |
| **Sell a tower** | Click an existing tower, then click **Sell** in the info panel |
| **Start a wave** | Press **Space** or click the **Start Wave** button |
| **Change speed** | Press **1** (1×), **2** (2×), or **3** (3×) |
| **Repair castle** | Click the **🔧 Repair** button (available from the start) |
| **Deselect** | Press **Escape** |

## Towers

| Tower | Unlock | Style | Special |
|---|---|---|---|
| 🏹 **Archer** | Start | Fast single-target shots | — |
| ❄️ **Frost** | Start | Slows enemies | Splash slow at higher levels |
| 💣 **Cannon** | Wave 3 | Splash damage artillery | Area damage |
| ⚡ **Tesla** | Wave 3 | Chain lightning | Hits multiple enemies in a chain |
| 🔫 **Sniper** | Wave 6 | Long range, armor piercing | Ignores up to 100% armor |
| 🎯 **Mortar** | Wave 6 | Long-range explosive shells | Large splash radius |
| ☢️ **Nuke Silo** | Wave 10 | Devastating global strike | Radiation damage over time |
| 🔮 **Plasma Turret** | Wave 10 | Massive energy beam damage | High single-target damage |

Each tower has 3 upgrade levels with improved damage, range, and fire rate.

## Enemies

| Enemy | Traits |
|---|---|
| **Grunt** | Basic enemy, balanced stats |
| **Runner** | Fast with a 25% dodge chance |
| **Tank** | Slow, high HP, 40% armor |
| **Flyer** | Flying unit (ignores terrain) |
| **Boss** | Massive HP, health regen, appears every 10 waves |

Enemies scale in HP (+10%/wave) and speed (+2%/wave). Every 5th wave is an **elite** wave with 1.4× HP and 1.2× speed.

## Project Structure

```
├── index.html          # Main HTML with HUD, canvas, and UI elements
├── css/
│   └── style.css       # All styles — dark theme, responsive layout
└── js/
    ├── constants.js    # Tower/enemy/wave definitions, game tuning values
    ├── map.js          # Grid rendering, path system
    ├── enemy.js        # Enemy class — movement, status effects, scaling
    ├── tower.js        # Tower class — targeting, firing, upgrades
    ├── projectile.js   # Projectile class — homing, chain, splash
    ├── effects.js      # Particle effects, death animations, radiation
    ├── wave.js         # Wave manager — spawning, timing, rewards
    ├── input.js        # Mouse/keyboard input handling
    ├── ui.js           # HUD, tower panel, info panels, game-over screen
    └── main.js         # Game loop, state management, initialization
```

## Technical Notes

- **Vanilla JS** — no frameworks, no dependencies
- **Canvas rendering** — all game visuals drawn on a single `<canvas>`
- **Game loop** — `requestAnimationFrame` with delta-time capped at 100ms
- **Speed control** — 1×/2×/3× game speed via multiplier on delta-time
- **Procedural waves** — beyond wave 10, enemy compositions are generated algorithmically with boss waves every 10 waves
