class Vehicle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.angle = options.angle || 0;
        this.speed = 0;
        this.maxSpeed = options.maxSpeed || 10;
        this.acceleration = options.acceleration || 0.5;
        this.friction = options.friction || 0.95;
        this.rotationSpeed = options.rotationSpeed || 0.05;

        // Physics state
        this.moveAngle = this.angle;
        this.driftDuration = 0;
    }

    update(input, obstacles) {
        // Base update - override in children
    }

    draw(ctx) {
        // Base draw
    }
}

module.exports = Vehicle;
