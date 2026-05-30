# 07 — Before-and-After Security Comparison

> **Note:** "Before" reflects **current** system behavior (confirmed via code review and expected dynamic results). "After" reflects **planned** behavior post-patch phase ([06-patch-implementation-process.md](06-patch-implementation-process.md)). Live "after" curl output will be added when patches are implemented.

## 7.1 Endpoint comparison table

| Endpoint | Before (current) | After (planned) |
|----------|------------------|-----------------|
| `GET /proxy/image?url=` | 200, no auth, fetches any URL | 401 without JWT; 403 for non-allowlisted or private IPs |
| `POST /payments/fulfill-subscription` | 200 + tier upgrade with JWT only | 403 unless Stripe payment verified |
| `POST /payments/create-intent` | 201 without auth | 401 without auth |
| `GET :5003/reddit/scaled?tier=paid` | 200 without Nest JWT | 401 without internal API key; tier from header |
| `POST :5004/scrape` | 200 without auth | 401 without internal API key |
| `POST /raw-data/reddit` | 401 without JWT | 401 without JWT (unchanged) |
| MongoDB `:5006` | Open on LAN | Not published; requires auth |
| JWT secret unset | Falls back to `development-secret` | Process exits with configuration error |

## 7.2 Test command comparison

### VULN-01 — Open proxy

**Before:**
```bash
curl -i "http://localhost:5002/proxy/image?url=https://example.com/favicon.ico"
# Expected: HTTP 200, image/stream body, no Authorization header
```

**After (planned):**
```bash
curl -i "http://localhost:5002/proxy/image?url=https://example.com/favicon.ico"
# Expected: HTTP 401 Unauthorized

curl -i -H "Authorization: Bearer $JWT" \
  "http://localhost:5002/proxy/image?url=http://169.254.169.254/"
# Expected: HTTP 403 Forbidden
```

### VULN-02 — Payment escalation

**Before:**
```bash
curl -X POST http://localhost:5002/payments/fulfill-subscription \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"planName":"Premium Plan"}'
# Expected: {"success":true,"newTier":"premium"}
```

**After (planned):**
```bash
# Same request without completed Stripe payment
# Expected: HTTP 403 {"message":"Payment not verified"}

# Tier upgrade only via webhook after payment_intent.succeeded
```

### VULN-04 — Gateway direct access

**Before:**
```bash
curl "http://localhost:5003/reddit/scaled/search?subreddit=test&limit=1&tier=paid"
# Expected: HTTP 200 with post data
```

**After (planned):**
```bash
curl "http://localhost:5003/reddit/scaled/search?subreddit=test&limit=1&tier=paid"
# Expected: HTTP 401 (missing X-Internal-Api-Key)

# Or connection refused if port not published in production compose
```

## 7.3 Security posture summary

| Dimension | Before | After (planned) |
|-----------|--------|-----------------|
| Authentication coverage | Partial (Nest only) | End-to-end including internal hops |
| Authorization | Tier bypass possible | Tier bound to verified payment + server context |
| Network exposure | DB + internal APIs on host | Segmented Docker network |
| SSRF surface | Multiple unvalidated URL fetchers | Allowlist + IP block |
| Session security | localStorage JWT | httpOnly cookies or hardened CSP |
| Config hygiene | Weak defaults | Fail-fast on insecure config |

## 7.4 Metrics (target after patch phase)

| Metric | Before | Target after |
|--------|--------|--------------|
| Critical findings | 1 (VULN-02) | 0 |
| High findings | 4 | 0–1 (residual SSRF risk) |
| Unauthenticated admin/scrape paths | 3+ services | 0 |
| Published DB ports | 3 | 0 (production profile) |

## 7.5 Evidence update procedure

After implementing patches:

1. `docker compose up -d`
2. `./analysis/scripts/run-all.sh`
3. Replace `analysis/evidence/VULN-*.txt` with new output
4. Add `analysis/evidence/AFTER-*.txt` files
5. Update this document's tables with actual HTTP status codes
