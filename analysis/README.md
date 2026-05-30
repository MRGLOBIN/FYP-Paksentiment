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

- [evidence/](evidence/) — curl logs and screenshots
- [scripts/](scripts/) — reproducible test scripts

## Quick start (reproduce tests)

```bash
# From repository root
docker compose up -d   # or use start_servers.sh for local dev

chmod +x analysis/scripts/*.sh
./analysis/scripts/run-all.sh
```

Default URLs (Docker): frontend `:5001`, API `:5002`, gateway `:5003`, Colly `:5004`.

## Ethics statement

All testing was performed **only** against the student-owned PakSentiment deployment (local or Docker). No unauthorized testing of third-party production systems was conducted. SSRF probes used minimal, non-destructive requests. Secrets in evidence files are redacted before version control.

## Assessment phase

This report documents **findings and planned patches**. Application code changes are deferred to a follow-up implementation phase (see [06-patch-implementation-process.md](06-patch-implementation-process.md)).

## Team

- **Project:** PakSentiment / DataInsight FYP
- **Institution:** AIR University, Department of Creative Technologies
