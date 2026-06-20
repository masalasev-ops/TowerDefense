// Map: Coastal Cliffs — seaside path with ocean views, lighthouse, seagulls
MAP_DEFS.coastal_cliffs = {
    id: 'coastal_cliffs', name: 'Coastal Cliffs', unlockRequirement: 'volcanic_caldera',
    description: 'A cliffside path overlooking the ocean, from a harbor to a lighthouse keep.',

    pathCells: [
        { c: 0, r: 2 }, { c: 1, r: 2 }, { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 4, r: 2 },
        { c: 5, r: 2 }, { c: 6, r: 2 }, { c: 7, r: 2 }, { c: 8, r: 2 },
        { c: 8, r: 3 }, { c: 8, r: 4 },
        { c: 9, r: 4 }, { c: 10, r: 4 }, { c: 11, r: 4 }, { c: 12, r: 4 }, { c: 13, r: 4 },
        { c: 13, r: 5 }, { c: 13, r: 6 },
        { c: 12, r: 6 }, { c: 11, r: 6 }, { c: 10, r: 6 }, { c: 9, r: 6 }, { c: 8, r: 6 },
        { c: 7, r: 6 }, { c: 6, r: 6 },
        { c: 6, r: 7 }, { c: 6, r: 8 },
        { c: 7, r: 8 }, { c: 8, r: 8 }, { c: 9, r: 8 }, { c: 10, r: 8 }, { c: 11, r: 8 },
        { c: 12, r: 8 }, { c: 13, r: 8 }, { c: 14, r: 8 }, { c: 15, r: 8 },
        { c: 15, r: 9 }, { c: 15, r: 10 },
        { c: 14, r: 10 }, { c: 13, r: 10 }, { c: 12, r: 10 }, { c: 11, r: 10 },
        { c: 11, r: 11 }, { c: 11, r: 12 }, { c: 11, r: 13 },
    ],

    decorations: [
        { c: 10, r: 0, type: BLOCKED_TREE }, { c: 14, r: 0, type: BLOCKED_TREE },
        { c: 1, r: 1, type: BLOCKED_TREE }, { c: 4, r: 1, type: BLOCKED_TREE },
        { c: 12, r: 1, type: BLOCKED_ROCK }, { c: 17, r: 1, type: BLOCKED_ROCK },
        { c: 15, r: 2, type: BLOCKED_TREE }, { c: 11, r: 3, type: BLOCKED_TREE },
        { c: 0, r: 4, type: BLOCKED_ROCK }, { c: 16, r: 4, type: BLOCKED_ROCK },
        { c: 2, r: 5, type: BLOCKED_TREE }, { c: 17, r: 5, type: BLOCKED_TREE },
        { c: 4, r: 7, type: BLOCKED_ROCK }, { c: 18, r: 7, type: BLOCKED_ROCK },
        { c: 1, r: 8, type: BLOCKED_TREE }, { c: 4, r: 8, type: BLOCKED_TREE },
        { c: 18, r: 9, type: BLOCKED_TREE },
        { c: 2, r: 10, type: BLOCKED_ROCK }, { c: 8, r: 10, type: BLOCKED_ROCK },
        { c: 5, r: 11, type: BLOCKED_TREE }, { c: 14, r: 11, type: BLOCKED_TREE },
        { c: 1, r: 12, type: BLOCKED_ROCK }, { c: 7, r: 12, type: BLOCKED_ROCK },
        { c: 3, r: 13, type: BLOCKED_TREE }, { c: 15, r: 13, type: BLOCKED_ROCK },
        // Houses (coastal cottages)
        { c: 16, r: 0, type: BLOCKED_HOUSE }, { c: 3, r: 3, type: BLOCKED_HOUSE },
        { c: 2, r: 7, type: BLOCKED_HOUSE }, { c: 17, r: 11, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();
        // Ocean on the right side
        const oceanGrad = ctx.createLinearGradient(GAME_WIDTH*0.55, 0, GAME_WIDTH, 0);
        oceanGrad.addColorStop(0, '#5C9CD4'); oceanGrad.addColorStop(0.3, '#3A7CC3');
        oceanGrad.addColorStop(0.6, '#2979B6'); oceanGrad.addColorStop(1, '#1565C0');
        ctx.fillStyle = oceanGrad; ctx.fillRect(GAME_WIDTH*0.55, 0, GAME_WIDTH*0.45, GAME_HEIGHT);
        // Waves
        const now = Date.now()/1000;
        for (let row=0;row<GAME_HEIGHT;row+=12){
            ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;
            ctx.beginPath();
            for(let lx=GAME_WIDTH*0.55;lx<GAME_WIDTH;lx+=4){
                const wy=row+Math.sin(lx*0.08+now*2+row*0.3)*3;
                lx===GAME_WIDTH*0.55?ctx.moveTo(lx,wy):ctx.lineTo(lx,wy);
            }
            ctx.stroke();
        }
        // Beach strip at the edge
        for (let row=0;row<GRID_ROWS;row++){
            const bx=GAME_WIDTH*0.55;
            const by=row*CELL_SIZE;
            ctx.fillStyle='#E8D5A0';ctx.fillRect(bx,by,CELL_SIZE*0.4,CELL_SIZE);
        }
        // Lighthouse on the cliff
        drawLighthouse(ctx, GAME_WIDTH*0.68, GAME_HEIGHT*0.65, 32);
        // Small boats on ocean
        [{x:640,y:100},{x:700,y:280},{x:620,y:420}].forEach(bt=>{
            ctx.fillStyle='#8D6E63';ctx.beginPath();ctx.ellipse(bt.x,bt.y,8,3,-0.1,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#ECEFF1';ctx.beginPath();ctx.moveTo(bt.x-2,bt.y-3);ctx.lineTo(bt.x-2,bt.y+3);ctx.lineTo(bt.x+6,bt.y);ctx.closePath();ctx.fill();
        });
        // Terrain
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col*CELL_SIZE, y = row*CELL_SIZE, type = GRID_DATA[row][col], cx = x+CELL_SIZE/2, cy = y+CELL_SIZE/2;
                const isBeach = x+CELL_SIZE > GAME_WIDTH*0.55;
                if (type === CELL_PATH) {
                    SpriteAtlas.drawTile(ctx, 'path', row+col, x, y);
                } else if (isBeach) {
                    SpriteAtlas.drawTile(ctx, 'sand_beach', row+col, x, y);
                } else if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'coastal', row+col, x, y);
                    const dt = DECO_MAP[row+','+col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, dt, row*100+col, cx, cy+2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'coastal', row+col, x, y);
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
        // Seagulls
        for(let i=0;i<6;i++){
            const sx=GAME_WIDTH*0.6+seededRand(i*13)*GAME_WIDTH*0.35;
            const sy=30+seededRand(i*17)*GAME_HEIGHT*0.5;
            drawBird(ctx,sx,sy,12,i*7);
        }
        const sc = PATH_CELLS[0]; drawGate(ctx, sc.c*CELL_SIZE+CELL_SIZE/2, sc.r*CELL_SIZE+CELL_SIZE/2+4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length-1]; drawCastle(ctx, bc.c*CELL_SIZE+CELL_SIZE/2, bc.r*CELL_SIZE+CELL_SIZE/2-2, 20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();}
    }
};
