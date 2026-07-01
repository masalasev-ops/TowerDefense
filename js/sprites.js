// ============================================================
// SpriteAtlas — Pre-rendered Sprite Cache (Canvas-based)
// ============================================================
//
// This module uses the revealing module pattern (IIFE) to pre-render
// all game tiles and decorations into off-screen canvases once at
// startup. Subsequent draws use ctx.drawImage() for maximum
// performance — no per-frame pixel calculations.
//
// --- Architecture ---
// Sprites are organized in spriteBank[category][variant]:
//   - spriteBank.grass[0..7]     — 8 variants of grass tiles
//   - spriteBank.grass_3d[0..7]  — same tiles with 3D bevel edges
//
// Categories follow the pattern: <terrain> and <terrain>_3d for
// extruded (beveled) versions. Decoration sprites live under
// spriteBank.deco.{tree, rock, house}.
//
// --- 2.5D Lighting Model ---
// The sprites use a consistent directional lighting system with the
// light source coming from the top-left. Gradients transition from
// lighter (lit) at top-left to darker (shadowed) at bottom-right.
// This is applied to gradients, 3D bevel edges, and decoration
// highlights/shadows.
//
// --- 3D Extrusion (extrudeTile) ---
//   extrudeTile(sourceCanvas, isRaised) takes a flat tile and draws
//   3D bevel edges around it. For raised terrain (buildable cells):
//   light top-left edge, dark bottom-right edge. For recessed paths:
//   inverted — dark top-left, light bottom-right. All edges are
//   clipped to a rounded rectangle for smooth corners.
//
// --- Tile Types (by map biome) ---
//   Grass (default)      — 4 color variants, grass blades, flower dots
//   Path                 — 4 dirt variants, ruts, pebbles, rounded corners
//   Snow (Frozen Pass)   — 4 blue-white variants, texture speckles
//   Ice Path (Frozen)    — blue-grey ice, frost surface, crack network
//   Wall (Fortress)      — stone blocks with weathering and moss
//   Cobble (Fortress)    — patterned cobblestone path, rounded corners
//   Fort Grass           — muted fortress grass, sparse blades
//   Sand (Desert)        — tan variants, dune ripples, sand speckles
//   Jungle               — 4 dark green variants, leaf texture
//   Volcanic             — dark grey variants, ash speckles
//   Lava Path (Volcanic) — cracked dark stone with orange glow
//   Coastal              — green-brown cliff grass
//   Beach                — light sand with shell speckles
//
// --- Decoration Sprites ---
//   Tree  — 4-layer canopy with radial gradients, trunk with bark
//   Rock  — multi-facet shading with directional light, crack lines
//   House — 3D extruded walls, timber framing, roof tiles, window glow
// ============================================================

const SPRITE_SIZE = 40; // Must match CELL_SIZE

const SpriteAtlas = (function() {
    'use strict';

    /**
     * Storage for all pre-rendered sprites.
     * Structure: spriteBank[category][key] = { canvas, variants: [canvas, ...] }
     * @type {Object<string, (Object|Array)>}
     */
    const spriteBank = {};
    /** @type {boolean} Whether init() has completed */
    let initialized = false;

    // ================================================================
    // Internal Helpers
    // ================================================================

    /**
     * Create an off-screen canvas element with the given dimensions.
     * @param {number} [width=SPRITE_SIZE] - Canvas width in pixels
     * @param {number} [height=SPRITE_SIZE] - Canvas height in pixels
     * @returns {HTMLCanvasElement}
     */
    function makeCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width || SPRITE_SIZE;
        canvas.height = height || SPRITE_SIZE;
        return canvas;
    }

    /**
     * Deterministic pseudo-random number generator based on sine.
     * Returns a value in [0, 1) for a given seed integer.
     * Used to generate consistent tile variations from the same seed.
     * @param {number} seed - Integer seed value
     * @returns {number} Pseudo-random number 0.0–1.0
     */
    function seeded(seed) {
        const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    /**
     * Utility to clip the canvas context to a rounded rectangle.
     * Used for path/cobble tiles so their 3D bevel edges follow
     * a smooth rounded profile rather than sharp square corners.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} x - Rectangle left edge
     * @param {number} y - Rectangle top edge
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {number} radius - Corner radius in pixels
     */
    function roundedRectClip(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
        ctx.clip();
    }

    // ================================================================
    // Decoration Sprite Renderers
    // ================================================================

    /**
     * Render a detailed tree sprite with directional lighting.
     * Features:
     *   - 4-layer canopy with radial gradients (light offset to top-left)
     *   - Highlight arcs on upper-left of each canopy layer
     *   - Trunk with directional gradient and bark texture lines
     *   - Ground shadow offset to bottom-right
     * @param {number} seed - Deterministic seed for canopy variation
     * @returns {HTMLCanvasElement}
     */
    function renderTreeSprite(seed) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const centerX = SPRITE_SIZE / 2, centerY = SPRITE_SIZE / 2;

        // Directional ground shadow (consistent top-left light = shadow bottom-right)
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(centerX + 4, centerY + 13, 13, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk with directional gradient (light from left side)
        const trunkGradient = ctx.createLinearGradient(centerX - 4, 0, centerX + 4, 0);
        trunkGradient.addColorStop(0, '#6D4C41');  // lit side
        trunkGradient.addColorStop(0.3, '#795548');
        trunkGradient.addColorStop(0.6, '#5D4037');
        trunkGradient.addColorStop(1, '#3E2723');  // shadow side
        ctx.fillStyle = trunkGradient;
        ctx.fillRect(centerX - 3, centerY - 4, 6, 13);
        // Bark texture: horizontal wavy lines
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 0.5;
        for (let barkY = centerY - 2; barkY < centerY + 9; barkY += 3) {
            ctx.beginPath();
            ctx.moveTo(centerX - 2, barkY);
            ctx.lineTo(centerX + 2, barkY + seeded(seed + barkY) * 1.5);
            ctx.stroke();
        }

        // Dark underside canopy layer (creates depth shadow beneath upper layers)
        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY - 7, 12, 0, Math.PI * 2);
        ctx.fill();

        // Canopy layers with light-offset radial gradients
        const canopyColors = [
            { fill: '#1B5E20', highlight: '#2E7D32' },
            { fill: '#2E7D32', highlight: '#388E3C' },
            { fill: '#388E3C', highlight: '#43A047' },
            { fill: '#43A047', highlight: '#4CAF50' },
        ];
        for (let layer = 0; layer < 4; layer++) {
            const layerY = centerY - 10 - layer * 4;
            const layerRadius = 13 - layer * 2;
            const layerX = centerX + (seeded(seed + layer * 13) - 0.5) * 4;

            // Offset gradient center toward light source (top-left)
            const gradient = ctx.createRadialGradient(
                layerX - layerRadius * 0.35, layerY - layerRadius * 0.35, layerRadius * 0.1,
                layerX, layerY, layerRadius
            );
            gradient.addColorStop(0, canopyColors[layer].highlight);
            gradient.addColorStop(0.6, canopyColors[layer].fill);
            gradient.addColorStop(1, darkenColor(canopyColors[layer].fill, 0.2));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(layerX, layerY, layerRadius, 0, Math.PI * 2);
            ctx.fill();

            // Brighter highlight arc on upper-left edge (catchlight)
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.arc(layerX - layerRadius * 0.3, layerY - layerRadius * 0.35, layerRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fine outline on outer canopy edge for definition
        ctx.strokeStyle = 'rgba(0,20,0,0.15)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 13, 14, 0, Math.PI * 2);
        ctx.stroke();

        return canvas;
    }

    /**
     * Render a rock sprite with multi-facet directional shading.
     * Features:
     *   - Irregular 8-point polygon body with seeded variation
     *   - Directional gradient (lit top-left to dark bottom-right)
     *   - Light highlight facets on upper-left, dark shadow on bottom-right
     *   - Light rim arc on upper-left edge for edge definition
     *   - Crack lines across the surface
     *   - Ground shadow offset to bottom-right
     * @param {number} seed - Deterministic seed for shape variation
     * @returns {HTMLCanvasElement}
     */
    function renderRockSprite(seed) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const centerX = SPRITE_SIZE / 2, centerY = SPRITE_SIZE / 2 + 4;

        // Directional ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(centerX + 4, centerY + 10, 13, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body with light-directional gradient (top-left lit, bottom-right dark)
        const gradient = ctx.createLinearGradient(centerX - 10, centerY - 8, centerX + 10, centerY + 8);
        gradient.addColorStop(0, '#C7C7C7');   // lit
        gradient.addColorStop(0.3, '#B0B0B0');
        gradient.addColorStop(0.6, '#8A8A8A');
        gradient.addColorStop(0.85, '#666666');
        gradient.addColorStop(1, '#505050');   // shadow
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const numPoints = 8;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
            const radius = 10 * (0.7 + seeded(seed + i * 5) * 0.6);
            const pointX = centerX + Math.cos(angle) * radius;
            const pointY = centerY + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(pointX, pointY);
            else ctx.lineTo(pointX, pointY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Multi-facet shading: light highlight on top-left
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(centerX - 3, centerY - 5, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Secondary highlight facet
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.arc(centerX - 5, centerY - 1, 4, 0, Math.PI * 2);
        ctx.fill();

        // Dark shadow facet on bottom-right
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.arc(centerX + 4, centerY + 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Light rim crescent on upper-left edge for edge definition
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX - 1, centerY - 3, 9.5, -Math.PI * 0.8, -Math.PI * 0.15);
        ctx.stroke();

        // Surface cracks
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(centerX - 3, centerY + 2);
        ctx.lineTo(centerX + 2, centerY - 3);
        ctx.lineTo(centerX + 4, centerY - 6);
        ctx.stroke();

        return canvas;
    }

    /**
     * Render a house sprite with 3D extrusion and window glow.
     * Features:
     *   - Main wall with directional gradient and timber framing
     *   - Right/bottom 3D extrusion faces for depth
     *   - Roof with directional gradient and tile lines
     *   - Roof overhang shadow on wall
     *   - Roof light highlight on left face
     *   - Door with frame and knob
     *   - Window with warm radial glow and cross-pane dividers
     *   - Chimney with 3D sides and smoke puff
     *   - Ground shadow
     * @returns {HTMLCanvasElement}
     */
    function renderHouseSprite() {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const centerX = SPRITE_SIZE / 2, centerY = SPRITE_SIZE / 2 + 2;

        // Directional ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(centerX + 4, centerY + 13, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Walls — side faces for 3D extrusion depth
        // Right wall shadow (dark edge)
        ctx.fillStyle = '#B8A88C';
        ctx.fillRect(centerX + 8, centerY - 2, 3, 14);
        // Bottom wall shadow
        ctx.fillStyle = '#C4B498';
        ctx.fillRect(centerX - 10, centerY + 8, 20, 3);

        // Main wall with directional gradient (light from left)
        const wallGradient = ctx.createLinearGradient(centerX - 10, 0, centerX + 10, 0);
        wallGradient.addColorStop(0, '#F2EDE0');  // lit
        wallGradient.addColorStop(0.3, '#E8D5B7');
        wallGradient.addColorStop(0.7, '#D7C4A1');
        wallGradient.addColorStop(1, '#C4B08A');  // shadow side
        ctx.fillStyle = wallGradient;
        ctx.fillRect(centerX - 10, centerY - 2, 20, 14);

        // Timber framing (horizontal and vertical beams)
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(centerX - 10, centerY - 2, 20, 14);
        ctx.beginPath(); ctx.moveTo(centerX - 10, centerY + 4); ctx.lineTo(centerX + 10, centerY + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX, centerY - 2); ctx.lineTo(centerX, centerY + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX - 5, centerY - 2); ctx.lineTo(centerX - 5, centerY + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX + 5, centerY - 2); ctx.lineTo(centerX + 5, centerY + 4); ctx.stroke();

        // Roof overhang shadow on wall
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(centerX - 13, centerY - 2, 26, 3);

        // Roof with directional gradient
        const roofGradient = ctx.createLinearGradient(centerX - 13, centerY - 16, centerX + 13, centerY - 2);
        roofGradient.addColorStop(0, '#D32F2F');  // lit side
        roofGradient.addColorStop(0.4, '#C62828');
        roofGradient.addColorStop(0.8, '#8E0000');
        roofGradient.addColorStop(1, '#6D0000');  // dark edge
        ctx.fillStyle = roofGradient;
        ctx.beginPath();
        ctx.moveTo(centerX - 13, centerY - 2);
        ctx.lineTo(centerX, centerY - 18);
        ctx.lineTo(centerX + 13, centerY - 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5D0000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Roof tile lines (horizontal bands)
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.6;
        for (let tileIndex = 0; tileIndex < 5; tileIndex++) {
            const rowY = centerY - 15 + tileIndex * 3.2;
            ctx.beginPath();
            ctx.moveTo(centerX - 12 + tileIndex * 2.5, rowY);
            ctx.lineTo(centerX + 12 - tileIndex * 2.5, rowY);
            ctx.stroke();
        }

        // Roof light highlight on left face
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(centerX - 11, centerY - 3);
        ctx.lineTo(centerX - 2, centerY - 16);
        ctx.lineTo(centerX + 5, centerY - 5);
        ctx.lineTo(centerX - 5, centerY - 3);
        ctx.closePath();
        ctx.fill();

        // Door with frame
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(centerX - 4, centerY - 1, 8, 13);
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(centerX - 3, centerY, 6, 11);
        // Door knob
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY + 7, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Window with warm glow (radial gradient expands beyond window)
        const windowGlow = ctx.createRadialGradient(centerX + 5, centerY - 1, 0.5, centerX + 5, centerY - 1, 8);
        windowGlow.addColorStop(0, 'rgba(255,245,180,0.35)');
        windowGlow.addColorStop(0.3, 'rgba(255,240,160,0.15)');
        windowGlow.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = windowGlow;
        ctx.fillRect(centerX + 1, centerY - 5, 10, 10);

        // Window pane with light gradient
        const windowGradient = ctx.createRadialGradient(centerX + 5, centerY - 1, 0.5, centerX + 5, centerY - 1, 4);
        windowGradient.addColorStop(0, '#FFF9C4');
        windowGradient.addColorStop(1, '#81D4FA');
        ctx.fillStyle = windowGradient;
        ctx.fillRect(centerX + 3, centerY - 2, 5, 5);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(centerX + 3, centerY - 2, 5, 5);
        ctx.beginPath(); ctx.moveTo(centerX + 5.5, centerY - 2); ctx.lineTo(centerX + 5.5, centerY + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX + 3, centerY + 0.5); ctx.lineTo(centerX + 8, centerY + 0.5); ctx.stroke();

        // Chimney with 3D sides
        ctx.fillStyle = '#616161';
        ctx.fillRect(centerX + 5, centerY - 16, 5, 9);
        ctx.fillStyle = '#757575'; // lit face (left side)
        ctx.fillRect(centerX + 5, centerY - 16, 3, 9);
        // Chimney smoke puff
        ctx.fillStyle = 'rgba(180,180,180,0.25)';
        ctx.beginPath();
        ctx.ellipse(centerX + 7, centerY - 18, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        return canvas;
    }

    // ================================================================
    // Terrain Tile Renderers
    // ================================================================

    /**
     * Render a grass tile variant (for buildable cells).
     * 4 base color schemes with seeded grass blades and small flower dots.
     * @param {number} variantIndex - Selects color scheme and blade layout
     * @returns {HTMLCanvasElement}
     */
    function renderGrassTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        // Base grass with subtle vertical gradient
        const baseColors = [
            ['#6a9e4a', '#5d8a3e'], // light variant
            ['#5d8a3e', '#4f7d35'], // medium variant
            ['#527a36', '#456b2c'], // dark variant
            ['#609145', '#53803a'], // green variant
        ];
        const colors = baseColors[variantIndex % baseColors.length];
        const gradient = ctx.createLinearGradient(0, 0, 0, tileHeight);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Grass blades (curved strokes)
        ctx.strokeStyle = 'rgba(30,80,20,0.2)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 6; i++) {
            const grassStartX = 4 + seeded(variantIndex * 100 + i * 17) * (tileWidth - 8);
            const grassStartY = tileHeight - 4;
            const grassHeight = 4 + seeded(variantIndex * 100 + i * 31) * 6;
            ctx.beginPath();
            ctx.moveTo(grassStartX, grassStartY);
            ctx.quadraticCurveTo(
                grassStartX + seeded(variantIndex + i) * 4 - 2,
                grassStartY - grassHeight * 0.6,
                grassStartX + 1,
                grassStartY - grassHeight
            );
            ctx.stroke();
        }

        // Small clover/flower dots (spawned randomly per seed)
        for (let i = 0; i < 2; i++) {
            if (seeded(variantIndex * 77 + i * 13) > 0.7) {
                const flowerX = 6 + seeded(variantIndex * 43 + i) * (tileWidth - 12);
                const flowerY = 6 + seeded(variantIndex * 67 + i) * (tileHeight - 12);
                ctx.fillStyle = seeded(variantIndex * 91 + i) > 0.5 ? '#FFF176' : '#FFCC80';
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        return canvas;
    }

    /**
     * Render a dirt path tile variant (for enemy walkable cells).
     * 4 color variants with rounded corners, rut marks, and small pebbles.
     * Path tiles use rounded-rect clipping so adjacent tile bevels
     * create a smooth continuous path surface.
     * @param {number} variantIndex - Selects color scheme and pebble layout
     * @returns {HTMLCanvasElement}
     */
    function renderPathTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;
        const cornerRadius = 8;

        // Clip to rounded rect so path edges aren't sharp squares
        roundedRectClip(ctx, 0, 0, tileWidth, tileHeight, cornerRadius);

        const pathColors = [
            ['#C4A46C', '#B8956A'],
            ['#B8956A', '#A8855A'],
            ['#D4B87C', '#C4A46C'],
            ['#BFA070', '#AD8C5E'],
        ];
        const colors = pathColors[variantIndex % pathColors.length];
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, tileWidth, tileHeight);
        ctx.fillStyle = colors[1];
        ctx.fillRect(2, 2, tileWidth - 4, tileHeight - 4);

        // Rut marks (wagon wheel tracks)
        ctx.strokeStyle = 'rgba(100,65,30,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, tileHeight * 0.33);
        ctx.quadraticCurveTo(tileWidth / 2, tileHeight * 0.35, tileWidth - 4, tileHeight * 0.33);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, tileHeight * 0.67);
        ctx.quadraticCurveTo(tileWidth / 2, tileHeight * 0.65, tileWidth - 4, tileHeight * 0.67);
        ctx.stroke();

        // Small pebbles scattered on path
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let i = 0; i < 2; i++) {
            if (seeded(variantIndex * 53 + i * 19) > 0.6) {
                const pebbleX = 6 + seeded(variantIndex * 37 + i) * (tileWidth - 12);
                const pebbleY = 6 + seeded(variantIndex * 71 + i) * (tileHeight - 12);
                ctx.beginPath();
                ctx.arc(pebbleX, pebbleY, seeded(variantIndex * 23 + i) * 1.5 + 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        return canvas;
    }

    /**
     * Render a snow terrain tile (for Frozen Pass map).
     * 4 blue-white color variants with white texture speckles.
     * @param {number} variantIndex - Selects color scheme and speckle layout
     * @returns {HTMLCanvasElement}
     */
    function renderSnowTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        const snowColors = [
            ['#e8eef3', '#dce4eb'],
            ['#dce4eb', '#cfd8e0'],
            ['#f0f4f8', '#e2e8f0'],
            ['#d5dde5', '#c8d0d8'],
        ];
        const colors = snowColors[variantIndex % snowColors.length];
        const gradient = ctx.createLinearGradient(0, 0, 0, tileHeight);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Snow texture speckles (semi-transparent white dots)
        for (let i = 0; i < 5; i++) {
            const speckleX = 3 + seeded(variantIndex * 47 + i * 11) * (tileWidth - 6);
            const speckleY = 3 + seeded(variantIndex * 59 + i * 23) * (tileHeight - 6);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + seeded(variantIndex + i) * 0.2) + ')';
            ctx.beginPath();
            ctx.arc(speckleX, speckleY, 1 + seeded(variantIndex + i * 3) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    /**
     * Render an ice path tile (for Frozen Pass map — walkable cells).
     * Dark blue-grey ice base (contrasts with white snow), frosted surface,
     * white-blue crack network, and frosted edge specks.
     * Uses rounded-rect clipping for smooth path bevels.
     * @param {number} variantIndex - Selects crack and speckle layout
     * @returns {HTMLCanvasElement}
     */
    function renderIcePathTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        roundedRectClip(ctx, 0, 0, tileWidth, tileHeight, 8);

        // Dark blue-grey ice base — contrasts with white snow terrain
        const gradient = ctx.createLinearGradient(0, 0, tileWidth, tileHeight);
        gradient.addColorStop(0, '#7a8fa0');
        gradient.addColorStop(0.5, '#6b8092');
        gradient.addColorStop(1, '#5c7285');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Frosted ice surface overlay
        ctx.fillStyle = 'rgba(160,200,230,0.25)';
        ctx.fillRect(2, 2, tileWidth - 4, tileHeight - 4);

        // Ice crack network — white-blue cracks for visibility on dark ice
        ctx.strokeStyle = 'rgba(180,210,240,0.55)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const crackStartX = 4 + seeded(variantIndex * 31 + i * 17) * (tileWidth - 8);
            const crackStartY = 4 + seeded(variantIndex * 41 + i * 19) * (tileHeight - 8);
            ctx.moveTo(crackStartX, crackStartY);
            ctx.lineTo(
                crackStartX + seeded(variantIndex + i * 7) * 16 - 8,
                crackStartY + seeded(variantIndex + i * 11) * 14 - 7
            );
            ctx.lineTo(
                crackStartX + seeded(variantIndex + i * 13) * 12 - 6,
                crackStartY + seeded(variantIndex + i * 17) * 16 - 8
            );
            ctx.stroke();
        }

        // Frosted edge specks
        ctx.fillStyle = 'rgba(200,225,245,0.3)';
        for (let i = 0; i < 3; i++) {
            const frostX = 4 + seeded(variantIndex * 53 + i * 7) * (tileWidth - 8);
            const frostY = 4 + seeded(variantIndex * 67 + i * 11) * (tileHeight - 8);
            ctx.beginPath();
            ctx.arc(frostX, frostY, seeded(variantIndex + i * 3) * 2 + 1, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    /**
     * Render a stone wall tile (for Fortress Siege map — non-walkable).
     * Dark grey base with stone block pattern, weathering overlay, and
     * occasional moss spots.
     * @param {number} variantIndex - Selects moss placement
     * @returns {HTMLCanvasElement}
     */
    function renderWallTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        // Wall base with vertical gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, tileHeight);
        gradient.addColorStop(0, '#757575');
        gradient.addColorStop(0.5, '#616161');
        gradient.addColorStop(1, '#505050');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Stone block grid pattern
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 0.8;
        const blockRows = 3;
        const blockHeight = tileHeight / blockRows;
        for (let row = 0; row < blockRows; row++) {
            const blockY = row * blockHeight;
            ctx.beginPath(); ctx.moveTo(0, blockY); ctx.lineTo(tileWidth, blockY); ctx.stroke();
            const blockOffset = (row % 2) * tileWidth * 0.25;
            for (let blockX = blockOffset; blockX < tileWidth; blockX += tileWidth * 0.45) {
                ctx.beginPath(); ctx.moveTo(blockX, blockY); ctx.lineTo(blockX, blockY + blockHeight); ctx.stroke();
            }
        }

        // Weathering/dirt overlay
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Moss spots on wall (occasional)
        if (seeded(variantIndex) > 0.6) {
            ctx.fillStyle = 'rgba(80,120,60,0.3)';
            ctx.beginPath();
            ctx.arc(8 + seeded(variantIndex * 3) * 10, tileHeight - 4, 3 + seeded(variantIndex * 7) * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    /**
     * Render a cobblestone path tile (for Fortress Siege map — walkable).
     * Grey-brown base with a grid of rounded cobblestone blocks.
     * Uses rounded-rect clipping for smooth path bevels.
     * @param {number} variantIndex - Selects cobble offset pattern
     * @returns {HTMLCanvasElement}
     */
    function renderCobbleTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        roundedRectClip(ctx, 0, 0, tileWidth, tileHeight, 8);

        // Base cobblestone surface
        ctx.fillStyle = '#8a8075';
        ctx.fillRect(0, 0, tileWidth, tileHeight);
        ctx.fillStyle = '#9e948a';
        ctx.fillRect(2, 2, tileWidth - 4, tileHeight - 4);

        // Cobblestone block grid pattern (staggered rows)
        ctx.strokeStyle = 'rgba(70,60,50,0.35)';
        ctx.lineWidth = 0.8;
        for (let row = 0; row < 4; row++) {
            const rowY = 4 + row * 9;
            ctx.beginPath(); ctx.moveTo(3, rowY); ctx.lineTo(tileWidth - 3, rowY); ctx.stroke();
            const blockOffset = (row % 2) * 7;
            for (let blockX = 3 + blockOffset; blockX < tileWidth; blockX += 14) {
                ctx.beginPath(); ctx.moveTo(blockX, rowY); ctx.lineTo(blockX, rowY + 9); ctx.stroke();
            }
        }

        return canvas;
    }

    /**
     * Render a fortress grass tile (for Fortress Siege map — non-walkable).
     * Muted green-brown colors with sparse dry grass blades.
     * @param {number} variantIndex - Selects color scheme and grass layout
     * @returns {HTMLCanvasElement}
     */
    function renderFortGrassTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        const colors = [['#556b3a', '#48602e'], ['#48602e', '#3d5224'], ['#5a7040', '#4d6232']];
        const colorPair = colors[variantIndex % colors.length];
        ctx.fillStyle = colorPair[0];
        ctx.fillRect(0, 0, tileWidth, tileHeight);

        // Sparse dry grass blades
        ctx.strokeStyle = 'rgba(40,60,25,0.2)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
            const grassStartX = 5 + seeded(variantIndex * 33 + i * 11) * (tileWidth - 10);
            const grassStartY = tileHeight - 3;
            ctx.beginPath();
            ctx.moveTo(grassStartX, grassStartY);
            ctx.lineTo(
                grassStartX + seeded(variantIndex + i) * 3 - 1.5,
                grassStartY - 4 - seeded(variantIndex + i * 2) * 5
            );
            ctx.stroke();
        }

        return canvas;
    }

    /**
     * Render a desert sand tile (for Desert Sands map — non-walkable).
     * Tan color variants with sinusoidal dune ripple lines and sand speckles.
     * @param {number} variantIndex - Selects color scheme and ripple layout
     * @returns {HTMLCanvasElement}
     */
    function renderSandTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;
        const colors = [['#d4b896','#c9ad8a'],['#c9ad8a','#bfa37e'],['#dcc4a4','#d0b894'],['#c4a47c','#b89870']];
        const colorPair = colors[variantIndex % colors.length];
        ctx.fillStyle = colorPair[0]; ctx.fillRect(0, 0, tileWidth, tileHeight);
        // Dune ripple lines (sinusoidal wave patterns)
        ctx.strokeStyle = 'rgba(180,150,120,0.3)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
            const rippleY = 6 + i * 12 + seeded(variantIndex * 13 + i) * 4;
            ctx.beginPath();
            ctx.moveTo(2, rippleY);
            for (let rippleX = 2; rippleX < tileWidth; rippleX += 5) {
                ctx.lineTo(rippleX, rippleY + Math.sin(rippleX * 0.4 + variantIndex + i) * 2);
            }
            ctx.stroke();
        }
        // Sand speckles
        for (let i = 0; i < 4; i++) {
            const speckleX = 4 + seeded(variantIndex * 71 + i * 17) * (tileWidth - 8);
            const speckleY = 4 + seeded(variantIndex * 43 + i * 29) * (tileHeight - 8);
            ctx.fillStyle = 'rgba(200,180,150,0.4)';
            ctx.beginPath(); ctx.arc(speckleX, speckleY, 1.2, 0, Math.PI*2); ctx.fill();
        }
        return canvas;
    }

    /**
     * Render a jungle terrain tile (for Jungle map — non-walkable).
     * Dark green variants with dense leaf-shaped ellipse textures.
     * @param {number} variantIndex - Selects color scheme and leaf layout
     * @returns {HTMLCanvasElement}
     */
    function renderJungleTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;
        const colors = [['#3d6b2e','#345c25'],['#345c25','#2a4d1e'],['#427a32','#386828'],['#2e5524','#23471c']];
        const colorPair = colors[variantIndex % colors.length];
        const gradient = ctx.createLinearGradient(0, 0, 0, tileHeight);
        gradient.addColorStop(0, colorPair[0]); gradient.addColorStop(1, colorPair[1]);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, tileWidth, tileHeight);
        // Dense leaf texture (rotated ellipses)
        ctx.fillStyle = 'rgba(30,80,20,0.2)';
        for (let i = 0; i < 5; i++) {
            const leafX = 4 + seeded(variantIndex * 37 + i * 11) * (tileWidth - 8);
            const leafY = 4 + seeded(variantIndex * 53 + i * 19) * (tileHeight - 8);
            ctx.beginPath();
            ctx.ellipse(
                leafX, leafY,
                5 + seeded(variantIndex + i) * 3,
                3 + seeded(variantIndex + i * 2) * 2,
                seeded(variantIndex + i * 7), 0, Math.PI * 2
            );
            ctx.fill();
        }
        return canvas;
    }

    /**
     * Render a volcanic terrain tile (for Volcano map — non-walkable).
     * Dark grey variants with ash speckles of varying opacity.
     * @param {number} variantIndex - Selects color scheme and speckle layout
     * @returns {HTMLCanvasElement}
     */
    function renderVolcanicTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;
        const colors = [['#3d3d3d','#333'],['#333','#2a2a2a'],['#383838','#303030'],['#2e2e2e','#252525']];
        const colorPair = colors[variantIndex % colors.length];
        ctx.fillStyle = colorPair[0]; ctx.fillRect(0, 0, tileWidth, tileHeight);
        // Ash speckles scattered across surface
        for (let i = 0; i < 6; i++) {
            const speckleX = 3 + seeded(variantIndex * 61 + i * 13) * (tileWidth - 6);
            const speckleY = 3 + seeded(variantIndex * 47 + i * 23) * (tileHeight - 6);
            ctx.fillStyle = 'rgba(180,180,180,' + (0.1 + seeded(variantIndex + i) * 0.15) + ')';
            ctx.beginPath();
            ctx.arc(speckleX, speckleY, seeded(variantIndex + i * 3) * 1.5 + 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        return canvas;
    }

    /**
     * Render a lava path tile (for Volcano map — walkable).
     * Dark cracked stone base with orange glowing cracks and glow spots.
     * Uses rounded-rect clipping for smooth path bevels.
     * @param {number} variantIndex - Selects crack and glow layout
     * @returns {HTMLCanvasElement}
     */
    function renderLavaPathTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;

        roundedRectClip(ctx, 0, 0, tileWidth, tileHeight, 8);

        // Dark cracked stone base
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, tileWidth, tileHeight);
        ctx.fillStyle = '#222'; ctx.fillRect(2, 2, tileWidth - 4, tileHeight - 4);
        // Glowing lava crack lines
        ctx.strokeStyle = 'rgba(255,110,0,0.6)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const crackStartX = 4 + seeded(variantIndex * 31 + i * 13) * (tileWidth - 8);
            const crackStartY = 4 + seeded(variantIndex * 41 + i * 17) * (tileHeight - 8);
            ctx.moveTo(crackStartX, crackStartY);
            ctx.lineTo(
                crackStartX + seeded(variantIndex + i * 7) * 16 - 8,
                crackStartY + seeded(variantIndex + i * 9) * 12 - 6
            );
            ctx.stroke();
        }
        // Orange glow spots (molten rock peeking through)
        for (let i = 0; i < 2; i++) {
            const glowX = 6 + seeded(variantIndex * 73 + i * 19) * (tileWidth - 12);
            const glowY = 6 + seeded(variantIndex * 57 + i * 29) * (tileHeight - 12);
            ctx.fillStyle = 'rgba(255,80,0,0.25)';
            ctx.beginPath();
            ctx.arc(glowX, glowY, 3 + seeded(variantIndex + i) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        return canvas;
    }

    /**
     * Render a coastal cliff tile (for Coastal map — non-walkable).
     * Green-brown variants with sparse grass tufts along the cliff edge.
     * @param {number} variantIndex - Selects color scheme and grass layout
     * @returns {HTMLCanvasElement}
     */
    function renderCoastalTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;
        const colors = [['#6a8a4a','#5d7a3e'],['#5d7a3e','#4f6b32'],['#70944e','#638042'],['#587238','#4a622e']];
        const colorPair = colors[variantIndex % colors.length];
        const gradient = ctx.createLinearGradient(0, 0, 0, tileHeight);
        gradient.addColorStop(0, colorPair[0]); gradient.addColorStop(1, colorPair[1]);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, tileWidth, tileHeight);
        // Grass tufts along cliff edge
        ctx.strokeStyle = 'rgba(40,80,25,0.2)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) {
            const grassStartX = 5 + seeded(variantIndex * 33 + i * 11) * (tileWidth - 10);
            const grassStartY = tileHeight - 2;
            ctx.beginPath();
            ctx.moveTo(grassStartX, grassStartY);
            ctx.lineTo(grassStartX + 1, grassStartY - 4 - seeded(variantIndex + i) * 3);
            ctx.stroke();
        }
        return canvas;
    }

    /**
     * Render a beach sand tile (for Coastal map — non-walkable).
     * Light golden sand variants with white shell speckles.
     * @param {number} variantIndex - Selects color scheme and speckle layout
     * @returns {HTMLCanvasElement}
     */
    function renderBeachTile(variantIndex) {
        const canvas = makeCanvas();
        const ctx = canvas.getContext('2d');
        const tileWidth = SPRITE_SIZE, tileHeight = SPRITE_SIZE;
        const colors = [['#e8d5a0','#decb94'],['#decb94','#d4c088'],['#f0e0b0','#e5d4a0'],['#d8c590','#ceba84']];
        const colorPair = colors[variantIndex % colors.length];
        ctx.fillStyle = colorPair[0]; ctx.fillRect(0, 0, tileWidth, tileHeight);
        // Shell speckles (tiny white dots)
        for (let i = 0; i < 3; i++) {
            const speckleX = 5 + seeded(variantIndex * 29 + i * 7) * (tileWidth - 10);
            const speckleY = 5 + seeded(variantIndex * 51 + i * 13) * (tileHeight - 10);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            ctx.arc(speckleX, speckleY, 0.8 + seeded(variantIndex + i) * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        return canvas;
    }

    // ================================================================
    // 3D Extrusion System
    // ================================================================

    /**
     * Add 3D bevel edges to a flat tile canvas.
     *
     * For RAISED terrain (buildable cells like grass, snow):
     *   Light top-left edge (catches light), dark bottom-right edge (in shadow)
     *   Creates the illusion of terrain popping upward.
     *
     * For RECESSED paths (walkable cells like dirt, ice):
     *   Inverted: dark top-left edge (inner shadow), light bottom-right edge
     *   Creates the illusion of a depression or groove in the ground.
     *
     * All edges are clipped to a rounded rectangle so adjacent tiles
     * form smooth continuous path/terrain surfaces.
     *
     * @param {HTMLCanvasElement} sourceCanvas - Flat tile to extrude
     * @param {boolean} isRaised - true for raised terrain, false for recessed path
     * @returns {HTMLCanvasElement} New canvas with beveled edges applied
     */
    function extrudeTile(sourceCanvas, isRaised) {
        const tileWidth = sourceCanvas.width, tileHeight = sourceCanvas.height;
        const canvas = makeCanvas(tileWidth, tileHeight);
        const ctx = canvas.getContext('2d');
        const bevel = 6; // edge width in pixels (increased for visible 3D depth)
        const cornerRadius = 8; // corner radius for bevel edges

        // Copy the flat source tile onto the output canvas
        ctx.drawImage(sourceCanvas, 0, 0);

        // Sample the center pixel to derive edge colors
        const centerPixel = ctx.getImageData(tileWidth / 2, tileHeight / 2, 1, 1).data;
        const centerColorHex = `#${centerPixel[0].toString(16).padStart(2,'0')}${centerPixel[1].toString(16).padStart(2,'0')}${centerPixel[2].toString(16).padStart(2,'0')}`;

        // Generate edge colors by darkening/lightening the center color
        const darkEdge       = darkenColor(centerColorHex, 0.22);
        const darkEdgeShallow  = darkenColor(centerColorHex, 0.12);
        const lightEdge      = lightenColor(centerColorHex, 0.08);
        const lightEdgeShallow = lightenColor(centerColorHex, 0.04);

        // Draw bevel edges clipped to a slightly expanded rounded rectangle
        // so the corners follow the tile's rounded shape
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cornerRadius, -1);
        ctx.lineTo(tileWidth - cornerRadius, -1);
        ctx.arcTo(tileWidth + 1, -1, tileWidth + 1, cornerRadius, cornerRadius);
        ctx.lineTo(tileWidth + 1, tileHeight - cornerRadius);
        ctx.arcTo(tileWidth + 1, tileHeight + 1, tileWidth - cornerRadius, tileHeight + 1, cornerRadius);
        ctx.lineTo(cornerRadius, tileHeight + 1);
        ctx.arcTo(-1, tileHeight + 1, -1, tileHeight - cornerRadius, cornerRadius);
        ctx.lineTo(-1, cornerRadius);
        ctx.arcTo(-1, -1, cornerRadius, -1, cornerRadius);
        ctx.closePath();
        ctx.clip();

        if (isRaised) {
            // ---- RAISED (buildable terrain): light top-left, dark bottom-right ----
            ctx.fillStyle = darkEdge;
            ctx.fillRect(0, tileHeight - bevel, tileWidth, bevel);
            ctx.fillStyle = darkEdgeShallow;
            ctx.fillRect(tileWidth - bevel, 0, bevel, tileHeight - bevel);
            ctx.fillStyle = lightEdge;
            ctx.fillRect(0, 0, tileWidth - bevel, bevel);
            ctx.fillStyle = lightEdgeShallow;
            ctx.fillRect(0, bevel, bevel, tileHeight - bevel);
        } else {
            // ---- RECESSED (path): dark top-left, light bottom-right ----
            ctx.fillStyle = darkEdge;
            ctx.fillRect(0, 0, tileWidth, bevel);
            ctx.fillStyle = darkEdgeShallow;
            ctx.fillRect(0, bevel, bevel, tileHeight - bevel);
            ctx.fillStyle = lightEdge;
            ctx.fillRect(bevel, tileHeight - bevel, tileWidth - bevel, bevel);
            ctx.fillStyle = lightEdgeShallow;
            ctx.fillRect(tileWidth - bevel, bevel, bevel, tileHeight - bevel);
        }

        ctx.restore();

        // Subtle inner shadow at bevel boundaries for crisp definition
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bevel, bevel, tileWidth - bevel * 2, tileHeight - bevel * 2);

        return canvas;
    }

    // ================================================================
    // Public API
    // ================================================================

    /**
     * Initialize the sprite atlas by generating all tile and decoration sprites.
     * Generates multiple seeded variants for each terrain type plus 3D-extruded
     * versions. Safe to call multiple times.
     *
     * Generated categories:
     *   grass / grass_3d         — 8 variants
     *   snow / snow_3d           — 6 variants
     *   fort_grass / fort_grass_3d — 6 variants
     *   path / path_3d           — 6 variants
     *   ice_path / ice_path_3d   — 4 variants
     *   cobble / cobble_3d       — 4 variants
     *   wall                     — 6 variants (no 3D, walls are flat)
     *   sand / sand_3d           — 6 variants
     *   jungle / jungle_3d       — 6 variants
     *   volcanic / volcanic_3d   — 6 variants
     *   lava_path / lava_path_3d — 4 variants
     *   coastal / coastal_3d     — 6 variants
     *   sand_beach               — 4 variants (no 3D, beach is flat)
     *   deco.tree                — 6 sprites
     *   deco.rock                — 5 sprites
     *   deco.house               — 3 sprites
     */
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

        // Path variants (dirt path tiles — walkable)
        spriteBank.path = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.path.push(renderPathTile(i));
        }
        spriteBank.path_3d = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.path_3d.push(extrudeTile(spriteBank.path[i], false));
        }

        // Ice path variants (Frozen Pass — walkable)
        spriteBank.ice_path = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.ice_path.push(renderIcePathTile(i));
        }
        spriteBank.ice_path_3d = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.ice_path_3d.push(extrudeTile(spriteBank.ice_path[i], false));
        }

        // Cobblestone path variants (Fortress Siege — walkable)
        spriteBank.cobble = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.cobble.push(renderCobbleTile(i));
        }
        spriteBank.cobble_3d = [];
        for (let i = 0; i < 4; i++) {
            spriteBank.cobble_3d.push(extrudeTile(spriteBank.cobble[i], false));
        }

        // Wall variants (Fortress Siege — non-walkable)
        spriteBank.wall = [];
        for (let i = 0; i < 6; i++) {
            spriteBank.wall.push(renderWallTile(i));
        }

        // Desert sand terrain
        spriteBank.sand = [];
        for (let i = 0; i < 6; i++) spriteBank.sand.push(renderSandTile(i));
        spriteBank.sand_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.sand_3d.push(extrudeTile(spriteBank.sand[i], true));

        // Jungle terrain
        spriteBank.jungle = [];
        for (let i = 0; i < 6; i++) spriteBank.jungle.push(renderJungleTile(i));
        spriteBank.jungle_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.jungle_3d.push(extrudeTile(spriteBank.jungle[i], true));

        // Volcanic terrain
        spriteBank.volcanic = [];
        for (let i = 0; i < 6; i++) spriteBank.volcanic.push(renderVolcanicTile(i));
        spriteBank.volcanic_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.volcanic_3d.push(extrudeTile(spriteBank.volcanic[i], true));

        // Lava path (Volcano — walkable)
        spriteBank.lava_path = [];
        for (let i = 0; i < 4; i++) spriteBank.lava_path.push(renderLavaPathTile(i));
        spriteBank.lava_path_3d = [];
        for (let i = 0; i < 4; i++) spriteBank.lava_path_3d.push(extrudeTile(spriteBank.lava_path[i], false));

        // Coastal cliff terrain
        spriteBank.coastal = [];
        for (let i = 0; i < 6; i++) spriteBank.coastal.push(renderCoastalTile(i));
        spriteBank.coastal_3d = [];
        for (let i = 0; i < 6; i++) spriteBank.coastal_3d.push(extrudeTile(spriteBank.coastal[i], true));

        // Beach sand (Coastal — non-walkable, flat)
        spriteBank.sand_beach = [];
        for (let i = 0; i < 4; i++) spriteBank.sand_beach.push(renderBeachTile(i));

        // Decoration sprites (trees, rocks, houses)
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

    /**
     * Draw a tile from the atlas at a given pixel position.
     * Falls back to a solid color fill if the category is not found
     * (uses the category string itself as the fill color).
     * @param {CanvasRenderingContext2D} ctx - Target canvas context
     * @param {string} category - Sprite category (e.g., 'grass', 'path', 'grass_3d')
     * @param {number} [variantIndex=0] - Variant index (modulo selects from available variants)
     * @param {number} x - Pixel X position
     * @param {number} y - Pixel Y position
     * @param {number} [width=SPRITE_SIZE] - Draw width in pixels
     * @param {number} [height=SPRITE_SIZE] - Draw height in pixels
     */
    function drawTile(ctx, category, variantIndex, x, y, width, height) {
        if (!initialized) init();
        const bank = spriteBank[category];
        if (!bank) {
            // Fallback: fill with the category name as a color string
            ctx.fillStyle = category;
            ctx.fillRect(x, y, width || SPRITE_SIZE, height || SPRITE_SIZE);
            return;
        }
        let img;
        if (Array.isArray(bank)) {
            img = bank[Math.abs(variantIndex || 0) % bank.length];
        } else {
            // Nested structure: e.g., spriteBank.deco.tree
            const sub = bank[variantIndex !== undefined ? variantIndex : 0];
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
            ctx.drawImage(img, x, y, width || SPRITE_SIZE, height || SPRITE_SIZE);
        }
    }

    /**
     * Draw a decoration sprite centered at the given pixel position.
     * Supports tree, rock, and house decorations.
     * @param {CanvasRenderingContext2D} ctx - Target canvas context
     * @param {string} type - Decoration type (BLOCKED_TREE, BLOCKED_ROCK, BLOCKED_HOUSE)
     * @param {number} seed - Deterministic seed for variant selection
     * @param {number} centerX - Center pixel X position
     * @param {number} centerY - Center pixel Y position
     * @param {number} [size=SPRITE_SIZE] - Draw size in pixels
     */
    function drawDeco(ctx, type, seed, centerX, centerY, size) {
        if (!initialized) init();
        const decoBank = spriteBank.deco;
        let images;
        if (type === BLOCKED_TREE) images = decoBank.tree;
        else if (type === BLOCKED_ROCK) images = decoBank.rock;
        else if (type === BLOCKED_HOUSE) images = decoBank.house;
        else return;

        const img = images[Math.abs(seed || 0) % images.length];
        const spriteSize = size || SPRITE_SIZE;
        ctx.drawImage(img, centerX - spriteSize / 2, centerY - spriteSize / 2, spriteSize, spriteSize);
    }

    /**
     * Check if the sprite atlas has a given category.
     * @param {string} category - Category name to check
     * @returns {boolean} True if the category exists in the atlas
     */
    function has(category) {
        return !!spriteBank[category];
    }

    return { init, drawTile, drawDeco, has, SPRITE_SIZE };
})();

// Auto-initialize when BLOCKED_TREE constant is available
if (typeof BLOCKED_TREE !== 'undefined') {
    SpriteAtlas.init();
}
