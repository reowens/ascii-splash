#!/bin/bash
set -e

# Record pattern demonstrations for ascii-splash
# Creates .cast files in recordings/raw/

COLS=80
ROWS=24
DURATION=10

# Array of patterns: pattern_name:pattern_key
PATTERNS=(
  "starfield:1"
  "matrix:2"
  "waves:3"
  "plasma:5"
  "fireworks:f"
  "lightning:l"
  "dna:d"
)

echo "🎬 Recording ascii-splash pattern demonstrations"
echo "================================================"
echo "Terminal size: ${COLS}x${ROWS}"
echo "Duration: ${DURATION} seconds per pattern"
echo ""

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Check if build exists
if [ ! -f "dist/main.js" ]; then
  echo "❌ dist/main.js not found. Run 'npm run build' first."
  exit 1
fi

# Create output directory
mkdir -p recordings/raw

for pattern_spec in "${PATTERNS[@]}"; do
  IFS=':' read -r name key <<< "$pattern_spec"
  
  echo "📹 Recording: $name (press '$key' in app)"
  
  # Capitalize first letter (portable method)
  title_name="$(echo ${name:0:1} | tr '[:lower:]' '[:upper:]')${name:1}"
  
  # Use gtimeout (GNU coreutils) to auto-stop recording after DURATION seconds
  # The || true prevents the script from exiting if timeout kills the process
  gtimeout ${DURATION}s asciinema rec "recordings/raw/${name}.cast" \
    --cols $COLS \
    --rows $ROWS \
    --command "node dist/main.js --pattern $name" \
    --title "ascii-splash: ${title_name} Pattern" \
    --overwrite || true
  
  echo "   ✓ ${name}.cast saved"
  echo ""
  
  # Brief pause between recordings
  sleep 1
done

echo "✅ All recordings complete!"
echo ""
echo "Next steps:"
echo "  1. Review recordings: asciinema play recordings/raw/PATTERN.cast"
echo "  2. Convert to GIFs: ./scripts/convert-gifs.sh"
