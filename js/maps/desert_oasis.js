// Map: Desert Oasis — golden sand, oasis pool, palm trees, camels
MAP_DEFS.desert_oasis = {
    id: 'desert_oasis', name: 'Desert Oasis', unlockRequirement: 'fortress_siege',
    description: 'A scorching desert with a life-giving oasis at its heart. Camels wander the dunes.',

    pathCells: [
        { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 }, { c: 3, r: 1 }, { c: 4, r: 1 }, { c: 5, r: 1 },
        { c: 5, r: 2 }, { c: 5, r: 3 },
        { c: 6, r: 3 }, { c: 7, r: 3 }, { c: 8, r: 3 }, { c: 9, r: 3 }, { c: 10, r: 3 }, { c: 11, r: 3 }, { c: 12, r: 3 },
        { c: 12, r: 4 }, { c: 12, r: 5 }, { c: 12, r: 6 },
        { c: 11, r: 6 }, { c: 10, r: 6 }, { c: 9, r: 6 }, { c: 8, r: 6 }, { c: 7, r: 6 }, { c: 6, r: 6 },
        { c: 6, r: 7 }, { c: 6, r: 8 }, { c: 6, r: 9 },
        { c: 7, r: 9 }, { c: 8, r: 9 }, { c: 9, r: 9 }, { c: 10, r: 9 }, { c: 11, r: 9 }, { c: 12, r: 9 }, { c: 13, r: 9 },
        { c: 14, r: 9 }, { c: 15, r: 9 }, { c: 16, r: 9 },
        { c: 16, r: 10 }, { c: 16, r: 11 }, { c: 16, r: 12 }, { c: 16, r: 13 },
    ],

    decorations: [
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
        // Houses (desert huts)
        { c: 11, r: 0, type: BLOCKED_HOUSE }, { c: 17, r: 7, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();
        // Oasis pool (center-left)
        const ox = 320, oy = 280, or = 75;
        ctx.fillStyle = '#C9AD8A'; ctx.beginPath(); ctx.ellipse(ox, oy, or+10, or*0.6+6, 0, 0, Math.PI*2); ctx.fill();
        const wg = ctx.createRadialGradient(ox, oy, or*0.2, ox, oy, or);
        wg.addColorStop(0, '#1E88E5'); wg.addColorStop(0.6, '#42A5F5'); wg.addColorStop(1, '#64B5F6');
        ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(ox, oy, or, or*0.6, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        for (let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(ox,oy-3+i*5,or*0.6,or*0.25,0,0,Math.PI*2);ctx.stroke();}
        // Palm trees around oasis
        [{x:ox-60,y:oy-25},{x:ox+70,y:oy-20},{x:ox-20,y:oy-45},{x:ox+45,y:oy-40},{x:ox-50,y:oy+40}].forEach(p=>drawPalmTree(ctx,p.x,p.y,28,Math.floor(p.x+p.y)));
        // Terrain
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col*CELL_SIZE, y = row*CELL_SIZE, type = GRID_DATA[row][col], cx = x+CELL_SIZE/2, cy = y+CELL_SIZE/2;
                if (type === CELL_PATH) {
                    SpriteAtlas.drawTile(ctx, 'path', row+col, x, y);
                } else if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'sand', row+col, x, y);
                    const dt = DECO_MAP[row+','+col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, dt, row*100+col, cx, cy+2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'sand', row+col, x, y);
                    // Sand dune ripples on buildable cells
                    const r = seededRand(row*1000+col);
                    if (r > 0.7) {
                        ctx.strokeStyle = 'rgba(180,150,120,0.25)'; ctx.lineWidth = 0.6;
                        ctx.beginPath(); ctx.moveTo(x+3,cy); ctx.lineTo(x+CELL_SIZE-3,cy+seededRand(row*77+col)*3-1); ctx.stroke();
                    }
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
        // Camels
        [{x:600,y:200},{x:180,y:440}].forEach(cp=>drawCamel(ctx,cp.x,cp.y,22,Math.floor(cp.x+cp.y)));
        const sc = PATH_CELLS[0]; drawGate(ctx, sc.c*CELL_SIZE+CELL_SIZE/2, sc.r*CELL_SIZE+CELL_SIZE/2+4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length-1]; drawCastle(ctx, bc.c*CELL_SIZE+CELL_SIZE/2, bc.r*CELL_SIZE+CELL_SIZE/2-2, 20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();}
    }
};
