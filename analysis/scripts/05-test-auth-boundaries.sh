#!/usr/bin/env bash
# Auth boundary tests — protected vs public NestJS routes
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
API_BASE="${NEST_API_URL:-http://localhost:5002}"
LOCAL_API="${NEST_LOCAL_URL:-http://localhost:3000}"
OUT_FILE="$OUT_DIR/VULN-auth-boundaries.txt"

mkdir -p "$OUT_DIR"

pick_api() {
  for base in "$API_BASE" "$LOCAL_API"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$base/" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^(200|404)$ ]]; then
      echo "$base"
      return 0
    fi
  done
  echo "$API_BASE"
}

BASE=$(pick_api)

{
  echo "=== Auth Boundary Tests ==="
  echo "API base: $BASE"
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""

  routes=(
    "GET|/|public root"
    "GET|/proxy/image?url=https://example.com/favicon.ico|open proxy"
    "POST|/raw-data/reddit|protected reddit"
    "GET|/activity/me|protected activity"
    "POST|/payments/create-intent|public payment intent"
  )

  for r in "${routes[@]}"; do
    IFS='|' read -r method path desc <<< "$r"
    echo "--- $desc: $method $path (no token) ---"
    if [[ "$method" == "GET" ]]; then
      curl -s -w "\nHTTP %{http_code}\n" --connect-timeout 8 "$BASE$path" 2>&1 | head -12
    else
      curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE$path" \
        -H "Content-Type: application/json" \
        -d '{}' 2>&1 | head -12
    fi
    echo ""
  done
} | tee "$OUT_FILE"

echo "Saved: $OUT_FILE"
