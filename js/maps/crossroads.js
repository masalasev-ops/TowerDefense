// ========================================================
// Map: Crossroads — winding path through a village with creek
// ========================================================
//
// THEME & VISUAL IDENTITY
//   Peaceful rural village with a flowing creek cutting diagonally
//   from the top-right to the lower-left. Warm green grass tiles,
//   wooden cottages, scattered trees and rocks, and a sparkling
//   blue creek with wooden bridges.
//
// PATH LAYOUT STRATEGY
//   The path enters from the top-left (col 0, row 1) and snakes
//   across the grid in a serpentine S-curve, ending at the bottom-
//   left (col 2, row 13). It crosses the creek in two places —
//   bridges render over those intersections. The path makes 5 main
//   passes across the grid, giving defenders plenty of coverage
//   opportunities. Path cells near the creek force the player to
//   position towers around the water, creating natural chokepoints.
//
// DECORATION PLACEMENT STRATEGY
//   Houses are placed in the village cluster (left side, rows 7-13).
//   Trees and rocks are scattered across the map for visual variety,
//   with a denser cluster near the top-right to balance the visual
//   weight of the village. Decorations are arranged so buildable
//   tower zones remain open near the path turns.
//
// TERRAIN TYPE: dirt (via renderSmoothPath)
//   Warm brown earth path with grass_3d tiles covering all terrain.
//
// SPECIAL FEATURES
//   - Creek: flows from top-right corner (col 14, row 0) down to
//     approximately row 12, then bends left to col 4. Animated
//     water gradient with white ripple lines and bubble sparkles.
//   - Bridges: two wooden bridges where the path crosses the creek.
//   - Gate at entrance (col 0, row 1) and Castle at exit (col 2, row 13).
// ========================================================

MAP_DEFS.crossroads = {
    id: 'crossroads',
    name: 'Crossroads',
    unlockRequirement: null,
    description: 'A winding path through a peaceful village with a flowing creek.',

    // ========================================================
    // Path Cells — the route enemies walk along
    // ========================================================
    // Each cell is {c: col, r: row}. The path is 43 cells long,
    // forming a serpentine S-shape from top-left to bottom-left.
    //
    // Layout overview:
    //   Enter at top edge (col 0, row 1), move right along row 1
    //   Drop to row 3, continue right across mid-top
    //   Drop to row 5, continue right across middle
    //   Drop to row 7, continue right across mid-bottom
    //   Drop to row 11, snake left across bottom
    //   Exit at bottom edge (col 2, row 13)
    // ========================================================
    pathCells: [
        // --- Segment 1: Entry and upper row (cols 0-2, row 1) ---
        // Enemies enter from the left side at row 1, move right 3 cells
        { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 },

        // --- Segment 2: Drop down to row 3 (col 2, rows 1->3) ---
        // Vertical descent — enemies drop 2 rows to begin the first pass
        { c: 2, r: 2 }, { c: 2, r: 3 },

        // --- Segment 3: First pass right across row 3 (cols 3-6, row 3) ---
        // Enemies traverse rightward across the upper-middle of the map
        { c: 3, r: 3 }, { c: 4, r: 3 }, { c: 5, r: 3 }, { c: 6, r: 3 },

        // --- Segment 4: Drop down to row 5 (col 6, rows 3->5) ---
        // Vertical descent to begin the second pass
        { c: 6, r: 4 }, { c: 6, r: 5 },

        // --- Segment 5: Second pass right across row 5 (cols 7-10, row 5) ---
        // Enemies traverse rightward across the middle of the map
        { c: 7, r: 5 }, { c: 8, r: 5 }, { c: 9, r: 5 }, { c: 10, r: 5 },

        // --- Segment 6: Drop down to row 7 (col 10, rows 5->7) ---
        // Vertical descent to begin the third pass
        { c: 10, r: 6 }, { c: 10, r: 7 },

        // --- Segment 7: Third pass right across row 7 (cols 11-17, row 7) ---
        // Long traverse across the lower-middle, 7 cells wide
        { c: 11, r: 7 }, { c: 12, r: 7 }, { c: 13, r: 7 }, { c: 14, r: 7 },
        { c: 15, r: 7 }, { c: 16, r: 7 }, { c: 17, r: 7 },

        // --- Segment 8: Drop down to row 11 (col 17, rows 7->11) ---
        // Long vertical descent — 4 rows down to the bottom pass
        { c: 17, r: 8 }, { c: 17, r: 9 }, { c: 17, r: 10 }, { c: 17, r: 11 },

        // --- Segment 9: Fourth pass LEFT across row 11 (cols 16->2, row 11) ---
        // Enemies reverse direction, snaking left across the entire
        // bottom of the map. This is the longest straight segment.
        { c: 16, r: 11 }, { c: 15, r: 11 }, { c: 14, r: 11 }, { c: 13, r: 11 },
        { c: 12, r: 11 }, { c: 11, r: 11 }, { c: 10, r: 11 }, { c: 9, r: 11 },
        { c: 8, r: 11 }, { c: 7, r: 11 }, { c: 6, r: 11 }, { c: 5, r: 11 },
        { c: 4, r: 11 }, { c: 3, r: 11 }, { c: 2, r: 11 },

        // --- Segment 10: Exit at bottom edge (col 2, rows 11->13) ---
        // Final descent to the castle at bottom of the map
        { c: 2, r: 12 }, { c: 2, r: 13 },
    ],

    // ========================================================
    // Decorations — obstacles placed on buildable cells
    // ========================================================
    // These are objects with {c, r, type}. Types are:
    //   BLOCKED_HOUSE (3) — thatched cottage, village buildings
    //   BLOCKED_TREE (1)  — deciduous tree with layered canopy
    //   BLOCKED_ROCK (2)  — irregular grey rock formation
    //
    // Decorations are processed by setActiveMap(): each one is
    // placed on a BUILDABLE cell and converts it to CELL_BLOCKED
    // (no tower placement allowed). The type is stored in DECO_MAP
    // so the sprite system can look it up when rendering.
    //
    // Layout strategy:
    //   Houses cluster in a village pattern on the left side.
    //   Trees scatter across the map at regular intervals.
    //   Rocks fill gaps and create natural-looking clusters.
    // ========================================================
    decorations: [
        // === Village houses (left side clusters) ===
        // Positioned at (7,0), (17,4), (4,7), (8,12), (16,13), (13,9)
        // These form the "village" visual theme
        { c: 7, r: 0, type: BLOCKED_HOUSE }, { c: 17, r: 4, type: BLOCKED_HOUSE },
        { c: 4, r: 7, type: BLOCKED_HOUSE }, { c: 8, r: 12, type: BLOCKED_HOUSE },
        { c: 16, r: 13, type: BLOCKED_HOUSE }, { c: 13, r: 9, type: BLOCKED_HOUSE },

        // === Scattered trees (cover the buildable area evenly) ===
        // Trees are spread across rows 0-13 and columns 0-19,
        // placed far enough from the path to leave room for towers
        { c: 4, r: 0, type: BLOCKED_TREE }, { c: 13, r: 0, type: BLOCKED_TREE },
        { c: 5, r: 1, type: BLOCKED_TREE }, { c: 16, r: 1, type: BLOCKED_TREE },
        { c: 8, r: 2, type: BLOCKED_TREE }, { c: 14, r: 2, type: BLOCKED_TREE },
        { c: 18, r: 2, type: BLOCKED_TREE }, { c: 1, r: 3, type: BLOCKED_TREE },
        { c: 10, r: 3, type: BLOCKED_TREE }, { c: 14, r: 3, type: BLOCKED_TREE },
        { c: 3, r: 4, type: BLOCKED_TREE }, { c: 9, r: 4, type: BLOCKED_TREE },
        { c: 19, r: 4, type: BLOCKED_TREE }, { c: 6, r: 5, type: BLOCKED_TREE },
        { c: 13, r: 5, type: BLOCKED_TREE }, { c: 1, r: 6, type: BLOCKED_TREE },
        { c: 5, r: 6, type: BLOCKED_TREE }, { c: 14, r: 6, type: BLOCKED_TREE },
        { c: 8, r: 7, type: BLOCKED_TREE }, { c: 16, r: 7, type: BLOCKED_TREE },
        { c: 19, r: 7, type: BLOCKED_TREE }, { c: 3, r: 8, type: BLOCKED_TREE },
        { c: 7, r: 8, type: BLOCKED_TREE }, { c: 15, r: 8, type: BLOCKED_TREE },
        { c: 18, r: 8, type: BLOCKED_TREE }, { c: 3, r: 9, type: BLOCKED_TREE },
        { c: 9, r: 9, type: BLOCKED_TREE }, { c: 4, r: 10, type: BLOCKED_TREE },
        { c: 13, r: 10, type: BLOCKED_TREE }, { c: 17, r: 10, type: BLOCKED_TREE },
        { c: 4, r: 13, type: BLOCKED_TREE }, { c: 11, r: 13, type: BLOCKED_TREE },
        { c: 18, r: 13, type: BLOCKED_TREE },

        // === Rocks (fill gaps, create corners and edges) ===
        // Positioned at map edges and in empty spaces between trees
        { c: 3, r: 0, type: BLOCKED_ROCK }, { c: 11, r: 1, type: BLOCKED_ROCK },
        { c: 17, r: 2, type: BLOCKED_ROCK }, { c: 5, r: 3, type: BLOCKED_ROCK },
        { c: 11, r: 4, type: BLOCKED_ROCK }, { c: 15, r: 4, type: BLOCKED_ROCK },
        { c: 2, r: 5, type: BLOCKED_ROCK }, { c: 15, r: 6, type: BLOCKED_ROCK },
        { c: 11, r: 7, type: BLOCKED_ROCK }, { c: 18, r: 6, type: BLOCKED_ROCK },
        { c: 11, r: 8, type: BLOCKED_ROCK }, { c: 6, r: 9, type: BLOCKED_ROCK },
        { c: 16, r: 9, type: BLOCKED_ROCK }, { c: 9, r: 10, type: BLOCKED_ROCK },
        { c: 15, r: 10, type: BLOCKED_ROCK }, { c: 13, r: 13, type: BLOCKED_ROCK },
        { c: 1, r: 13, type: BLOCKED_ROCK }, { c: 14, r: 12, type: BLOCKED_ROCK },
        { c: 0, r: 0, type: BLOCKED_ROCK }, { c: 19, r: 0, type: BLOCKED_TREE },
        { c: 19, r: 9, type: BLOCKED_ROCK }, { c: 0, r: 10, type: BLOCKED_TREE },
    ],

    // ========================================================
    // getCreekCells — defines where the creek (water) flows
    // ========================================================
    // Returns a Set of "row,col" strings marking water tiles.
    // The creek flows from the top-right corner (col 14) down
    // to row 12, then bends left to col 4.
    //
    // Vertical segment: col 14, rows 0 through 12
    // Horizontal segment: row 12, cols 4 through 14 (bend)
    // ========================================================
    getCreekCells: function() {
        const cells = new Set();
        for (let r = 0; r <= 12; r++) cells.add(r + ',14');
        for (let c = 4; c <= 14; c++) cells.add('12,' + c);
        return cells;
    },

    // ========================================================
    // getBridgeCells — finds path cells that cross the creek
    // ========================================================
    // Iterates every path cell and checks if it lies on a creek
    // tile. Path tiles that overlap water get a wooden bridge
    // rendered over the path.
    // ========================================================
    getBridgeCells: function(pathCells, creekCells) {
        const bridges = [];
        for (const pathCell of pathCells) {
            if (creekCells.has(pathCell.r + ',' + pathCell.c)) {
                bridges.push({ c: pathCell.c, r: pathCell.r });
            }
        }
        return bridges;
    },

    // ========================================================
    // renderMap — draws the complete map scene each frame
    // ========================================================
    // Rendering phases (bottom to top):
    //   1. Terrain tiles — grass_3d sprites on every cell
    //   2. Decorations — trees/rocks/houses on BLOCKED cells
    //   3. Smooth path ribbon — warm brown dirt path with rounded edges
    //   4. Creek — water gradient with animated ripples, sparkles
    //   5. Bridges — wooden plank bridges over creek crossings
    //   6. Gate (entrance) — stone archway with torches
    //   7. Castle (exit) — fortified keep with damage-dependent appearance
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined' && !SpriteAtlas.has('grass')) SpriteAtlas.init();

        // ========================================
        // Phase 1 & 2: Terrain tiles and decorations
        // ========================================
        // Draw grass_3d tiles across the entire grid. On BLOCKED cells,
        // also draw the decoration sprite (tree/rock/house).
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_BLOCKED) {
                    // Draw the terrain tile underneath the decoration
                    SpriteAtlas.drawTile(ctx, 'grass_3d', row + col, x, y);
                    // Look up the decoration type (default to tree if not found)
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    // Draw the decoration sprite centered in the cell
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'grass_3d', row + col, x, y);
                }
            }
        }

        // ========================================
        // Phase 3: Smooth path ribbon
        // ========================================
        // Draws the enemy path as a continuous rounded ribbon with
        // drop shadow, edge stroke, and center highlight. Uses 'dirt'
        // terrain type (warm brown) with a corner radius of 13px.
        renderSmoothPath(ctx, 'dirt', 13);

        // ========================================
        // Phase 4: Creek with animated water
        // ========================================
        // The creek flows from the top-right corner down to the
        // bottom-middle of the map. It consists of:
        //   - A dark riverbed beneath the water
        //   - An animated blue gradient water surface
        //   - White ripple lines (sinusoidal) for flow animation
        //   - Small bubble sparkles at random positions
        //
        // Geometry: vertical segment along col 14 (rows 0-12),
        // then a 90-degree bend left along row 12 (cols 4-14).
        const cx = 14 * CELL_SIZE + CELL_SIZE * 0.1,       // Creek X: col 14 with slight inset
            cw = CELL_SIZE * 0.8,                              // Creek width: 80% of cell
            cyc = 12 * CELL_SIZE + CELL_SIZE * 0.1,            // Creek Y at bend: row 12 inset
            ch = CELL_SIZE * 0.8,                              // Creek height at bend
            leftX = 4 * CELL_SIZE;                             // Left extent of horizontal segment

        // Riverbed (dark brown background)
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + cw, 0);
        ctx.lineTo(cx + cw, cyc + ch);
        ctx.lineTo(leftX, cyc + ch);
        ctx.lineTo(leftX, cyc);
        ctx.lineTo(cx, cyc);
        ctx.closePath();
        ctx.fill();

        // Water surface (blue gradient — lighter in center, darker at edges)
        const waterGradient = ctx.createLinearGradient(cx, 0, leftX, cyc + ch);
        waterGradient.addColorStop(0, '#42A5F5');
        waterGradient.addColorStop(0.3, '#64B5F6');
        waterGradient.addColorStop(0.5, '#1E88E5');
        waterGradient.addColorStop(0.7, '#64B5F6');
        waterGradient.addColorStop(1, '#42A5F5');
        ctx.fillStyle = waterGradient;
        ctx.beginPath();
        ctx.moveTo(cx + 2, 3);
        ctx.lineTo(cx + cw - 2, 3);
        ctx.lineTo(cx + cw - 2, cyc + ch - 3);
        ctx.lineTo(leftX + 3, cyc + ch - 3);
        ctx.lineTo(leftX + 3, cyc + 3);
        ctx.lineTo(cx + 2, cyc + 3);
        ctx.closePath();
        ctx.fill();

        // Animated white ripple lines on the vertical segment
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            const startX = cx + 6 + i * (cw - 12);
            ctx.beginPath();
            ctx.moveTo(startX, 4);
            for (let sy = 4; sy < cyc; sy += 4) {
                ctx.lineTo(startX + Math.sin(sy * 0.3) * 3, sy);
            }
            ctx.stroke();
        }

        // Animated white ripple lines on the horizontal segment
        for (let i = 0; i < 2; i++) {
            const startY = cyc + 6 + i * (ch - 12);
            ctx.beginPath();
            ctx.moveTo(cx + 4, startY);
            for (let sx = cx + 4; sx > leftX + 4; sx -= 4) {
                ctx.lineTo(sx, startY + Math.sin(sx * 0.2) * 3);
            }
            ctx.stroke();
        }

        // Bubble sparkles (small white circles at creek bends and midpoints)
        ctx.fillStyle = '#BDBDBD';
        [
            { x: cx + cw / 2, y: cyc * 0.3 },   // Upper vertical mid
            { x: cx + cw / 2, y: cyc * 0.6 },   // Lower vertical mid
            { x: cx - cw * 0.3, y: cyc + ch / 2 },    // Bend outer edge
            { x: cx - cw * 2, y: cyc + ch / 2 },      // Horizontal mid
            { x: cx - cw * 5, y: cyc + ch / 2 },      // Horizontal mid
            { x: cx - cw * 8, y: cyc + ch / 2 },      // Horizontal end
        ].forEach(function(point) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // ========================================
        // Phase 5: Bridges over creek crossings
        // ========================================
        // Draw a wooden bridge at each path cell that overlaps
        // the creek. Bridges are drawn over the path so enemies
        // appear to cross the water.
        for (const bridgeCell of BRIDGE_CELLS) {
            const bx = bridgeCell.c * CELL_SIZE + CELL_SIZE / 2;
            const by = bridgeCell.r * CELL_SIZE + CELL_SIZE / 2;
            drawBridge(ctx, bx, by, CELL_SIZE * 0.9);
        }

        // ========================================
        // Phase 6: Gate (entrance)
        // ========================================
        // Stone archway with torches marking where enemies spawn
        const spawnCell = PATH_CELLS[0];
        drawGate(
            ctx,
            spawnCell.c * CELL_SIZE + CELL_SIZE / 2,
            spawnCell.r * CELL_SIZE + CELL_SIZE / 2 + 4,
            18
        );

        // ========================================
        // Phase 7: Castle (exit / base)
        // ========================================
        // Fortified keep with damage-dependent rendering.
        // The castle's appearance changes as it takes damage
        // (cracks, color shifts, torn flag).
        const baseCell = PATH_CELLS[PATH_CELLS.length - 1];
        drawCastle(
            ctx,
            baseCell.c * CELL_SIZE + CELL_SIZE / 2,
            baseCell.r * CELL_SIZE + CELL_SIZE / 2 - 2,
            20
        );
    },

    // ========================================================
    // renderPathArrows — draws directional indicators on the path
    // ========================================================
    // Renders small arrow triangles at the midpoint between each
    // consecutive pair of waypoints. The arrows rotate to point
    // in the direction of travel, helping players see the path
    // routing.
    //
    // For each waypoint pair (from, to):
    //   1. Compute midpoint (mx, my)
    //   2. Compute angle of travel (atan2)
    //   3. Save context, translate to midpoint, rotate by angle
    //   4. Draw a small triangle pointing right (direction of travel)
    //   5. Restore context
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
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
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
