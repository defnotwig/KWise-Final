# Offline Deterministic Kiosk

## Summary
Convert K-Wise compatibility flows to an offline-first, deterministic local kiosk mode with no active AI, ML, Ollama, embedding, or runtime internet dependency.

## Motivation
Kiosk compatibility decisions must be fast, repeatable, and usable without network/model services. Current runtime paths still load AI routes, health checks, startup initialization, long AI-era frontend timeouts, and overlapping compatibility services.

## Scope
- Replace active compatibility scoring with a deterministic rule engine based on local product specifications.
- Preserve existing kiosk/admin visual layout and legacy frontend fields.
- Disable AI-only runtime endpoints with a consistent `AI_REMOVED` response.
- Remove Ollama checks from the default backend development startup path.
- Add regression tests for hard compatibility failures, warnings, manual checks, and offline endpoint behavior.

## Out Of Scope
- Visual redesigns, CSS/layout changes, or navigation restructuring.
- Runtime web scraping or external product lookup.
- Destructive cleanup of existing AI code, historical AI records, or unrelated dirty workspace files.
- New production dependencies.

## References
- BuildMyPC and PC Builder expose compatibility status, estimated wattage, component categories, compatibility filters, and user-visible caveats.
- Newegg and Pangoly patterns reinforce local checks around sockets, RAM type, form factor, power budget/headroom, connector requirements, storage interfaces, and physical clearance.
