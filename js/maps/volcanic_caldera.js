// Map: Lunar Base — moon surface with craters, Earth in the sky, lunar lander
MAP_DEFS.volcanic_caldera = {
    id: 'volcanic_caldera', name: 'Lunar Base', unlockRequirement: 'jungle_ruins',
    description: 'A desolate lunar outpost. Cratered terrain under a starry void with Earth on the horizon.',

    pathCells: [
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 }, { c: 16, r: 1 }, { c: 15, r: 1 },
        { c: 14, r: 1 }, { c: 13, r: 1 }, { c: 12, r: 1 }, { c: 11, r: 1 }, { c: 10, r: 1 },
        { c: 10, r: 2 }, { c: 10, r: 3 },
        { c: 9, r: 3 }, { c: 8, r: 3 }, { c: 7, r: 3 }, { c: 6, r: 3 }, { c: 5, r: 3 },
        { c: 5, r: 4 }, { c: 5, r: 5 },
        { c: 6, r: 5 }, { c: 7, r: 5 }, { c: 8, r: 5 }, { c: 9, r: 5 }, { c: 10, r: 5 }, { c: 11, r: 5 }, { c: 12, r: 5 },
        { c: 12, r: 6 }, { c: 12, r: 7 },
        { c: 11, r: 7 }, { c: 10, r: 7 }, { c: 9, r: 7 }, { c: 8, r: 7 }, { c: 7, r: 7 },
        { c: 7, r: 8 }, { c: 7, r: 9 },
        { c: 8, r: 9 }, { c: 9, r: 9 }, { c: 10, r: 9 }, { c: 11, r: 9 }, { c: 12, r: 9 }, { c: 13, r: 9 },
        { c: 14, r: 9 }, { c: 15, r: 9 },
        { c: 15, r: 10 }, { c: 15, r: 11 }, { c: 15, r: 12 }, { c: 15, r: 13 },
    ],

    decorations: [
        // Lunar rocks (small craters and boulders)
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

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();

        // Deep space background at top
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, 60);
        spaceGrad.addColorStop(0, '#050510'); spaceGrad.addColorStop(1, 'rgba(5,5,16,0)');
        ctx.fillStyle = spaceGrad; ctx.fillRect(0, 0, GAME_WIDTH, 60);

        // Stars
        for (let i = 0; i < 40; i++) {
            const sx = seededRand(i * 17) * GAME_WIDTH;
            const sy = seededRand(i * 31) * 100;
            const brightness = 0.4 + seededRand(i * 13) * 0.6;
            ctx.fillStyle = 'rgba(255,255,255,' + brightness + ')';
            ctx.beginPath();
            ctx.arc(sx, sy, 0.5 + seededRand(i * 19) * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Earth on the horizon
        const earthX = GAME_WIDTH * 0.78, earthY = 30;
        ctx.fillStyle = 'rgba(30,60,180,0.15)';
        ctx.beginPath(); ctx.arc(earthX, earthY, 38, 0, Math.PI * 2); ctx.fill();
        // Earth blue marble
        const earthGrad = ctx.createRadialGradient(earthX - 8, earthY - 8, 5, earthX, earthY, 32);
        earthGrad.addColorStop(0, '#4FC3F7');
        earthGrad.addColorStop(0.3, '#1E88E5');
        earthGrad.addColorStop(0.5, '#1565C0');
        earthGrad.addColorStop(0.7, '#0D47A1');
        earthGrad.addColorStop(1, '#1A237E');
        ctx.fillStyle = earthGrad;
        ctx.beginPath(); ctx.arc(earthX, earthY, 32, 0, Math.PI * 2); ctx.fill();
        // Continents (green patches)
        ctx.fillStyle = 'rgba(76,175,80,0.5)';
        ctx.beginPath(); ctx.arc(earthX + 8, earthY - 5, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(earthX - 5, earthY + 8, 7, 0, Math.PI * 2); ctx.fill();
        // Cloud wisps
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(earthX - 3, earthY - 12, 14, 4, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(earthX + 10, earthY + 4, 10, 3, -0.1, 0, Math.PI * 2); ctx.fill();

        // Terrain
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;

                if (type === CELL_PATH) {
                    // Lunar dust trail
                    const pGrad = ctx.createLinearGradient(0, y, 0, y + CELL_SIZE);
                    pGrad.addColorStop(0, '#9E9E9E'); pGrad.addColorStop(1, '#757575');
                    ctx.fillStyle = pGrad;
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    // Footprint-like texture
                    ctx.fillStyle = 'rgba(0,0,0,0.06)';
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(x + 8 + i * 12, y + 10 + (i % 2) * 14, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (type === CELL_BLOCKED) {
                    // Lunar surface
                    SpriteAtlas.drawTile(ctx, 'volcanic', row + col, x, y);
                    const dt = DECO_MAP[row + ',' + col] || BLOCKED_ROCK;
                    SpriteAtlas.drawDeco(ctx, dt, row * 100 + col, cx, cy + 2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'volcanic', row + col, x, y);
                    // Small crater speckles
                    const r = seededRand(row * 1000 + col);
                    if (r > 0.78) {
                        ctx.fillStyle = 'rgba(0,0,0,0.12)';
                        ctx.beginPath();
                        ctx.arc(cx, cy, 3 + seededRand(row * 33 + col) * 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        ctx.beginPath();
                        ctx.arc(cx - 1, cy - 1, 1.5 + seededRand(row * 33 + col) * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.06)';
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }

        // Large craters with shadow rims
        const craters = [
            { x: 100, y: 60, r: 38 },
            { x: 160, y: 300, r: 48 },
            { x: 100, y: 450, r: 32 },
        ];
        craters.forEach(cr => {
            // Outer rim shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.arc(cr.x + 3, cr.y + 3, cr.r + 6, 0, Math.PI * 2);
            ctx.fill();
            // Rim
            ctx.fillStyle = '#BDBDBD';
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.r + 4, 0, Math.PI * 2);
            ctx.fill();
            // Crater interior (darker)
            const crGrad = ctx.createRadialGradient(cr.x - cr.r * 0.2, cr.y - cr.r * 0.2, cr.r * 0.1, cr.x, cr.y, cr.r);
            crGrad.addColorStop(0, '#8A8A8A');
            crGrad.addColorStop(0.7, '#9E9E9E');
            crGrad.addColorStop(1, '#B0B0B0');
            ctx.fillStyle = crGrad;
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
            ctx.fill();
            // Inner shadow (depth illusion)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(cr.x - cr.r * 0.15, cr.y + cr.r * 0.15, cr.r * 0.7, 0, Math.PI * 2);
            ctx.fill();
            // Rim highlight (sunlit edge)
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.r + 2, -Math.PI * 0.4, Math.PI * 0.2);
            ctx.stroke();
        });

        // Lunar lander (bottom-left)
        const lx = 60, ly = 240;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(lx + 3, ly + 18, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
        // Legs
        ctx.strokeStyle = '#BDBDBD'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx - 8, ly - 4); ctx.lineTo(lx - 12, ly + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx + 8, ly - 4); ctx.lineTo(lx + 12, ly + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx - 3, ly + 2); ctx.lineTo(lx - 5, ly + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx + 3, ly + 2); ctx.lineTo(lx + 5, ly + 14); ctx.stroke();
        // Foot pads
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(lx - 15, ly + 12, 8, 3); ctx.fillRect(lx + 7, ly + 12, 8, 3);
        ctx.fillRect(lx - 8, ly + 12, 8, 3); ctx.fillRect(lx, ly + 12, 8, 3);
        // Body
        const bodyGrad = ctx.createLinearGradient(lx - 8, 0, lx + 8, 0);
        bodyGrad.addColorStop(0, '#E0E0E0'); bodyGrad.addColorStop(0.5, '#FAFAFA'); bodyGrad.addColorStop(1, '#BDBDBD');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(lx - 8, ly - 10, 16, 12);
        ctx.strokeStyle = '#9E9E9E'; ctx.lineWidth = 1;
        ctx.strokeRect(lx - 8, ly - 10, 16, 12);
        // Window
        ctx.fillStyle = '#FFE082';
        ctx.fillRect(lx - 3, ly - 7, 6, 5);
        // Antenna
        ctx.strokeStyle = '#E0E0E0'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(lx + 2, ly - 10); ctx.lineTo(lx + 2, ly - 20); ctx.stroke();
        ctx.fillStyle = '#FF5252';
        ctx.beginPath(); ctx.arc(lx + 2, ly - 21, 2, 0, Math.PI * 2); ctx.fill();

        // American-style flag
        const fx = 660, fy = 440;
        ctx.strokeStyle = '#E0E0E0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 28); ctx.stroke();
        ctx.fillStyle = '#F44336'; ctx.fillRect(fx, fy - 28, 14, 9);
        ctx.fillStyle = '#1565C0'; ctx.fillRect(fx, fy - 28, 7, 5);
        // Flag wave
        ctx.strokeStyle = '#BDBDBD'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(fx + 14, fy - 24); ctx.lineTo(fx + 10, fy - 20); ctx.lineTo(fx + 14, fy - 19); ctx.stroke();

        const sc = PATH_CELLS[0];
        drawGate(ctx, sc.c * CELL_SIZE + CELL_SIZE / 2, sc.r * CELL_SIZE + CELL_SIZE / 2 + 4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length - 1];
        drawCastle(ctx, bc.c * CELL_SIZE + CELL_SIZE / 2, bc.r * CELL_SIZE + CELL_SIZE / 2 - 2, 20);
    },

    renderPathArrows: function(ctx) {
        for (let i = 0; i < WAYPOINTS.length - 1; i++) {
            const f = WAYPOINTS[i], t = WAYPOINTS[i + 1];
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
            const a = Math.atan2(t.y - f.y, t.x - f.x);
            ctx.save(); ctx.translate(mx, my); ctx.rotate(a);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(-3, -2); ctx.lineTo(-3, 2);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
};
