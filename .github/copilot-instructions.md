Got it ✅ — you want the **Copilot Instructions** rewritten into a **more detailed, professional, and senior-level version** but **without inline examples** (no code snippets, no JSON samples, no `.env` mockups). This way, it’s purely rules, policies, and structure.

Here’s the improved **super-detailed Copilot Instructions (no examples)**:

---

# 🛠️ GitHub Copilot Instructions for K-Wise Admin System

**Version:** 3.0
**Owner:** Gabriel Ludwig Rivera
**System:** K-Wise Admin + Kiosk System

---

## 🚀 General Guidelines

### Codebase Separation

* All backend code must be located in `KWise-Backend/`.
* All frontend code must be located in `K-Wise/`.
* Clear boundaries between backend, frontend, and shared assets must be maintained.

### Frameworks & Tech Stack

* Backend must use Node.js with Express.
* Database must be PostgreSQL, connecting exclusively to `KWiseDB`.
* Frontend must use React with modern patterns (functional components, hooks, context).
* Package manager must be `npm`.
* Real-time features must use WebSockets or Server-Sent Events.

### No Static Data

* Static JSON files, hardcoded mock arrays, or temporary fixtures must never be used in production.
* All data must always originate from PostgreSQL queries.

### Environment Variables

* All sensitive credentials, tokens, or keys must be stored in `.env`.
* `.env` must always be excluded from version control.
* Environment variables must be loaded at application startup.
* The system must validate the presence of all required environment variables before initializing.

### File Duplication

* Multiple versions of files with suffixes such as `-final`, `-working`, `-enhanced`, or `-test` must not exist.
* Existing duplicates must be merged into one canonical version with a clean filename.
* After merging, all import paths across the project must be updated.

### Priority Order

1. Security: authentication, authorization, input validation, sanitization.
2. Single Source of Truth: only one canonical file per feature or module.
3. Database-Driven: PostgreSQL must always be the authoritative source.
4. Clean Architecture: strict separation of controllers, routes, models, and utilities.
5. Error Handling: user-friendly messages, comprehensive logging, and graceful recovery.

---

## ⚡ Server Configuration

### Backend Entry Point

* Only `KWise-Backend/server.js` must be used as the backend entry point.
* The backend must always run on port `5000`.
* The frontend development server must always run on port `3000`.

### Middleware

* Cross-origin resource sharing must be configured to allow only trusted origins.
* JSON and URL-encoded request bodies must be parsed automatically.
* Security middleware must be included to harden HTTP headers.
* Logging middleware must capture and record requests with contextual details.
* Centralized error-handling middleware must be implemented.
* Authentication middleware must handle JWT verification.
* Role-based access control middleware must enforce permissions.
* Rate-limiting middleware must mitigate brute-force attempts.
* Improve performance and latency with caching middleware where applicable.
* Input validation middleware must ensure all incoming data is sanitized and validated.

---

## 🌐 API Rules

### Endpoint Conventions

* All endpoints must begin with `/api`.
* RESTful design conventions must be followed.
* Resources must be named using plural nouns.
* Nested resources must follow logical hierarchy.

### API Versioning

* Versioning must be applied when breaking changes are introduced.
* Deprecation strategies must be in place for old versions.

### API Responses

* All responses must include a success indicator, data payload, message, and timestamp.
* Raw database errors must never be exposed.
* Responses must never return HTML content.
* Sensitive information such as passwords or tokens must never be included.

### Pagination, Filtering, and Sorting

* Large datasets must support pagination with limit and offset.
* Filtering and sorting must be supported using query parameters.
* Response metadata must include total counts for paginated resources.

### Error Handling

* Responses must use consistent structures for errors.
* Validation errors must identify problematic fields.
* Internal errors must not expose stack traces or implementation details.

---

## 📂 Project Structure

### Backend (`KWise-Backend/`)

* Root must include `server.js`, configuration files, and migrations.
* Subdirectories must include:

  * `config/` for database and app configuration.
  * `controllers/` for business logic.
  * `models/` for database queries.
  * `routes/` for API route definitions.
  * `middleware/` for authentication, RBAC, security, and error handling.
  * `utils/` for helpers, logging, and reusable services.
  * `sql/` for schema definitions and migration scripts.

### Frontend (`K-Wise/`)

* Root must include React project structure.
* Subdirectories must include:

  * `api/` for centralized API functions.
  * `components/` for reusable UI.
  * `contexts/` for global React contexts.
  * `hooks/` for reusable hooks.
  * `pages/` for page-level components.
  * `styles/` for scoped CSS
  * `assets/` for static images, icons, and fonts.

---

## 🔑 Environment Variables

### Rules

* All sensitive configurations must use environment variables.
* Startup validation must confirm required variables are present.
* Missing variables must trigger immediate failure with clear logs.
* All variables must be documented in `README.md`.

---

## 🛠️ Database Rules

### Database Configuration

* All queries must connect to `KWiseDB`.
* Connection pooling must be used.
* Database credentials must come from environment variables.

### Schema Requirements

* Primary tables: `users`, `pc_parts`, `orders`, `audit_logs`.
* Status columns must exist for filtering active/inactive records.
* Audit logging must capture user ID, role, action, description, IP address, and timestamps.

### Query Rules

* Parameterized queries must always be used.
* Queries must filter inactive records where applicable.
* Queries must use null-safe aggregation functions.
* Column names must remain consistent and descriptive.
* Indexes must be applied to performance-critical columns.

---

## 🔒 Authentication & Security

* JWT must be used for authentication.
* Tokens must be signed using secure secrets.
* Token expiration must be enforced.
* RBAC must be implemented with distinct roles (`superadmin`, `admin`, `developer`).
* Passwords must always be hashed using strong algorithms.
* Input must always be validated and sanitized.
* CORS must only allow trusted origins.
* Sensitive data must never be logged.

---

## AI Integration
* Ollama AI must be integrated as an optional enhancement 
* Ollama service must be installed and running for AI features to work at ALL times.
* Make sure AI integration follows best practices.
* Make sure AI integration is secure and does not expose sensitive data.
* Make sure AI integration is efficient and does not introduce significant latency.
* Make sure AI integration is maintainable and well-documented.
* AI features must be toggleable via environment variables.
* AI must be working only if the Ollama service is running.
* AI requests must have timeouts and fallbacks.
* AI responses must be sanitized and validated before use.
* AI errors must be logged without exposing details to users.


## 🖥️ Frontend Standards

* All API requests must pass through a single API module.
* Authentication state must be managed using React Context.
* Protected routes must prevent unauthorized access.
* Functional components with hooks must be used.
* CSS must be scoped to avoid collisions.
* Shared UI components must be created for consistency.

---

## 📏 Coding Standards

* `const` and `let` must replace `var`.
* `async/await` must replace chained promises.
* Code must follow ESLint and Prettier formatting.
* Template literals must be preferred over string concatenation.
* Functions and APIs must be documented with comments.

---

## 🧪 Testing & QA

* Manual API testing must use Postman or Insomnia.
* Automated testing must include unit, integration, and end-to-end levels.
* Backend tests must validate authentication, orders, and audit logging.
* Frontend tests must cover login flows, navigation, and API integration.
* Database migrations must be tested in staging before production.
* Error scenarios must be simulated and validated.

---

## 🚢 Deployment

* React build must be served from the backend in production.
* SSL/TLS must be enforced.
* Database pooling must be enabled.
* Process management must use PM2, Docker, or similar.
* Monitoring must include CPU, memory, and database connections.
* CI/CD pipelines must automate build, test, and deployment steps.

---

## 🔧 Common Issues & Fixes

* Presence tracking issues require last activity updates in middleware.
* Server errors require validation of database queries and request payloads.
* File uploads must ensure storage paths and DB fields align.
* Static placeholders must always be replaced with dynamic queries.
* Settings issues (dark mode, translations) must be fully integrated with backend logic.

---

## ⚡ Non-Negotiable Rules

1. Only `server.js` may act as backend entry point.
2. Duplicate files must be merged and removed.
3. All connections must use PostgreSQL `KWiseDB`.
4. Static data must never be used.
5. Security must take priority over consistency, which takes priority over performance, which takes priority over features.
6. Codebase must be scanned before creating new files.
7. Admin features must always operate in real-time.

---

✅ **Final Reminder:**

* `server.js` is the single entry point.
* `KWiseDB` is the single source of truth.
* The Admin system must always be real-time, secure, and database-driven.
* Workflow: **scan → enhance → test → document**.
* Docum

