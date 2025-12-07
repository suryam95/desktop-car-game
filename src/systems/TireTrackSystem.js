class TireTrackSystem {
    constructor() {
        this.marks = [];
        this.lastCarOut = null; // Track previous points for connectivity
    }

    update() {
        // Decay
        this.marks.forEach(m => m.age++);
        this.marks = this.marks.filter(m => m.age < 60);
    }

    // This needs to be called every frame for the active vehicle to generate continuity
    addTrack(vehicle, isDriftingActive) {
        // Only if moving
        if (Math.abs(vehicle.speed) < 0.5) {
            this.lastCarOut = null;
            return;
        }

        const rearOffsetX = -14;
        const rearOffsetY = 14;
        const cos = Math.cos(vehicle.angle);
        const sin = Math.sin(vehicle.angle);

        // Use vehicle tire width or default
        const trackWidth = vehicle.tireWidth || 10;
        // Use custom color if drifing? Or just black. Let's keep black for tires.

        const p1 = {
            x: vehicle.x + (rearOffsetX * cos - rearOffsetY * sin),
            y: vehicle.y + (rearOffsetX * sin + rearOffsetY * cos)
        };
        const p2 = {
            x: vehicle.x + (rearOffsetX * cos - (-rearOffsetY) * sin),
            y: vehicle.y + (rearOffsetX * sin + (-rearOffsetY) * cos)
        };

        if (this.lastCarOut) {
            this.marks.push({
                x1: this.lastCarOut.p1.x, y1: this.lastCarOut.p1.y,
                x2: p1.x, y2: p1.y,
                x3: this.lastCarOut.p2.x, y3: this.lastCarOut.p2.y,
                x4: p2.x, y4: p2.y,
                age: 0,
                drifting: isDriftingActive,
                width: trackWidth, // Store width
                color: vehicle.tireColor || null // Future proof
            });
        }
        this.lastCarOut = { p1, p2 };
    }

    draw(ctx) {
        // Group by width? Or just set lineWidth per mark?
        // Rendering mark by mark (slower but safe) or batch (fast).
        // Let's do mark by mark for correctness with variable widths.

        for (let mark of this.marks) {
            ctx.lineWidth = mark.width || 10;
            const alpha = 1 - (mark.age / 60);
            ctx.strokeStyle = `rgba(10, 10, 10, ${alpha * 0.5})`;

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
        ctx.setLineDash([]);
    }
}

module.exports = TireTrackSystem;
