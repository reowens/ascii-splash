#!/bin/bash
set -e

# Convert asciinema .cast files to GIF format
# Reads from recordings/raw/, writes to recordings/gifs/

RAW_DIR="recordings/raw"
GIF_DIR="recordings/gifs"

echo "🎨 Converting asciinema recordings to GIF"
echo "=========================================="
echo ""

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Check if raw directory exists
if [ ! -d "$RAW_DIR" ]; then
  echo "❌ $RAW_DIR not found. Run './scripts/record-patterns.sh' first."
  exit 1
fi

# Create output directory
mkdir -p "$GIF_DIR"

# Count cast files
cast_count=$(find "$RAW_DIR" -name "*.cast" | wc -l | tr -d ' ')
if [ "$cast_count" -eq 0 ]; then
  echo "❌ No .cast files found in $RAW_DIR"
  exit 1
fi

echo "Found $cast_count recordings to convert"
echo ""

# Convert each .cast file
for cast in "$RAW_DIR"/*.cast; do
  if [ ! -f "$cast" ]; then
    continue
  fi
  
  name=$(basename "$cast" .cast)
  output="$GIF_DIR/${name}.gif"
  
  echo "🔄 Converting: $name"
  
  agg \
    --fps-cap 30 \
    --speed 1.0 \
    --font-size 14 \
    --idle-time-limit 2 \
    --last-frame-duration 1 \
    "$cast" \
    "$output"
  
  size=$(du -h "$output" | cut -f1)
  echo "   ✓ ${name}.gif created ($size)"
  echo ""
done

echo "✅ All conversions complete!"
echo ""
echo "Next steps:"
echo "  1. Review GIFs: open recordings/gifs/PATTERN.gif"
echo "  2. Optimize: ./scripts/optimize-gifs.sh"
