---
type: doc
status: reference
---

# Configuration Guide

Configure ascii-splash through CLI arguments, configuration files, or defaults.

**Quick Links**:

- 📊 [Project Status](../PROJECT_STATUS.md) - Current features and statistics
- 🏗️ [Architecture](../ARCHITECTURE.md) - Technical deep dive
- 👤 [User Guide](../../README.md) - Installation and usage
- 💾 [Example Config](../../examples/.splashrc.example) - Sample configuration file

---

## Configuration Priority

Settings are applied in this order (first found wins):

```
1. CLI Arguments       (highest priority)
   ↓
2. Config File        (~/.config/ascii-splash/.splashrc.json)
   ↓
3. Defaults           (built-in defaults)
```

Example: If you set `--pattern wave` on the command line, it overrides the config file and defaults.

---

## Configuration File Location

| Platform        | Location                                |
| --------------- | --------------------------------------- |
| **macOS/Linux** | `~/.config/ascii-splash/.splashrc.json` |
| **Windows**     | `%APPDATA%\ascii-splash\config.json`    |

### Creating a Config File

```bash
# Create the config directory
mkdir -p ~/.config/ascii-splash

# Create or edit the config file
nano ~/.config/ascii-splash/.splashrc.json
```

---

## Global Settings

### Basic Configuration

```json
{
  "defaultPattern": "wave",
  "quality": "medium",
  "fps": 30,
  "theme": "ocean",
  "mouseEnabled": true
}
```

### Configuration Options

| Option           | Type                              | Default  | Description                                                        |
| ---------------- | --------------------------------- | -------- | ------------------------------------------------------------------ |
| `defaultPattern` | string                            | `wave`   | Starting pattern (e.g., `wave`, `starfield`, `matrix`)             |
| `quality`        | `"low"` \| `"medium"` \| `"high"` | `medium` | Rendering quality (affects performance)                            |
| `fps`            | number (10-60)                    | 30       | Target frames per second                                           |
| `theme`          | string                            | `ocean`  | Color theme (`ocean`, `matrix`, `starlight`, `fire`, `monochrome`) |
| `mouseEnabled`   | boolean                           | `true`   | Enable mouse interaction                                           |

---

## Theme System

### Available Themes

1. **ocean** (default) - Cool blues and cyans
2. **matrix** - Green terminal aesthetic
3. **starlight** - Purples and blues
4. **fire** - Reds, oranges, and yellows
5. **monochrome** - Grayscale

### Switching Themes

- **Via config file**:

  ```json
  { "theme": "fire" }
  ```

- **Via CLI**:

  ```bash
  splash --theme starlight
  ```

- **In app**: Press `t` to cycle through themes

---

## Pattern-Specific Configuration

Each of the 17 patterns supports custom settings. Configure them under the `patterns` key:

```json
{
  "defaultPattern": "waves",
  "patterns": {
    "waves": {
      "frequency": 0.1,
      "amplitude": 3,
      "layers": 3
    },
    "starfield": {
      "starCount": 300,
      "speed": 50
    },
    "matrix": {
      "columnCount": 20,
      "digitSpeed": 100
    }
  }
}
```

### Pattern Configuration Reference

#### Wave

```json
{
  "frequency": 0.1, // Wave frequency (0.05-0.5)
  "amplitude": 3, // Wave height (1-5)
  "layers": 3, // Number of overlapping waves (1-5)
  "rippleDuration": 2000 // Ripple effect duration (ms)
}
```

#### Starfield

```json
{
  "starCount": 300, // Number of stars (100-500)
  "speed": 50, // Movement speed (10-100)
  "forceFieldRadius": 20 // Mouse interaction radius (5-50)
}
```

#### Matrix

```json
{
  "columnCount": 20, // Number of columns (10-40)
  "digitSpeed": 100, // Speed of digit fall (50-200)
  "characterDensity": 50 // Density of characters (20-100)
}
```

#### Rain

```json
{
  "dropCount": 100, // Number of drops (50-300)
  "windStrength": 0.3, // Wind effect (0-1)
  "gravity": 0.3 // Drop gravity (0.1-1)
}
```

#### Plasma

```json
{
  "complexity": 0.5, // Effect complexity (0.1-1)
  "speed": 0.3, // Animation speed (0.1-1)
  "scale": 8 // Pattern scale (4-16)
}
```

#### Particle

```json
{
  "particleCount": 200, // Number of particles (100-500)
  "spread": 0.5, // Emission spread (0-1)
  "gravity": 0.2 // Gravity effect (0-1)
}
```

#### Lightning

```json
{
  "thickness": 1, // Branch thickness (1-3)
  "intensity": 0.7, // Brightness (0.3-1)
  "forkChance": 0.3 // Branching probability (0.1-0.8)
}
```

#### Tunnel

```json
{
  "speed": 0.5, // Speed of movement (0.1-1)
  "depth": 20, // Tunnel depth (10-40)
  "pattern": "concentric" // Pattern type
}
```

#### Spiral

```json
{
  "speed": 0.3, // Rotation speed (0.1-1)
  "arms": 3, // Number of arms (1-8)
  "density": 0.5 // Point density (0.1-1)
}
```

#### Quicksilver

```json
{
  "particleCount": 150, // Number of particles (50-300)
  "cohesion": 0.8, // Particle cohesion (0-1)
  "maxSpeed": 2 // Maximum particle speed (1-5)
}
```

#### Fireflies (FirefliesPattern)

```json
{
  "fireflies": 50, // Number of fireflies (10-200)
  "speed": 0.5, // Movement speed (0.1-1)
  "glowRadius": 5 // Glow effect radius (2-10)
}
```

#### Life (Conway's Game of Life)

```json
{
  "speed": 500, // Update interval (ms) (100-2000)
  "density": 30 // Initial population (10-60)
}
```

#### Maze

```json
{
  "speed": 500, // Generation speed (100-2000)
  "cellSize": 2 // Cell size (1-5)
}
```

#### DNA

```json
{
  "speed": 0.3, // Animation speed (0.1-1)
  "helixSize": 10 // Helix radius (5-20)
}
```

#### Lava Lamp

```json
{
  "speed": 0.3, // Blob movement speed (0.1-1)
  "blobCount": 15, // Number of blobs (5-30)
  "viscosity": 0.8 // Viscosity effect (0.5-1)
}
```

#### Smoke

```json
{
  "speed": 0.4, // Animation speed (0.1-1)
  "density": 60, // Smoke density (20-100)
  "dispersion": 0.3 // Dispersion effect (0-1)
}
```

#### Snow

```json
{
  "snowflakes": 200, // Number of snowflakes (50-500)
  "speed": 0.3, // Fall speed (0.1-1)
  "windStrength": 0.2 // Wind effect (0-1)
}
```

---

## Favorites System

Save and load your favorite pattern + preset + theme combinations:

```json
{
  "favorites": {
    "1": {
      "pattern": "waves",
      "preset": 2,
      "theme": "fire",
      "note": "Nice fire theme variant",
      "savedAt": "2025-11-04T10:30:00Z"
    },
    "9": {
      "pattern": "matrix",
      "preset": 1,
      "theme": "matrix",
      "note": "Classic Matrix",
      "savedAt": "2025-11-04T11:00:00Z"
    }
  }
}
```

### Using Favorites

In the app:

- **Save current setup**: Press `cF#` (where # is 1-9)
- **Load favorite**: Press `cf#` (where # is 1-9)

Favorites persist stable pattern keys such as `waves` and `matrix`. Older
configuration files containing constructor names such as `WavePattern` remain
load-compatible. The `preset` field is written only after a preset has been
explicitly selected; omitting it preserves the pattern's config-derived
baseline.

Runtime-only slots (`photo`, `layered`, and `workspace`) are represented by
their stable keys too. Loading one requires starting Splash with the matching
runtime context first (`--photo`, `--photo --pattern`, or `watch --fixture`).

---

## Complete Example Config

See [../../examples/.splashrc.example](../../examples/.splashrc.example) for a fully commented example configuration file.

```bash
# Copy example to your config location
cp examples/.splashrc.example ~/.config/ascii-splash/.splashrc.json

# Edit to your preferences
nano ~/.config/ascii-splash/.splashrc.json
```

---

## CLI Arguments

Override any setting from the command line:

```bash
# Change pattern
splash --pattern matrix

# Change theme
splash --theme fire

# Change FPS
splash --fps 60

# Disable mouse
splash --no-mouse

# Combine multiple options
splash --pattern starfield --theme ocean --fps 30

# v0.4.0+: render any image (path is the only required arg)
splash --photo path/to/photo.jpg
splash --photo ~/Pictures/cat.png --theme matrix
```

---

## Photo Mode (v0.4.0+)

`--photo PATH` is the **only** way to load `PhotoPattern`. The pattern is opt-in: when the flag is omitted, no image-decoding code is loaded and `sharp` stays out of the require graph. This keeps the warm-start cost of the default pattern set unchanged.

### Why isn't there a `patterns.photo` config block?

By design. Every other `*PatternConfig` in `~/.splashrc` is JSON-serializable, but `PhotoPatternConfig` carries `source: string | Buffer | Uint8Array` — a runtime image reference that can't round-trip through JSON. Persisting an image path in `~/.splashrc` would also surprise users (their splash window would auto-open a photo on next run), so the flag stays explicit.

### Cycling through photo presets

18 presets ship in v0.4.0 across halfblock / braille / symbol modes (see [README → Photo Mode](../../README.md) for the table). Cycle them at runtime exactly like procedural pattern presets:

| Action                  | Keystroke     |
| ----------------------- | ------------- |
| Next preset             | `.`           |
| Previous preset         | `,`           |
| Jump to preset N (1–18) | `c01` … `c18` |
| Random preset           | `c*`          |
| Random pattern + preset | `c**`         |

Saving a photo preset to a favorites slot (`cF1` … `cF9`) records the stable
`photo` key, preset, and theme, but **not** the image path. Re-running with the
same favorite still requires `--photo`; layered and workspace favorites
similarly require their original CLI context.

### Phase 7 outlook

A future "share-code" mechanism (v0.4.0 Phase 7) will encode `{patternId, presetId, themeId, seed}` into a base32 string so that a single CLI invocation reproduces an exact scene. The image path is the one thing share codes can't capture, so `--photo` will remain a separate orthogonal flag.

---

## Resetting Configuration

To reset to defaults, delete the config file:

```bash
rm ~/.config/ascii-splash/.splashrc.json
```

Then restart the app to use built-in defaults.

---

## Troubleshooting

### Config file not being read

- Check file location (should be `~/.config/ascii-splash/.splashrc.json`)
- Verify JSON syntax (no trailing commas, proper quotes)
- Check file permissions (should be readable)

### Invalid pattern name

Pattern names are case-sensitive. Check the valid list:

- `wave`, `starfield`, `matrix`, `rain`, `plasma`, `particle`
- `spiral`, `tunnel`, `lightning`, `fireflies`, `quicksilver`
- `life`, `maze`, `dna`, `lavaLamp`, `smoke`, `snow`

### Settings not taking effect

1. CLI arguments override everything
2. Make sure JSON is valid (no syntax errors)
3. Restart the app for config file changes

Use `--pattern` in CLI to override config file temporarily:

```bash
splash --pattern wave  # Ignore config file default
```

---

**Last Updated**: May 9, 2026 (added v0.4.0 `--photo` flag and rationale for no `patterns.photo` config block)
