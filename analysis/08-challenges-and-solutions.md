# 08 — Challenges Faced and Solutions

## 8.1 Challenge: Multi-service attack surface

**Problem:** PakSentiment spans four runtimes (TypeScript, Python, Go, React) with different auth models. A vulnerability in one service (e.g. unauthenticated FastAPI) undermines NestJS JWT controls.

**Solution:** Mapped trust boundaries in [02-project-overview.md](02-project-overview.md) and prioritized **network segmentation + shared internal API key** rather than securing only the NestJS perimeter.

## 8.2 Challenge: Services offline during automated testing

**Problem:** Docker was not running during report generation; curl scripts returned HTTP `000` (connection refused).

**Solution:**

- Confirmed all critical findings via **static code review** ([evidence/STATIC-CODE-REVIEW-EVIDENCE.md](evidence/STATIC-CODE-REVIEW-EVIDENCE.md))
- Documented **expected** dynamic behavior in evidence `.txt` files
- Provided `run-all.sh` for supervisors to reproduce live at viva

**Lesson:** CI pipeline should start compose health checks before security scripts run.

## 8.3 Challenge: Payment flow complexity (Stripe)

**Problem:** Frontend uses Stripe Elements; backend had a separate `fulfill-subscription` shortcut decoupled from Stripe webhooks.

**Solution:** Recommended industry-standard **webhook-driven tier upgrade** and deprecation of client-triggered fulfill endpoint (see [06-patch-implementation-process.md](06-patch-implementation-process.md)).

## 8.4 Challenge: Legitimate image proxy vs SSRF

**Problem:** Smart search requires proxying Reddit preview images to avoid CORS/hotlink issues.

**Solution:** Planned **host allowlist** rather than removing proxy entirely — balances UX and security.

## 8.5 Challenge: Tier logic split across services

**Problem:** Nest resolves tier from JWT; gateway accepts `tier` query parameter independently.

**Solution:** Pass tier only via trusted internal header set by Nest after JWT validation; remove client-controlled query param on public gateway.

## 8.6 Challenge: Documentation inaccuracy

**Problem:** README mentions GraphQL and Passport.js, causing confusion during security review.

**Solution:** Logged as VULN-12; README update included in patch checklist.

## 8.7 Challenge: Scope vs time (report-only phase)

**Problem:** Assignment requires both assessment **and** patches; team deferred code changes to separate phase.

**Solution:** Delivered complete documentation, scripts, and detailed patch roadmap so implementation can proceed without redoing analysis.

## 8.8 Tools limitations

| Limitation | Mitigation |
|------------|------------|
| No OWASP ZAP report in repo | Documented how to run baseline scan in [03-testing-methodology-and-tools.md](03-testing-methodology-and-tools.md) |
| No XSS exploit found | Code review for `dangerouslySetInnerHTML`; noted JWT+localStorage chain |
| Twitter routes disabled | Out of scope for this assessment cycle |
