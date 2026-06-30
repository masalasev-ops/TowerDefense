// ========================================================
// Map: Crossroads — winding path through a village with creek
// ========================================================
MAP_DEFS.crossroads = {
    id: 'crossroads',
    name: 'Crossroads', unlockRequirement: null,
    description: 'A winding path through a peaceful village with a flowing creek.',

    pathCells: [
        { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 },
        { c: 2, r: 2 }, { c: 2, r: 3 },
        { c: 3, r: 3 }, { c: 4, r: 3 }, { c: 5, r: 3 }, { c: 6, r: 3 },
        { c: 6, r: 4 }, { c: 6, r: 5 },
        { c: 7, r: 5 }, { c: 8, r: 5 }, { c: 9, r: 5 }, { c: 10, r: 5 },
        { c: 10, r: 6 }, { c: 10, r: 7 },
        { c: 11, r: 7 }, { c: 12, r: 7 }, { c: 13, r: 7 }, { c: 14, r: 7 },
        { c: 15, r: 7 }, { c: 16, r: 7 }, { c: 17, r: 7 },
        { c: 17, r: 8 }, { c: 17, r: 9 }, { c: 17, r: 10 }, { c: 17, r: 11 },
        { c: 16, r: 11 }, { c: 15, r: 11 }, { c: 14, r: 11 }, { c: 13, r: 11 },
        { c: 12, r: 11 }, { c: 11, r: 11 }, { c: 10, r: 11 }, { c: 9, r: 11 },
        { c: 8, r: 11 }, { c: 7, r: 11 }, { c: 6, r: 11 }, { c: 5, r: 11 },
        { c: 4, r: 11 }, { c: 3, r: 11 }, { c: 2, r: 11 },
        { c: 2, r: 12 }, { c: 2, r: 13 },
    ],

    decorations: [
        { c: 7, r: 0, type: BLOCKED_HOUSE }, { c: 17, r: 4, type: BLOCKED_HOUSE },
        { c: 4, r: 7, type: BLOCKED_HOUSE }, { c: 8, r: 12, type: BLOCKED_HOUSE },
        { c: 16, r: 13, type: BLOCKED_HOUSE }, { c: 13, r: 9, type: BLOCKED_HOUSE },
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

    getCreekCells: function() {
        const cells = new Set();
        for (let r = 0; r <= 12; r++) cells.add(r + ',14');
        for (let c = 4; c <= 14; c++) cells.add('12,' + c);
        return cells;
    },

    getBridgeCells: function(pathCells, creekCells) {
        const bridges = [];
        for (const pc of pathCells) {
            if (creekCells.has(pc.r + ',' + pc.c)) bridges.push({ c: pc.c, r: pc.r });
        }
        return bridges;
    },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined' && !SpriteAtlas.has('grass')) SpriteAtlas.init();
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE, y = row * CELL_SIZE;
                const type = GRID_DATA[row][col];
                const cx = x + CELL_SIZE/2, cy = y + CELL_SIZE/2;
                if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'grass_3d', row + col, x, y);
                    const decoType = DECO_MAP[row+','+col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, decoType, row*100+col, cx, cy+2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'grass_3d', row + col, x, y);
                }
            }
        }
        renderSmoothPath(ctx, 'dirt', 13);
        // Creek
        const cx = 14*CELL_SIZE+CELL_SIZE*0.1, cw = CELL_SIZE*0.8, cyc = 12*CELL_SIZE+CELL_SIZE*0.1, ch = CELL_SIZE*0.8, leftX = 4*CELL_SIZE;
        ctx.fillStyle = '#8D6E63'; ctx.beginPath();
        ctx.moveTo(cx,0); ctx.lineTo(cx+cw,0); ctx.lineTo(cx+cw,cyc+ch); ctx.lineTo(leftX,cyc+ch); ctx.lineTo(leftX,cyc); ctx.lineTo(cx,cyc); ctx.closePath(); ctx.fill();
        const grad = ctx.createLinearGradient(cx,0,leftX,cyc+ch);
        grad.addColorStop(0,'#42A5F5'); grad.addColorStop(0.3,'#64B5F6'); grad.addColorStop(0.5,'#1E88E5'); grad.addColorStop(0.7,'#64B5F6'); grad.addColorStop(1,'#42A5F5');
        ctx.fillStyle = grad; ctx.beginPath();
        ctx.moveTo(cx+2,3); ctx.lineTo(cx+cw-2,3); ctx.lineTo(cx+cw-2,cyc+ch-3); ctx.lineTo(leftX+3,cyc+ch-3); ctx.lineTo(leftX+3,cyc+3); ctx.lineTo(cx+2,cyc+3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        for(let i=0;i<2;i++){const sx=cx+6+i*(cw-12);ctx.beginPath();ctx.moveTo(sx,4);for(let sy=4;sy<cyc;sy+=4)ctx.lineTo(sx+Math.sin(sy*0.3)*3,sy);ctx.stroke();}
        for(let i=0;i<2;i++){const sy=cyc+6+i*(ch-12);ctx.beginPath();ctx.moveTo(cx+4,sy);for(let sx=cx+4;sx>leftX+4;sx-=4)ctx.lineTo(sx,sy+Math.sin(sx*0.2)*3);ctx.stroke();}
        ctx.fillStyle = '#BDBDBD';
        [{x:cx+cw/2,y:cyc*0.3},{x:cx+cw/2,y:cyc*0.6},{x:cx-cw*0.3,y:cyc+ch/2},{x:cx-cw*2,y:cyc+ch/2},{x:cx-cw*5,y:cyc+ch/2},{x:cx-cw*8,y:cyc+ch/2}].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();});
        for(const bc of BRIDGE_CELLS){const bx=bc.c*CELL_SIZE+CELL_SIZE/2,by=bc.r*CELL_SIZE+CELL_SIZE/2;drawBridge(ctx,bx,by,CELL_SIZE*0.9);}
        const sc=PATH_CELLS[0];drawGate(ctx,sc.c*CELL_SIZE+CELL_SIZE/2,sc.r*CELL_SIZE+CELL_SIZE/2+4,18);
        const bc2=PATH_CELLS[PATH_CELLS.length-1];drawCastle(ctx,bc2.c*CELL_SIZE+CELL_SIZE/2,bc2.r*CELL_SIZE+CELL_SIZE/2-2,20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){
            const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);
            ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.08)';
            ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();
        }
    }
};
