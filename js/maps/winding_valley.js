// Map: Winding Valley — serpentine path through a mountain valley
MAP_DEFS.winding_valley = {
    id: 'winding_valley', name: 'Winding Valley', unlockRequirement: 'crossroads',
    description: 'A long serpentine path winding through a narrow mountain valley — plenty of room for defenses.',

    // ~58-cell path with 3-4 row spacing between passes for tower placement
    pathCells: [
        // === Pass 1 — enter right, wind left across the upper valley (row 1-2) ===
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 },
        { c: 16, r: 2 }, { c: 15, r: 2 }, { c: 14, r: 2 },
        { c: 13, r: 2 }, { c: 12, r: 2 }, { c: 11, r: 2 },
        { c: 10, r: 2 }, { c: 9, r: 2 }, { c: 8, r: 2 },
        { c: 7, r: 1 }, { c: 6, r: 1 },

        // === Drop down to pass 2 (diagonal transition through buildable rows 3-4) ===
        { c: 5, r: 2 }, { c: 4, r: 3 }, { c: 4, r: 4 },

        // === Pass 2 — wind right across mid valley (row 5-6) ===
        { c: 5, r: 5 }, { c: 6, r: 6 }, { c: 7, r: 6 },
        { c: 8, r: 6 }, { c: 9, r: 6 }, { c: 10, r: 6 },
        { c: 11, r: 6 }, { c: 12, r: 6 }, { c: 13, r: 6 },
        { c: 14, r: 5 }, { c: 15, r: 5 }, { c: 16, r: 5 },

        // === Drop down to pass 3 (diagonal transition through buildable rows 7-8) ===
        { c: 16, r: 6 }, { c: 17, r: 7 }, { c: 17, r: 8 },

        // === Pass 3 — wind left across lower valley (row 9-10) ===
        { c: 16, r: 9 }, { c: 15, r: 9 }, { c: 14, r: 10 },
        { c: 13, r: 10 }, { c: 12, r: 10 }, { c: 11, r: 10 },
        { c: 10, r: 10 }, { c: 9, r: 10 }, { c: 8, r: 9 },
        { c: 7, r: 9 }, { c: 6, r: 9 },

        // === Descend to castle (rows 11-13) ===
        { c: 5, r: 10 }, { c: 4, r: 11 }, { c: 4, r: 12 },
        { c: 5, r: 13 }, { c: 6, r: 13 }, { c: 7, r: 13 },
    ],

    decorations: [
        // === Left mountain range (cols 0-2) — sparse rocks, some trees ===
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

        // === Mid-field obstacles — light scatter for flavor without blocking build space ===
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

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // Sky gradient behind mountains
        const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT * 0.4);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(0.5, '#B0D8F0');
        skyGrad.addColorStop(1, '#D4E8F5');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.4);

        // === Left mountain range (dense, layered) ===
        drawMountain(ctx, 40, 5, 160, 140, 12);
        drawMountain(ctx, 120, 0, 140, 120, 34);
        drawMountain(ctx, 200, 8, 180, 150, 56);
        drawMountain(ctx, 10, 25, 170, 135, 78);
        drawMountain(ctx, 90, 20, 150, 125, 100);
        drawMountain(ctx, 170, 15, 160, 140, 122);
        drawMountain(ctx, 50, 40, 175, 145, 140);
        drawMountain(ctx, 150, 35, 155, 130, 158);

        // === Right mountain range (dense, layered) ===
        drawMountain(ctx, GAME_WIDTH - 80, 0, 150, 130, 18);
        drawMountain(ctx, GAME_WIDTH - 150, 5, 170, 145, 42);
        drawMountain(ctx, GAME_WIDTH - 30, 8, 140, 115, 66);
        drawMountain(ctx, GAME_WIDTH - 120, 18, 160, 135, 88);
        drawMountain(ctx, GAME_WIDTH - 60, 20, 155, 140, 110);
        drawMountain(ctx, GAME_WIDTH - 170, 15, 145, 120, 134);
        drawMountain(ctx, GAME_WIDTH - 40, 38, 165, 142, 152);
        drawMountain(ctx, GAME_WIDTH - 140, 30, 150, 125, 168);

        // === Valley floor terrain ===
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                SpriteAtlas.drawTile(ctx, 'grass_3d', row + col, x, y);

                // Foothill shading near mountain edges
                const distFromLeft = col / GRID_COLS;
                const distFromRight = (GRID_COLS - 1 - col) / GRID_COLS;
                const nearMountains = Math.min(distFromLeft, distFromRight) < 0.22;
                const heightFactor = Math.sin(row * 0.35 + col * 0.22) * 0.15 + (nearMountains ? 0.32 : 0);

                if (heightFactor > 0.12) {
                    ctx.fillStyle = 'rgba(0,0,0,' + (heightFactor * 0.16) + ')';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }

                if (type === CELL_BLOCKED) {
                    const decoType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decoType, row * 100 + col, cx, cy + 2, 38);
                }
            }
        }

        // === Smooth path ribbon ===
        renderSmoothPath(ctx, 'dirt', 14);

        // === Mountain foot shadows on valley edges ===
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

        // === Ridge shadow lines (foothills) ===
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

        // === Gate (entrance) and Castle (exit) ===
        const sc = PATH_CELLS[0];
        drawGate(ctx, sc.c * CELL_SIZE + CELL_SIZE / 2, sc.r * CELL_SIZE + CELL_SIZE / 2 + 4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length - 1];
        drawCastle(ctx, bc.c * CELL_SIZE + CELL_SIZE / 2, bc.r * CELL_SIZE + CELL_SIZE / 2 - 2, 20);
    },

    renderPathArrows: function(ctx) {
        for (let i = 0; i < WAYPOINTS.length - 1; i++) {
            const f = WAYPOINTS[i], t = WAYPOINTS[i + 1],
                mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2,
                a = Math.atan2(t.y - f.y, t.x - f.x);
            ctx.save(); ctx.translate(mx, my); ctx.rotate(a);
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(-3, -2); ctx.lineTo(-3, 2); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
};
