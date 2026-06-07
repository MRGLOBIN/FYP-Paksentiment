# Security Assessment Evidence

This folder holds reproducible test output and screenshots for the PakSentiment FYP security report.

## Naming convention

| Pattern | Content |
|---------|---------|
| `VULN-01-open-proxy.txt` | curl output for open proxy / SSRF tests |
| `VULN-02-payment-escalation.txt` | Payment tier escalation without Stripe |
| `VULN-04-gateway-direct.txt` | Unauthenticated gateway/sidecar access |
| `VULN-recon-ports-*.txt` | Port and health recon |
| `VULN-auth-boundaries.txt` | Protected route tests without JWT |

## Regenerating evidence

With Docker stack running (`docker compose up -d`):

```bash
chmod +x analysis/scripts/*.sh
./analysis/scripts/run-all.sh
```

## Screenshots (manual)

For viva presentation, capture:

1. Swagger UI at `http://localhost:5002/api`
2. Browser Network tab showing `fulfill-subscription` success without Stripe
3. Direct gateway request to `:5003/reddit/scaled?tier=paid`

Store as `VULN-XX-description.png` in this folder.

## Redaction policy

- JWTs and API keys must be redacted before commit
- Scripts auto-redact Bearer tokens in `03-test-payment-escalation.sh` output
