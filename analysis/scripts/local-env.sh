# Local development port defaults (non-Docker)
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
export NEST_LOCAL_URL="${NEST_LOCAL_URL:-http://localhost:3000}"
export NEST_API_URL="${NEST_API_URL:-http://localhost:5002}"
export GATEWAY_LOCAL_URL="${GATEWAY_LOCAL_URL:-http://localhost:8000}"
export GATEWAY_URL="${GATEWAY_URL:-http://localhost:5003}"
export COLLY_LOCAL_URL="${COLLY_LOCAL_URL:-http://localhost:8081}"
export COLLY_URL="${COLLY_URL:-http://localhost:5004}"

pick_nest_api() {
  for base in "$NEST_LOCAL_URL" "$NEST_API_URL"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$base/" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^(200|404|401)$ ]]; then
      echo "$base"
      return 0
    fi
  done
  echo "$NEST_LOCAL_URL"
}

pick_gateway() {
  for base in "$GATEWAY_LOCAL_URL" "$GATEWAY_URL"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$base/" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^(200|404|405)$ ]]; then
      echo "$base"
      return 0
    fi
  done
  echo "$GATEWAY_LOCAL_URL"
}

pick_colly() {
  for base in "$COLLY_LOCAL_URL" "$COLLY_URL"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$base/health" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^(200|404)$ ]]; then
      echo "$base"
      return 0
    fi
  done
  echo "$COLLY_LOCAL_URL"
}

is_up() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null || true)
  [[ -n "$code" && "$code" != "000" ]]
}
