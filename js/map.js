// ============================================================
// Map Core — Grid system, shared drawing helpers, map registry
// Individual maps register themselves via MAP_DEFS[id] = {...}
// ============================================================

// --- Active globals (set by setActiveMap) ---
let PATH_CELLS = [];
let CREEK_CELLS = new Set();
let BRIDGE_CELLS = [];
let DECORATIONS = [];
let DECO_MAP = {};
let GRID_DATA = [];
let WAYPOINTS = [];
let SMOOTH_PATH_POINTS = []; // Simplified waypoints for smooth rendering
let SPAWN_POS = { x: 0, y: 0 };
let BASE_POS = { x: 0, y: 0 };
let ACTIVE_MAP_ID = 'crossroads';
let renderMap = function(ctx) {};
let renderPathArrows = function(ctx) {};

// ============================================================
// Shared Grid Helpers
// ============================================================

function seededRand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

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

function cellsToWaypoints(pathCells) {
    return pathCells.map(cell => ({
        x: (cell.c + 0.5) * CELL_SIZE,
        y: (cell.r + 0.5) * CELL_SIZE
    }));
}

function getCell(px, py) {
    const col = Math.floor(px / CELL_SIZE);
    const row = Math.floor(py / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row, x: col * CELL_SIZE, y: row * CELL_SIZE,
        type: GRID_DATA[row][col], isBuildable: GRID_DATA[row][col] === CELL_BUILDABLE };
}

function canPlaceTower(col, row, existingTowers) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    if (GRID_DATA[row][col] !== CELL_BUILDABLE) return false;
    for (const t of existingTowers) { if (t.col === col && t.row === row) return false; }
    return true;
}

// ============================================================
// Smooth Path Renderer — draws continuous rounded ribbon instead
// of individual square tiles. Called by all maps.
// ============================================================

// Default path colors per terrain type — maps can override
const PATH_COLORS = {
    dirt:      { fill: '#B8956A', edge: '#8B6F4E', center: '#C4A97A' },
    ice:       { fill: '#6B8092', edge: '#4A5F70', center: '#8BA0B0' },
    cobble:    { fill: '#9E948A', edge: '#6E645A', center: '#B0A69C' },
    sand:      { fill: '#C9AD8A', edge: '#9E8260', center: '#D8C0A0' },
    lava:      { fill: '#2A2A2A', edge: '#1A1A1A', center: '#3A3A3A' },
    lunar:     { fill: '#9E9E9E', edge: '#6E6E6E', center: '#B0B0B0' },
    jungle:    { fill: '#8B7D5E', edge: '#5E5038', center: '#A09070' },
    coastal:   { fill: '#C4A46C', edge: '#8B6F4E', center: '#D4B87C' },
};

function renderSmoothPath(ctx, pathType, cornerRadius) {
    const wp = (typeof SMOOTH_PATH_POINTS !== 'undefined' && SMOOTH_PATH_POINTS.length >= 2)
        ? SMOOTH_PATH_POINTS : WAYPOINTS;
    if (!wp || wp.length < 2) return;

    const colors = PATH_COLORS[pathType] || PATH_COLORS.dirt;
    const r = cornerRadius || 12;
    const pathWidth = CELL_SIZE * 0.76; // ~30px — leaves terrain shoulder
    const halfW = pathWidth / 2;

    // ---- Draw path drop-shadow (depth effect) ----
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    _buildPathGeometry(ctx, wp, halfW, r, 3, 3); // offset shadow
    ctx.fill();
    ctx.restore();

    // ---- Draw path base fill ----
    ctx.save();
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    _buildPathGeometry(ctx, wp, halfW, r, 0, 0);
    ctx.fill();

    // ---- Path edge stroke ----
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ---- Lighter center stripe (worn path look) ----
    ctx.strokeStyle = colors.center;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = halfW * 0.5;
    ctx.beginPath();
    _buildPathGeometry(ctx, wp, halfW * 0.25, r, 0, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ---- Subtle inner shadow on edges ----
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    _buildPathGeometry(ctx, wp, halfW - 1, r, 0, 0);
    ctx.stroke();
    ctx.restore();
}

// Build the geometric path outline for the smooth ribbon.
// offsetX/Y shifts the entire path (for drop shadow).
function _buildPathGeometry(ctx, waypoints, halfWidth, cornerRadius, offsetX, offsetY) {
    if (waypoints.length < 2) return;

    const ox = offsetX || 0;
    const oy = offsetY || 0;

    // Compute offset normals for each waypoint to build a thick path outline
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i < waypoints.length; i++) {
        let nx, ny;
        if (i === 0) {
            // First point: use direction to next point
            const dx = waypoints[i + 1].x - waypoints[i].x;
            const dy = waypoints[i + 1].y - waypoints[i].y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            nx = -dy / len;
            ny = dx / len;
        } else if (i === waypoints.length - 1) {
            // Last point: use direction from previous point
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            nx = -dy / len;
            ny = dx / len;
        } else {
            // Interior point: average of incoming and outgoing normals
            const dx1 = waypoints[i].x - waypoints[i - 1].x;
            const dy1 = waypoints[i].y - waypoints[i - 1].y;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
            const nx1 = -dy1 / len1;
            const ny1 = dx1 / len1;

            const dx2 = waypoints[i + 1].x - waypoints[i].x;
            const dy2 = waypoints[i + 1].y - waypoints[i].y;
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
            const nx2 = -dy2 / len2;
            const ny2 = dx2 / len2;

            nx = (nx1 + nx2) / 2;
            ny = (ny1 + ny2) / 2;
            const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
            nx /= nlen;
            ny /= nlen;
        }
        leftPts.push({ x: waypoints[i].x + nx * halfWidth + ox, y: waypoints[i].y + ny * halfWidth + oy });
        rightPts.push({ x: waypoints[i].x - nx * halfWidth + ox, y: waypoints[i].y - ny * halfWidth + oy });
    }

    // Build left side of the path (forward), closing with right side (backward)
    ctx.moveTo(leftPts[0].x, leftPts[0].y);

    for (let i = 1; i < leftPts.length; i++) {
        // Detect if we're at a turn — use arcTo for smooth corners
        if (i > 0 && i < leftPts.length - 1) {
            const prev = leftPts[i - 1];
            const curr = leftPts[i];
            const next = leftPts[i + 1];
            // Check if direction changes significantly
            const d1x = curr.x - prev.x, d1y = curr.y - prev.y;
            const d2x = next.x - curr.x, d2y = next.y - curr.y;
            const dot = (d1x * d2x + d1y * d2y) / (Math.sqrt(d1x*d1x+d1y*d1y) * Math.sqrt(d2x*d2x+d2y*d2y) + 0.001);
            if (dot < 0.99) {
                ctx.arcTo(curr.x, curr.y, next.x, next.y, cornerRadius);
                continue;
            }
        }
        ctx.lineTo(leftPts[i].x, leftPts[i].y);
    }

    // Connect to right side (end cap)
    const lastL = leftPts[leftPts.length - 1];
    const lastR = rightPts[rightPts.length - 1];
    ctx.lineTo(lastR.x, lastR.y);

    // Build right side (backward)
    for (let i = rightPts.length - 2; i >= 0; i--) {
        if (i > 0 && i < rightPts.length - 1) {
            const prev = rightPts[i + 1];
            const curr = rightPts[i];
            const next = rightPts[i - 1];
            const d1x = curr.x - prev.x, d1y = curr.y - prev.y;
            const d2x = next.x - curr.x, d2y = next.y - curr.y;
            const dot = (d1x * d2x + d1y * d2y) / (Math.sqrt(d1x*d1x+d1y*d1y) * Math.sqrt(d2x*d2x+d2y*d2y) + 0.001);
            if (dot < 0.99) {
                ctx.arcTo(curr.x, curr.y, next.x, next.y, cornerRadius);
                continue;
            }
        }
        ctx.lineTo(rightPts[i].x, rightPts[i].y);
    }

    ctx.closePath();
}

// ============================================================
// Waypoint Simplifier — removes redundant collinear waypoints
// to create longer, more natural path segments
// ============================================================

function simplifyWaypoints(waypoints) {
    if (!waypoints || waypoints.length <= 2) return waypoints;

    const simplified = [waypoints[0]];
    for (let i = 1; i < waypoints.length - 1; i++) {
        const prev = waypoints[i - 1];
        const curr = waypoints[i];
        const next = waypoints[i + 1];

        // Check if curr is collinear with prev and next
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;

        // Cross product near zero = collinear
        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) > 0.01) {
            // Direction changes — keep this waypoint
            simplified.push(curr);
        }
        // If collinear, skip (remove redundant waypoint)
    }
    simplified.push(waypoints[waypoints.length - 1]);
    return simplified;
}

// ============================================================
// Shared Drawing Helpers — used by all maps
// ============================================================

function drawTree(ctx, x, y, size, seed) {
    const s = size;
    const trunkW = s * 0.2, trunkH = s * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.55, s * 0.55, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6D4C41'; ctx.fillRect(x - trunkW / 2, y - trunkH * 0.3, trunkW, trunkH);
    ctx.fillStyle = '#5D4037'; ctx.fillRect(x - trunkW / 2, y - trunkH * 0.3, trunkW * 0.6, trunkH);
    const canopyColors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50'];
    for (let layer = 0; layer < 3; layer++) {
        const cy = y - trunkH * 0.5 - layer * s * 0.25;
        const cr = s * 0.55 - layer * s * 0.08;
        const cx = x + (seededRand(seed + layer * 10) - 0.5) * s * 0.2;
        ctx.fillStyle = canopyColors[layer + 1];
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = canopyColors[3];
        ctx.beginPath(); ctx.arc(cx - cr * 0.25, cy - cr * 0.25, cr * 0.5, 0, Math.PI * 2); ctx.fill();
    }
}

function drawRock(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.5, s * 0.5, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9E9E9E'; ctx.beginPath();
    const numPoints = 7;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = s * 0.42 * (0.7 + seededRand(seed + i * 3) * 0.6);
        const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#BDBDBD'; ctx.beginPath(); ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#757575'; ctx.lineWidth = 0.8; ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y + s * 0.1); ctx.lineTo(x + s * 0.15, y - s * 0.2); ctx.lineTo(x + s * 0.05, y - s * 0.3); ctx.stroke();
}

function drawCastle(ctx, x, y, size) {
    const s = size;
    const hp = (typeof window !== 'undefined' && window._castleHPPercent !== undefined) ? window._castleHPPercent : 1.0;
    const damageAlpha = (1 - hp) * 0.6;
    const wallColor = hp < 0.3 ? '#6D4C41' : hp < 0.6 ? '#7B5B4C' : '#8D6E63';
    const towerColor = hp < 0.3 ? '#7B6B60' : hp < 0.6 ? '#8C7B6F' : '#A1887F';
    ctx.fillStyle = wallColor; ctx.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.9);
    ctx.fillStyle = towerColor; ctx.fillRect(x - s * 0.25, y - s * 0.85, s * 0.5, s * 0.75);
    ctx.fillStyle = hp < 0.3 ? '#757575' : '#9E9E9E';
    ctx.fillRect(x - s * 0.7, y - s * 0.5, s * 0.3, s * 0.4); ctx.fillRect(x + s * 0.4, y - s * 0.5, s * 0.3, s * 0.4);
    ctx.fillStyle = '#BCAAA4';
    for (let bx = -0.2; bx <= 0.2; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.04, y - s * 0.95, s * 0.08, s * 0.12);
    if (hp > 0.25) { for (let bx = -0.55; bx <= -0.45; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.03, y - s * 0.58, s * 0.06, s * 0.1); }
    for (let bx = 0.45; bx <= 0.65; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.03, y - s * 0.58, s * 0.06, s * 0.1);
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.12, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - s * 0.12, y - s * 0.05, s * 0.24, s * 0.12);
    const windowColor = hp < 0.5 ? '#FF5252' : '#FFE082';
    ctx.fillStyle = windowColor; ctx.beginPath(); ctx.arc(x, y - s * 0.5, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - s * 0.95); ctx.lineTo(x, y - s * 1.25); ctx.stroke();
    const flagColor = hp < 0.3 ? '#9E9E9E' : '#E53935';
    ctx.fillStyle = flagColor; ctx.beginPath();
    if (hp > 0.3) { ctx.moveTo(x, y - s * 1.25); ctx.lineTo(x + s * 0.15, y - s * 1.18); ctx.lineTo(x, y - s * 1.1); }
    else { ctx.moveTo(x, y - s * 1.25); ctx.lineTo(x + s * 0.08, y - s * 1.2); ctx.lineTo(x + s * 0.02, y - s * 1.15); ctx.lineTo(x + s * 0.1, y - s * 1.12); ctx.lineTo(x, y - s * 1.1); }
    ctx.fill();
    if (hp < 0.6) {
        ctx.strokeStyle = 'rgba(0,0,0,' + ((1 - hp) * 0.5) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s * 0.8); ctx.lineTo(x + s * 0.05, y - s * 0.6); ctx.lineTo(x + s * 0.15, y - s * 0.5); ctx.stroke();
        if (hp < 0.35) { ctx.beginPath(); ctx.moveTo(x + s * 0.2, y - s * 0.3); ctx.lineTo(x + s * 0.1, y - s * 0.15); ctx.lineTo(x + s * 0.15, y - s * 0.05); ctx.stroke(); }
    }
    if (damageAlpha > 0) { ctx.fillStyle = 'rgba(80,0,0,' + damageAlpha + ')'; ctx.fillRect(x - s * 0.7, y - s * 0.95, s * 1.4, s * 1.3); }
}

function drawGate(ctx, x, y, size) {
    const s = size;
    ctx.fillStyle = '#9E9E9E'; ctx.fillRect(x - s * 0.4, y - s * 0.5, s * 0.2, s * 0.5); ctx.fillRect(x + s * 0.2, y - s * 0.5, s * 0.2, s * 0.5);
    ctx.fillStyle = '#BDBDBD'; ctx.fillRect(x - s * 0.45, y - s * 0.6, s * 0.3, s * 0.12); ctx.fillRect(x + s * 0.15, y - s * 0.6, s * 0.3, s * 0.12);
    ctx.strokeStyle = '#757575'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - s * 0.45, s * 0.3, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#3E2723'; ctx.fillRect(x - s * 0.25, y - s * 0.1, s * 0.5, s * 0.1);
    const flicker = Math.sin(Date.now() / 200) * 0.2 + 0.8;
    ctx.fillStyle = 'rgba(255,160,0,' + flicker + ')'; ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.45, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,100,0.3)'; ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.45, s * 0.2, 0, Math.PI * 2); ctx.fill();
}

function drawHouse(ctx, x, y, size) {
    const s = size;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.45, s * 0.5, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E8D5B7'; ctx.fillRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.5; ctx.strokeRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    ctx.beginPath(); ctx.moveTo(x - s * 0.35, y + s * 0.15); ctx.lineTo(x + s * 0.35, y + s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x, y + s * 0.4); ctx.stroke();
    ctx.fillStyle = '#C62828'; ctx.beginPath(); ctx.moveTo(x - s * 0.42, y - s * 0.08); ctx.lineTo(x, y - s * 0.55); ctx.lineTo(x + s * 0.42, y - s * 0.08); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#B71C1C'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.55); ctx.lineTo(x, y - s * 0.08); ctx.stroke();
    ctx.fillStyle = '#5D4037'; ctx.fillRect(x - s * 0.08, y + s * 0.05, s * 0.16, s * 0.32);
    ctx.fillStyle = '#FFC107'; ctx.beginPath(); ctx.arc(x + s * 0.05, y + s * 0.2, s * 0.02, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#81D4FA'; ctx.fillRect(x + s * 0.12, y - s * 0.02, s * 0.13, s * 0.12);
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1; ctx.strokeRect(x + s * 0.12, y - s * 0.02, s * 0.13, s * 0.12);
    ctx.beginPath(); ctx.moveTo(x + s * 0.185, y - s * 0.02); ctx.lineTo(x + s * 0.185, y + s * 0.1); ctx.stroke();
    ctx.fillStyle = '#9E9E9E'; ctx.fillRect(x + s * 0.15, y - s * 0.5, s * 0.1, s * 0.2);
    ctx.fillStyle = 'rgba(200,200,200,0.4)'; ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.58, s * 0.08, 0, Math.PI * 2); ctx.fill();
}

function drawBridge(ctx, x, y, size) {
    const s = size; const w = s * 0.9, h = s * 0.45;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - w/2 + 3, y - h/2 + 3, w, h);
    ctx.fillStyle = '#6D4C41'; ctx.fillRect(x - w/2, y - h/2, w, h);
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 0.8;
    for (let py = y - h/2 + 3; py < y + h/2; py += 3.5) { ctx.beginPath(); ctx.moveTo(x - w/2, py); ctx.lineTo(x + w/2, py); ctx.stroke(); }
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x - w/2, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x - w/2 + 6, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x - w/2 + 12, y - h/2 - 8, 2.5, h + 8);
    ctx.fillRect(x + w/2 - 2.5, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x + w/2 - 8.5, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x + w/2 - 14.5, y - h/2 - 8, 2.5, h + 8);
    ctx.fillStyle = '#A1887F'; ctx.fillRect(x - w/2 - 1, y - h/2 - 8, w + 2, 3); ctx.fillRect(x - w/2 - 1, y + h/2 - 1, w + 2, 3);
    ctx.fillRect(x - w/2, y - h/2 - 6, 2, h + 8); ctx.fillRect(x + w/2 - 2, y - h/2 - 6, 2, h + 8);
}

// --- Terrain feature helpers ---

function drawMountain(ctx, x, y, w, h, seed) {
    const r1 = seededRand(seed), r2 = seededRand(seed + 7);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath();
    ctx.moveTo(x - w/2 + 4, y + 6); ctx.lineTo(x + 4, y - h + 4); ctx.lineTo(x + w/2 + 4, y + 6); ctx.closePath(); ctx.fill();
    const leftPeak = x - w * 0.08 + r1 * w * 0.1, rightPeak = x + w * 0.05 + r2 * w * 0.08;
    ctx.fillStyle = '#546E7A'; ctx.beginPath(); ctx.moveTo(x - w/2, y); ctx.lineTo(leftPeak, y - h); ctx.lineTo(rightPeak, y - h + h * 0.04); ctx.lineTo(x + w/2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.moveTo(x - w/2, y); ctx.lineTo(leftPeak, y - h); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#78909C'; ctx.beginPath(); ctx.moveTo(x + w/2, y); ctx.lineTo(rightPeak, y - h + h * 0.04); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    const snowH = h * 0.28;
    ctx.fillStyle = '#ECEFF1'; ctx.beginPath(); ctx.moveTo(x - w * 0.22, y - h + snowH); ctx.lineTo(leftPeak, y - h); ctx.lineTo(rightPeak, y - h + h * 0.04); ctx.lineTo(x + w * 0.18, y - h + snowH * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(leftPeak - w * 0.04, y - h + snowH * 0.3, w * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#37474F'; ctx.fillRect(x - w/2, y - 2, w, 5);
}

function drawIceCrystal(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = 'rgba(150,200,230,0.3)'; ctx.beginPath(); ctx.ellipse(x + 1, y + s * 0.4, s * 0.4, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    const angles = [-1.2, -0.5, 0.1, 0.7], lengths = [s*0.8, s*1.1, s*0.65, s*0.9], widths = [s*0.12, s*0.15, s*0.10, s*0.13];
    for (let i = 0; i < angles.length; i++) {
        const angle = angles[i] + seededRand(seed + i * 13) * 0.3, len = lengths[i] * (0.8 + seededRand(seed + i * 7) * 0.4), wid = widths[i];
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        const grad = ctx.createLinearGradient(0, -len/2, 0, len/2);
        grad.addColorStop(0, 'rgba(200,230,255,0.85)'); grad.addColorStop(0.5, 'rgba(180,210,240,0.7)'); grad.addColorStop(1, 'rgba(140,180,220,0.5)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, -len/2); ctx.lineTo(-wid, len/3); ctx.lineTo(-wid*0.3, len/2); ctx.lineTo(wid*0.3, len/2); ctx.lineTo(wid, len/3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -len/2+2); ctx.lineTo(0, len/2-2); ctx.stroke();
        ctx.restore();
    }
    ctx.fillStyle = 'rgba(200,230,255,0.5)'; ctx.beginPath(); ctx.arc(x, y, s * 0.15, 0, Math.PI * 2); ctx.fill();
}

function drawSnowdrift(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.ellipse(x + 2, y + h * 0.7, w/2, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#F5F7FA'); grad.addColorStop(0.6, '#E8ECF0'); grad.addColorStop(1, '#D5DDE5');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x - w/2, y + h * 0.3); ctx.quadraticCurveTo(x - w/4, y - h * 0.1, x, y);
    ctx.quadraticCurveTo(x + w/4, y - h * 0.05, x + w/2, y + h * 0.35); ctx.quadraticCurveTo(x + w/3, y + h, x, y + h);
    ctx.quadraticCurveTo(x - w/3, y + h, x - w/2, y + h * 0.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - w * 0.08, y + h * 0.05, w * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawStoneWallSegment(ctx, x, y, w, h, seed) {
    ctx.fillStyle = '#616161'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#424242'; ctx.lineWidth = 1;
    const blockH = h / 3;
    for (let row = 0; row < 3; row++) {
        const by = y + row * blockH;
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
        const offset = (row % 2) * w * 0.25;
        for (let bx = x + offset; bx < x + w; bx += w * 0.45) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + blockH); ctx.stroke(); }
    }
    const bw = w / 4;
    ctx.fillStyle = '#757575';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i * bw, y - h * 0.3, bw * 0.65, h * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x, y, w, h);
}

function drawWatchtower(ctx, x, y, size) {
    const s = size;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.55, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#757575'; ctx.fillRect(x - s * 0.25, y - s * 0.5, s * 0.5, s * 0.55);
    ctx.strokeStyle = '#616161'; ctx.lineWidth = 0.8;
    for (let ly = y - s * 0.4; ly < y + s * 0.05; ly += s * 0.12) { ctx.beginPath(); ctx.moveTo(x - s*0.25, ly); ctx.lineTo(x + s*0.25, ly); ctx.stroke(); }
    ctx.fillStyle = '#616161'; ctx.fillRect(x - s * 0.28, y - s * 0.75, s * 0.56, s * 0.28);
    ctx.fillStyle = '#9E9E9E';
    for (let bx = -0.2; bx <= 0.2; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.04, y - s * 0.85, s * 0.07, s * 0.12);
    ctx.fillStyle = '#212121'; ctx.fillRect(x - 1.5, y - s * 0.4, 3, s * 0.2);
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.75); ctx.lineTo(x, y - s * 1.15); ctx.lineTo(x + s * 0.32, y - s * 0.75); ctx.closePath(); ctx.fill();
}

// --- Animal drawing helpers ---

function drawBird(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = '#5D4037'; ctx.beginPath(); ctx.ellipse(x, y, s*0.35, s*0.2, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.arc(x + s*0.3, y - s*0.08, s*0.15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s*0.35, y - s*0.12, s*0.06, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.36, y - s*0.12, s*0.03, 0, Math.PI*2); ctx.fill();
    const wingFlap = Math.sin(Date.now() / 300 + seed) * 0.3;
    ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.ellipse(x - s*0.05, y - s*0.22 - wingFlap*s, s*0.3, s*0.1, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.moveTo(x - s*0.3, y); ctx.lineTo(x - s*0.55, y - s*0.15); ctx.lineTo(x - s*0.35, y + s*0.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8F00'; ctx.beginPath(); ctx.moveTo(x + s*0.42, y - s*0.1); ctx.lineTo(x + s*0.58, y - s*0.06); ctx.lineTo(x + s*0.42, y - s*0.02); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#FF8F00'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - s*0.05, y + s*0.12); ctx.lineTo(x - s*0.02, y + s*0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s*0.1, y + s*0.1); ctx.lineTo(x + s*0.13, y + s*0.26); ctx.stroke();
}

function drawRabbit(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = '#A1887F'; ctx.beginPath(); ctx.ellipse(x, y, s*0.3, s*0.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.arc(x + s*0.25, y - s*0.1, s*0.16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.ellipse(x + s*0.2, y - s*0.38, s*0.06, s*0.16, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F5C6CB'; ctx.beginPath(); ctx.ellipse(x + s*0.2, y - s*0.36, s*0.03, s*0.1, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.ellipse(x + s*0.3, y - s*0.4, s*0.06, s*0.16, 0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F5C6CB'; ctx.beginPath(); ctx.ellipse(x + s*0.3, y - s*0.38, s*0.03, s*0.1, 0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.32, y - s*0.15, s*0.04, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F48FB1'; ctx.beginPath(); ctx.arc(x + s*0.39, y - s*0.1, s*0.03, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.arc(x - s*0.3, y - s*0.05, s*0.09, 0, Math.PI*2); ctx.fill();
}

function drawDeer(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(x, y, s*0.45, s*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#A1887F'; ctx.fillRect(x + s*0.2, y - s*0.45, s*0.12, s*0.3);
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.arc(x + s*0.28, y - s*0.5, s*0.13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.34, y - s*0.55, s*0.035, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + s*0.25, y - s*0.6); ctx.lineTo(x + s*0.15, y - s*0.85); ctx.moveTo(x + s*0.2, y - s*0.72); ctx.lineTo(x + s*0.08, y - s*0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s*0.3, y - s*0.6); ctx.lineTo(x + s*0.4, y - s*0.85); ctx.moveTo(x + s*0.35, y - s*0.72); ctx.lineTo(x + s*0.48, y - s*0.78); ctx.stroke();
    ctx.strokeStyle = '#6D4C41'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - s*0.15, y + s*0.2); ctx.lineTo(x - s*0.18, y + s*0.55); ctx.moveTo(x - s*0.05, y + s*0.2); ctx.lineTo(x - s*0.02, y + s*0.55);
    ctx.moveTo(x + s*0.1, y + s*0.2); ctx.lineTo(x + s*0.13, y + s*0.5); ctx.moveTo(x + s*0.2, y + s*0.18); ctx.lineTo(x + s*0.25, y + s*0.48); ctx.stroke();
    ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.arc(x - s*0.4, y - s*0.1, s*0.08, 0, Math.PI*2); ctx.fill();
}

// --- New decoration helpers for additional maps ---

function drawPalmTree(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 3, y + s*0.4, s*0.4, s*0.12, 0, 0, Math.PI*2); ctx.fill();
    // Curved trunk
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = s*0.15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + s*0.35); ctx.quadraticCurveTo(x + s*0.05, y - s*0.1, x + s*0.15, y - s*0.5); ctx.stroke();
    ctx.strokeStyle = '#6D4C41'; ctx.lineWidth = s*0.08;
    ctx.beginPath(); ctx.moveTo(x, y + s*0.35); ctx.quadraticCurveTo(x + s*0.05, y - s*0.1, x + s*0.15, y - s*0.5); ctx.stroke();
    // Fronds
    const frondColors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A'];
    for (let i = 0; i < 7; i++) {
        const angle = -Math.PI/2 + (i - 3) * 0.35 + seededRand(seed + i*7) * 0.2;
        const len = s * (0.4 + seededRand(seed + i*13) * 0.3);
        ctx.save(); ctx.translate(x + s*0.15, y - s*0.5); ctx.rotate(angle);
        ctx.fillStyle = frondColors[i % frondColors.length];
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len*0.3, -len*0.15, len, -len*0.05);
        ctx.quadraticCurveTo(len*0.5, 2, 0, 0); ctx.fill();
        ctx.restore();
    }
}

function drawCactus(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(x - s*0.1, y - s*0.6, s*0.2, s*0.65);
    ctx.fillStyle = '#388E3C'; ctx.fillRect(x - s*0.06, y - s*0.55, s*0.05, s*0.55);
    // Arms
    const armSide = seededRand(seed) > 0.5 ? 1 : -1;
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(x + armSide*s*0.1, y - s*0.35, armSide*s*0.25, s*0.12);
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(x + armSide*s*0.25, y - s*0.55, s*0.1, s*0.3);
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(x + armSide*s*0.25 + armSide*0.01, y - s*0.5, s*0.03, s*0.2);
    // Spines
    ctx.fillStyle = '#FFEB3B';
    for (let i = 0; i < 4; i++) {
        const sy = y - s*0.5 + i * s*0.15;
        ctx.beginPath(); ctx.arc(x, sy, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + armSide*s*0.32, sy - s*0.22, 1, 0, Math.PI*2); ctx.fill();
    }
}

function drawTempleRuin(ctx, x, y, size, seed) {
    const s = size;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s*0.5, s*0.5, s*0.15, 0, 0, Math.PI*2); ctx.fill();
    // Stone base
    ctx.fillStyle = '#8a8070'; ctx.fillRect(x - s*0.4, y - s*0.15, s*0.8, s*0.35);
    ctx.strokeStyle = '#6d6458'; ctx.lineWidth = 1;
    ctx.strokeRect(x - s*0.4, y - s*0.15, s*0.8, s*0.35);
    ctx.beginPath(); ctx.moveTo(x - s*0.4, y - s*0.05); ctx.lineTo(x + s*0.4, y - s*0.05); ctx.stroke();
    // Columns
    for (let i = 0; i < 3; i++) {
        const cx = x - s*0.25 + i * s*0.25;
        ctx.fillStyle = '#9e9488'; ctx.fillRect(cx - s*0.06, y - s*0.55, s*0.12, s*0.4);
        ctx.strokeStyle = '#6d6458'; ctx.lineWidth = 0.6; ctx.strokeRect(cx - s*0.06, y - s*0.55, s*0.12, s*0.4);
    }
    // Broken top
    ctx.fillStyle = '#8a8070'; ctx.fillRect(x - s*0.35, y - s*0.65, s*0.7, s*0.12);
    ctx.strokeStyle = '#6d6458'; ctx.lineWidth = 0.8; ctx.strokeRect(x - s*0.35, y - s*0.65, s*0.7, s*0.12);
    // Moss
    ctx.fillStyle = 'rgba(60,120,40,0.3)';
    for (let i = 0; i < 3; i++) {
        const mx = x - s*0.3 + seededRand(seed + i*7) * s*0.6;
        const my = y - s*0.3 + seededRand(seed + i*11) * s*0.5;
        ctx.beginPath(); ctx.arc(mx, my, 2 + seededRand(seed+i)*2, 0, Math.PI*2); ctx.fill();
    }
}

function drawLighthouse(ctx, x, y, size) {
    const s = size;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s*0.6, s*0.4, s*0.12, 0, 0, Math.PI*2); ctx.fill();
    // Tower
    ctx.fillStyle = '#ECEFF1'; ctx.fillRect(x - s*0.18, y - s*0.7, s*0.36, s*0.7);
    // Red stripes
    ctx.fillStyle = '#E53935';
    ctx.fillRect(x - s*0.18, y - s*0.6, s*0.36, s*0.12);
    ctx.fillRect(x - s*0.18, y - s*0.35, s*0.36, s*0.12);
    ctx.fillRect(x - s*0.18, y - s*0.1, s*0.36, s*0.12);
    // Light room
    ctx.fillStyle = '#FFF9C4'; ctx.fillRect(x - s*0.22, y - s*0.82, s*0.44, s*0.14);
    ctx.strokeStyle = '#616161'; ctx.lineWidth = 0.8; ctx.strokeRect(x - s*0.22, y - s*0.82, s*0.44, s*0.14);
    // Light beam glow
    const glow = Math.sin(Date.now() / 800) * 0.15 + 0.4;
    ctx.fillStyle = 'rgba(255,235,59,' + glow + ')';
    ctx.beginPath(); ctx.arc(x + s*0.2, y - s*0.75, s*0.35, -0.3, 0.3, false); ctx.fill();
    // Roof
    ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.moveTo(x - s*0.26, y - s*0.82); ctx.lineTo(x, y - s*1.1); ctx.lineTo(x + s*0.26, y - s*0.82); ctx.closePath(); ctx.fill();
}

function drawCamel(ctx, x, y, size, seed) {
    const s = size;
    // Body
    ctx.fillStyle = '#C9A87C'; ctx.beginPath(); ctx.ellipse(x, y - s*0.15, s*0.5, s*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Hump
    ctx.fillStyle = '#BF9E72'; ctx.beginPath(); ctx.ellipse(x - s*0.05, y - s*0.4, s*0.14, s*0.15, 0, 0, Math.PI*2); ctx.fill();
    // Neck + head
    ctx.fillStyle = '#C9A87C'; ctx.beginPath(); ctx.moveTo(x + s*0.3, y - s*0.2); ctx.lineTo(x + s*0.45, y - s*0.45); ctx.lineTo(x + s*0.35, y - s*0.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#BF9E72'; ctx.beginPath(); ctx.arc(x + s*0.48, y - s*0.48, s*0.08, 0, Math.PI*2); ctx.fill();
    // Legs
    ctx.strokeStyle = '#A08060'; ctx.lineWidth = 2;
    for (let lx of [-0.2, -0.05, 0.15, 0.3]) { ctx.beginPath(); ctx.moveTo(x + lx*s, y); ctx.lineTo(x + lx*s, y + s*0.4); ctx.stroke(); }
    // Eye
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.5, y - s*0.5, s*0.02, 0, Math.PI*2); ctx.fill();
}

// ============================================================
// Directional Lighting Helpers (2.5D enhancement)
// ============================================================

function drawDirectionalShadow(ctx, x, y, w, h, alpha) {
    const a = alpha || 0.2;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath();
    ctx.ellipse(x + SHADOW_OFFSET_X, y + SHADOW_OFFSET_Y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
}

// ============================================================
// MAP_DEFS Registry — populated by map files in js/maps/
// ============================================================

const MAP_DEFS = {};

// ============================================================
// setActiveMap — switch to a different map
// ============================================================

function setActiveMap(mapId) {
    const m = MAP_DEFS[mapId];
    if (!m) throw new Error('Unknown map: ' + mapId);

    ACTIVE_MAP_ID = mapId;
    PATH_CELLS = m.pathCells;
    GRID_DATA = buildGridFromPath(PATH_CELLS, GRID_COLS, GRID_ROWS);

    CREEK_CELLS = m.getCreekCells ? m.getCreekCells() : new Set();

    DECORATIONS = m.decorations || [];
    DECO_MAP = {};
    for (const d of DECORATIONS) {
        const key = d.r + ',' + d.c;
        if (CREEK_CELLS.has(key)) continue;
        if (GRID_DATA[d.r] && GRID_DATA[d.r][d.c] === CELL_BUILDABLE) {
            GRID_DATA[d.r][d.c] = CELL_BLOCKED;
            DECO_MAP[key] = d.type;
        }
    }

    BRIDGE_CELLS = m.getBridgeCells ? m.getBridgeCells(PATH_CELLS, CREEK_CELLS) : [];

    WAYPOINTS = cellsToWaypoints(PATH_CELLS);

    // Simplify waypoints for smoother rendering (removes redundant collinear points)
    // Store simplified version for the smooth path renderer
    SMOOTH_PATH_POINTS = simplifyWaypoints(WAYPOINTS);

    // Precompute cumulative distance to end for each waypoint (used by enemy targeting)
    let cumulative = 0;
    WAYPOINTS[WAYPOINTS.length - 1]._distToEnd = 0;
    for (let i = WAYPOINTS.length - 2; i >= 0; i--) {
        const dx = WAYPOINTS[i + 1].x - WAYPOINTS[i].x;
        const dy = WAYPOINTS[i + 1].y - WAYPOINTS[i].y;
        cumulative += Math.sqrt(dx * dx + dy * dy);
        WAYPOINTS[i]._distToEnd = cumulative;
    }

    SPAWN_POS = WAYPOINTS[0];
    BASE_POS = WAYPOINTS[WAYPOINTS.length - 1];

    renderMap = m.renderMap;
    renderPathArrows = m.renderPathArrows || function() {};
}
