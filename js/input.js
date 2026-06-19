// ============================================================
// Input — Mouse and touch event handling
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

    _setupListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this._handleMove(e));
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.isPointerDown = true;
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isPointerDown = false;
                this._handleClick(e);
            }
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const cell = this._getCellFromEvent(e);
            if (this.onRightClick && cell) {
                this.onRightClick(cell, e);
            }
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
            if (this.onHoverChange) this.onHoverChange(null);
        });

        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isPointerDown = true;
            const touch = e.touches[0];
            this._updatePosition(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this._updatePosition(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isPointerDown = false;
            if (this.onClick && this.hoveredCell) {
                this.onClick(this.hoveredCell, e);
            }
        });
    }

    _getCanvasRelative(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    _getCellFromEvent(e) {
        const pos = this._getCanvasRelative(e.clientX, e.clientY);
        return getCell(pos.x, pos.y);
    }

    _updatePosition(clientX, clientY) {
        const pos = this._getCanvasRelative(clientX, clientY);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        const cell = getCell(pos.x, pos.y);
        if (cell && (!this.hoveredCell || cell.col !== this.hoveredCell.col || cell.row !== this.hoveredCell.row)) {
            this.hoveredCell = cell;
            if (this.onHoverChange) this.onHoverChange(cell);
        } else if (!cell && this.hoveredCell) {
            this.hoveredCell = null;
            if (this.onHoverChange) this.onHoverChange(null);
        }
    }

    _handleMove(e) {
        this._updatePosition(e.clientX, e.clientY);
    }

    _handleClick(e) {
        const cell = this._getCellFromEvent(e);
        if (typeof debugLog !== 'undefined') debugLog('Canvas mouseup - cell: ' + (cell ? cell.col + ',' + cell.row + ' type=' + cell.type : 'null') + ' onClick=' + (this.onClick ? 'set' : 'null'));
        if (cell && this.onClick) {
            this.onClick(cell, e);
        }
    }
}
