// ========================================================
// Map: Desert Oasis — golden sand, oasis pool, palm trees, camels
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A scorching desert landscape with golden sand tiles (sand_3d),
//   a central oasis pool with shimmering water, palm trees,
//   and wandering camels. The map evokes a Middle Eastern /
//   North African desert settlement. Sand dune ripples add
//   texture to buildable cells.
//
// PATH LAYOUT STRATEGY
//   The path enters from the left (col 0, row 1) and snakes
//   around the oasis in an S-curve, passing near the water
//   twice to create interesting defensive positions. The path
//   makes 4 passes across the map, ending at the bottom-right
//   castle. The oasis sits at the center-left of the map,
//   creating a natural chokepoint that forces players to
//   defend two sides.
//
// DECORATION PLACEMENT STRATEGY
//   Trees (palm-like) and rocks are scattered across the desert.
//   Two desert huts (BLOCKED_HOUSE) sit on the outskirts.
//   Decorations form a ring around the oasis, leaving the
//   central area visible but cluttered at the edges.
//
// TERRAIN TYPE: sand (via renderSmoothPath)
//   Warm golden-brown sand path that blends with the desert tiles.
//
// SPECIAL FEATURES
//   - Oasis pool: elliptical water body at (320, 280) with
//     radial gradient (blue to lighter blue) and white shimmer
//     rings. A darker sandy bank surrounds the water.
//   - Palm trees: 5 animated palm trees around the oasis edge,
//     drawn via drawPalmTree() with curved trunks and fronds.
//   - Sand dune ripples: thin stroke lines on buildable cells
//     (30% chance) for desert texture.
//   - Camels: 2 camels drawn via drawCamel() positioned in the
//     upper-right and lower-left quadrants.
//   - Gate at entrance (col 0, row 1) and Castle at exit (col 16, row 13)
// ========================================================

MAP_DEFS.desert_oasis = {
    id: 'desert_oasis',
    name: 'Desert Oasis',
    unlockRequirement: 'fortress_siege',
    description: 'A scorching desert with a life-giving oasis at its heart. Camels wander the dunes.',

    // ========================================================
    // Path Cells — S-curve snaking around the oasis
    // ========================================================
    // Each cell is {c: col, r: row}. The 40-cell path curves
    // around the central oasis pool.
    //
    // Layout:
    //   Enter from left (col 0, row 1), move right along row 1
    //   Drop down col 5 through rows 2-3
    //   Traverse right along row 3
    //   Drop down col 12 through rows 4-6
    //   Traverse left along row 6
    //   Drop down col 6 through rows 7-9
    //   Traverse right along row 9
    //   Descend col 16 through rows 10-13 to castle
    // ========================================================
    pathCells: [
        // --- Entry along top (col 0->5, row 1) ---
        // Enemies spawn at the left edge and move right along the top
        { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 }, { c: 3, r: 1 }, { c: 4, r: 1 }, { c: 5, r: 1 },

        // --- First descent (col 5, rows 2-3) ---
        { c: 5, r: 2 }, { c: 5, r: 3 },

        // --- First pass right (cols 6->12, row 3) ---
        { c: 6, r: 3 }, { c: 7, r: 3 }, { c: 8, r: 3 }, { c: 9, r: 3 }, { c: 10, r: 3 }, { c: 11, r: 3 }, { c: 12, r: 3 },

        // --- Second descent (col 12, rows 4-6) ---
        { c: 12, r: 4 }, { c: 12, r: 5 }, { c: 12, r: 6 },

        // --- Second pass left (cols 11->6, row 6) ---
        { c: 11, r: 6 }, { c: 10, r: 6 }, { c: 9, r: 6 }, { c: 8, r: 6 }, { c: 7, r: 6 }, { c: 6, r: 6 },

        // --- Third descent (col 6, rows 7-9) ---
        { c: 6, r: 7 }, { c: 6, r: 8 }, { c: 6, r: 9 },

        // --- Third pass right (cols 7->16, row 9) ---
        { c: 7, r: 9 }, { c: 8, r: 9 }, { c: 9, r: 9 }, { c: 10, r: 9 }, { c: 11, r: 9 }, { c: 12, r: 9 },
        { c: 13, r: 9 }, { c: 14, r: 9 }, { c: 15, r: 9 }, { c: 16, r: 9 },

        // --- Final descent to castle (col 16, rows 10-13) ---
        { c: 16, r: 10 }, { c: 16, r: 11 }, { c: 16, r: 12 }, { c: 16, r: 13 },
    ],

    // ========================================================
    // Decorations — desert trees, rocks, and huts
    // ========================================================
    // Trees and rocks are scattered across the desert tiles.
    // Two huts sit at (11,0) and (17,7) as desert dwellings.
    // ========================================================
    decorations: [
        // === Scattered trees (palm-like) and rocks ===
        { c: 8, r: 0, type: BLOCKED_TREE }, { c: 14, r: 0, type: BLOCKED_TREE },
        { c: 2, r: 0, type: BLOCKED_ROCK }, { c: 17, r: 0, type: BLOCKED_ROCK },
        { c: 10, r: 1, type: BLOCKED_TREE }, { c: 16, r: 1, type: BLOCKED_TREE },
        { c: 0, r: 2, type: BLOCKED_ROCK }, { c: 13, r: 2, type: BLOCKED_ROCK },
        { c: 2, r: 3, type: BLOCKED_TREE }, { c: 15, r: 3, type: BLOCKED_TREE },
        { c: 18, r: 3, type: BLOCKED_TREE },
        { c: 4, r: 4, type: BLOCKED_ROCK }, { c: 14, r: 4, type: BLOCKED_ROCK },
        { c: 1, r: 5, type: BLOCKED_TREE }, { c: 17, r: 5, type: BLOCKED_TREE },
        { c: 2, r: 6, type: BLOCKED_ROCK }, { c: 16, r: 6, type: BLOCKED_ROCK },
        { c: 0, r: 7, type: BLOCKED_TREE }, { c: 14, r: 7, type: BLOCKED_TREE },
        { c: 4, r: 8, type: BLOCKED_ROCK }, { c: 18, r: 8, type: BLOCKED_ROCK },
        { c: 1, r: 9, type: BLOCKED_TREE }, { c: 4, r: 9, type: BLOCKED_TREE },
        { c: 18, r: 10, type: BLOCKED_ROCK }, { c: 8, r: 10, type: BLOCKED_ROCK },
        { c: 2, r: 11, type: BLOCKED_TREE }, { c: 10, r: 11, type: BLOCKED_TREE },
        { c: 14, r: 11, type: BLOCKED_TREE },
        { c: 6, r: 12, type: BLOCKED_ROCK }, { c: 12, r: 12, type: BLOCKED_ROCK },
        { c: 2, r: 13, type: BLOCKED_TREE }, { c: 10, r: 13, type: BLOCKED_TREE }, { c: 18, r: 13, type: BLOCKED_TREE },
        { c: 0, r: 0, type: BLOCKED_ROCK }, { c: 19, r: 5, type: BLOCKED_ROCK },

        // === Desert huts ===
        { c: 11, r: 0, type: BLOCKED_HOUSE }, { c: 17, r: 7, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the desert oasis scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Oasis pool — sandy bank + radial gradient water + shimmer rings
    //   2. Palm trees — 5 trees clustered around the oasis edge
    //   3. Terrain tiles — sand_3d tiles with dune ripple strokes
    //   4. Decoration sprites on BLOCKED cells
    //   5. Smooth path ribbon (sand terrain)
    //   6. Camels — 2 wandering camels (static drawings)
    //   7. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // ========================================
        // Phase 1: Oasis pool
        // ========================================
        // A large elliptical water pool at center-left (320, 280)
        // with a radius of 75px. The pool has:
        //   - A dark sandy bank (outer ellipse, slightly larger)
        //   - A radial gradient water surface (blue tones)
        //   - White shimmer rings (concentric ellipses with stroke)
        const oasisX = 320, oasisY = 280, oasisRadius = 75;

        // Sandy bank (outer edge of the pool)
        ctx.fillStyle = '#C9AD8A';
        ctx.beginPath();
        ctx.ellipse(oasisX, oasisY, oasisRadius + 10, oasisRadius * 0.6 + 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Water surface with radial gradient (bright center, darker edges)
        const waterGradient = ctx.createRadialGradient(
            oasisX, oasisY, oasisRadius * 0.2,    // Inner circle (bright center)
            oasisX, oasisY, oasisRadius            // Outer circle (edge)
        );
        waterGradient.addColorStop(0, '#1E88E5');
        waterGradient.addColorStop(0.6, '#42A5F5');
        waterGradient.addColorStop(1, '#64B5F6');
        ctx.fillStyle = waterGradient;
        ctx.beginPath();
        ctx.ellipse(oasisX, oasisY, oasisRadius, oasisRadius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shimmer rings (white concentric ellipses for water reflection)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(
                oasisX, oasisY - 3 + i * 5,
                oasisRadius * 0.6, oasisRadius * 0.25,
                0, 0, Math.PI * 2
            );
            ctx.stroke();
        }

        // ========================================
        // Phase 2: Palm trees around the oasis
        // ========================================
        // 5 palm trees circling the oasis at various positions,
        // drawn via drawPalmTree() with curved trunks and fronds.
        [
            { x: oasisX - 60, y: oasisY - 25 },    // Left
            { x: oasisX + 70, y: oasisY - 20 },    // Right
            { x: oasisX - 20, y: oasisY - 45 },    // Top
            { x: oasisX + 45, y: oasisY - 40 },    // Top-right
            { x: oasisX - 50, y: oasisY + 40 },    // Bottom-left
        ].forEach(function(palmPos) {
            drawPalmTree(ctx, palmPos.x, palmPos.y, 28, Math.floor(palmPos.x + palmPos.y));
        });

        // ========================================
        // Phase 3 & 4: Terrain tiles and decorations
        // ========================================
        // Draw sand_3d tiles across the grid. On buildable cells,
        // randomly add sand dune ripples (30% chance) for texture.
        // On BLOCKED cells, draw the decoration sprite.
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'sand_3d', row + col, x, y);
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'sand_3d', row + col, x, y);

                    // Sand dune ripples: thin brown strokes on buildable cells
                    const r = seededRand(row * 1000 + col);
                    if (r > 0.7) {
                        ctx.strokeStyle = 'rgba(180,150,120,0.25)';
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(x + 3, cy);
                        ctx.lineTo(x + CELL_SIZE - 3, cy + seededRand(row * 77 + col) * 3 - 1);
                        ctx.stroke();
                    }
                }
            }
        }

        // ========================================
        // Phase 5: Smooth path ribbon (sand)
        // ========================================
        // Warm golden-brown sand path
        renderSmoothPath(ctx, 'sand', 12);

        // ========================================
        // Phase 6: Camels
        // ========================================
        // Two camels wandering the desert, drawn via drawCamel().
        // One in the upper-right, one in the lower-left.
        [
            { x: 600, y: 200 },
            { x: 180, y: 440 },
        ].forEach(function(camelPos) {
            drawCamel(ctx, camelPos.x, camelPos.y, 22, Math.floor(camelPos.x + camelPos.y));
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
