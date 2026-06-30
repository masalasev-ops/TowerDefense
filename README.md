# Tower Defense — Siege Command

A browser-based tower defense game built with vanilla JavaScript and HTML5 Canvas. Defend your castle across 8 unique maps, unlock new terrain by conquering previous ones, and survive escalating waves of enemies.

## Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in any modern browser — no build step, no dependencies
3. **Choose a map** (🌳 Crossroads is the first; beat it to unlock more)
4. **Pick a difficulty** (🟢 Easy / 🟡 Normal / 🔴 Hard)
5. **Click "Start Game"** — you're defending your castle!

> 💡 The PWA manifest makes it installable on mobile from the browser.

## How to Play

| Action | Control |
|---|---|
| Place a tower | Click a tower button, then click a green buildable cell |
| Upgrade a tower | Click an existing tower, then click **Upgrade** (3 levels max) |
| Sell a tower | Click an existing tower, then click **Sell** (40% refund) |
| Change targeting | **Right-click** a placed tower to cycle modes (🎯 Furthest / 💪 Strongest / 💀 Weakest / 💨 Fastest) |
| Start next wave | Press **Space** or click **Start Wave** |
| Change speed | Press **1** (1×), **2** (2×), or **3** (3×) |
| Pause | Press **P** or click ⏸ |
| Mute sound | Click 🔊 in the HUD |
| Repair castle | Click **🔧 Repair** between waves |
| Deselect | Press **Escape** |

## Maps

All maps feature **smooth rounded paths** rendered as continuous ribbons instead of square grid tiles, with 6px 3D beveled terrain edges and a subtle vignette for depth. No visible grid lines.

| # | Map | Spawn | Path | Features |
|---|-----|-------|------|----------|
| 1 | 🌳 **Crossroads** | Left | 45 cells | Creek with bridges, village houses, trees |
| 2 | 🏞️ **Winding Valley** | Right | 49 cells | Mountain-flanked valley, 16 peaks, sky gradient |
| 3 | ❄️ **Frozen Pass** | Top-right | 41 cells | Snow peaks, frozen lake, ice crystals, snowdrifts |
| 4 | 🏯 **Fortress Siege** | Right | 66 cells | Cobblestone path, meadows, birds, rabbits, deer |
| 5 | 🌵 **Desert Oasis** | Top-left | 42 cells | Sand dunes, oasis pool, palm trees, camels |
| 6 | 🌴 **Jungle Ruins** | Top-left | 49 cells | Dense jungle, temple ruins, winding river, bridges |
| 7 | 🌙 **Lunar Base** | Top-right | 46 cells | Moon surface, craters, Earth on horizon, lander |
| 8 | 🏖️ **Coastal Cliffs** | Top-left | 45 cells | Cliffside, ocean waves, lighthouse, boats, seagulls |

Maps unlock sequentially by beating the previous one. Progress saves to `localStorage`.

## Difficulty Modes

| Setting | Easy | Normal | Hard |
|---|---|---|---|
| Starting Gold | 400g | 250g | 220g |
| Enemy HP | ×0.58 | ×0.95 | ×1.45 |
| Enemy Speed | ×0.75 | ×0.90 | ×1.10 |
| Wave Bonus Gold | 130% | 100% | 60% |
| Elite Interval | Every 7 waves | Every 4 waves | Every 4 waves |
| Elite HP | ×1.20 | ×2.20 | ×2.00 |
| Elite Speed | ×1.10 | ×1.30 | ×1.35 |
| Spawn Interval | 0.90s | 0.65s | 0.55s |
| Wave Delay | 3.0s | 2.0s | 1.2s |
| Waves to Win | 15 | 20 | 25 |
| Castle Heal/Wave | 60 HP | — | — |

**Elites only appear from wave 10 onwards.** Easy mode heals the castle by 60 HP after each wave.

## Win Condition

Survive the required number of waves to conquer a map. On victory the next map unlocks and the game continues in **Endless Mode**. If the castle falls, it's game over. Mid-game progress auto-saves after each wave — a **Continue** button appears on the setup screen.

## Towers

One new tower unlocks after each milestone wave (button and celebration appear between rounds, never mid-round). Each tower has **3 upgrade levels**. Sell value is **40%** of total investment.

### Tower Stats

| Tower | Unlock | L0 | L1 | L2 | DPS (max) | Special |
|---|---|---|---|---|---|---|
| 🏹 **Archer** | Start | 15 dmg / 1.00/s | 23 dmg / 1.10/s | 36 dmg / 1.20/s | **43.2** | Reliable single-target, low cost |
| ❄️ **Frost** | Start | 11 dmg / 0.60/s | 17 dmg / 0.65/s | 26 dmg / 0.75/s | **19.5** | 40→60% slow, splash slow L1+ |
| 💣 **Cannon** | Wave 3 | 42 dmg / 0.45/s | 63 dmg / 0.50/s | 95 dmg / 0.55/s | **52.3** | Splash 45→65px |
| ⚡ **Tesla** | Wave 4 | 26 dmg / 0.50/s | 40 dmg / 0.55/s | 58 dmg / 0.60/s | **34.8** | Chains 3→5 targets (75% falloff) |
| 🔫 **Sniper** | Wave 6 | 68 dmg / 0.30/s | 105 dmg / 0.35/s | 158 dmg / 0.40/s | **63.2** | 50→100% armor pierce (proportional) |
| 🎯 **Mortar** | Wave 7 | 74 dmg / 0.35/s | 116 dmg / 0.38/s | 179 dmg / 0.42/s | **75.2** | Splash 55→80px, 0.3→0.5s stun L1+ |
| ☢️ **Nuke Silo** | Wave 10 | 263 dmg / 0.06/s | 473 dmg / 0.07/s | 840 dmg / 0.09/s | **75.6** | Hits all enemies + radiation DoT, countdown timer |
| 🔮 **Plasma** | Wave 12 | 126 dmg / 0.25/s | 210 dmg / 0.28/s | 336 dmg / 0.32/s | **107.5** | Ignores armor, beam |

> DPS shown is single-target effective: `damage × attacks-per-second`. AoE towers (Cannon, Mortar, Nuke) deal much higher total damage against grouped enemies. Frost's primary value is its slow utility; damage is secondary.

### Armor Pierce (Sniper)

Sniper's armor pierce is **proportional** — it reduces enemy armor by the listed percentage:

| Sniper Level | Pierce | Effect |
|---|---|---|
| L0 | 50% | Tank's 40% armor → effective 20% armor |
| L1 | 70% | Tank's 40% armor → effective 12% armor |
| L2 | 100% | Ignores armor completely (also bypasses shields and phase) |

Plasma and Nuke always ignore armor (100% pierce). Tesla and Frost have no pierce.

### Tower Costs

| Tower | Base | L1 Upgrade | L2 Upgrade | Total to Max |
|---|---|---|---|---|
| 🏹 Archer | 50g | 40g | 80g | 170g |
| ❄️ Frost | 75g | 60g | 120g | 255g |
| 💣 Cannon | 100g | 75g | 150g | 325g |
| ⚡ Tesla | 150g | 120g | 200g | 470g |
| 🔫 Sniper | 125g | 100g | 180g | 405g |
| 🎯 Mortar | 175g | 130g | 220g | 525g |
| ☢️ Nuke | 400g | 320g | 500g | 1,220g |
| 🔮 Plasma | 400g | 300g | 500g | 1,200g |

### Targeting Modes

Each placed tower can cycle through 4 targeting priorities by **right-clicking** it:

| Mode | Priority | Best For |
|---|---|---|
| 🎯 Furthest Along | Closest to castle | Default; prevents leaks |
| 💪 Strongest | Highest max HP | Bosses and tanks |
| 💀 Lowest HP | Lowest current HP | Finishing off wounded enemies |
| 💨 Fastest | Highest speed | Runners and flyers |

### Visuals

- **Archer** — wooden watchtower with pointed roof, visible bow and bowstring
- **Frost** — hexagonal crystal with center gem and ice-blue glow
- **Cannon** — circular base with dark barrel
- **Tesla** — coil tower with sparking orb at top
- **Sniper** — low military bunker with camo stripes, bipod legs, long barrel, scope glint
- **Mortar** — wide base with angled barrel
- **Nuke Silo** — dome with radiation symbol, animated charge bar, countdown timer
- **Plasma** — crystalline energy weapon with glowing orb tip

## Enemies

All enemies follow the path waypoints. Each has a unique stat profile and ability.

### Stats & Abilities

| Enemy | HP | Speed | Armor | Gold | Ability |
|---|---|---|---|---|---|
| **Grunt** | 120 | 55 px/s | 0% | 12 | Basic — no specials |
| **Runner** | 80 | 115 px/s | 0% | 10 | **25% dodge** — 1 in 4 attacks miss |
| **Tank** | 240 | 30 px/s | 40% | 30 | **Heavy armor** — 40% damage reduction |
| **Flyer** | 200 | 75 px/s | 0% | 18 | **Slow-immune** — Frost has no effect; hovers above path |
| **Boss** | 1,000 | 26 px/s | 35% | 150 | **8 HP/s regen** — every 10 waves; +35% HP per 10 waves |
| 🟢 **Healer** | 100 | 40 px/s | 5% | 22 | **Heals allies** — 8 HP every 1.3s within 80px |
| 🟠 **Splitter** | 140 | 35 px/s | 10% | 28 | **Fragments** — spawns 3 Fragments on death |
| ⬜ **Fragment** | 50 | 50 px/s | 0% | 5 | Minion from Splitter |
| 🔵 **Shielded** | 200 | 30 px/s | 20% | 35 | **5-hit shield** — 80% absorption; 💥 feedback on break |
| 🟣 **Phantom** | 150 | 85 px/s | 0% | 30 | **Phase** — 1.5s immune every 4.0s (37.5% uptime) |

### Scaling

```
hpMult  = (1 + (wave-1) × 0.16) × difficulty.hpMult × (eliteHpMult if elite else 1) × 1.10 if wave ≥ 11
speed   = baseSpeed × (1 + (wave-1) × 0.03) × difficulty.speedMult × (eliteSpeedMult if elite else 1)
```

- Gold per kill is **fixed per enemy type** — income scales naturally via increasing enemy counts each wave
- Bosses get an additional `× (1 + floor(wave/10) × 0.35)` on HP
- **All enemies at wave 11+ get +10% HP**

### Example HP Values (Normal)

| Wave | Grunt | Tank | Boss |
|------|-------|------|------|
| 1 | 114 | — | — |
| 5 | 207 | 415 | — |
| 10 (elite) | 603 | 1,207 | 5,204 |
| 11 | 720 | 1,441 | — |
| 15 (elite) | 896 | 1,792 | — |
| 20 (elite) | 1,128 | 2,256 | 17,293 |

## Waves

Wave compositions are **procedurally randomized** — no two playthroughs are identical. Waves 1–10 use guided templates with ±20% count variation. Beyond wave 10, enemy types and counts are fully randomized with occasional wildcard surprises where unexpected enemies appear early.

A **wave preview splash card** pops up centered on screen at the start of each wave, showing the enemy types you'll face. Duration scales with game speed: ~2.5s at 1×, ~1.3s at 2×, ~0.8s at 3×.

After each wave, a **post-wave summary** shows kills, enemies that reached the castle, and gold earned.

## Features

- **Smooth rounded paths** — continuous ribbon rendering with arcTo corners and path drop shadows
- **3D beveled terrain** — 6px extruded tile edges with directional lighting, no visible grid lines
- **Cinematic vignette** — subtle radial edge darkening for depth
- **10 enemy types** each with a unique ability (dodge, armor, slow-immunity, regen, heal, split, 5-hit shield with break feedback, phase immunity)
- **8 tower types** across 4 tiers, each with 3 upgrade levels — one unlocks per wave
- **4 targeting modes** — right-click any tower to cycle priority (furthest/strongest/weakest/fastest)
- **Proportional armor pierce** — Sniper partially reduces armor at L0/L1, full pierce at L2
- **Mortar stun** — L1+ Mortar shells briefly stun enemies on hit (0.3s → 0.5s)
- **Nuke countdown** — visible timer on Nuke Silo showing seconds until next strike
- **8 unique maps** with distinct terrain, colors, and strategic layouts
- **3 difficulty modes** with separate HP/speed/elite/economy tuning
- **Wave preview splash** — centered animated card showing upcoming enemy types, speed-scaled duration
- **Tower unlock celebrations** — animated splash cards between rounds showing new towers
- **Mid-game save/resume** — auto-saves after each wave; continue anytime
- **Enhanced enemy visuals** — gradient shading, walking animations, particle trails, multi-phase deaths, elite indicators
- **Post-game statistics** — tower kill breakdown on game over screen
- **Sprite atlas** — pre-rendered tiles and decorations for performance
- **Web Audio** — 15 procedural sound effects with volume/mute control (including shield break)
- **PWA support** — installable, service worker with offline caching
- **Glass-morphism UI** — backdrop blur, glow effects, responsive layout, touch controls
- **56 unit tests** — `npm test` via Vitest

## Economy & Balance

### Gold Income

| Source | Description |
|---|---|
| Starting gold | 220–400g depending on difficulty |
| Kill rewards | 5–150g fixed per enemy type |
| Wave bonus | 45 + wave × 3, multiplied by difficulty modifier |
| Sell refund | 40% of total tower investment |
| Repair cost | 0.30g per missing HP (minimum 25g) |

Gold income scales naturally through increasing enemy counts at higher waves rather than per-enemy gold multipliers. This keeps the economy tight and strategic — every purchase matters.

### Strategy Tips

- **Early game (waves 1–3):** Start with 1–2 Archers (50g each). Add a Frost tower (75g) for slow utility once you have a DPS base. Frost is a support tower — pair it with damage dealers.
- **Mid game (waves 4–9):** Add Cannon or Tesla for AoE. Sniper's armor pierce helps against tanks. Build towers near path choke points and use Frost slow to keep enemies in range longer.
- **Late game (waves 10+):** Nuke and Plasma provide overwhelming firepower. Right-click towers to set smart targeting — Snipers on "Strongest" for bosses, Archers on "Weakest" for cleanup. Mortar stun gives you extra time against fast waves.
- **Economy:** Don't overspend on early upgrades; more towers usually beat one maxed tower. Save for tier-4 towers (400g) around wave 10. Sell underperforming towers to reposition.
- **Repair:** Use repair between waves when castle HP is low. At 0.30g per HP, repairing 500 HP costs 150g — cheaper than losing the game.

## Project Structure

```
├── index.html
├── manifest.json
├── sw.js
├── package.json / vitest.config.js
├── css/style.css
├── js/
│   ├── constants.js        # Towers, enemies, waves, difficulty tuning
│   ├── sprites.js          # Pre-rendered 3D tile & decoration atlas
│   ├── sound.js            # Web Audio procedural effects
│   ├── map.js              # Grid, lighting helpers, smooth path renderer, map registry
│   ├── enemy.js            # Enemy movement, abilities, rendering
│   ├── tower.js            # Tower targeting, firing, upgrades, rendering
│   ├── projectile.js       # Projectiles — homing, splash, chain, nuke
│   ├── effects.js          # Particles, celebrations, death effects, wave splash
│   ├── wave.js             # Wave spawning, timing, rewards
│   ├── input.js            # Mouse, keyboard, touch
│   ├── ui.js               # HUD, tower panel, setup, game-over, wave splash
│   ├── main.js             # Game loop, state, save/resume, vignette
│   └── maps/               # 8 map modules
└── tests/
    └── game-logic.test.js  # 56 unit tests
```

## Technical Notes

- **Zero dependencies** — vanilla JS, single Canvas 2D context
- **Smooth path rendering** — continuous ribbon with arcTo corners and drop shadows, replacing per-tile path drawing
- **3D terrain** — 6px extruded tile edges with directional lighting, pre-rendered at init (zero runtime cost)
- **Vignette overlay** — radial gradient edge darkening rendered each frame
- **Procedural audio** — oscillator-based synthesis, no audio files
- **Delta-time loop** — `requestAnimationFrame` with 100ms cap; 1×/2×/3× speed + pause
- **Randomized waves** — no memorization possible; ±20–35% count variation
- **56 unit tests** — `npm test` via Vitest covering waves, damage, armor pierce, unlocks, movement

## Publishing to Android

See [Capacitor](https://capacitorjs.com/) for native Android builds. Or deploy to any static host (Netlify, Vercel, GitHub Pages) — the PWA manifest handles installation.
