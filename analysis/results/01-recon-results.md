# Test Results — 01 Port Reconnaissance

**Script:** `analysis/scripts/01-recon-ports.sh`  
**Run date:** 2026-05-31T12:52:34Z  
**Raw log:** [VULN-recon-ports-2026-05-31T12:52:34Z.txt](../evidence/VULN-recon-ports-2026-05-31T12:52:34Z.txt)

## Results (local stack)

| Port | Service | URL | HTTP Status |
|------|---------|-----|-------------|
| 3001 | Frontend | `http://localhost:3001/` | **200** |
| 3000 | NestJS API | `http://localhost:3000/` | **200** |
| 3000 | Swagger | `http://localhost:3000/api` | **200** |
| 8000 | FastAPI | `http://localhost:8000/` | **200** |
| 8081 | Colly | `http://localhost:8081/health` | **200** |
| 5001–5004 | Docker | — | Not running |

## Verdict

Full local stack operational: frontend, NestJS (with PostgreSQL), gateway, and Colly all reachable.

## NestJS response headers (sample)

```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Credentials: true
```

**Note:** `X-Powered-By: Express` header disclosure (minor info leak, relates to VULN-10 missing hardening).
