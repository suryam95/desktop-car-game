const Vehicle = require('./Vehicle');

class Plane extends Vehicle {
    constructor(x, y, options = {}) {
        super(x, y, options);
        // Plane defaults
        this.maxSpeed = options.maxSpeed || 12; // Fast
        this.acceleration = 0.2; // Slow takeoff
        this.friction = 0.99; // Very glidey (low friction)
        this.rotationSpeed = 0.04; // Wide turns

        // Dimensions
        this.length = 50;
        this.width = 40; // Wingspan
        this.hbSz = 30;

        // Visuals
        this.bodyColor = options.bodyColor || '#FFFFFF';
        this.wingColor = options.wingColor || '#E0E0E0';
        this.propAngle = 0;

        // Flight state
        // We simulate "height" with shadow offset.
        // When moving fast, shadow moves further away? 
        // Or constant "flying" height. Constant is simpler and effective.
    }

    update(input, obstacles) {
        const { keys } = input;

        // Acceleration
        if (keys['ArrowUp'] || keys['w']) this.speed += this.acceleration;
        if (keys['ArrowDown'] || keys['s']) this.speed -= this.acceleration;

        // Steering
        // Planes turn better at speed (banking)
        if (Math.abs(this.speed) > 2) {
            let turnDir = 0;
            if (keys['ArrowLeft'] || keys['a']) turnDir = -1;
            if (keys['ArrowRight'] || keys['d']) turnDir = 1;

            this.angle += turnDir * this.rotationSpeed;
        }

        // Plane Physics: "Drift" is actually just momentum/air resistance
        // Planes don't snap to rails like cars can. They slide through air.
        // High "drift" factor always.

        // Align moveAngle slowly to facing angle (air resistance straightening flight path)
        const diff = this.angle - this.moveAngle;
        let d = diff % (2 * Math.PI);
        if (d < -Math.PI) d += 2 * Math.PI;
        if (d > Math.PI) d -= 2 * Math.PI;

        this.moveAngle += d * 0.03; // Very slow realignment = "slidey" turns

        this.speed *= this.friction;

        // Move
        const vx = Math.cos(this.moveAngle) * this.speed;
        const vy = Math.sin(this.moveAngle) * this.speed;

        this.x += vx;

        // Planes fly OVER obstacles? 
        // User said: "small propellor plane. same style as the rest... treat windows as barriers"
        // So planes ALSO hit windows.
        if (this.checkCollision(obstacles, this.hbSz)) {
            this.x -= vx;
            if (Math.abs(this.speed) > 2) return { collided: true, x: this.x + (vx > 0 ? 15 : -15), y: this.y };
        }

        this.y += vy;
        if (this.checkCollision(obstacles, this.hbSz)) {
            this.y -= vy;
            if (Math.abs(this.speed) > 2) return { collided: true, x: this.x, y: this.y + (vy > 0 ? 15 : -15) };
        }

        // Prop animation
        if (Math.abs(this.speed) > 0.1) {
            this.propAngle += 0.5 + Math.abs(this.speed) * 0.1;
        }

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

        // Shadow (Offset to create depth)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.drawPlaneBody(ctx, 15, 15, true); // Offset x, y, isShadow

        // Plane Body
        this.drawPlaneBody(ctx, 0, 0, false);

        ctx.restore();
    }

    drawPlaneBody(ctx, ox, oy, isShadow) {
        ctx.save();
        ctx.translate(ox, oy);

        const color = isShadow ? 'rgba(0,0,0,0.2)' : this.bodyColor;
        const wingColor = isShadow ? 'rgba(0,0,0,0.2)' : this.wingColor;
        const detailColor = isShadow ? 'rgba(0,0,0,0)' : '#AAAAAA';

        // Wings
        ctx.fillStyle = wingColor;
        // Main wing
        this.roundRect(ctx, -10, -22, 20, 44, 2);
        ctx.fill();

        // Tail wing
        this.roundRect(ctx, -20, -12, 12, 24, 2);
        ctx.fill();

        // Fuselage
        ctx.fillStyle = color;
        this.roundRect(ctx, -25, -6, 40, 12, 4); // Long body
        ctx.fill();

        // Cockpit window
        if (!isShadow) {
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.ellipse(-5, 0, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Propeller
        if (!isShadow) {
            ctx.save();
            ctx.translate(15, 0); // Nose of plane
            ctx.rotate(this.propAngle);
            ctx.fillStyle = '#555555';
            ctx.fillRect(-2, -18, 4, 36); // Blade
            ctx.fillStyle = '#CCCCCC'; // Center blur
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

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

module.exports = Plane;
