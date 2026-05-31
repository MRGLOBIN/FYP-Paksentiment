# Test Results — 04 Gateway & Colly Direct Access (VULN-04, VULN-05, VULN-11)

**Script:** `analysis/scripts/04-test-gateway-direct.sh`  
**Run date:** 2026-05-31T12:52:37Z  
**Raw log:** [VULN-04-gateway-direct.txt](../evidence/VULN-04-gateway-direct.txt)  
**Status:** **CONFIRMED LIVE**

## Target services

| Service | Base URL |
|---------|----------|
| FastAPI Gateway | `http://localhost:8000` |
| Colly Sidecar | `http://localhost:8081` |

No JWT or API key was sent in any request.

---

## Test 1 — FastAPI root (VULN-04)

```
GET http://localhost:8000/
→ HTTP 200 {"message":"PakSentiment Data Gateway is running."}
```

---

## Test 2 — Reddit paid tier bypass (VULN-05)

```
GET http://localhost:8000/reddit/scaled/search?subreddit=technology&query=ai&limit=2&tier=paid
→ HTTP 200
```

Response includes `"source":"reddit_paid"`, `"tier":"paid"`, and 2 posts with rich metadata — **without Nest JWT or subscription check**.

---

## Test 3 — Scrapling fetch (VULN-11)

```
GET http://localhost:8000/scrapling/fetch?url=https://example.com
→ HTTP 200 (page text returned)
```

---

## Test 4 — Colly health (VULN-04)

```
GET http://localhost:8081/health
→ HTTP 200 {"status":"running","redis":"ok","mongodb":"ok"}
```

---

## Test 5 — Colly scrape (VULN-04, VULN-11)

```
POST http://localhost:8081/scrape
{"url":"https://example.com","maxDepth":0}
→ HTTP 200 {"success":true,"result":{...},"elapsed":"4.84s"}
```

Headless browser scrape triggered without authentication.

---

## Summary

| Test | HTTP | Confirmed |
|------|------|-----------|
| Gateway root | 200 | Yes |
| Reddit `tier=paid` | 200 | Yes |
| Scrapling fetch | 200 | Yes |
| Colly health | 200 | Yes |
| Colly scrape | 200 | Yes |

## Verdict

**VULN-04, VULN-05, VULN-11 CONFIRMED** on live local stack.
