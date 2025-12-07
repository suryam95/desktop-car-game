class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, type = 'smoke', options = {}) {
        let p = {
            x: x,
            y: y,
            vx: options.vx || 0,
            vy: options.vy || 0,
            life: 0,
            maxLife: options.maxLife || 30,
            size: options.size || 2,
            color: options.color || null
        };
        this.particles.push(p);
    }

    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            p.size += 0.1;
        });
        this.particles = this.particles.filter(p => p.life < p.maxLife);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            const alpha = 1 - (p.life / p.maxLife);
            if (p.color) {
                // Spark
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
            ctx.globalAlpha = 1;
        });
    }

    // Helper for collision sparks
    createCollisionSparks(x, y, baseAngle) {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const speed = 1 + Math.random() * 2;
            const angle = baseAngle + (Math.random() - 0.5) * 1.5;
            const colors = ['#FFFFFF', '#FFFACD'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.emit(x, y, 'spark', {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                maxLife: 5 + Math.random() * 5,
                size: 1 + Math.random(),
                color: color
            });
        }
    }
}

module.exports = ParticleSystem;
