# 05 — Risk Analysis and Impact Assessment

## 5.1 Risk rating methodology

Each finding is rated using:

- **Severity** — Technical impact if exploited (Critical / High / Medium / Low / Informational)
- **Likelihood** — Ease of exploitation in default Docker deployment (High / Medium / Low)
- **Business impact** — Effect on confidentiality, integrity, availability, and revenue

CVSS v3.1 base scores are approximate (qualitative) for academic reporting.

## 5.2 Risk matrix

| ID | Severity | Likelihood | CVSS (approx) | Business impact |
|----|----------|------------|---------------|-----------------|
| VULN-01 | High | High | 7.5 | SSRF to internal services; reputational harm |
| VULN-02 | **Critical** | High | 8.1 | Revenue loss; unfair premium access |
| VULN-03 | Medium | Medium | 5.3 | Stripe API abuse; operational cost |
| VULN-04 | High | High | 7.3 | API key burn; crawl abuse; data leakage |
| VULN-05 | High | High | 7.1 | Tier monetization bypass |
| VULN-06 | High | Medium | 7.0 | Full database compromise on shared LAN |
| VULN-07 | Medium | Medium | 6.5 | Account impersonation if secret weak |
| VULN-08 | Medium | Low–Med | 5.4 | Account takeover chained with XSS |
| VULN-09 | Medium | Low | 5.0 | Data integrity / outage in prod deploy |
| VULN-10 | Low | Medium | 4.3 | DoS via brute force / resource exhaustion |
| VULN-11 | Medium | Medium | 6.0 | SSRF via authenticated crawl |
| VULN-12 | Info | — | 0.0 | Documentation confusion only |

## 5.3 Impact by security pillar

### Confidentiality

| Threat | Impact |
|--------|--------|
| VULN-01, VULN-11 | Access to internal HTTP services, metadata |
| VULN-06 | Direct Mongo/Postgres read — user emails, scraped content |
| VULN-04 | Exfiltration via crawl of internal URLs |

### Integrity

| Threat | Impact |
|--------|--------|
| VULN-02, VULN-05 | False premium tier in database/JWT |
| VULN-06 | Arbitrary document/row modification |
| VULN-09 | Schema drift corrupting production data |

### Availability

| Threat | Impact |
|--------|--------|
| VULN-04, VULN-10 | Crawl/LLM exhaustion; rate-limit absence |
| VULN-03 | Stripe rate limits / account flags |

## 5.4 Stakeholder impact

| Stakeholder | Primary risks |
|-------------|---------------|
| **End users** | Account takeover (VULN-08+XSS), data exposure |
| **Project team** | API quota exhaustion, cloud bills |
| **University demo** | Live exploit of payment bypass undermines trust |
| **Supervisors** | Misconfiguration suggests immature secure SDLC |

## 5.5 Prioritized remediation order

1. **VULN-02** — Payment verification (business critical)
2. **VULN-01, VULN-11** — SSRF / proxy hardening
3. **VULN-04, VULN-05, VULN-06** — Network segmentation + internal API auth
4. **VULN-03, VULN-07** — Auth on payments; JWT secret enforcement
5. **VULN-08, VULN-09, VULN-10** — Session storage, migrations, throttling

Details in [06-patch-implementation-process.md](06-patch-implementation-process.md).

## 5.6 Residual risk (post-planned patches)

After implementing recommendations in document 06, residual risks include:

- Zero-day in dependencies (NestJS, FastAPI, Colly)
- Social engineering of admin accounts
- Third-party API key leakage via logs

Ongoing dependency scanning (`npm audit`, `pip audit`, `govulncheck`) recommended.
