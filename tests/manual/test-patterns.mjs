import { SpiralPattern } from './dist/patterns/SpiralPattern.js';
import { TunnelPattern } from './dist/patterns/TunnelPattern.js';

// Mock theme
const mockTheme = {
  name: 'test',
  displayName: 'Test',
  colors: [
    { r: 0, g: 100, b: 200 },
    { r: 100, g: 200, b: 255 }
  ],
  getColor: (intensity) => ({ r: 100, g: 150, b: 200 })
};

const size = { width: 80, height: 24 };

// Test Spiral
console.log('Testing SpiralPattern...');
const spiral = new SpiralPattern(mockTheme);
const spiralBuffer = Array.from({ length: size.height }, () => 
  Array.from({ length: size.width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
);
spiral.render(spiralBuffer, 1000, size);

// Count non-space characters
let spiralCount = 0;
for (let y = 0; y < size.height; y++) {
  for (let x = 0; x < size.width; x++) {
    if (spiralBuffer[y][x].char !== ' ') spiralCount++;
  }
}
console.log(`Spiral rendered ${spiralCount} characters (expected >100)`);

// Test Tunnel
console.log('\nTesting TunnelPattern...');
const tunnel = new TunnelPattern(mockTheme);
const tunnelBuffer = Array.from({ length: size.height }, () => 
  Array.from({ length: size.width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
);
tunnel.render(tunnelBuffer, 1000, size);

// Count non-space characters
let tunnelCount = 0;
for (let y = 0; y < size.height; y++) {
  for (let x = 0; x < size.width; x++) {
    if (tunnelBuffer[y][x].char !== ' ') tunnelCount++;
  }
}
console.log(`Tunnel rendered ${tunnelCount} characters (expected >100)`);

console.log('\n' + (spiralCount > 100 && tunnelCount > 100 ? '✅ Both patterns rendering!' : '❌ One or both patterns failed'));
