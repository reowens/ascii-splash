/**
 * Boids Flocking Algorithm
 *
 * Implementation of Craig Reynolds' boids algorithm for natural flocking behavior.
 * Used by patterns that need schooling fish, birds, or other swarm movement.
 */

export interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
}

export interface BoidConfig {
  separationWeight: number; // Force to avoid crowding (default: 1.5)
  alignmentWeight: number; // Force to match velocity of neighbors (default: 1.0)
  cohesionWeight: number; // Force to move toward center of mass (default: 1.0)
  perceptionRadius: number; // How far each boid can "see" (default: 50)
  separationRadius: number; // Minimum distance before separation kicks in (default: 25)
  maxSpeed: number; // Maximum velocity magnitude (default: 4)
  maxForce: number; // Maximum steering force (default: 0.1)
  edgeMargin: number; // Distance from edge to start turning (default: 30)
  edgeForce: number; // Force to steer away from edges (default: 0.3)
}

export const DEFAULT_BOID_CONFIG: BoidConfig = {
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,
  perceptionRadius: 50,
  separationRadius: 25,
  maxSpeed: 4,
  maxForce: 0.1,
  edgeMargin: 30,
  edgeForce: 0.3,
};

/**
 * Calculate the magnitude of a vector
 */
function magnitude(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/**
 * Normalize a vector and scale it
 */
function setMagnitude(x: number, y: number, mag: number): { x: number; y: number } {
  const m = magnitude(x, y);
  if (m === 0) return { x: 0, y: 0 };
  return {
    x: (x / m) * mag,
    y: (y / m) * mag,
  };
}

/**
 * Limit vector magnitude to a maximum value
 */
function limitMagnitude(x: number, y: number, max: number): { x: number; y: number } {
  const m = magnitude(x, y);
  if (m > max) {
    return setMagnitude(x, y, max);
  }
  return { x, y };
}

/**
 * Calculate separation steering - avoid crowding neighbors
 */
function separation(boid: Boid, neighbors: Boid[], config: BoidConfig): { x: number; y: number } {
  let steerX = 0;
  let steerY = 0;
  let count = 0;

  for (const other of neighbors) {
    const dx = boid.x - other.x;
    const dy = boid.y - other.y;
    const d = magnitude(dx, dy);

    if (d > 0 && d < config.separationRadius) {
      // Weight by inverse of distance (closer = stronger repulsion)
      steerX += dx / (d * d);
      steerY += dy / (d * d);
      count++;
    }
  }

  if (count > 0) {
    steerX /= count;
    steerY /= count;

    const normalized = setMagnitude(steerX, steerY, config.maxSpeed);
    steerX = normalized.x - boid.vx;
    steerY = normalized.y - boid.vy;

    const limited = limitMagnitude(steerX, steerY, config.maxForce);
    return limited;
  }

  return { x: 0, y: 0 };
}

/**
 * Calculate alignment steering - match velocity of neighbors
 */
function alignment(boid: Boid, neighbors: Boid[], config: BoidConfig): { x: number; y: number } {
  let avgVx = 0;
  let avgVy = 0;
  let count = 0;

  for (const other of neighbors) {
    const dx = other.x - boid.x;
    const dy = other.y - boid.y;
    const d = magnitude(dx, dy);

    if (d > 0 && d < config.perceptionRadius) {
      avgVx += other.vx;
      avgVy += other.vy;
      count++;
    }
  }

  if (count > 0) {
    avgVx /= count;
    avgVy /= count;

    const normalized = setMagnitude(avgVx, avgVy, config.maxSpeed);
    const steerX = normalized.x - boid.vx;
    const steerY = normalized.y - boid.vy;

    const limited = limitMagnitude(steerX, steerY, config.maxForce);
    return limited;
  }

  return { x: 0, y: 0 };
}

/**
 * Calculate cohesion steering - move toward center of mass
 */
function cohesion(boid: Boid, neighbors: Boid[], config: BoidConfig): { x: number; y: number } {
  let centerX = 0;
  let centerY = 0;
  let count = 0;

  for (const other of neighbors) {
    const dx = other.x - boid.x;
    const dy = other.y - boid.y;
    const d = magnitude(dx, dy);

    if (d > 0 && d < config.perceptionRadius) {
      centerX += other.x;
      centerY += other.y;
      count++;
    }
  }

  if (count > 0) {
    centerX /= count;
    centerY /= count;

    // Desired velocity toward center
    const desiredX = centerX - boid.x;
    const desiredY = centerY - boid.y;

    const normalized = setMagnitude(desiredX, desiredY, config.maxSpeed);
    const steerX = normalized.x - boid.vx;
    const steerY = normalized.y - boid.vy;

    const limited = limitMagnitude(steerX, steerY, config.maxForce);
    return limited;
  }

  return { x: 0, y: 0 };
}

/**
 * Calculate edge avoidance steering - turn away from boundaries
 */
function avoidEdges(
  boid: Boid,
  width: number,
  height: number,
  config: BoidConfig
): { x: number; y: number } {
  let steerX = 0;
  let steerY = 0;

  // Left edge
  if (boid.x < config.edgeMargin) {
    steerX += config.edgeForce * (1 - boid.x / config.edgeMargin);
  }
  // Right edge
  if (boid.x > width - config.edgeMargin) {
    steerX -= config.edgeForce * (1 - (width - boid.x) / config.edgeMargin);
  }
  // Top edge
  if (boid.y < config.edgeMargin) {
    steerY += config.edgeForce * (1 - boid.y / config.edgeMargin);
  }
  // Bottom edge
  if (boid.y > height - config.edgeMargin) {
    steerY -= config.edgeForce * (1 - (height - boid.y) / config.edgeMargin);
  }

  return { x: steerX, y: steerY };
}

/**
 * Update all boids using flocking algorithm
 */
export function updateBoids(
  boids: Boid[],
  width: number,
  height: number,
  config: BoidConfig = DEFAULT_BOID_CONFIG,
  dt = 1
): void {
  // Calculate forces for all boids first (before applying)
  const forces: { x: number; y: number }[] = [];

  for (const boid of boids) {
    const sep = separation(boid, boids, config);
    const ali = alignment(boid, boids, config);
    const coh = cohesion(boid, boids, config);
    const edge = avoidEdges(boid, width, height, config);

    // Apply weights
    const fx =
      sep.x * config.separationWeight +
      ali.x * config.alignmentWeight +
      coh.x * config.cohesionWeight +
      edge.x;

    const fy =
      sep.y * config.separationWeight +
      ali.y * config.alignmentWeight +
      coh.y * config.cohesionWeight +
      edge.y;

    forces.push({ x: fx, y: fy });
  }

  // Apply forces to update velocities and positions
  for (let i = 0; i < boids.length; i++) {
    const boid = boids[i];
    const force = forces[i];

    // Update velocity
    boid.vx += force.x * dt;
    boid.vy += force.y * dt;

    // Limit speed
    const limited = limitMagnitude(boid.vx, boid.vy, config.maxSpeed);
    boid.vx = limited.x;
    boid.vy = limited.y;

    // Update position
    boid.x += boid.vx * dt;
    boid.y += boid.vy * dt;

    // Wrap around edges (soft wrap for natural feel)
    if (boid.x < -5) boid.x = width + 5;
    if (boid.x > width + 5) boid.x = -5;
    if (boid.y < -5) boid.y = height + 5;
    if (boid.y > height + 5) boid.y = -5;
  }
}

/**
 * Create a flock of boids with random initial positions and velocities
 */
export function createFlock(
  count: number,
  width: number,
  height: number,
  config: BoidConfig = DEFAULT_BOID_CONFIG
): Boid[] {
  const boids: Boid[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = config.maxSpeed * 0.5 + Math.random() * config.maxSpeed * 0.5;

    boids.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  return boids;
}

/**
 * Get the direction angle of a boid (in radians)
 */
export function getBoidDirection(boid: Boid): number {
  return Math.atan2(boid.vy, boid.vx);
}

/**
 * Check if a boid is moving mostly left (for sprite flipping)
 */
export function isBoidFacingLeft(boid: Boid): boolean {
  return boid.vx < 0;
}
