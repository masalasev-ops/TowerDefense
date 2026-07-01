// ========================================================
// Map: Winding Valley — serpentine path through a mountain valley
// ========================================================
//
// THEME & VISUAL IDENTITY
//   A narrow mountain valley flanked by two towering mountain
//   ranges (left and right). The valley floor is covered in
//   green grass with foothill shadows near the mountain bases.
//   A sky gradient provides the background behind peaks.
//
// PATH LAYOUT STRATEGY
//   The ~58-cell path enters from the right side (col 19, row 1)
//   and snakes left-to-right in 3 descending passes across the
//   valley. There is 3-4 row spacing between passes, giving
//   players ample room for tower placement in the central
//   buildable zone. The path ends at the bottom-left castle.
//
//   Passes:
//     Pass 1 (rows 1-2): right-to-left along the upper valley
//     Pass 2 (rows 5-6): left-to-right across mid valley
//     Pass 3 (rows 9-10): right-to-left across lower valley
//     Final descent (rows 11-13): down to the castle
//
// DECORATION PLACEMENT STRATEGY
//   Left mountain range (cols 0-2): dense rocks with some trees
//   Right mountain range (cols 17-19): dense rocks with some trees
//   Mid-field: light scatter for flavor, a few houses for scale
//   Decorations form the valley walls, leaving a wide central
//   corridor for path and towers.
//
// TERRAIN TYPE: dirt (via renderSmoothPath)
//   Warm brown earth path with grass_3d covering the valley floor.
//
// SPECIAL FEATURES
//   - Sky gradient background (light blue to pale blue)
//   - Two mountain ranges drawn with drawMountain() using layered
//     peaks (8 left, 8 right) with snow caps and shadow faces
//   - Foothill shading near mountain edges for depth
//   - Ridge shadow lines (subtle dark curves along valley edges)
//   - Gate at entrance (col 19, row 1) and Castle at exit (col 7, row 13)
// ========================================================

MAP_DEFS.winding_valley = {
    id: 'winding_valley',
    name: 'Winding Valley',
    unlockRequirement: 'crossroads',
    description: 'A long serpentine path winding through a narrow mountain valley — plenty of room for defenses.',

    // ========================================================
    // Path Cells — ~58 cells forming 3 passes across the valley
    // ========================================================
    // Each cell is {c: col, r: row}. 3-4 row spacing between
    // passes leaves room for tower placement.
    //
    // Layout overview:
    //   Enter from right (col 19, row 1), wind left across pass 1
    //   Drop diagonally through buildable rows 3-4
    //   Wind right across pass 2 (row 5-6)
    //   Drop diagonally through buildable rows 7-8
    //   Wind left across pass 3 (row 9-10)
    //   Descend to castle at bottom (rows 11-13)
    // ========================================================
    pathCells: [
        // === Pass 1: Enter right, wind left across the upper valley (rows 1-2) ===
        // Enemies spawn at col 19, row 1 and move left along the top
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 },
        { c: 16, r: 2 }, { c: 15, r: 2 }, { c: 14, r: 2 },
        { c: 13, r: 2 }, { c: 12, r: 2 }, { c: 11, r: 2 },
        { c: 10, r: 2 }, { c: 9, r: 2 }, { c: 8, r: 2 },
        { c: 7, r: 1 }, { c: 6, r: 1 },

        // === Drop down to pass 2 (diagonal transition through buildable rows 3-4) ===
        // This diagonal creates a smooth visual transition between passes
        { c: 5, r: 2 }, { c: 4, r: 3 }, { c: 4, r: 4 },

        // === Pass 2: Wind right across mid valley (rows 5-6) ===
        // Enemies reverse direction and traverse back to the right
        { c: 5, r: 5 }, { c: 6, r: 6 }, { c: 7, r: 6 },
        { c: 8, r: 6 }, { c: 9, r: 6 }, { c: 10, r: 6 },
        { c: 11, r: 6 }, { c: 12, r: 6 }, { c: 13, r: 6 },
        { c: 14, r: 5 }, { c: 15, r: 5 }, { c: 16, r: 5 },

        // === Drop down to pass 3 (diagonal transition through buildable rows 7-8) ===
        { c: 16, r: 6 }, { c: 17, r: 7 }, { c: 17, r: 8 },

        // === Pass 3: Wind left across lower valley (rows 9-10) ===
        // Final pass back to the left side
        { c: 16, r: 9 }, { c: 15, r: 9 }, { c: 14, r: 10 },
        { c: 13, r: 10 }, { c: 12, r: 10 }, { c: 11, r: 10 },
        { c: 10, r: 10 }, { c: 9, r: 10 }, { c: 8, r: 9 },
        { c: 7, r: 9 }, { c: 6, r: 9 },

        // === Descend to castle (rows 11-13) ===
        // Final zigzag leading to the castle at bottom-left
        { c: 5, r: 10 }, { c: 4, r: 11 }, { c: 4, r: 12 },
        { c: 5, r: 13 }, { c: 6, r: 13 }, { c: 7, r: 13 },
    ],

    // ========================================================
    // Decorations — mountain formations + mid-field obstacles
    // ========================================================
    // Left mountain range (cols 0-2) and right mountain range
    // (cols 17-19) are densely packed with rocks and trees to
    // create the visual impression of mountain walls. Mid-field
    // has light scatter to avoid blocking buildable space.
    // ========================================================
    decorations: [
        // === Left mountain range (cols 0-2) — sparse rocks, some trees ===
        // Forms the western valley wall. Rocks dominate with a few
        // hardy trees growing in crevices.
        { c: 0, r: 0, type: BLOCKED_ROCK }, { c: 1, r: 0, type: BLOCKED_ROCK },
        { c: 0, r: 1, type: BLOCKED_ROCK },
        { c: 0, r: 2, type: BLOCKED_ROCK }, { c: 2, r: 2, type: BLOCKED_TREE },
        { c: 0, r: 3, type: BLOCKED_ROCK }, { c: 1, r: 3, type: BLOCKED_TREE },
        { c: 1, r: 4, type: BLOCKED_ROCK },
        { c: 0, r: 5, type: BLOCKED_ROCK }, { c: 2, r: 5, type: BLOCKED_TREE },
        { c: 1, r: 6, type: BLOCKED_ROCK },
        { c: 0, r: 7, type: BLOCKED_TREE },
        { c: 0, r: 8, type: BLOCKED_ROCK }, { c: 2, r: 8, type: BLOCKED_TREE },
        { c: 1, r: 9, type: BLOCKED_ROCK },
        { c: 0, r: 10, type: BLOCKED_ROCK },
        { c: 1, r: 11, type: BLOCKED_ROCK }, { c: 2, r: 11, type: BLOCKED_TREE },
        { c: 0, r: 12, type: BLOCKED_ROCK },
        { c: 0, r: 13, type: BLOCKED_ROCK }, { c: 1, r: 13, type: BLOCKED_ROCK },

        // === Right mountain range (cols 17-19) — dense rocks and trees ===
        // Forms the eastern valley wall. Denser than the left side
        // for visual variety.
        { c: 17, r: 0, type: BLOCKED_ROCK }, { c: 18, r: 0, type: BLOCKED_ROCK },
        { c: 19, r: 0, type: BLOCKED_ROCK },
        { c: 17, r: 1, type: BLOCKED_TREE }, { c: 18, r: 1, type: BLOCKED_ROCK },
        { c: 19, r: 1, type: BLOCKED_TREE },
        { c: 17, r: 2, type: BLOCKED_ROCK }, { c: 18, r: 2, type: BLOCKED_ROCK },
        { c: 19, r: 2, type: BLOCKED_ROCK },
        { c: 17, r: 3, type: BLOCKED_TREE }, { c: 18, r: 3, type: BLOCKED_ROCK },
        { c: 19, r: 3, type: BLOCKED_TREE },
        { c: 17, r: 4, type: BLOCKED_ROCK }, { c: 18, r: 4, type: BLOCKED_TREE },
        { c: 19, r: 4, type: BLOCKED_ROCK },
        { c: 17, r: 5, type: BLOCKED_TREE }, { c: 18, r: 5, type: BLOCKED_ROCK },
        { c: 19, r: 5, type: BLOCKED_ROCK },
        { c: 17, r: 6, type: BLOCKED_ROCK }, { c: 18, r: 6, type: BLOCKED_TREE },
        { c: 19, r: 6, type: BLOCKED_ROCK },
        { c: 17, r: 7, type: BLOCKED_TREE }, { c: 18, r: 7, type: BLOCKED_ROCK },
        { c: 19, r: 7, type: BLOCKED_TREE },
        { c: 17, r: 8, type: BLOCKED_ROCK }, { c: 18, r: 8, type: BLOCKED_ROCK },
        { c: 19, r: 8, type: BLOCKED_ROCK },
        { c: 17, r: 9, type: BLOCKED_TREE }, { c: 18, r: 9, type: BLOCKED_ROCK },
        { c: 19, r: 9, type: BLOCKED_TREE },
        { c: 17, r: 10, type: BLOCKED_ROCK }, { c: 18, r: 10, type: BLOCKED_TREE },
        { c: 19, r: 10, type: BLOCKED_ROCK },
        { c: 17, r: 11, type: BLOCKED_TREE }, { c: 18, r: 11, type: BLOCKED_ROCK },
        { c: 19, r: 11, type: BLOCKED_ROCK },
        { c: 17, r: 12, type: BLOCKED_ROCK }, { c: 18, r: 12, type: BLOCKED_ROCK },
        { c: 19, r: 12, type: BLOCKED_TREE },
        { c: 17, r: 13, type: BLOCKED_ROCK }, { c: 18, r: 13, type: BLOCKED_ROCK },
        { c: 19, r: 13, type: BLOCKED_ROCK },

        // === Mid-field obstacles — light scatter for flavor ===
        // These create visual interest in the valley without
        // blocking significant tower placement space.
        { c: 10, r: 0, type: BLOCKED_TREE },
        { c: 8, r: 3, type: BLOCKED_TREE },
        { c: 13, r: 4, type: BLOCKED_TREE },
        { c: 9, r: 5, type: BLOCKED_ROCK }, { c: 15, r: 4, type: BLOCKED_HOUSE },
        { c: 11, r: 7, type: BLOCKED_TREE }, { c: 5, r: 7, type: BLOCKED_HOUSE },
        { c: 10, r: 8, type: BLOCKED_ROCK }, { c: 15, r: 8, type: BLOCKED_HOUSE },
        { c: 9, r: 7, type: BLOCKED_TREE },
        { c: 11, r: 11, type: BLOCKED_TREE },
        { c: 10, r: 12, type: BLOCKED_TREE },
        { c: 9, r: 0, type: BLOCKED_ROCK },
        { c: 5, r: 12, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    // ========================================================
    // renderMap — draws the mountain valley scene each frame
    // ========================================================
    // Rendering phases:
    //   1. Sky gradient background (light blue above mountains)
    //   2. Left mountain range (8 peaks with snowcaps)
    //   3. Right mountain range (8 peaks with snowcaps)
    //   4. Valley floor terrain tiles (grass_3d with foothill shading)
    //   5. Decoration sprites on BLOCKED cells
    //   6. Smooth path ribbon (dirt terrain)
    //   7. Mountain foot shadows (gradient overlays on valley edges)
    //   8. Ridge shadow lines (subtle dark curves for depth)
    //   9. Gate (entrance) and Castle (exit)
    // ========================================================
    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // ========================================
        // Phase 1: Sky gradient background
        // ========================================
        // Light blue gradient behind the mountain silhouettes.
        // Covers the top 40% of the canvas height.
        const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT * 0.4);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(0.5, '#B0D8F0');
        skyGrad.addColorStop(1, '#D4E8F5');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.4);

        // ========================================
        // Phase 2 & 3: Mountain ranges (left and right)
        // ========================================
        // drawMountain(ctx, x, y, w, h, seed) draws a single peak.
        // Parameters:
        //   x — center X position (base)
        //   y — base Y position (top of base, peaks extend upward)
        //   w — width of the mountain base
        //   h — height of the mountain peak
        //   s — seed for peak asymmetry and snow cap variation
        //
        // Left range: 8 peaks clustered near the left edge
        // Right range: 8 peaks clustered near the right edge
        //
        // Peaks are layered with different heights, widths, and
        // positions to create a natural-looking mountain silhouette.
        // The seed values are arbitrary but fixed so the mountain
        // shapes remain consistent across frames.
        // ========================================
        drawMountain(ctx, 40, 5, 160, 140, 12);
        drawMountain(ctx, 120, 0, 140, 120, 34);
        drawMountain(ctx, 200, 8, 180, 150, 56);
        drawMountain(ctx, 10, 25, 170, 135, 78);
        drawMountain(ctx, 90, 20, 150, 125, 100);
        drawMountain(ctx, 170, 15, 160, 140, 122);
        drawMountain(ctx, 50, 40, 175, 145, 140);
        drawMountain(ctx, 150, 35, 155, 130, 158);

        drawMountain(ctx, GAME_WIDTH - 80, 0, 150, 130, 18);
        drawMountain(ctx, GAME_WIDTH - 150, 5, 170, 145, 42);
        drawMountain(ctx, GAME_WIDTH - 30, 8, 140, 115, 66);
        drawMountain(ctx, GAME_WIDTH - 120, 18, 160, 135, 88);
        drawMountain(ctx, GAME_WIDTH - 60, 20, 155, 140, 110);
        drawMountain(ctx, GAME_WIDTH - 170, 15, 145, 120, 134);
        drawMountain(ctx, GAME_WIDTH - 40, 38, 165, 142, 152);
        drawMountain(ctx, GAME_WIDTH - 140, 30, 150, 125, 168);

        // ========================================
        // Phase 4 & 5: Valley floor terrain and decorations
        // ========================================
        // Draw grass_3d tiles across the valley floor. Near the
        // mountain edges, add foothill shading (dark overlay) for
        // depth. On BLOCKED cells, draw the decoration sprite.
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                // Base terrain tile
                SpriteAtlas.drawTile(ctx, 'grass_3d', row + col, x, y);

                // Foothill shading: darken cells near the left/right
                // mountain edges for a natural transition effect
                const distanceFromLeftEdge = col / GRID_COLS;
                const distanceFromRightEdge = (GRID_COLS - 1 - col) / GRID_COLS;
                const nearMountains = Math.min(distanceFromLeftEdge, distanceFromRightEdge) < 0.22;
                const heightFactor = Math.sin(row * 0.35 + col * 0.22) * 0.15 + (nearMountains ? 0.32 : 0);

                if (heightFactor > 0.12) {
                    ctx.fillStyle = 'rgba(0,0,0,' + (heightFactor * 0.16) + ')';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }

                // Draw decoration sprite on blocked cells
                if (type === CELL_BLOCKED) {
                    const decorationType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decorationType, row * 100 + col, cx, cy + 2, 38);
                }
            }
        }

        // ========================================
        // Phase 6: Smooth path ribbon
        // ========================================
        renderSmoothPath(ctx, 'dirt', 14);

        // ========================================
        // Phase 7: Mountain foot shadows
        // ========================================
        // Gradient shadows along the valley's left and right edges
        // to give the illusion of mountain walls casting shadows
        // onto the valley floor.
        const leftShadow = ctx.createLinearGradient(0, 0, GAME_WIDTH * 0.2, 0);
        leftShadow.addColorStop(0, 'rgba(20,30,20,0.14)');
        leftShadow.addColorStop(0.6, 'rgba(20,30,20,0.04)');
        leftShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftShadow;
        ctx.fillRect(0, 0, GAME_WIDTH * 0.2, GAME_HEIGHT);

        const rightShadow = ctx.createLinearGradient(GAME_WIDTH, 0, GAME_WIDTH * 0.8, 0);
        rightShadow.addColorStop(0, 'rgba(20,30,20,0.14)');
        rightShadow.addColorStop(0.6, 'rgba(20,30,20,0.04)');
        rightShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightShadow;
        ctx.fillRect(GAME_WIDTH * 0.8, 0, GAME_WIDTH * 0.2, GAME_HEIGHT);

        // ========================================
        // Phase 8: Ridge shadow lines
        // ========================================
        // Subtle dark curves running along each side of the valley,
        // simulating the silhouette line where the mountains meet
        // the sky. These thin lines add visual depth.
        ctx.strokeStyle = 'rgba(40,50,30,0.06)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.quadraticCurveTo(45, GAME_HEIGHT * 0.3, 35, GAME_HEIGHT * 0.55);
        ctx.quadraticCurveTo(25, GAME_HEIGHT * 0.8, 50, GAME_HEIGHT);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH - 20, 0);
        ctx.quadraticCurveTo(GAME_WIDTH - 40, GAME_HEIGHT * 0.35, GAME_WIDTH - 30, GAME_HEIGHT * 0.5);
        ctx.quadraticCurveTo(GAME_WIDTH - 50, GAME_HEIGHT * 0.78, GAME_WIDTH - 35, GAME_HEIGHT);
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
    // Draws small dark arrows at the midpoint between each
    // consecutive waypoint pair, rotated to face the direction
    // of travel. These help players visualize the enemy path.
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
