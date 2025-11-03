#!/usr/bin/env node
/**
 * Pattern Diagnostic Tool
 * Tests pattern rendering in isolation to identify display issues
 */

import { SpiralPattern } from './dist/patterns/SpiralPattern.js';
import { TunnelPattern } from './dist/patterns/TunnelPattern.js';
import { getTheme } from './dist/config/themes.js';

// Create a simple buffer
function createBuffer(width, height) {
  const buffer = [];
  for (let y = 0; y < height; y++) {
    buffer[y] = [];
    for (let x = 0; x < width; x++) {
      buffer[y][x] = { char: ' ', color: { r: 0, g: 0, b: 0 } };
    }
  }
  return buffer;
}

// Count non-empty cells
function countFilledCells(buffer) {
  let count = 0;
  for (let y = 0; y < buffer.length; y++) {
    for (let x = 0; x < buffer[y].length; x++) {
      if (buffer[y][x].char !== ' ') {
        count++;
      }
    }
  }
  return count;
}

// Test a pattern
function testPattern(pattern, patternName) {
  console.log(`\n=== Testing ${patternName} ===`);
  
  const width = 80;
  const height = 24;
  const buffer = createBuffer(width, height);
  
  // Render at different times
  const times = [0, 500, 1000, 2000];
  
  for (const time of times) {
    // Reset buffer
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer[y][x] = { char: ' ', color: { r: 0, g: 0, b: 0 } };
      }
    }
    
    // Render pattern
    pattern.render(buffer, time, { width, height });
    
    // Count filled cells
    const filledCells = countFilledCells(buffer);
    const totalCells = width * height;
    const fillPercentage = ((filledCells / totalCells) * 100).toFixed(2);
    
    console.log(`  Time ${time}ms: ${filledCells}/${totalCells} cells filled (${fillPercentage}%)`);
    
    // Get metrics if available
    if (pattern.getMetrics) {
      const metrics = pattern.getMetrics();
      console.log(`    Metrics:`, metrics);
    }
    
    // Sample some cells
    if (filledCells > 0) {
      console.log(`    Sample cells (first 5 non-empty):`);
      let samples = 0;
      for (let y = 0; y < height && samples < 5; y++) {
        for (let x = 0; x < width && samples < 5; x++) {
          if (buffer[y][x].char !== ' ') {
            console.log(`      [${x},${y}] = '${buffer[y][x].char}' color=(${buffer[y][x].color.r},${buffer[y][x].color.g},${buffer[y][x].color.b})`);
            samples++;
          }
        }
      }
    } else {
      console.log(`    ⚠️  WARNING: No cells filled! Pattern not rendering.`);
    }
  }
  
  // Test with presets
  if (pattern.applyPreset) {
    console.log(`\n  Testing presets:`);
    for (let preset = 1; preset <= 6; preset++) {
      const success = pattern.applyPreset(preset);
      if (success) {
        // Reset buffer
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            buffer[y][x] = { char: ' ', color: { r: 0, g: 0, b: 0 } };
          }
        }
        
        pattern.render(buffer, 1000, { width, height });
        const filledCells = countFilledCells(buffer);
        console.log(`    Preset ${preset}: ${filledCells} cells filled`);
      } else {
        console.log(`    Preset ${preset}: Failed to apply`);
      }
    }
  }
}

// Main
console.log('Pattern Rendering Diagnostic Tool');
console.log('==================================');

const theme = getTheme('ocean');
console.log(`Using theme: ${theme.displayName}`);

// Test Spiral Pattern
const spiralPattern = new SpiralPattern(theme);
testPattern(spiralPattern, 'Spiral Pattern (Pattern 7)');

// Test Tunnel Pattern
const tunnelPattern = new TunnelPattern(theme);
testPattern(tunnelPattern, 'Tunnel Pattern (Pattern 9)');

console.log('\n=== Diagnostic Complete ===\n');
