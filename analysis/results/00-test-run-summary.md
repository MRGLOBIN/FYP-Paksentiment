# Live Test Run Summary

**Date:** 2026-05-31 (updated with NestJS live run)  
**Environment:** Local development (non-Docker)  
**Scripts:** `analysis/scripts/run-all.sh`

## Service availability

| Service | URL | Status |
|---------|-----|--------|
| Frontend | `http://localhost:3001` | **UP** (HTTP 200) |
| NestJS API | `http://localhost:3000` | **UP** (HTTP 200) |
| Swagger | `http://localhost:3000/api` | **UP** (HTTP 200) |
| FastAPI Gateway | `http://localhost:8000` | **UP** (HTTP 200) |
| Colly Sidecar | `http://localhost:8081` | **UP** (HTTP 200) |
| PostgreSQL | `localhost:5432` | **UP** (NestJS connected) |

## Test execution summary

| Script | Result | Vulnerabilities |
|--------|--------|-----------------|
| [01-recon-results.md](01-recon-results.md) | Completed | Recon |
| [02-open-proxy-results.md](02-open-proxy-results.md) | **CONFIRMED LIVE** | VULN-01 |
| [03-payment-escalation-results.md](03-payment-escalation-results.md) | **CONFIRMED LIVE** | VULN-02 (critical) |
| [04-gateway-direct-results.md](04-gateway-direct-results.md) | **CONFIRMED LIVE** | VULN-04, VULN-05, VULN-11 |
| [05-auth-boundaries-results.md](05-auth-boundaries-results.md) | **CONFIRMED LIVE** | Auth matrix |

## Critical live finding

**VULN-02 confirmed:** Authenticated user upgraded to `premium` via `POST /payments/fulfill-subscription` with **no Stripe payment**:

```json
{"success":true,"newTier":"premium"}
```

## Other live findings

- **VULN-01:** `/proxy/image` returns HTTP 200 without JWT; fetches arbitrary URLs server-side
- **VULN-04/05/11:** Gateway and Colly fully accessible without authentication
- **VULN-03:** `create-intent` is public but currently returns HTTP 400 due to DTO validation misconfiguration (no `@IsNumber()` on DTO fields)

## Raw evidence

- [../evidence/VULN-recon-ports-2026-05-31T12:52:34Z.txt](../evidence/VULN-recon-ports-2026-05-31T12:52:34Z.txt)
- [../evidence/VULN-01-open-proxy.txt](../evidence/VULN-01-open-proxy.txt)
- [../evidence/VULN-02-payment-escalation.txt](../evidence/VULN-02-payment-escalation.txt)
- [../evidence/VULN-04-gateway-direct.txt](../evidence/VULN-04-gateway-direct.txt)
- [../evidence/VULN-auth-boundaries.txt](../evidence/VULN-auth-boundaries.txt)
