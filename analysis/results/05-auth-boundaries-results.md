# Test Results — 05 Auth Boundaries

**Script:** `analysis/scripts/05-test-auth-boundaries.sh`  
**Run date:** 2026-05-31T12:52:47Z  
**Raw log:** [VULN-auth-boundaries.txt](../evidence/VULN-auth-boundaries.txt)  
**Status:** **CONFIRMED LIVE**

## Auth boundary matrix (no JWT sent)

| Route | Method | HTTP | Response | Expected auth |
|-------|--------|------|----------|---------------|
| `/` | GET | **200** | `Hello World!` | Public ✓ |
| `/proxy/image?url=...` | GET | **404** | `Image fetch failed` | **No guard** (VULN-01) |
| `/raw-data/reddit` | POST | **401** | `Unauthorized` | Protected ✓ |
| `/activity/me` | GET | **401** | `Unauthorized` | Protected ✓ |
| `/payments/create-intent` | POST | **400** | Validation error | **No guard** (VULN-03) |

## Analysis

### Working controls

- `AuthGuard` correctly blocks `/raw-data/*` and `/activity/me` without Bearer token (HTTP 401).

### Failures

1. **`/proxy/image`** — No authentication required. Returns 404 for this specific favicon URL (upstream fetch failed), but [02-open-proxy-results.md](02-open-proxy-results.md) confirms HTTP 200 for other URLs without JWT.

2. **`/payments/create-intent`** — No authentication required. Endpoint is reachable; returns 400 due to DTO validation, not auth denial.

3. **`/payments/fulfill-subscription`** — Requires JWT but not payment (see [03-payment-escalation-results.md](03-payment-escalation-results.md)).

## Comparison: NestJS vs internal services

| Layer | Auth on scrape/crawl |
|-------|---------------------|
| NestJS `/raw-data/*` | **401 without JWT** |
| FastAPI `:8000` | **200 without auth** ([04-gateway-direct-results.md](04-gateway-direct-results.md)) |
| Colly `:8081` | **200 without auth** |

Attackers can bypass NestJS JWT entirely by calling gateway/sidecar directly.

## Verdict

Partial auth boundary enforcement on NestJS; critical gaps on proxy and payment routes; internal services have no auth boundary.
