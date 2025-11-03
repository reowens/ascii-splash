#!/usr/bin/env node
/**
 * Visual Pattern Test - Shows actual rendered output
 */

import { SpiralPattern } from './dist/patterns/SpiralPattern.js';
import { TunnelPattern } from './dist/patterns/TunnelPattern.js';
import { getTheme } from './dist/config/themes.js';

// Create a buffer
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

// Render buffer to console
function displayBuffer(buffer, title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
  
  for (let y = 0; y < buffer.length; y++) {
    let line = '';
    for (let x = 0; x < buffer[y].length; x++) {
      line += buffer[y][x].char;
    }
    console.log(line);
  }
  
  console.log('='.repeat(80));
}

// Count filled cells
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

const width = 80;
const height = 24;
const theme = getTheme('ocean');

// Test Spiral Pattern
console.log('\n\nTESTING SPIRAL PATTERN (Pattern 7)\n');
const spiralPattern = new SpiralPattern(theme);
const spiralBuffer = createBuffer(width, height);
spiralPattern.render(spiralBuffer, 1000, { width, height });

const spiralFilled = countFilledCells(spiralBuffer);
console.log(`Spiral filled ${spiralFilled}/${width * height} cells (${(spiralFilled / (width * height) * 100).toFixed(2)}%)`);

displayBuffer(spiralBuffer, 'SPIRAL PATTERN OUTPUT');

// Test Tunnel Pattern
console.log('\n\nTESTING TUNNEL PATTERN (Pattern 9)\n');
const tunnelPattern = new TunnelPattern(theme);
const tunnelBuffer = createBuffer(width, height);
tunnelPattern.render(tunnelBuffer, 1000, { width, height });

const tunnelFilled = countFilledCells(tunnelBuffer);
console.log(`Tunnel filled ${tunnelFilled}/${width * height} cells (${(tunnelFilled / (width * height) * 100).toFixed(2)}%)`);

displayBuffer(tunnelBuffer, 'TUNNEL PATTERN OUTPUT');

console.log('\n\nIf you see patterns above, they ARE rendering correctly.');
console.log('If they are NOT visible in the actual app, the issue is in:');
console.log('  1. AnimationEngine clearing/rendering logic');
console.log('  2. Buffer swap/change detection');
console.log('  3. TerminalRenderer output');
console.log('  4. Terminal emulator compatibility\n');
