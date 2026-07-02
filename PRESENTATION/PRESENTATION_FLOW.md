# PRESENTATION FLOW — SLIDE-BY-SLIDE GUIDE
# K-Wise: AI-Assisted PC Builder Kiosk System

---

## SLIDE 1 — TITLE SLIDE
**Presentation Time: 0:00–0:30** (Section 1 — Context & Role)

**Title:** K-Wise: AI-Assisted PC Builder Kiosk System

**Subtitle:** Full-Stack Web Application | React · Node.js · PostgreSQL · Ollama AI

**Sub-subtitle:** Programmer of the Year | [Your Name] | [Date]

**Visual:** Screenshot of the kiosk home screen OR K-Wise logo

**Speaker notes:**
"Good morning/afternoon. My name is [Name], and I'm presenting K-Wise — an AI-assisted PC builder kiosk system. Let me walk you through the system, the code, and the engineering decisions behind it."

---

## SLIDE 2 — PROBLEM STATEMENT
**Presentation Time: 0:30–1:00** (Section 1)

**Title:** The Problem: Choosing Compatible PC Parts is Hard

**Key bullets:**
- Customers don't know which CPU works with which motherboard, RAM, or case
- Salespeople manually cross-reference spec sheets — slow and error-prone
- No awareness of what's actually in-stock today
- Budget constraints make compatibility even more complex
- Philippine PC market has unique pricing and availability constraints

**Visual:** A diagram showing a confused customer ↔ a long list of spec sheets

**Speaker notes:**
"Every PC shop faces this. A customer wants a ₱30,000 gaming PC. They don't know if an Intel CPU needs a specific motherboard, or if the GPU is too long for their case. Manually checking this is slow — and mistakes mean returns, refunds, and unhappy customers."

---

## SLIDE 3 — MY ROLE & CONTRIBUTION
**Presentation Time: 1:00–1:30** (Section 2 — System Overview)

**Title:** My Role & Technical Contributions

**Key bullets:**
- [VERIFY — fill in your actual contributions]
- Frontend: Kiosk UI flow, Admin dashboard, CustomizeAI wizard
- Backend: REST API, compatibility engine, AI integration
- Database: PostgreSQL schema design, 67+ migration files
- Security: JWT auth middleware, IP firewall, CORS hardening
- Performance: 3-tier caching, connection pooling, rate limiting
- AI/ML: Ollama integration, compatibility service, reference build generation

**Visual:** Your GitHub contribution graph OR a list of files you modified

**Speaker notes:**
"I was responsible for [VERIFY your specific modules]. Let me walk you through what I built and how it works."

---

## SLIDE 4 — SYSTEM ARCHITECTURE
**Presentation Time: 1:30–2:30** (Section 2)

**Title:** System Architecture

**Diagram (draw or describe):**
```
[Kiosk Browser]      [Admin Browser]
       ↓                    ↓
   React 18 Frontend (K-Wise/ — CRA, TailwindCSS)
       ↓ Axios HTTP + Socket.IO
   Node.js Express Backend (KWise-Backend/ — port 5000)
       ↓                    ↓              ↓
  PostgreSQL           Redis Cache      Ollama AI
  (KWiseDB)           (L2 cache)       (DeepSeek R1 1.5B)
  50+ tables          Optional         Local inference
```

**Key bullets:**
- React SPA with dual UI: Kiosk + Admin
- Express API with 47 route files, 18 controllers
- PostgreSQL: 50+ tables, 67+ migration files
- 3-tier cache: LRU Memory → Redis → Database
- Local AI: Ollama DeepSeek R1 (no cloud dependency)
- Real-time: Socket.IO + Server-Sent Events

**Speaker notes:**
"The architecture separates concerns clearly. The frontend handles all UI and user interaction. The backend handles all business logic and data access. The AI runs locally on the same machine — no API key, no cloud cost."

---

## SLIDE 5 — MAIN USER FLOWS
**Presentation Time: 2:30–3:00** (Section 3 — Live Demo)

**Title:** Two Main User Flows

**Flow A — Customer (Kiosk):**
```
Login-free → Choose: Parts/Build/Services
→ AI Assessment (6 steps)
→ Build recommendation (compatible, in-stock)
→ Swap components (real-time compatibility check)
→ Checkout → Queue ticket → Real-time status
```

**Flow B — Admin:**
```
Login (JWT) → Dashboard (stats, charts)
→ Manage: Orders / Stock / Users / Settings
→ View AI metrics → Configure rules
```

**Visual:** Side-by-side flow diagram

**Speaker notes:**
"Two completely different UIs, same backend. The kiosk is designed for touchscreen walk-up use — minimal text, clear buttons. The admin panel is information-dense for staff managing the business."

---

## SLIDE 6 — FRONTEND CODE STRUCTURE
**Presentation Time: 3:00–3:30** (Section 3)

**Title:** Frontend Architecture (K-Wise/src/)

**Key bullets:**
```
src/
├── api/          ← Unified API layer (kioskAPI, builderAPI, adminAPI)
├── contexts/     ← AuthContext (JWT), ThemeContext (dark/light)
├── kiosk/        ← 47 customer-facing components
├── pages/        ← Login, Dashboard, Orders, History
├── admin/        ← 12 admin panel dashboards
├── components/   ← 40+ reusable components
├── utils/        ← Network config, formatters, validators
└── styles/       ← TailwindCSS + 12 CSS files
```

**Visual:** VS Code file tree screenshot of K-Wise/src/

**Speaker notes:**
"The frontend is organized by responsibility. The api/ folder abstracts all HTTP calls. Contexts manage global state. Kiosk components handle the customer journey. Admin components handle shop management."

---

## SLIDE 7 — BACKEND CODE STRUCTURE
**Presentation Time: 3:30–4:30** (Section 3)

**Title:** Backend Architecture (KWise-Backend/)

**Key bullets:**
```
KWise-Backend/
├── server.js          ← Entry point (Express, CORS, rate limiting, Socket.IO)
├── routes/ (47)       ← URL → handler mapping
├── controllers/ (18)  ← HTTP request/response handling
├── services/ (60+)    ← Business logic (compatibility, AI, queue)
├── middleware/ (13)   ← Auth, IP firewall, logging, validation
├── ai/                ← Ollama service, prompts, training data
├── ml/                ← ML pattern scorer
├── config/            ← db.js (PostgreSQL pool), redis.js (cache)
├── migrations/        ← 67+ version-controlled schema migrations
└── scripts/ (80+)     ← Test, diagnostic, data scripts
```

**Visual:** VS Code file tree screenshot of KWise-Backend/

**Speaker notes:**
"Every layer has a single responsibility. Routes map URLs to controllers. Controllers delegate to services. Services are where the business logic lives — compatibility checking, AI calls, cache management."

---

## SLIDE 8 — DATABASE ARCHITECTURE
**Presentation Time: 4:30–5:30** (Section 3 → Section 4)

**Title:** Database Architecture (KWiseDB — PostgreSQL)

**Key bullets:**
- **133 tables** across 8 functional groups
- Group A: Products + Component specs (pc_parts, cpu_specs, gpu_specs, etc.)
- Group B: Users + Authentication
- Group C: Orders + Queue
- Group D: Compatibility Engine (**3,200 rules**, cache, 9 compatibility tables)
- Group E: AI Reference Builds (pc_customized_ai_reference_builds)
- Group F: AI/ML Intelligence (interaction history, learned patterns, embeddings)
- Group G: Audit Logs + Analytics
- Group H: System Config + IP Access

**Visual:** Paste psql output screenshot: `\dt` (shows 133 rows) + `SELECT COUNT(*) FROM compatibility_rules` → **3200**

**Speaker notes:**
"The database has 133 tables and 48 triggers. We use JSONB columns in pc_parts for flexible component specs — specifications, dimensions, compatible_sockets — while keeping relational integrity via foreign keys. 3,200 compatibility rules live in the database so they can be updated without code changes. The pc_parts table even has a GENERATED column — total_value is automatically computed as price × stock."

---

## SLIDE 9 — CORE FEATURE 1: KIOSK PC BUILDER
**Presentation Time: 5:30–6:30** (Section 4 — Code Walkthrough)

**Title:** Core Feature 1 — AI-Assisted Kiosk Build Wizard

**Key bullets:**
- 6-step assessment: use case, budget, performance, gaming preferences
- Matches to pre-generated AI reference builds (pc_customized_ai_reference_builds table)
- Maps component IDs to real in-stock products via API
- User can swap any component — compatibility re-checked instantly
- Order summary runs full 6-layer compatibility analysis (90s timeout)

**Data flow:**
```
User answers 6 questions
→ GET /api/pc-customized-ai-builds/all
→ Client-side profile matching
→ Fetch product details per component
→ Display complete build with prices
→ POST /api/compatibility/analyze on any swap
```

**Visual:** Screenshot of AI wizard + build result screen

**Speaker notes:**
"The wizard turns complex PC selection into 6 simple questions. Behind the scenes, we match the user profile to a pre-computed reference build, then pull real-time pricing and stock status."

---

## SLIDE 10 — CORE FEATURE 2: 6-LAYER COMPATIBILITY ENGINE
**Presentation Time: 6:30–7:30** (Section 4)

**Title:** Core Feature 2 — Hybrid Compatibility Engine

**Key bullets:**
- 3-tier approach: Deterministic Rules → AI Analysis → ML Pattern Matching

**Layer breakdown:**
| Layer | What It Checks |
|-------|---------------|
| 1. Power Budget | PSU wattage ≥ system draw + 20% margin |
| 2. Physical Clearance | GPU length, cooler height, PSU length |
| 3. Pairwise Match | Socket, memory type, PCIe slots |
| 4. Bottleneck Detection | CPU-GPU tier balance |
| 5. Rule Engine | 1,000+ compatibility rules in DB |
| 6. Real-World Data | Known issues, user reports, successful builds |

**Key stat:** 3-5x speedup via compatibility_cache (pre-computed results)

**Visual:** Code snippet from `advancedCompatibilityService.js` showing layer structure

**Speaker notes:**
"The compatibility engine is the technical heart of K-Wise. We run deterministic rules first for hard constraints — these are fast and always correct. Then AI analysis for nuanced cases. Then ML pattern matching from historical successful builds."

---

## SLIDE 11 — CORE FEATURE 3: ADMIN MANAGEMENT
**Presentation Time: 7:30–8:30** (Section 4)

**Title:** Core Feature 3 — Admin Management System

**Key bullets:**
- **Dashboard:** Real-time stats (orders, users, revenue, low stock) with Recharts
- **Order Queue:** Live queue display, mark serving/complete, dual station support
- **Inventory (Stock):** CRUD, batch price/category/stock updates, CSV export
- **Order History:** Filterable, searchable, exportable transaction history
- **Analytics:** Revenue trends, top products, category performance
- **AI Metrics:** Suggestion accuracy, response times, conversion rates
- **User Management:** CRUD users, role assignment (superadmin/admin/developer/staff)
- **IP Access Control:** Whitelist/blacklist management
- **Rule Builder:** Visual compatibility rule creation (superadmin)

**Visual:** Screenshot of admin dashboard with charts

**Speaker notes:**
"The admin panel is essentially a mini business management system. Everything a shop manager needs — from managing stock to reviewing AI performance — is in one place."

---

## SLIDE 12 — SOURCE CODE WALKTHROUGH
**Presentation Time: 8:30–9:30** (Section 4)

**Title:** Route → Controller → Database: End-to-End Trace

**Example: POST /api/compatibility/analyze**

```
routes/compatibility.js
  └─ POST /analyze
     └─ validateBuild middleware (JSON Schema)
     └─ compatibilityController.analyze(req, res)
        └─ compatibilityService.analyze(build)
           ├─ Check compatibility_cache (cache key = MD5(build))
           ├─ compatibilityRules.validate(build)     ← 23 hard rules
           ├─ ollamaService.analyze(build, prompt)   ← Ollama AI
           ├─ MLCompatibilityScorer.score(build)     ← ML patterns
           └─ INSERT INTO compatibility_cache (result, ttl)
        └─ res.json({ compatible, score, issues, suggestions })
```

**Visual:** Open VS Code, trace exactly this path

**Speaker notes:**
"Here's a concrete example. A POST request to analyze a build goes through JSON schema validation, then the controller delegates to the service, which tries the cache, runs deterministic rules, calls Ollama, and runs ML scoring — all in one async chain."

---

## SLIDE 13 — TECHNICAL DECISIONS
**Presentation Time: 9:30–10:30** (Section 4)

**Title:** Why These Technologies?

**Key bullets:**
| Choice | Why |
|--------|-----|
| React 18 | Component reuse between kiosk and admin; fast SPA updates |
| TailwindCSS | Utility-first; kiosk-friendly large tap targets quickly |
| Node.js + Express | JSON-native; async I/O handles concurrent kiosk sessions |
| PostgreSQL | ACID compliance; JSONB for flexible specs; complex joins |
| Redis (optional) | L2 cache for compatibility results (3-5x speedup) |
| JWT (HS256) | Stateless auth; algorithm enforcement prevents attacks |
| bcrypt | Industry-standard password hashing |
| Ollama (local) | No cloud cost; no latency; no data privacy concerns |
| Socket.IO | Real-time queue updates; fallback to SSE |
| Prometheus | Production metrics without external APM cost |

**Speaker notes:**
"Every technology choice was deliberate. Ollama for local AI means zero operating cost per query. JSONB columns avoid 8 separate spec tables while keeping data queryable. Socket.IO gives the queue display sub-second updates."

---

## SLIDE 14 — CODE QUALITY & MAINTAINABILITY
**Time: 13:00–13:30**

**Title:** Code Quality & Maintainability

**Key bullets:**
- Controller-Service-Model separation (single responsibility)
- 47 route files — each feature is isolated
- 67+ database migrations — schema changes version-controlled
- 80+ test scripts (unit + integration + stress tests)
- Jest + Supertest for API testing
- Winston structured logging throughout
- Prometheus metrics for production observability
- Health endpoints: `/api/health/ready`, `/api/health/live`, `/api/health/detailed`
- Centralized error handler in `middleware/errorHandler.js`
- Audit logging on all state-changing operations
- Rate limiting per feature type (kiosk: 5,000/min, global: 1,000/15min)

**Visual:** Show `scripts/` folder list — 80+ test/diagnostic files

**Speaker notes:**
"The codebase is structured for maintainability. Any developer can add a new API endpoint by creating a route file and controller — without touching existing code. Schema changes go through migrations. Every request is logged and metricked."

---

## SLIDE 15 — INNOVATION & IMPACT
**Time: 13:30–14:00**

**Title:** Innovation & Real-World Impact

**Key bullets:**
**What's innovative:**
- Hybrid compatibility engine (rules + AI + ML) — not just lookup tables
- Local AI inference (Ollama DeepSeek R1) — no cloud dependency
- AI reference builds with compatibility, performance, and value scores
- ML pattern learning from actual successful purchases
- Semantic embeddings for component similarity search (384-dim vectors)
- A/B testing framework for AI prompt templates

**Real-world impact:**
- Reduces PC selection time from 20+ minutes to under 2 minutes
- Eliminates compatibility errors that cause returns and refunds
- Enables shop owners to see inventory analytics without manual counting
- Queue system replaces paper tickets

**Visual:** Before/after scenario: Manual process vs K-Wise

---

## SLIDE 16 — UI/UX CONTRIBUTION
**Presentation Time: 12:00–13:00** (Section 6 — UI/UX)

**Title:** UI/UX Design Decisions

**Key bullets:**
- **Kiosk-first design:** Large tap targets, minimal text, clear CTAs
- **Compatibility feedback:** Color-coded badges (green/orange/red) + modal explanations
- **3-card carousel:** Makes transaction type selection visual and fast
- **Admin dashboard:** Stats cards → charts → activity table (information hierarchy)
- **Dark mode:** CSS variable injection via ThemeContext for admin usability
- **Real-time queue display:** Large queue number, auto-updating status
- **Order queue:** Most urgent info first (pending orders with wait time)

**Visual:** Side-by-side: kiosk screen + admin dashboard screenshot

---

## SLIDE 17 — COLLABORATION & PROFESSIONAL PRACTICE
**Presentation Time: 13:00–14:00** (Section 7 — Collaboration)

**Title:** Collaboration & Professional Practice

**Key bullets:**
- Structured Git commits with semantic prefixes (feat:, fix:, docs:, chore:)
- Security-focused commits: JWT hardening, CORS fixes, SQL injection prevention
- COLLABORATOR_SETUP.md for onboarding new contributors
- README.md with full project guidelines (55K+ chars of documentation)
- AI_API_DOCUMENTATION.md for the AI/compatibility API
- AGENTS.md for module ownership
- Test scripts for every major feature
- Health check endpoints for production readiness

**Visual:** Git log in terminal showing semantic commits

**Speaker notes:**
"Professional practice shows in the commit history — every change is described, scoped, and categorized. Security fixes were separated from feature commits so they're easy to audit."

---

## SLIDE 18 — CLOSING
**Presentation Time: 14:00–14:30** (Section 8 — Closing)

**Title:** Summary

**Key bullets:**
- Full-stack system: React + Node.js + PostgreSQL + Ollama AI
- 50+ database tables, 1,000+ compatibility rules
- 6-layer hybrid compatibility engine
- Local AI inference — no cloud dependency
- Production-grade: caching, auth, real-time, metrics, testing
- Designed for real Philippine PC shops

**Closing line:**
"K-Wise demonstrates that AI-assisted tools don't need to be cloud-dependent or prohibitively expensive. With thoughtful engineering — local AI, aggressive caching, and a deterministic rule engine as fallback — we built a system that's fast, reliable, and genuinely useful for customers and shop owners alike. Thank you."

**Visual:** Final screenshot of kiosk + admin side by side

---

## MASTER TIMELINE (aligned with PRESENTATION_SCRIPT)

| Slide | Topic | Start | End | Duration | Script Section |
|-------|-------|-------|-----|----------|---|
| 1 | Title | 0:00 | 0:30 | 0:30 | 1 — Context |
| 2 | Problem | 0:30 | 1:00 | 0:30 | 1 — Context |
| 3 | My Role | 1:00 | 1:30 | 0:30 | 2 — Overview |
| 4 | Architecture | 1:30 | 2:30 | 1:00 | 2 — Overview |
| 5 | User Flows | 2:30 | 3:00 | 0:30 | 3 — Live Demo |
| 6 | Frontend Code | 3:00 | 3:30 | 0:30 | 3 — Live Demo |
| 7 | Backend Code | 3:30 | 4:30 | 1:00 | 3 — Live Demo |
| 8 | Database | 4:30 | 5:30 | 1:00 | 3→4 Demo→Code |
| 9 | Feature 1: Kiosk | 5:30 | 6:30 | 1:00 | 4 — Code |
| 10 | Feature 2: Compatibility | 6:30 | 7:30 | 1:00 | 4 — Code |
| 11 | Feature 3: Admin | 7:30 | 8:30 | 1:00 | 4 — Code |
| 12 | Code Trace | 8:30 | 9:30 | 1:00 | 4 — Code |
| 13 | Tech Decisions | 9:30 | 10:30 | 1:00 | 4 — Code |
| 14 | Code Quality | 10:30 | 11:00 | 0:30 | 5 — Innovation |
| 15 | Innovation | 11:00 | 12:00 | 1:00 | 5 — Innovation |
| 16 | UI/UX | 12:00 | 13:00 | 1:00 | 6 — UI/UX |
| 17 | Collaboration | 13:00 | 14:00 | 1:00 | 7 — Collaboration |
| 18 | Closing | 14:00 | 14:30 | 0:30 | 8 — Closing |
| **TOTAL** | | **0:00** | **14:30** | **14.5 min** | |
