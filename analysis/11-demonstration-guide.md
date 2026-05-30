# 11 — Demonstration Guide (Viva / Presentation)

This guide supports the assignment deliverables:

- Functional overview of the original FYP  
- Demonstration of detected vulnerabilities  
- Live implementation of fixes/patches (planned — post hardening phase)  
- Final secure version demonstration  
- Explanation of security improvements  

**Duration:** ~15–20 minutes recommended.

---

## Part A — Functional overview (5 min)

### A.1 What to show

1. Open frontend: `http://localhost:5001` (Docker) or `http://localhost:3001` (local)
2. Register / login with email or Google OAuth
3. Navigate to **Analytics** — run Reddit or YouTube sentiment analysis
4. Show dashboard: charts, session history, tier badge (free vs premium)

### A.2 Talking points

- Multi-service architecture: frontend → NestJS → FastAPI/Colly → databases
- JWT protects main analytics API
- Tier controls Reddit RSS (free) vs JSON+proxy (paid)

### A.3 Architecture slide

Use diagram from [02-project-overview.md](02-project-overview.md) or project README.

---

## Part B — Demonstrate vulnerabilities (7 min)

**Prerequisite:** `docker compose up -d` and wait for health checks.

```bash
chmod +x analysis/scripts/*.sh
./analysis/scripts/run-all.sh
```

### B.1 VULN-02 — Payment bypass (Critical)

**Live demo:**

1. Login as a **free** user in the UI (note tier in profile)
2. Open terminal:

```bash
# Replace JWT from browser DevTools → Application → localStorage → auth-storage
export JWT="<paste_access_token>"
curl -X POST http://localhost:5002/payments/fulfill-subscription \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"planName":"Premium Plan"}'
```

3. **Expected:** `{"success":true,"newTier":"premium"}`
4. Refresh UI or re-login — user now has premium features **without paying**

**Screenshot:** Browser Network tab showing fulfill call without prior Stripe success.

**Explain:** Missing server-side payment verification — see [04-vulnerability-assessment-results.md#vuln-02](04-vulnerability-assessment-results.md).

### B.2 VULN-01 — Open proxy

```bash
curl -i "http://localhost:5002/proxy/image?url=https://example.com/favicon.ico"
# No Authorization header — still returns image/stream
```

**Explain:** Server-side fetch = SSRF risk; reference [proxy.controller.ts](../main-server/src/modules/raw-data/proxy.controller.ts).

### B.3 VULN-04 / VULN-05 — Gateway without JWT

```bash
curl "http://localhost:5003/reddit/scaled/search?subreddit=technology&limit=3&tier=paid"
```

**Expected:** JSON post data without ever passing Nest JWT.

**Explain:** Internal API should not be reachable with client-controlled `tier` parameter.

### B.4 VULN-06 — Exposed database (optional, caution)

Show `docker compose ps` — ports 5005–5007 published.

```bash
# Demonstrate awareness only — do not destroy data
mongosh "mongodb://localhost:5006/paksentiment" --eval "db.getCollectionNames()"
```

**Explain:** No auth on Mongo in default compose — LAN risk.

---

## Part C — Planned fixes (3 min)

Walk through [06-patch-implementation-process.md](06-patch-implementation-process.md):

| Vulnerability | Fix in one sentence |
|---------------|---------------------|
| VULN-02 | Stripe webhook verifies payment before tier update |
| VULN-01 | Auth + image host allowlist + block private IPs |
| VULN-04/05 | Internal API key; tier via trusted header only |
| VULN-06 | Don't publish DB ports; require passwords |

Show [07-before-after-comparison.md](07-before-after-comparison.md) table.

---

## Part D — Final secure version (post-patch phase)

*Complete this section after implementing hardening.*

### D.1 Re-run tests

```bash
./analysis/scripts/run-all.sh
```

### D.2 Expected changes

| Test | Before | After |
|------|--------|-------|
| fulfill-subscription without payment | 200 success | 403 |
| /proxy/image no JWT | 200 | 401 |
| gateway tier=paid direct | 200 | 401 |
| create-intent no JWT | 201 | 401 |

### D.3 Secure demo flow

1. Login → attempt fulfill → **blocked**
2. Complete Stripe test payment → webhook upgrades tier → **success**
3. Proxy and gateway reject unauthenticated requests

---

## Part E — Security improvements Q&A prep

| Question | Answer pointer |
|----------|----------------|
| Why JWT in localStorage? | VULN-08; plan httpOnly cookies |
| SQL injection? | TypeORM parameterized; not found in app layer |
| XSS? | No dangerouslySetInnerHTML; JWT theft is main client risk |
| How was testing authorized? | [01-introduction-and-objectives.md](01-introduction-and-objectives.md) ethics |
| What tools? | [03-testing-methodology-and-tools.md](03-testing-methodology-and-tools.md) |

---

## Checklist before presentation

- [ ] Docker stack running (`docker compose ps`)
- [ ] Test user account created
- [ ] Scripts executable and tested
- [ ] JWT redacted on slides/screenshots
- [ ] Stripe test keys configured (for post-patch payment demo)
- [ ] Screenshots saved to `analysis/evidence/*.png` (manual)

---

## Evidence files for slides

| Slide topic | File |
|-------------|------|
| Findings table | [04-vulnerability-assessment-results.md](04-vulnerability-assessment-results.md) |
| Risk heatmap | [05-risk-analysis-and-impact.md](05-risk-analysis-and-impact.md) |
| Summary | [10-executive-summary.md](10-executive-summary.md) |
| Code proof | [evidence/STATIC-CODE-REVIEW-EVIDENCE.md](evidence/STATIC-CODE-REVIEW-EVIDENCE.md) |
