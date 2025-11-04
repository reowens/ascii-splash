#!/usr/bin/env node

/**
 * Lightning Pattern Phase 2 Visual Test
 * Tests recursive branching implementation
 */

import { LightningPattern } from './dist/patterns/LightningPattern.js';

// Mock theme
const mockTheme = {
  name: 'test',
  displayName: 'Test',
  colors: [
    { r: 0, g: 100, b: 200 },
    { r: 100, g: 200, b: 255 }
  ],
  getColor: (intensity) => {
    const t = Math.max(0, Math.min(1, intensity));
    return {
      r: Math.floor(100 * t + 100),
      g: Math.floor(100 * t + 150),
      b: Math.floor(155 * t + 100)
    };
  }
};

function createTestBuffer(width, height) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
  );
}

function countRenderedCells(buffer) {
  let count = 0;
  for (const row of buffer) {
    for (const cell of row) {
      if (cell.char !== ' ') count++;
    }
  }
  return count;
}

function countByDepth(pattern) {
  const metrics = pattern.getMetrics();
  const bolt = pattern.bolts?.[0];
  if (!bolt) return { 0: 0, 1: 0, 2: 0, 3: 0 };
  
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const point of bolt.points) {
    counts[point.depth] = (counts[point.depth] || 0) + 1;
  }
  return counts;
}

console.log('='.repeat(70));
console.log('Lightning Pattern Phase 2: Recursive Branching Test');
console.log('='.repeat(70));
console.log();

const presets = LightningPattern.getPresets();
const width = 80;
const height = 40;

for (const preset of presets) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Preset ${preset.id}: ${preset.name}`);
  console.log(`Description: ${preset.description}`);
  console.log(`Max Branch Depth: ${preset.config.maxBranchDepth}`);
  console.log(`Branch Probability: ${(preset.config.branchProbability * 100).toFixed(0)}%`);
  console.log(`${'─'.repeat(70)}`);

  const pattern = new LightningPattern(mockTheme);
  pattern.applyPreset(preset.id);

  const buffer = createTestBuffer(width, height);
  
  // Force a bolt creation by rendering at interval
  pattern.render(buffer, 999999, { width, height });
  
  const renderedCells = countRenderedCells(buffer);
  const metrics = pattern.getMetrics();
  
  // Estimate writes per frame (with thickness multiplier)
  const avgThickness = preset.config.thickness;
  const estimatedWrites = metrics.totalPoints * avgThickness;

  console.log(`\n📊 Performance Metrics:`);
  console.log(`   Active Bolts: ${metrics.activeBolts}`);
  console.log(`   Total Points: ${metrics.totalPoints}`);
  console.log(`   Rendered Cells: ${renderedCells}`);
  console.log(`   Est. Writes/Frame: ~${estimatedWrites} (${metrics.totalPoints} × ${avgThickness})`);
  
  // Access internal bolt to check depth distribution
  if (pattern.bolts && pattern.bolts[0]) {
    const depthCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const point of pattern.bolts[0].points) {
      depthCounts[point.depth] = (depthCounts[point.depth] || 0) + 1;
    }
    
    console.log(`\n📍 Depth Distribution:`);
    console.log(`   Depth 0 (main): ${depthCounts[0]} points`);
    console.log(`   Depth 1 (branches): ${depthCounts[1]} points`);
    console.log(`   Depth 2 (sub-branches): ${depthCounts[2]} points`);
    console.log(`   Depth 3 (sub-sub-branches): ${depthCounts[3]} points`);
  }

  // Performance assessment
  const status = estimatedWrites < 1000 ? '✅ SAFE' : '⚠️  HIGH';
  const target = estimatedWrites >= 300 && estimatedWrites <= 700 ? '🎯 IN TARGET' : '';
  console.log(`\n${status} ${target}`);
  
  if (estimatedWrites < 300) {
    console.log('   (Lower than Phase 2 target 300-700)');
  } else if (estimatedWrites > 700) {
    console.log('   (Higher than Phase 2 target, but safe if < 1000)');
  }
}

console.log('\n' + '='.repeat(70));
console.log('✅ Phase 2 Visual Test Complete');
console.log('='.repeat(70));
console.log();
console.log('Next Steps:');
console.log('  1. Run interactive test: npm start -- --pattern lightning');
console.log('  2. Test each preset: Press c01, c02, c03, c04, c05, c06');
console.log('  3. Look for:');
console.log('     - Recursive branching (branches spawning sub-branches)');
console.log('     - Progressive dimming at deeper levels');
console.log('     - Thickness reduction (3→2→1)');
console.log('     - Smooth performance (<5% CPU)');
console.log();
