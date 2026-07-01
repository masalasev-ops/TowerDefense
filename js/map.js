// ============================================================
// Map Core — Grid system, shared drawing helpers, map registry
// Individual maps register themselves via MAP_DEFS[id] = {...}
// ============================================================
//
// Grid System Overview:
// --------------------
// The play field is a 20-column x 14-row grid where each cell
// is CELL_SIZE (40px) square. Every cell has one of three types:
//
//   CELL_BUILDABLE (0) — Green/"grass" tiles where the player
//       can place towers. Most cells start as BUILDABLE; path
//       tiles overwrite this. Decorations may convert a buildable
//       cell to BLOCKED to prevent placement on that spot.
//
//   CELL_PATH (1) — Road tiles that enemies walk along. Path
//       cells form a continuous route from SPAWN_POS (first
//       waypoint) to BASE_POS (last waypoint). Path cells are
//       defined by each map's pathCells array and are converted
//       to waypoints at cell centers for enemy movement.
//
//   CELL_BLOCKED (2) — Impassable terrain (trees, rocks, houses).
//       Decorations placed on BUILDABLE cells convert them to
//       BLOCKED so the player cannot place towers there. This
//       creates natural chokepoints and visual interest.
//
// The three-way distinction is enforced by GRID_DATA, a 2D array
// [row][col] built fresh each time setActiveMap() is called.
// getCell() and canPlaceTower() read from GRID_DATA to enforce
// placement rules at runtime.
//
// Rendering Pipeline:
// ------------------
//   setActiveMap() builds the grid, waypoints, and decorations,
//   then stores the map's custom renderMap() callback. Each frame,
//   main.js calls renderMap(ctx) which draws terrain, decorations,
//   and the path. The smooth path renderer (renderSmoothPath) is
//   the common shared function that all maps use via their own
//   renderMap implementations.

// --- Active globals (set by setActiveMap) ---
let PATH_CELLS = [];              // Array of {c, r} tile coordinates forming the enemy path
let CREEK_CELLS = new Set();      // Set of "row,col" strings marking water tiles (bridges drawn over these)
let BRIDGE_CELLS = [];            // Array of {c, r} tiles that should render as bridges
let DECORATIONS = [];             // Array of {c, r, type} — decorative obstacles (trees, rocks, houses)
let DECO_MAP = {};                // Lookup: "row,col" keys mapped to BLOCKED_TREE/BLOCKED_ROCK/BLOCKED_HOUSE
let GRID_DATA = [];               // 2D array [row][col] storing CELL_BUILDABLE / CELL_PATH / CELL_BLOCKED
let WAYPOINTS = [];               // Full-resolution waypoints (one per path cell) for enemy pathfinding
let SMOOTH_PATH_POINTS = [];      // Simplified waypoints (collinear points removed) for smooth rendering
let SPAWN_POS = { x: 0, y: 0 };   // World-space center of the first path cell — where enemies spawn
let BASE_POS = { x: 0, y: 0 };    // World-space center of the last path cell — the castle location
let ACTIVE_MAP_ID = 'crossroads'; // Currently loaded map identifier
let renderMap = function(ctx) {};            // Per-frame terrain + decoration renderer, set by setActiveMap
let renderPathArrows = function(ctx) {};     // Optional per-frame arrow overlay on path, set by setActiveMap

// ============================================================
// Shared Grid Helpers
// ============================================================

/**
 * Deterministic pseudo-random number generator based on a seed.
 * Uses a sin-based hash (not crypto-secure) suitable for visual
 * variation in decoration placement and drawing.
 * @param {number} seed — integer seed value
 * @returns {number} pseudo-random float in [0, 1)
 */
function seededRand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * Build a 2D grid array from the map's path cell list.
 * All cells start as CELL_BUILDABLE; path cells are overwritten
 * to CELL_PATH. Decorations (CELL_BLOCKED) are applied later
 * by setActiveMap.
 * @param {Array<{c:number, r:number}>} pathCells — ordered list of path tiles
 * @param {number} cols — GRID_COLS (20)
 * @param {number} rows — GRID_ROWS (14)
 * @returns {Array<Array<number>>} GRID_DATA — [row][col] of cell type constants
 */
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

/**
 * Convert path cell coordinates (tile indices) to world-space
 * waypoints (pixel centers of each tile). Enemies interpolate
 * between these waypoints for movement.
 * @param {Array<{c:number, r:number}>} pathCells — tile coordinates
 * @returns {Array<{x:number, y:number}>} waypoints at cell centers
 */
function cellsToWaypoints(pathCells) {
    return pathCells.map(cell => ({
        x: (cell.c + 0.5) * CELL_SIZE,
        y: (cell.r + 0.5) * CELL_SIZE
    }));
}

/**
 * Look up grid cell information at a given pixel position.
 * Returns null if the position is outside the grid bounds.
 * @param {number} px — pixel X coordinate
 * @param {number} py — pixel Y coordinate
 * @returns {{col:number, row:number, x:number, y:number, type:number, isBuildable:boolean}|null}
 */
function getCell(px, py) {
    const col = Math.floor(px / CELL_SIZE);
    const row = Math.floor(py / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row, x: col * CELL_SIZE, y: row * CELL_SIZE,
        type: GRID_DATA[row][col], isBuildable: GRID_DATA[row][col] === CELL_BUILDABLE };
}

/**
 * Check whether a tower can be placed at the given grid cell.
 * Requirements: within bounds, cell is BUILDABLE, and no tower
 * already occupies that cell.
 * @param {number} col — grid column
 * @param {number} row — grid row
 * @param {Array<{col:number, row:number}>} existingTowers — current tower placements
 * @returns {boolean} true if placement is allowed
 */
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
//
// The path is drawn as a thick ribbon: two offset lines (left and
// right of the center waypoints) connected at the ends, forming a
// closed polygon. At each interior waypoint, the corner is rounded
// using arcTo() so turns are smooth rather than sharp.
//
// Layered rendering produces a "3D" depth effect:
//   1. Drop shadow (offset RGBA black fill)
//   2. Base path fill (terrain color)
//   3. Edge stroke (darker border)
//   4. Center stripe (lighter worn-path highlight)
//   5. Inner shadow (subtle dark stroke inset from edge)

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

/**
 * Render the enemy path as a smooth, layered ribbon.
 * Uses the simplified waypoints (SMOOTH_PATH_POINTS) when available
 * for fewer geometric artifacts; falls back to WAYPOINTS.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} pathType — key into PATH_COLORS (e.g. 'dirt', 'ice')
 * @param {number} cornerRadius — radius for arcTo corner rounding (default 12)
 */
function renderSmoothPath(ctx, pathType, cornerRadius) {
    const pathWaypoints = (typeof SMOOTH_PATH_POINTS !== 'undefined' && SMOOTH_PATH_POINTS.length >= 2)
        ? SMOOTH_PATH_POINTS : WAYPOINTS;
    if (!pathWaypoints || pathWaypoints.length < 2) return;

    const colors = PATH_COLORS[pathType] || PATH_COLORS.dirt;
    const effectiveCornerRadius = cornerRadius || 12;
    const pathWidth = CELL_SIZE * 0.76; // ~30px — leaves terrain shoulder visible on each side
    const halfWidth = pathWidth / 2;

    // ---- Draw path drop-shadow (depth effect) ----
    // Offset by (3, 3) pixels to simulate light from upper-left
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    _buildPathGeometry(ctx, pathWaypoints, halfWidth, effectiveCornerRadius, 3, 3);
    ctx.fill();
    ctx.restore();

    // ---- Draw path base fill ----
    ctx.save();
    ctx.fillStyle = colors.fill;
    ctx.beginPath();
    _buildPathGeometry(ctx, pathWaypoints, halfWidth, effectiveCornerRadius, 0, 0);
    ctx.fill();

    // ---- Path edge stroke (darker border for definition) ----
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ---- Lighter center stripe (worn path look) ----
    // A thin center line at low opacity creates a subtle "worn trail" effect
    ctx.strokeStyle = colors.center;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = halfWidth * 0.5;
    ctx.beginPath();
    _buildPathGeometry(ctx, pathWaypoints, halfWidth * 0.25, effectiveCornerRadius, 0, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ---- Subtle inner shadow on edges ----
    // Inset dark stroke adds visual depth along the path edges
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    _buildPathGeometry(ctx, pathWaypoints, halfWidth - 1, effectiveCornerRadius, 0, 0);
    ctx.stroke();
    ctx.restore();
}

/**
 * Build the geometric path outline for the smooth ribbon.
 *
 * ALGORITHM
 * ---------
 * For each waypoint, we compute the unit normal (perpendicular)
 * vector to the path direction. The normal points left of travel.
 *
 *   - First waypoint: normal derived from direction TO the next point.
 *   - Last waypoint:  normal derived from direction FROM the previous point.
 *   - Interior waypoints: the incoming and outgoing direction normals
 *     are averaged and re-normalized, which smoothly blends the turn.
 *
 * Using the normal and half-width, we compute left-edge and right-edge
 * offset points for each waypoint. These form two parallel curves.
 *
 * Corner rounding uses arcTo(): when three consecutive edge points
 * (prev, curr, next) deviate from collinearity (dot product < 0.99),
 * an arc of the given cornerRadius is inserted at curr instead of a
 * sharp lineTo. This produces the smooth, rounded look at path turns.
 *
 * The final polygon traces: left points forward, connects to the last
 * right point (end cap), traces right points backward, and closes.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number, y:number}>} waypoints — path center points
 * @param {number} halfWidth — half the ribbon thickness
 * @param {number} cornerRadius — arc radius for turn smoothing
 * @param {number} shadowOffsetX — X offset for drop shadow (0 for normal render)
 * @param {number} shadowOffsetY — Y offset for drop shadow (0 for normal render)
 */
function _buildPathGeometry(ctx, waypoints, halfWidth, cornerRadius, shadowOffsetX, shadowOffsetY) {
    if (waypoints.length < 2) return;

    // Use provided offsets (default to 0 if undefined)
    const effectiveOffsetX = shadowOffsetX || 0;
    const effectiveOffsetY = shadowOffsetY || 0;

    // Compute offset normals for each waypoint to build a thick path outline
    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i < waypoints.length; i++) {
        let normalX, normalY;
        if (i === 0) {
            // First point: use direction to next point
            // Normal = perpendicular to direction: (-dy, dx) / len
            const dx = waypoints[i + 1].x - waypoints[i].x;
            const dy = waypoints[i + 1].y - waypoints[i].y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            normalX = -dy / len;
            normalY = dx / len;
        } else if (i === waypoints.length - 1) {
            // Last point: use direction from previous point
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            normalX = -dy / len;
            normalY = dx / len;
        } else {
            // Interior point: average of incoming and outgoing normals
            // This blend ensures smooth transitions at turns. Without it,
            // the ribbon would pinch or bulge at corners.
            const dx1 = waypoints[i].x - waypoints[i - 1].x;
            const dy1 = waypoints[i].y - waypoints[i - 1].y;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
            const normal1X = -dy1 / len1;
            const normal1Y = dx1 / len1;

            const dx2 = waypoints[i + 1].x - waypoints[i].x;
            const dy2 = waypoints[i + 1].y - waypoints[i].y;
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
            const normal2X = -dy2 / len2;
            const normal2Y = dx2 / len2;

            // Average and re-normalize so the result is still a unit vector
            normalX = (normal1X + normal2X) / 2;
            normalY = (normal1Y + normal2Y) / 2;
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
            normalX /= normalLength;
            normalY /= normalLength;
        }

        // Offset left (normal direction) and right (opposite normal direction)
        leftPoints.push({
            x: waypoints[i].x + normalX * halfWidth + effectiveOffsetX,
            y: waypoints[i].y + normalY * halfWidth + effectiveOffsetY
        });
        rightPoints.push({
            x: waypoints[i].x - normalX * halfWidth + effectiveOffsetX,
            y: waypoints[i].y - normalY * halfWidth + effectiveOffsetY
        });
    }

    // Build left side of the path (forward direction), closing with right side (backward)
    ctx.moveTo(leftPoints[0].x, leftPoints[0].y);

    for (let i = 1; i < leftPoints.length; i++) {
        // Detect turns — use arcTo for smooth corners instead of sharp lineTo
        if (i > 0 && i < leftPoints.length - 1) {
            const prev = leftPoints[i - 1];
            const curr = leftPoints[i];
            const next = leftPoints[i + 1];
            // Check if direction changes significantly by testing the dot product.
            // If dot < 0.99, the turn is sharp enough to need rounding.
            const prevDirX = curr.x - prev.x;
            const prevDirY = curr.y - prev.y;
            const nextDirX = next.x - curr.x;
            const nextDirY = next.y - curr.y;
            const dot = (prevDirX * nextDirX + prevDirY * nextDirY)
                / (Math.sqrt(prevDirX * prevDirX + prevDirY * prevDirY)
                 * Math.sqrt(nextDirX * nextDirX + nextDirY * nextDirY) + 0.001);
            if (dot < 0.99) {
                ctx.arcTo(curr.x, curr.y, next.x, next.y, cornerRadius);
                continue;
            }
        }
        ctx.lineTo(leftPoints[i].x, leftPoints[i].y);
    }

    // Connect to right side (end cap)
    const lastLeft = leftPoints[leftPoints.length - 1];
    const lastRight = rightPoints[rightPoints.length - 1];
    ctx.lineTo(lastRight.x, lastRight.y);

    // Build right side (backward direction — reverses the right edge)
    for (let i = rightPoints.length - 2; i >= 0; i--) {
        // Same arcTo turn detection for the right edge (iterating in reverse)
        if (i > 0 && i < rightPoints.length - 1) {
            const prev = rightPoints[i + 1];
            const curr = rightPoints[i];
            const next = rightPoints[i - 1];
            const prevDirX = curr.x - prev.x;
            const prevDirY = curr.y - prev.y;
            const nextDirX = next.x - curr.x;
            const nextDirY = next.y - curr.y;
            const dot = (prevDirX * nextDirX + prevDirY * nextDirY)
                / (Math.sqrt(prevDirX * prevDirX + prevDirY * prevDirY)
                 * Math.sqrt(nextDirX * nextDirX + nextDirY * nextDirY) + 0.001);
            if (dot < 0.99) {
                ctx.arcTo(curr.x, curr.y, next.x, next.y, cornerRadius);
                continue;
            }
        }
        ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
    }

    ctx.closePath();
}

// ============================================================
// Waypoint Simplifier — removes redundant collinear waypoints
// to create longer, more natural path segments
// ============================================================
//
// The map defines its path as a sequence of adjacent tiles. When
// the path goes in a straight line (e.g. 10 tiles east), every
// tile center is a waypoint. But for rendering the smooth ribbon
// we don't need all those intermediate points — they create tiny
// flat segments that can cause visual artifacts in the normal
// blending and arcTo detection.
//
// This function eliminates collinear waypoints: points that lie
// on the same straight line between their neighbors. The cross
// product of (prev->curr) and (curr->next) is zero (within a
// small epsilon) when the three points are collinear. Removing
// them produces a simplified path with fewer, longer segments
// that the ribbon renderer handles more cleanly.

/**
 * Remove redundant collinear waypoints from a path.
 * Only keeps waypoints where the path actually changes direction.
 * @param {Array<{x:number, y:number}>} waypoints — input waypoints
 * @returns {Array<{x:number, y:number}>} simplified waypoints
 */
function simplifyWaypoints(waypoints) {
    if (!waypoints || waypoints.length <= 2) return waypoints;

    const simplified = [waypoints[0]];
    for (let i = 1; i < waypoints.length - 1; i++) {
        const prev = waypoints[i - 1];
        const curr = waypoints[i];
        const next = waypoints[i + 1];

        // Check if curr is collinear with prev and next using cross product.
        // Cross product near zero means the three points are on a line.
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;

        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) > 0.01) {
            // Direction changes — keep this waypoint (it's a corner)
            simplified.push(curr);
        }
        // If collinear (cross ~= 0), skip this waypoint — it's redundant
    }
    simplified.push(waypoints[waypoints.length - 1]);
    return simplified;
}

// ============================================================
// Shared Drawing Helpers — used by all map render functions
// ============================================================

/**
 * Draw a deciduous tree with layered canopy, trunk, and drop shadow.
 * Produces a 3-layered circular canopy with highlight, a dark trunk,
 * and a ground shadow ellipse.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for natural variation
 */
function drawTree(ctx, x, y, size, seed) {
    const s = size;
    const trunkW = s * 0.2, trunkH = s * 0.7;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.55, s * 0.55, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Trunk (two tones for bark detail)
    ctx.fillStyle = '#6D4C41'; ctx.fillRect(x - trunkW / 2, y - trunkH * 0.3, trunkW, trunkH);
    ctx.fillStyle = '#5D4037'; ctx.fillRect(x - trunkW / 2, y - trunkH * 0.3, trunkW * 0.6, trunkH);
    // Canopy — three overlapping circles in progressively lighter green
    const canopyColors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50'];
    for (let layer = 0; layer < 3; layer++) {
        const cy = y - trunkH * 0.5 - layer * s * 0.25;
        const cr = s * 0.55 - layer * s * 0.08;
        const cx = x + (seededRand(seed + layer * 10) - 0.5) * s * 0.2;
        ctx.fillStyle = canopyColors[layer + 1];
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
        // Highlight circle on top of each layer
        ctx.fillStyle = canopyColors[3];
        ctx.beginPath(); ctx.arc(cx - cr * 0.25, cy - cr * 0.25, cr * 0.5, 0, Math.PI * 2); ctx.fill();
    }
}

/**
 * Draw an irregular rock formation with multi-faceted surface,
 * highlight, and shadow. Uses 7-sided polygon with seeded random
 * radii for organic shapes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for shape variation
 */
function drawRock(ctx, x, y, size, seed) {
    const s = size;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.5, s * 0.5, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Main rock body — irregular polygon with randomly varied radii
    ctx.fillStyle = '#9E9E9E'; ctx.beginPath();
    const numPoints = 7;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = s * 0.42 * (0.7 + seededRand(seed + i * 3) * 0.6);
        const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // Upper-left highlight (light source from top-left)
    ctx.fillStyle = '#BDBDBD'; ctx.beginPath(); ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.22, 0, Math.PI * 2); ctx.fill();
    // Surface cracks
    ctx.strokeStyle = '#757575'; ctx.lineWidth = 0.8; ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y + s * 0.1); ctx.lineTo(x + s * 0.15, y - s * 0.2); ctx.lineTo(x + s * 0.05, y - s * 0.3); ctx.stroke();
}

/**
 * Draw the castle (player base) with damage-dependent appearance.
 * Visual elements:
 *   - Main body and side towers (color shifts from healthy tan to damaged dark)
 *   - Crenellations (battlements) on top
 *   - Castle gate (archway with flickering torch lights)
 *   - Flag on pole (frays and changes to gray when heavily damaged)
 *   - Damage overlay (red tint intensifies as HP drops)
 *   - Crack lines appear when HP < 60%, more below 35%
 *   - Window glow shifts from yellow to red based on health
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 */
function drawCastle(ctx, x, y, size) {
    const s = size;
    const hp = (typeof window !== 'undefined' && window._castleHPPercent !== undefined) ? window._castleHPPercent : 1.0;
    const damageAlpha = (1 - hp) * 0.6;
    // Colors shift from warm stone to dark/damaged as HP drops
    const wallColor = hp < 0.3 ? '#6D4C41' : hp < 0.6 ? '#7B5B4C' : '#8D6E63';
    const towerColor = hp < 0.3 ? '#7B6B60' : hp < 0.6 ? '#8C7B6F' : '#A1887F';
    // Main wall body
    ctx.fillStyle = wallColor; ctx.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.9);
    // Central keep tower
    ctx.fillStyle = towerColor; ctx.fillRect(x - s * 0.25, y - s * 0.85, s * 0.5, s * 0.75);
    // Side towers
    ctx.fillStyle = hp < 0.3 ? '#757575' : '#9E9E9E';
    ctx.fillRect(x - s * 0.7, y - s * 0.5, s * 0.3, s * 0.4); ctx.fillRect(x + s * 0.4, y - s * 0.5, s * 0.3, s * 0.4);
    // Crenellations (battlements) on keep top
    ctx.fillStyle = '#BCAAA4';
    for (let bx = -0.2; bx <= 0.2; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.04, y - s * 0.95, s * 0.08, s * 0.12);
    // Side tower crenellations (only if enough HP remains)
    if (hp > 0.25) { for (let bx = -0.55; bx <= -0.45; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.03, y - s * 0.58, s * 0.06, s * 0.1); }
    for (let bx = 0.45; bx <= 0.65; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.03, y - s * 0.58, s * 0.06, s * 0.1);
    // Gate arch
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.12, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - s * 0.12, y - s * 0.05, s * 0.24, s * 0.12);
    // Window — warm glows yellow when healthy, red when damaged
    const windowColor = hp < 0.5 ? '#FF5252' : '#FFE082';
    ctx.fillStyle = windowColor; ctx.beginPath(); ctx.arc(x, y - s * 0.5, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1; ctx.stroke();
    // Flag pole
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - s * 0.95); ctx.lineTo(x, y - s * 1.25); ctx.stroke();
    // Flag — tears when damaged (HP < 30%), otherwise standard triangular pennant
    const flagColor = hp < 0.3 ? '#9E9E9E' : '#E53935';
    ctx.fillStyle = flagColor; ctx.beginPath();
    if (hp > 0.3) { ctx.moveTo(x, y - s * 1.25); ctx.lineTo(x + s * 0.15, y - s * 1.18); ctx.lineTo(x, y - s * 1.1); }
    else { ctx.moveTo(x, y - s * 1.25); ctx.lineTo(x + s * 0.08, y - s * 1.2); ctx.lineTo(x + s * 0.02, y - s * 1.15); ctx.lineTo(x + s * 0.1, y - s * 1.12); ctx.lineTo(x, y - s * 1.1); }
    ctx.fill();
    // Crack lines (visible at low HP)
    if (hp < 0.6) {
        ctx.strokeStyle = 'rgba(0,0,0,' + ((1 - hp) * 0.5) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s * 0.8); ctx.lineTo(x + s * 0.05, y - s * 0.6); ctx.lineTo(x + s * 0.15, y - s * 0.5); ctx.stroke();
        if (hp < 0.35) { ctx.beginPath(); ctx.moveTo(x + s * 0.2, y - s * 0.3); ctx.lineTo(x + s * 0.1, y - s * 0.15); ctx.lineTo(x + s * 0.15, y - s * 0.05); ctx.stroke(); }
    }
    // Damage overlay — red tint intensifies as HP decreases
    if (damageAlpha > 0) { ctx.fillStyle = 'rgba(80,0,0,' + damageAlpha + ')'; ctx.fillRect(x - s * 0.7, y - s * 0.95, s * 1.4, s * 1.3); }
}

/**
 * Draw a fortified gate with stone archway and flickering torch lights.
 * Visual elements: stone pillars, arch, wooden gate, torches with
 * animated glow on both sides.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 */
function drawGate(ctx, x, y, size) {
    const s = size;
    // Stone pillars (left and right)
    ctx.fillStyle = '#9E9E9E'; ctx.fillRect(x - s * 0.4, y - s * 0.5, s * 0.2, s * 0.5); ctx.fillRect(x + s * 0.2, y - s * 0.5, s * 0.2, s * 0.5);
    // Pillar tops
    ctx.fillStyle = '#BDBDBD'; ctx.fillRect(x - s * 0.45, y - s * 0.6, s * 0.3, s * 0.12); ctx.fillRect(x + s * 0.15, y - s * 0.6, s * 0.3, s * 0.12);
    // Stone arch
    ctx.strokeStyle = '#757575'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - s * 0.45, s * 0.3, Math.PI, 0); ctx.stroke();
    // Wooden gate (horizontal planks)
    ctx.fillStyle = '#3E2723'; ctx.fillRect(x - s * 0.25, y - s * 0.1, s * 0.5, s * 0.1);
    // Torches with flickering animation
    const flicker = Math.sin(Date.now() / 200) * 0.2 + 0.8;
    ctx.fillStyle = 'rgba(255,160,0,' + flicker + ')'; ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.45, s * 0.1, 0, Math.PI * 2); ctx.fill();
    // Torch glow halos
    ctx.fillStyle = 'rgba(255,200,100,0.3)'; ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.45, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 0.45, s * 0.2, 0, Math.PI * 2); ctx.fill();
}

/**
 * Draw a thatched cottage with roof, chimney, windows, and door.
 * Visual elements: shadow, wall body, roof triangle, door with
 * doorknob, window with cross-pane, chimney with smoke puff.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 */
function drawHouse(ctx, x, y, size) {
    const s = size;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.45, s * 0.5, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    // Wall body
    ctx.fillStyle = '#E8D5B7'; ctx.fillRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.5; ctx.strokeRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    // Wall horizontal plank lines
    ctx.beginPath(); ctx.moveTo(x - s * 0.35, y + s * 0.15); ctx.lineTo(x + s * 0.35, y + s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x, y + s * 0.4); ctx.stroke();
    // Roof triangle (thatched)
    ctx.fillStyle = '#C62828'; ctx.beginPath(); ctx.moveTo(x - s * 0.42, y - s * 0.08); ctx.lineTo(x, y - s * 0.55); ctx.lineTo(x + s * 0.42, y - s * 0.08); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.2; ctx.stroke();
    // Roof ridge line
    ctx.strokeStyle = '#B71C1C'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.55); ctx.lineTo(x, y - s * 0.08); ctx.stroke();
    // Door
    ctx.fillStyle = '#5D4037'; ctx.fillRect(x - s * 0.08, y + s * 0.05, s * 0.16, s * 0.32);
    // Doorknob
    ctx.fillStyle = '#FFC107'; ctx.beginPath(); ctx.arc(x + s * 0.05, y + s * 0.2, s * 0.02, 0, Math.PI * 2); ctx.fill();
    // Window
    ctx.fillStyle = '#81D4FA'; ctx.fillRect(x + s * 0.12, y - s * 0.02, s * 0.13, s * 0.12);
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1; ctx.strokeRect(x + s * 0.12, y - s * 0.02, s * 0.13, s * 0.12);
    // Window cross-pane
    ctx.beginPath(); ctx.moveTo(x + s * 0.185, y - s * 0.02); ctx.lineTo(x + s * 0.185, y + s * 0.1); ctx.stroke();
    // Chimney
    ctx.fillStyle = '#9E9E9E'; ctx.fillRect(x + s * 0.15, y - s * 0.5, s * 0.1, s * 0.2);
    // Smoke puff
    ctx.fillStyle = 'rgba(200,200,200,0.4)'; ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.58, s * 0.08, 0, Math.PI * 2); ctx.fill();
}

/**
 * Draw a wooden bridge with deck planks and support rails.
 * Visual elements: drop shadow, plank-textured deck, support rails
 * at both ends, cross-beams.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — center Y
 * @param {number} size — overall size scale
 */
function drawBridge(ctx, x, y, size) {
    const s = size; const w = s * 0.9, h = s * 0.45;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - w/2 + 3, y - h/2 + 3, w, h);
    // Deck base
    ctx.fillStyle = '#6D4C41'; ctx.fillRect(x - w/2, y - h/2, w, h);
    // Plank lines
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 0.8;
    for (let py = y - h/2 + 3; py < y + h/2; py += 3.5) { ctx.beginPath(); ctx.moveTo(x - w/2, py); ctx.lineTo(x + w/2, py); ctx.stroke(); }
    // Support rails
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x - w/2, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x - w/2 + 6, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x - w/2 + 12, y - h/2 - 8, 2.5, h + 8);
    ctx.fillRect(x + w/2 - 2.5, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x + w/2 - 8.5, y - h/2 - 8, 2.5, h + 8); ctx.fillRect(x + w/2 - 14.5, y - h/2 - 8, 2.5, h + 8);
    // Handrails
    ctx.fillStyle = '#A1887F'; ctx.fillRect(x - w/2 - 1, y - h/2 - 8, w + 2, 3); ctx.fillRect(x - w/2 - 1, y + h/2 - 1, w + 2, 3);
    ctx.fillRect(x - w/2, y - h/2 - 6, 2, h + 8); ctx.fillRect(x + w/2 - 2, y - h/2 - 6, 2, h + 8);
}

// --- Terrain feature helpers ---

/**
 * Draw a snow-capped mountain peak.
 * Visual elements: left/right peaks with distinct shadow faces,
 * snow cap at the summit, highlight on the right face, and a
 * dark base line.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} w — width
 * @param {number} h — height
 * @param {number} seed — RNG seed for peak asymmetry
 */
function drawMountain(ctx, x, y, w, h, seed) {
    const r1 = seededRand(seed), r2 = seededRand(seed + 7);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath();
    ctx.moveTo(x - w/2 + 4, y + 6); ctx.lineTo(x + 4, y - h + 4); ctx.lineTo(x + w/2 + 4, y + 6); ctx.closePath(); ctx.fill();
    const leftPeak = x - w * 0.08 + r1 * w * 0.1, rightPeak = x + w * 0.05 + r2 * w * 0.08;
    // Base mountain shape
    ctx.fillStyle = '#546E7A'; ctx.beginPath(); ctx.moveTo(x - w/2, y); ctx.lineTo(leftPeak, y - h); ctx.lineTo(rightPeak, y - h + h * 0.04); ctx.lineTo(x + w/2, y); ctx.closePath(); ctx.fill();
    // Dark left face
    ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.moveTo(x - w/2, y); ctx.lineTo(leftPeak, y - h); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    // Lighter right face
    ctx.fillStyle = '#78909C'; ctx.beginPath(); ctx.moveTo(x + w/2, y); ctx.lineTo(rightPeak, y - h + h * 0.04); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    // Snow cap
    const snowH = h * 0.28;
    ctx.fillStyle = '#ECEFF1'; ctx.beginPath(); ctx.moveTo(x - w * 0.22, y - h + snowH); ctx.lineTo(leftPeak, y - h); ctx.lineTo(rightPeak, y - h + h * 0.04); ctx.lineTo(x + w * 0.18, y - h + snowH * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(leftPeak - w * 0.04, y - h + snowH * 0.3, w * 0.08, 0, Math.PI * 2); ctx.fill();
    // Rock base line
    ctx.fillStyle = '#37474F'; ctx.fillRect(x - w/2, y - 2, w, 5);
}

/**
 * Draw a crystalline ice formation with translucent shards.
 * Multiple arms radiate from the center with gradient fills and
 * a bright center core.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for crystal shape
 */
function drawIceCrystal(ctx, x, y, size, seed) {
    const s = size;
    // Shadow
    ctx.fillStyle = 'rgba(150,200,230,0.3)'; ctx.beginPath(); ctx.ellipse(x + 1, y + s * 0.4, s * 0.4, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Crystal arms — each is a rotated gradient-filled shard
    const angles = [-1.2, -0.5, 0.1, 0.7], lengths = [s*0.8, s*1.1, s*0.65, s*0.9], widths = [s*0.12, s*0.15, s*0.10, s*0.13];
    for (let i = 0; i < angles.length; i++) {
        const angle = angles[i] + seededRand(seed + i * 13) * 0.3, len = lengths[i] * (0.8 + seededRand(seed + i * 7) * 0.4), wid = widths[i];
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        const grad = ctx.createLinearGradient(0, -len/2, 0, len/2);
        grad.addColorStop(0, 'rgba(200,230,255,0.85)'); grad.addColorStop(0.5, 'rgba(180,210,240,0.7)'); grad.addColorStop(1, 'rgba(140,180,220,0.5)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, -len/2); ctx.lineTo(-wid, len/3); ctx.lineTo(-wid*0.3, len/2); ctx.lineTo(wid*0.3, len/2); ctx.lineTo(wid, len/3); ctx.closePath(); ctx.fill();
        // Center ridge line
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -len/2+2); ctx.lineTo(0, len/2-2); ctx.stroke();
        ctx.restore();
    }
    // Bright center core
    ctx.fillStyle = 'rgba(200,230,255,0.5)'; ctx.beginPath(); ctx.arc(x, y, s * 0.15, 0, Math.PI * 2); ctx.fill();
}

/**
 * Draw a snowdrift with a smooth curved top and gradient fill.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} w — width
 * @param {number} h — height
 */
function drawSnowdrift(ctx, x, y, w, h) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.ellipse(x + 2, y + h * 0.7, w/2, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Snow mound with gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#F5F7FA'); grad.addColorStop(0.6, '#E8ECF0'); grad.addColorStop(1, '#D5DDE5');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x - w/2, y + h * 0.3); ctx.quadraticCurveTo(x - w/4, y - h * 0.1, x, y);
    ctx.quadraticCurveTo(x + w/4, y - h * 0.05, x + w/2, y + h * 0.35); ctx.quadraticCurveTo(x + w/3, y + h, x, y + h);
    ctx.quadraticCurveTo(x - w/3, y + h, x - w/2, y + h * 0.3); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - w * 0.08, y + h * 0.05, w * 0.22, 0, Math.PI * 2); ctx.fill();
}

/**
 * Draw a segment of stone wall with mortar lines and crenellations.
 * Visual elements: 3 rows of stone blocks with staggered joints,
 * crenellations on top, and a subtle dark overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — left X
 * @param {number} y — top Y
 * @param {number} w — width
 * @param {number} h — height
 * @param {number} seed — RNG seed for block pattern
 */
function drawStoneWallSegment(ctx, x, y, w, h, seed) {
    // Wall base
    ctx.fillStyle = '#616161'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#424242'; ctx.lineWidth = 1;
    // Horizontal mortar lines between rows
    const blockH = h / 3;
    for (let row = 0; row < 3; row++) {
        const by = y + row * blockH;
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
        // Vertical mortar lines — staggered per row (offset alternates)
        const offset = (row % 2) * w * 0.25;
        for (let bx = x + offset; bx < x + w; bx += w * 0.45) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + blockH); ctx.stroke(); }
    }
    // Crenellations
    const bw = w / 4;
    ctx.fillStyle = '#757575';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + i * bw, y - h * 0.3, bw * 0.65, h * 0.3);
    // Subtle dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x, y, w, h);
}

/**
 * Draw a stone watchtower with crenellations, arrow slits, and a
 * conical roof.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 */
function drawWatchtower(ctx, x, y, size) {
    const s = size;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s * 0.55, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Stone body
    ctx.fillStyle = '#757575'; ctx.fillRect(x - s * 0.25, y - s * 0.5, s * 0.5, s * 0.55);
    // Stone line pattern
    ctx.strokeStyle = '#616161'; ctx.lineWidth = 0.8;
    for (let ly = y - s * 0.4; ly < y + s * 0.05; ly += s * 0.12) { ctx.beginPath(); ctx.moveTo(x - s*0.25, ly); ctx.lineTo(x + s*0.25, ly); ctx.stroke(); }
    // Battlements (crenellations)
    ctx.fillStyle = '#616161'; ctx.fillRect(x - s * 0.28, y - s * 0.75, s * 0.56, s * 0.28);
    ctx.fillStyle = '#9E9E9E';
    for (let bx = -0.2; bx <= 0.2; bx += 0.1) ctx.fillRect(x + bx * s - s * 0.04, y - s * 0.85, s * 0.07, s * 0.12);
    // Arrow slit
    ctx.fillStyle = '#212121'; ctx.fillRect(x - 1.5, y - s * 0.4, 3, s * 0.2);
    // Conical roof
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.75); ctx.lineTo(x, y - s * 1.15); ctx.lineTo(x + s * 0.32, y - s * 0.75); ctx.closePath(); ctx.fill();
}

// --- Animal drawing helpers ---

/**
 * Draw an animated bird with wing flap.
 * Visual elements: body, head with eye and beak, animated wing
 * that oscillates with sin(Time), and legs.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — center Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for animation phase offset
 */
function drawBird(ctx, x, y, size, seed) {
    const s = size;
    // Body
    ctx.fillStyle = '#5D4037'; ctx.beginPath(); ctx.ellipse(x, y, s*0.35, s*0.2, -0.1, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.arc(x + s*0.3, y - s*0.08, s*0.15, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s*0.35, y - s*0.12, s*0.06, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.36, y - s*0.12, s*0.03, 0, Math.PI*2); ctx.fill();
    // Wing — animated flap using sin wave
    const wingFlap = Math.sin(Date.now() / 300 + seed) * 0.3;
    ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.ellipse(x - s*0.05, y - s*0.22 - wingFlap*s, s*0.3, s*0.1, -0.3, 0, Math.PI*2); ctx.fill();
    // Tail
    ctx.fillStyle = '#4E342E'; ctx.beginPath(); ctx.moveTo(x - s*0.3, y); ctx.lineTo(x - s*0.55, y - s*0.15); ctx.lineTo(x - s*0.35, y + s*0.05); ctx.closePath(); ctx.fill();
    // Beak
    ctx.fillStyle = '#FF8F00'; ctx.beginPath(); ctx.moveTo(x + s*0.42, y - s*0.1); ctx.lineTo(x + s*0.58, y - s*0.06); ctx.lineTo(x + s*0.42, y - s*0.02); ctx.closePath(); ctx.fill();
    // Legs
    ctx.strokeStyle = '#FF8F00'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - s*0.05, y + s*0.12); ctx.lineTo(x - s*0.02, y + s*0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s*0.1, y + s*0.1); ctx.lineTo(x + s*0.13, y + s*0.26); ctx.stroke();
}

/**
 * Draw a rabbit with ears, body details, and eye.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — center Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed (unused but kept for signature consistency)
 */
function drawRabbit(ctx, x, y, size, seed) {
    const s = size;
    // Body
    ctx.fillStyle = '#A1887F'; ctx.beginPath(); ctx.ellipse(x, y, s*0.3, s*0.2, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.arc(x + s*0.25, y - s*0.1, s*0.16, 0, Math.PI*2); ctx.fill();
    // Left ear (outer + inner pink)
    ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.ellipse(x + s*0.2, y - s*0.38, s*0.06, s*0.16, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F5C6CB'; ctx.beginPath(); ctx.ellipse(x + s*0.2, y - s*0.36, s*0.03, s*0.1, -0.2, 0, Math.PI*2); ctx.fill();
    // Right ear
    ctx.fillStyle = '#BCAAA4'; ctx.beginPath(); ctx.ellipse(x + s*0.3, y - s*0.4, s*0.06, s*0.16, 0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F5C6CB'; ctx.beginPath(); ctx.ellipse(x + s*0.3, y - s*0.38, s*0.03, s*0.1, 0.1, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.32, y - s*0.15, s*0.04, 0, Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle = '#F48FB1'; ctx.beginPath(); ctx.arc(x + s*0.39, y - s*0.1, s*0.03, 0, Math.PI*2); ctx.fill();
    // Tail
    ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.arc(x - s*0.3, y - s*0.05, s*0.09, 0, Math.PI*2); ctx.fill();
}

/**
 * Draw a deer with antlers, four legs, and body markings.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — center Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed (unused but kept for signature consistency)
 */
function drawDeer(ctx, x, y, size, seed) {
    const s = size;
    // Body
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(x, y, s*0.45, s*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Neck
    ctx.fillStyle = '#A1887F'; ctx.fillRect(x + s*0.2, y - s*0.45, s*0.12, s*0.3);
    // Head
    ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.arc(x + s*0.28, y - s*0.5, s*0.13, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.34, y - s*0.55, s*0.035, 0, Math.PI*2); ctx.fill();
    // Antlers (branched)
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + s*0.25, y - s*0.6); ctx.lineTo(x + s*0.15, y - s*0.85); ctx.moveTo(x + s*0.2, y - s*0.72); ctx.lineTo(x + s*0.08, y - s*0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s*0.3, y - s*0.6); ctx.lineTo(x + s*0.4, y - s*0.85); ctx.moveTo(x + s*0.35, y - s*0.72); ctx.lineTo(x + s*0.48, y - s*0.78); ctx.stroke();
    // Legs
    ctx.strokeStyle = '#6D4C41'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - s*0.15, y + s*0.2); ctx.lineTo(x - s*0.18, y + s*0.55); ctx.moveTo(x - s*0.05, y + s*0.2); ctx.lineTo(x - s*0.02, y + s*0.55);
    ctx.moveTo(x + s*0.1, y + s*0.2); ctx.lineTo(x + s*0.13, y + s*0.5); ctx.moveTo(x + s*0.2, y + s*0.18); ctx.lineTo(x + s*0.25, y + s*0.48); ctx.stroke();
    // Tail
    ctx.fillStyle = '#EFEBE9'; ctx.beginPath(); ctx.arc(x - s*0.4, y - s*0.1, s*0.08, 0, Math.PI*2); ctx.fill();
}

// --- New decoration helpers for additional maps ---

/**
 * Draw a palm tree with curved trunk and radiating fronds.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for frond variation
 */
function drawPalmTree(ctx, x, y, size, seed) {
    const s = size;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 3, y + s*0.4, s*0.4, s*0.12, 0, 0, Math.PI*2); ctx.fill();
    // Curved trunk (drawn as two overlapping thick strokes for depth)
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = s*0.15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + s*0.35); ctx.quadraticCurveTo(x + s*0.05, y - s*0.1, x + s*0.15, y - s*0.5); ctx.stroke();
    ctx.strokeStyle = '#6D4C41'; ctx.lineWidth = s*0.08;
    ctx.beginPath(); ctx.moveTo(x, y + s*0.35); ctx.quadraticCurveTo(x + s*0.05, y - s*0.1, x + s*0.15, y - s*0.5); ctx.stroke();
    // Fronds (7 leaves radiating from top of trunk)
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

/**
 * Draw a saguaro cactus with arms and spines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for arm side selection
 */
function drawCactus(ctx, x, y, size, seed) {
    const s = size;
    // Main trunk
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(x - s*0.1, y - s*0.6, s*0.2, s*0.65);
    ctx.fillStyle = '#388E3C'; ctx.fillRect(x - s*0.06, y - s*0.55, s*0.05, s*0.55);
    // Arms — randomly selected side
    const armSide = seededRand(seed) > 0.5 ? 1 : -1;
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(x + armSide*s*0.1, y - s*0.35, armSide*s*0.25, s*0.12);
    ctx.fillStyle = '#4CAF50'; ctx.fillRect(x + armSide*s*0.25, y - s*0.55, s*0.1, s*0.3);
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(x + armSide*s*0.25 + armSide*0.01, y - s*0.5, s*0.03, s*0.2);
    // Spines (small yellow dots)
    ctx.fillStyle = '#FFEB3B';
    for (let i = 0; i < 4; i++) {
        const sy = y - s*0.5 + i * s*0.15;
        ctx.beginPath(); ctx.arc(x, sy, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + armSide*s*0.32, sy - s*0.22, 1, 0, Math.PI*2); ctx.fill();
    }
}

/**
 * Draw a ruined temple with cracked stone base, columns, and moss.
 * Visual elements: drop shadow, stone base, three columns with
 * broken top beam, scattered moss patches.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed for moss placement
 */
function drawTempleRuin(ctx, x, y, size, seed) {
    const s = size;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s*0.5, s*0.5, s*0.15, 0, 0, Math.PI*2); ctx.fill();
    // Stone base
    ctx.fillStyle = '#8a8070'; ctx.fillRect(x - s*0.4, y - s*0.15, s*0.8, s*0.35);
    ctx.strokeStyle = '#6d6458'; ctx.lineWidth = 1;
    ctx.strokeRect(x - s*0.4, y - s*0.15, s*0.8, s*0.35);
    ctx.beginPath(); ctx.moveTo(x - s*0.4, y - s*0.05); ctx.lineTo(x + s*0.4, y - s*0.05); ctx.stroke();
    // Three columns
    for (let i = 0; i < 3; i++) {
        const cx = x - s*0.25 + i * s*0.25;
        ctx.fillStyle = '#9e9488'; ctx.fillRect(cx - s*0.06, y - s*0.55, s*0.12, s*0.4);
        ctx.strokeStyle = '#6d6458'; ctx.lineWidth = 0.6; ctx.strokeRect(cx - s*0.06, y - s*0.55, s*0.12, s*0.4);
    }
    // Broken top beam
    ctx.fillStyle = '#8a8070'; ctx.fillRect(x - s*0.35, y - s*0.65, s*0.7, s*0.12);
    ctx.strokeStyle = '#6d6458'; ctx.lineWidth = 0.8; ctx.strokeRect(x - s*0.35, y - s*0.65, s*0.7, s*0.12);
    // Moss patches (small green circles)
    ctx.fillStyle = 'rgba(60,120,40,0.3)';
    for (let i = 0; i < 3; i++) {
        const mx = x - s*0.3 + seededRand(seed + i*7) * s*0.6;
        const my = y - s*0.3 + seededRand(seed + i*11) * s*0.5;
        ctx.beginPath(); ctx.arc(mx, my, 2 + seededRand(seed+i)*2, 0, Math.PI*2); ctx.fill();
    }
}

/**
 * Draw a lighthouse with red stripes, light room, and rotating beam.
 * Visual elements: shadow, tapered tower with red/white stripes,
 * glass light room with animated beam glow, conical roof.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — base Y
 * @param {number} size — overall size scale
 */
function drawLighthouse(ctx, x, y, size) {
    const s = size;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2, y + s*0.6, s*0.4, s*0.12, 0, 0, Math.PI*2); ctx.fill();
    // White tower body
    ctx.fillStyle = '#ECEFF1'; ctx.fillRect(x - s*0.18, y - s*0.7, s*0.36, s*0.7);
    // Red stripes
    ctx.fillStyle = '#E53935';
    ctx.fillRect(x - s*0.18, y - s*0.6, s*0.36, s*0.12);
    ctx.fillRect(x - s*0.18, y - s*0.35, s*0.36, s*0.12);
    ctx.fillRect(x - s*0.18, y - s*0.1, s*0.36, s*0.12);
    // Light room (glass enclosure)
    ctx.fillStyle = '#FFF9C4'; ctx.fillRect(x - s*0.22, y - s*0.82, s*0.44, s*0.14);
    ctx.strokeStyle = '#616161'; ctx.lineWidth = 0.8; ctx.strokeRect(x - s*0.22, y - s*0.82, s*0.44, s*0.14);
    // Animated light beam
    const glow = Math.sin(Date.now() / 800) * 0.15 + 0.4;
    ctx.fillStyle = 'rgba(255,235,59,' + glow + ')';
    ctx.beginPath(); ctx.arc(x + s*0.2, y - s*0.75, s*0.35, -0.3, 0.3, false); ctx.fill();
    // Conical roof
    ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.moveTo(x - s*0.26, y - s*0.82); ctx.lineTo(x, y - s*1.1); ctx.lineTo(x + s*0.26, y - s*0.82); ctx.closePath(); ctx.fill();
}

/**
 * Draw a camel with hump, neck, legs, and head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X
 * @param {number} y — center Y
 * @param {number} size — overall size scale
 * @param {number} seed — RNG seed (unused but kept for signature consistency)
 */
function drawCamel(ctx, x, y, size, seed) {
    const s = size;
    // Body
    ctx.fillStyle = '#C9A87C'; ctx.beginPath(); ctx.ellipse(x, y - s*0.15, s*0.5, s*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Hump
    ctx.fillStyle = '#BF9E72'; ctx.beginPath(); ctx.ellipse(x - s*0.05, y - s*0.4, s*0.14, s*0.15, 0, 0, Math.PI*2); ctx.fill();
    // Neck + head
    ctx.fillStyle = '#C9A87C'; ctx.beginPath(); ctx.moveTo(x + s*0.3, y - s*0.2); ctx.lineTo(x + s*0.45, y - s*0.45); ctx.lineTo(x + s*0.35, y - s*0.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#BF9E72'; ctx.beginPath(); ctx.arc(x + s*0.48, y - s*0.48, s*0.08, 0, Math.PI*2); ctx.fill();
    // Four legs
    ctx.strokeStyle = '#A08060'; ctx.lineWidth = 2;
    for (let lx of [-0.2, -0.05, 0.15, 0.3]) { ctx.beginPath(); ctx.moveTo(x + lx*s, y); ctx.lineTo(x + lx*s, y + s*0.4); ctx.stroke(); }
    // Eye
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + s*0.5, y - s*0.5, s*0.02, 0, Math.PI*2); ctx.fill();
}

// ============================================================
// Directional Lighting Helpers (2.5D enhancement)
// ============================================================

/**
 * Draw a uniform drop shadow ellipse offset from the object center.
 * Light source is assumed upper-left, so shadows fall to lower-right
 * (SHADOW_OFFSET_X, SHADOW_OFFSET_Y from constants.js).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — center X of the object
 * @param {number} y — center Y of the object
 * @param {number} w — shadow ellipse width
 * @param {number} h — shadow ellipse height
 * @param {number} alpha — opacity [0-1], default 0.2
 */
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
// Each map file (js/maps/*.js) adds its definition here:
//   MAP_DEFS.mapId = { id, name, pathCells, decorations,
//                       getCreekCells, getBridgeCells,
//                       renderMap, renderPathArrows }
//
// MAP_DEFS is populated at script load time (before init) so
// setActiveMap can find any map by its id.

const MAP_DEFS = {};

// ============================================================
// setActiveMap — switch to a different map
// ============================================================
// This is the central map initialization pipeline. It is called
// at startup (init() loads the default 'crossroads' map) and
// whenever the player starts a new game on a different map.
//
// Pipeline:
//   1. Look up MAP_DEFS[mapId] — throws if not found
//   2. Store PATH_CELLS from the map definition
//   3. Build GRID_DATA — 2D array filled with CELL_BUILDABLE,
//      then CELL_PATH overlaid on path tiles
//   4. Compute CREEK_CELLS (water tiles) from map's helper
//   5. Process DECORATIONS: skip decorations on creek tiles,
//      place remaining decorations on BUILDABLE cells and mark
//      them CELL_BLOCKED (stored in DECO_MAP for lookup)
//   6. Compute BRIDGE_CELLS from map's helper
//   7. Convert PATH_CELLS to WAYPOINTS (cell center pixel coords)
//   8. Simplify WAYPOINTS to SMOOTH_PATH_POINTS (remove collinear
//      points for clean ribbon rendering)
//   9. Precompute _distToEnd for each waypoint (used by enemies
//      for distance-remaining logic and targeting priority)
//  10. Set SPAWN_POS from first waypoint, BASE_POS from last
//  11. Store the map's renderMap() and renderPathArrows() callbacks

function setActiveMap(mapId) {
    const mapDefinition = MAP_DEFS[mapId];
    if (!mapDefinition) throw new Error('Unknown map: ' + mapId);

    ACTIVE_MAP_ID = mapId;
    PATH_CELLS = mapDefinition.pathCells;
    GRID_DATA = buildGridFromPath(PATH_CELLS, GRID_COLS, GRID_ROWS);

    // Compute creek cells (water tiles that should render underneath bridges)
    CREEK_CELLS = mapDefinition.getCreekCells ? mapDefinition.getCreekCells() : new Set();

    // Process decorations — each decoration is placed on a BUILDABLE
    // cell and converts it to CELL_BLOCKED (no tower placement allowed).
    // Decorations that fall on creek cells are skipped (bridges cover them).
    DECORATIONS = mapDefinition.decorations || [];
    DECO_MAP = {};
    for (const decoration of DECORATIONS) {
        const key = decoration.r + ',' + decoration.c;
        if (CREEK_CELLS.has(key)) continue; // skip decorations on water
        if (GRID_DATA[decoration.r] && GRID_DATA[decoration.r][decoration.c] === CELL_BUILDABLE) {
            GRID_DATA[decoration.r][decoration.c] = CELL_BLOCKED;
            DECO_MAP[key] = decoration.type;
        }
    }

    // Compute bridge cells (path tiles that cross over creeks)
    BRIDGE_CELLS = mapDefinition.getBridgeCells ? mapDefinition.getBridgeCells(PATH_CELLS, CREEK_CELLS) : [];

    WAYPOINTS = cellsToWaypoints(PATH_CELLS);

    // Simplify waypoints for smoother rendering (removes redundant collinear points)
    SMOOTH_PATH_POINTS = simplifyWaypoints(WAYPOINTS);

    // Precompute cumulative distance from each waypoint to the end of the path.
    // This is stored as _distToEnd on each waypoint and used by enemies for
    // distance-remaining calculations and targeting priority (enemies closer
    // to the base may be targeted first).
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

    // Store per-frame render callbacks from the map definition
    renderMap = mapDefinition.renderMap;
    renderPathArrows = mapDefinition.renderPathArrows || function() {};
}
