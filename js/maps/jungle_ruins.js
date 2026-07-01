// ========================================================
// Map: Jungle Ruins — dense jungle with temple ruins and winding river
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A dense tropical jungle concealing ancient temple ruins.
//   Dark green terrain tiles (jungle_3d) with mossy ground
//   patches. A winding blue river snakes diagonally across
//   the map, crossed by wooden bridges. Ruined stone temples
//   with moss-covered columns dot the landscape.
//
// PATH LAYOUT STRATEGY
//   The path enters from the top-left (col 1, row 0) and snakes
//   down through the jungle in a zigzag pattern, crossing the
//   river twice. The path makes multiple short passes that
//   weave around the temple ruins. The path ends at the
//   bottom-right castle (col 15, row 13).
//
// DECORATION PLACEMENT STRATEGY
//   Dense trees throughout (tropical jungle foliage) with
//   scattered rocks. Three ruined temples (drawTempleRuin)
//   at key visual anchor points. Jungle huts (BLOCKED_HOUSE)
//   at three locations. The dense foliage creates a claustrophobic
//   jungle feel with narrow tower placement corridors.
//
// TERRAIN TYPE: jungle (via renderSmoothPath)
//   Dark earthy path color that blends with the jungle theme.
//
// SPECIAL FEATURES
//   - Temple ruins: 3 ruined stone structures drawn via
//     drawTempleRuin() with cracked stone, columns, and moss.
//   - Winding river: smooth curved blue river rendered using
//     sine-wave points with gradient water, riverbank, and
//     white foam lines. The river winds vertically through
//     the left side of the map.
//   - Bridges: wooden bridges auto-placed where the path
//     crosses the river (detected by path cell overlap).
//   - Mossy foliage: small green ellipses on buildable cells
//     (30% chance) for jungle floor texture.
//   - Monkeys: simplified as small brown circles near trees.
//   - Gate at entrance (col 1, row 0) and Castle at exit (col 15, row 13)
// ========================================================

MAP_DEFS.jungle_ruins = {
    id: 'jungle_ruins',
    name: 'Jungle Ruins',
    unlockRequirement: 'desert_oasis',
    description: 'Ancient temple ruins hidden deep in a tropical jungle with a winding river.',

    // ========================================================
    // Path Cells — zigzag through dense jungle
    // ========================================================
    // Each cell is {c: col, r: row}. The 43-cell path zigzags
    // down through the jungle, crossing the river twice.
    //
    // Layout:
    //   Enter from top (col 1, row 0), move down col 1
    //   Traverse right along row 2
    //   Drop down col 7 through rows 3-4
    //   Traverse left along row 4
    //   Drop down col 3 through rows 5-6
    //   Traverse right along row 6
    //   Drop down col 10 through rows 7-8
    //   Traverse left along row 8
    //   Drop down col 5 through rows 9-10
    //   Traverse right along row 10
    //   Descend col 15 through rows 11-13 to castle
    // ========================================================
    pathCells: [
        // --- Entry from top (col 1, rows 0-2) ---
        { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 1, r: 2 },

        // --- First pass right (cols 2->7, row 2) ---
        { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 4, r: 2 }, { c: 5, r: 2 }, { c: 6, r: 2 }, { c: 7, r: 2 },

        // --- First descent (col 7, rows 3-4) ---
        { c: 7, r: 3 }, { c: 7, r: 4 },

        // --- Second pass left (cols 6->3, row 4) ---
        { c: 6, r: 4 }, { c: 5, r: 4 }, { c: 4, r: 4 }, { c: 3, r: 4 },

        // --- Second descent (col 3, rows 5-6) ---
        { c: 3, r: 5 }, { c: 3, r: 6 },

        // --- Third pass right (cols 4->10, row 6) ---
        { c: 4, r: 6 }, { c: 5, r: 6 }, { c: 6, r: 6 }, { c: 7, r: 6 },
        { c: 8, r: 6 }, { c: 9, r: 6 }, { c: 10, r: 6 },

        // --- Third descent (col 10, rows 7-8) ---
        { c: 10, r: 7 }, { c: 10, r: 8 },

        // --- Fourth pass left (cols 9->5, row 8) ---
        { c: 9, r: 8 }, { c: 8, r: 8 }, { c: 7, r: 8 }, { c: 6, r: 8 }, { c: 5, r: 8 },

        // --- Fourth descent (col 5, rows 9-10) ---
        { c: 5, r: 9 }, { c: 5, r: 10 },

        // --- Fifth pass right (cols 6->15, row 10) ---
        { c: 6, r: 10 }, { c: 7, r: 10 }, { c: 8, r: 10 }, { c: 9, r: 10 },
        { c: 10, r: 10 }, { c: 11, r: 10 }, { c: 12, r: 10 }, { c: 13, r: 10 },
        { c: 14, r: 10 }, { c: 15, r: 10 },

        // --- Final descent to castle (col 15, rows 11-13) ---
        { c: 15, r: 11 }, { c: 15, r: 12 }, { c: 15, r: 13 },
    ],

    // ========================================================
    // Decorations — dense jungle foliage + ruins + huts
    // ========================================================
    // Trees dominate the decoration set, creating the dense
    // jungle feel. Rocks add variety. Three huts represent
    // jungle dwellings. Temple ruins are rendered separately
    // in renderMap (not as BLOCKED decorations).
    // ========================================================
    decorations: [
        // === Dense jungle trees ===
        // Trees cover most columns and rows to create the
        // claustrophobic jungle environment.
        { c: 5, r: 0, type: BLOCKED_TREE }, { c: 10, r: 0, type: BLOCKED_TREE }, { c: 15, r: 0, type: BLOCKED_TREE },
        { c: 8, r: 1, type: BLOCKED_TREE }, { c: 13, r: 1, type: BLOCKED_TREE }, { c: 17, r: 1, type: BLOCKED_TREE },
        { c: 10, r: 3, type: BLOCKED_TREE }, { c: 14, r: 3, type: BLOCKED_TREE },
        { c: 1, r: 4, type: BLOCKED_TREE }, { c: 18, r: 4, type: BLOCKED_TREE },
        { c: 7, r: 5, type: BLOCKED_TREE }, { c: 13, r: 5, type: BLOCKED_TREE },
        { c: 1, r: 7, type: BLOCKED_TREE }, { c: 14, r: 7, type: BLOCKED_TREE },
        { c: 1, r: 9, type: BLOCKED_TREE }, { c: 10, r: 9, type: BLOCKED_TREE }, { c: 18, r: 9, type: BLOCKED_TREE },
        { c: 3, r: 11, type: BLOCKED_TREE }, { c: 8, r: 11, type: BLOCKED_TREE },
        { c: 6, r: 13, type: BLOCKED_TREE }, { c: 12, r: 13, type: BLOCKED_TREE },

        // === Rocks and stone debris ===
        { c: 3, r: 0, type: BLOCKED_ROCK }, { c: 12, r: 0, type: BLOCKED_ROCK },
        { c: 4, r: 1, type: BLOCKED_ROCK }, { c: 16, r: 2, type: BLOCKED_ROCK },
        { c: 1, r: 3, type: BLOCKED_ROCK }, { c: 12, r: 3, type: BLOCKED_ROCK },
        { c: 9, r: 5, type: BLOCKED_ROCK }, { c: 15, r: 5, type: BLOCKED_ROCK },
        { c: 2, r: 6, type: BLOCKED_ROCK }, { c: 16, r: 7, type: BLOCKED_ROCK },
        { c: 13, r: 8, type: BLOCKED_ROCK }, { c: 18, r: 8, type: BLOCKED_ROCK },
        { c: 0, r: 10, type: BLOCKED_ROCK }, { c: 17, r: 12, type: BLOCKED_ROCK },

        // === Jungle huts ===
        { c: 16, r: 0, type: BLOCKED_HOUSE },
        { c: 18, r: 6, type: BLOCKED_HOUSE },
        { c: 2, r: 8, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the jungle ruins scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Temple ruins — 3 ruined stone temples (drawn first so
    //      terrain tiles overlap their bases)
    //   2. Terrain tiles — jungle_3d tiles with mossy patches
    //   3. Decoration sprites on BLOCKED cells
    //   4. Smooth path ribbon (jungle terrain)
    //   5. Winding river — sine-wave river path with gradient
    //      water, riverbank, and foam lines
    //   6. Bridges — wooden bridges where the path crosses the river
    //   7. Monkeys — simple brown circles near trees
    //   8. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // ========================================
        // Phase 1: Temple ruins
        // ========================================
        // Three ancient temple ruins at (500,70), (680,300),
        // and (120,420). Drawn early so the terrain tiles
        // behind them create a natural ground base.
        [
            { x: 500, y: 70 },
            { x: 680, y: 300 },
            { x: 120, y: 420 },
        ].forEach(function(ruinPos) {
            drawTempleRuin(ctx, ruinPos.x, ruinPos.y, 30, Math.floor(ruinPos.x + ruinPos.y));
        });

        // ========================================
        // Phase 2 & 3: Terrain tiles and decorations
        // ========================================
        // Draw jungle_3d tiles across the grid. On buildable cells,
        // randomly add mossy foliage patches (30% chance). On
        // BLOCKED cells, draw the decoration sprite.
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'jungle_3d', row + col, x, y);
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'jungle_3d', row + col, x, y);

                    // Mossy foliage patches (small green ellipses for jungle floor)
                    const r = seededRand(row * 1000 + col);
                    if (r > 0.7) {
                        ctx.fillStyle = 'rgba(20,60,15,0.2)';
                        ctx.beginPath();
                        ctx.ellipse(
                            cx + seededRand(row * 77 + col) * 6 - 3,
                            cy + seededRand(row * 99 + col) * 4 - 2,
                            4, 2,
                            seededRand(row + col),
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
            }
        }

        // ========================================
        // Phase 4: Smooth path ribbon (jungle)
        // ========================================
        renderSmoothPath(ctx, 'jungle', 12);

        // ========================================
        // Phase 5: Winding river
        // ========================================
        // The river is constructed as a sine-wave path of 14
        // control points flowing vertically through the left
        // side of the map (approx x range: 80-340). The river
        // has a dark riverbank and a blue water surface with
        // white foam lines.
        //
        // The river points are generated using a sine function
        // that creates gentle S-curves along the vertical axis.
        const riverPoints = [];
        for (let i = 0; i < 14; i++) {
            const t = i / 13;  // Normalized position (0 to 1)
            riverPoints.push({
                x: 80 + t * 260 + Math.sin(t * Math.PI * 2.5) * 50,
                y: -5 + t * (GAME_HEIGHT + 10)  // Spread from top to bottom
            });
        }

        const halfWidth = 11;                             // Half the river width
        const leftBank = [], rightBank = [];

        // Compute left and right bank points using normals at each point
        for (let i = 0; i < riverPoints.length; i++) {
            let angle;
            if (i === 0) {
                // First point: use direction to next point
                angle = Math.atan2(
                    riverPoints[i + 1].y - riverPoints[i].y,
                    riverPoints[i + 1].x - riverPoints[i].x
                );
            } else if (i === riverPoints.length - 1) {
                // Last point: use direction from previous point
                angle = Math.atan2(
                    riverPoints[i].y - riverPoints[i - 1].y,
                    riverPoints[i].x - riverPoints[i - 1].x
                );
            } else {
                // Interior point: average incoming and outgoing angles
                angle = (Math.atan2(riverPoints[i].y - riverPoints[i - 1].y, riverPoints[i].x - riverPoints[i - 1].x)
                      + Math.atan2(riverPoints[i + 1].y - riverPoints[i].y, riverPoints[i + 1].x - riverPoints[i].x)) / 2;
            }
            const perpX = -Math.sin(angle) * halfWidth;
            const perpY = Math.cos(angle) * halfWidth;
            leftBank.push({ x: riverPoints[i].x + perpX, y: riverPoints[i].y + perpY });
            rightBank.push({ x: riverPoints[i].x - perpX, y: riverPoints[i].y - perpY });
        }

        // Riverbank (dark brown outline)
        ctx.fillStyle = '#7B6348';
        ctx.beginPath();
        ctx.moveTo(leftBank[0].x - 3, leftBank[0].y - 2);
        for (let i = 1; i < leftBank.length; i++) {
            ctx.lineTo(leftBank[i].x - 3, leftBank[i].y - 3);
        }
        const lastEntryAngle = Math.atan2(
            riverPoints[riverPoints.length - 1].y - riverPoints[riverPoints.length - 2].y,
            riverPoints[riverPoints.length - 1].x - riverPoints[riverPoints.length - 2].x
        );
        const firstExitAngle = Math.atan2(
            riverPoints[1].y - riverPoints[0].y,
            riverPoints[1].x - riverPoints[0].x
        );
        ctx.arc(
            riverPoints[riverPoints.length - 1].x,
            riverPoints[riverPoints.length - 1].y,
            halfWidth + 3.5,
            lastEntryAngle - Math.PI / 2,
            lastEntryAngle + Math.PI / 2
        );
        for (let i = rightBank.length - 1; i >= 1; i--) {
            ctx.lineTo(rightBank[i].x + 3, rightBank[i].y + 3);
        }
        ctx.arc(
            riverPoints[0].x, riverPoints[0].y,
            halfWidth + 3.5,
            firstExitAngle + Math.PI / 2,
            firstExitAngle + Math.PI * 1.5
        );
        ctx.closePath();
        ctx.fill();

        // Water surface (blue gradient)
        const waterGradient = ctx.createLinearGradient(
            riverPoints[0].x, 0,
            riverPoints[riverPoints.length - 1].x, GAME_HEIGHT
        );
        waterGradient.addColorStop(0, '#3A8ABF');
        waterGradient.addColorStop(0.3, '#4A9FD9');
        waterGradient.addColorStop(0.5, '#2E7DB3');
        waterGradient.addColorStop(0.7, '#4A9FD9');
        waterGradient.addColorStop(1, '#3A8ABF');
        ctx.fillStyle = waterGradient;
        ctx.beginPath();
        ctx.moveTo(leftBank[0].x, leftBank[0].y);
        for (let i = 1; i < leftBank.length; i++) ctx.lineTo(leftBank[i].x, leftBank[i].y);
        ctx.arc(
            riverPoints[riverPoints.length - 1].x,
            riverPoints[riverPoints.length - 1].y,
            halfWidth,
            lastEntryAngle - Math.PI / 2,
            lastEntryAngle + Math.PI / 2
        );
        for (let i = rightBank.length - 1; i >= 1; i--) ctx.lineTo(rightBank[i].x, rightBank[i].y);
        ctx.arc(
            riverPoints[0].x, riverPoints[0].y,
            halfWidth,
            firstExitAngle + Math.PI / 2,
            firstExitAngle + Math.PI * 1.5
        );
        ctx.closePath();
        ctx.fill();

        // White foam lines (parallel strokes on the water surface)
        for (let offset = -halfWidth * 0.35; offset <= halfWidth * 0.35; offset += halfWidth * 0.3) {
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 - Math.abs(offset) * 0.012) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            for (let i = 0; i < riverPoints.length; i++) {
                const angle = i < riverPoints.length - 1
                    ? Math.atan2(riverPoints[i + 1].y - riverPoints[i].y, riverPoints[i + 1].x - riverPoints[i].x)
                    : Math.atan2(riverPoints[i].y - riverPoints[i - 1].y, riverPoints[i].x - riverPoints[i - 1].x);
                const px = riverPoints[i].x + (-Math.sin(angle) * offset);
                const py = riverPoints[i].y + (Math.cos(angle) * offset);
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // ========================================
        // Phase 6: Bridges over the river
        // ========================================
        // Auto-detect path cells that overlap the river by
        // checking if a cell center falls near any river segment.
        // Draw a wooden bridge at each crossing point.
        for (let i = 0; i < riverPoints.length - 1; i++) {
            const midX = (riverPoints[i].x + riverPoints[i + 1].x) / 2;
            const midY = (riverPoints[i].y + riverPoints[i + 1].y) / 2;
            const mapCol = Math.floor(midX / CELL_SIZE);
            const mapRow = Math.floor(midY / CELL_SIZE);
            if (mapRow >= 0 && mapRow < GRID_ROWS &&
                mapCol >= 0 && mapCol < GRID_COLS &&
                GRID_DATA[mapRow][mapCol] === CELL_PATH) {
                drawBridge(ctx, midX, midY, CELL_SIZE * 0.8);
            }
        }

        // ========================================
        // Phase 7: Monkeys (simplified as small dots near trees)
        // ========================================
        // Small brown circles clustered in three jungle areas.
        // Dark body + lighter head for a simple monkey silhouette.
        [
            { x: 200, y: 70 },
            { x: 480, y: 340 },
            { x: 620, y: 180 },
        ].forEach(function(monkeyPos) {
            ctx.fillStyle = '#6D4C41';
            ctx.beginPath();
            ctx.arc(monkeyPos.x, monkeyPos.y - 5, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8D6E63';
            ctx.beginPath();
            ctx.arc(monkeyPos.x, monkeyPos.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // ========================================
        // Phase 8: Gate (entrance) and Castle (exit)
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
