# Observability — Enredo.ai

**Purpose:** Lightweight observability primitives for staging/dev without heavy external dependencies.

---

## What is Logged

| Category | Fields | Format |
|----------|--------|--------|
| Request lifecycle | requestId, method, path, status, duration | `HTTP` logger |
| HTTP errors | requestId, status, error code, path | `HTTP` logger (warn level) |
| Unhandled exceptions | requestId, status 500, error name, path, message | `Exception` logger (error level) |
| Startup env validation | env issues (no secrets) | `Bootstrap` logger |

## What is NEVER Logged

- Authorization headers
- Cookies
- Passwords / passwordHash
- Refresh tokens
- Raw LLM prompts
- Raw LLM responses
- Generated narrative content
- Request bodies
- Stack traces (filtered to clients, logged as safe messages only)

---

## Request ID

Every request gets a unique `requestId`:

- Generated via `crypto.randomUUID()` if not present in `X-Request-Id` header
- Included in response as `X-Request-Id` header
- Included in all request/error logs
- Available to clients for correlation

---

## Health Check

`GET /api/health` returns:

```json
{
  "status": "ok",
  "service": "enredo-api",
  "environment": "staging",
  "version": "0.1.0",
  "timestamp": "...",
  "database": "ok"
}
```

---

## Global Exception Filter

- Preserves existing `HttpException` response shapes (status, error code, message)
- For unhandled exceptions, returns `{ statusCode: 500, message: "Internal server error", error: "INTERNAL_ERROR" }`
- Logs error name and safe message, never stack traces

---

## Future Observability Providers

| Provider | Purpose | Status |
|----------|---------|--------|
| Console logging (current) | Dev/staging | ✅ Active |
| Structured JSON logging | Production | Deferred |
| Cloud logging (CloudWatch, Logtail, etc.) | Production | Deferred |
| APM (Sentry, DataDog, etc.) | Error tracking | Deferred |
| Metrics dashboard | Usage monitoring | Deferred |

---

**Last Updated:** After Step 73
