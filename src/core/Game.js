const Input = require('./Input');
const Garage = require('../managers/Garage');
const ParticleSystem = require('../systems/ParticleSystem');
const TireTrackSystem = require('../systems/TireTrackSystem');
const { ipcRenderer } = require('electron');

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Screen sizing
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });

        // Systems
        this.input = new Input();
        this.garage = new Garage();
        this.particles = new ParticleSystem();
        this.tracks = new TireTrackSystem();

        // State
        this.isDriving = false;
        this.isEditing = false;
        this.obstacles = [];

        // Connect Input Events
        this.input.onObstacleCreated = (box) => {
            if (this.isEditing) {
                this.obstacles.push(box);
                this.saveObstacles();
            }
        };

        this.setupClickHandling();

        // IPC Setup
        this.setupIPC();

        // Start Loop
        this.lastTime = 0;
        requestAnimationFrame((t) => this.loop(t));
    }

    setupIPC() {
        ipcRenderer.on('state-update', (event, newState) => {
            this.isDriving = newState.isDriving;
            this.isEditing = newState.isEditing;

            if (this.isEditing) {
                document.body.classList.add('interactive');
            } else {
                document.body.classList.remove('interactive');
            }
        });

        ipcRenderer.invoke('load-obstacles').then(obstacles => {
            this.obstacles = obstacles || [];
        });
    }

    saveObstacles() {
        ipcRenderer.invoke('save-obstacles', this.obstacles);
    }

    checkEditClicks(x, y) {
        const CLOSE_BTN_SIZE = 15;
        // Check for click on "X" buttons
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            const closeX = obs.x + obs.w - CLOSE_BTN_SIZE;
            const closeY = obs.y;

            if (x >= closeX && x <= closeX + CLOSE_BTN_SIZE &&
                y >= closeY && y <= closeY + CLOSE_BTN_SIZE) {

                this.obstacles.splice(i, 1);
                this.saveObstacles();
                return true; // handled
            }
        }
        return false;
    }

    update() {
        const parkingStatus = this.garage.checkParking(this.input);
        this.currentParkingStatus = parkingStatus; // Save for draw

        const activeCar = this.garage.getCurrentVehicle();
        const allCars = this.garage.getAllVehicles();

        // Update Active Car
        if (this.isDriving) {
            const result = activeCar.update(this.input, this.obstacles);

            // Screen Bounds & Sparks
            if (activeCar.x < 0) { activeCar.x = 0; if (Math.abs(activeCar.speed) > 2) this.particles.createCollisionSparks(0, activeCar.y, 0); }
            if (activeCar.x > this.canvas.width) { activeCar.x = this.canvas.width; if (Math.abs(activeCar.speed) > 2) this.particles.createCollisionSparks(this.canvas.width, activeCar.y, Math.PI); }
            if (activeCar.y < 0) { activeCar.y = 0; if (Math.abs(activeCar.speed) > 2) this.particles.createCollisionSparks(activeCar.x, 0, Math.PI / 2); }
            if (activeCar.y > this.canvas.height) { activeCar.y = this.canvas.height; if (Math.abs(activeCar.speed) > 2) this.particles.createCollisionSparks(activeCar.x, this.canvas.height, -Math.PI / 2); }

            if (result.collided) {
                this.particles.createCollisionSparks(result.x, result.y, result.angle || 0);
            }

            // Smoke & Tire Tracks (Using Car Properties)
            const moveDiff = Math.abs(Math.sin(activeCar.angle - activeCar.moveAngle));
            const isDriftingActive = moveDiff > activeCar.driftThreshold;

            if (isDriftingActive) {
                activeCar.driftDuration++;

                if (Math.random() < 0.3) {
                    const cos = Math.cos(activeCar.angle);
                    const sin = Math.sin(activeCar.angle);
                    const offsets = [{ x: -14, y: -14 }, { x: -14, y: 14 }];

                    offsets.forEach(offset => {
                        const tireX = activeCar.x + (offset.x * cos - offset.y * sin);
                        const tireY = activeCar.y + (offset.x * sin + offset.y * cos);

                        let isSpark = activeCar.driftDuration > 30 && Math.random() < 0.6;
                        if (activeCar.driftColor) isSpark = true; // Custom drift effect prefers 'spark' particle type behavior but with custom color

                        if (isSpark) {
                            const color = activeCar.driftColor || ['#FFD700', '#FFA500', '#FF4500'][Math.floor(Math.random() * 3)];
                            this.particles.emit(tireX, tireY, 'spark', {
                                vx: -Math.cos(activeCar.moveAngle) * 4 + (Math.random() - 0.5) * 3,
                                vy: -Math.sin(activeCar.moveAngle) * 4 + (Math.random() - 0.5) * 3,
                                maxLife: 5 + Math.random() * 8,
                                size: 1 + Math.random(),
                                color: color
                            });
                        } else {
                            const color = activeCar.smokeColor || null;
                            this.particles.emit(tireX, tireY, 'smoke', {
                                vx: -Math.cos(activeCar.moveAngle) * 1.5 + (Math.random() - 0.5),
                                vy: -Math.sin(activeCar.moveAngle) * 1.5 + (Math.random() - 0.5),
                                maxLife: 20 + Math.random() * 10,
                                size: 3 + Math.random() * 4,
                                color: color
                            });
                        }
                    });
                }
            } else {
                activeCar.driftDuration = 0;
            }

            this.tracks.addTrack(activeCar, isDriftingActive);
        } else {
            this.tracks.lastCarOut = null;
        }

        this.setupClickHandling(); // Re-ensure (optional, but harmless if idempotent)
    }

    // Add this to constructor
    setupClickHandling() {
        window.addEventListener('mousedown', (e) => {
            if (!this.isEditing) return;
            // Check delete buttons
            if (this.checkEditClicks(e.clientX, e.clientY)) {
                // If handled, prevent Input from dragging? 
                // Input is already listening. 
                // This is a race condition.
                // ideally Input should ask Game "did you eat this click?"
                this.input.isDragging = false; // Cancel drag
            }
        });
    }

    loop(t) {
        this.update();
        this.draw();

        // Particles always update (fade out even if paused?)
        this.particles.update();
        this.tracks.update();

        requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Parking Lot
        this.drawParkingLot();

        // Draw Tracks
        if (this.isDriving || this.isEditing) {
            this.tracks.draw(this.ctx);
        }

        // Draw Smoke
        if (this.isDriving || this.isEditing) {
            this.particles.draw(this.ctx);
        }

        // Draw All Vehicles (Active and Parked)
        // Parked vehicles are just vehicles in the list that aren't 'active'
        // Actually, Garage keeps all of them. 
        // We draw all of them.
        const allCars = this.garage.getAllVehicles();
        allCars.forEach(car => {
            // Only draw if within screen (opt)
            car.draw(this.ctx, this.input.keys);
            // Note: passing 'keys' makes wheels turn. 
            // Only the ACTIVE car should respond to steering visually?
            // Yes, parked cars wheels shouldn't turn.
            // But Car.draw uses 'keys' argument for steering anim.
            // We should pass empty keys for non-active cars.
        });

        // Re-draw Active Car on top?
        const activeCar = this.garage.getCurrentVehicle();
        // Since we iterated all, it's drawn.
        // If we want active on top, we draw it last.
        activeCar.draw(this.ctx, this.input.keys);


        if (this.isEditing) {
            this.drawObstacles();
            if (this.input.isDragging && this.input.currentDragBox) {
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                const b = this.input.currentDragBox;
                this.ctx.strokeRect(b.x, b.y, b.w, b.h);
            }
        }

        // Draw HUD / Prompts
        if (this.currentParkingStatus && this.currentParkingStatus.canSwitch) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText("Press 'G' to Swap Car", this.canvas.width / 2 - 100, this.canvas.height - 50);
            this.ctx.fillText("Press 'G' to Swap Car", this.canvas.width / 2 - 100, this.canvas.height - 50);
        }
    }

    drawParkingLot() {
        // Draw markings for the 4 spots
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 10]);

        const spots = this.garage.parkingSpots;
        spots.forEach(spot => {
            // Draw a box around the center point (approx 60x40)
            this.ctx.strokeRect(spot.x - 40, spot.y - 30, 80, 60);

            // "P" label?
            if (spot.occupiedBy === null) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fillRect(spot.x - 40, spot.y - 30, 80, 60);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.font = '20px Arial';
                this.ctx.fillText('P', spot.x - 6, spot.y + 7);
            }
        });

        this.ctx.restore();
    }

    drawObstacles() {
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';

        const CLOSE_BTN_SIZE = 15;

        for (let obs of this.obstacles) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.lineWidth = 2;

            this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

            // Draw Delete Button ("X")
            const btnX = obs.x + obs.w - CLOSE_BTN_SIZE;
            const btnY = obs.y;

            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(btnX, btnY, CLOSE_BTN_SIZE, CLOSE_BTN_SIZE);

            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(btnX + 3, btnY + 3);
            this.ctx.lineTo(btnX + CLOSE_BTN_SIZE - 3, btnY + CLOSE_BTN_SIZE - 3);
            this.ctx.moveTo(btnX + CLOSE_BTN_SIZE - 3, btnY + 3);
            this.ctx.lineTo(btnX + 3, btnY + CLOSE_BTN_SIZE - 3);
            this.ctx.stroke();
        }
    }
}

// Handle the click setup separately since I forgot it in constructor block above
// I'll add it to constructor in the file write below (merging logic)
module.exports = Game;
