# 03 — Testing Methodology and Tools Used

## 3.1 Approach

We applied a **gray-box** methodology: full access to source code plus dynamic testing against a running deployment. Testing phases:

1. **Reconnaissance** — Map services, ports, and endpoints from `docker-compose.yml`, Swagger, and route files.
2. **Static analysis** — Review authentication guards, payment flow, proxy logic, and configuration defaults.
3. **Dynamic testing** — Execute scripted `curl` probes via `analysis/scripts/`.
4. **Risk rating** — Map findings to OWASP Top 10 (2021) and CWE identifiers.
5. **Mitigation design** — Document planned fixes (implementation deferred).

## 3.2 Authorized scope

| Target | URL (Docker) | Authorization |
|--------|--------------|---------------|
| Frontend | `http://localhost:5001` | Student-owned |
| NestJS API | `http://localhost:5002` | Student-owned |
| Swagger | `http://localhost:5002/api` | Student-owned |
| FastAPI gateway | `http://localhost:5003` | Student-owned |
| Colly sidecar | `http://localhost:5004` | Student-owned |
| Databases | `localhost:5005–5007` | Student-owned |

No testing was performed against production domains or third-party infrastructure beyond normal API usage through our gateway.

## 3.3 Tools used

| Tool | Purpose |
|------|---------|
| **Source code review** | IDE search, manual review of controllers, guards, compose files |
| **curl** | HTTP request replay, header/body inspection |
| **Bash scripts** | Reproducible tests in `analysis/scripts/` |
| **Swagger UI** | API surface documentation at `/api` |
| **Python 3** | JWT payload decode in payment test script |
| **OWASP ZAP** (recommended) | Baseline scan of frontend + API when stack is running |
| **nmap** (optional) | Port scan of Docker-published ports |
| **jwt.io / jq** | JWT structure inspection (redacted in reports) |

## 3.4 Test scripts

| Script | Vulnerability focus |
|--------|---------------------|
| `01-recon-ports.sh` | Service availability on ports 5001–5007 |
| `02-test-open-proxy.sh` | VULN-01 SSRF / open proxy |
| `03-test-payment-escalation.sh` | VULN-02, VULN-03 payment abuse |
| `04-test-gateway-direct.sh` | VULN-04, VULN-05 internal API access |
| `05-test-auth-boundaries.sh` | Auth on public vs protected routes |
| `run-all.sh` | Execute all scripts sequentially |

Run from repository root:

```bash
docker compose up -d
chmod +x analysis/scripts/*.sh
./analysis/scripts/run-all.sh
```

## 3.5 OWASP-aligned test categories

| Category | Tests performed |
|----------|-----------------|
| A01 Broken Access Control | Payment fulfill, gateway tier param, unauthenticated scrape |
| A02 Cryptographic Failures | JWT secret defaults, localStorage token storage |
| A03 Injection | TypeORM usage review; no classic SQLi in app layer |
| A04 Insecure Design | Internal APIs without consumer auth |
| A05 Security Misconfiguration | Docker ports, default passwords, `synchronize: true` |
| A07 Identification and Authentication Failures | Missing auth on proxy, create-intent |
| A10 SSRF | `/proxy/image`, scrapling/colly URL parameters |

## 3.6 Evidence collection

Outputs saved under `analysis/evidence/`:

- `VULN-*.txt` — script stdout
- `STATIC-CODE-REVIEW-EVIDENCE.md` — code excerpts when services offline
- Screenshots (manual): Swagger, Network tab for payment bypass — see [evidence/README.md](evidence/README.md)

**Note:** Latest live run (2026-05-31) used local ports. Gateway/Colly tests **confirmed** VULN-04/05/11. NestJS tests skipped — PostgreSQL not running on `:5432`. See [results/](../results/).

## 3.7 Limitations

- No load/fuzz testing performed
- XSS not exploited dynamically; reviewed via code patterns (`dangerouslySetInnerHTML` absent)
- OWASP ZAP baseline not included in committed artifacts (recommended for viva)
- Twitter routes disabled in gateway; not assessed

## 3.8 Next steps after stack is available

1. Re-run `./analysis/scripts/run-all.sh` and replace evidence `.txt` files with live HTTP responses.
2. Capture screenshots for [11-demonstration-guide.md](11-demonstration-guide.md).
3. Optional: run `zap-baseline.py -t http://localhost:5001` and archive HTML report in `evidence/zap-report/`.
