const { ipcRenderer } = require('electron');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// State
let state = {
    isDriving: false,
    isEditing: false,
    obstacles: [], // {x, y, w, h}
    car: {
        x: 100,
        y: 100,
        angle: 0,
        speed: 0,
        maxSpeed: 10,
        acceleration: 0.5,
        friction: 0.95,
        rotationSpeed: 0.05
    },
    keys: {}
};

// Input Handling
window.addEventListener('keydown', (e) => {
    state.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    state.keys[e.key] = false;
});

// Mouse Handling for Edit Mode
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let currentDragBox = null;

window.addEventListener('mousedown', (e) => {
    if (!state.isEditing) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    currentDragBox = { x: e.clientX, y: e.clientY, w: 0, h: 0 };
});

window.addEventListener('mousemove', (e) => {
    if (!state.isEditing || !isDragging) return;
    const w = e.clientX - dragStart.x;
    const h = e.clientY - dragStart.y;
    currentDragBox.w = w;
    currentDragBox.h = h;
});

window.addEventListener('mouseup', (e) => {
    if (!state.isEditing || !isDragging) return;
    isDragging = false;

    // Normalize box (handle negative width/height)
    let finalBox = {
        x: currentDragBox.w < 0 ? currentDragBox.x + currentDragBox.w : currentDragBox.x,
        y: currentDragBox.h < 0 ? currentDragBox.y + currentDragBox.h : currentDragBox.y,
        w: Math.abs(currentDragBox.w),
        h: Math.abs(currentDragBox.h)
    };

    // Only add if it has some size
    if (finalBox.w > 5 && finalBox.h > 5) {
        state.obstacles.push(finalBox);
        saveObstacles();
    }
    currentDragBox = null;
});

// IPC Listeners
ipcRenderer.on('state-update', (event, newState) => {
    state.isDriving = newState.isDriving;
    state.isEditing = newState.isEditing;

    if (state.isEditing) {
        document.body.classList.add('interactive');
    } else {
        document.body.classList.remove('interactive');
    }
});

// Load Obstacles
ipcRenderer.invoke('load-obstacles').then(obstacles => {
    state.obstacles = obstacles || [];
});

function saveObstacles() {
    ipcRenderer.invoke('save-obstacles', state.obstacles);
}

// Game Loop
function update() {
    if (state.isDriving) {
        // Car Physics
        if (state.keys['ArrowUp'] || state.keys['w']) {
            state.car.speed += state.car.acceleration;
        }
        if (state.keys['ArrowDown'] || state.keys['s']) {
            state.car.speed -= state.car.acceleration;
        }

        if (Math.abs(state.car.speed) > 0.1) {
            if (state.keys['ArrowLeft'] || state.keys['a']) {
                state.car.angle -= state.car.rotationSpeed * Math.sign(state.car.speed);
            }
            if (state.keys['ArrowRight'] || state.keys['d']) {
                state.car.angle += state.car.rotationSpeed * Math.sign(state.car.speed);
            }
        }

        state.car.speed *= state.car.friction;
        state.car.x += Math.cos(state.car.angle) * state.car.speed;
        state.car.y += Math.sin(state.car.angle) * state.car.speed;

        // Simple Collision with Obstacles
        // TODO: Better collision response (bounce)
        for (let obs of state.obstacles) {
            if (state.car.x > obs.x && state.car.x < obs.x + obs.w &&
                state.car.y > obs.y && state.car.y < obs.y + obs.h) {
                // Hit! Stop for now
                state.car.speed *= -0.5; // Bounce back
                state.car.x -= Math.cos(state.car.angle) * state.car.speed * 2; // Move out
                state.car.y -= Math.sin(state.car.angle) * state.car.speed * 2;
            }
        }

        // Screen bounds
        if (state.car.x < 0) state.car.x = 0;
        if (state.car.x > canvas.width) state.car.x = canvas.width;
        if (state.car.y < 0) state.car.y = 0;
        if (state.car.y > canvas.height) state.car.y = canvas.height;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Obstacles (Only in Edit Mode or Debug)
    // User said: "boxes will also overlay all the components (make the boxes invisble to me). i should also be able to toggle boxes on and off."
    // Let's assume Edit Mode = Visible Boxes. Driving Mode = Invisible Boxes (unless toggled? For now, invisible).
    if (state.isEditing) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';

        for (let obs of state.obstacles) {
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        }

        if (currentDragBox) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.strokeRect(currentDragBox.x, currentDragBox.y, currentDragBox.w, currentDragBox.h);
        }
    }

    // Draw Car
    // Draw Car
    if (state.isDriving || state.isEditing) { // Always show car? Or only when driving? User said "toggle car on and off".
        ctx.save();
        ctx.translate(state.car.x, state.car.y);
        ctx.rotate(state.car.angle);

        // Draw simple car shape
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(-15, -10, 30, 20); // Body
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(10, -10, 5, 20); // Headlights/Front

        ctx.restore();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
