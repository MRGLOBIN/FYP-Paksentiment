#!/usr/bin/env bash
# Run all PakSentiment security assessment scripts
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
for s in 01-recon-ports.sh 02-test-open-proxy.sh 03-test-payment-escalation.sh 04-test-gateway-direct.sh 05-test-auth-boundaries.sh; do
  echo "========== $s =========="
  bash "$DIR/$s" || true
  echo ""
done
echo "All scripts finished. See analysis/evidence/"
