# Static Code Review Evidence

**Assessment date:** 2026-05-30  
**Note:** Automated curl scripts returned HTTP `000` (connection refused) because the Docker stack was not running during the CI/sandbox run. Findings below are **confirmed via source code inspection** and are reproducible when `docker compose up -d` is active.

## VULN-01 — Open proxy (no AuthGuard)

**File:** `main-server/src/modules/raw-data/proxy.controller.ts`

```typescript
@Controller('proxy')
export class ProxyController {
  @Get('image')
  async proxyImage(@Query('url') targetUrl: string, ...) {
    new URL(targetUrl);  // Only validation
    const response = await axios.get(targetUrl, { responseType: 'stream', ... });
```

No `@UseGuards(AuthGuard)` on controller or method.

## VULN-02 — fulfill-subscription without payment proof

**File:** `main-server/src/modules/payments/payments.controller.ts`

```typescript
@Post('fulfill-subscription')
@UseGuards(AuthGuard)
async fulfillSubscription(@Request() req, @Body() body: { planName: string }) {
  const resolvedTier = tierMap[body.planName];
  await this.usersService.updateSubscriptionTier(userId, resolvedTier as any);
  return { success: true, newTier: resolvedTier };
}
```

No Stripe `PaymentIntent` status check or webhook verification.

## VULN-03 — create-intent public

Same file: `@Post('create-intent')` has no `@UseGuards(AuthGuard)`.

## VULN-04 — Gateway documents no auth

**File:** `new PakSentiment-data-gateway/main.py` (OpenAPI description)

> "Internal API keys used. No auth required for consumers."

## VULN-05 — Tier query parameter client-controlled

**File:** `new PakSentiment-data-gateway/routes/reddit_scaled.py`

```python
tier: str = Query("free", regex="^(free|paid)$", ...)
```

## VULN-07 — JWT development fallback

**File:** `main-server/src/modules/auth/auth.module.ts`

```typescript
secret: configService.get<string>('JWT_SECRET') ?? 'development-secret',
signOptions: { expiresIn: '1h' },
```

## VULN-08 — localStorage persistence

**File:** `frontend/src/store/useAuthStore.ts`

```typescript
storage: createJSONStorage(() => localStorage),
```

## VULN-09 — synchronize: true

**File:** `main-server/src/app.module.ts` lines 64, 104 — `synchronize: true` for Postgres and Mongo in non-test environments.

## VULN-06 — Docker exposed databases

**File:** `docker-compose.yml` — ports `5005:5432`, `5006:27017`, `5007:6379` with default credentials in `.env.docker.example`.
