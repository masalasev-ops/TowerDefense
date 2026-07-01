// ========================================================
// Map: Coastal Cliffs — seaside path with ocean views, lighthouse, seagulls
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A scenic cliffside path overlooking the ocean on the right
//   side of the map. The terrain transitions from green coastal
//   grass (coastal_3d) on the left to a sandy beach strip near
//   the ocean. A lighthouse stands on the cliff, small boats
//   sail on the water, and seagulls circle overhead.
//
// PATH LAYOUT STRATEGY
//   The path enters from the left (col 0, row 2) and snakes
//   downward in a zigzag pattern, staying on the left/cliff
//   side of the map (away from the ocean). The path makes
//   5 passes, ending at the bottom-center castle (col 11, row 13).
//   The ocean occupies the right 45% of the canvas.
//
// DECORATION PLACEMENT STRATEGY
//   Trees and rocks are placed on the cliff/grass side (left
//   and top). Coastal cottages (BLOCKED_HOUSE) are at four
//   scenic locations. The right side is left open for the
//   ocean.
//
// TERRAIN TYPE: coastal (via renderSmoothPath)
//   Warm tan path color that evokes coastal dirt/sand.
//
// SPECIAL FEATURES
//   - Ocean: right 45% of the canvas filled with a blue
//     gradient (darker near the coast, lighter further out).
//     Animated sine-wave lines create rolling waves.
//   - Beach strip: narrow sandy strip (sand_beach tiles)
//     at the water's edge (GAME_WIDTH * 0.55).
//   - Lighthouse: detailed lighthouse at (GAME_WIDTH*0.68,
//     GAME_HEIGHT*0.65) with red stripes, glass light room,
//     animated beam glow, and conical roof.
//   - Small boats: 3 tiny sailboats on the ocean at various
//     positions with hull and sail shapes.
//   - Seagulls: 6 birds drawn via drawBird() scattered across
//     the ocean-side sky area.
//   - Gate at entrance (col 0, row 2) and Castle at exit (col 11, row 13)
// ========================================================

MAP_DEFS.coastal_cliffs = {
    id: 'coastal_cliffs',
    name: 'Coastal Cliffs',
    unlockRequirement: 'volcanic_caldera',
    description: 'A cliffside path overlooking the ocean, from a harbor to a lighthouse keep.',

    // ========================================================
    // Path Cells — zigzag down the cliffside
    // ========================================================
    // Each cell is {c: col, r: row}. The 44-cell path zigzags
    // down the left side of the map, staying away from the
    // ocean on the right.
    //
    // Layout:
    //   Enter from left (col 0, row 2), right across row 2
    //   Drop down col 8 through rows 3-4
    //   Traverse right along row 4
    //   Drop down col 13 through rows 5-6
    //   Traverse left along row 6
    //   Drop down col 6 through rows 7-8
    //   Traverse right along row 8
    //   Drop down col 15 through rows 9-10
    //   Traverse left along row 10
    //   Descend col 11 through rows 11-13 to castle
    // ========================================================
    pathCells: [
        // --- Entry: right across row 2 (cols 0->8) ---
        // Enemies spawn at left edge and move right along the
        // upper cliff path
        { c: 0, r: 2 }, { c: 1, r: 2 }, { c: 2, r: 2 }, { c: 3, r: 2 },
        { c: 4, r: 2 }, { c: 5, r: 2 }, { c: 6, r: 2 }, { c: 7, r: 2 }, { c: 8, r: 2 },

        // --- First descent (col 8, rows 3-4) ---
        { c: 8, r: 3 }, { c: 8, r: 4 },

        // --- Second pass right (cols 9->13, row 4) ---
        { c: 9, r: 4 }, { c: 10, r: 4 }, { c: 11, r: 4 }, { c: 12, r: 4 }, { c: 13, r: 4 },

        // --- Second descent (col 13, rows 5-6) ---
        { c: 13, r: 5 }, { c: 13, r: 6 },

        // --- Third pass left (cols 12->6, row 6) ---
        { c: 12, r: 6 }, { c: 11, r: 6 }, { c: 10, r: 6 }, { c: 9, r: 6 },
        { c: 8, r: 6 }, { c: 7, r: 6 }, { c: 6, r: 6 },

        // --- Third descent (col 6, rows 7-8) ---
        { c: 6, r: 7 }, { c: 6, r: 8 },

        // --- Fourth pass right (cols 7->15, row 8) ---
        { c: 7, r: 8 }, { c: 8, r: 8 }, { c: 9, r: 8 }, { c: 10, r: 8 },
        { c: 11, r: 8 }, { c: 12, r: 8 }, { c: 13, r: 8 }, { c: 14, r: 8 }, { c: 15, r: 8 },

        // --- Fourth descent (col 15, rows 9-10) ---
        { c: 15, r: 9 }, { c: 15, r: 10 },

        // --- Fifth pass left (cols 14->11, row 10) ---
        { c: 14, r: 10 }, { c: 13, r: 10 }, { c: 12, r: 10 }, { c: 11, r: 10 },

        // --- Final descent to castle (col 11, rows 11-13) ---
        { c: 11, r: 11 }, { c: 11, r: 12 }, { c: 11, r: 13 },
    ],

    // ========================================================
    // Decorations — coastal trees, rocks, and cottages
    // ========================================================
    // Trees and rocks are placed on the cliff/grass side (left
    // of the map). Coastal cottages at scenic overlook points.
    // The right side near the ocean is kept clear for the
    // water rendering.
    // ========================================================
    decorations: [
        // === Trees along the cliff edge ===
        { c: 10, r: 0, type: BLOCKED_TREE }, { c: 14, r: 0, type: BLOCKED_TREE },
        { c: 1, r: 1, type: BLOCKED_TREE }, { c: 4, r: 1, type: BLOCKED_TREE },
        { c: 15, r: 2, type: BLOCKED_TREE }, { c: 11, r: 3, type: BLOCKED_TREE },
        { c: 2, r: 5, type: BLOCKED_TREE }, { c: 17, r: 5, type: BLOCKED_TREE },
        { c: 1, r: 8, type: BLOCKED_TREE }, { c: 4, r: 8, type: BLOCKED_TREE },
        { c: 18, r: 9, type: BLOCKED_TREE },
        { c: 5, r: 11, type: BLOCKED_TREE }, { c: 14, r: 11, type: BLOCKED_TREE },
        { c: 3, r: 13, type: BLOCKED_TREE }, { c: 15, r: 13, type: BLOCKED_ROCK },

        // === Rocks on the cliff ===
        { c: 12, r: 1, type: BLOCKED_ROCK }, { c: 17, r: 1, type: BLOCKED_ROCK },
        { c: 0, r: 4, type: BLOCKED_ROCK }, { c: 16, r: 4, type: BLOCKED_ROCK },
        { c: 4, r: 7, type: BLOCKED_ROCK }, { c: 18, r: 7, type: BLOCKED_ROCK },
        { c: 2, r: 10, type: BLOCKED_ROCK }, { c: 8, r: 10, type: BLOCKED_ROCK },
        { c: 1, r: 12, type: BLOCKED_ROCK }, { c: 7, r: 12, type: BLOCKED_ROCK },

        // === Coastal cottages ===
        { c: 16, r: 0, type: BLOCKED_HOUSE },   // Cliff-top cottage
        { c: 3, r: 3, type: BLOCKED_HOUSE },    // Upper harbor cottage
        { c: 2, r: 7, type: BLOCKED_HOUSE },    // Mid-cliff cottage
        { c: 17, r: 11, type: BLOCKED_HOUSE },  // Lower cliff cottage
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the coastal cliffs scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Ocean — blue gradient filling right 45% of canvas
    //   2. Waves — animated sine-wave lines across the ocean
    //   3. Beach strip — narrow sandy strip at the water's edge
    //   4. Lighthouse — detailed lighthouse on the cliff
    //   5. Small boats — 3 sailboats on the ocean
    //   6. Terrain tiles — coastal_3d on cliff, sand_beach on beach
    //   7. Decoration sprites on BLOCKED cells
    //   8. Smooth path ribbon (coastal terrain)
    //   9. Seagulls — 6 birds in the sky
    //  10. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // ========================================
        // Phase 1: Ocean on the right side
        // ========================================
        // The ocean occupies the right 45% of the canvas
        // (from GAME_WIDTH*0.55 to the right edge). It uses
        // a linear gradient from lighter blue (near shore)
        // to darker blue (far out).
        const oceanGrad = ctx.createLinearGradient(GAME_WIDTH * 0.55, 0, GAME_WIDTH, 0);
        oceanGrad.addColorStop(0, '#5C9CD4');     // Near shore (lighter)
        oceanGrad.addColorStop(0.3, '#3A7CC3');
        oceanGrad.addColorStop(0.6, '#2979B6');
        oceanGrad.addColorStop(1, '#1565C0');     // Far out (darker)
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(GAME_WIDTH * 0.55, 0, GAME_WIDTH * 0.45, GAME_HEIGHT);

        // ========================================
        // Phase 2: Animated waves
        // ========================================
        // Horizontal sine-wave lines drawn across the ocean
        // surface. The wave Y position oscillates using
        // Math.sin() with the current time (Date.now()/1000)
        // for continuous animation.
        const now = Date.now() / 1000;
        for (let row = 0; row < GAME_HEIGHT; row += 12) {
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let waveX = GAME_WIDTH * 0.55; waveX < GAME_WIDTH; waveX += 4) {
                const waveY = row + Math.sin(waveX * 0.08 + now * 2 + row * 0.3) * 3;
                waveX === GAME_WIDTH * 0.55 ? ctx.moveTo(waveX, waveY) : ctx.lineTo(waveX, waveY);
            }
            ctx.stroke();
        }

        // ========================================
        // Phase 3: Beach strip at the water's edge
        // ========================================
        // A narrow strip of sand on the cells adjacent to the
        // ocean. Each cell at the boundary gets a sand-colored
        // fill before the terrain tiles are drawn.
        for (let row = 0; row < GRID_ROWS; row++) {
            const beachX = GAME_WIDTH * 0.55;
            const beachY = row * CELL_SIZE;
            ctx.fillStyle = '#E8D5A0';
            ctx.fillRect(beachX, beachY, CELL_SIZE * 0.4, CELL_SIZE);
        }

        // ========================================
        // Phase 4: Lighthouse on the cliff
        // ========================================
        // A detailed lighthouse at (GAME_WIDTH*0.68, GAME_HEIGHT*0.65)
        // with red/white stripes, glass light room, animated
        // rotating beam glow, and conical roof. The beam glow
        // oscillates using Math.sin() for a pulsing effect.
        drawLighthouse(ctx, GAME_WIDTH * 0.68, GAME_HEIGHT * 0.65, 32);

        // ========================================
        // Phase 5: Small boats on the ocean
        // ========================================
        // Three tiny sailboats with brown hulls and white sails
        // positioned at various points on the ocean.
        [
            { x: 640, y: 100 },   // Upper-right
            { x: 700, y: 280 },   // Center-right
            { x: 620, y: 420 },   // Lower-right
        ].forEach(function(boatPos) {
            // Hull (brown ellipse)
            ctx.fillStyle = '#8D6E63';
            ctx.beginPath();
            ctx.ellipse(boatPos.x, boatPos.y, 8, 3, -0.1, 0, Math.PI * 2);
            ctx.fill();
            // Sail (white triangle)
            ctx.fillStyle = '#ECEFF1';
            ctx.beginPath();
            ctx.moveTo(boatPos.x - 2, boatPos.y - 3);
            ctx.lineTo(boatPos.x - 2, boatPos.y + 3);
            ctx.lineTo(boatPos.x + 6, boatPos.y);
            ctx.closePath();
            ctx.fill();
        });

        // ========================================
        // Phase 6 & 7: Terrain tiles and decorations
        // ========================================
        // Draw terrain across the grid. Cells that fall on the
        // beach strip (x + CELL_SIZE > GAME_WIDTH * 0.55) use
        // sand_beach tiles. The rest use coastal_3d tiles
        // (green cliff grass). On BLOCKED cells, draw the
        // decoration sprite.
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                const isBeach = x + CELL_SIZE > GAME_WIDTH * 0.55;

                if (isBeach) {
                    // Beach tiles (sandy)
                    SpriteAtlas.drawTile(ctx, 'sand_beach', row + col, x, y);
                } else if (type === CELL_BLOCKED) {
                    // Cliff grass with decoration on top
                    SpriteAtlas.drawTile(ctx, 'coastal_3d', row + col, x, y);
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    // Plain cliff grass (buildable)
                    SpriteAtlas.drawTile(ctx, 'coastal_3d', row + col, x, y);
                }
            }
        }

        // ========================================
        // Phase 8: Smooth path ribbon (coastal)
        // ========================================
        renderSmoothPath(ctx, 'coastal', 12);

        // ========================================
        // Phase 9: Seagulls
        // ========================================
        // 6 birds scattered across the ocean-side sky using
        // drawBird() with animated wing flaps. Seeded random
        // positions keep them away from the path.
        for (let i = 0; i < 6; i++) {
            const seagullX = GAME_WIDTH * 0.6 + seededRand(i * 13) * GAME_WIDTH * 0.35;
            const seagullY = 30 + seededRand(i * 17) * GAME_HEIGHT * 0.5;
            drawBird(ctx, seagullX, seagullY, 12, i * 7);
        }

        // ========================================
        // Phase 10: Gate (entrance) and Castle (exit)
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
