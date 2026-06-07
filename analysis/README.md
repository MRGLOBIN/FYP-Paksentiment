# PakSentiment — FYP Security Assessment

Ethical vulnerability assessment and penetration testing documentation for **PakSentiment (DataInsight)**, a Final Year Project at AIR University.

## Document index

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Introduction and objectives](01-introduction-and-objectives.md) | Scope, goals, ethics |
| 02 | [Project overview](02-project-overview.md) | Architecture and functional overview |
| 03 | [Testing methodology and tools](03-testing-methodology-and-tools.md) | How testing was performed |
| 04 | [Vulnerability assessment results](04-vulnerability-assessment-results.md) | Findings VULN-01 … VULN-12 |
| 05 | [Risk analysis and impact](05-risk-analysis-and-impact.md) | Severity and business impact |
| 06 | [Patch implementation process](06-patch-implementation-process.md) | Planned mitigations (future phase) |
| 07 | [Before-and-after comparison](07-before-after-comparison.md) | Expected post-patch behavior |
| 08 | [Challenges and solutions](08-challenges-and-solutions.md) | Assessment difficulties |
| 09 | [Conclusion and recommendations](09-conclusion-and-recommendations.md) | Final conclusions |
| 10 | [Executive summary](10-executive-summary.md) | One-page supervisor summary |
| 11 | [Demonstration guide](11-demonstration-guide.md) | Viva / demo script |

## Evidence and scripts

- [results/](results/) — **Live test result markdown reports** (latest local run)
- [evidence/](evidence/) — Raw curl logs and static code review
- [scripts/](scripts/) — Reproducible test scripts (`local-env.sh` targets ports 3000/3001/8000/8081)

## Quick start (reproduce tests)

```bash
# Local dev ports (default): frontend :3001, NestJS :3000, gateway :8000, Colly :8081
# NestJS requires PostgreSQL on :5432

chmod +x analysis/scripts/*.sh
./analysis/scripts/run-all.sh
```

See [results/00-test-run-summary.md](results/00-test-run-summary.md) for latest run output.

## Compile to DOCX

```bash
cd analysis
./build-docx.sh
```

Output: `analysis/docx/` (chapters) and `analysis/docx/results/` (live test reports).

## Ethics statement

All testing was performed **only** against the student-owned PakSentiment deployment (local or Docker). No unauthorized testing of third-party production systems was conducted. SSRF probes used minimal, non-destructive requests. Secrets in evidence files are redacted before version control.

## Assessment phase

This report documents **findings and planned patches**. Application code changes are deferred to a follow-up implementation phase (see [06-patch-implementation-process.md](06-patch-implementation-process.md)).

## Team

- **Project:** PakSentiment / DataInsight FYP
- **Institution:** AIR University, Department of Creative Technologies
