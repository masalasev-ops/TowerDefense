// Map: Fortress Siege — 4-pass cobblestone path with meadows and wildlife
MAP_DEFS.fortress_siege = {
    id: 'fortress_siege', name: 'Fortress Siege', unlockRequirement: 'frozen_pass',
    description: 'A fortified approach through meadows and houses with ambient wildlife.',

    pathCells: [
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 }, { c: 16, r: 1 }, { c: 15, r: 1 },
        { c: 14, r: 1 }, { c: 13, r: 1 }, { c: 12, r: 1 }, { c: 11, r: 1 }, { c: 10, r: 1 },
        { c: 9, r: 1 }, { c: 8, r: 1 }, { c: 7, r: 1 }, { c: 6, r: 1 }, { c: 5, r: 1 },
        { c: 4, r: 1 }, { c: 3, r: 1 },
        { c: 3, r: 2 }, { c: 3, r: 3 }, { c: 3, r: 4 },
        { c: 4, r: 4 }, { c: 5, r: 4 }, { c: 6, r: 4 }, { c: 7, r: 4 }, { c: 8, r: 4 },
        { c: 9, r: 4 }, { c: 10, r: 4 }, { c: 11, r: 4 }, { c: 12, r: 4 }, { c: 13, r: 4 },
        { c: 14, r: 4 }, { c: 15, r: 4 }, { c: 16, r: 4 }, { c: 17, r: 4 },
        { c: 17, r: 5 }, { c: 17, r: 6 }, { c: 17, r: 7 },
        { c: 16, r: 7 }, { c: 15, r: 7 }, { c: 14, r: 7 }, { c: 13, r: 7 }, { c: 12, r: 7 },
        { c: 11, r: 7 }, { c: 10, r: 7 }, { c: 9, r: 7 }, { c: 8, r: 7 }, { c: 7, r: 7 },
        { c: 6, r: 7 }, { c: 5, r: 7 },
        { c: 5, r: 8 }, { c: 5, r: 9 }, { c: 5, r: 10 },
        { c: 6, r: 10 }, { c: 7, r: 10 }, { c: 8, r: 10 }, { c: 9, r: 10 }, { c: 10, r: 10 },
        { c: 11, r: 10 }, { c: 12, r: 10 }, { c: 13, r: 10 }, { c: 14, r: 10 }, { c: 15, r: 10 },
        { c: 15, r: 11 }, { c: 15, r: 12 }, { c: 15, r: 13 },
    ],

    decorations: [
        { c: 2, r: 0, type: BLOCKED_HOUSE }, { c: 12, r: 0, type: BLOCKED_HOUSE },
        { c: 5, r: 0, type: BLOCKED_TREE }, { c: 9, r: 0, type: BLOCKED_TREE },
        { c: 15, r: 0, type: BLOCKED_ROCK }, { c: 18, r: 0, type: BLOCKED_ROCK },
        { c: 0, r: 0, type: BLOCKED_ROCK }, { c: 19, r: 0, type: BLOCKED_ROCK },
        { c: 1, r: 2, type: BLOCKED_HOUSE }, { c: 18, r: 2, type: BLOCKED_HOUSE },
        { c: 6, r: 2, type: BLOCKED_TREE }, { c: 10, r: 2, type: BLOCKED_TREE }, { c: 14, r: 2, type: BLOCKED_TREE },
        { c: 4, r: 2, type: BLOCKED_ROCK }, { c: 12, r: 2, type: BLOCKED_ROCK },
        { c: 6, r: 3, type: BLOCKED_TREE }, { c: 11, r: 3, type: BLOCKED_TREE }, { c: 15, r: 3, type: BLOCKED_ROCK },
        { c: 2, r: 3, type: BLOCKED_ROCK }, { c: 19, r: 3, type: BLOCKED_ROCK },
        { c: 2, r: 5, type: BLOCKED_HOUSE }, { c: 18, r: 5, type: BLOCKED_HOUSE },
        { c: 6, r: 5, type: BLOCKED_TREE }, { c: 10, r: 5, type: BLOCKED_TREE }, { c: 14, r: 5, type: BLOCKED_TREE },
        { c: 8, r: 5, type: BLOCKED_ROCK }, { c: 12, r: 5, type: BLOCKED_ROCK },
        { c: 4, r: 6, type: BLOCKED_TREE }, { c: 9, r: 6, type: BLOCKED_TREE }, { c: 15, r: 6, type: BLOCKED_ROCK }, { c: 19, r: 6, type: BLOCKED_ROCK },
        { c: 4, r: 6, type: BLOCKED_ROCK }, { c: 18, r: 6, type: BLOCKED_ROCK },
        { c: 3, r: 8, type: BLOCKED_HOUSE }, { c: 18, r: 8, type: BLOCKED_HOUSE },
        { c: 7, r: 8, type: BLOCKED_TREE }, { c: 11, r: 8, type: BLOCKED_TREE }, { c: 15, r: 8, type: BLOCKED_TREE },
        { c: 5, r: 8, type: BLOCKED_ROCK }, { c: 13, r: 8, type: BLOCKED_ROCK },
        { c: 2, r: 9, type: BLOCKED_TREE }, { c: 9, r: 9, type: BLOCKED_TREE }, { c: 16, r: 9, type: BLOCKED_ROCK },
        { c: 3, r: 11, type: BLOCKED_HOUSE }, { c: 17, r: 11, type: BLOCKED_HOUSE },
        { c: 7, r: 11, type: BLOCKED_TREE }, { c: 11, r: 11, type: BLOCKED_TREE }, { c: 14, r: 11, type: BLOCKED_TREE },
        { c: 5, r: 11, type: BLOCKED_ROCK }, { c: 13, r: 11, type: BLOCKED_ROCK },
        { c: 2, r: 12, type: BLOCKED_HOUSE }, { c: 8, r: 12, type: BLOCKED_TREE }, { c: 12, r: 12, type: BLOCKED_TREE }, { c: 16, r: 12, type: BLOCKED_ROCK },
        { c: 3, r: 13, type: BLOCKED_HOUSE }, { c: 9, r: 13, type: BLOCKED_ROCK }, { c: 13, r: 13, type: BLOCKED_ROCK },
        { c: 7, r: 13, type: BLOCKED_TREE }, { c: 11, r: 13, type: BLOCKED_TREE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();
        const pathRows = [1, 4, 7, 10];
        function isOnPath(y) { return pathRows.includes(Math.floor(y/CELL_SIZE)); }
        // Terrain
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col*CELL_SIZE, y = row*CELL_SIZE, type = GRID_DATA[row][col], cx = x+CELL_SIZE/2, cy = y+CELL_SIZE/2;
                if (type === CELL_PATH) {
                    SpriteAtlas.drawTile(ctx, 'cobble', row+col, x, y);
                } else if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'fort_grass', row+col, x, y);
                    const dt = DECO_MAP[row+','+col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, dt, row*100+col, cx, cy+2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'fort_grass', row+col, x, y);
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
        // Birds
        [{x:120,y:100},{x:450,y:140},{x:700,y:102},{x:180,y:225},{x:720,y:228},{x:500,y:250},{x:200,y:345},{x:700,y:348},{x:350,y:372},{x:120,y:465},{x:680,y:468},{x:400,y:495}].forEach(bp=>{if(!isOnPath(bp.y))drawBird(ctx,bp.x,bp.y,14,Math.floor(bp.x+bp.y));});
        // Rabbits
        [{x:80,y:115},{x:350,y:145},{x:120,y:250},{x:550,y:245},{x:180,y:365},{x:400,y:355}].forEach(rp=>{if(!isOnPath(rp.y))drawRabbit(ctx,rp.x,rp.y,12,Math.floor(rp.x+rp.y));});
        // Deer
        [{x:220,y:130},{x:260,y:360}].forEach(dp=>{if(!isOnPath(dp.y))drawDeer(ctx,dp.x,dp.y,18,Math.floor(dp.x+dp.y));});
        const sc = PATH_CELLS[0]; drawGate(ctx, sc.c*CELL_SIZE+CELL_SIZE/2, sc.r*CELL_SIZE+CELL_SIZE/2+4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length-1]; drawCastle(ctx, bc.c*CELL_SIZE+CELL_SIZE/2, bc.r*CELL_SIZE+CELL_SIZE/2-2, 20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();}
    }
};
