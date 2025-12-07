class Input {
    constructor() {
        this.keys = {};
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentDragBox = null;
        this.onObstacleCreated = null; // Callback for when a box is drawn
        this.onObstacleDeleted = null; // Callback for when a click deletes a box

        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse listeners are only active/useful if we check state elsewhere, 
        // but we can bind them always and check flags in the Game class or here if we pass state.
        // For decoupled design, Input just reports events.

        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleMouseDown(e) {
        // We'll let the Game class decide if we can drag (isEditing check)
        // But to keep logic here, we might need a way to know if we hit a delete button.
        // Actually, hit testing depends on knowing the obstacles. 
        // So Input might need access to obstacles OR Game passes them in?
        // Let's emit a 'mousedown' event or similar if we want to be pure.
        // BUT for simplicity in this refactor, let's expose the raw events or state 
        // and let Game handle the logic, OR move the drag logic here but give it 'context'

        // Let's stick to the current logic: 
        // The Game loop handles "logic", Input handles "state of inputs".
        // Dragging to create a box is an "Input Action".

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.currentDragBox = { x: e.clientX, y: e.clientY, w: 0, h: 0 };
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.currentDragBox.w = e.clientX - this.dragStart.x;
        this.currentDragBox.h = e.clientY - this.dragStart.y;
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Normalize box
        let finalBox = {
            x: this.currentDragBox.w < 0 ? this.currentDragBox.x + this.currentDragBox.w : this.currentDragBox.x,
            y: this.currentDragBox.h < 0 ? this.currentDragBox.y + this.currentDragBox.h : this.currentDragBox.y,
            w: Math.abs(this.currentDragBox.w),
            h: Math.abs(this.currentDragBox.h)
        };

        if (finalBox.w > 5 && finalBox.h > 5) {
            if (this.onObstacleCreated) this.onObstacleCreated(finalBox);
        }
        this.currentDragBox = null;
    }

    // Attempt to handle clicks for deletion. 
    // This requires knowing where obstacles are. 
    // Maybe Game calls 'checkClick(x, y, obstacles)' on Input? 
    // Or Game handles the click logic entirely. 
    // Let's make Input expose "click" and Game handles the hit test.
    // The existing code blended them. 
    // Let's leave specific obstacle logic in Game for now to keep Input generic if possible,
    // OR we can make a "EditorInput" subclass.
    // For now, let's keep it simple: Input tracks keys and raw drag rects. 
    // We'll move the specific "Delete this obstacle" logic to Game because Game owns Obstacles.
}

module.exports = Input;
