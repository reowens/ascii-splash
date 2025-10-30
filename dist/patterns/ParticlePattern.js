"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticlePattern = void 0;
class ParticlePattern {
    constructor(theme, config) {
        this.name = 'particles';
        this.particles = [];
        this.attractMode = false; // Toggle between attract/repel
        this.particleChars = ['●', '◉', '○', '◐', '◑', '◒', '◓', '•', '∘', '·', '.'];
        this.theme = theme;
        this.config = {
            particleCount: 100,
            speed: 1.0,
            gravity: 0.02,
            mouseForce: 0.5,
            spawnRate: 2,
            ...config
        };
    }
    reset() {
        this.particles = [];
    }
    spawnParticle(size) {
        return {
            x: Math.random() * size.width,
            y: Math.random() * size.height,
            vx: (Math.random() - 0.5) * 2 * this.config.speed,
            vy: (Math.random() - 0.5) * 2 * this.config.speed,
            life: 1.0,
            maxLife: 1.0,
            size: Math.random() * 3
        };
    }
    render(buffer, _time, size, mousePos) {
        const { width, height } = size;
        const { particleCount, speed, gravity, mouseForce } = this.config;
        // Spawn new particles if below count
        while (this.particles.length < particleCount) {
            this.particles.push(this.spawnParticle(size));
        }
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            // Apply gravity
            p.vy += gravity * speed;
            // Mouse interaction
            if (mousePos) {
                const dx = mousePos.x - p.x;
                const dy = mousePos.y - p.y;
                const distSq = dx * dx + dy * dy;
                const minDist = 100; // Influence radius squared
                if (distSq < minDist) {
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / Math.sqrt(minDist)) * mouseForce;
                    const angle = Math.atan2(dy, dx);
                    if (this.attractMode) {
                        // Attract to mouse
                        p.vx += Math.cos(angle) * force;
                        p.vy += Math.sin(angle) * force;
                    }
                    else {
                        // Repel from mouse
                        p.vx -= Math.cos(angle) * force;
                        p.vy -= Math.sin(angle) * force;
                    }
                }
            }
            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;
            // Apply friction
            p.vx *= 0.99;
            p.vy *= 0.99;
            // Age particle
            p.life -= 0.002;
            // Bounce off walls
            if (p.x < 0) {
                p.x = 0;
                p.vx = Math.abs(p.vx) * 0.8;
            }
            if (p.x >= width) {
                p.x = width - 1;
                p.vx = -Math.abs(p.vx) * 0.8;
            }
            if (p.y < 0) {
                p.y = 0;
                p.vy = Math.abs(p.vy) * 0.8;
            }
            if (p.y >= height) {
                p.y = height - 1;
                p.vy = -Math.abs(p.vy) * 0.8;
            }
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        // Render particles
        for (const p of this.particles) {
            const x = Math.floor(p.x);
            const y = Math.floor(p.y);
            if (x >= 0 && x < width && y >= 0 && y < height) {
                // Choose character based on size
                const charIndex = Math.min(this.particleChars.length - 1, Math.floor(p.size));
                const char = this.particleChars[charIndex];
                // Color based on velocity and life
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                const intensity = Math.min(1, (speed / 5) * p.life);
                buffer[y][x] = {
                    char,
                    color: this.theme.getColor(intensity)
                };
            }
        }
    }
    onMouseMove(_pos) {
        // Mouse position is passed directly to render method
    }
    onMouseClick(pos) {
        // Toggle between attract and repel mode
        this.attractMode = !this.attractMode;
        // Spawn burst of particles at click location
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x: pos.x,
                y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                maxLife: 1.0,
                size: Math.random() * 3
            });
        }
    }
    getMetrics() {
        return {
            particles: this.particles.length,
            mode: this.attractMode ? 1 : 0 // 1 = attract, 0 = repel
        };
    }
}
exports.ParticlePattern = ParticlePattern;
//# sourceMappingURL=ParticlePattern.js.map