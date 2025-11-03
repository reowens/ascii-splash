import { SpiralPattern } from './dist/patterns/SpiralPattern.js';
import { TunnelPattern } from './dist/patterns/TunnelPattern.js';

const mockTheme = {
  name: 'test',
  displayName: 'Test',
  colors: [
    { r: 0, g: 100, b: 200 },
    { r: 100, g: 200, b: 255 }
  ],
  getColor: (intensity) => ({ r: Math.floor(100 * intensity), g: Math.floor(150 * intensity), b: Math.floor(200 * intensity) })
};

const size = { width: 60, height: 20 };

function renderFrame(pattern, time, title) {
  const buffer = Array.from({ length: size.height }, () => 
    Array.from({ length: size.width }, () => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
  );
  
  pattern.render(buffer, time, size);
  
  console.log(`\n${title}`);
  console.log('═'.repeat(size.width));
  for (let y = 0; y < size.height; y++) {
    let line = '';
    for (let x = 0; x < size.width; x++) {
      line += buffer[y][x].char;
    }
    console.log(line);
  }
  console.log('═'.repeat(size.width));
}

console.log('🌀 SPIRAL PATTERN - Twin Helix Preset');
const spiral = new SpiralPattern(mockTheme);
spiral.applyPreset(1);
renderFrame(spiral, 2000, 'Frame at 2 seconds');

console.log('\n🚀 TUNNEL PATTERN - Warp Speed Preset');
const tunnel = new TunnelPattern(mockTheme);
tunnel.applyPreset(1);
renderFrame(tunnel, 1000, 'Frame at 1 second');

console.log('\n✨ Patterns ready! Run: npm start -- -p spiral  OR  npm start -- -p tunnel');
