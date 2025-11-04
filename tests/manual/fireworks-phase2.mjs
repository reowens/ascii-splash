#!/usr/bin/env node

/**
 * Fireworks Pattern Phase 2 Visual Test
 * Tests sparkle particles and shape-based bursts
 */

import fireworksModule from './dist/patterns/FireworksPattern.js';

const FireworksPattern = fireworksModule.FireworksPattern;

// Mock theme
const theme = {
  name: 'test',
  displayName: 'Test',
  colors: [
    { r: 0, g: 100, b: 200 },
    { r: 100, g: 200, b: 255 }
  ],
  getColor: (intensity) => {
    const t = Math.max(0, Math.min(1, intensity));
    return {
      r: Math.floor(theme.colors[0].r + (theme.colors[1].r - theme.colors[0].r) * t),
      g: Math.floor(theme.colors[0].g + (theme.colors[1].g - theme.colors[0].g) * t),
      b: Math.floor(theme.colors[0].b + (theme.colors[1].b - theme.colors[0].b) * t)
    };
  }
};

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║    FIREWORKS PATTERN PHASE 2: SPARKLES & SHAPE BURSTS       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Test all 6 presets
const presets = FireworksPattern.getPresets();

for (const preset of presets) {
  console.log(`\n${'='.repeat(65)}`);
  console.log(`PRESET ${preset.id}: ${preset.name}`);
  console.log(`Description: ${preset.description}`);
  console.log(`Shape: ${preset.config.burstShape}`);
  console.log(`Sparkle Chance: ${(preset.config.sparkleChance * 100).toFixed(0)}%`);
  console.log(`${'='.repeat(65)}\n`);

  // Create pattern with preset
  const pattern = new FireworksPattern(theme);
  pattern.applyPreset(preset.id);

  // Create buffer (80x24 terminal)
  const width = 80;
  const height = 24;
  const buffer = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
  );

  // Spawn a firework instantly at center
  pattern.onMouseClick({ x: width / 2, y: height / 4 });

  // Simulate 60 frames (1 second at 60fps)
  let maxParticles = 0;
  let maxNormal = 0, maxSparkles = 0;
  let totalWrites = 0;

  for (let frame = 0; frame < 60; frame++) {
    const time = frame * 16; // 16ms per frame
    
    // Clear buffer
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ', color: { r: 0, g: 0, b: 0 } };
      }
    }

    // Render pattern
    pattern.render(buffer, time, { width, height });

    // Get metrics
    const metrics = pattern.getMetrics();
    maxParticles = Math.max(maxParticles, metrics.totalParticles);
    maxNormal = Math.max(maxNormal, metrics.normalParticles || 0);
    maxSparkles = Math.max(maxSparkles, metrics.sparkleParticles || 0);

    // Count non-empty cells
    let writes = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (buffer[y][x].char !== ' ') {
          writes++;
        }
      }
    }
    totalWrites = Math.max(totalWrites, writes);
  }

  // Calculate particle distribution
  const normalPct = maxParticles > 0 ? ((maxNormal / maxParticles) * 100).toFixed(1) : '0.0';
  const sparklePct = maxParticles > 0 ? ((maxSparkles / maxParticles) * 100).toFixed(1) : '0.0';

  // Results
  console.log('Performance Metrics:');
  console.log(`  Peak Particles:  ${maxParticles}`);
  console.log(`  Peak Writes:     ${totalWrites} / 1000 (${((1 - totalWrites / 1000) * 100).toFixed(1)}% safety margin)`);
  console.log(`\nParticle Distribution (Peak):`);
  console.log(`  Normal:   ${maxNormal.toString().padStart(4)} (${normalPct}%)`);
  console.log(`  Sparkles: ${maxSparkles.toString().padStart(4)} (${sparklePct}%)`);
  
  // Safety check
  const isUnderLimit = maxParticles <= 500 && totalWrites <= 1000;
  const status = isUnderLimit ? '✅ SAFE' : '⚠️ OVER LIMIT';
  console.log(`\nStatus: ${status}`);
  
  if (!isUnderLimit) {
    console.log('  WARNING: Exceeds safety limits!');
  }

  // Verify sparkles are spawning
  const hasSparkles = maxSparkles > 0;
  console.log(`\nSparkle Verification:`);
  console.log(`  Expected sparkles: ${preset.config.sparkleChance > 0 ? 'Yes' : 'No'}`);
  console.log(`  Observed sparkles: ${hasSparkles ? 'Yes' : 'No'}`);
  console.log(`  Status: ${(preset.config.sparkleChance > 0) === hasSparkles ? '✅ CORRECT' : '❌ INCORRECT'}`);

  // Shape verification (visual only - hard to test programmatically)
  console.log(`\nShape Configuration:`);
  console.log(`  Burst Shape: ${preset.config.burstShape}`);
  console.log(`  Status: ✅ CONFIGURED`);
}

// Summary
console.log(`\n${'='.repeat(65)}`);
console.log('PHASE 2 TEST COMPLETE');
console.log(`${'='.repeat(65)}`);
console.log('\nAll presets tested with sparkles and shape bursts!');
console.log('Visual verification required for shape accuracy.');
console.log();
