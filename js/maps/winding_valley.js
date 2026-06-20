// Map: Winding Valley — long zig-zag with rolling hills and mountain silhouettes
MAP_DEFS.winding_valley = {
    id: 'winding_valley', name: 'Winding Valley', unlockRequirement: 'crossroads',
    description: 'A long winding valley path with rolling hills — plenty of time to build your defenses.',

    pathCells: [
        { c: 19, r: 2 }, { c: 18, r: 2 }, { c: 17, r: 2 }, { c: 16, r: 2 },
        { c: 16, r: 3 }, { c: 16, r: 4 }, { c: 16, r: 5 },
        { c: 15, r: 5 }, { c: 14, r: 5 }, { c: 13, r: 5 }, { c: 12, r: 5 },
        { c: 12, r: 6 }, { c: 12, r: 7 },
        { c: 13, r: 7 }, { c: 14, r: 7 }, { c: 15, r: 7 },
        { c: 15, r: 8 }, { c: 15, r: 9 },
        { c: 14, r: 9 }, { c: 13, r: 9 }, { c: 12, r: 9 }, { c: 11, r: 9 }, { c: 10, r: 9 }, { c: 9, r: 9 }, { c: 8, r: 9 }, { c: 7, r: 9 },
        { c: 7, r: 10 }, { c: 7, r: 11 }, { c: 7, r: 12 },
        { c: 8, r: 12 }, { c: 9, r: 12 }, { c: 10, r: 12 }, { c: 11, r: 12 }, { c: 12, r: 12 }, { c: 13, r: 12 },
        { c: 13, r: 13 },
    ],

    decorations: [
        { c: 14, r: 0, type: BLOCKED_TREE }, { c: 7, r: 0, type: BLOCKED_TREE },
        { c: 9, r: 1, type: BLOCKED_TREE }, { c: 16, r: 1, type: BLOCKED_TREE },
        { c: 18, r: 0, type: BLOCKED_ROCK }, { c: 6, r: 1, type: BLOCKED_ROCK },
        { c: 11, r: 2, type: BLOCKED_TREE }, { c: 7, r: 2, type: BLOCKED_TREE },
        { c: 19, r: 3, type: BLOCKED_ROCK }, { c: 8, r: 3, type: BLOCKED_ROCK },
        { c: 9, r: 3, type: BLOCKED_TREE }, { c: 5, r: 3, type: BLOCKED_TREE },
        { c: 18, r: 4, type: BLOCKED_TREE }, { c: 17, r: 4, type: BLOCKED_TREE }, { c: 9, r: 4, type: BLOCKED_TREE },
        { c: 10, r: 4, type: BLOCKED_ROCK }, { c: 6, r: 4, type: BLOCKED_ROCK },
        { c: 19, r: 6, type: BLOCKED_TREE }, { c: 8, r: 6, type: BLOCKED_TREE }, { c: 5, r: 6, type: BLOCKED_TREE },
        { c: 17, r: 6, type: BLOCKED_ROCK }, { c: 10, r: 6, type: BLOCKED_ROCK },
        { c: 10, r: 7, type: BLOCKED_HOUSE }, { c: 17, r: 7, type: BLOCKED_HOUSE },
        { c: 6, r: 7, type: BLOCKED_TREE }, { c: 15, r: 7, type: BLOCKED_TREE }, { c: 18, r: 8, type: BLOCKED_TREE },
        { c: 7, r: 8, type: BLOCKED_HOUSE },
        { c: 17, r: 8, type: BLOCKED_ROCK }, { c: 11, r: 8, type: BLOCKED_ROCK },
        { c: 5, r: 10, type: BLOCKED_TREE }, { c: 15, r: 10, type: BLOCKED_TREE },
        { c: 15, r: 10, type: BLOCKED_ROCK }, { c: 8, r: 10, type: BLOCKED_ROCK },
        { c: 17, r: 10, type: BLOCKED_TREE },
        { c: 19, r: 11, type: BLOCKED_TREE }, { c: 5, r: 11, type: BLOCKED_TREE },
        { c: 16, r: 12, type: BLOCKED_HOUSE },
        { c: 18, r: 12, type: BLOCKED_ROCK }, { c: 16, r: 12, type: BLOCKED_ROCK }, { c: 10, r: 12, type: BLOCKED_ROCK },
        { c: 9, r: 13, type: BLOCKED_TREE }, { c: 5, r: 13, type: BLOCKED_TREE },
        { c: 19, r: 13, type: BLOCKED_ROCK }, { c: 5, r: 13, type: BLOCKED_ROCK },
        { c: 15, r: 0, type: BLOCKED_HOUSE }, { c: 14, r: 13, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();
        // Mountain silhouettes
        [{x:10,w:180,h:120,s:50},{x:70,w:150,h:100,s:80},{x:140,w:170,h:135,s:110},{x:10,w:140,h:85,s:140}].forEach(m=>drawMountain(ctx,m.x+m.w/2,0,m.w,m.h,m.s));
        [{x:GAME_WIDTH-100,w:130,h:90,s:200},{x:GAME_WIDTH-40,w:110,h:70,s:220}].forEach(m=>drawMountain(ctx,m.x+m.w/2,0,m.w,m.h,m.s));
        // Terrain
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col*CELL_SIZE, y = row*CELL_SIZE, type = GRID_DATA[row][col], cx = x+CELL_SIZE/2, cy = y+CELL_SIZE/2;
                if (type === CELL_PATH) {
                    SpriteAtlas.drawTile(ctx, 'path', row+col, x, y);
                } else {
                    SpriteAtlas.drawTile(ctx, 'grass', row+col, x, y);
                    const distFromCenter = Math.abs(col-10)/10;
                    const heightFactor = Math.sin(row*0.5+col*0.3)*0.3+distFromCenter*0.7;
                    if (heightFactor > 0.5) { ctx.fillStyle = 'rgba(0,0,0,'+(heightFactor*0.2)+')'; ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE); }
                    if (type === CELL_BLOCKED) {
                        const decoType = DECO_MAP[row+','+col] || BLOCKED_TREE;
                        SpriteAtlas.drawDeco(ctx, decoType, row*100+col, cx, cy+2, 38);
                    }
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
        // Ridge lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(30,GAME_HEIGHT*0.3,10,GAME_HEIGHT*0.6); ctx.quadraticCurveTo(-5,GAME_HEIGHT*0.8,15,GAME_HEIGHT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(GAME_WIDTH,0); ctx.quadraticCurveTo(GAME_WIDTH-40,GAME_HEIGHT*0.4,GAME_WIDTH-10,GAME_HEIGHT*0.55); ctx.quadraticCurveTo(GAME_WIDTH+5,GAME_HEIGHT*0.8,GAME_WIDTH-15,GAME_HEIGHT); ctx.stroke();
        const sc = PATH_CELLS[0]; drawGate(ctx, sc.c*CELL_SIZE+CELL_SIZE/2, sc.r*CELL_SIZE+CELL_SIZE/2+4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length-1]; drawCastle(ctx, bc.c*CELL_SIZE+CELL_SIZE/2, bc.r*CELL_SIZE+CELL_SIZE/2-2, 20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.08)';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();}
    }
};
