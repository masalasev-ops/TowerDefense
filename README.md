# Tower Defense — Siege Command

A browser-based tower defense game built with vanilla JavaScript and HTML5 Canvas. Defend your castle across 8 unique maps, unlock new terrain by conquering previous ones, and survive escalating waves of enemies.

## How to Play

Open `index.html` in any modern browser — no build step, no dependencies.

| Action | How |
|---|---|
| **Place a tower** | Click a tower button, then click a green buildable cell |
| **Upgrade a tower** | Click an existing tower, then click **Upgrade** (up to level 3) |
| **Sell a tower** | Click an existing tower, then click **Sell** |
| **Start a wave** | Press **Space** or click **Start Wave** |
| **Change speed** | Press **1** (1×), **2** (2×), or **3** (3×) |
| **Repair castle** | Click **🔧 Repair** between waves |
| **Deselect** | Press **Escape** |
| **Main menu** | Click **🏠 Main Menu** on game over screen |

## Maps

| # | Map | Spawn | Features |
|---|-----|-------|----------|
| 1 | 🌳 **Crossroads** | Left | Winding S-path through a village with a flowing creek, bridges, houses |
| 2 | 🏞️ **Winding Valley** | Right | Long zig-zag through rolling hills, mountain silhouettes, valley ridges |
| 3 | ❄️ **Frozen Pass** | Top-right | Icy mountain pass with snow-capped peaks, frozen lake, ice crystals |
| 4 | 🏯 **Fortress Siege** | Right | 4-pass cobblestone with meadows, houses, birds, rabbits, deer |
| 5 | 🌵 **Desert Oasis** | Top-left | Golden dunes with an oasis pool, palm trees, dune ripples, camels |
| 6 | 🌴 **Jungle Ruins** | Top-left | Dense jungle with temple ruins, winding river, stone bridges, monkeys |
| 7 | 🌙 **Lunar Base** | Top-right | Moon surface with craters, Earth on the horizon, lunar lander, stars |
| 8 | 🏖️ **Coastal Cliffs** | Top-left | Cliffside path with ocean waves, beach, lighthouse, boats, seagulls |

### Map Progression

Maps unlock sequentially. Beat the win threshold on one map to unlock the next.

```
🌳 Crossroads → 🏞️ Winding Valley → ❄️ Frozen Pass → 🏯 Fortress Siege
→ 🌵 Desert Oasis → 🌴 Jungle Ruins → 🌙 Lunar Base → 🏖️ Coastal Cliffs
```

Progress is saved to `localStorage` and persists across sessions.

## Difficulty Modes

| Mode | Starting Gold | Enemy HP | Enemy Speed | Elites | Bonus Gold | Waves to Win |
|---|---|---|---|---|---|---|
| 🟢 **Easy** | 400g | 65% | 75% | Every 7 | 140% | **15** |
| 🟡 **Normal** | 280g | 100% | 100% | Every 5 | 100% | **20** |
| 🔴 **Hard** | 180g | 160% | 125% | Every 4 | 65% | **25** |

Easy mode also heals the castle by 60 HP after each wave.

## Win Condition

Survive the required number of waves (varies by difficulty) to conquer a map. On victory:
- A gold **"Map Conquered! 🏆"** banner appears
- The next map unlocks
- The game continues in **Endless Mode** — keep playing for a high score
- If the castle falls at any point, it's game over

## Towers

| Tower | Tier | Unlock | Style | Special |
|---|---|---|---|---|
| 🏹 **Archer** | 1 | Start | Fast single-target shots | — |
| ❄️ **Frost** | 1 | Start | Slows enemies | Splash slow at higher levels |
| 💣 **Cannon** | 2 | Wave 3 | Splash damage artillery | Area damage |
| ⚡ **Tesla** | 2 | Wave 3 | Chain lightning | Hits multiple enemies |
| 🔫 **Sniper** | 3 | Wave 6 | Long range, armor pierce | Ignores up to 100% armor |
| 🎯 **Mortar** | 3 | Wave 6 | Long-range explosive shells | Large splash radius |
| ☢️ **Nuke Silo** | 4 | Wave 10 | Devastating global strike | Radiation damage over time |
| 🔮 **Plasma** | 4 | Wave 10 | Massive energy beam | High single-target damage |

Each tower has 3 upgrade levels with improved damage, range, and fire rate.

## Enemies

| Enemy | Traits |
|---|---|
| **Grunt** | Basic enemy, balanced stats |
| **Runner** | Fast with 25% dodge chance |
| **Tank** | Slow, high HP, 40% armor |
| **Flyer** | Flying unit (ignores terrain visually) |
| **Boss** | Massive HP, health regen, every 10 waves |
| 🟢 **Healer** | Heals nearby allies (6 HP every 1.5s within 70px) |
| 🟠 **Splitter** | Splits into 3 Fragments on death |
| 🔵 **Shielded** | Absorbs 80% damage from first 5 hits |
| 🟣 **Phantom** | Phases every 4s for 1.5s — immune while phased |

Enemies scale in HP (+10%/wave) and speed (+2%/wave). Elite waves (every 4–7 depending on difficulty) boost enemy HP and speed further. Elite enemies show a gold ⭐ ring.

## Features

- **8 unique maps** with distinct terrain, color palettes, and strategic layouts
- **Map progression system** — beat a map to unlock the next (saved to localStorage)
- **3 difficulty modes** affecting enemy stats, gold, spawn timing, elite frequency, and win threshold
- **Endless mode** after victory — keep playing beyond the win wave
- **9 enemy types** with special abilities (heal, split, shield, phase, dodge, regen, flight)
- **8 tower types** across 4 tiers, each with 3 upgrade levels
- **Procedural wave generation** beyond wave 10 with difficulty-aware composition
- **Sprite-based rendering** — pre-rendered tile atlas for performance and visual quality
- **Web Audio sound system** — 14 procedural sound effects for all game actions
- **PWA support** — installable on Android via service worker + manifest
- **Glass-morphism UI** — modern CSS with backdrop blur, glow effects, and animations
- **Animals and ambient life** — birds, rabbits, deer, camels, monkeys, seagulls per map
- **Responsive layout** — mobile-friendly with touch controls

## Project Structure

```
├── index.html              # Main HTML with setup screen, HUD, canvas, UI
├── manifest.json           # PWA manifest for mobile install
├── sw.js                   # Service worker for offline support
├── README.md
├── css/
│   └── style.css           # Glass-morphism UI with animations
├── js/
│   ├── constants.js        # Tower/enemy/wave/difficulty definitions
│   ├── sprites.js          # Pre-rendered sprite atlas
│   ├── sound.js            # Web Audio procedural sound effects
│   ├── map.js              # Core map system — grid, drawing helpers, registry
│   ├── enemy.js            # Enemy class — movement, abilities, rendering
│   ├── tower.js            # Tower class — targeting, firing, upgrades
│   ├── projectile.js       # Projectile class — homing, chain, splash
│   ├── effects.js          # Particle effects, death animations, radiation
│   ├── wave.js             # Wave manager — spawning, timing, rewards
│   ├── input.js            # Mouse/keyboard/touch input handling
│   ├── ui.js               # HUD, tower panel, setup screen, game-over
│   ├── main.js             # Game loop, state management, initialization
│   └── maps/               # Individual map modules (8 maps)
│       ├── crossroads.js
│       ├── winding_valley.js
│       ├── frozen_pass.js
│       ├── fortress_siege.js
│       ├── desert_oasis.js
│       ├── jungle_ruins.js
│       ├── volcanic_caldera.js
│       └── coastal_cliffs.js
└── assets/
    └── sounds/             # (reserved for future audio files)
```

## Technical Notes

- **Vanilla JS** — no frameworks, no dependencies, no build step
- **Modular maps** — each map is a standalone file in `js/maps/`; add a new map by creating one file and a script tag
- **Canvas 2D rendering** — all game visuals on a single `<canvas>`
- **Sprite atlas** — tiles pre-rendered to offscreen canvases, drawn via `drawImage()`
- **Web Audio API** — oscillator-based sound synthesis, no audio files needed
- **Delta-time game loop** — `requestAnimationFrame` with 100ms cap
- **Speed control** — 1×/2×/3× via multiplier on delta-time
- **PWA-ready** — service worker caches all assets for offline play

## Publishing to Android

1. Install [Capacitor](https://capacitorjs.com/): `npm install @capacitor/core @capacitor/cli`
2. Initialize: `npx cap init "Siege Command" "com.yourname.siegecommand"`
3. Add Android: `npx cap add android`
4. Sync: `npx cap sync`
5. Open in Android Studio: `npx cap open android`
6. Build → APK

Or deploy to any static host (Netlify, Vercel, GitHub Pages) — the PWA manifest makes it installable from the browser.
