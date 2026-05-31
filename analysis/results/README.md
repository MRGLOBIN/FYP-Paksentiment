# Live Test Results Index

**Latest run:** 2026-05-31T12:52:34Z — full local stack including NestJS on `:3000`

| # | Report | Status |
|---|--------|--------|
| 00 | [Test run summary](00-test-run-summary.md) | All services up |
| 01 | [Port reconnaissance](01-recon-results.md) | Completed |
| 02 | [Open proxy / SSRF](02-open-proxy-results.md) | **Live confirmed** |
| 03 | [Payment escalation](03-payment-escalation-results.md) | **VULN-02 live confirmed** |
| 04 | [Gateway & Colly direct access](04-gateway-direct-results.md) | **Live confirmed** |
| 05 | [Auth boundaries](05-auth-boundaries-results.md) | **Live confirmed** |

## Regenerate

```bash
./analysis/scripts/run-all.sh
```

## Confirmed critical finding

Payment tier bypass without Stripe — see [03-payment-escalation-results.md](03-payment-escalation-results.md).
