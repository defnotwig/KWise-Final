# Repository Guidelines

## Project Structure & Module Organization
- `K-Wise/` React (CRA) frontend for admin and kiosk UX. Key areas: `src/core`, `src/components`, `src/pages`, `src/kiosk`, `src/admin`, `src/services`, `src/styles`, `src/tests`, `public/`.
- `KWise-Backend/` Node/Express API and AI services. Key areas: `server.js`, `routes/`, `services/`, `ai/`, `migrations/`, `scripts/`, `tests/`, `assets/`.
- Root utilities: `scripts/` for VM/PM2 automation plus `start-pm2.*`, `stop-pm2.*`, `restart-pm2.*`, `ecosystem.config.js`.

## Build, Test, and Development Commands
Frontend:
- `cd K-Wise && npm install` install dependencies.
- `npm start` run the CRA dev server (default :3000).
- `npm run build` produce a production build in `K-Wise/build`.
- `npm test` run Jest in watch mode.

Backend:
- `cd KWise-Backend && npm install` install dependencies.
- `npm run dev` start with nodemon and the Ollama check.
- `npm run dev:no-ollama` start without the Ollama check.
- `npm start` run the production server.
- `npm test` or `npm run test:watch` run Jest + Supertest.

Ops:
- `start-pm2.cmd`/`start-pm2.sh` launch the PM2 process group; `stop-pm2.*` and `restart-pm2.*` manage it.

## Coding Style & Naming Conventions
- Frontend files use 2-space indentation; backend files use 4-space indentation.
- Match local quote style: frontend mostly double quotes, backend mostly single quotes.
- Naming: React components/pages use PascalCase (`OrderSummary.js`), utilities use camelCase, CSS files use kebab-case (`admin-layout.css`).
- Frontend linting is CRA ESLint (`react-app`); backend has no enforced linter, so keep changes consistent with existing patterns.

## Testing Guidelines
- Frontend tests live in `K-Wise/src/tests` and `K-Wise/src/core/*.test.js` and follow `*.test.js` or `*.test.jsx`.
- Backend tests live in `KWise-Backend/tests` (including stress suites) and use Jest + Supertest.
- Add or adjust tests when behavior changes; keep manual scripts in `KWise-Backend/scripts` for targeted validation only.

## Configuration & Secrets
- Environment files live in `K-Wise/.env` and `KWise-Backend/.env`; use `K-Wise/.env.example`, `KWise-Backend/.env.example`, and `KWise-Backend/.env.ai.example` as templates.
- Do not commit secrets or local tokens; update examples when adding new required variables.
- PostgreSQL is expected for full backend functionality; AI features are optional unless Ollama is explicitly enabled.

## Commit & Pull Request Guidelines
- Recent history uses conventional prefixes (`feat:`, `chore:`, `docs:`) mixed with descriptive sentences. Prefer `type: short summary` for new commits.
- PRs should include a clear description, testing notes, linked issues when applicable, and screenshots for UI changes.
