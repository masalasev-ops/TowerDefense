// ========================================================
// Map: Lunar Base — moon surface with craters, Earth in the sky, lunar lander
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A desolate lunar (moon) surface with grey terrain (volcanic_3d
//   tiles), impact craters, a starry void in the upper atmosphere,
//   and Earth visible on the horizon. The map has a cold grey
//   color palette with white accents. A lunar lander module
//   sits in the lower-left, and an American-style flag is
//   planted in the lower-right.
//
// PATH LAYOUT STRATEGY
//   The path enters from the right (col 19, row 1) and snakes
//   across the lunar surface in a compact zigzag pattern. The
//   path makes 5 passes with tight turns, keeping enemies
//   visible across the relatively open terrain. The path ends
//   at the bottom-right castle (col 15, row 13).
//
// DECORATION PLACEMENT STRATEGY
//   Only BLOCKED_ROCK type is used — no trees or houses on the
//   moon. Rocks are uniformly scattered to represent lunar
//   boulders and debris. Large craters are rendered separately
//   in renderMap (not as decorations).
//
// TERRAIN TYPE: lunar (via renderSmoothPath)
//   Grey moon surface path with a slightly lighter center stripe.
//
// SPECIAL FEATURES
//   - Deep space background: dark blue-black gradient at the top
//     of the canvas with 40 randomly placed stars (white dots
//     with varying brightness).
//   - Earth on horizon: blue marble sphere at (GAME_WIDTH*0.78, 30)
//     with gradient, green continents, and white cloud wisps.
//   - Large craters: 3 impact craters at (100,60), (160,300),
//     and (100,450) with outer shadow rims, grey interiors,
//     inner depth shadows, and sunlit rim highlights.
//   - Small crater speckles: randomly placed on buildable cells
//     (22% chance) as small dark circles with white highlights.
//   - Lunar lander: detailed Apollo-style lander with legs,
//     foot pads, metallic body, glowing window, and antenna.
//   - American flag: planted at (660, 440) with pole and
//     red/blue striped fabric.
//   - Gate at entrance (col 19, row 1) and Castle at exit (col 15, row 13)
// ========================================================

MAP_DEFS.volcanic_caldera = {
    id: 'volcanic_caldera',
    name: 'Lunar Base',
    unlockRequirement: 'jungle_ruins',
    description: 'A desolate lunar outpost. Cratered terrain under a starry void with Earth on the horizon.',

    // ========================================================
    // Path Cells — compact zigzag across the lunar surface
    // ========================================================
    // Each cell is {c: col, r: row}. The 44-cell path zigzags
    // across the map with tight turns.
    //
    // Layout:
    //   Enter from right (col 19, row 1), left across row 1
    //   Drop down col 10 through rows 2-3
    //   Traverse left along row 3
    //   Drop down col 5 through rows 4-5
    //   Traverse right along row 5
    //   Drop down col 12 through rows 6-7
    //   Traverse left along row 7
    //   Drop down col 7 through rows 8-9
    //   Traverse right along row 9
    //   Descend col 15 through rows 10-13 to castle
    // ========================================================
    pathCells: [
        // --- Entry and first pass left (cols 19->10, row 1) ---
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 }, { c: 16, r: 1 }, { c: 15, r: 1 },
        { c: 14, r: 1 }, { c: 13, r: 1 }, { c: 12, r: 1 }, { c: 11, r: 1 }, { c: 10, r: 1 },

        // --- First descent (col 10, rows 2-3) ---
        { c: 10, r: 2 }, { c: 10, r: 3 },

        // --- Second pass left (cols 9->5, row 3) ---
        { c: 9, r: 3 }, { c: 8, r: 3 }, { c: 7, r: 3 }, { c: 6, r: 3 }, { c: 5, r: 3 },

        // --- Second descent (col 5, rows 4-5) ---
        { c: 5, r: 4 }, { c: 5, r: 5 },

        // --- Third pass right (cols 6->12, row 5) ---
        { c: 6, r: 5 }, { c: 7, r: 5 }, { c: 8, r: 5 }, { c: 9, r: 5 }, { c: 10, r: 5 },
        { c: 11, r: 5 }, { c: 12, r: 5 },

        // --- Third descent (col 12, rows 6-7) ---
        { c: 12, r: 6 }, { c: 12, r: 7 },

        // --- Fourth pass left (cols 11->7, row 7) ---
        { c: 11, r: 7 }, { c: 10, r: 7 }, { c: 9, r: 7 }, { c: 8, r: 7 }, { c: 7, r: 7 },

        // --- Fourth descent (col 7, rows 8-9) ---
        { c: 7, r: 8 }, { c: 7, r: 9 },

        // --- Fifth pass right (cols 8->15, row 9) ---
        { c: 8, r: 9 }, { c: 9, r: 9 }, { c: 10, r: 9 }, { c: 11, r: 9 },
        { c: 12, r: 9 }, { c: 13, r: 9 }, { c: 14, r: 9 }, { c: 15, r: 9 },

        // --- Final descent to castle (col 15, rows 10-13) ---
        { c: 15, r: 10 }, { c: 15, r: 11 }, { c: 15, r: 12 }, { c: 15, r: 13 },
    ],

    // ========================================================
    // Decorations — lunar rocks only (no trees or houses)
    // ========================================================
    // Only BLOCKED_ROCK type is used. Rocks are uniformly
    // distributed to simulate lunar boulders. Large craters
    // are rendered separately in renderMap.
    // ========================================================
    decorations: [
        // === Lunar rocks (small craters and boulders) ===
        // Uniformly scattered across the grid to represent
        // the rocky lunar surface
        { c: 3, r: 0, type: BLOCKED_ROCK }, { c: 7, r: 0, type: BLOCKED_ROCK },
        { c: 1, r: 1, type: BLOCKED_ROCK }, { c: 8, r: 1, type: BLOCKED_ROCK },
        { c: 4, r: 2, type: BLOCKED_ROCK }, { c: 15, r: 2, type: BLOCKED_ROCK },
        { c: 1, r: 3, type: BLOCKED_ROCK }, { c: 13, r: 3, type: BLOCKED_ROCK },
        { c: 8, r: 4, type: BLOCKED_ROCK }, { c: 17, r: 4, type: BLOCKED_ROCK },
        { c: 2, r: 5, type: BLOCKED_ROCK }, { c: 15, r: 5, type: BLOCKED_ROCK },
        { c: 4, r: 6, type: BLOCKED_ROCK }, { c: 17, r: 6, type: BLOCKED_ROCK },
        { c: 1, r: 7, type: BLOCKED_ROCK }, { c: 16, r: 7, type: BLOCKED_ROCK },
        { c: 3, r: 8, type: BLOCKED_ROCK }, { c: 13, r: 8, type: BLOCKED_ROCK },
        { c: 5, r: 9, type: BLOCKED_ROCK }, { c: 18, r: 9, type: BLOCKED_ROCK },
        { c: 2, r: 10, type: BLOCKED_ROCK }, { c: 11, r: 10, type: BLOCKED_ROCK },
        { c: 7, r: 11, type: BLOCKED_ROCK }, { c: 18, r: 11, type: BLOCKED_ROCK },
        { c: 4, r: 12, type: BLOCKED_ROCK }, { c: 12, r: 12, type: BLOCKED_ROCK },
        { c: 8, r: 13, type: BLOCKED_ROCK }, { c: 18, r: 13, type: BLOCKED_ROCK },
        { c: 5, r: 0, type: BLOCKED_ROCK }, { c: 17, r: 2, type: BLOCKED_ROCK },
        { c: 3, r: 10, type: BLOCKED_ROCK },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the lunar base scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Deep space background (dark gradient + stars)
    //   2. Earth on the horizon (blue marble with continents and clouds)
    //   3. Terrain tiles (volcanic_3d) with crater speckles
    //   4. Decoration sprites on BLOCKED cells
    //   5. Smooth path ribbon (lunar terrain)
    //   6. Large craters (3 impact craters with shadow rims)
    //   7. Lunar lander (detailed Apollo-style module)
    //   8. American flag (pole with red/blue fabric)
    //   9. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // ========================================
        // Phase 1: Deep space background at top
        // ========================================
        // Dark blue-black gradient fading to transparent.
        // Covers the top 60px of the canvas.
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, 60);
        spaceGrad.addColorStop(0, '#050510');
        spaceGrad.addColorStop(1, 'rgba(5,5,16,0)');
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, 60);

        // Stars (40 randomly placed white dots with varying brightness)
        for (let i = 0; i < 40; i++) {
            const starX = seededRand(i * 17) * GAME_WIDTH;
            const starY = seededRand(i * 31) * 100;
            const brightness = 0.4 + seededRand(i * 13) * 0.6;
            ctx.fillStyle = 'rgba(255,255,255,' + brightness + ')';
            ctx.beginPath();
            ctx.arc(starX, starY, 0.5 + seededRand(i * 19) * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ========================================
        // Phase 2: Earth on the horizon
        // ========================================
        // Earth is positioned at (GAME_WIDTH*0.78, 30) and
        // consists of: outer glow, blue marble sphere with
        // radial gradient, green continent patches, and
        // white cloud wisps.
        const earthX = GAME_WIDTH * 0.78, earthY = 30;

        // Outer glow
        ctx.fillStyle = 'rgba(30,60,180,0.15)';
        ctx.beginPath();
        ctx.arc(earthX, earthY, 38, 0, Math.PI * 2);
        ctx.fill();

        // Earth blue marble (radial gradient from bright blue to deep blue)
        const earthGrad = ctx.createRadialGradient(
            earthX - 8, earthY - 8, 5,   // Highlight offset
            earthX, earthY, 32            // Full sphere
        );
        earthGrad.addColorStop(0, '#4FC3F7');
        earthGrad.addColorStop(0.3, '#1E88E5');
        earthGrad.addColorStop(0.5, '#1565C0');
        earthGrad.addColorStop(0.7, '#0D47A1');
        earthGrad.addColorStop(1, '#1A237E');
        ctx.fillStyle = earthGrad;
        ctx.beginPath();
        ctx.arc(earthX, earthY, 32, 0, Math.PI * 2);
        ctx.fill();

        // Continents (green patches)
        ctx.fillStyle = 'rgba(76,175,80,0.5)';
        ctx.beginPath();
        ctx.arc(earthX + 8, earthY - 5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(earthX - 5, earthY + 8, 7, 0, Math.PI * 2);
        ctx.fill();

        // Cloud wisps (white ellipses)
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(earthX - 3, earthY - 12, 14, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(earthX + 10, earthY + 4, 10, 3, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // ========================================
        // Phase 3 & 4: Terrain tiles and decorations
        // ========================================
        // Draw volcanic_3d tiles across the grid. On buildable
        // cells, randomly add small crater speckles (22% chance)
        // with dark shadows and white rim highlights. On BLOCKED
        // cells, draw the decoration sprite.
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'volcanic_3d', row + col, x, y);
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_ROCK;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'volcanic_3d', row + col, x, y);

                    // Small crater speckles on buildable cells
                    const r = seededRand(row * 1000 + col);
                    if (r > 0.78) {
                        const craterRadius = 3 + seededRand(row * 33 + col) * 4;
                        // Dark inner shadow
                        ctx.fillStyle = 'rgba(0,0,0,0.12)';
                        ctx.beginPath();
                        ctx.arc(cx, cy, craterRadius, 0, Math.PI * 2);
                        ctx.fill();
                        // White rim highlight (upper-left, light source)
                        ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        ctx.beginPath();
                        ctx.arc(cx - 1, cy - 1, 1.5 + seededRand(row * 33 + col) * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // ========================================
        // Phase 5: Smooth path ribbon (lunar)
        // ========================================
        renderSmoothPath(ctx, 'lunar', 12);

        // ========================================
        // Phase 6: Large craters with shadow rims
        // ========================================
        // Three large impact craters with detailed rendering:
        //   - Outer shadow (offset dark ellipse for depth)
        //   - Rim (light grey ring)
        //   - Interior (radial gradient from dark to lighter grey)
        //   - Inner depth shadow (dark crescent for 3D bowl effect)
        //   - Sunlit rim highlight (white arc on the upper edge)
        const craters = [
            { x: 100, y: 60, r: 38 },    // Top-left crater
            { x: 160, y: 300, r: 48 },   // Center-left crater (largest)
            { x: 100, y: 450, r: 32 },   // Bottom-left crater
        ];
        craters.forEach(function(crater) {
            // Outer rim shadow (offset for depth)
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.arc(crater.x + 3, crater.y + 3, crater.r + 6, 0, Math.PI * 2);
            ctx.fill();

            // Rim (light grey ring)
            ctx.fillStyle = '#BDBDBD';
            ctx.beginPath();
            ctx.arc(crater.x, crater.y, crater.r + 4, 0, Math.PI * 2);
            ctx.fill();

            // Crater interior (radial gradient for depth)
            const craterGrad = ctx.createRadialGradient(
                crater.x - crater.r * 0.2, crater.y - crater.r * 0.2, crater.r * 0.1,
                crater.x, crater.y, crater.r
            );
            craterGrad.addColorStop(0, '#8A8A8A');
            craterGrad.addColorStop(0.7, '#9E9E9E');
            craterGrad.addColorStop(1, '#B0B0B0');
            ctx.fillStyle = craterGrad;
            ctx.beginPath();
            ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
            ctx.fill();

            // Inner shadow (dark crescent for bowl illusion)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(crater.x - crater.r * 0.15, crater.y + crater.r * 0.15, crater.r * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Rim highlight (sunlit upper edge)
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(crater.x, crater.y, crater.r + 2, -Math.PI * 0.4, Math.PI * 0.2);
            ctx.stroke();
        });

        // ========================================
        // Phase 7: Lunar lander
        // ========================================
        // Detailed Apollo-style lunar module at (60, 240).
        // Components:
        //   - Shadow on the ground
        //   - Four landing legs with foot pads
        //   - Metallic body with gradient fill
        //   - Glowing window (amber-yellow)
        //   - Antenna with red tip
        const landerX = 60, landerY = 240;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(landerX + 3, landerY + 18, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs (four struts extending from body to ground)
        ctx.strokeStyle = '#BDBDBD';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(landerX - 8, landerY - 4); ctx.lineTo(landerX - 12, landerY + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(landerX + 8, landerY - 4); ctx.lineTo(landerX + 12, landerY + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(landerX - 3, landerY + 2); ctx.lineTo(landerX - 5, landerY + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(landerX + 3, landerY + 2); ctx.lineTo(landerX + 5, landerY + 14); ctx.stroke();

        // Foot pads (rectangular pads at the bottom of each leg)
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(landerX - 15, landerY + 12, 8, 3);
        ctx.fillRect(landerX + 7, landerY + 12, 8, 3);
        ctx.fillRect(landerX - 8, landerY + 12, 8, 3);
        ctx.fillRect(landerX, landerY + 12, 8, 3);

        // Body (grey metallic box with gradient)
        const bodyGrad = ctx.createLinearGradient(landerX - 8, 0, landerX + 8, 0);
        bodyGrad.addColorStop(0, '#E0E0E0');
        bodyGrad.addColorStop(0.5, '#FAFAFA');
        bodyGrad.addColorStop(1, '#BDBDBD');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(landerX - 8, landerY - 10, 16, 12);

        ctx.strokeStyle = '#9E9E9E';
        ctx.lineWidth = 1;
        ctx.strokeRect(landerX - 8, landerY - 10, 16, 12);

        // Window (glowing amber)
        ctx.fillStyle = '#FFE082';
        ctx.fillRect(landerX - 3, landerY - 7, 6, 5);

        // Antenna (thin line with red ball on top)
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(landerX + 2, landerY - 10);
        ctx.lineTo(landerX + 2, landerY - 20);
        ctx.stroke();
        ctx.fillStyle = '#FF5252';
        ctx.beginPath();
        ctx.arc(landerX + 2, landerY - 21, 2, 0, Math.PI * 2);
        ctx.fill();

        // ========================================
        // Phase 8: American-style flag
        // ========================================
        // Flag planted at (660, 440) with pole, red/blue
        // striped fabric, and a subtle wave effect.
        const flagX = 660, flagY = 440;

        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(flagX, flagY);
        ctx.lineTo(flagX, flagY - 28);
        ctx.stroke();

        // Flag fabric (red background with blue canton)
        ctx.fillStyle = '#F44336';
        ctx.fillRect(flagX, flagY - 28, 14, 9);
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(flagX, flagY - 28, 7, 5);

        // Flag wave detail (subtle fold line)
        ctx.strokeStyle = '#BDBDBD';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(flagX + 14, flagY - 24);
        ctx.lineTo(flagX + 10, flagY - 20);
        ctx.lineTo(flagX + 14, flagY - 19);
        ctx.stroke();

        // ========================================
        // Phase 9: Gate (entrance) and Castle (exit)
        // ========================================
        const spawnCell = PATH_CELLS[0];
        drawGate(
            ctx,
            spawnCell.c * CELL_SIZE + CELL_SIZE / 2,
            spawnCell.r * CELL_SIZE + CELL_SIZE / 2 + 4,
            18
        );

        const baseCell = PATH_CELLS[PATH_CELLS.length - 1];
        drawCastle(
            ctx,
            baseCell.c * CELL_SIZE + CELL_SIZE / 2,
            baseCell.r * CELL_SIZE + CELL_SIZE / 2 - 2,
            20
        );
    },

    // ========================================================
    // renderPathArrows — direction indicators along the path
    // ========================================================
    // Uses white arrows (higher contrast on the dark lunar surface)
    // at the midpoint between each consecutive waypoint pair,
    // rotated to face the direction of travel.
    // ========================================================
    renderPathArrows: function(ctx) {
        for (let i = 0; i < WAYPOINTS.length - 1; i++) {
            const from = WAYPOINTS[i];
            const to = WAYPOINTS[i + 1];
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            // White color for visibility on dark lunar surface
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(-3, -2);
            ctx.lineTo(-3, 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
};
