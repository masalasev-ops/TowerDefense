// ========================================================
// Map: Fortress Siege — 4-pass cobblestone path with meadows and wildlife
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A fortified medieval landscape with cobblestone paths,
//   meadow grass (fort_grass_3d tiles), countryside houses,
//   and ambient wildlife. Birds, rabbits, and deer populate
//   the fields, creating a lively pastoral scene.
//
// PATH LAYOUT STRATEGY
//   The path enters from the right (col 19, row 1) and snakes
//   back and forth in 4 horizontal passes across the map:
//     Pass 1 (row 1):    left along the top edge
//     Pass 2 (row 4):    right across mid-upper
//     Pass 3 (row 7):    left across mid-lower
//     Pass 4 (row 10):   right across the bottom
//   Each pass has a 2-3 row buildable gap between them,
//   providing plenty of tower placement zones. The path ends
//   at the castle on the bottom-right.
//
// DECORATION PLACEMENT STRATEGY
//   Houses alternate between the left and right sides in each
//   pass row, creating a "settlement" feel. Trees and rocks
//   fill the gaps symmetrically, with a pattern that repeats
//   every pass. This gives the map a structured, planned
//   appearance suitable for a fortified area.
//
// TERRAIN TYPE: cobble (via renderSmoothPath)
//   Grey stone cobblestone path with fort_grass_3d terrain tiles.
//
// SPECIAL FEATURES
//   - Wildlife: animated birds, rabbits, and deer rendered
//     using drawBird/drawRabbit/drawDeer helper functions
//   - isOnPath() check prevents wildlife from appearing on
//     the path tiles (they only appear in meadows)
//   - Houses placed symmetrically between left and right sides
//   - Gate at entrance (col 19, row 1) and Castle at exit (col 15, row 13)
// ========================================================

MAP_DEFS.fortress_siege = {
    id: 'fortress_siege',
    name: 'Fortress Siege',
    unlockRequirement: 'frozen_pass',
    description: 'A fortified approach through meadows and houses with ambient wildlife.',

    // ========================================================
    // Path Cells — 4 passes of switchbacks across the map
    // ========================================================
    // Each cell is {c: col, r: row}. The path forms a zigzag
    // pattern with 4 horizontal passes.
    //
    // Layout:
    //   Pass 1 (row 1):  left across top      (col 19 -> col 3)
    //   Descent (2-4):   down col 3
    //   Pass 2 (row 4):  right across mid-top  (col 3 -> col 17)
    //   Descent (5-7):   down col 17
    //   Pass 3 (row 7):  left across mid-bot   (col 17 -> col 5)
    //   Descent (8-10):  down col 5
    //   Pass 4 (row 10): right across bottom   (col 5 -> col 15)
    //   Descent (11-13): down col 15 to castle
    // ========================================================
    pathCells: [
        // === Pass 1: Enter right, left across top (col 19->3, row 1) ===
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 }, { c: 16, r: 1 }, { c: 15, r: 1 },
        { c: 14, r: 1 }, { c: 13, r: 1 }, { c: 12, r: 1 }, { c: 12, r: 2 }, { c: 10, r: 1 },
        { c: 9, r: 1 }, { c: 8, r: 1 }, { c: 7, r: 1 }, { c: 6, r: 1 }, { c: 5, r: 1 },
        { c: 4, r: 1 }, { c: 3, r: 1 },

        // === Descent: drop to pass 2 along col 3 (rows 2-4) ===
        { c: 3, r: 2 }, { c: 3, r: 3 }, { c: 3, r: 4 },

        // === Pass 2: Right across mid-upper (col 4->17, row 4) ===
        { c: 4, r: 4 }, { c: 5, r: 4 }, { c: 6, r: 4 }, { c: 7, r: 4 }, { c: 8, r: 4 },
        { c: 9, r: 4 }, { c: 10, r: 4 }, { c: 11, r: 4 }, { c: 12, r: 4 }, { c: 13, r: 4 },
        { c: 14, r: 4 }, { c: 15, r: 4 }, { c: 16, r: 4 }, { c: 17, r: 4 },

        // === Descent: drop to pass 3 along col 17 (rows 5-7) ===
        { c: 17, r: 5 }, { c: 17, r: 6 }, { c: 17, r: 7 },

        // === Pass 3: Left across mid-lower (col 16->5, row 7) ===
        { c: 16, r: 7 }, { c: 15, r: 7 }, { c: 14, r: 7 }, { c: 13, r: 7 }, { c: 12, r: 7 },
        { c: 11, r: 7 }, { c: 10, r: 7 }, { c: 9, r: 7 }, { c: 8, r: 7 }, { c: 7, r: 7 },
        { c: 6, r: 7 }, { c: 5, r: 7 },

        // === Descent: drop to pass 4 along col 5 (rows 8-10) ===
        { c: 5, r: 8 }, { c: 5, r: 9 }, { c: 5, r: 10 },

        // === Pass 4: Right across bottom (col 6->15, row 10) ===
        { c: 6, r: 10 }, { c: 7, r: 10 }, { c: 8, r: 10 }, { c: 9, r: 10 }, { c: 10, r: 10 },
        { c: 11, r: 10 }, { c: 12, r: 10 }, { c: 13, r: 10 }, { c: 14, r: 10 }, { c: 15, r: 10 },

        // === Final descent to castle (col 15, rows 11-13) ===
        { c: 15, r: 11 }, { c: 15, r: 12 }, { c: 15, r: 13 },
    ],

    // ========================================================
    // Decorations — houses, trees, rocks in a structured grid
    // ========================================================
    // The fortress uses a symmetrical decoration pattern:
    // houses alternate left/right in each pass row, trees
    // fill the mid-gaps, and rocks anchor the corners.
    // ========================================================
    decorations: [
        // === Row 0: Top edge decoration ===
        { c: 2, r: 0, type: BLOCKED_HOUSE }, { c: 12, r: 0, type: BLOCKED_HOUSE },
        { c: 5, r: 0, type: BLOCKED_TREE }, { c: 9, r: 0, type: BLOCKED_TREE },
        { c: 15, r: 0, type: BLOCKED_ROCK }, { c: 18, r: 0, type: BLOCKED_ROCK },
        { c: 0, r: 0, type: BLOCKED_ROCK }, { c: 19, r: 0, type: BLOCKED_ROCK },

        // === Rows 1-3: Pass 1 surroundings ===
        { c: 1, r: 2, type: BLOCKED_HOUSE }, { c: 18, r: 2, type: BLOCKED_HOUSE },
        { c: 6, r: 2, type: BLOCKED_TREE }, { c: 10, r: 2, type: BLOCKED_TREE }, { c: 14, r: 2, type: BLOCKED_TREE },
        { c: 4, r: 2, type: BLOCKED_ROCK }, { c: 12, r: 2, type: BLOCKED_ROCK },
        { c: 6, r: 3, type: BLOCKED_TREE }, { c: 11, r: 3, type: BLOCKED_TREE }, { c: 15, r: 3, type: BLOCKED_ROCK },
        { c: 2, r: 3, type: BLOCKED_ROCK }, { c: 19, r: 3, type: BLOCKED_ROCK },

        // === Rows 4-6: Pass 2 surroundings ===
        { c: 2, r: 5, type: BLOCKED_HOUSE }, { c: 18, r: 5, type: BLOCKED_HOUSE },
        { c: 6, r: 5, type: BLOCKED_TREE }, { c: 10, r: 5, type: BLOCKED_TREE }, { c: 14, r: 5, type: BLOCKED_TREE },
        { c: 8, r: 5, type: BLOCKED_ROCK }, { c: 12, r: 5, type: BLOCKED_ROCK },
        { c: 4, r: 6, type: BLOCKED_TREE }, { c: 9, r: 6, type: BLOCKED_TREE }, { c: 15, r: 6, type: BLOCKED_ROCK },
        { c: 19, r: 6, type: BLOCKED_ROCK },
        { c: 4, r: 6, type: BLOCKED_ROCK }, { c: 18, r: 6, type: BLOCKED_ROCK },

        // === Rows 7-9: Pass 3 surroundings ===
        { c: 3, r: 8, type: BLOCKED_HOUSE }, { c: 18, r: 8, type: BLOCKED_HOUSE },
        { c: 7, r: 8, type: BLOCKED_TREE }, { c: 11, r: 8, type: BLOCKED_TREE }, { c: 15, r: 8, type: BLOCKED_TREE },
        { c: 5, r: 8, type: BLOCKED_ROCK }, { c: 13, r: 8, type: BLOCKED_ROCK },
        { c: 2, r: 9, type: BLOCKED_TREE }, { c: 9, r: 9, type: BLOCKED_TREE }, { c: 16, r: 9, type: BLOCKED_ROCK },

        // === Rows 10-13: Pass 4 and exit surroundings ===
        { c: 3, r: 11, type: BLOCKED_HOUSE }, { c: 17, r: 11, type: BLOCKED_HOUSE },
        { c: 7, r: 11, type: BLOCKED_TREE }, { c: 11, r: 11, type: BLOCKED_TREE }, { c: 14, r: 11, type: BLOCKED_TREE },
        { c: 5, r: 11, type: BLOCKED_ROCK }, { c: 13, r: 11, type: BLOCKED_ROCK },
        { c: 2, r: 12, type: BLOCKED_HOUSE }, { c: 8, r: 12, type: BLOCKED_TREE }, { c: 12, r: 12, type: BLOCKED_TREE },
        { c: 16, r: 12, type: BLOCKED_ROCK },
        { c: 3, r: 13, type: BLOCKED_HOUSE }, { c: 9, r: 13, type: BLOCKED_ROCK }, { c: 13, r: 13, type: BLOCKED_ROCK },
        { c: 7, r: 13, type: BLOCKED_TREE }, { c: 11, r: 13, type: BLOCKED_TREE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the fortress siege scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Terrain tiles — fort_grass_3d on all cells
    //   2. Decoration sprites on BLOCKED cells
    //   3. Smooth path ribbon (cobble terrain)
    //   4. Wildlife — birds (animated with wing flaps)
    //   5. Wildlife — rabbits (with ear details)
    //   6. Wildlife — deer (with antlers)
    //   7. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // Identify the rows where the path runs so wildlife
        // can be placed on meadow cells instead of on the path.
        // Path runs on rows 1, 4, 7, 10.
        const pathRows = [1, 4, 7, 10];
        function isOnPath(y) {
            return pathRows.includes(Math.floor(y / CELL_SIZE));
        }

        // ========================================
        // Phase 1 & 2: Terrain tiles and decorations
        // ========================================
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'fort_grass_3d', row + col, x, y);
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'fort_grass_3d', row + col, x, y);
                }
            }
        }

        // ========================================
        // Phase 3: Smooth path ribbon (cobble)
        // ========================================
        // Grey cobblestone path with rounded edges
        renderSmoothPath(ctx, 'cobble', 12);

        // ========================================
        // Phase 4: Birds (animated wildlife)
        // ========================================
        // Birds are placed at 12 positions across the map.
        // Each bird has animated wing flaps via drawBird().
        // The isOnPath() check ensures birds don't render
        // directly over the enemy path.
        [
            { x: 120, y: 100 }, { x: 450, y: 140 }, { x: 700, y: 102 },
            { x: 180, y: 225 }, { x: 720, y: 228 }, { x: 500, y: 250 },
            { x: 200, y: 345 }, { x: 700, y: 348 }, { x: 350, y: 372 },
            { x: 120, y: 465 }, { x: 680, y: 468 }, { x: 400, y: 495 },
        ].forEach(function(birdPos) {
            if (!isOnPath(birdPos.y)) {
                drawBird(ctx, birdPos.x, birdPos.y, 14, Math.floor(birdPos.x + birdPos.y));
            }
        });

        // ========================================
        // Phase 5: Rabbits (small wildlife)
        // ========================================
        // Rabbits are placed at 6 positions in the meadows.
        // They are static drawings (no animation).
        [
            { x: 80, y: 115 }, { x: 350, y: 145 },
            { x: 120, y: 250 }, { x: 550, y: 245 },
            { x: 180, y: 365 }, { x: 400, y: 355 },
        ].forEach(function(rabbitPos) {
            if (!isOnPath(rabbitPos.y)) {
                drawRabbit(ctx, rabbitPos.x, rabbitPos.y, 12, Math.floor(rabbitPos.x + rabbitPos.y));
            }
        });

        // ========================================
        // Phase 6: Deer (large wildlife)
        // ========================================
        // Two deer placed in the upper-left and central meadows.
        [
            { x: 220, y: 130 },
            { x: 260, y: 360 },
        ].forEach(function(deerPos) {
            if (!isOnPath(deerPos.y)) {
                drawDeer(ctx, deerPos.x, deerPos.y, 18, Math.floor(deerPos.x + deerPos.y));
            }
        });

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
