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

    // Draw a more detailed tree to a canvas (enhanced with directional lighting)
    function renderTreeSprite(seed) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const cx = SPRITE_SIZE / 2, cy = SPRITE_SIZE / 2;

        // Directional shadow (consistent top-left light = shadow bottom-right)
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 13, 13, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk with directional gradient (light from left)
        const trunkGrad = ctx.createLinearGradient(cx - 4, 0, cx + 4, 0);
        trunkGrad.addColorStop(0, '#6D4C41');  // lit side
        trunkGrad.addColorStop(0.3, '#795548');
        trunkGrad.addColorStop(0.6, '#5D4037');
        trunkGrad.addColorStop(1, '#3E2723');  // shadow side
        ctx.fillStyle = trunkGrad;
        ctx.fillRect(cx - 3, cy - 4, 6, 13);
        // Bark texture lines
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 0.5;
        for (let ly = cy - 2; ly < cy + 9; ly += 3) {
            ctx.beginPath();
            ctx.moveTo(cx - 2, ly);
            ctx.lineTo(cx + 2, ly + seeded(seed + ly) * 1.5);
            ctx.stroke();
        }

        // Dark underside canopy layer (creates depth shadow)
        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.arc(cx + 2, cy - 7, 12, 0, Math.PI * 2);
        ctx.fill();

        // Canopy layers with light-offset radial gradients
        const canopyColors = [
            { fill: '#1B5E20', highlight: '#2E7D32' },
            { fill: '#2E7D32', highlight: '#388E3C' },
            { fill: '#388E3C', highlight: '#43A047' },
            { fill: '#43A047', highlight: '#4CAF50' },
        ];
        for (let layer = 0; layer < 4; layer++) {
            const ly = cy - 10 - layer * 4;
            const lr = 13 - layer * 2;
            const lx = cx + (seeded(seed + layer * 13) - 0.5) * 4;

            // Offset gradient center toward light (top-left)
            const grad = ctx.createRadialGradient(lx - lr * 0.35, ly - lr * 0.35, lr * 0.1, lx, ly, lr);
            grad.addColorStop(0, canopyColors[layer].highlight);
            grad.addColorStop(0.6, canopyColors[layer].fill);
            grad.addColorStop(1, darkenColor(canopyColors[layer].fill, 0.2));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(lx, ly, lr, 0, Math.PI * 2);
            ctx.fill();

            // Brighter highlight on upper-left edge
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.arc(lx - lr * 0.3, ly - lr * 0.35, lr * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fine outline on canopy edge for definition
        ctx.strokeStyle = 'rgba(0,20,0,0.15)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy - 13, 14, 0, Math.PI * 2);
        ctx.stroke();

        return c;
    }

    // Rock sprite (enhanced with multi-facet directional shading)
    function renderRockSprite(seed) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const cx = SPRITE_SIZE / 2, cy = SPRITE_SIZE / 2 + 4;

        // Directional shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 10, 13, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body with light-directional gradient (top-left lit, bottom-right dark)
        const grad = ctx.createLinearGradient(cx - 10, cy - 8, cx + 10, cy + 8);
        grad.addColorStop(0, '#C7C7C7');   // lit
        grad.addColorStop(0.3, '#B0B0B0');
        grad.addColorStop(0.6, '#8A8A8A');
        grad.addColorStop(0.85, '#666666');
        grad.addColorStop(1, '#505050');   // shadow
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

        // Multi-facet shading: light facets on top-left
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 5, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Second highlight facet
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 1, 4, 0, Math.PI * 2);
        ctx.fill();

        // Dark shadow facet on bottom-right
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.arc(cx + 4, cy + 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Light rim crescent on upper-left edge
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 3, 9.5, -Math.PI * 0.8, -Math.PI * 0.15);
        ctx.stroke();

        // Cracks
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + 2);
        ctx.lineTo(cx + 2, cy - 3);
        ctx.lineTo(cx + 4, cy - 6);
        ctx.stroke();

        return c;
    }

    // House sprite (enhanced with 3D extrusion and window glow)
    function renderHouseSprite() {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const cx = SPRITE_SIZE / 2, cy = SPRITE_SIZE / 2 + 2;

        // Directional shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 13, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Walls — side faces for 3D extrusion
        // Right wall shadow (dark edge)
        ctx.fillStyle = '#B8A88C';
        ctx.fillRect(cx + 8, cy - 2, 3, 14);
        // Bottom wall shadow
        ctx.fillStyle = '#C4B498';
        ctx.fillRect(cx - 10, cy + 8, 20, 3);

        // Main wall with directional gradient (light from left)
        const wallGrad = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
        wallGrad.addColorStop(0, '#F2EDE0');  // lit
        wallGrad.addColorStop(0.3, '#E8D5B7');
        wallGrad.addColorStop(0.7, '#D7C4A1');
        wallGrad.addColorStop(1, '#C4B08A');  // shadow side
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

        // Roof overhang shadow on wall
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(cx - 13, cy - 2, 26, 3);

        // Roof with directional gradient
        const roofGrad = ctx.createLinearGradient(cx - 13, cy - 16, cx + 13, cy - 2);
        roofGrad.addColorStop(0, '#D32F2F');  // lit side
        roofGrad.addColorStop(0.4, '#C62828');
        roofGrad.addColorStop(0.8, '#8E0000');
        roofGrad.addColorStop(1, '#6D0000');  // dark edge
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy - 2);
        ctx.lineTo(cx, cy - 18);
        ctx.lineTo(cx + 13, cy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5D0000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Roof tiles (horizontal lines)
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.6;
        for (let r = 0; r < 5; r++) {
            const ry = cy - 15 + r * 3.2;
            ctx.beginPath();
            ctx.moveTo(cx - 12 + r * 2.5, ry);
            ctx.lineTo(cx + 12 - r * 2.5, ry);
            ctx.stroke();
        }

        // Roof light highlight on left face
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy - 3);
        ctx.lineTo(cx - 2, cy - 16);
        ctx.lineTo(cx + 5, cy - 5);
        ctx.lineTo(cx - 5, cy - 3);
        ctx.closePath();
        ctx.fill();

        // Door with frame
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(cx - 4, cy - 1, 8, 13);
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(cx - 3, cy, 6, 11);
        // Door knob
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 7, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Window with warm glow
        const winGlow = ctx.createRadialGradient(cx + 5, cy - 1, 0.5, cx + 5, cy - 1, 8);
        winGlow.addColorStop(0, 'rgba(255,245,180,0.35)');
        winGlow.addColorStop(0.3, 'rgba(255,240,160,0.15)');
        winGlow.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = winGlow;
        ctx.fillRect(cx + 1, cy - 5, 10, 10);

        // Window pane
        const winGrad = ctx.createRadialGradient(cx + 5, cy - 1, 0.5, cx + 5, cy - 1, 4);
        winGrad.addColorStop(0, '#FFF9C4');
        winGrad.addColorStop(1, '#81D4FA');
        ctx.fillStyle = winGrad;
        ctx.fillRect(cx + 3, cy - 2, 5, 5);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx + 3, cy - 2, 5, 5);
        ctx.beginPath(); ctx.moveTo(cx + 5.5, cy - 2); ctx.lineTo(cx + 5.5, cy + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 3, cy + 0.5); ctx.lineTo(cx + 8, cy + 0.5); ctx.stroke();

        // Chimney with 3D sides
        ctx.fillStyle = '#616161';
        ctx.fillRect(cx + 5, cy - 16, 5, 9);
        ctx.fillStyle = '#757575'; // lit face (left)
        ctx.fillRect(cx + 5, cy - 16, 3, 9);
        // Chimney smoke
        ctx.fillStyle = 'rgba(180,180,180,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + 7, cy - 18, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

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

    // Shared rounded-rect clip helper
    function roundedRectClip(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.clip();
    }

    // Path/dirt tile (with rounded corners)
    function renderPathTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;
        const cornerR = 8;

        // Clip to rounded rect so path edges aren't sharp squares
        roundedRectClip(ctx, 0, 0, w, h, cornerR);

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

    // Ice path tile (for Frozen Pass — with rounded corners)
    function renderIcePathTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        roundedRectClip(ctx, 0, 0, w, h, 8);

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

    // Cobblestone path tile (for Fortress Siege — with rounded corners)
    function renderCobbleTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        roundedRectClip(ctx, 0, 0, w, h, 8);

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

    // Lava path tile (cracked dark stone with orange glow — rounded corners)
    function renderLavaPathTile(variant) {
        const c = makeCanvas();
        const ctx = c.getContext('2d');
        const w = SPRITE_SIZE, h = SPRITE_SIZE;

        roundedRectClip(ctx, 0, 0, w, h, 8);

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

    // ---- 3D Extrusion Helper ----

    // Takes a flat tile canvas and draws 3D bevel edges on it
    // isRaised=true: terrain pops up (light top-left, dark bottom-right edges)
    // isRaised=false: path sinks down (inverted: dark top-left, light bottom-right edges)
    function extrudeTile(sourceCanvas, isRaised) {
        const w = sourceCanvas.width, h = sourceCanvas.height;
        const c = makeCanvas(w, h);
        const ctx = c.getContext('2d');
        const bevel = 6; // edge width in pixels (increased for visible 3D depth)
        const cr = 8;    // corner radius for bevel edges

        // Copy the flat source
        ctx.drawImage(sourceCanvas, 0, 0);

        // Side edge colors
        const mid = ctx.getImageData(w / 2, h / 2, 1, 1).data;
        const midHex = `#${mid[0].toString(16).padStart(2,'0')}${mid[1].toString(16).padStart(2,'0')}${mid[2].toString(16).padStart(2,'0')}`;

        const darkEdge  = darkenColor(midHex, 0.22);
        const darkEdge2 = darkenColor(midHex, 0.12);
        const lightEdge = lightenColor(midHex, 0.08);
        const lightEdge2 = lightenColor(midHex, 0.04);

        // Draw bevel edges clipped to a slightly expanded rounded rect
        // so the corners follow the tile's rounded shape
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cr, -1);
        ctx.lineTo(w - cr, -1);
        ctx.arcTo(w + 1, -1, w + 1, cr, cr);
        ctx.lineTo(w + 1, h - cr);
        ctx.arcTo(w + 1, h + 1, w - cr, h + 1, cr);
        ctx.lineTo(cr, h + 1);
        ctx.arcTo(-1, h + 1, -1, h - cr, cr);
        ctx.lineTo(-1, cr);
        ctx.arcTo(-1, -1, cr, -1, cr);
        ctx.closePath();
        ctx.clip();

        if (isRaised) {
            // ---- RAISED (buildable terrain): light top-left, dark bottom-right ----
            ctx.fillStyle = darkEdge;
            ctx.fillRect(0, h - bevel, w, bevel);
            ctx.fillStyle = darkEdge2;
            ctx.fillRect(w - bevel, 0, bevel, h - bevel);
            ctx.fillStyle = lightEdge;
            ctx.fillRect(0, 0, w - bevel, bevel);
            ctx.fillStyle = lightEdge2;
            ctx.fillRect(0, bevel, bevel, h - bevel);
        } else {
            // ---- RECESSED (path): dark top-left, light bottom-right ----
            ctx.fillStyle = darkEdge;
            ctx.fillRect(0, 0, w, bevel);
            ctx.fillStyle = darkEdge2;
            ctx.fillRect(0, bevel, bevel, h - bevel);
            ctx.fillStyle = lightEdge;
            ctx.fillRect(bevel, h - bevel, w - bevel, bevel);
            ctx.fillStyle = lightEdge2;
            ctx.fillRect(w - bevel, bevel, bevel, h - bevel);
        }

        ctx.restore();

        // Subtle inner shadow at bevel boundaries for crispness
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bevel, bevel, w - bevel * 2, h - bevel * 2);

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
        // Grass 3D (raised terrain)
        spriteBank.grass_3d = [];
        for (let i = 0; i < 8; i++) {
            spriteBank.grass_3d.push(extrudeTile(spriteBank.grass[i], true));
        }

        // Snow terrain variants (for Frozen Pass)
        spriteBank.snow = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.snow.push(renderSnowTile(i));
        }
        spriteBank.snow_3d = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.snow_3d.push(extrudeTile(spriteBank.snow[i], true));
        }

        // Fortress grass variants
        spriteBank.fort_grass = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.fort_grass.push(renderFortGrassTile(i));
        }
        spriteBank.fort_grass_3d = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.fort_grass_3d.push(extrudeTile(spriteBank.fort_grass[i], true));
        }

        // Path variants
        spriteBank.path = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.path.push(renderPathTile(i));
        }
        spriteBank.path_3d = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.path_3d.push(extrudeTile(spriteBank.path[i], false));
        }

        // Ice path variants
        spriteBank.ice_path = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.ice_path.push(renderIcePathTile(i));
        }
        spriteBank.ice_path_3d = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.ice_path_3d.push(extrudeTile(spriteBank.ice_path[i], false));
        }

        // Cobblestone path variants
        spriteBank.cobble = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.cobble.push(renderCobbleTile(i));
        }
        spriteBank.cobble_3d = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.cobble_3d.push(extrudeTile(spriteBank.cobble[i], false));
        }

        // Wall variants
        spriteBank.wall = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.wall.push(renderWallTile(i));
        }

        // New terrain types for 4 additional maps
        spriteBank.sand = [];
        for (let i = 0; i < 6; i++) spriteBank.sand.push(renderSandTile(i));
        spriteBank.sand_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.sand_3d.push(extrudeTile(spriteBank.sand[i], true));

        spriteBank.jungle = [];
        for (let i = 0; i < 6; i++) spriteBank.jungle.push(renderJungleTile(i));
        spriteBank.jungle_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.jungle_3d.push(extrudeTile(spriteBank.jungle[i], true));

        spriteBank.volcanic = [];
        for (let i = 0; i < 6; i++) spriteBank.volcanic.push(renderVolcanicTile(i));
        spriteBank.volcanic_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.volcanic_3d.push(extrudeTile(spriteBank.volcanic[i], true));

        spriteBank.lava_path = [];
        for (let i = 0; i < 4; i++) spriteBank.lava_path.push(renderLavaPathTile(i));
        spriteBank.lava_path_3d = [];
        for (let i = 0; i < 4; i++) spriteBank.lava_path_3d.push(extrudeTile(spriteBank.lava_path[i], false));

        spriteBank.coastal = [];
        for (let i = 0; i < 6; i++) spriteBank.coastal.push(renderCoastalTile(i));
        spriteBank.coastal_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.coastal_3d.push(extrudeTile(spriteBank.coastal[i], true));

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
