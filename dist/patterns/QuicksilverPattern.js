"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuicksilverPattern = void 0;
class QuicksilverPattern {
    constructor(config) {
        this.name = 'quicksilver';
        this.droplets = [];
        this.ripples = [];
        this.noiseOffset = 0;
        // Characters for metallic liquid effect
        this.liquidChars = ['●', '◉', '○', '◐', '◑', '◒', '◓', '◔', '◕', '•', '∘', '·'];
        this.config = {
            speed: 1.0,
            flowIntensity: 0.5,
            noiseScale: 0.05,
            ...config
        };
    }
    // Simple noise function (Perlin-like)
    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        // Smooth interpolation
        const u = this.fade(xf);
        const v = this.fade(yf);
        // Hash coordinates
        const a = this.hash(X) + Y;
        const b = this.hash(X + 1) + Y;
        // Interpolate
        return this.lerp(v, this.lerp(u, this.grad(this.hash(a), xf, yf), this.grad(this.hash(b), xf - 1, yf)), this.lerp(u, this.grad(this.hash(a + 1), xf, yf - 1), this.grad(this.hash(b + 1), xf - 1, yf - 1)));
    }
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    hash(x) {
        x = ((x >> 16) ^ x) * 0x45d9f3b;
        x = ((x >> 16) ^ x) * 0x45d9f3b;
        x = (x >> 16) ^ x;
        return Math.abs(x) % 256;
    }
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
    }
    render(buffer, time, size) {
        const { width, height } = size;
        const { speed, flowIntensity, noiseScale } = this.config;
        this.noiseOffset += speed * 0.01;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Generate flowing liquid metal using noise
                const noiseX = x * noiseScale + this.noiseOffset;
                const noiseY = y * noiseScale;
                const noise1 = this.noise(noiseX, noiseY);
                const noise2 = this.noise(noiseX * 2 + 100, noiseY * 2);
                const noise3 = this.noise(noiseX * 0.5, noiseY * 0.5 + time * 0.0001);
                let flow = (noise1 + noise2 * 0.5 + noise3 * 0.3) * flowIntensity;
                // Add ripple effects
                for (const ripple of this.ripples) {
                    const dx = x - ripple.x;
                    const dy = y - ripple.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const age = time - ripple.time;
                    if (dist < ripple.radius && age < 1500) {
                        const rippleEffect = Math.sin(dist * 0.3 - age * 0.005) * (1 - dist / ripple.radius) * 2;
                        flow += rippleEffect;
                    }
                }
                // Add droplet effects
                for (const droplet of this.droplets) {
                    const dx = x - droplet.x;
                    const dy = y - droplet.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < droplet.radius) {
                        const dropletEffect = (1 - dist / droplet.radius) * 1.5;
                        flow += dropletEffect;
                    }
                }
                // Map flow to metallic appearance
                const intensity = (flow + 1) * 0.5; // Normalize to 0-1
                const charIndex = Math.floor(Math.abs(intensity * this.liquidChars.length)) % this.liquidChars.length;
                const char = this.liquidChars[charIndex];
                // Metallic silver/chrome color gradient
                const brightness = Math.floor(intensity * 255);
                const highlight = Math.max(0, Math.min(255, brightness + (noise2 * 50)));
                let color;
                if (intensity > 0.7) {
                    // Bright highlights (white-silver)
                    color = {
                        r: Math.floor(200 + highlight * 0.2),
                        g: Math.floor(200 + highlight * 0.2),
                        b: Math.floor(220 + highlight * 0.15)
                    };
                }
                else if (intensity > 0.4) {
                    // Medium silver
                    color = {
                        r: Math.floor(150 + brightness * 0.3),
                        g: Math.floor(150 + brightness * 0.3),
                        b: Math.floor(160 + brightness * 0.3)
                    };
                }
                else if (intensity > 0.2) {
                    // Dark chrome
                    color = {
                        r: Math.floor(80 + brightness * 0.5),
                        g: Math.floor(80 + brightness * 0.5),
                        b: Math.floor(90 + brightness * 0.5)
                    };
                }
                else {
                    // Very dark (shadows)
                    color = {
                        r: Math.floor(40 + brightness * 0.3),
                        g: Math.floor(40 + brightness * 0.3),
                        b: Math.floor(50 + brightness * 0.3)
                    };
                }
                buffer[y][x] = { char, color };
            }
        }
        // Update droplets
        this.droplets = this.droplets.filter(d => {
            const age = time - d.time;
            if (age > 2000)
                return false;
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.2; // Gravity
            d.radius = Math.max(1, d.radius - 0.05);
            return d.y < height && d.radius > 0;
        });
        // Clean up old ripples
        this.ripples = this.ripples.filter(r => time - r.time < 1500);
    }
    onMouseMove(pos) {
        // Mouse creates subtle ripples in the liquid metal
        this.ripples.push({
            x: pos.x,
            y: pos.y,
            time: Date.now(),
            radius: 15
        });
        // Limit ripples for performance
        if (this.ripples.length > 10) {
            this.ripples.shift();
        }
    }
    onMouseClick(pos) {
        // Click creates mercury droplets that splash and fall
        const numDroplets = 8;
        const time = Date.now();
        for (let i = 0; i < numDroplets; i++) {
            const angle = (Math.PI * 2 * i) / numDroplets;
            const speed = 2 + Math.random() * 2;
            this.droplets.push({
                x: pos.x,
                y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                time: time,
                radius: 3 + Math.random() * 2
            });
        }
        // Also create a large ripple
        this.ripples.push({
            x: pos.x,
            y: pos.y,
            time: time,
            radius: 30
        });
    }
    reset() {
        this.droplets = [];
        this.ripples = [];
        this.noiseOffset = 0;
    }
}
exports.QuicksilverPattern = QuicksilverPattern;
//# sourceMappingURL=QuicksilverPattern.js.map