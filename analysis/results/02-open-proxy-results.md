# Test Results — 02 Open Proxy / SSRF (VULN-01)

**Script:** `analysis/scripts/02-test-open-proxy.sh`  
**Run date:** 2026-05-31T12:52:35Z  
**Raw log:** [VULN-01-open-proxy.txt](../evidence/VULN-01-open-proxy.txt)  
**Vulnerability ID:** VULN-01  
**Status:** **CONFIRMED LIVE**

## Target

```
GET http://localhost:3000/proxy/image?url=<target>
```

No `Authorization` header was sent in any test.

---

## Test 1 — Public image (control)

**URL:** `https://www.google.com/favicon.ico`

| Field | Value |
|-------|-------|
| HTTP status | **200 OK** |
| Content-Type | `image/x-icon` |
| Auth required | **No** |

Server fetched and streamed the image to the client.

---

## Test 2 — Cloud metadata SSRF probe

**URL:** `http://169.254.169.254/latest/meta-data/`

| Field | Value |
|-------|-------|
| HTTP status | **500 Internal Server Error** |
| Auth required | **No** |

The server **attempted** a server-side HTTP request to the metadata endpoint (request was made; target unreachable on local Mac). On cloud-hosted deployments this could expose instance metadata.

---

## Test 3 — Localhost probe

**URL:** `http://127.0.0.1:5007/`

| Field | Value |
|-------|-------|
| HTTP status | **500 Internal Server Error** |
| Auth required | **No** |

Confirms server-side fetch toward internal loopback addresses is attempted.

---

## Test 4 — Non-image HTML

**URL:** `https://example.com/`

| Field | Value |
|-------|-------|
| HTTP status | **200 OK** |
| Content-Type | `text/html; charset=utf-8` |
| Auth required | **No** |

Proxy returns arbitrary HTML content, not restricted to images.

---

## Summary

| Probe | Status | SSRF risk |
|-------|--------|-----------|
| Public favicon | 200 | Open proxy confirmed |
| AWS metadata | 500 | Server-side fetch attempted |
| localhost:5007 | 500 | Internal target attempted |
| example.com HTML | 200 | Not image-restricted |

## Verdict

**VULN-01 CONFIRMED** — Unauthenticated open HTTP proxy on NestJS. OWASP A10 / CWE-918.

## Recommended fix

See [06-patch-implementation-process.md](../06-patch-implementation-process.md): `@UseGuards(AuthGuard)`, host allowlist, block RFC1918/link-local IPs.
