#!/usr/bin/env bash
# PakSentiment security recon — health checks on default Docker/local ports
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OUT_FILE="$OUT_DIR/VULN-recon-ports-${TIMESTAMP}.txt"

mkdir -p "$OUT_DIR"

{
  echo "=== PakSentiment Port Recon ==="
  echo "Timestamp: $TIMESTAMP"
  echo ""

  endpoints=(
    "5001|Frontend|http://localhost:5001/"
    "5002|NestJS API|http://localhost:5002/"
    "5002|Swagger|http://localhost:5002/api"
    "5003|FastAPI Gateway|http://localhost:5003/"
    "5004|Colly Sidecar|http://localhost:5004/health"
    "3000|NestJS local|http://localhost:3000/"
    "8000|FastAPI local|http://localhost:8000/"
    "8081|Colly local|http://localhost:8081/health"
  )

  for entry in "${endpoints[@]}"; do
    IFS='|' read -r port name url <<< "$entry"
    echo "--- $name ($port) — $url ---"
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")
    echo "HTTP status: $code"
    if [[ "$code" != "000" ]]; then
      curl -s --connect-timeout 3 -I "$url" 2>/dev/null | head -5 || true
    fi
    echo ""
  done

  echo "=== Docker containers (if available) ==="
  docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || echo "(docker not running)"
} | tee "$OUT_FILE"

echo "Saved: $OUT_FILE"
