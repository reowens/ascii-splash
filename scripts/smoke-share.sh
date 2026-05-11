#!/bin/bash
# smoke-share.sh — eyeball-test the v0.5.0 share-code path without a TTY.
#
# Runs `splash share` to produce a code, decodes the code, and prints a
# human-readable summary of what `splash play <code>` would reproduce.
# Use during pre-release review to confirm the encoder/decoder round-trip
# end-to-end and that the encoded state is sane (right pattern, right
# theme, plausible seed, non-zero hash only if your config has overrides).
#
# Usage:
#   ./scripts/smoke-share.sh                  # share + decode + summary
#   ./scripts/smoke-share.sh <CODE>           # decode an existing code only
#   ./scripts/smoke-share.sh -p starfield -t matrix  # forward args to splash share
#
# Exit codes: 0 ok, 1 share-failed, 2 decode-failed, 3 round-trip-mismatch.

set -euo pipefail

cd "$(dirname "$0")/.."

DIST_MAIN="dist/main.js"
DIST_SHARECODE="dist/utils/shareCode.js"

if [[ ! -f "$DIST_MAIN" || ! -f "$DIST_SHARECODE" ]]; then
  echo "Build missing — running npm run build..." >&2
  npm run build >/dev/null
fi

# If the first arg looks like a code (12 chars, no dashes after stripping,
# alphanumeric), skip `splash share` and just decode it.
CODE=""
if [[ $# -ge 1 ]]; then
  CANDIDATE="$(echo "$1" | tr -d '-' | tr '[:lower:]' '[:upper:]')"
  if [[ ${#CANDIDATE} -eq 12 && "$CANDIDATE" =~ ^[0-9A-Z]+$ ]]; then
    CODE="$1"
    shift
  fi
fi

if [[ -z "$CODE" ]]; then
  echo "→ splash share $* "
  if ! CODE="$(node "$DIST_MAIN" share "$@")"; then
    echo "✗ splash share failed" >&2
    exit 1
  fi
  echo "  → $CODE"
  echo
fi

# Decode + summarise via the same module the runtime uses.
node --input-type=module -e "
import { decodeShareCode, encodeShareCode, patternNameById, PROCEDURAL_PATTERN_IDS, SHARE_CODE_VERSION } from './$DIST_SHARECODE';
const code = '$CODE';
let state;
try { state = decodeShareCode(code); }
catch (e) {
  console.error('✗ decode failed:', e.message);
  process.exit(2);
}
const themes = ['ocean','matrix','starlight','fire','monochrome'];
const name = patternNameById(state.patternId) ?? '<unknown:' + state.patternId + '>';
const reencoded = encodeShareCode(state);
console.log('decoded:');
console.log('  code        ', code);
console.log('  patternId   ', state.patternId, '→', name);
console.log('  presetId    ', state.presetId);
console.log('  themeId     ', state.themeId, '→', themes[state.themeId] ?? '<unknown>');
console.log('  seed        ', state.seed, '(0x' + state.seed.toString(16).padStart(8,'0') + ')');
console.log('  configHash  0x' + state.configHash.toString(16).padStart(4,'0'), state.configHash === 0 ? '(defaults)' : '(non-default config overrides)');
console.log();
console.log('round-trip:');
console.log('  re-encoded  ', reencoded);
if (reencoded === code) {
  console.log('  ✓ byte-perfect');
} else {
  console.log('  ✗ mismatch — encoder/decoder are not inverses');
  process.exit(3);
}
console.log();
console.log('to replay:');
console.log('  splash play', code);
"
