// ============================================================
// Map — Grid definition, path waypoints, map rendering
// ============================================================

// Path waypoints in grid coordinates (col, row):
const PATH_CELLS = [
    // Start at left side, row 1
    { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 },
    // Down to row 3
    { c: 2, r: 2 }, { c: 2, r: 3 },
    // Right to col 6
    { c: 3, r: 3 }, { c: 4, r: 3 }, { c: 5, r: 3 }, { c: 6, r: 3 },
    // Down to row 5
    { c: 6, r: 4 }, { c: 6, r: 5 },
    // Right to col 10
    { c: 7, r: 5 }, { c: 8, r: 5 }, { c: 9, r: 5 }, { c: 10, r: 5 },
    // Down to row 7
    { c: 10, r: 6 }, { c: 10, r: 7 },
    // Right to col 17
    { c: 11, r: 7 }, { c: 12, r: 7 }, { c: 13, r: 7 }, { c: 14, r: 7 },
    { c: 15, r: 7 }, { c: 16, r: 7 }, { c: 17, r: 7 },
    // Down to row 11
    { c: 17, r: 8 }, { c: 17, r: 9 }, { c: 17, r: 10 }, { c: 17, r: 11 },
    // Left to col 2
    { c: 16, r: 11 }, { c: 15, r: 11 }, { c: 14, r: 11 }, { c: 13, r: 11 },
    { c: 12, r: 11 }, { c: 11, r: 11 }, { c: 10, r: 11 }, { c: 9, r: 11 },
    { c: 8, r: 11 }, { c: 7, r: 11 }, { c: 6, r: 11 }, { c: 5, r: 11 },
    { c: 4, r: 11 }, { c: 3, r: 11 }, { c: 2, r: 11 },
    // Down to row 13 (exit at castle)
    { c: 2, r: 12 }, { c: 2, r: 13 },
];

// Type of blocked decoration
const BLOCKED_TREE = 1;
const BLOCKED_ROCK = 2;
const BLOCKED_HOUSE = 3;

// Creek definition — a single smooth L-shaped waterway
// Flows south from the top-right, crosses under path at row 7 and row 11
// (wooden bridges at both), then turns west along row 12.

// Creek cells protected from decorations
const CREEK_CELLS = new Set();
// Vertical: col 14, rows 0-12 (full north-to-south flow)
for (let r = 0; r <= 12; r++) CREEK_CELLS.add(r + ',14');
// Horizontal: row 12, cols 4-14 (westward, stopping before path at col 2)
for (let c = 4; c <= 14; c++) CREEK_CELLS.add('12,' + c);

// Compute all bridge cells (any path cell that the creek flows through)
const BRIDGE_CELLS = [];
for (const pc of PATH_CELLS) {
    if (CREEK_CELLS.has(pc.r + ',' + pc.c)) {
        BRIDGE_CELLS.push({ c: pc.c, r: pc.r });
    }
}

// Creek segments for rendering (continuous, no criss-cross)
const CREEK_SEGMENTS = [
    // Vertical: col 14, from top to just above row 12
    { x: 14 * CELL_SIZE + CELL_SIZE * 0.15, y: 0, w: CELL_SIZE * 0.7, h: 12 * CELL_SIZE + CELL_SIZE * 0.5 },
    // Horizontal: row 12, from col 4 to meet the vertical at col 14
    { x: 4 * CELL_SIZE, y: 12 * CELL_SIZE + CELL_SIZE * 0.15, w: (14.5 - 4) * CELL_SIZE, h: CELL_SIZE * 0.7 },
];

// Helper: only add decoration if cell is clear (not creek, not path)
function isCellClear(c, r) {
    if (CREEK_CELLS.has(r + ',' + c)) return false;
    if (r >= GRID_ROWS || c >= GRID_COLS) return false;
    return GRID_DATA[r][c] === CELL_BUILDABLE;
}

// Decorative blocked cells — spread naturally, not clustered
const DECORATIONS = [
    // --- Houses (village feel, placed on choice spots) ---
    { c: 7, r: 0, type: BLOCKED_HOUSE },
    { c: 17, r: 4, type: BLOCKED_HOUSE },
    { c: 4, r: 7, type: BLOCKED_HOUSE },
    { c: 8, r: 12, type: BLOCKED_HOUSE },
    { c: 16, r: 13, type: BLOCKED_HOUSE },
    { c: 13, r: 9, type: BLOCKED_HOUSE },

    // --- Scattered trees ---
    { c: 4, r: 0, type: BLOCKED_TREE },
    { c: 13, r: 0, type: BLOCKED_TREE },
    { c: 5, r: 1, type: BLOCKED_TREE },
    { c: 16, r: 1, type: BLOCKED_TREE },
    { c: 8, r: 2, type: BLOCKED_TREE },
    { c: 14, r: 2, type: BLOCKED_TREE },
    { c: 18, r: 2, type: BLOCKED_TREE },
    { c: 1, r: 3, type: BLOCKED_TREE },
    { c: 10, r: 3, type: BLOCKED_TREE },
    { c: 14, r: 3, type: BLOCKED_TREE },
    { c: 3, r: 4, type: BLOCKED_TREE },
    { c: 9, r: 4, type: BLOCKED_TREE },
    { c: 19, r: 4, type: BLOCKED_TREE },
    { c: 6, r: 5, type: BLOCKED_TREE },
    { c: 13, r: 5, type: BLOCKED_TREE },
    { c: 1, r: 6, type: BLOCKED_TREE },
    { c: 5, r: 6, type: BLOCKED_TREE },
    { c: 14, r: 6, type: BLOCKED_TREE },
    { c: 8, r: 7, type: BLOCKED_TREE },
    { c: 16, r: 7, type: BLOCKED_TREE },
    { c: 19, r: 7, type: BLOCKED_TREE },
    { c: 3, r: 8, type: BLOCKED_TREE },
    { c: 7, r: 8, type: BLOCKED_TREE },
    { c: 15, r: 8, type: BLOCKED_TREE },
    { c: 18, r: 8, type: BLOCKED_TREE },
    { c: 3, r: 9, type: BLOCKED_TREE },
    { c: 9, r: 9, type: BLOCKED_TREE },
    { c: 4, r: 10, type: BLOCKED_TREE },
    { c: 13, r: 10, type: BLOCKED_TREE },
    { c: 17, r: 10, type: BLOCKED_TREE },
    { c: 4, r: 13, type: BLOCKED_TREE },
    { c: 11, r: 13, type: BLOCKED_TREE },
    { c: 18, r: 13, type: BLOCKED_TREE },

    // --- Scattered rocks ---
    { c: 3, r: 0, type: BLOCKED_ROCK },
    { c: 11, r: 1, type: BLOCKED_ROCK },
    { c: 17, r: 2, type: BLOCKED_ROCK },
    { c: 5, r: 3, type: BLOCKED_ROCK },
    { c: 11, r: 4, type: BLOCKED_ROCK },
    { c: 15, r: 4, type: BLOCKED_ROCK },
    { c: 2, r: 5, type: BLOCKED_ROCK },
    { c: 15, r: 6, type: BLOCKED_ROCK },
    { c: 11, r: 7, type: BLOCKED_ROCK },
    { c: 18, r: 6, type: BLOCKED_ROCK },
    { c: 11, r: 8, type: BLOCKED_ROCK },
    { c: 6, r: 9, type: BLOCKED_ROCK },
    { c: 16, r: 9, type: BLOCKED_ROCK },
    { c: 9, r: 10, type: BLOCKED_ROCK },
    { c: 15, r: 10, type: BLOCKED_ROCK },
    { c: 13, r: 13, type: BLOCKED_ROCK },
    { c: 1, r: 13, type: BLOCKED_ROCK },
    { c: 14, r: 12, type: BLOCKED_ROCK },

    // --- Border edge decorations ---
    { c: 0, r: 0, type: BLOCKED_ROCK },
    { c: 19, r: 0, type: BLOCKED_TREE },
    { c: 19, r: 9, type: BLOCKED_ROCK },
    { c: 0, r: 10, type: BLOCKED_TREE },
];

// Derive grid from path cells
function buildGridFromPath(pathCells, cols, rows) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols).fill(CELL_BUILDABLE);
    }

    for (const cell of pathCells) {
        if (cell.r >= 0 && cell.r < rows && cell.c >= 0 && cell.c < cols) {
            grid[cell.r][cell.c] = CELL_PATH;
        }
    }

    return grid;
}

const GRID_DATA = buildGridFromPath(PATH_CELLS, GRID_COLS, GRID_ROWS);

// Decoration lookup map — filtered to avoid creek cells
const DECO_MAP = {};
for (const d of DECORATIONS) {
    if (CREEK_CELLS.has(d.r + ',' + d.c)) continue; // skip anything on the creek
    if (GRID_DATA[d.r] && GRID_DATA[d.r][d.c] === CELL_BUILDABLE) {
        GRID_DATA[d.r][d.c] = CELL_BLOCKED;
        DECO_MAP[d.r + ',' + d.c] = d.type;
    }
}

// Convert path cells to pixel waypoints (center of each cell)
function cellsToWaypoints(pathCells) {
    return pathCells.map(cell => ({
        x: (cell.c + 0.5) * CELL_SIZE,
        y: (cell.r + 0.5) * CELL_SIZE
    }));
}

const WAYPOINTS = cellsToWaypoints(PATH_CELLS);
const SPAWN_POS = WAYPOINTS[0];
const BASE_POS = WAYPOINTS[WAYPOINTS.length - 1];

// Get cell under a pixel position
function getCell(px, py) {
    const col = Math.floor(px / CELL_SIZE);
    const row = Math.floor(py / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return {
        col, row,
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        type: GRID_DATA[row][col],
        isBuildable: GRID_DATA[row][col] === CELL_BUILDABLE,
    };
}

// Check if a grid cell can have a tower placed on it
function canPlaceTower(col, row, existingTowers) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    if (GRID_DATA[row][col] !== CELL_BUILDABLE) return false;
    for (const t of existingTowers) {
        if (t.col === col && t.row === row) return false;
    }
    return true;
}

// Simple seeded random for consistent decoration variation
function seededRand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// ============================================================
// Rendering helpers
// ============================================================

function drawTree(ctx, x, y, size, seed) {
    const s = size; // base size (cell is 40, so s ~18)
    const trunkW = s * 0.2;
    const trunkH = s * 0.7;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + s * 0.55, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(x - trunkW / 2, y - trunkH * 0.3, trunkW, trunkH);
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - trunkW / 2, y - trunkH * 0.3, trunkW * 0.6, trunkH);

    // Canopy layers (darker back, lighter front)
    const canopyColors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50'];
    for (let layer = 0; layer < 3; layer++) {
        const cy = y - trunkH * 0.5 - layer * s * 0.25;
        const cr = s * 0.55 - layer * s * 0.08;
        const cx = x + (seededRand(seed + layer * 10) - 0.5) * s * 0.2;

        ctx.fillStyle = canopyColors[layer + 1];
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();

        // Highlights
        ctx.fillStyle = canopyColors[layer + 1 !== undefined ? layer + 1 : 3];
        ctx.beginPath();
        ctx.arc(cx - cr * 0.25, cy - cr * 0.25, cr * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawRock(ctx, x, y, size, seed) {
    const s = size;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + s * 0.5, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main rock body (irregular polygon)
    const r1 = seededRand(seed);
    const r2 = seededRand(seed + 1);
    const r3 = seededRand(seed + 2);

    ctx.fillStyle = '#9E9E9E';
    ctx.beginPath();
    const numPoints = 7;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = s * 0.42 * (0.7 + seededRand(seed + i * 3) * 0.6);
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#BDBDBD';
    ctx.beginPath();
    ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Crack lines
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y + s * 0.1);
    ctx.lineTo(x + s * 0.15, y - s * 0.2);
    ctx.lineTo(x + s * 0.05, y - s * 0.3);
    ctx.stroke();
}

function drawCastle(ctx, x, y, size) {
    const s = size;
    const hp = (typeof window !== 'undefined' && window._castleHPPercent !== undefined) ? window._castleHPPercent : 1.0;

    // Damage tint: as HP drops, walls get darker and more red
    const damageAlpha = (1 - hp) * 0.6;
    const wallColor = hp < 0.3 ? '#6D4C41' : hp < 0.6 ? '#7B5B4C' : '#8D6E63';
    const towerColor = hp < 0.3 ? '#7B6B60' : hp < 0.6 ? '#8C7B6F' : '#A1887F';

    // Castle base
    ctx.fillStyle = wallColor;
    ctx.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.9);

    // Main tower
    ctx.fillStyle = towerColor;
    ctx.fillRect(x - s * 0.25, y - s * 0.85, s * 0.5, s * 0.75);

    // Side towers
    ctx.fillStyle = hp < 0.3 ? '#757575' : '#9E9E9E';
    ctx.fillRect(x - s * 0.7, y - s * 0.5, s * 0.3, s * 0.4);
    ctx.fillRect(x + s * 0.4, y - s * 0.5, s * 0.3, s * 0.4);

    // Battlements (main tower)
    ctx.fillStyle = '#BCAAA4';
    for (let bx = -0.2; bx <= 0.2; bx += 0.1) {
        ctx.fillRect(x + bx * s - s * 0.04, y - s * 0.95, s * 0.08, s * 0.12);
    }
    // Battlements (side towers) — some crumble at low HP
    if (hp > 0.25) {
        for (let bx = -0.55; bx <= -0.45; bx += 0.1) {
            ctx.fillRect(x + bx * s - s * 0.03, y - s * 0.58, s * 0.06, s * 0.1);
        }
    }
    for (let bx = 0.45; bx <= 0.65; bx += 0.1) {
        ctx.fillRect(x + bx * s - s * 0.03, y - s * 0.58, s * 0.06, s * 0.1);
    }

    // Door
    ctx.fillStyle = '#4E342E';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.05, s * 0.12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - s * 0.12, y - s * 0.05, s * 0.24, s * 0.12);

    // Window — glow red when damaged
    const windowColor = hp < 0.5 ? '#FF5252' : '#FFE082';
    ctx.fillStyle = windowColor;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flag on top — tattered at low HP
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.95);
    ctx.lineTo(x, y - s * 1.25);
    ctx.stroke();
    const flagColor = hp < 0.3 ? '#9E9E9E' : '#E53935';
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    if (hp > 0.3) {
        ctx.moveTo(x, y - s * 1.25);
        ctx.lineTo(x + s * 0.15, y - s * 1.18);
        ctx.lineTo(x, y - s * 1.1);
    } else {
        // Tattered flag
        ctx.moveTo(x, y - s * 1.25);
        ctx.lineTo(x + s * 0.08, y - s * 1.2);
        ctx.lineTo(x + s * 0.02, y - s * 1.15);
        ctx.lineTo(x + s * 0.1, y - s * 1.12);
        ctx.lineTo(x, y - s * 1.1);
    }
    ctx.fill();

    // Cracks at low HP
    if (hp < 0.6) {
        ctx.strokeStyle = 'rgba(0,0,0,' + ((1 - hp) * 0.5) + ')';
        ctx.lineWidth = 1.5;
        // Main tower crack
        ctx.beginPath();
        ctx.moveTo(x - s * 0.1, y - s * 0.8);
        ctx.lineTo(x + s * 0.05, y - s * 0.6);
        ctx.lineTo(x + s * 0.15, y - s * 0.5);
        ctx.stroke();
        if (hp < 0.35) {
            // Second crack
            ctx.beginPath();
            ctx.moveTo(x + s * 0.2, y - s * 0.3);
            ctx.lineTo(x + s * 0.1, y - s * 0.15);
            ctx.lineTo(x + s * 0.15, y - s * 0.05);
            ctx.stroke();
        }
    }

    // Damage overlay
    if (damageAlpha > 0) {
        ctx.fillStyle = 'rgba(80,0,0,' + damageAlpha + ')';
        ctx.fillRect(x - s * 0.7, y - s * 0.95, s * 1.4, s * 1.3);
    }
}

function drawGate(ctx, x, y, size) {
    const s = size;

    // Stone pillars
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(x - s * 0.4, y - s * 0.5, s * 0.2, s * 0.5);
    ctx.fillRect(x + s * 0.2, y - s * 0.5, s * 0.2, s * 0.5);

    // Pillar tops
    ctx.fillStyle = '#BDBDBD';
    ctx.fillRect(x - s * 0.45, y - s * 0.6, s * 0.3, s * 0.12);
    ctx.fillRect(x + s * 0.15, y - s * 0.6, s * 0.3, s * 0.12);

    // Arch
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.45, s * 0.3, Math.PI, 0);
    ctx.stroke();

    // Open gate (dark opening)
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(x - s * 0.25, y - s * 0.1, s * 0.5, s * 0.1);

    // Torches
    const flicker = Math.sin(Date.now() / 200) * 0.2 + 0.8;
    ctx.fillStyle = 'rgba(255,160,0,' + flicker + ')';
    ctx.beginPath();
    ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s * 0.4, y - s * 0.45, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Torch glow
    ctx.fillStyle = 'rgba(255,200,100,0.3)';
    ctx.beginPath();
    ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s * 0.4, y - s * 0.45, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawHouse(ctx, x, y, size) {
    const s = size;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + s * 0.45, s * 0.5, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Walls
    ctx.fillStyle = '#E8D5B7';
    ctx.fillRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);

    // Wall timber framing
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    // Cross beams
    ctx.beginPath();
    ctx.moveTo(x - s * 0.35, y + s * 0.15);
    ctx.lineTo(x + s * 0.35, y + s * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.1);
    ctx.lineTo(x, y + s * 0.4);
    ctx.stroke();

    // Roof (triangle)
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.42, y - s * 0.08);
    ctx.lineTo(x, y - s * 0.55);
    ctx.lineTo(x + s * 0.42, y - s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Roof ridge line
    ctx.strokeStyle = '#B71C1C';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.55);
    ctx.lineTo(x, y - s * 0.08);
    ctx.stroke();

    // Door
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - s * 0.08, y + s * 0.05, s * 0.16, s * 0.32);
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.arc(x + s * 0.05, y + s * 0.2, s * 0.02, 0, Math.PI * 2);
    ctx.fill();

    // Window
    ctx.fillStyle = '#81D4FA';
    ctx.fillRect(x + s * 0.12, y - s * 0.02, s * 0.13, s * 0.12);
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + s * 0.12, y - s * 0.02, s * 0.13, s * 0.12);
    // Window cross
    ctx.beginPath();
    ctx.moveTo(x + s * 0.185, y - s * 0.02);
    ctx.lineTo(x + s * 0.185, y + s * 0.1);
    ctx.stroke();

    // Chimney
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(x + s * 0.15, y - s * 0.5, s * 0.1, s * 0.2);
    // Smoke
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    ctx.beginPath();
    ctx.arc(x + s * 0.2, y - s * 0.58, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
}

function drawBridge(ctx, x, y, size) {
    const s = size;
    const w = s * 0.9;
    const h = s * 0.45;

    // Bridge shadow on water
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - w / 2 + 3, y - h / 2 + 3, w, h);

    // Bridge deck
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);

    // Planks (horizontal lines)
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 0.8;
    for (let py = y - h / 2 + 3; py < y + h / 2; py += 3.5) {
        ctx.beginPath();
        ctx.moveTo(x - w / 2, py);
        ctx.lineTo(x + w / 2, py);
        ctx.stroke();
    }

    // Railings
    ctx.fillStyle = '#8D6E63';
    // Left posts
    ctx.fillRect(x - w / 2, y - h / 2 - 8, 2.5, h + 8);
    ctx.fillRect(x - w / 2 + 6, y - h / 2 - 8, 2.5, h + 8);
    ctx.fillRect(x - w / 2 + 12, y - h / 2 - 8, 2.5, h + 8);
    // Right posts
    ctx.fillRect(x + w / 2 - 2.5, y - h / 2 - 8, 2.5, h + 8);
    ctx.fillRect(x + w / 2 - 8.5, y - h / 2 - 8, 2.5, h + 8);
    ctx.fillRect(x + w / 2 - 14.5, y - h / 2 - 8, 2.5, h + 8);

    // Top rail
    ctx.fillStyle = '#A1887F';
    ctx.fillRect(x - w / 2 - 1, y - h / 2 - 8, w + 2, 3);
    ctx.fillRect(x - w / 2 - 1, y + h / 2 - 1, w + 2, 3);

    // Side rails
    ctx.fillRect(x - w / 2, y - h / 2 - 6, 2, h + 8);
    ctx.fillRect(x + w / 2 - 2, y - h / 2 - 6, 2, h + 8);
}

// Draw creek as a smooth path with width, following centerline points
function drawCreek(ctx, x, y, w, h) {
    // Creek bed
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x, y, w, h);
    // Water
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#42A5F5');
    grad.addColorStop(0.3, '#64B5F6');
    grad.addColorStop(0.5, '#1E88E5');
    grad.addColorStop(0.7, '#64B5F6');
    grad.addColorStop(1, '#42A5F5');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
    // Water shimmer
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const ly = y + 6 + i * (h - 12) / 2;
        ctx.beginPath();
        ctx.moveTo(x + 4, ly);
        for (let lx = x + 4; lx < x + w - 4; lx += 4) {
            ctx.lineTo(lx, ly + Math.sin(lx * 0.3 + i) * 2);
        }
        ctx.stroke();
    }
    // Pebbles
    ctx.fillStyle = '#BDBDBD';
    for (let px = x + 6; px < x + w - 6; px += 12) {
        ctx.beginPath(); ctx.arc(px, y + 3, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 6, y + h - 4, 2, 0, Math.PI * 2); ctx.fill();
    }
}

function drawCreekPath(ctx, points, width) {
    if (points.length < 2) return;
    const hw = width / 2;

    // Build left and right banks by offsetting the centerline
    // For each segment, compute the perpendicular direction
    const leftBank = [];
    const rightBank = [];

    for (let i = 0; i < points.length; i++) {
        let angle;
        if (i === 0) {
            // First point: use direction to next point
            angle = Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x);
        } else if (i === points.length - 1) {
            // Last point: use direction from previous point
            angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
        } else {
            // Interior point: average of incoming and outgoing angles
            const inAngle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
            const outAngle = Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x);
            // Average the angles (handle wrap-around)
            let diff = outAngle - inAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            angle = inAngle + diff / 2;
        }

        const perpX = -Math.sin(angle) * hw;
        const perpY = Math.cos(angle) * hw;

        leftBank.push({ x: points[i].x + perpX, y: points[i].y + perpY });
        rightBank.push({ x: points[i].x - perpX, y: points[i].y - perpY });
    }

    // Draw creek bed (slightly wider than water)
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.moveTo(leftBank[0].x - 2, leftBank[0].y - 2);
    for (let i = 1; i < leftBank.length; i++) {
        ctx.lineTo(leftBank[i].x - 2, leftBank[i].y - 2);
    }
    // Round the end
    const last = points[points.length - 1];
    const lastAngle = Math.atan2(points[points.length - 1].y - points[points.length - 2].y, points[points.length - 1].x - points[points.length - 2].x);
    ctx.arc(last.x, last.y, hw + 2, lastAngle - Math.PI / 2, lastAngle + Math.PI / 2);
    // Back along right bank
    for (let i = rightBank.length - 1; i >= 1; i--) {
        ctx.lineTo(rightBank[i].x + 2, rightBank[i].y + 2);
    }
    // Round the start
    const first = points[0];
    const firstAngle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
    ctx.arc(first.x, first.y, hw + 2, firstAngle + Math.PI / 2, firstAngle + Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();

    // Draw water
    const waterGrad = ctx.createLinearGradient(
        points[0].x, points[0].y,
        points[points.length - 1].x, points[points.length - 1].y
    );
    waterGrad.addColorStop(0, '#42A5F5');
    waterGrad.addColorStop(0.3, '#64B5F6');
    waterGrad.addColorStop(0.5, '#1E88E5');
    waterGrad.addColorStop(0.7, '#64B5F6');
    waterGrad.addColorStop(1, '#42A5F5');
    ctx.fillStyle = waterGrad;

    ctx.beginPath();
    ctx.moveTo(leftBank[0].x, leftBank[0].y);
    for (let i = 1; i < leftBank.length; i++) {
        ctx.lineTo(leftBank[i].x, leftBank[i].y);
    }
    ctx.arc(last.x, last.y, hw, lastAngle - Math.PI / 2, lastAngle + Math.PI / 2);
    for (let i = rightBank.length - 1; i >= 1; i--) {
        ctx.lineTo(rightBank[i].x, rightBank[i].y);
    }
    ctx.arc(first.x, first.y, hw, firstAngle + Math.PI / 2, firstAngle + Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();

    // Shimmer lines along centerline
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let offset = -hw * 0.4; offset <= hw * 0.4; offset += hw * 0.4) {
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            let angle;
            if (i < points.length - 1) {
                angle = Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x);
            } else {
                angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
            }
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            const px = points[i].x + perpX;
            const py = points[i].y + perpY;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // Pebbles at edges (sparse)
    ctx.fillStyle = '#BDBDBD';
    for (let i = 0; i < points.length; i += 3) {
        const p = points[i];
        let angle;
        if (i < points.length - 1) {
            angle = Math.atan2(points[i + 1].y - p.y, points[i + 1].x - p.x);
        } else {
            angle = Math.atan2(p.y - points[i - 1].y, p.x - points[i - 1].x);
        }
        const perpX = -Math.sin(angle) * (hw + 3);
        const perpY = Math.cos(angle) * (hw + 3);
        ctx.beginPath();
        ctx.arc(p.x + perpX, p.y + perpY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x - perpX, p.y - perpY, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================================
// Main render
// ============================================================

function renderMap(ctx) {
    const now = Date.now();

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            const type = GRID_DATA[row][col];
            const cx = x + CELL_SIZE / 2;
            const cy = y + CELL_SIZE / 2;

            if (type === CELL_PATH) {
                // Dirt path
                ctx.fillStyle = '#C4A46C';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                // Inner path with texture
                ctx.fillStyle = '#D4B87C';
                ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                // Subtle path ruts
                ctx.strokeStyle = 'rgba(139,90,43,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 4, y + CELL_SIZE * 0.35);
                ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE * 0.35);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 4, y + CELL_SIZE * 0.65);
                ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE * 0.65);
                ctx.stroke();

            } else if (type === CELL_BLOCKED) {
                // Grass base underneath
                ctx.fillStyle = ((row + col) % 2 === 0) ? COLOR_GRASS : COLOR_GRASS_ALT;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                // Draw decoration based on type
                const decoType = DECO_MAP[row + ',' + col] || BLOCKED_TREE;
                const seed = row * 100 + col;

                if (decoType === BLOCKED_TREE) {
                    drawTree(ctx, cx, cy + 4, 18, seed);
                } else if (decoType === BLOCKED_HOUSE) {
                    drawHouse(ctx, cx, cy + 4, 18);
                } else {
                    drawRock(ctx, cx, cy + 6, 16, seed);
                }
            } else {
                // Buildable grass with variation
                const shade = ((row + col) % 2 === 0) ? COLOR_GRASS : COLOR_GRASS_ALT;
                ctx.fillStyle = shade;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                // Random grass tufts
                const r = seededRand(row * 1000 + col);
                if (r > 0.7) {
                    ctx.strokeStyle = 'rgba(50,120,40,0.25)';
                    ctx.lineWidth = 1;
                    const tufts = Math.floor(r * 5) + 1;
                    for (let t = 0; t < tufts; t++) {
                        const tx = x + 6 + seededRand(row * 1000 + col + t * 31) * (CELL_SIZE - 12);
                        const ty = y + 8 + seededRand(row * 1000 + col + t * 47) * (CELL_SIZE - 16);
                        ctx.beginPath();
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx - 3, ty + 6);
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + 1, ty + 7);
                        ctx.moveTo(tx, ty);
                        ctx.lineTo(tx + 3, ty + 5);
                        ctx.stroke();
                    }
                }

                // Occasional tiny flower
                if (r > 0.92) {
                    const fx = x + 8 + seededRand(row * 777 + col) * (CELL_SIZE - 16);
                    const fy = y + 8 + seededRand(row * 888 + col) * (CELL_SIZE - 16);
                    ctx.fillStyle = '#FFEB3B';
                    ctx.beginPath();
                    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#FFF9C4';
                    ctx.beginPath();
                    ctx.arc(fx - 1.5, fy - 0.5, 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(fx + 1.5, fy + 0.5, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Very subtle grid line
            ctx.strokeStyle = 'rgba(0,0,0,0.06)';
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
    }

    // Draw creek as one seamless L-shape using a single filled path
    const cx = 14 * CELL_SIZE + CELL_SIZE * 0.1;
    const cw = CELL_SIZE * 0.8;
    const cy = 12 * CELL_SIZE + CELL_SIZE * 0.1;
    const ch = CELL_SIZE * 0.8;
    const leftX = 4 * CELL_SIZE;

    // Single L-shaped creek bed
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx + cw, 0);
    ctx.lineTo(cx + cw, cy + ch);
    ctx.lineTo(leftX, cy + ch);
    ctx.lineTo(leftX, cy);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Single L-shaped water
    const grad = ctx.createLinearGradient(cx, 0, leftX, cy + ch);
    grad.addColorStop(0, '#42A5F5');
    grad.addColorStop(0.3, '#64B5F6');
    grad.addColorStop(0.5, '#1E88E5');
    grad.addColorStop(0.7, '#64B5F6');
    grad.addColorStop(1, '#42A5F5');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx + 2, 3);
    ctx.lineTo(cx + cw - 2, 3);
    ctx.lineTo(cx + cw - 2, cy + ch - 3);
    ctx.lineTo(leftX + 3, cy + ch - 3);
    ctx.lineTo(leftX + 3, cy + 3);
    ctx.lineTo(cx + 2, cy + 3);
    ctx.closePath();
    ctx.fill();

    // Shimmer lines along vertical part
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
        const sx = cx + 6 + i * (cw - 12);
        ctx.beginPath();
        ctx.moveTo(sx, 4);
        for (let sy = 4; sy < cy; sy += 4) {
            ctx.lineTo(sx + Math.sin(sy * 0.3) * 3, sy);
        }
        ctx.stroke();
    }
    // Shimmer lines along horizontal part
    for (let i = 0; i < 2; i++) {
        const sy = cy + 6 + i * (ch - 12);
        ctx.beginPath();
        ctx.moveTo(cx + 4, sy);
        for (let sx = cx + 4; sx > leftX + 4; sx -= 4) {
            ctx.lineTo(sx, sy + Math.sin(sx * 0.2) * 3);
        }
        ctx.stroke();
    }

    // Scattered pebbles
    ctx.fillStyle = '#BDBDBD';
    const pebbleSpots = [
        { x: cx + cw / 2, y: cy * 0.3 }, { x: cx + cw / 2, y: cy * 0.6 },
        { x: cx - cw * 0.3, y: cy + ch / 2 }, { x: cx - cw * 2, y: cy + ch / 2 },
        { x: cx - cw * 5, y: cy + ch / 2 }, { x: cx - cw * 8, y: cy + ch / 2 },
    ];
    for (const p of pebbleSpots) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Draw bridges at every creek-path intersection
    for (const bc of BRIDGE_CELLS) {
        const bx = bc.c * CELL_SIZE + CELL_SIZE / 2;
        const by = bc.r * CELL_SIZE + CELL_SIZE / 2;
        drawBridge(ctx, bx, by, CELL_SIZE * 0.9);
    }

    // Spawn: draw a gate
    const spawnCell = PATH_CELLS[0];
    const sx = spawnCell.c * CELL_SIZE + CELL_SIZE / 2;
    const sy = spawnCell.r * CELL_SIZE + CELL_SIZE / 2;
    drawGate(ctx, sx, sy + 4, 18);

    // Base: draw a castle
    const baseCell = PATH_CELLS[PATH_CELLS.length - 1];
    const ex = baseCell.c * CELL_SIZE + CELL_SIZE / 2;
    const ey = baseCell.r * CELL_SIZE + CELL_SIZE / 2 - 2;
    drawCastle(ctx, ex, ey, 20);
}

// Draw path direction arrows (subtle)
function renderPathArrows(ctx) {
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
        const from = WAYPOINTS[i];
        const to = WAYPOINTS[i + 1];
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(-3, -2);
        ctx.lineTo(-3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}
