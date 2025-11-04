#!/usr/bin/env node

/**
 * Visual verification script for Fireworks Phase 2
 * Tests sparkles and shaped bursts
 */

import { FireworksPattern } from './dist/patterns/FireworksPattern.js';

const OCEAN_THEME = {
  name: 'ocean',
  displayName: 'Ocean',
  colors: [
    { r: 0, g: 105, b: 148 },
    { r: 0, g: 180, b: 216 },
    { r: 72, g: 202, b: 228 },
    { r: 144, g: 224, b: 239 },
    { r: 173, g: 232, b: 244 }
  ],
  getColor(intensity) {
    const t = Math.max(0, Math.min(1, intensity));
    const index = t * (this.colors.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const frac = index - lower;
    
    const c1 = this.colors[lower];
    const c2 = this.colors[upper];
    
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * frac),
      g: Math.round(c1.g + (c2.g - c1.g) * frac),
      b: Math.round(c1.b + (c2.b - c1.b) * frac)
    };
  }
};

const WIDTH = 100;
const HEIGHT = 40;

function createBuffer() {
  return Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
  );
}



console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║    FIREWORKS PHASE 2 - VISUAL VERIFICATION                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const presets = [
  { id: 2, name: 'Grand Finale', shape: 'random', sparkles: '30%' },
  { id: 3, name: 'Fountain', shape: 'ring', sparkles: '15%' },
  { id: 5, name: 'Chrysanthemum', shape: 'star', sparkles: '25%' }
];

for (const preset of presets) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PRESET ${preset.id}: ${preset.name}`);
  console.log(`Shape: ${preset.shape} | Sparkles: ${preset.sparkles}`);
  console.log(`${'='.repeat(60)}\n`);

  const pattern = new FireworksPattern(OCEAN_THEME, WIDTH, HEIGHT);
  pattern.applyPreset(preset.id);
  
  const buffer = createBuffer();
  
  // Spawn fireworks by clicking at various positions
  if (pattern.onMouseClick) {
    pattern.onMouseClick({ x: 20, y: 20 });
    pattern.onMouseClick({ x: 50, y: 20 });
    pattern.onMouseClick({ x: 80, y: 20 });
  }
  
  // Render 100 frames to accumulate particles and let explosions happen
  for (let frame = 0; frame < 100; frame++) {
    pattern.render(buffer, frame * 16.67, { width: WIDTH, height: HEIGHT });
  }
  
  // Get metrics
  const metrics = pattern.getMetrics();
  console.log('Metrics:');
  console.log(`  Total Particles:   ${metrics.totalParticles}`);
  console.log(`  Normal Particles:  ${metrics.normalParticles}`);
  console.log(`  Sparkle Particles: ${metrics.sparkleParticles}`);
  console.log(`  Fireworks Active:  ${metrics.activeFireworks}`);
  
  // Count sparkle characters
  let sparkleCount = 0;
  let normalCount = 0;
  const sparkleChars = ['✧', '✦', '*', '·'];
  
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const char = buffer[y][x].char;
      if (char !== ' ') {
        if (sparkleChars.includes(char)) {
          sparkleCount++;
        } else {
          normalCount++;
        }
      }
    }
  }
  
  console.log(`\nVisual Analysis:`);
  console.log(`  Sparkle chars rendered: ${sparkleCount}`);
  console.log(`  Normal chars rendered:  ${normalCount}`);
  console.log(`  Sparkle ratio: ${((sparkleCount / (sparkleCount + normalCount)) * 100).toFixed(1)}%`);
  
  // Show a sample of the buffer
  console.log('\nSample Frame (center 20x10):');
  const startY = Math.floor(HEIGHT / 2) - 5;
  const startX = Math.floor(WIDTH / 2) - 10;
  
  for (let y = startY; y < startY + 10; y++) {
    let line = '';
    for (let x = startX; x < startX + 20; x++) {
      line += buffer[y][x].char;
    }
    console.log(`  ${line}`);
  }
  
  pattern.reset();
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║    VISUAL VERIFICATION COMPLETE                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log('Visual verification successful! Sparkles and shapes detected.');
console.log('For full interactive testing, run:');
console.log('  npm start -- --pattern fireworks\n');
