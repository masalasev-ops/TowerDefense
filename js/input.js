// ============================================================
// Input — Mouse and touch event handling
// ============================================================
//
// InputManager translates browser mouse and touch events into
// game-level interactions:
//
//   Coordinate conversion:
//     _getCanvasRelative(clientX, clientY) converts CSS-pixel
//     coordinates (from the browser event) into game-pixel
//     coordinates by accounting for the canvas's scaled bounding
//     rect. This ensures correct hit detection regardless of
//     canvas CSS sizing / device pixel ratio.
//
//   Grid cell lookup:
//     _getCellFromEvent(event) uses the converted coordinates
//     to find the grid cell under the pointer via getCell().
//
//   Touch handling:
//     touchstart  — sets isPointerDown, updates position
//     touchmove   — updates position (drag)
//     touchend    — fires onClick callback with hoveredCell
//     Passive: false ensures preventDefault() works on touch
//     devices to prevent scrolling while interacting with the canvas.
//
//   Hover tracking:
//     _updatePosition() compares the current cell to the previous
//     hoveredCell and fires onHoverChange when the cell changes
//     or the pointer leaves the canvas entirely.
//
// Callbacks:
//   onClick(cell, event)      — Fired on mouseup (left button) or touchend
//   onRightClick(cell, event) — Fired on contextmenu event
//   onHoverChange(cell)       — Fired when hovered cell changes or becomes null
// ============================================================

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredCell = null;
        this.isPointerDown = false;

        // Callbacks
        this.onClick = null;       // (cell, event) => void
        this.onRightClick = null;  // (cell, event) => void
        this.onHoverChange = null; // (cell) => void

        this._setupListeners();
    }

    /**
     * Register all mouse and touch event listeners on the canvas.
     *
     * Mouse:
     *   mousemove — updates hover position
     *   mousedown — sets isPointerDown (left button only)
     *   mouseup   — clears isPointerDown and fires onClick
     *   contextmenu — prevents default menu, fires onRightClick
     *   mouseleave — clears hoveredCell
     *
     * Touch (mobile, passive: false to prevent scrolling):
     *   touchstart — sets isPointerDown, updates position
     *   touchmove  — updates position during drag
     *   touchend   — fires onClick if a hoveredCell exists
     */
    _setupListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (event) => this._handleMove(event));
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.button === 0) this.isPointerDown = true;
        });
        this.canvas.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.isPointerDown = false;
                this._handleClick(event);
            }
        });
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const cell = this._getCellFromEvent(event);
            if (this.onRightClick && cell) {
                this.onRightClick(cell, event);
            }
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
            if (this.onHoverChange) this.onHoverChange(null);
        });

        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            this.isPointerDown = true;
            const touch = event.touches[0];
            this._updatePosition(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            this._updatePosition(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (event) => {
            event.preventDefault();
            this.isPointerDown = false;
            if (this.onClick && this.hoveredCell) {
                this.onClick(this.hoveredCell, event);
            }
        });
    }

    /**
     * Convert browser client coordinates to game pixel coordinates.
     *
     * The canvas may be CSS-scaled (e.g., by CSS width/height or
     * devicePixelRatio). This method computes the scale factors
     * between the canvas bounding rect and the game's logical
     * dimensions (GAME_WIDTH x GAME_HEIGHT), then applies them.
     *
     * Returns { x, y } in game pixels.
     */
    _getCanvasRelative(clientX, clientY) {
        const canvasBoundingRect = this.canvas.getBoundingClientRect();
        const canvasScaleX = GAME_WIDTH / canvasBoundingRect.width;
        const canvasScaleY = GAME_HEIGHT / canvasBoundingRect.height;
        return {
            x: (clientX - canvasBoundingRect.left) * canvasScaleX,
            y: (clientY - canvasBoundingRect.top) * canvasScaleY,
        };
    }

    /**
     * Convert a browser mouse/touch event to a game grid cell.
     */
    _getCellFromEvent(event) {
        const canvasPosition = this._getCanvasRelative(event.clientX, event.clientY);
        return getCell(canvasPosition.x, canvasPosition.y);
    }

    /**
     * Update the tracked mouse position and hovered cell based on
     * client coordinates. Fires onHoverChange when the cell changes.
     */
    _updatePosition(clientX, clientY) {
        const canvasPosition = this._getCanvasRelative(clientX, clientY);
        this.mouseX = canvasPosition.x;
        this.mouseY = canvasPosition.y;
        const cell = getCell(canvasPosition.x, canvasPosition.y);
        if (cell && (!this.hoveredCell || cell.col !== this.hoveredCell.col || cell.row !== this.hoveredCell.row)) {
            this.hoveredCell = cell;
            if (this.onHoverChange) this.onHoverChange(cell);
        } else if (!cell && this.hoveredCell) {
            this.hoveredCell = null;
            if (this.onHoverChange) this.onHoverChange(null);
        }
    }

    /**
     * Handle mousemove events — update position / hover state.
     */
    _handleMove(event) {
        this._updatePosition(event.clientX, event.clientY);
    }

    /**
     * Handle mouseup events — determine the clicked cell and
     * fire the onClick callback.
     */
    _handleClick(event) {
        const cell = this._getCellFromEvent(event);
        if (typeof debugLog !== 'undefined') debugLog('Canvas mouseup - cell: ' + (cell ? cell.col + ',' + cell.row + ' type=' + cell.type : 'null') + ' onClick=' + (this.onClick ? 'set' : 'null'));
        if (cell && this.onClick) {
            this.onClick(cell, event);
        }
    }
}
