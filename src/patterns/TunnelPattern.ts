import { Pattern, Cell, Size, Point, Theme } from '../types';
import { bresenhamLine } from '../utils/drawing';

interface TunnelConfig {
  shape: 'circle' | 'square' | 'hexagon' | 'star';
  ringCount: number;
  speed: number;
  particleCount: number;
  speedLineCount: number;
  turbulence: number;
  glowIntensity: number;
  chromatic: boolean;
  rotationSpeed: number;
  radius: number;
}

interface TunnelPreset {
  id: number;
  name: string;
  description: string;
  config: TunnelConfig;
}

interface Ring {
  z: number;
  rotation: number;
}

interface StreamParticle {
  x: number;        // Position in normalized space (-1 to 1)
  y: number;
  z: number;        // Depth (0 = far, 1 = near)
  speed: number;
  trailLength: number;
}

interface SpeedLine {
  angle: number;
  length: number;
  offset: number;
}

export class TunnelPattern implements Pattern {
  name = 'tunnel';
  private config: TunnelConfig;
  private theme: Theme;
  private rings: Ring[] = [];
  private particles: StreamParticle[] = [];
  private speedLines: SpeedLine[] = [];
  private time: number = 0;
  private lastTime: number = 0;
  private vanishingOffset: Point = { x: 0, y: 0 };
  private boostActive: boolean = false;
  private boostEndTime: number = 0;
  private turbulenceOffset: number = 0;

  private static readonly PRESETS: TunnelPreset[] = [
    {
      id: 1,
      name: 'Warp Speed',
      description: 'Fast tunnel with intense streaming particles',
      config: { 
        shape: 'circle', 
        ringCount: 35, 
        speed: 2.5, 
        particleCount: 80, 
        speedLineCount: 25, 
        turbulence: 0.1, 
        glowIntensity: 0.8, 
        chromatic: false,
        rotationSpeed: 0.3,
        radius: 0.75
      }
    },
    {
      id: 2,
      name: 'Hyperspace Jump',
      description: 'Square tunnel with chromatic aberration, wild speed',
      config: { 
        shape: 'square', 
        ringCount: 40, 
        speed: 3.5, 
        particleCount: 100, 
        speedLineCount: 30, 
        turbulence: 0.2, 
        glowIntensity: 1.0, 
        chromatic: true,
        rotationSpeed: 0.5,
        radius: 0.7
      }
    },
    {
      id: 3,
      name: 'Gentle Cruise',
      description: 'Slow, calm, meditative tunnel flight',
      config: { 
        shape: 'circle', 
        ringCount: 25, 
        speed: 0.8, 
        particleCount: 30, 
        speedLineCount: 10, 
        turbulence: 0.0, 
        glowIntensity: 0.4, 
        chromatic: false,
        rotationSpeed: 0.1,
        radius: 0.6
      }
    },
    {
      id: 4,
      name: 'Asteroid Tunnel',
      description: 'Hexagon tunnel, turbulent, chaotic navigation',
      config: { 
        shape: 'hexagon', 
        ringCount: 30, 
        speed: 1.8, 
        particleCount: 60, 
        speedLineCount: 20, 
        turbulence: 0.4, 
        glowIntensity: 0.6, 
        chromatic: false,
        rotationSpeed: 0.4,
        radius: 0.65
      }
    },
    {
      id: 5,
      name: 'Stargate',
      description: 'Star-shaped portal, mystical glowing rings',
      config: { 
        shape: 'star', 
        ringCount: 30, 
        speed: 1.2, 
        particleCount: 50, 
        speedLineCount: 15, 
        turbulence: 0.05, 
        glowIntensity: 0.9, 
        chromatic: false,
        rotationSpeed: 0.2,
        radius: 0.7
      }
    },
    {
      id: 6,
      name: 'Lightspeed',
      description: 'Maximum speed, blur effect, absolutely insane',
      config: { 
        shape: 'circle', 
        ringCount: 50, 
        speed: 4.5, 
        particleCount: 120, 
        speedLineCount: 40, 
        turbulence: 0.15, 
        glowIntensity: 1.2, 
        chromatic: true,
        rotationSpeed: 0.8,
        radius: 0.8
      }
    }
  ];

  constructor(theme: Theme, config?: Partial<TunnelConfig>) {
    this.theme = theme;
    this.config = {
      shape: 'circle',
      ringCount: 35,
      speed: 2.0,
      particleCount: 60,
      speedLineCount: 20,
      turbulence: 0.1,
      glowIntensity: 0.7,
      chromatic: false,
      rotationSpeed: 0.3,
      radius: 0.75,
      ...config
    };
    this.initializeRings();
    this.initializeParticles();
    this.initializeSpeedLines();
  }

  private initializeRings(): void {
    this.rings = [];
    for (let i = 0; i < this.config.ringCount; i++) {
      this.rings.push({
        z: i / this.config.ringCount,
        rotation: Math.random() * Math.PI * 2
      });
    }
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: Math.random(),
        speed: 0.5 + Math.random() * 0.5,
        trailLength: 3 + Math.floor(Math.random() * 5)
      });
    }
  }

  private initializeSpeedLines(): void {
    this.speedLines = [];
    for (let i = 0; i < this.config.speedLineCount; i++) {
      this.speedLines.push({
        angle: Math.random() * Math.PI * 2,
        length: 0.3 + Math.random() * 0.4,
        offset: Math.random()
      });
    }
  }

  reset(): void {
    this.initializeRings();
    this.initializeParticles();
    this.initializeSpeedLines();
    this.time = 0;
    this.lastTime = 0;
    this.vanishingOffset = { x: 0, y: 0 };
    this.boostActive = false;
    this.boostEndTime = 0;
    this.turbulenceOffset = 0;
  }

  private getShapePoints(sides: number, radius: number, rotation: number): Point[] {
    const points: Point[] = [];
    
    if (this.config.shape === 'circle') {
      const circlePoints = Math.max(20, Math.floor(radius * 8));
      for (let i = 0; i < circlePoints; i++) {
        const angle = (Math.PI * 2 * i) / circlePoints + rotation;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
    } else if (this.config.shape === 'star') {
      const numPoints = 5;
      for (let i = 0; i < numPoints * 2; i++) {
        const angle = (Math.PI * 2 * i) / (numPoints * 2) + rotation;
        const r = i % 2 === 0 ? radius : radius * 0.4;
        points.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        });
      }
    } else {
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides + rotation;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
    }
    
    return points;
  }

  private drawLine(
    buffer: Cell[][],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    char: string,
    intensity: number,
    size: Size
  ): void {
    const points = bresenhamLine(x1, y1, x2, y2);
    const color = this.theme.getColor(intensity);

    for (const point of points) {
      if (point.x >= 0 && point.x < size.width && point.y >= 0 && point.y < size.height) {
        buffer[point.y][point.x] = { char, color };
      }
    }
  }

  render(buffer: Cell[][], time: number, size: Size, _mousePos?: Point): void {
    this.time = time;
    const { width, height } = size;
    const centerX = width / 2 + this.vanishingOffset.x;
    const centerY = height / 2 + this.vanishingOffset.y;

    // Check boost timeout
    if (this.boostActive && time > this.boostEndTime) {
      this.boostActive = false;
    }

    const speedMultiplier = this.boostActive ? 3.0 : 1.0;
    const effectiveSpeed = this.config.speed * speedMultiplier;
    const deltaTime = this.lastTime === 0 ? 16 : time - this.lastTime;
    this.lastTime = time;

    // Update turbulence
    this.turbulenceOffset += (deltaTime / 1000) * 2;

    // Render tunnel layers
    this.renderSpeedLines(buffer, size, time, effectiveSpeed, centerX, centerY);
    this.updateAndRenderRings(buffer, size, effectiveSpeed, deltaTime, centerX, centerY, width, height);
    this.updateAndRenderParticles(buffer, size, effectiveSpeed, deltaTime, centerX, centerY, width, height);
    this.renderCenterMarker(buffer, size, time, centerX, centerY, width, height);
  }

  private renderSpeedLines(
    buffer: Cell[][],
    size: Size,
    time: number,
    effectiveSpeed: number,
    centerX: number,
    centerY: number
  ): void {
    const { width, height } = size;
    const speedLineIntensity = Math.min(0.3, effectiveSpeed / 10);
    const maxDim = Math.min(width, height) / 2;
    const lineChar = effectiveSpeed > 3 ? '=' : '-';

    for (const line of this.speedLines) {
      const animOffset = (time / 1000) * effectiveSpeed;
      const linePhase = (line.offset + animOffset) % 1;
      
      const startDist = linePhase * 0.5;
      const endDist = startDist + line.length;
      
      const x1 = centerX + Math.cos(line.angle) * startDist * maxDim;
      const y1 = centerY + Math.sin(line.angle) * startDist * maxDim;
      const x2 = centerX + Math.cos(line.angle) * endDist * maxDim;
      const y2 = centerY + Math.sin(line.angle) * endDist * maxDim;
      
      const intensity = speedLineIntensity * (1 - linePhase);
      this.drawLine(buffer, Math.floor(x1), Math.floor(y1), Math.floor(x2), Math.floor(y2), lineChar, intensity, size);
    }
  }

  private updateAndRenderRings(
    buffer: Cell[][],
    size: Size,
    effectiveSpeed: number,
    deltaTime: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    const deltaSeconds = deltaTime / 1000;
    
    // Update ring positions
    for (const ring of this.rings) {
      ring.z += effectiveSpeed * deltaSeconds * 0.5;
      ring.rotation += this.config.rotationSpeed * deltaSeconds;

      if (ring.z > 1) {
        ring.z = 0;
      }
    }

    // Render rings back-to-front
    const sortedRings = [...this.rings].sort((a, b) => a.z - b.z);
    const sides = this.config.shape === 'square' ? 4 : this.config.shape === 'hexagon' ? 6 : 0;
    const baseRadius = Math.min(width, height) * this.config.radius;
    const chars = ['.', '·', '∘', '○', '◎', '◉', '●', '█'];

    for (const ring of sortedRings) {
      if (ring.z < 0.01) continue;

      const scale = ring.z;
      let scaledRadius = baseRadius * scale;
      
      // Apply turbulence
      if (this.config.turbulence > 0) {
        const wobble = Math.sin(this.turbulenceOffset + ring.z * 10) * this.config.turbulence * 5;
        scaledRadius += wobble;
      }

      const intensity = Math.max(0.2, ring.z * this.config.glowIntensity);
      const points = this.getShapePoints(sides, scaledRadius, ring.rotation);
      const charIndex = Math.min(chars.length - 1, Math.floor(ring.z * chars.length));
      const char = chars[charIndex];

      // Draw ring segments
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const x1 = Math.floor(centerX + p1.x);
        const y1 = Math.floor(centerY + p1.y);
        const x2 = Math.floor(centerX + p2.x);
        const y2 = Math.floor(centerY + p2.y);

        this.drawLine(buffer, x1, y1, x2, y2, char, intensity, size);
      }
    }
  }

  private updateAndRenderParticles(
    buffer: Cell[][],
    size: Size,
    effectiveSpeed: number,
    deltaTime: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    const deltaSeconds = deltaTime / 1000;
    const baseRadius = Math.min(width, height) * this.config.radius;

    for (const particle of this.particles) {
      // Update particle position
      particle.z += effectiveSpeed * deltaSeconds * particle.speed;

      if (particle.z > 1) {
        particle.z = 0;
        particle.x = (Math.random() - 0.5) * 2;
        particle.y = (Math.random() - 0.5) * 2;
      }

      // Draw particle trail
      const trailSteps = Math.floor(particle.trailLength);
      for (let t = 0; t < trailSteps; t++) {
        const trailZ = particle.z - (t / trailSteps) * 0.1;
        if (trailZ < 0) break;

        const trailScale = trailZ;
        const trailX = centerX + particle.x * baseRadius * trailScale;
        const trailY = centerY + particle.y * baseRadius * trailScale;

        const x = Math.floor(trailX);
        const y = Math.floor(trailY);

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const trailIntensity = particle.z * (1 - t / trailSteps) * 0.5;
          const trailChar = t === 0 ? '●' : (t < 2 ? '○' : '·');
          
          buffer[y][x] = {
            char: trailChar,
            color: this.theme.getColor(trailIntensity)
          };
        }
      }
    }
  }

  private renderCenterMarker(
    buffer: Cell[][],
    size: Size,
    time: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    if (this.boostActive) {
      const pulseSize = Math.floor(3 + Math.sin(time / 50) * 2);
      
      for (let dx = -pulseSize; dx <= pulseSize; dx++) {
        for (let dy = -pulseSize; dy <= pulseSize; dy++) {
          const distSquared = dx * dx + dy * dy;
          const pulseSizeSquared = pulseSize * pulseSize;
          
          if (distSquared <= pulseSizeSquared) {
            const x = Math.floor(centerX + dx);
            const y = Math.floor(centerY + dy);
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
              const dist = Math.sqrt(distSquared);
              const intensity = (1 - dist / pulseSize) * 0.8;
              buffer[y][x] = {
                char: dist < pulseSize / 2 ? '◉' : '○',
                color: this.theme.getColor(intensity)
              };
            }
          }
        }
      }
    } else {
      // Draw vanishing point
      const vpX = Math.floor(centerX);
      const vpY = Math.floor(centerY);
      if (vpX >= 0 && vpX < width && vpY >= 0 && vpY < height) {
        buffer[vpY][vpX] = {
          char: '+',
          color: this.theme.getColor(0.3)
        };
      }
    }
  }

  onMouseMove(pos: Point): void {
    // Parallax tilt effect
    const maxOffset = 8;
    this.vanishingOffset = {
      x: Math.max(-maxOffset, Math.min(maxOffset, (pos.x - 40) * 0.08)),
      y: Math.max(-maxOffset, Math.min(maxOffset, (pos.y - 12) * 0.08))
    };
  }

  onMouseClick(_pos: Point): void {
    // Activate BOOST mode
    this.boostActive = true;
    this.boostEndTime = this.time + 2000;
  }

  getMetrics(): Record<string, number> {
    return {
      rings: this.rings.length,
      particles: this.particles.length,
      boost: this.boostActive ? 1 : 0
    };
  }

  applyPreset(presetId: number): boolean {
    const preset = TunnelPattern.PRESETS.find(p => p.id === presetId);
    if (!preset) return false;

    this.config = { ...preset.config };
    this.reset();
    return true;
  }

  static getPresets(): TunnelPreset[] {
    return [...TunnelPattern.PRESETS];
  }

  static getPreset(id: number): TunnelPreset | undefined {
    return TunnelPattern.PRESETS.find(p => p.id === id);
  }
}
