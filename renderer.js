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
        maxSpeed: 6, // Reduced from 10
        acceleration: 0.3, // Smoother (was 0.5)
        friction: 0.96, // Glidier/Heavier feel (was 0.95)
        rotationSpeed: 0.05,
        moveAngle: 0, // Direction of movement (may differ from angle during drift)
        driftDuration: 0 // How long we've been drifting
    },
    tireMarks: [], // {x1,y1,x2,y2,x3,y3,x4,y4,age,drifting}
    smokeParticles: [], // {x, y, vx, vy, life, maxLife, size, color}
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

const CLOSE_BTN_SIZE = 15;

window.addEventListener('mousedown', (e) => {
    if (!state.isEditing) return;

    // Check for click on "X" buttons (iterate backwards for z-order/safety)
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        const closeX = obs.x + obs.w - CLOSE_BTN_SIZE;
        const closeY = obs.y;

        if (e.clientX >= closeX && e.clientX <= closeX + CLOSE_BTN_SIZE &&
            e.clientY >= closeY && e.clientY <= closeY + CLOSE_BTN_SIZE) {

            // Delete obstacle
            state.obstacles.splice(i, 1);
            saveObstacles();
            return; // Prevent drag start
        }
    }

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

        const isDrifting = state.keys[' '] || state.keys['Spacebar']; // Drift trigger

        if (Math.abs(state.car.speed) > 0.1) {
            // Steering changes facing direction
            let turnDir = 0;
            if (state.keys['ArrowLeft'] || state.keys['a']) turnDir = -1;
            if (state.keys['ArrowRight'] || state.keys['d']) turnDir = 1;

            state.car.angle += turnDir * state.car.rotationSpeed * Math.sign(state.car.speed);
        }

        // Drift Physics: moveAngle vs facing angle
        // If drifting, moveAngle lags behind angle. If not, it snaps to angle.
        if (isDrifting) {
            // Drift: slowly interpolate moveAngle towards angle (high inertia)
            const diff = state.car.angle - state.car.moveAngle;
            // Normalize angular difference to -PI to PI
            let d = diff % (2 * Math.PI);
            if (d < -Math.PI) d += 2 * Math.PI;
            if (d > Math.PI) d -= 2 * Math.PI;

            state.car.moveAngle += d * 0.05; // Low friction sideways
        } else {
            // No Drift: Grip is high, but we regain it smoothly
            const diff = state.car.angle - state.car.moveAngle;
            let d = diff % (2 * Math.PI);
            if (d < -Math.PI) d += 2 * Math.PI;
            if (d > Math.PI) d -= 2 * Math.PI;

            state.car.moveAngle += d * 0.2; // High friction/grip, smoothly snapping back
        }

        state.car.speed *= state.car.friction;

        // Store previous position for collision response
        const vx = Math.cos(state.car.moveAngle) * state.car.speed;
        const vy = Math.sin(state.car.moveAngle) * state.car.speed;

        // Move X
        state.car.x += vx;
        // Collision X
        const carHbSz = 20;
        let hitX = false;
        for (let obs of state.obstacles) {
            if (state.car.x + carHbSz / 2 > obs.x && state.car.x - carHbSz / 2 < obs.x + obs.w &&
                state.car.y + carHbSz / 2 > obs.y && state.car.y - carHbSz / 2 < obs.y + obs.h) {
                hitX = true;
                break;
            }
        }
        if (hitX) {
            state.car.x -= vx; // Revert X
            if (Math.abs(state.car.speed) > 2) {
                createCollisionSparks(state.car.x + (vx > 0 ? carHbSz / 2 : -carHbSz / 2), state.car.y, vx > 0 ? -1 : 0);
            }
        }

        // Move Y
        state.car.y += vy;
        // Collision Y
        let hitY = false;
        for (let obs of state.obstacles) {
            if (state.car.x + carHbSz / 2 > obs.x && state.car.x - carHbSz / 2 < obs.x + obs.w &&
                state.car.y + carHbSz / 2 > obs.y && state.car.y - carHbSz / 2 < obs.y + obs.h) {
                hitY = true;
                break;
            }
        }
        if (hitY) {
            state.car.y -= vy; // Revert Y
            if (Math.abs(state.car.speed) > 2) {
                createCollisionSparks(state.car.x, state.car.y + (vy > 0 ? carHbSz / 2 : -carHbSz / 2), vy > 0 ? -1.5 : 1.5); // approximate angle
            }
        }


        // Screen bounds
        if (state.car.x < 0) { state.car.x = 0; if (Math.abs(state.car.speed) > 2) createCollisionSparks(0, state.car.y, 0); }
        if (state.car.x > canvas.width) { state.car.x = canvas.width; if (Math.abs(state.car.speed) > 2) createCollisionSparks(canvas.width, state.car.y, Math.PI); }
        if (state.car.y < 0) { state.car.y = 0; if (Math.abs(state.car.speed) > 2) createCollisionSparks(state.car.x, 0, Math.PI / 2); }
        if (state.car.y > canvas.height) { state.car.y = canvas.height; if (Math.abs(state.car.speed) > 2) createCollisionSparks(state.car.x, canvas.height, -Math.PI / 2); }

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

            // Add Smoke (Only when Drifting)
            // Drift intensity = difference between facing angle and move angle
            const moveDiff = Math.abs(Math.sin(state.car.angle - state.car.moveAngle));
            const isDriftingActive = moveDiff > 0.2; // Threshold for smoke

            // Add Smoke (Only when Drifting)
            if (isDriftingActive) {
                state.car.driftDuration++;
            } else {
                state.car.driftDuration = 0;
            }

            if (isDriftingActive && Math.random() < 0.3) {
                // Emit from REAR TIRES ONLY for cleaner look
                const offsets = [
                    { x: -14, y: -14 }, // RL
                    { x: -14, y: 14 }   // RR
                ];

                offsets.forEach(offset => {
                    const tireX = state.car.x + (offset.x * cos - offset.y * sin);
                    const tireY = state.car.y + (offset.x * sin + offset.y * cos);

                    // Determine particle type (Smoke vs Spark)
                    // "Come a little sooner" -> > 30 frames
                    // "Actual fire sparks" -> Yellows/Oranges/White
                    let isSpark = state.car.driftDuration > 30 && Math.random() < 0.6;

                    if (isSpark) {
                        // SPARK
                        const sparkColors = ['#FFD700', '#FFA500', '#FF4500', '#FFFFFF']; // Gold, Orange, Red-Orange, White
                        const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];

                        state.smokeParticles.push({
                            x: tireX + (Math.random() - 0.5) * 4,
                            y: tireY + (Math.random() - 0.5) * 4,
                            vx: -Math.cos(state.car.moveAngle) * 4 + (Math.random() - 0.5) * 3, // Faster and more scattered
                            vy: -Math.sin(state.car.moveAngle) * 4 + (Math.random() - 0.5) * 3,
                            life: 0,
                            maxLife: 5 + Math.random() * 8, // Very short life (looks like popping sparks)
                            size: 1 + Math.random(), // Tiny dots
                            color: color
                        });
                    } else {
                        // SMOKE
                        state.smokeParticles.push({
                            x: tireX + (Math.random() - 0.5) * 4,
                            y: tireY + (Math.random() - 0.5) * 4,
                            vx: -Math.cos(state.car.moveAngle) * 1.5 + (Math.random() - 0.5),
                            vy: -Math.sin(state.car.moveAngle) * 1.5 + (Math.random() - 0.5),
                            life: 0,
                            maxLife: 20 + Math.random() * 10,
                            size: 3 + Math.random() * 4,
                            color: null // Default smoke
                        });
                    }
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
                    age: 0,
                    drifting: isDriftingActive // Flag to render as solid
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
        ctx.lineWidth = 10;

        // Split marks into batches by style? Or just state change per line (slower but correct)
        // Since we have minimal marks, state change is fine.

        for (let mark of state.tireMarks) {
            const alpha = 1 - (mark.age / 60);
            ctx.strokeStyle = `rgba(10, 10, 10, ${alpha * 0.5})`;

            // Style: Drifting = Solid, Normal = Dashed
            if (mark.drifting) {
                ctx.setLineDash([]);
            } else {
                ctx.setLineDash([2, 4]);
            }

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
            if (p.color) {
                // Spark
                ctx.fillStyle = p.color; // Solid color for spark? Or rgba? 
                // Let's modify alpha a bit. Sparks fade fast.
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
            } else {
                // Smoke
                ctx.globalAlpha = 1;
                ctx.fillStyle = `rgba(220, 220, 220, ${alpha * 0.3})`;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1; // Reset
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
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;

            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

            // Draw Delete Button ("X")
            const btnSize = 15;
            const btnX = obs.x + obs.w - btnSize;
            const btnY = obs.y;

            ctx.fillStyle = 'red';
            ctx.fillRect(btnX, btnY, btnSize, btnSize);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(btnX + 3, btnY + 3);
            ctx.lineTo(btnX + btnSize - 3, btnY + btnSize - 3);
            ctx.moveTo(btnX + btnSize - 3, btnY + 3);
            ctx.lineTo(btnX + 3, btnY + btnSize - 3);
            ctx.stroke();
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
    const bodyColor = '#FF5A5F'; // Airbnb Rausch (Red)
    const windowColor = '#87CEEB'; // Sky Blue
    const shadowColor = 'rgba(0, 0, 0, 0.2)';
    const wheelColor = '#333333'; // Dark wheels

    // Dimensions
    const length = 46;
    const width = 26;
    const wheelWidth = 8; // Narrower
    const wheelHeight = 6;
    const wheelOffsetX = 12; // Tucked in (was 14)
    const wheelOffsetY = 13; // Pushed out slightly (was 10) to see turning

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

    // Front Headlights (Soft Glow)
    // Use a blur filter to make the light look diffuse and satisfying
    ctx.save();
    ctx.translate(20, 0); // Move to front of car

    // Apply a heavy blur to soften the light beam into a glow
    ctx.filter = 'blur(8px)';
    ctx.globalCompositeOperation = 'screen'; // Additive light effect

    // Create a single wide, soft beam gradient
    // Linear gradient for fading out as it gets further
    const beamLen = 80; // Shorter (was 120)
    const beamWid = 40;
    const grad = ctx.createLinearGradient(0, 0, beamLen, 0);
    grad.addColorStop(0, 'rgba(255, 230, 200, 0.4)'); // Warm light source
    grad.addColorStop(1, 'rgba(255, 230, 200, 0)');   // Fade to nothing

    ctx.fillStyle = grad;

    // Draw Left Beam (Soft Oval-ish path)
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(beamLen, -25);
    ctx.lineTo(beamLen, -5);
    ctx.lineTo(0, -4);
    ctx.fill();

    // Reset path for Right Beam
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(beamLen, 25);
    ctx.lineTo(beamLen, 5);
    ctx.lineTo(0, 4);
    ctx.fill();

    ctx.restore();

    // Body
    ctx.fillStyle = bodyColor;
    roundRect(ctx, -length / 2, -width / 2, length, width, 8);
    ctx.fill();

    // Headlight Stickers (Yellow Indicators)
    ctx.fillStyle = '#FFEE88'; // Light Yellow
    // Left
    ctx.beginPath();
    ctx.ellipse(18, -8, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right
    ctx.beginPath();
    ctx.ellipse(18, 8, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Side Mirrors
    ctx.fillStyle = bodyColor; // Same as body
    // Left Mirror
    roundRect(ctx, 4, -width / 2 - 4, 6, 4, 2);
    ctx.fill();
    // Right Mirror
    roundRect(ctx, 4, width / 2, 6, 4, 2);
    ctx.fill();

    // Roof / Cabin (Darker Red or just structure?)
    // Reference has consistent body color. Windows are the contrast.

    // Windshield (Front) - Light Blue
    ctx.fillStyle = windowColor;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(8, 8);
    ctx.lineTo(-2, 10); // Curved cabin shape
    ctx.lineTo(-2, -10);
    ctx.fill();

    // Side Windows (Left)
    ctx.fillStyle = windowColor;
    ctx.fillRect(-8, -11, 10, 3); // Thin strip
    // Side Windows (Right)
    ctx.fillRect(-8, 8, 10, 3); // Thin strip

    // Rear Window
    ctx.fillStyle = windowColor;
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(-12, 7);
    ctx.lineTo(-18, 6);
    ctx.lineTo(-18, -6);
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

function createCollisionSparks(x, y, baseAngle) {
    const count = 3; // Reduced from 10
    for (let i = 0; i < count; i++) {
        const speed = 1 + Math.random() * 2; // Slower
        const angle = baseAngle + (Math.random() - 0.5) * 1.5;
        // Subtle colors: White, Soft Yellow. No aggressive Red/Orange.
        const colors = ['#FFFFFF', '#FFFACD'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        state.smokeParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: 5 + Math.random() * 5, // Short life
            size: 1 + Math.random(), // Tiny
            color: color
        });
    }
}
