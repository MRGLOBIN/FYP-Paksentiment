#!/usr/bin/env bash
# Auth boundary tests — protected vs public NestJS routes
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=local-env.sh
source "$SCRIPT_DIR/local-env.sh"
OUT_FILE="$OUT_DIR/VULN-auth-boundaries.txt"

mkdir -p "$OUT_DIR"

BASE=$(pick_nest_api)
NEST_UP=false
is_up "$BASE/" && NEST_UP=true

{
  echo "=== Auth Boundary Tests ==="
  echo "API base: $BASE"
  echo "NestJS reachable: $NEST_UP"
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""

  if [[ "$NEST_UP" != "true" ]]; then
    echo "SKIP: NestJS not running on $BASE (PostgreSQL required on :5432)."
    exit 0
  fi

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
