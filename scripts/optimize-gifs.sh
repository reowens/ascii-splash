#!/bin/bash
set -e

# Optimize GIF files with gifsicle
# Reads from recordings/gifs/, writes to recordings/optimized/

GIF_DIR="recordings/gifs"
OPT_DIR="recordings/optimized"

echo "⚡ Optimizing GIF files"
echo "======================"
echo ""

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Check if gif directory exists
if [ ! -d "$GIF_DIR" ]; then
  echo "❌ $GIF_DIR not found. Run './scripts/convert-gifs.sh' first."
  exit 1
fi

# Create output directory
mkdir -p "$OPT_DIR"

# Count gif files
gif_count=$(find "$GIF_DIR" -name "*.gif" | wc -l | tr -d ' ')
if [ "$gif_count" -eq 0 ]; then
  echo "❌ No .gif files found in $GIF_DIR"
  exit 1
fi

echo "Found $gif_count GIFs to optimize"
echo ""

total_original=0
total_optimized=0

# Optimize each GIF
for gif in "$GIF_DIR"/*.gif; do
  if [ ! -f "$gif" ]; then
    continue
  fi
  
  name=$(basename "$gif")
  output="$OPT_DIR/$name"
  
  echo "⚡ Optimizing: $name"
  
  gifsicle \
    --optimize=3 \
    --lossy=80 \
    --colors 256 \
    "$gif" \
    -o "$output"
  
  # Get file sizes (in bytes for accurate calculation)
  original=$(stat -f%z "$gif")
  optimized=$(stat -f%z "$output")
  
  # Calculate reduction percentage
  reduction=$(echo "scale=1; 100 - ($optimized * 100 / $original)" | bc)
  
  # Human-readable sizes
  original_h=$(du -h "$gif" | cut -f1)
  optimized_h=$(du -h "$output" | cut -f1)
  
  echo "   ✓ $original_h → $optimized_h (${reduction}% reduction)"
  echo ""
  
  # Track totals
  total_original=$((total_original + original))
  total_optimized=$((total_optimized + optimized))
done

# Calculate overall statistics
total_reduction=$(echo "scale=1; 100 - ($total_optimized * 100 / $total_original)" | bc)
total_original_mb=$(echo "scale=2; $total_original / 1048576" | bc)
total_optimized_mb=$(echo "scale=2; $total_optimized / 1048576" | bc)

echo "✅ All optimizations complete!"
echo ""
echo "📊 Summary:"
echo "   Original:  ${total_original_mb}MB"
echo "   Optimized: ${total_optimized_mb}MB"
echo "   Reduction: ${total_reduction}%"
echo ""

# Check if within target size
if (( $(echo "$total_optimized_mb < 2.5" | bc -l) )); then
  echo "✅ Total size under 2.5MB target"
else
  echo "⚠️  Total size exceeds 2.5MB target"
fi

echo ""
echo "Next steps:"
echo "  1. Review optimized GIFs: open recordings/optimized/"
echo "  2. Copy to media: mkdir -p media/demos && cp recordings/optimized/*.gif media/demos/"
