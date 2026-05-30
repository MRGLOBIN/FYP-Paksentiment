# 01 — Introduction and Objectives

## 1.1 Introduction

This document is part of the **security, reliability, and robustness evaluation** of **PakSentiment** (codenamed DataInsight), a Final Year Project developed at **AIR University**, Department of Creative Technologies. PakSentiment is a multi-tier social media sentiment analysis platform comprising a Next.js frontend, NestJS API orchestrator, FastAPI data gateway, Go Colly sidecar, and PostgreSQL, MongoDB, and Redis data stores.

The evaluation follows **ethical and authorized** vulnerability assessment and penetration testing practices. All testing targets the student-owned deployment (local development or Docker Compose) and does not attack third-party production systems.

## 1.2 Objectives

| Objective | Description |
|-----------|-------------|
| **Identify vulnerabilities** | Detect common flaws: authentication weaknesses, SSRF, insecure APIs, misconfigurations, weak session handling, and related threats |
| **Assess risk** | Rate findings by severity, likelihood, and business impact |
| **Document evidence** | Provide reproducible steps, scripts, and logs in `analysis/evidence/` |
| **Recommend mitigations** | Define a patch roadmap for a follow-up implementation phase |
| **Support demonstration** | Enable viva presentation of vulnerabilities and planned secure design |

## 1.3 Scope

**In scope:**

- NestJS main server (`main-server/`)
- Next.js frontend (`frontend/`)
- FastAPI data gateway (`new PakSentiment-data-gateway/`)
- Go Colly sidecar (`colly-sidecar/`)
- Docker Compose deployment (`docker-compose.yml`)

**Out of scope (this phase):**

- Third-party APIs (Reddit, YouTube, Groq) beyond abuse-via-our-proxy scenarios
- Physical security and social engineering
- **Code patches** (documented only in [06-patch-implementation-process.md](06-patch-implementation-process.md))

## 1.4 Ethics and authorization

- Testing is limited to systems under the project team's control.
- SSRF tests use minimal probes; cloud metadata endpoints are tested only to demonstrate risk, not to exfiltrate data.
- JWTs and API keys are redacted in committed evidence.
- Findings are reported for academic improvement, not malicious exploitation.

## 1.5 Deliverables mapping

| Assignment requirement | Document |
|------------------------|----------|
| Introduction and objectives | This file |
| Project overview | [02-project-overview.md](02-project-overview.md) |
| Testing methodology | [03-testing-methodology-and-tools.md](03-testing-methodology-and-tools.md) |
| Vulnerability results | [04-vulnerability-assessment-results.md](04-vulnerability-assessment-results.md) |
| Risk analysis | [05-risk-analysis-and-impact.md](05-risk-analysis-and-impact.md) |
| Evidence | [evidence/](evidence/) |
| Patch process | [06-patch-implementation-process.md](06-patch-implementation-process.md) |
| Before/after comparison | [07-before-after-comparison.md](07-before-after-comparison.md) |
| Challenges | [08-challenges-and-solutions.md](08-challenges-and-solutions.md) |
| Conclusion | [09-conclusion-and-recommendations.md](09-conclusion-and-recommendations.md) |
| Summary | [10-executive-summary.md](10-executive-summary.md) |
| Demonstration | [11-demonstration-guide.md](11-demonstration-guide.md) |
