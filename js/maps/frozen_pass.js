// ========================================================
// Map: Frozen Pass — icy mountain pass with snow-capped peaks
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A frozen mountain pass with snow-covered terrain, a frozen
//   lake, and snow-capped mountain peaks. The entire map uses
//   snow_3d tiles with a cool blue-white color palette. Ice
//   crystals sparkle on the snow, and snowdrifts add texture.
//
// PATH LAYOUT STRATEGY
//   The path enters from the right (col 19, row 1) and snakes
//   leftward in a series of switchbacks, crossing the top of a
//   frozen lake. The path makes 4 passes across the grid with
//   tight turns that force enemies to slow down. The path ends
//   at the bottom-center (col 6, row 13).
//
// DECORATION PLACEMENT STRATEGY
//   Rocks are placed at regular intervals across the map to
//   simulate rocky outcrops in the snow. Trees are sparse and
//   hardy (snow-covered evergreens). No houses — this is a
//   desolate alpine environment.
//
// TERRAIN TYPE: ice (via renderSmoothPath)
//   Cool grey-blue path surface that contrasts with the white
//   snow surrounding it.
//
// SPECIAL FEATURES
//   - Mountains: 5 snow-capped peaks across the top of the map
//     drawn with drawMountain() — each with {x, w, h, s}
//     parameters controlling position, width, height, and seed
//   - Frozen lake: large elliptical blue-white ice sheet at
//     center-left (lx=180, ly=420) with white fracture lines
//   - Snowdrifts: randomly placed on buildable cells (30% chance)
//     using curved white gradient mounds
//   - Ice crystals: randomly placed on buildable cells (15% chance)
//     using multi-armed crystalline shards
//   - Gate at entrance (col 19, row 1) and Castle at exit (col 6, row 13)
// ========================================================

MAP_DEFS.frozen_pass = {
    id: 'frozen_pass',
    name: 'Frozen Pass',
    unlockRequirement: 'winding_valley',
    description: 'An icy mountain pass where the cold bites deep. Snow slows all movement.',

    // ========================================================
    // Path Cells — switchback descent through the frozen pass
    // ========================================================
    // Each cell is {c: col, r: row}. The 35-cell path forms a
    // zigzag pattern across the middle of the map.
    //
    // Layout:
    //   Enter from right (col 19, row 1), move left along row 1
    //   Drop down col 15 through rows 2-4
    //   Traverse left along row 4
    //   Drop down col 9 through rows 5-7
    //   Traverse right along row 7
    //   Drop down col 14 through rows 8-10
    //   Traverse left along row 10
    //   Descend col 6 through rows 11-13 to castle
    // ========================================================
    pathCells: [
        // --- Entry and first pass (col 19->15, row 1) ---
        // Enemies spawn at the right edge and move left along the top
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 }, { c: 16, r: 1 }, { c: 15, r: 1 },

        // --- First descent (col 15, rows 2-4) ---
        // Drop down 3 rows along the first major column
        { c: 15, r: 2 }, { c: 15, r: 3 }, { c: 15, r: 4 },

        // --- Second pass left (cols 14->9, row 4) ---
        // Traverse left across the middle section
        { c: 14, r: 4 }, { c: 13, r: 4 }, { c: 12, r: 4 }, { c: 11, r: 4 }, { c: 10, r: 4 }, { c: 9, r: 4 },

        // --- Second descent (col 9, rows 5-7) ---
        { c: 9, r: 5 }, { c: 9, r: 6 }, { c: 9, r: 7 },

        // --- Third pass right (cols 10->14, row 7) ---
        { c: 10, r: 7 }, { c: 11, r: 7 }, { c: 12, r: 7 }, { c: 13, r: 7 }, { c: 14, r: 7 },

        // --- Third descent (col 14, rows 8-10) ---
        { c: 14, r: 8 }, { c: 14, r: 9 }, { c: 14, r: 10 },

        // --- Fourth pass left (cols 13->6, row 10) ---
        // Long traverse across the bottom section
        { c: 13, r: 10 }, { c: 12, r: 10 }, { c: 11, r: 10 }, { c: 10, r: 10 }, { c: 9, r: 10 },
        { c: 8, r: 10 }, { c: 7, r: 10 }, { c: 6, r: 10 },

        // --- Final descent to castle (col 6, rows 11-13) ---
        { c: 6, r: 11 }, { c: 6, r: 12 }, { c: 6, r: 13 },
    ],

    // ========================================================
    // Decorations — rocks and hardy trees in the snow
    // ========================================================
    // Rocks are placed at regular intervals across the map.
    // Trees appear occasionally as snow-covered evergreens.
    // No houses in this desolate alpine environment.
    // ========================================================
    decorations: [
        // === Rocks (scattered across the frozen terrain) ===
        // Positioned at various columns and rows to simulate
        // natural rocky outcrops in the snow
        { c: 11, r: 0, type: BLOCKED_ROCK }, { c: 4, r: 0, type: BLOCKED_ROCK },
        { c: 18, r: 0, type: BLOCKED_ROCK }, { c: 1, r: 1, type: BLOCKED_ROCK },
        { c: 13, r: 2, type: BLOCKED_ROCK }, { c: 3, r: 2, type: BLOCKED_ROCK },
        { c: 7, r: 2, type: BLOCKED_ROCK },
        { c: 19, r: 3, type: BLOCKED_ROCK }, { c: 5, r: 3, type: BLOCKED_ROCK },
        { c: 17, r: 5, type: BLOCKED_ROCK }, { c: 1, r: 5, type: BLOCKED_ROCK },
        { c: 19, r: 6, type: BLOCKED_ROCK }, { c: 4, r: 6, type: BLOCKED_ROCK },
        { c: 16, r: 8, type: BLOCKED_ROCK }, { c: 2, r: 8, type: BLOCKED_ROCK },
        { c: 18, r: 9, type: BLOCKED_ROCK }, { c: 0, r: 9, type: BLOCKED_ROCK },
        { c: 19, r: 11, type: BLOCKED_ROCK }, { c: 3, r: 11, type: BLOCKED_ROCK },
        { c: 15, r: 12, type: BLOCKED_ROCK }, { c: 3, r: 12, type: BLOCKED_ROCK },

        // === Trees (sparse — cold-hardy evergreens) ===
        { c: 8, r: 0, type: BLOCKED_TREE }, { c: 13, r: 1, type: BLOCKED_TREE },
        { c: 5, r: 1, type: BLOCKED_TREE }, { c: 1, r: 3, type: BLOCKED_TREE },
        { c: 18, r: 4, type: BLOCKED_TREE }, { c: 6, r: 5, type: BLOCKED_TREE },
        { c: 16, r: 6, type: BLOCKED_TREE }, { c: 2, r: 7, type: BLOCKED_TREE },
        { c: 11, r: 8, type: BLOCKED_TREE }, { c: 3, r: 9, type: BLOCKED_TREE },
        { c: 17, r: 11, type: BLOCKED_TREE }, { c: 9, r: 13, type: BLOCKED_TREE },
        { c: 0, r: 13, type: BLOCKED_TREE }, { c: 14, r: 0, type: BLOCKED_TREE },
        { c: 2, r: 4, type: BLOCKED_TREE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the frozen mountain scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Mountains — 5 snow-capped peaks across the top
    //   2. Frozen lake — elliptical ice sheet with fracture lines
    //   3. Terrain tiles — snow_3d across all cells
    //   4. Snowdrifts — randomly placed on buildable cells
    //   5. Ice crystals — randomly placed on buildable cells
    //   6. Decoration sprites on BLOCKED cells
    //   7. Smooth path ribbon (ice terrain)
    //   8. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // ========================================
        // Phase 1: Mountains
        // ========================================
        // Five snow-capped peaks drawn across the top of the map.
        // Each mountain is defined by {x, w, h, s}:
        //   x — center X position (pixels from left)
        //   w — width of mountain base
        //   h — height of mountain peak
        //   s — seed for peak asymmetry and snow cap variation
        [
            { x: 40, w: 160, h: 110, s: 100 },
            { x: 180, w: 200, h: 140, s: 200 },
            { x: 380, w: 170, h: 125, s: 300 },
            { x: 540, w: 190, h: 150, s: 400 },
            { x: 700, w: 140, h: 105, s: 500 },
        ].forEach(function(mountain) {
            drawMountain(ctx, mountain.x, 0, mountain.w, mountain.h, mountain.s);
        });

        // ========================================
        // Phase 2: Frozen lake
        // ========================================
        // A large semi-transparent blue-white elliptical ice sheet
        // positioned at the lower-left (lx=180, ly=420).
        // Features:
        //   - Outer glow ring (translucent blue ellipse)
        //   - Solid ice surface (pale blue-white fill)
        //   - White fracture/crack lines (sinusoidal strokes)
        const lakeX = 180, lakeY = 420;

        // Outer ice glow
        ctx.fillStyle = 'rgba(150,200,230,0.15)';
        ctx.beginPath();
        ctx.ellipse(lakeX, lakeY, 160, 55, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Ice surface
        ctx.fillStyle = '#c8ddf0';
        ctx.beginPath();
        ctx.ellipse(lakeX, lakeY, 140, 48, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Fracture lines (cracks in the ice)
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const crackStartX = lakeX - 80 + i * 40;
            const crackStartY = lakeY - 15 + Math.sin(i * 1.8) * 20;
            ctx.beginPath();
            ctx.moveTo(crackStartX, crackStartY);
            ctx.lineTo(
                crackStartX + seededRand(i * 30) * 30,
                crackStartY + seededRand(i * 40 + 1) * 15 - 8
            );
            ctx.stroke();
        }

        // ========================================
        // Phase 3-5: Terrain tiles, snowdrifts, ice crystals
        // ========================================
        // Draw snow_3d tiles across the entire grid. On buildable
        // cells, randomly add snowdrifts (30% chance) and ice
        // crystals (15% chance). On BLOCKED cells, draw the
        // decoration sprite.
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'snow_3d', row + col, x, y);
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'snow_3d', row + col, x, y);

                    // Snowdrift: curved white mound for texture (30% chance)
                    const r = seededRand(row * 1000 + col);
                    if (r > 0.6) {
                        drawSnowdrift(ctx, cx, cy + 4, CELL_SIZE * 0.85, CELL_SIZE * 0.45);
                    }

                    // Ice crystal: translucent multi-armed shard (15% chance)
                    if (r > 0.85) {
                        drawIceCrystal(
                            ctx,
                            cx + seededRand(row * 99 + col) * 10 - 5,
                            cy + seededRand(row * 77 + col) * 8 - 4,
                            10,
                            row * 100 + col
                        );
                    }
                }
            }
        }

        // ========================================
        // Phase 6: Smooth path ribbon (ice)
        // ========================================
        // Cool grey-blue path that contrasts against the white snow
        renderSmoothPath(ctx, 'ice', 12);

        // ========================================
        // Phase 7: Gate (entrance) and Castle (exit)
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
    // Draws small light arrows (higher contrast on dark ice path)
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
            ctx.fillStyle = 'rgba(0,0,0,0.10)';
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
