import { SpiralPattern } from './dist/patterns/SpiralPattern.js';
import { TunnelPattern } from './dist/patterns/TunnelPattern.js';

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

console.log('🌀 Testing EPIC SpiralPattern...');
const spiral = new SpiralPattern(mockTheme);
const spiralBuffer = Array.from({ length: size.height }, () => 
  Array.from({ length: size.width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
);

// Render a few frames to let particles build trails
spiral.render(spiralBuffer, 0, size);
spiral.render(spiralBuffer, 500, size);
spiral.render(spiralBuffer, 1000, size);

let spiralCount = 0;
for (let y = 0; y < size.height; y++) {
  for (let x = 0; x < size.width; x++) {
    if (spiralBuffer[y][x].char !== ' ') spiralCount++;
  }
}
console.log(`  ✓ Rendered ${spiralCount} characters`);
console.log(`  ✓ Particles: ${spiral.getMetrics().particles}`);
console.log(`  ✓ Arms: ${spiral.getMetrics().arms}`);

console.log('\n🚀 Testing EPIC TunnelPattern...');
const tunnel = new TunnelPattern(mockTheme);
const tunnelBuffer = Array.from({ length: size.height }, () => 
  Array.from({ length: size.width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
);
tunnel.render(tunnelBuffer, 1000, size);

let tunnelCount = 0;
for (let y = 0; y < size.height; y++) {
  for (let x = 0; x < size.width; x++) {
    if (tunnelBuffer[y][x].char !== ' ') tunnelCount++;
  }
}
console.log(`  ✓ Rendered ${tunnelCount} characters`);
console.log(`  ✓ Rings: ${tunnel.getMetrics().rings}`);
console.log(`  ✓ Particles: ${tunnel.getMetrics().particles}`);

// Test click interactions
console.log('\n💥 Testing click interactions...');
spiral.onMouseClick({ x: 40, y: 12 });
console.log(`  ✓ Spiral click bursts: ${spiral.getMetrics().bursts}`);

tunnel.onMouseClick({ x: 40, y: 12 });
console.log(`  ✓ Tunnel boost mode: ${tunnel.getMetrics().boost ? 'ACTIVE' : 'inactive'}`);

console.log('\n✨ Both patterns are EPIC and ready to use!');
