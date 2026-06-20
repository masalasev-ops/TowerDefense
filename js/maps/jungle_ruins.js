// Map: Jungle Ruins — dense jungle with temple ruins and winding river
MAP_DEFS.jungle_ruins = {
    id: 'jungle_ruins', name: 'Jungle Ruins', unlockRequirement: 'desert_oasis',
    description: 'Ancient temple ruins hidden deep in a tropical jungle with a winding river.',

    pathCells: [
        { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 1, r: 2 },
        { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 4, r: 2 }, { c: 5, r: 2 }, { c: 6, r: 2 }, { c: 7, r: 2 },
        { c: 7, r: 3 }, { c: 7, r: 4 },
        { c: 6, r: 4 }, { c: 5, r: 4 }, { c: 4, r: 4 }, { c: 3, r: 4 },
        { c: 3, r: 5 }, { c: 3, r: 6 },
        { c: 4, r: 6 }, { c: 5, r: 6 }, { c: 6, r: 6 }, { c: 7, r: 6 }, { c: 8, r: 6 }, { c: 9, r: 6 }, { c: 10, r: 6 },
        { c: 10, r: 7 }, { c: 10, r: 8 },
        { c: 9, r: 8 }, { c: 8, r: 8 }, { c: 7, r: 8 }, { c: 6, r: 8 }, { c: 5, r: 8 },
        { c: 5, r: 9 }, { c: 5, r: 10 },
        { c: 6, r: 10 }, { c: 7, r: 10 }, { c: 8, r: 10 }, { c: 9, r: 10 }, { c: 10, r: 10 }, { c: 11, r: 10 },
        { c: 12, r: 10 }, { c: 13, r: 10 }, { c: 14, r: 10 }, { c: 15, r: 10 },
        { c: 15, r: 11 }, { c: 15, r: 12 }, { c: 15, r: 13 },
    ],

    decorations: [
        { c: 5, r: 0, type: BLOCKED_TREE }, { c: 10, r: 0, type: BLOCKED_TREE }, { c: 15, r: 0, type: BLOCKED_TREE },
        { c: 8, r: 1, type: BLOCKED_TREE }, { c: 13, r: 1, type: BLOCKED_TREE }, { c: 17, r: 1, type: BLOCKED_TREE },
        { c: 10, r: 3, type: BLOCKED_TREE }, { c: 14, r: 3, type: BLOCKED_TREE },
        { c: 1, r: 4, type: BLOCKED_TREE }, { c: 18, r: 4, type: BLOCKED_TREE },
        { c: 7, r: 5, type: BLOCKED_TREE }, { c: 13, r: 5, type: BLOCKED_TREE },
        { c: 1, r: 7, type: BLOCKED_TREE }, { c: 14, r: 7, type: BLOCKED_TREE },
        { c: 1, r: 9, type: BLOCKED_TREE }, { c: 10, r: 9, type: BLOCKED_TREE }, { c: 18, r: 9, type: BLOCKED_TREE },
        { c: 3, r: 11, type: BLOCKED_TREE }, { c: 8, r: 11, type: BLOCKED_TREE },
        { c: 6, r: 13, type: BLOCKED_TREE }, { c: 12, r: 13, type: BLOCKED_TREE },
        // Rocks and ruins
        { c: 3, r: 0, type: BLOCKED_ROCK }, { c: 12, r: 0, type: BLOCKED_ROCK },
        { c: 4, r: 1, type: BLOCKED_ROCK }, { c: 16, r: 2, type: BLOCKED_ROCK },
        { c: 1, r: 3, type: BLOCKED_ROCK }, { c: 12, r: 3, type: BLOCKED_ROCK },
        { c: 9, r: 5, type: BLOCKED_ROCK }, { c: 15, r: 5, type: BLOCKED_ROCK },
        { c: 2, r: 6, type: BLOCKED_ROCK }, { c: 16, r: 7, type: BLOCKED_ROCK },
        { c: 13, r: 8, type: BLOCKED_ROCK }, { c: 18, r: 8, type: BLOCKED_ROCK },
        { c: 0, r: 10, type: BLOCKED_ROCK }, { c: 17, r: 12, type: BLOCKED_ROCK },
        // Houses (jungle huts)
        { c: 16, r: 0, type: BLOCKED_HOUSE }, { c: 18, r: 6, type: BLOCKED_HOUSE },
        { c: 2, r: 8, type: BLOCKED_HOUSE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();
        // Temple ruins
        [{x:500,y:70},{x:680,y:300},{x:120,y:420}].forEach(r=>drawTempleRuin(ctx,r.x,r.y,30,Math.floor(r.x+r.y)));
        // Terrain
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col*CELL_SIZE, y = row*CELL_SIZE, type = GRID_DATA[row][col], cx = x+CELL_SIZE/2, cy = y+CELL_SIZE/2;
                if (type === CELL_PATH) {
                    SpriteAtlas.drawTile(ctx, 'path', row+col, x, y);
                } else if (type === CELL_BLOCKED) {
                    SpriteAtlas.drawTile(ctx, 'jungle', row+col, x, y);
                    const dt = DECO_MAP[row+','+col] || BLOCKED_TREE;
                    SpriteAtlas.drawDeco(ctx, dt, row*100+col, cx, cy+2, 38);
                } else {
                    SpriteAtlas.drawTile(ctx, 'jungle', row+col, x, y);
                    const r = seededRand(row*1000+col);
                    if (r > 0.7) { ctx.fillStyle='rgba(20,60,15,0.2)';ctx.beginPath();ctx.ellipse(cx+seededRand(row*77+col)*6-3,cy+seededRand(row*99+col)*4-2,4,2,seededRand(row+col),0,Math.PI*2);ctx.fill(); }
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
        // River winding through
        const rv = []; for(let i=0;i<14;i++){const t=i/13;rv.push({x:80+t*260+Math.sin(t*Math.PI*2.5)*50,y:-5+t*(GAME_HEIGHT+10)});}
        const hw=11,lb=[],rb=[];for(let i=0;i<rv.length;i++){let a;i===0?a=Math.atan2(rv[i+1].y-rv[i].y,rv[i+1].x-rv[i].x):i===rv.length-1?a=Math.atan2(rv[i].y-rv[i-1].y,rv[i].x-rv[i-1].x):(a=(Math.atan2(rv[i].y-rv[i-1].y,rv[i].x-rv[i-1].x)+Math.atan2(rv[i+1].y-rv[i].y,rv[i+1].x-rv[i].x))/2);const px=-Math.sin(a)*hw,py=Math.cos(a)*hw;lb.push({x:rv[i].x+px,y:rv[i].y+py});rb.push({x:rv[i].x-px,y:rv[i].y-py});}
        ctx.fillStyle='#7B6348';ctx.beginPath();ctx.moveTo(lb[0].x-3,lb[0].y-2);for(let i=1;i<lb.length;i++)ctx.lineTo(lb[i].x-3,lb[i].y-3);const la=Math.atan2(rv[rv.length-1].y-rv[rv.length-2].y,rv[rv.length-1].x-rv[rv.length-2].x),fa=Math.atan2(rv[1].y-rv[0].y,rv[1].x-rv[0].x);ctx.arc(rv[rv.length-1].x,rv[rv.length-1].y,hw+3.5,la-Math.PI/2,la+Math.PI/2);for(let i=rb.length-1;i>=1;i--)ctx.lineTo(rb[i].x+3,rb[i].y+3);ctx.arc(rv[0].x,rv[0].y,hw+3.5,fa+Math.PI/2,fa+Math.PI*1.5);ctx.closePath();ctx.fill();
        const wg2=ctx.createLinearGradient(rv[0].x,0,rv[rv.length-1].x,GAME_HEIGHT);wg2.addColorStop(0,'#3A8ABF');wg2.addColorStop(0.3,'#4A9FD9');wg2.addColorStop(0.5,'#2E7DB3');wg2.addColorStop(0.7,'#4A9FD9');wg2.addColorStop(1,'#3A8ABF');ctx.fillStyle=wg2;ctx.beginPath();ctx.moveTo(lb[0].x,lb[0].y);for(let i=1;i<lb.length;i++)ctx.lineTo(lb[i].x,lb[i].y);ctx.arc(rv[rv.length-1].x,rv[rv.length-1].y,hw,la-Math.PI/2,la+Math.PI/2);for(let i=rb.length-1;i>=1;i--)ctx.lineTo(rb[i].x,rb[i].y);ctx.arc(rv[0].x,rv[0].y,hw,fa+Math.PI/2,fa+Math.PI*1.5);ctx.closePath();ctx.fill();
        for(let off=-hw*0.35;off<=hw*0.35;off+=hw*0.3){ctx.strokeStyle='rgba(255,255,255,'+(0.18-Math.abs(off)*0.012)+')';ctx.lineWidth=0.6;ctx.beginPath();for(let i=0;i<rv.length;i++){const a=i<rv.length-1?Math.atan2(rv[i+1].y-rv[i].y,rv[i+1].x-rv[i].x):Math.atan2(rv[i].y-rv[i-1].y,rv[i].x-rv[i-1].x);const px2=rv[i].x+(-Math.sin(a)*off),py2=rv[i].y+(Math.cos(a)*off);i===0?ctx.moveTo(px2,py2):ctx.lineTo(px2,py2);}ctx.stroke();}
        // Bridges
        for(let i=0;i<rv.length-1;i++){const mx=(rv[i].x+rv[i+1].x)/2,my=(rv[i].y+rv[i+1].y)/2,mc=Math.floor(mx/CELL_SIZE),mr=Math.floor(my/CELL_SIZE);if(mr>=0&&mr<GRID_ROWS&&mc>=0&&mc<GRID_COLS&&GRID_DATA[mr][mc]===CELL_PATH)drawBridge(ctx,mx,my,CELL_SIZE*0.8);}
        // Monkeys (simplified as small dots near trees)
        [{x:200,y:70},{x:480,y:340},{x:620,y:180}].forEach(mp=>{ctx.fillStyle='#6D4C41';ctx.beginPath();ctx.arc(mp.x,mp.y-5,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8D6E63';ctx.beginPath();ctx.arc(mp.x,mp.y-2,3,0,Math.PI*2);ctx.fill();});
        const sc = PATH_CELLS[0]; drawGate(ctx, sc.c*CELL_SIZE+CELL_SIZE/2, sc.r*CELL_SIZE+CELL_SIZE/2+4, 18);
        const bc = PATH_CELLS[PATH_CELLS.length-1]; drawCastle(ctx, bc.c*CELL_SIZE+CELL_SIZE/2, bc.r*CELL_SIZE+CELL_SIZE/2-2, 20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();}
    }
};
