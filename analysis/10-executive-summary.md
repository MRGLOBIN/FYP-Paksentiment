# 10 — Executive Summary

## Project

**PakSentiment (DataInsight)** — AIR University FYP: multi-source social media sentiment analysis platform (Next.js, NestJS, FastAPI, Go, PostgreSQL, MongoDB, Redis).

## Assessment summary

| Metric | Value |
|--------|-------|
| Vulnerabilities identified | **12** |
| Critical | **1** |
| High | **4** |
| Medium | **5** |
| Informational | **1** |
| SQL injection (app layer) | Not observed |
| Phase | Report + planned patches (code fixes deferred) |

## Top three risks

1. **VULN-02 — Subscription escalation without payment**  
   Any logged-in user can upgrade to premium via `POST /payments/fulfill-subscription` without Stripe verification. **Business impact: complete monetization bypass.**

2. **VULN-04 / VULN-05 — Unauthenticated internal APIs**  
   FastAPI (`:5003`) and Colly (`:5004`) accept scrape and tiered Reddit requests without JWT or API keys. **Impact: API abuse, tier bypass, resource exhaustion.**

3. **VULN-01 — Open image proxy (SSRF)**  
   `GET /proxy/image` performs server-side requests to attacker-controlled URLs without authentication. **Impact: internal network probing, metadata access.**

## Security enhancements (planned)

| Area | Technique |
|------|-----------|
| Payments | Stripe webhook + server-side PaymentIntent verification |
| Internal services | `X-Internal-Api-Key`, Docker network isolation |
| SSRF | URL allowlist, private IP blocking, auth on proxy |
| Configuration | Strong secrets, no exposed DB ports, `synchronize: false` |
| HTTP | Helmet, rate limiting (`@nestjs/throttler`) |
| Session | httpOnly cookies or CSP (medium-term) |

## Results and outcomes

- Full **analysis/** documentation package with methodology, findings, risk matrix, patch roadmap, and demo guide
- **Reproducible scripts** in `analysis/scripts/` for viva demonstration
- **Evidence** in `analysis/evidence/` including static code confirmation
- Clear path to **before/after** comparison once patches land ([07-before-after-comparison.md](07-before-after-comparison.md))

## Demonstration highlights

1. Show normal user flow: register → login → Reddit sentiment analysis  
2. Demonstrate payment tier bypass (curl or Network tab)  
3. Show direct gateway access with `tier=paid`  
4. Walk through planned fixes in [06-patch-implementation-process.md](06-patch-implementation-process.md)  
5. (Post-patch) Re-run scripts showing 401/403 responses

## Recommendation for supervisors

Approve progression to **implementation phase** focusing on VULN-02, VULN-01, and VULN-04–06 before any public hosting of the platform.

## Document map

| Need | Read |
|------|------|
| Full findings | [04-vulnerability-assessment-results.md](04-vulnerability-assessment-results.md) |
| Risk ratings | [05-risk-analysis-and-impact.md](05-risk-analysis-and-impact.md) |
| How to demo | [11-demonstration-guide.md](11-demonstration-guide.md) |
| Index | [README.md](README.md) |
