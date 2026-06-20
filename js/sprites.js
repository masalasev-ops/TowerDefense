// ============================================================
// Sprite Atlas — Pre-rendered sprites for all game elements
// ============================================================

const SPRITE_SIZE = 40; // Must match CELL_SIZE

const SpriteAtlas = (function() {
    'use strict';

    // Storage: spriteBank[category][key] = { canvas, variants: [canvas, ...] }
    const spriteBank = {};
    let initialized = false;

    // ---- Internal helpers ----

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w || SPRITE_SIZE;
        c.height = h || SPRITE_SIZE;
        return c;
    }

    function seeded(seed) {
        const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    // Draw a more detailed tree to a canvas
    function renderTreeSprite(seed) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const cx = SPRITE_SIZE / 2, cy = SPRITE_SIZE / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + 13, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk with bark texture
        const trunkGrad = ctx.createLinearGradient(cx - 3, 0, cx + 3, 0);
        trunkGrad.addColorStop(0, '#5D4037');
        trunkGrad.addColorStop(0.3, '#795548');
        trunkGrad.addColorStop(0.7, '#6D4C41');
        trunkGrad.addColorStop(1, '#4E342E');
        ctx.fillStyle = trunkGrad;
        ctx.fillRect(cx - 3, cy - 4, 6, 12);
        // Bark lines
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 0.5;
        for (let ly = cy - 2; ly < cy + 8; ly += 3) {
            ctx.beginPath();
            ctx.moveTo(cx - 2, ly);
            ctx.lineTo(cx + 2, ly + seeded(seed + ly) * 1.5);
            ctx.stroke();
        }

        // Canopy layers with gradient
        const canopyColors = [
            { fill: '#1B5E20', highlight: '#2E7D32' },
            { fill: '#2E7D32', highlight: '#388E3C' },
            { fill: '#388E3C', highlight: '#43A047' },
            { fill: '#43A047', highlight: '#4CAF50' },
        ];
        for (let layer = 0; layer < 4; layer++) {
            const ly = cy - 10 - layer * 4;
            const lr = 12 - layer * 1.8;
            const lx = cx + (seeded(seed + layer * 13) - 0.5) * 4;

            const grad = ctx.createRadialGradient(lx - 2, ly - 2, lr * 0.2, lx, ly, lr);
            grad.addColorStop(0, canopyColors[layer].highlight);
            grad.addColorStop(1, canopyColors[layer].fill);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(lx, ly, lr, 0, Math.PI * 2);
            ctx.fill();

            // Dappled highlight
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.arc(lx - lr * 0.3, ly - lr * 0.3, lr * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        return c;
    }

    // Rock sprite
    function renderRockSprite(seed) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const cx = SPRITE_SIZE / 2, cy = SPRITE_SIZE / 2 + 4;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + 10, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body with gradient
        const grad = ctx.createLinearGradient(cx - 8, cy - 6, cx + 8, cy + 6);
        grad.addColorStop(0, '#BDBDBD');
        grad.addColorStop(0.4, '#9E9E9E');
        grad.addColorStop(0.7, '#757575');
        grad.addColorStop(1, '#616161');
        ctx.fillStyle = grad;
        ctx.beginPath();
        const numPoints = 8;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
            const radius = 10 * (0.7 + seeded(seed + i * 5) * 0.6);
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight facet
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Crack
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + 2);
        ctx.lineTo(cx + 2, cy - 3);
        ctx.lineTo(cx + 4, cy - 6);
        ctx.stroke();

        return c;
    }

    // House sprite
    function renderHouseSprite() {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const cx = SPRITE_SIZE / 2, cy = SPRITE_SIZE / 2 + 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + 12, 13, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Walls with wood texture
        const wallGrad = ctx.createLinearGradient(0, cy - 4, 0, cy + 10);
        wallGrad.addColorStop(0, '#EFEBE0');
        wallGrad.addColorStop(0.5, '#E8D5B7');
        wallGrad.addColorStop(1, '#D7C4A1');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(cx - 10, cy - 2, 20, 14);

        // Timber framing
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 10, cy - 2, 20, 14);
        ctx.beginPath(); ctx.moveTo(cx - 10, cy + 4); ctx.lineTo(cx + 10, cy + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.lineTo(cx, cy + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 5, cy - 2); ctx.lineTo(cx - 5, cy + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 5, cy - 2); ctx.lineTo(cx + 5, cy + 4); ctx.stroke();

        // Roof
        const roofGrad = ctx.createLinearGradient(cx, cy - 16, cx, cy - 2);
        roofGrad.addColorStop(0, '#C62828');
        roofGrad.addColorStop(1, '#8E0000');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy - 2);
        ctx.lineTo(cx, cy - 16);
        ctx.lineTo(cx + 13, cy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5D0000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Roof tiles
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.6;
        for (let r = 0; r < 4; r++) {
            const ry = cy - 14 + r * 3.5;
            ctx.beginPath();
            ctx.moveTo(cx - 11 + r * 2.5, ry);
            ctx.lineTo(cx + 11 - r * 2.5, ry);
            ctx.stroke();
        }

        // Door
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(cx - 3, cy + 1, 6, 11);
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 7, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Window
        const winGrad = ctx.createRadialGradient(cx + 5, cy - 1, 1, cx + 5, cy - 1, 5);
        winGrad.addColorStop(0, '#FFF9C4');
        winGrad.addColorStop(1, '#81D4FA');
        ctx.fillStyle = winGrad;
        ctx.fillRect(cx + 3, cy - 2, 5, 5);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx + 3, cy - 2, 5, 5);
        ctx.beginPath(); ctx.moveTo(cx + 5.5, cy - 2); ctx.lineTo(cx + 5.5, cy + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 3, cy + 0.5); ctx.lineTo(cx + 8, cy + 0.5); ctx.stroke();

        // Chimney
        ctx.fillStyle = '#757575';
        ctx.fillRect(cx + 5, cy - 14, 4, 8);

        return c;
    }

    // Grass tile variants (for buildable cells)
    function renderGrassTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        // Base grass with subtle gradient
        const baseColors = [
            ['#6a9e4a', '#5d8a3e'], // light variant
            ['#5d8a3e', '#4f7d35'], // medium variant
            ['#527a36', '#456b2c'], // dark variant
            ['#609145', '#53803a'], // green variant
        ];
        const colors = baseColors[variant % baseColors.length];
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Grass blades
        ctx.strokeStyle = 'rgba(30,80,20,0.2)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 6; i++) {
            const gx = 4 + seeded(variant * 100 + i * 17) * (w - 8);
            const gy = h - 4;
            const gh = 4 + seeded(variant * 100 + i * 31) * 6;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + seeded(variant + i) * 4 - 2, gy - gh * 0.6, gx + 1, gy - gh);
            ctx.stroke();
        }

        // Small clover/flower dots
        for (let i = 0; i < 2; i++) {
            if (seeded(variant * 77 + i * 13) > 0.7) {
                const dx = 6 + seeded(variant * 43 + i) * (w - 12);
                const dy = 6 + seeded(variant * 67 + i) * (h - 12);
                ctx.fillStyle = seeded(variant * 91 + i) > 0.5 ? '#FFF176' : '#FFCC80';
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        return c;
    }

    // Path/dirt tile
    function renderPathTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        const pathColors = [
            ['#C4A46C', '#B8956A'],
            ['#B8956A', '#A8855A'],
            ['#D4B87C', '#C4A46C'],
            ['#BFA070', '#AD8C5E'],
        ];
        const colors = pathColors[variant % pathColors.length];
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = colors[1];
        ctx.fillRect(2, 2, w - 4, h - 4);

        // Rut marks
        ctx.strokeStyle = 'rgba(100,65,30,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, h * 0.33);
        ctx.quadraticCurveTo(w / 2, h * 0.35, w - 4, h * 0.33);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, h * 0.67);
        ctx.quadraticCurveTo(w / 2, h * 0.65, w - 4, h * 0.67);
        ctx.stroke();

        // Small pebbles
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let i = 0; i < 2; i++) {
            if (seeded(variant * 53 + i * 19) > 0.6) {
                const px = 6 + seeded(variant * 37 + i) * (w - 12);
                const py = 6 + seeded(variant * 71 + i) * (h - 12);
                ctx.beginPath();
                ctx.arc(px, py, seeded(variant * 23 + i) * 1.5 + 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        return c;
    }

    // Snow terrain tile (for Frozen Pass)
    function renderSnowTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        const snowColors = [
            ['#e8eef3', '#dce4eb'],
            ['#dce4eb', '#cfd8e0'],
            ['#f0f4f8', '#e2e8f0'],
            ['#d5dde5', '#c8d0d8'],
        ];
        const colors = snowColors[variant % snowColors.length];
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Snow texture speckles
        for (let i = 0; i < 5; i++) {
            const sx = 3 + seeded(variant * 47 + i * 11) * (w - 6);
            const sy = 3 + seeded(variant * 59 + i * 23) * (h - 6);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + seeded(variant + i) * 0.2) + ')';
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + seeded(variant + i * 3) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        return c;
    }

    // Ice path tile (for Frozen Pass)
    function renderIcePathTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        // Dark blue-grey ice base — contrasts with white snow
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#7a8fa0');
        grad.addColorStop(0.5, '#6b8092');
        grad.addColorStop(1, '#5c7285');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Frosted ice surface
        ctx.fillStyle = 'rgba(160,200,230,0.25)';
        ctx.fillRect(2, 2, w - 4, h - 4);

        // Ice crack network — white-blue cracks for visibility
        ctx.strokeStyle = 'rgba(180,210,240,0.55)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const sx = 4 + seeded(variant * 31 + i * 17) * (w - 8);
            const sy = 4 + seeded(variant * 41 + i * 19) * (h - 8);
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + seeded(variant + i * 7) * 16 - 8, sy + seeded(variant + i * 11) * 14 - 7);
            ctx.lineTo(sx + seeded(variant + i * 13) * 12 - 6, sy + seeded(variant + i * 17) * 16 - 8);
            ctx.stroke();
        }

        // Frosted edge specks
        ctx.fillStyle = 'rgba(200,225,245,0.3)';
        for (let i = 0; i < 3; i++) {
            const fx = 4 + seeded(variant * 53 + i * 7) * (w - 8);
            const fy = 4 + seeded(variant * 67 + i * 11) * (h - 8);
            ctx.beginPath();
            ctx.arc(fx, fy, seeded(variant + i * 3) * 2 + 1, 0, Math.PI * 2);
            ctx.fill();
        }

        return c;
    }

    // Stone wall tile (for Fortress Siege)
    function renderWallTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        // Wall base
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#757575');
        grad.addColorStop(0.5, '#616161');
        grad.addColorStop(1, '#505050');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Stone blocks
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 0.8;
        const blockRows = 3;
        const blockH = h / blockRows;
        for (let row = 0; row < blockRows; row++) {
            const by = row * blockH;
            ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(w, by); ctx.stroke();
            const offset = (row % 2) * w * 0.25;
            for (let bx = offset; bx < w; bx += w * 0.45) {
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + blockH); ctx.stroke();
            }
        }

        // Weathering/dirt
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, 0, w, h);

        // Moss spots
        if (seeded(variant) > 0.6) {
            ctx.fillStyle = 'rgba(80,120,60,0.3)';
            ctx.beginPath();
            ctx.arc(8 + seeded(variant * 3) * 10, h - 4, 3 + seeded(variant * 7) * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        return c;
    }

    // Cobblestone path tile (for Fortress Siege)
    function renderCobbleTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        // Base
        ctx.fillStyle = '#8a8075';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#9e948a';
        ctx.fillRect(2, 2, w - 4, h - 4);

        // Cobblestone pattern
        ctx.strokeStyle = 'rgba(70,60,50,0.35)';
        ctx.lineWidth = 0.8;
        for (let row = 0; row < 4; row++) {
            const ry = 4 + row * 9;
            ctx.beginPath(); ctx.moveTo(3, ry); ctx.lineTo(w - 3, ry); ctx.stroke();
            const offset = (row % 2) * 7;
            for (let bx = 3 + offset; bx < w; bx += 14) {
                ctx.beginPath(); ctx.moveTo(bx, ry); ctx.lineTo(bx, ry + 9); ctx.stroke();
            }
        }

        return c;
    }

    // Fortress grass tile
    function renderFortGrassTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        const colors = [['#556b3a', '#48602e'], ['#48602e', '#3d5224'], ['#5a7040', '#4d6232']];
        const col = colors[variant % colors.length];
        ctx.fillStyle = col[0];
        ctx.fillRect(0, 0, w, h);

        // Sparse dry grass
        ctx.strokeStyle = 'rgba(40,60,25,0.2)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
            const gx = 5 + seeded(variant * 33 + i * 11) * (w - 10);
            const gy = h - 3;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + seeded(variant + i) * 3 - 1.5, gy - 4 - seeded(variant + i * 2) * 5);
            ctx.stroke();
        }

        return c;
    }

    // Desert sand tile
    function renderSandTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        const colors = [['#d4b896','#c9ad8a'],['#c9ad8a','#bfa37e'],['#dcc4a4','#d0b894'],['#c4a47c','#b89870']];
        const col = colors[variant % colors.length];
        ctx.fillStyle = col[0]; ctx.fillRect(0, 0, w, h);
        // Dune ripples
        ctx.strokeStyle = 'rgba(180,150,120,0.3)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
            const ry = 6 + i * 12 + seeded(variant * 13 + i) * 4;
            ctx.beginPath();
            ctx.moveTo(2, ry);
            for (let rx = 2; rx < w; rx += 5) {
                ctx.lineTo(rx, ry + Math.sin(rx * 0.4 + variant + i) * 2);
            }
            ctx.stroke();
        }
        // Sand speckles
        for (let i = 0; i < 4; i++) {
            const sx = 4 + seeded(variant * 71 + i * 17) * (w - 8);
            const sy = 4 + seeded(variant * 43 + i * 29) * (h - 8);
            ctx.fillStyle = 'rgba(200,180,150,0.4)';
            ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI*2); ctx.fill();
        }
        return c;
    }

    // Jungle terrain tile
    function renderJungleTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        const colors = [['#3d6b2e','#345c25'],['#345c25','#2a4d1e'],['#427a32','#386828'],['#2e5524','#23471c']];
        const col = colors[variant % colors.length];
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, col[0]); grad.addColorStop(1, col[1]);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        // Dense leaf texture
        ctx.fillStyle = 'rgba(30,80,20,0.2)';
        for (let i = 0; i < 5; i++) {
            const lx = 4 + seeded(variant * 37 + i * 11) * (w - 8);
            const ly = 4 + seeded(variant * 53 + i * 19) * (h - 8);
            ctx.beginPath();
            ctx.ellipse(lx, ly, 5 + seeded(variant + i) * 3, 3 + seeded(variant + i * 2) * 2, seeded(variant+i*7), 0, Math.PI*2);
            ctx.fill();
        }
        return c;
    }

    // Volcanic terrain tile
    function renderVolcanicTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        const colors = [['#3d3d3d','#333'],['#333','#2a2a2a'],['#383838','#303030'],['#2e2e2e','#252525']];
        const col = colors[variant % colors.length];
        ctx.fillStyle = col[0]; ctx.fillRect(0, 0, w, h);
        // Ash speckles
        for (let i = 0; i < 6; i++) {
            const sx = 3 + seeded(variant * 61 + i * 13) * (w - 6);
            const sy = 3 + seeded(variant * 47 + i * 23) * (h - 6);
            ctx.fillStyle = 'rgba(180,180,180,' + (0.1 + seeded(variant + i) * 0.15) + ')';
            ctx.beginPath(); ctx.arc(sx, sy, seeded(variant + i * 3) * 1.5 + 0.5, 0, Math.PI*2); ctx.fill();
        }
        return c;
    }

    // Lava path tile (cracked dark stone with orange glow)
    function renderLavaPathTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        // Dark cracked stone base
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#222'; ctx.fillRect(2, 2, w-4, h-4);
        // Glowing lava cracks
        ctx.strokeStyle = 'rgba(255,110,0,0.6)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const sx = 4 + seeded(variant * 31 + i * 13) * (w - 8);
            const sy = 4 + seeded(variant * 41 + i * 17) * (h - 8);
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + seeded(variant + i * 7) * 16 - 8, sy + seeded(variant + i * 9) * 12 - 6);
            ctx.stroke();
        }
        // Orange glow spots
        for (let i = 0; i < 2; i++) {
            const gx = 6 + seeded(variant * 73 + i * 19) * (w - 12);
            const gy = 6 + seeded(variant * 57 + i * 29) * (h - 12);
            ctx.fillStyle = 'rgba(255,80,0,0.25)';
            ctx.beginPath(); ctx.arc(gx, gy, 3 + seeded(variant+i)*2, 0, Math.PI*2); ctx.fill();
        }
        return c;
    }

    // Coastal cliff tile
    function renderCoastalTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        const colors = [['#6a8a4a','#5d7a3e'],['#5d7a3e','#4f6b32'],['#70944e','#638042'],['#587238','#4a622e']];
        const col = colors[variant % colors.length];
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, col[0]); grad.addColorStop(1, col[1]);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        // Grass tufts on cliff
        ctx.strokeStyle = 'rgba(40,80,25,0.2)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
            const gx = 5 + seeded(variant * 33 + i * 11) * (w - 10);
            const gy = h - 2;
            ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 1, gy - 4 - seeded(variant+i)*3); ctx.stroke();
        }
        return c;
    }

    // Beach sand tile
    function renderBeachTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        const colors = [['#e8d5a0','#decb94'],['#decb94','#d4c088'],['#f0e0b0','#e5d4a0'],['#d8c590','#ceba84']];
        const col = colors[variant % colors.length];
        ctx.fillStyle = col[0]; ctx.fillRect(0, 0, w, h);
        // Shell speckles
        for (let i = 0; i < 3; i++) {
            const sx = 5 + seeded(variant * 29 + i * 7) * (w - 10);
            const sy = 5 + seeded(variant * 51 + i * 13) * (h - 10);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.arc(sx, sy, 0.8 + seeded(variant+i)*1.2, 0, Math.PI*2); ctx.fill();
        }
        return c;
    }

    // ---- Public API ----

    function init() {
        if (initialized) return;

        // Generate grass variants
        spriteBank.grass = [];
        for (let i = 0; i < 8; i++) {
            spriteBank.grass.push(renderGrassTile(i));
        }

        // Snow terrain variants (for Frozen Pass)
        spriteBank.snow = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.snow.push(renderSnowTile(i));
        }

        // Fortress grass variants
        spriteBank.fort_grass = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.fort_grass.push(renderFortGrassTile(i));
        }

        // Path variants
        spriteBank.path = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.path.push(renderPathTile(i));
        }

        // Ice path variants
        spriteBank.ice_path = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.ice_path.push(renderIcePathTile(i));
        }

        // Cobblestone path variants
        spriteBank.cobble = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.cobble.push(renderCobbleTile(i));
        }

        // Wall variants
        spriteBank.wall = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.wall.push(renderWallTile(i));
        }

        // New terrain types for 4 additional maps
        spriteBank.sand = [];
        for (let i = 0; i < 6; i++) spriteBank.sand.push(renderSandTile(i));

        spriteBank.jungle = [];
        for (let i = 0; i < 6; i++) spriteBank.jungle.push(renderJungleTile(i));

        spriteBank.volcanic = [];
        for (let i = 0; i < 6; i++) spriteBank.volcanic.push(renderVolcanicTile(i));

        spriteBank.lava_path = [];
        for (let i = 0; i < 4; i++) spriteBank.lava_path.push(renderLavaPathTile(i));

        spriteBank.coastal = [];
        for (let i = 0; i < 6; i++) spriteBank.coastal.push(renderCoastalTile(i));

        spriteBank.sand_beach = [];
        for (let i = 0; i < 4; i++) spriteBank.sand_beach.push(renderBeachTile(i));

        // Decoration sprites
        spriteBank.deco = {};
        spriteBank.deco.tree = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.deco.tree.push(renderTreeSprite(i * 17));
        }
        spriteBank.deco.rock = [];
        for (let i = 0; i < 5; i++) {
            spriteBank.deco.rock.push(renderRockSprite(i * 29));
        }
        spriteBank.deco.house = [];
        for (let i = 0; i < 3; i++) {
            spriteBank.deco.house.push(renderHouseSprite());
        }

        initialized = true;
    }

    // Draw a tile from the atlas at pixel position
    function drawTile(ctx, category, variant, x, y, w, h) {
        if (!initialized) init();
        const bank = spriteBank[category];
        if (!bank) {
            // Fallback: fill with color
            ctx.fillStyle = category;
            ctx.fillRect(x, y, w || SPRITE_SIZE, h || SPRITE_SIZE);
            return;
        }
        let img;
        if (Array.isArray(bank)) {
            img = bank[Math.abs(variant || 0) % bank.length];
        } else {
            // Nested: e.g. spriteBank.deco.tree
            const sub = bank[variant !== undefined ? variant : 0];
            if (Array.isArray(sub)) {
                img = sub[0];
            } else if (sub && sub.tagName === 'CANVAS') {
                img = sub;
            } else {
                img = bank[Object.keys(bank)[0]];
                if (Array.isArray(img)) img = img[0];
            }
        }
        if (img && img.tagName === 'CANVAS') {
            ctx.drawImage(img, x, y, w || SPRITE_SIZE, h || SPRITE_SIZE);
        }
    }

    // Draw a decoration sprite centered at pixel position
    function drawDeco(ctx, type, seed, cx, cy, size) {
        if (!initialized) init();
        const decoBank = spriteBank.deco;
        let imgs;
        if (type === BLOCKED_TREE) imgs = decoBank.tree;
        else if (type === BLOCKED_ROCK) imgs = decoBank.rock;
        else if (type === BLOCKED_HOUSE) imgs = decoBank.house;
        else return;

        const img = imgs[Math.abs(seed || 0) % imgs.length];
        const s = size || SPRITE_SIZE;
        ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
    }

    // Check if sprite atlas has a category
    function has(category) {
        return !!spriteBank[category];
    }

    return { init, drawTile, drawDeco, has, SPRITE_SIZE };
})();

// Auto-init when loaded
if (typeof BLOCKED_TREE !== 'undefined') {
    SpriteAtlas.init();
}
