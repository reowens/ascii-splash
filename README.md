# ascii-splash

A terminal ASCII animation app that adds visual flow to your IDE workspace.

## Current Status: Phase 2 Complete - 5 Patterns Ready!

### Working Features
- Terminal renderer with double-buffering (flicker-free)
- 30 FPS animation engine
- **5 Interactive Patterns**: Waves, Starfield, Matrix, Rain, Quicksilver
- Pattern switching with keyboard shortcuts
- Full mouse interaction support
- Terminal resize handling
- Pause/resume functionality

## Installation & Running

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

Or run directly:
```bash
node dist/main.js
```

## Controls

### Keyboard
- **Ctrl+1**: Waves pattern
- **Ctrl+2**: Starfield pattern
- **Ctrl+3**: Matrix pattern
- **Ctrl+4**: Rain pattern
- **Ctrl+5**: Quicksilver pattern
- **Space**: Cycle to next pattern
- **Ctrl+P**: Pause/Resume
- **Ctrl+C**: Exit

### Mouse
- **Move**: Interactive effects (ripples, repulsion, distortion, spawning)
- **Click**: Special effects (big splash, explosion, spawn columns/drops)

## Patterns

### 1. Waves (Ctrl+1)
Smooth flowing sine waves with ripple effects
- Multiple wave layers
- Mouse creates ripples
- Click for big splashes
- Ocean color gradient

### 2. Starfield (Ctrl+2)
3D starfield with parallax depth
- Stars move toward viewer
- Mouse repels stars (force field)
- Click creates explosion burst
- Size varies with depth

### 3. Matrix (Ctrl+3)
Classic digital rain effect
- Falling character columns
- Katakana characters
- Mouse distorts characters
- Click spawns new columns

### 4. Rain (Ctrl+4)
Simple falling droplets
- Drops bounce off mouse cursor
- Mouse spawns extra drops
- Click creates splash effects
- Ground splash animations

### 5. Quicksilver (Ctrl+5)
Flowing liquid mercury effect
- Organic metallic liquid flow
- Silver/chrome color gradients
- Mouse creates ripples in metal
- Click spawns mercury droplets
- Reflective surface simulation

## Next Steps (Phase 3)

- Mouse tracking improvements
- Configuration system (~/.splashrc)
- Theme support
- More patterns (Particles, Spiral, Plasma)

See PLAN.md for the full roadmap.
