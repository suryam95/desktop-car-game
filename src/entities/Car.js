const Vehicle = require('./Vehicle');

class Car extends Vehicle {
    constructor(x, y, options = {}) {
        super(x, y, options);
        // Car specific defaults if not provided
        this.maxSpeed = options.maxSpeed || 6;
        this.acceleration = options.acceleration || 0.3;
        this.friction = options.friction || 0.96;
        this.rotationSpeed = options.rotationSpeed || 0.05;

        // Dimensions
        this.length = 46;
        this.width = 26;
        this.hbSz = 20; // Hitbox size

        // Styles
        this.bodyColor = options.bodyColor || '#FF5A5F';
        this.windowColor = '#87CEEB';
        this.wheelColor = options.wheelColor || '#333333';
        this.tireWidth = options.tireWidth || 8;
        this.smokeColor = options.smokeColor || null; // Null means default gray smoke
        this.driftColor = options.driftColor || null; // Color for drift sparks/trails

        // Physics Quirks
        this.driftThreshold = options.driftThreshold || 0.2; // How easy to drift

    }

    update(input, obstacles) {
        const { keys } = input;

        // Acceleration
        if (keys['ArrowUp'] || keys['w']) this.speed += this.acceleration;
        if (keys['ArrowDown'] || keys['s']) this.speed -= this.acceleration;

        const isDrifting = keys[' '] || keys['Spacebar'];

        // Steering
        if (Math.abs(this.speed) > 0.1) {
            let turnDir = 0;
            if (keys['ArrowLeft'] || keys['a']) turnDir = -1;
            if (keys['ArrowRight'] || keys['d']) turnDir = 1;

            this.angle += turnDir * this.rotationSpeed * Math.sign(this.speed);
        }

        // Drift Physics
        const diff = this.angle - this.moveAngle;
        let d = diff % (2 * Math.PI);
        if (d < -Math.PI) d += 2 * Math.PI;
        if (d > Math.PI) d -= 2 * Math.PI;

        if (isDrifting) {
            this.moveAngle += d * 0.05;
        } else {
            this.moveAngle += d * 0.2;
        }

        this.speed *= this.friction;

        // Calculate Velocity
        const vx = Math.cos(this.moveAngle) * this.speed;
        const vy = Math.sin(this.moveAngle) * this.speed;

        // Move & Collide X
        this.x += vx;
        if (this.checkCollision(obstacles, this.hbSz)) {
            this.x -= vx;
            if (Math.abs(this.speed) > 2) return { collided: true, x: this.x + (vx > 0 ? 10 : -10), y: this.y, angle: vx > 0 ? -1 : 0 };
        }

        // Move & Collide Y
        this.y += vy;
        if (this.checkCollision(obstacles, this.hbSz)) {
            this.y -= vy;
            if (Math.abs(this.speed) > 2) return { collided: true, x: this.x, y: this.y + (vy > 0 ? 10 : -10), angle: vy > 0 ? -1.5 : 1.5 };
        }

        // Bounds collisions (simple return triggers for sparks)
        // Note: passing canvas dimensions would be needed here or handled in Game.
        // Let's assume Game handles screen bounds if we want to be pure, OR pass bounds.
        // For now, let's return collision info if we hit something so Game can spawn sparks.

        return { collided: false };
    }

    checkCollision(obstacles, size) {
        for (let obs of obstacles) {
            if (this.x + size / 2 > obs.x && this.x - size / 2 < obs.x + obs.w &&
                this.y + size / 2 > obs.y && this.y - size / 2 < obs.y + obs.h) {
                return true;
            }
        }
        return false;
    }

    draw(ctx, keys) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        let steerAngle = 0;
        if (keys['ArrowLeft'] || keys['a']) steerAngle = -0.5;
        if (keys['ArrowRight'] || keys['d']) steerAngle = 0.5;

        this.drawCarBody(ctx, steerAngle);
        ctx.restore();
    }

    drawCarBody(ctx, steerAngle) {
        // (Copying drawing logic from renderer.js)
        const shadowColor = 'rgba(0, 0, 0, 0.2)';
        const wheelColor = this.wheelColor;
        const wheelWidth = this.tireWidth;
        const wheelHeight = 6;
        const wheelOffsetX = 12;
        const wheelOffsetY = 13;

        const drawWheel = (x, y, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = wheelColor;
            this.roundRect(ctx, -wheelWidth / 2, -wheelHeight / 2, wheelWidth, wheelHeight, 2);
            ctx.fill();
            ctx.fillStyle = '#333333'; // Rim
            ctx.fillRect(-2, -wheelHeight / 2, 4, wheelHeight);
            ctx.restore();
        };

        // Wheels
        drawWheel(wheelOffsetX, -wheelOffsetY, steerAngle);
        drawWheel(wheelOffsetX, wheelOffsetY, steerAngle);
        drawWheel(-wheelOffsetX, -wheelOffsetY, 0);
        drawWheel(-wheelOffsetX, wheelOffsetY, 0);

        // Exhaust
        ctx.fillStyle = '#555555';
        ctx.fillRect(-this.length / 2 - 4, -3, 6, 6);

        // Shadow
        ctx.fillStyle = shadowColor;
        this.roundRect(ctx, -this.length / 2 - 2, -this.width / 2 + 2, this.length + 4, this.width + 4, 8);
        ctx.fill();

        // Headlights
        this.drawHeadlights(ctx);

        // Body
        ctx.fillStyle = this.bodyColor;
        this.roundRect(ctx, -this.length / 2, -this.width / 2, this.length, this.width, 8);
        ctx.fill();

        // Stickers
        ctx.fillStyle = '#FFEE88';
        ctx.beginPath(); ctx.ellipse(18, -8, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(18, 8, 2, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Mirrors
        ctx.fillStyle = this.bodyColor;
        this.roundRect(ctx, 4, -this.width / 2 - 4, 6, 4, 2); ctx.fill();
        this.roundRect(ctx, 4, this.width / 2, 6, 4, 2); ctx.fill();

        // Windows
        ctx.fillStyle = this.windowColor;
        // Windshield
        ctx.beginPath();
        ctx.moveTo(8, -8); ctx.lineTo(8, 8); ctx.lineTo(-2, 10); ctx.lineTo(-2, -10); ctx.fill();
        // Sides
        ctx.fillRect(-8, -11, 10, 3);
        ctx.fillRect(-8, 8, 10, 3);
        // Rear
        ctx.beginPath();
        ctx.moveTo(-12, -7); ctx.lineTo(-12, 7); ctx.lineTo(-18, 6); ctx.lineTo(-18, -6); ctx.fill();
    }

    drawHeadlights(ctx) {
        ctx.save();
        ctx.translate(20, 0);
        ctx.filter = 'blur(8px)';
        ctx.globalCompositeOperation = 'screen';

        const beamLen = 80;
        const grad = ctx.createLinearGradient(0, 0, beamLen, 0);
        grad.addColorStop(0, 'rgba(255, 230, 200, 0.4)');
        grad.addColorStop(1, 'rgba(255, 230, 200, 0)');

        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.lineTo(beamLen, -25); ctx.lineTo(beamLen, -5); ctx.lineTo(0, -4); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 10); ctx.lineTo(beamLen, 25); ctx.lineTo(beamLen, 5); ctx.lineTo(0, 4); ctx.fill();

        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
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
}

module.exports = Car;
