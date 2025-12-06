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
    tireMarks: [], // {x1,y1,x2,y2,x3,y3,x4,y4,age}
    smokeParticles: [], // {x, y, vx, vy, life, maxLife, size}
    lastCarOut: null,
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

        // Tire Marks Logic
        // Decay - Faster fade (shorter trail)
        state.tireMarks.forEach(m => m.age++);
        state.tireMarks = state.tireMarks.filter(m => m.age < 60); // 1 second (was 2s)

        // Smoke Logic
        // Update particles
        state.smokeParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            p.size += 0.1; // Expand
        });
        state.smokeParticles = state.smokeParticles.filter(p => p.life < p.maxLife);

        if (Math.abs(state.car.speed) > 0.5) { // Only leave marks if moving
            const rearOffsetX = -14;
            const rearOffsetY = 14;

            const cos = Math.cos(state.car.angle);
            const sin = Math.sin(state.car.angle);

            // Add Smoke
            if (Math.random() < 0.3) { // 30% chance per frame
                // Emit from back center
                const exhaustX = state.car.x - 20 * cos;
                const exhaustY = state.car.y - 20 * sin;
                state.smokeParticles.push({
                    x: exhaustX + (Math.random() - 0.5) * 5,
                    y: exhaustY + (Math.random() - 0.5) * 5,
                    vx: -cos * 2 + (Math.random() - 0.5), // Move opposite to car
                    vy: -sin * 2 + (Math.random() - 0.5),
                    life: 0,
                    maxLife: 40 + Math.random() * 20,
                    size: 2 + Math.random() * 3
                });
            }

            const p1 = {
                x: state.car.x + (rearOffsetX * cos - rearOffsetY * sin),
                y: state.car.y + (rearOffsetX * sin + rearOffsetY * cos)
            };
            const p2 = {
                x: state.car.x + (rearOffsetX * cos - (-rearOffsetY) * sin),
                y: state.car.y + (rearOffsetX * sin + (-rearOffsetY) * cos)
            };

            if (state.lastCarOut) {
                state.tireMarks.push({
                    x1: state.lastCarOut.p1.x, y1: state.lastCarOut.p1.y,
                    x2: p1.x, y2: p1.y,
                    x3: state.lastCarOut.p2.x, y3: state.lastCarOut.p2.y,
                    x4: p2.x, y4: p2.y,
                    age: 0
                });
            }
            state.lastCarOut = { p1, p2 };
        } else {
            state.lastCarOut = null;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Tire Marks
    if (state.isDriving || state.isEditing) {
        ctx.lineWidth = 4; // Wider tires
        ctx.setLineDash([4, 4]); // Tread pattern

        for (let mark of state.tireMarks) {
            const alpha = 1 - (mark.age / 60);
            ctx.strokeStyle = `rgba(30, 30, 30, ${alpha * 0.4})`; // Darker, patterned

            // Left track
            ctx.beginPath();
            ctx.moveTo(mark.x1, mark.y1);
            ctx.lineTo(mark.x2, mark.y2);
            ctx.stroke();

            // Right track
            ctx.beginPath();
            ctx.moveTo(mark.x3, mark.y3);
            ctx.lineTo(mark.x4, mark.y4);
            ctx.stroke();
        }
        ctx.setLineDash([]); // Reset
    }

    // Draw Smoke
    if (state.isDriving || state.isEditing) {
        state.smokeParticles.forEach(p => {
            const alpha = 1 - (p.life / p.maxLife);
            ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

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
    if (state.isDriving || state.isEditing) {
        ctx.save();
        ctx.translate(state.car.x, state.car.y);
        ctx.rotate(state.car.angle);

        // Calculate steering for animation
        let steerAngle = 0;
        if (state.keys['ArrowLeft'] || state.keys['a']) steerAngle = -0.5;
        if (state.keys['ArrowRight'] || state.keys['d']) steerAngle = 0.5;

        drawCar(ctx, steerAngle);
        ctx.restore();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();

function drawCar(ctx, steerAngle = 0) {
    // Styling constants
    const bodyColor = '#FF5A5F'; // Airbnb Rausch
    const windowColor = '#2F363F';
    const shadowColor = 'rgba(0, 0, 0, 0.2)';
    const wheelColor = '#DDDDDD'; // Lighter for visibility

    // Dimensions
    const length = 46;
    const width = 26;
    const wheelWidth = 10;
    const wheelHeight = 6;
    const wheelOffsetX = 14;
    const wheelOffsetY = 14;

    // Helper to draw detailed wheel
    const drawWheel = (x, y, angle) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Tire
        ctx.fillStyle = wheelColor;
        roundRect(ctx, -wheelWidth / 2, -wheelHeight / 2, wheelWidth, wheelHeight, 2);
        ctx.fill();

        // Rim/stripe for rotation visibility
        ctx.fillStyle = '#333333';
        ctx.fillRect(-2, -wheelHeight / 2, 4, wheelHeight);

        ctx.restore();
    };

    // Front Left
    drawWheel(wheelOffsetX, -wheelOffsetY, steerAngle);
    // Front Right
    drawWheel(wheelOffsetX, wheelOffsetY, steerAngle);
    // Rear Left
    drawWheel(-wheelOffsetX, -wheelOffsetY, 0);
    // Rear Right
    drawWheel(-wheelOffsetX, wheelOffsetY, 0);

    // Exhaust Pipe
    ctx.fillStyle = '#555555';
    ctx.fillRect(-length / 2 - 4, -3, 6, 6);


    // Shadow (offset slightly)
    ctx.fillStyle = shadowColor;
    roundRect(ctx, -length / 2 - 2, -width / 2 + 2, length + 4, width + 4, 8);
    ctx.fill();

    // Body
    ctx.fillStyle = bodyColor;
    roundRect(ctx, -length / 2, -width / 2, length, width, 8);
    ctx.fill();

    // Roof / Cabin (White contrast)
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, -12, -10, 20, 20, 5);
    ctx.fill();

    // Windshield (Front)
    ctx.fillStyle = windowColor;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(8, 8);
    ctx.lineTo(3, 7);
    ctx.lineTo(3, -7);
    ctx.fill();

    // Rear Window
    ctx.fillStyle = windowColor;
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(-12, 7);
    ctx.lineTo(-8, 8);
    ctx.lineTo(-8, -8);
    ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
