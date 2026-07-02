# Backend Refactor And Cleanup Plan

Generated: 2026-06-29

## Current Production Baseline

- Offline kiosk compatibility is deterministic at runtime. `compatibilityService` is the facade and `deterministicCompatibilityService` is the engine.
- Production DB defaults are bounded: `LOAD_TEST_MODE=false` and the normal pool is capped at 60 connections.
- Strict compatibility audit now scans the active backend runtime graph by default and reports zero active AI/Ollama/RAG runtime references.
- Production dependency audit is clean with npm overrides for vulnerable transitive packages.
- Current DB inventory is regenerated in `docs/db-scan.md`; it should be treated as the source for cleanup decisions until a newer inventory is generated.

## Refactor Phases

1. Stabilize active runtime modules.
   - Keep public routes and response shapes stable.
   - Keep disabled legacy route aliases mounted where older kiosk/admin clients may still call them.
   - Continue moving compatibility logic behind deterministic services instead of route-local logic.

2. Split oversized route files.
   - Extract compatibility route groups into focused routers for batch checks, pair/build analysis, rule/admin helpers, and slot checks.
   - Keep `/api/compatibility/batch`, `/api/compatibility/analyze`, `/api/compatibility/batch-analyze`, `/api/compatibility/advanced/full-build`, `/api/compatibility/matrix/quick-check`, `/api/compatibility/ram-slots`, and `/api/compatibility/storage-slots`.
   - Add contract tests before each extraction so the frontend receives identical payloads.

3. Archive backend cleanup candidates before deletion.
   - Use `npm run audit:cleanup` to regenerate the backend-only manifest.
   - Move only files with no active import path into `archive/legacy-YYYYMMDD/`.
   - Keep a manifest entry for each moved file: original path, archive path, import-graph evidence, and verification command.
   - Delete only in a later migration after at least one clean full stress pass.

4. Normalize compatibility specs and DB tables.
   - Run `npm run normalize:compatibility-specs` only after a database backup.
   - Keep legacy spec-key count at zero in `npm run audit:compatibility:strict`.
   - Classify tables from `docs/db-scan.md` as active transactional, compatibility/spec, audit/observability, identity/access, legacy AI/RAG/ML, backup/temp, or unknown.
   - Do not drop or rename tables until row counts, references, migration SQL, and rollback SQL are reviewed.

5. Move toward a domain backend structure.
   - Target modules: config, shared DB/logging, HTTP middleware, compatibility, kiosk, inventory, orders, queue, security, observability, and maintenance scripts.
   - Keep the current CommonJS entrypoint during the transition.
   - Move one route/service group at a time and run the focused compatibility tests plus strict audit after each move.

## Verification Gates

- `npm run test:compatibility`
- `npm run audit:compatibility:strict`
- `npm run audit:cleanup`
- `npm run stress:compatibility`
- `npm run stress:db`
- `npm run stress:security`
- `npm audit --omit=dev`
- `npm run stress:all` for the backend production gate.

## Acceptance Criteria

- No frontend source, UI copy, CSS, or component behavior changes.
- No active backend runtime imports of old AI/Ollama/RAG services.
- No high or critical production npm audit findings.
- Compatibility trap cases pass and batch p95 stays within the configured threshold.
- DB stress keeps production pool settings bounded and query p95 under threshold.
- Cleanup remains archive-first and non-destructive until a separate deletion migration is approved.
