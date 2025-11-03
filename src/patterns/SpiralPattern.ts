import { Pattern, Cell, Size, Point, Theme } from '../types';

interface SpiralConfig {
  armCount: number;
  particleCount: number;
  spiralTightness: number;
  rotationSpeed: number;
  particleSpeed: number;
  trailLength: number;
  direction: 'outward' | 'inward' | 'bidirectional';
  pulseEffect: boolean;
}

interface SpiralPreset {
  id: number;
  name: string;
  description: string;
  config: SpiralConfig;
}

interface Particle {
  angle: number;          // Current angle on spiral
  armIndex: number;       // Which spiral arm (0 to armCount-1)
  speed: number;          // Individual particle speed multiplier
  phase: number;          // For pulsing effect
  trail: Array<{x: number; y: number; intensity: number}>; // Trail history
}

interface ClickBurst {
  x: number;
  y: number;
  particles: Array<{
    angle: number;
    speed: number;
    life: number;
  }>;
  time: number;
}

export class SpiralPattern implements Pattern {
  name = 'spiral';
  private config: SpiralConfig;
  private theme: Theme;
  private particles: Particle[] = [];
  private clickBursts: ClickBurst[] = [];
  private armRotation: number = 0;
  
  // Gradient characters from dots to stars
  private particleChars = ['·', '∘', '○', '◉', '●', '◎', '✦', '✧', '★'];
  private trailChars = ['·', '∘', '○'];

  private static readonly PRESETS: SpiralPreset[] = [
    {
      id: 1,
      name: 'Twin Helix',
      description: 'Two elegant spiral arms flowing outward',
      config: { 
        armCount: 2, 
        particleCount: 80, 
        spiralTightness: 0.12, 
        rotationSpeed: 0.3, 
        particleSpeed: 1.0, 
        trailLength: 5,
        direction: 'outward',
        pulseEffect: true
      }
    },
    {
      id: 2,
      name: 'Galactic Whirlpool',
      description: 'Five-armed galaxy spiral, mesmerizing rotation',
      config: { 
        armCount: 5, 
        particleCount: 150, 
        spiralTightness: 0.08, 
        rotationSpeed: 0.15, 
        particleSpeed: 0.7, 
        trailLength: 6,
        direction: 'outward',
        pulseEffect: true
      }
    },
    {
      id: 3,
      name: 'Hyperspeed Vortex',
      description: 'Fast particles spiraling inward with intense trails',
      config: { 
        armCount: 3, 
        particleCount: 120, 
        spiralTightness: 0.15, 
        rotationSpeed: 0.5, 
        particleSpeed: 2.0, 
        trailLength: 8,
        direction: 'inward',
        pulseEffect: false
      }
    },
    {
      id: 4,
      name: 'Fibonacci Bloom',
      description: 'Eight-armed flower pattern, bidirectional flow',
      config: { 
        armCount: 8, 
        particleCount: 180, 
        spiralTightness: 0.1, 
        rotationSpeed: 0.2, 
        particleSpeed: 0.8, 
        trailLength: 4,
        direction: 'bidirectional',
        pulseEffect: true
      }
    },
    {
      id: 5,
      name: 'Black Hole',
      description: 'Single arm, particles accelerate toward center',
      config: { 
        armCount: 1, 
        particleCount: 100, 
        spiralTightness: 0.2, 
        rotationSpeed: 0.8, 
        particleSpeed: 1.5, 
        trailLength: 7,
        direction: 'inward',
        pulseEffect: true
      }
    },
    {
      id: 6,
      name: 'DNA Double Helix',
      description: 'Two counter-rotating spirals with sparkles',
      config: { 
        armCount: 2, 
        particleCount: 90, 
        spiralTightness: 0.18, 
        rotationSpeed: -0.4, 
        particleSpeed: 1.2, 
        trailLength: 3,
        direction: 'bidirectional',
        pulseEffect: true
      }
    }
  ];
  
  constructor(theme: Theme, config?: Partial<SpiralConfig>) {
    this.theme = theme;
    this.config = {
      armCount: 4,
      particleCount: 100,
      spiralTightness: 0.1,
      rotationSpeed: 0.3,
      particleSpeed: 1.0,
      trailLength: 5,
      direction: 'outward',
      pulseEffect: true,
      ...config
    };
    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.particles = [];
    const { particleCount, armCount, direction } = this.config;
    
    for (let i = 0; i < particleCount; i++) {
      // Distribute particles across arms
      const armIndex = Math.floor(Math.random() * armCount);
      
      // Random angle along the spiral (0 to ~20 radians for good spread)
      let angle: number;
      if (direction === 'bidirectional') {
        angle = Math.random() * 15;
      } else {
        angle = Math.random() * 20;
      }
      
      this.particles.push({
        angle,
        armIndex,
        speed: 0.8 + Math.random() * 0.4, // 0.8-1.2x speed variation
        phase: Math.random() * Math.PI * 2, // For pulse effect
        trail: []
      });
    }
  }

  reset(): void {
    this.initializeParticles();
    this.clickBursts = [];
    this.armRotation = 0;
  }

  private getSpiralPosition(angle: number, armIndex: number, centerX: number, centerY: number, maxRadius: number): Point {
    const { armCount, spiralTightness } = this.config;
    
    // Logarithmic spiral: r = a * e^(b*θ)
    const a = 2; // Starting radius
    const b = spiralTightness;
    const radius = Math.min(a * Math.exp(b * angle), maxRadius);
    
    // Offset angle for this arm + current arm rotation
    const armOffset = (Math.PI * 2 * armIndex) / armCount;
    const finalAngle = angle + armOffset + this.armRotation;
    
    return {
      x: centerX + radius * Math.cos(finalAngle),
      y: centerY + radius * Math.sin(finalAngle)
    };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    const { width, height } = size;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 2;
    
    const { particleSpeed, rotationSpeed, trailLength, direction, pulseEffect } = this.config;
    const deltaTime = 0.016; // ~60fps
    
    // Update arm rotation
    this.armRotation += rotationSpeed * deltaTime;
    
    // Update particles
    for (const particle of this.particles) {
      // Move particle along spiral
      const speedMultiplier = particle.speed * particleSpeed * deltaTime * 3;
      
      if (direction === 'outward') {
        particle.angle += speedMultiplier;
        // Wrap to beginning when too far out
        if (particle.angle > 20) {
          particle.angle = 0;
          particle.trail = [];
        }
      } else if (direction === 'inward') {
        particle.angle -= speedMultiplier;
        // Wrap to end when reaching center
        if (particle.angle < 0) {
          particle.angle = 20;
          particle.trail = [];
        }
      } else { // bidirectional
        // Half particles go out, half go in
        if (particle.armIndex % 2 === 0) {
          particle.angle += speedMultiplier;
          if (particle.angle > 15) particle.angle = 0;
        } else {
          particle.angle -= speedMultiplier;
          if (particle.angle < 0) particle.angle = 15;
        }
      }
      
      // Update pulse phase
      particle.phase += deltaTime * 5;
      
      // Get current position
      const pos = this.getSpiralPosition(particle.angle, particle.armIndex, centerX, centerY, maxRadius);
      
      // Add to trail
      particle.trail.unshift({ x: pos.x, y: pos.y, intensity: 1.0 });
      if (particle.trail.length > trailLength) {
        particle.trail.pop();
      }
    }
    
    // Update click bursts
    for (let i = this.clickBursts.length - 1; i >= 0; i--) {
      const burst = this.clickBursts[i];
      burst.time += deltaTime * 1000;
      
      // Remove old bursts
      if (burst.time > 2000) {
        this.clickBursts.splice(i, 1);
        continue;
      }
      
      // Update burst particles
      for (const bp of burst.particles) {
        bp.angle += bp.speed * deltaTime * 5;
        bp.life -= deltaTime * 0.5;
      }
    }
    
    // Draw center glow
    const cx = Math.floor(centerX);
    const cy = Math.floor(centerY);
    if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
      const pulseIntensity = pulseEffect ? (Math.sin(time / 200) * 0.2 + 0.8) : 1.0;
      buffer[cy][cx] = { 
        char: '◉', 
        color: this.theme.getColor(pulseIntensity) 
      };
    }
    
    // Draw particle trails first (so particles appear on top)
    for (const particle of this.particles) {
      for (let i = 0; i < particle.trail.length; i++) {
        const trailPoint = particle.trail[i];
        const x = Math.floor(trailPoint.x);
        const y = Math.floor(trailPoint.y);
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // Fade trail based on age
          const ageFactor = 1 - (i / particle.trail.length);
          const intensity = trailPoint.intensity * ageFactor * 0.5;
          
          const charIndex = Math.min(this.trailChars.length - 1, Math.floor(ageFactor * this.trailChars.length));
          
          buffer[y][x] = {
            char: this.trailChars[charIndex],
            color: this.theme.getColor(intensity)
          };
        }
      }
    }
    
    // Draw particles
    for (const particle of this.particles) {
      if (particle.trail.length === 0) continue;
      
      const pos = particle.trail[0];
      const x = Math.floor(pos.x);
      const y = Math.floor(pos.y);
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Calculate intensity based on distance from center
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const distIntensity = Math.min(1, dist / maxRadius);
        
        // Pulse effect
        let intensity = distIntensity;
        if (pulseEffect) {
          const pulse = Math.sin(particle.phase) * 0.3 + 0.7;
          intensity *= pulse;
        }
        
        // Choose character based on intensity
        const charIndex = Math.min(
          this.particleChars.length - 1, 
          Math.floor(intensity * this.particleChars.length)
        );
        
        buffer[y][x] = {
          char: this.particleChars[charIndex],
          color: this.theme.getColor(intensity)
        };
      }
    }
    
    // Draw click bursts
    for (const burst of this.clickBursts) {
      for (const bp of burst.particles) {
        if (bp.life <= 0) continue;
        
        const r = bp.angle * 2;
        const angle = bp.angle * 3;
        const x = Math.floor(burst.x + r * Math.cos(angle));
        const y = Math.floor(burst.y + r * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const charIndex = Math.min(
            this.particleChars.length - 1,
            Math.floor(bp.life * this.particleChars.length)
          );
          
          buffer[y][x] = {
            char: this.particleChars[charIndex],
            color: this.theme.getColor(bp.life)
          };
        }
      }
    }
  }

  onMouseMove(_pos: Point): void {
    // Could add mouse attraction/repulsion here later
  }

  onMouseClick(pos: Point): void {
    // Spawn a burst of particles at click position
    const burstParticles = [];
    for (let i = 0; i < 12; i++) {
      burstParticles.push({
        angle: (Math.PI * 2 * i) / 12,
        speed: 0.8 + Math.random() * 0.4,
        life: 1.0
      });
    }
    
    this.clickBursts.push({
      x: pos.x,
      y: pos.y,
      particles: burstParticles,
      time: 0
    });
    
    // Limit bursts
    if (this.clickBursts.length > 3) {
      this.clickBursts.shift();
    }
  }

  getMetrics(): Record<string, number> {
    return {
      particles: this.particles.length,
      arms: this.config.armCount,
      bursts: this.clickBursts.length
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = SpiralPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    
    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): SpiralPreset[] {
    return [...SpiralPattern.PRESETS];
  }

  static getPreset(id: number): SpiralPreset | undefined {
    return SpiralPattern.PRESETS.find(p => p.id === id);
  }
}
