// Map: Frozen Pass — icy mountain pass with snow-capped peaks
MAP_DEFS.frozen_pass = {
    id: 'frozen_pass', name: 'Frozen Pass', unlockRequirement: 'winding_valley',
    description: 'An icy mountain pass where the cold bites deep. Snow slows all movement.',

    pathCells: [
        { c: 19, r: 1 }, { c: 18, r: 1 }, { c: 17, r: 1 }, { c: 16, r: 1 }, { c: 15, r: 1 },
        { c: 15, r: 2 }, { c: 15, r: 3 }, { c: 15, r: 4 },
        { c: 14, r: 4 }, { c: 13, r: 4 }, { c: 12, r: 4 }, { c: 11, r: 4 }, { c: 10, r: 4 }, { c: 9, r: 4 },
        { c: 9, r: 5 }, { c: 9, r: 6 }, { c: 9, r: 7 },
        { c: 10, r: 7 }, { c: 11, r: 7 }, { c: 12, r: 7 }, { c: 13, r: 7 }, { c: 14, r: 7 },
        { c: 14, r: 8 }, { c: 14, r: 9 }, { c: 14, r: 10 },
        { c: 13, r: 10 }, { c: 12, r: 10 }, { c: 11, r: 10 }, { c: 10, r: 10 }, { c: 9, r: 10 }, { c: 8, r: 10 }, { c: 7, r: 10 }, { c: 6, r: 10 },
        { c: 6, r: 11 }, { c: 6, r: 12 }, { c: 6, r: 13 },
    ],

    decorations: [
        { c: 11, r: 0, type: BLOCKED_ROCK }, { c: 4, r: 0, type: BLOCKED_ROCK },
        { c: 18, r: 0, type: BLOCKED_ROCK }, { c: 1, r: 1, type: BLOCKED_ROCK },
        { c: 13, r: 2, type: BLOCKED_ROCK }, { c: 3, r: 2, type: BLOCKED_ROCK },
        { c: 7, r: 2, type: BLOCKED_ROCK },
        { c: 19, r: 3, type: BLOCKED_ROCK }, { c: 5, r: 3, type: BLOCKED_ROCK },
        { c: 17, r: 5, type: BLOCKED_ROCK }, { c: 1, r: 5, type: BLOCKED_ROCK },
        { c: 19, r: 6, type: BLOCKED_ROCK }, { c: 4, r: 6, type: BLOCKED_ROCK },
        { c: 16, r: 8, type: BLOCKED_ROCK }, { c: 2, r: 8, type: BLOCKED_ROCK },
        { c: 18, r: 9, type: BLOCKED_ROCK }, { c: 0, r: 9, type: BLOCKED_ROCK },
        { c: 19, r: 11, type: BLOCKED_ROCK }, { c: 3, r: 11, type: BLOCKED_ROCK },
        { c: 15, r: 12, type: BLOCKED_ROCK }, { c: 3, r: 12, type: BLOCKED_ROCK },
        { c: 8, r: 0, type: BLOCKED_TREE }, { c: 13, r: 1, type: BLOCKED_TREE },
        { c: 5, r: 1, type: BLOCKED_TREE }, { c: 1, r: 3, type: BLOCKED_TREE },
        { c: 18, r: 4, type: BLOCKED_TREE }, { c: 6, r: 5, type: BLOCKED_TREE },
        { c: 16, r: 6, type: BLOCKED_TREE }, { c: 2, r: 7, type: BLOCKED_TREE },
        { c: 11, r: 8, type: BLOCKED_TREE }, { c: 3, r: 9, type: BLOCKED_TREE },
        { c: 17, r: 11, type: BLOCKED_TREE }, { c: 9, r: 13, type: BLOCKED_TREE },
        { c: 0, r: 13, type: BLOCKED_TREE }, { c: 14, r: 0, type: BLOCKED_TREE },
        { c: 2, r: 4, type: BLOCKED_TREE },
    ],

    getCreekCells: function() { return new Set(); },
    getBridgeCells: function() { return []; },

    renderMap: function(ctx) {
        if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.init();
        // Mountains
        [{x:40,w:160,h:110,s:100},{x:180,w:200,h:140,s:200},{x:380,w:170,h:125,s:300},{x:540,w:190,h:150,s:400},{x:700,w:140,h:105,s:500}].forEach(m=>drawMountain(ctx,m.x,0,m.w,m.h,m.s));
        // Frozen lake
        const lx=180,ly=420;
        ctx.fillStyle='rgba(150,200,230,0.15)';ctx.beginPath();ctx.ellipse(lx,ly,160,55,-0.2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#c8ddf0';ctx.beginPath();ctx.ellipse(lx,ly,140,48,-0.2,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=1;
        for(let i=0;i<5;i++){const bx=lx-80+i*40,by=ly-15+Math.sin(i*1.8)*20;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+seededRand(i*30)*30,by+seededRand(i*40+1)*15-8);ctx.stroke();}
        // Terrain
        for(let row=0;row<GRID_ROWS;row++){for(let col=0;col<GRID_COLS;col++){
            const x=col*CELL_SIZE,y=row*CELL_SIZE,type=GRID_DATA[row][col],cx=x+CELL_SIZE/2,cy=y+CELL_SIZE/2;
            if(type===CELL_BLOCKED){SpriteAtlas.drawTile(ctx,'snow_3d',row+col,x,y);const dt=DECO_MAP[row+','+col]||BLOCKED_TREE;SpriteAtlas.drawDeco(ctx,dt,row*100+col,cx,cy+2,38);}
            else{SpriteAtlas.drawTile(ctx,'snow_3d',row+col,x,y);const r=seededRand(row*1000+col);if(r>0.6)drawSnowdrift(ctx,cx,cy+4,CELL_SIZE*0.85,CELL_SIZE*0.45);if(r>0.85)drawIceCrystal(ctx,cx+seededRand(row*99+col)*10-5,cy+seededRand(row*77+col)*8-4,10,row*100+col);}
        }}
        // Smooth rounded path ribbon
        renderSmoothPath(ctx, 'ice', 12);
        const sc=PATH_CELLS[0];drawGate(ctx,sc.c*CELL_SIZE+CELL_SIZE/2,sc.r*CELL_SIZE+CELL_SIZE/2+4,18);
        const bc=PATH_CELLS[PATH_CELLS.length-1];drawCastle(ctx,bc.c*CELL_SIZE+CELL_SIZE/2,bc.r*CELL_SIZE+CELL_SIZE/2-2,20);
    },

    renderPathArrows: function(ctx) {
        for(let i=0;i<WAYPOINTS.length-1;i++){const f=WAYPOINTS[i],t=WAYPOINTS[i+1],mx=(f.x+t.x)/2,my=(f.y+t.y)/2,a=Math.atan2(t.y-f.y,t.x-f.x);ctx.save();ctx.translate(mx,my);ctx.rotate(a);ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-3,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();ctx.restore();}
    }
};
