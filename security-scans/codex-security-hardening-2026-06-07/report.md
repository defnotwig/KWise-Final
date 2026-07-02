# K-Wise Codex Security Hardening Report

Generated: 2026-06-07
Scope: repository-wide K-Wise frontend, backend, kiosk routes, admin routes, database-facing services, dependency manifests, and live localhost smoke checks.

## External Control Baseline

- OWASP API Security Top 10 2023: BOLA, broken authentication, broken function-level authorization, unrestricted resource consumption, and sensitive business-flow abuse.
- OWASP CSRF Prevention Cheat Sheet: cookie-backed authentication must be paired with CSRF tokens on mutating authenticated requests.
- OWASP Logging Cheat Sheet: logs must avoid credentials, secrets, tokens, and full request bodies.
- Express production security guidance: secure headers, explicit CORS, secure cookies, rate limiting, and dependency hygiene.
- Compatibility kiosk baseline: deterministic hard-fail versus warning/manual-check behavior preserved for socket, BIOS, RAM, clearance, PSU, storage, and missing critical specs.

## Threat Model

K-Wise is a local offline kiosk plus admin system. The main attackers are:

- Walk-up kiosk users attempting unauthenticated admin access or business-flow abuse.
- Local network clients attempting route abuse, upload abuse, token spoofing, CSRF, or IP spoofing.
- Authenticated low-privilege users attempting broken function-level authorization against admin routes.
- Operators or malware reading logs, exports, local storage, or static files for secrets.
- Resource-abuse clients attempting slow kiosk/admin actions, excessive compatibility batches, or DB pool exhaustion.

Primary assets:

- Admin identities, roles, password hashes, reset tokens, 2FA secrets, sessions, SMTP/settings secrets, audit logs, orders, queue state, stock data, product specs, compatibility rules, and uploaded assets.

## Validated Findings And Fixes

### 1. Frontend Admin Authorization Trusted Local Storage

Severity: High
Root cause: frontend pages and shared auth wiring previously allowed stale or edited localStorage identity/token state to influence admin rendering and requests.
Attack path: edit localStorage currentUser/userRole/token, refresh an admin route, and rely on frontend-only hiding or Bearer headers before backend verification.
Fix:

- `AuthContext` now derives identity from `/api/auth/me` only.
- `ProtectedRoute`, admin layout/sidebar/navbar/profile/search/socket consumers use verified context.
- Legacy auth storage keys are cleared.
- Frontend Bearer headers are stripped before requests.

Validation:

- Frontend auth-pattern scan shows Authorization only in stripping/removal code.
- `npm test -- --watchAll=false`: 9 suites, 68 tests passed.
- Browser unauthenticated `/admin/settings` redirects to `/login`.

### 2. Credential Transport And CSRF Gaps

Severity: High
Root cause: mixed localStorage Bearer token transport and authenticated mutations without a consistent CSRF contract.
Attack path: steal token from localStorage or induce authenticated browser mutation without CSRF validation.
Fix:

- Login uses HttpOnly cookie auth and readable CSRF cookie.
- Mutating admin requests carry `X-CSRF-Token`.
- Backend Bearer fallback is restricted to test or explicit legacy opt-in.
- `/api/auth/me` returns a guest session for public kiosk probes instead of causing 401 noise.

Validation:

- Backend auth/security targeted Jest passed.
- Full backend Jest passed: 37 suites, 108 tests.
- Browser kiosk routes load without auth-probe errors.

### 3. Backend Route Exposure And RBAC Weakness

Severity: High
Root cause: several admin-like mutation/stat/export/cache endpoints were reachable because frontend hiding was stronger than backend route classification.
Attack path: call rule/cache/history/preferences/settings/metrics endpoints directly from a local client without UI navigation.
Fix:

- Protected mutating compatibility cache, price history, build history, preferences, stock stats, cache stats, and admin/reference/settings paths.
- Owner/admin checks added where user-owned records are involved.
- Public kiosk browse/order/compatibility reads remain intentionally anonymous.

Validation:

- Backend security targeted Jest passed.
- Backend full Jest passed.
- Browser admin smoke confirmed unauthenticated redirect.

### 4. Sensitive Response, Export, And Log Leakage

Severity: High
Root cause: broad response/log patterns could expose request bodies, settings, tokens, or secret fields.
Attack path: trigger admin/kiosk/upload/settings actions and inspect logs or JSON/CSV export data for secrets.
Fix:

- Added recursive response/log sanitizer.
- Masked settings and SMTP secrets.
- Removed full request-body/header logging from kiosk order and upload hot paths.
- User/auth DTOs strip password hashes, reset tokens, verification tokens, 2FA secrets, refresh tokens, session IDs, and secret settings.

Validation:

- Source scan no longer finds full request-body logging in routes/server/controllers/middleware, except documentation comments and safe body-key summaries.
- Backend full Jest passed.

### 5. Upload And Static Asset Hardening

Severity: High
Root cause: uploads needed strict content validation and static headers to prevent scriptable payloads or content sniffing.
Attack path: upload fake image/SVG/double-extension/traversal payload, then access through static hosting.
Fix:

- Magic-byte validation, random filenames, category allowlists, SVG rejection, size limits, failed-upload cleanup, and safe static headers.
- `/assets` and `/uploads` response headers include safe content handling.

Validation:

- `tests/images.upload.issue2.test.js` and `tests/security.hardening.test.js` passed.

### 6. Dynamic SQL Identifier Risk

Severity: Medium
Root cause: spec-table writes used dynamic identifiers that could become injection-prone if category/spec keys were user controlled.
Attack path: inject unexpected category/spec column values through admin product flows or spec sync.
Fix:

- Category-specific allowlisted spec columns.
- Server-owned maps for table names/sort/spec fields.
- Pagination/search limits capped.

Validation:

- Backend full Jest passed.
- Compatibility audit passed.

### 7. Resource Abuse And Kiosk Performance

Severity: Medium
Root cause: permissive local DB pool defaults, broad public rate limits, hot-path logging, and canceled requests reported as errors.
Attack path: repeat kiosk/admin actions or health/product refreshes to exhaust pool/logging/request slots and degrade sub-2s UX.
Fix:

- Normal DB pool defaults capped to kiosk-safe values; load-test pool only when `LOAD_TEST_MODE=true`.
- Kiosk rate limits tightened, health checks exempted from self-DoS.
- Hot-path logging reduced.
- Canceled health/product requests are silent.
- Deterministic compatibility batch and caches preserved.

Validation:

- Browser route smoke: kiosk routes and legacy AI redirects had no fresh console errors.
- Warm `/pc-parts` repeated runs: 993ms, 1672ms, 1130ms, 1459ms, 1222ms.
- Multi-route smoke: most routes around 1.3s to 1.9s, admin unauthenticated redirect around 1.5s.
- `npm run audit:compatibility`: 343ms, 312 files scanned, 133 tables, 3,200 enabled rules, `aiEnabled:false`.

## Verification Summary

- Backend targeted security/kiosk/upload tests: passed.
- Backend full Jest: 37 suites, 108 tests passed.
- Frontend full Jest: 9 suites, 68 tests passed.
- Frontend production build: passed with existing `CompareProducts.js` hook dependency warning only.
- Backend `npm audit --omit=dev`: 0 vulnerabilities.
- Frontend `npm audit --omit=dev`: 28 remaining CRA/react-scripts transitive advisories; force fix would install `react-scripts@0.0.0`, so it was not applied.
- Browser smoke: `/pc-parts`, `/pc-customized`, `/prebuilt-options`, `/pc-checkup`, `/pc-upgrade`, `/pc-cleaning-assessment`, `/customize-ai`, `/pc-customized-ai-assessment`, and `/admin/settings`.

## Residual Risks

- `KWise-Backend/.env` currently has `LOAD_TEST_MODE=true`, so local audit logs show a 200-connection pool. Code defaults are safe when `LOAD_TEST_MODE=false`.
- Frontend CRA toolchain advisories remain because the non-breaking audit path cannot clear them. Recommended next phase: migrate from CRA to Vite without UI/layout/class changes.
- Compatibility audit still reports legacy AI-named disabled/dead files and mixed legacy spec keys. The active runtime remains deterministic/offline, but cleanup can reduce future maintenance risk.
- Existing large SVG build deopt notes and `CompareProducts.js` hook warning remain unchanged.

## Recommended Next Phase

1. Set production/local kiosk `.env` to `LOAD_TEST_MODE=false`.
2. Add migration for audit/session/reset-token retention indexes if not already present in the live DB.
3. Migrate CRA to Vite in a separate no-UI-change phase to remove stale transitive advisories.
4. Continue dry-run-first compatibility spec normalization for legacy mixed keys.
