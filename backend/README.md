# TX dashboard backend foundation — no accounts / no deployment

**Status: local scaffolding only.** No usernames, passwords, provider keys, databases, Cloudflare projects, DNS updates, or public backend endpoints have been created. The existing family dashboard and `main` are unchanged.

## Structure

- `backend/api.mjs`: shared Fetch API core, compatible with a future Cloudflare Worker and with Node's built-in Fetch.
- `backend/worker.mjs`: deployment-disabled future Cloudflare Worker entrypoint template. No provider adapters are included.
- `backend/local-server.mjs`: account-free Node 24+ local testing harness, bound to `127.0.0.1` only.
- `tests/backend-api.test.mjs`: safe-input, privacy, CORS, distributed rate-limit contract and local integration tests.
- PR #78: future Cloudflare Pages Family UAT and separate Production host plan; PR #72: public-preview sanitized artifact gate.

## API contract

| API | Method | Current response | Approved future purpose |
|---|---|---|---|
| `/api/v1/health` | GET | 200 | Health check; never returns secrets |
| `/api/v1/ready` | GET | 503 | 200 only when both licensed adapters and limiter are ready |
| `/api/v1/addresses/suggest` | POST | 503 after validation | `{ "query": "Plano Texas" }` → suggestions with address, lat and lon |
| `/api/v1/routes/estimate` | POST | 503 after validation | Origin/destination lat-lon → distance in km and minutes |

Existing school assignment continues to use official district Finders and vetted boundary snapshots. Geocoding alone cannot determine official school assignments.

## No-account local test

Node.js 24+, no npm dependencies:

```bash
node --test tests/backend-api.test.mjs
node backend/local-server.mjs
curl http://127.0.0.1:8787/api/v1/health
curl http://127.0.0.1:8787/api/v1/ready
```

The local harness never configures provider calls and refuses non-loopback binding. Provider endpoints correctly respond with 503.

## Security and privacy implemented in code

- Method/path allowlist; strict POST JSON; streaming 2 KiB body cap; address 3–160 Unicode characters; finite coordinates; unknown fields rejected.
- Exact-origin HTTPS CORS allowlist (default deny for cross-origin browser traffic). **CORS is not authorization** and cannot protect a public endpoint from direct HTTP clients.
- JSON no-store/no-sniff, strict content policy, no referrer, frame refusal; generic errors instead of echoing address, coordinates or upstream exception text.
- No user table, login, cookies, tokens, database migrations, request analytics, or address/coordinate logging.
- No external provider calls by default. Provider functionality requires all runtime approvals, a real Cloudflare distributed `API_RATE_LIMITER` binding, and separately implemented/reviewed `suggest`/`route` adapters.
- Only Cloudflare edge-set `CF-Connecting-IP` may be used as a distributed rate-limit key. A caller-supplied `X-Forwarded-For` does not control throttling.
- Provider errors become generic 502; response results are schema-checked and limited in size.

## Before any hosted integration

1. Establish private development repo and two Cloudflare Pages projects, with exact verified hostnames; do not add a real `functions/` deployment directory until reviewed.
2. Protect every Family UAT HTML and API hostname (including preview aliases) behind Cloudflare Access **before deploying family data**.
3. Approve provider terms and data license/redistribution rules, appropriate rate/billing caps, provider logs and user privacy wording.
4. Add real provider adapters in separate reviewed code with bounded timeouts, quota controls, and controlled caching. Do not log full addresses or precise home coordinates.
5. Explicitly provide `API_OWNER_APPROVED=confirmed`, `API_PROVIDER_TERMS_APPROVED=confirmed`, `API_DATA_LICENSES_CONFIRMED=confirmed`, a Cloudflare distributed `API_RATE_LIMITER` binding and exact `API_ALLOWED_ORIGINS` HTTPS origins.
6. Run UAT acceptance tests, unauthorized access denial tests, mobile/browser QA, rollback drill, and independent Production promotion approval.

**Current state: none of the above live hosting conditions is satisfied or represented as already complete.**

API input use of POST keeps addresses off app endpoint query strings, but upstream providers or infrastructure may still collect data. A later privacy notice and provider retention assessment are mandatory. There is deliberately no `wrangler.toml`, no hosting deployment token, and no CI deployment step.

## Isolation

Changes are only in `backend/`, one new `tests/backend-api.test.mjs`, and the audit CI workflow. They do not edit the dashboard UI, school files, commute calculations, production Pages settings, or GitHub repository visibility. This is stacked on Draft PR #78, which itself depends on #72.
