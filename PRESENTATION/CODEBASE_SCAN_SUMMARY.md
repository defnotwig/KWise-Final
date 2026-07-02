# CODEBASE SCAN SUMMARY — K-Wise AI-Assisted PC Builder Kiosk System

> Scanned: 2026-05-12 | Repo: K-Wise Final 2 | Scanner: Senior Engineer Analysis

---

## 1. REPOSITORY ROOT STRUCTURE

```
K-Wise Final 2/
├── .claude/                    ← Claude Code configuration
├── .github/                    ← GitHub CI/CD (VERIFY MANUALLY if workflows exist)
├── CONTRIBUTIONS/              ← NOT FOUND / VERIFY MANUALLY
├── K-Wise/                     ← React Frontend (CRA)
├── KWise-Backend/              ← Node.js Express Backend
├── scripts/                    ← VM/PM2 automation utilities
├── node_modules/               ← Root launcher dependencies
├── AGENTS.md                   ← Module ownership & structure docs
├── COLLABORATOR_SETUP.md       ← Contributor onboarding guide
├── LAUNCHER_README.md          ← NOT FOUND / VERIFY MANUALLY
├── README.md                   ← Full project guidelines (55K+ chars)
├── SYSTEM_REVIEW_REPORT.md     ← NOT FOUND / VERIFY MANUALLY
├── VIDEO_SHOWCASE_SCRIPT.md    ← NOT FOUND / VERIFY MANUALLY
├── VIDEO_SHOWCASE_SCRIPT_REVISED.md ← NOT FOUND / VERIFY MANUALLY
├── launcher.js                 ← Windows dual-window launcher (port cleanup + start)
├── package.json                ← Root launcher package (v1.0.0, kwise-launcher.exe)
├── start-all.bat               ← Batch launcher script
├── setup-collaborator.bat      ← NOT FOUND / VERIFY MANUALLY
└── K-Wise Final 2.code-workspace ← VS Code workspace config
```

---

## 2. FOLDER SUMMARY

| Category | Folder | Notes |
|----------|--------|-------|
| **Frontend** | `K-Wise/` | React 18.2, CRA, TailwindCSS 4, Recharts |
| **Backend** | `KWise-Backend/` | Node.js 18+, Express 4.18.2, Socket.IO 4.8.1 |
| **Database Config** | `KWise-Backend/config/db.js` | PostgreSQL Pool (max 100 connections) |
| **Migrations** | `KWise-Backend/migrations/` + `KWise-Backend/sql/migrations/` | 67+ migration files |
| **AI/ML Modules** | `KWise-Backend/ai/` + `KWise-Backend/ml/` | Ollama DeepSeek R1 1.5B |
| **API Routes** | `KWise-Backend/routes/` | 47 route files |
| **Controllers** | `KWise-Backend/controllers/` | 18 controller files |
| **Services** | `KWise-Backend/services/` | 60+ service files |
| **Config** | `KWise-Backend/config/` | db.js, redis.js, config.js |
| **Scripts/Testing** | `KWise-Backend/scripts/` | 80+ scripts (test, migration, diagnostics) |
| **Monitoring** | `KWise-Backend/monitoring-reports/` | Performance reports |

---

## 3. FRONTEND ARCHITECTURE (K-Wise/)

### Tech Stack
- React 18.2.0
- React Router DOM 7.1.5
- Axios 1.11.0 (HTTP client with auto-retry)
- TailwindCSS 4.1.13
- Recharts 2.15.4 (analytics charts)
- Radix UI (accessible components)
- Font Awesome + React Icons + Lucide React
- Socket.IO Client (real-time queue/order updates)

### Entry Point
```
src/core/App.js (479 lines) — Main router
src/core/index.js            — React root render
```

### Routing Map
```
/                        → Landing / Home
/order                   → Order type selection (Assisted vs Self-Order)
/transaction             → Transaction type carousel (Parts / Build / Services)
/pc-parts                → Browse PC components by category
/pc-builder              → Guided step-by-step PC builder
/pcbuild-category        → Build path selection
/customize-ai            → AI build wizard (multi-step)
/pc-customized-ai-assessment → 6-step AI questionnaire
/pc-customized-ai-suggestions → AI build result display
/order-summary           → Cart + compatibility check + checkout
/ordersum-custom         → Order summary (custom build)
/payment-window          → Payment method selection
/queuing-display         → Queue ticket + real-time status
/pc-cleaning-assessment  → PC cleaning service flow
/pc-checkup              → Diagnostic checkup
/pc-upgrade              → Upgrade recommendation
/login                   → Admin login (JWT auth)
/reset-password          → Password reset flow
/admin/dashboard         → Admin overview + stats
/admin/stock             → Inventory management
/admin/order-queue       → Live order queue management
/admin/analytics         → Revenue and sales analytics
/admin/ai-metrics        → AI performance dashboard (superadmin)
/admin/ip-access-control → IP whitelist/blacklist (admin+)
/admin/rule-builder      → AI compatibility rule builder (superadmin)
/admin/auto-generate-orders → Test data generator (dev)
```

### Key Frontend Folders
```
K-Wise/src/
├── api/
│   ├── api.js           ← Unified API interface (kiosk + builder + admin modules)
│   ├── kioskAPI.js      ← 873 lines; all kiosk endpoints + compatibility calls
│   ├── builderAPI.js    ← Builder-specific endpoints (steps, filters, compatibility)
│   ├── adminAPI.js      ← Admin CRUD (orders, products, users, analytics)
│   └── aiService.js     ← AI-specific API calls (suggestions, builds)
├── contexts/
│   ├── AuthContext.js   ← JWT token mgmt, login/logout, currentUser, RBAC
│   ├── ThemeContext.js  ← Dark/Light mode via CSS variables
│   └── SearchContext-simple.js ← Admin global search state
├── kiosk/ (47 components)
│   ├── Order.js                 ← Entry: Assisted vs Self-Order
│   ├── Transac-components.js   ← 3-card carousel (Parts/Build/Services)
│   ├── PCBuildCategory.js      ← Build path fork
│   ├── PCCustomized.js         ← 6-layer compatibility validator
│   ├── OrderSummary.js         ← Cart + 90s compatibility check
│   ├── PaymentWindow.js        ← 4 payment methods
│   └── QueuingDisplay.js       ← Queue ticket + WebSocket status
├── components/
│   ├── CustomizeAI/
│   │   ├── CustomizeAI.jsx     ← AI wizard orchestrator
│   │   ├── BuildResult.jsx     ← Final build display
│   │   └── EditBuild.jsx       ← User-modifiable build
│   ├── CompatibilityNotes/     ← Compatibility warnings UI
│   ├── Layout/ Navbar/ Sidebar/ ← Admin layout shell
│   └── [40+ reusable components]
├── pages/
│   ├── Login/Login.js          ← Auth form + JWT storage
│   ├── Dashboard/Dashboard.js  ← Stats cards + charts + activity
│   └── Orders/
│       ├── Stock.js            ← Category inventory view
│       ├── OrderQueue.js       ← Live queue + admin actions
│       └── History.js          ← Filterable transaction history
├── admin/
│   ├── AIAnalyticsDashboard.js ← AI metrics charts
│   ├── AnalyticsDashboard.js   ← Revenue + sales analytics
│   ├── AutoGenerateOrders.js   ← Test data generator
│   └── [9+ admin panels]
├── utils/
│   ├── networkConfig.js        ← Dynamic LAN IP/port resolution
│   ├── compatibilityValidator.js ← Client-side pre-validation
│   └── [20+ helpers]
└── styles/ (12 CSS files)     ← Theme, dark mode, kiosk responsive, admin
```

### State Management Pattern
- **AuthContext**: JWT token in `localStorage`, user object cached, role-based route guards
- **ThemeContext**: CSS variable injection for dark/light mode
- **Local state**: `useState` + `useReducer` per component
- **API caching**: axios response caching + localStorage fallback for offline
- **Real-time**: Socket.IO client for order status + queue number updates

---

## 4. BACKEND ARCHITECTURE (KWise-Backend/)

### Tech Stack
- Node.js (Express 4.18.2)
- PostgreSQL via `pg` 8.14.1 (pool of 100 connections)
- Redis 5.8.2 (L2 cache, optional)
- Socket.IO 4.8.1 (WebSocket real-time)
- JWT (`jsonwebtoken`) + bcrypt/bcryptjs (auth)
- Joi + AJV (request validation)
- Winston + Morgan (logging)
- Prometheus `prom-client` (metrics)
- Ollama (local AI — DeepSeek R1 1.5B)
- Node-cron (scheduled tasks)
- Multer + Sharp (image uploads)

### Server Entry: `server.js`
- Port 5000 (configurable via `PORT` env var)
- CORS: localhost:3000/3001/5000 + network ranges
- Trust proxy enabled (real client IP via X-Forwarded-For)
- Rate limiting tiers:
  - Global: 1,000 req / 15 min
  - Realtime: 500 req / min
  - Polling: 1,000 req / min
  - Kiosk: 5,000 req / min (UI-optimized)
- IP Firewall middleware (pre-route network security)
- Prometheus metrics collection
- Graceful shutdown: SIGTERM / SIGINT handlers

### Middleware Stack (execution order)
```
1. CORS validation
2. Body parser (JSON + URL-encoded)
3. Morgan HTTP logger
4. IP Firewall check
5. Rate limiter (per-route)
6. Auth middleware (protect + restrictTo)
7. Activity logger
8. Audit logger
9. Route handlers
10. Centralized error handler
```

### Route Registration (47 routes in server.js)
```
/api/auth/*          ← auths.js       — Login, register, token verify, password reset
/api/users/*         ← users.js       — User CRUD + role management
/api/kiosk/*         ← kiosk.js       — Categories, products, orders (5000/min)
/api/products/*      ← products.js    — Product search + catalog
/api/stock/*         ← stock.js       — Inventory CRUD + alerts
/api/orders/*        ← orders.js      — Order management + CSV export
/api/compatibility/* ← compatibility.js — AI + rule-based component analysis
/api/compatibility/advanced/* ← advancedCompatibilityRoutes.js — 6-layer analysis
/api/compatibility/enhanced/* ← enhancedCompatibility.js
/api/compatibility/comprehensive/* ← comprehensiveCompatibility.js
/api/pc-customized-ai-builds/* ← pcCustomizedAIBuilds.js — AI reference builds
/api/pc-upgrade/*    ← pcUpgrade.js   — Upgrade recommendations
/api/reference-builds/* ← referenceBuilds.js — 72 reference builds
/api/builder/*       ← builder.js     — Build wizard steps
/api/dashboard/*     ← dashboard.js   — Admin stats (parallel queries)
/api/admin/*         ← admin.js       — Admin-specific endpoints
/api/analytics/*     ← analytics.js   — Revenue + trends
/api/realtime/*      ← realtime.js    — SSE streams (orders, logs)
/api/health/*        ← health.js      — 9 health endpoints (liveness, readiness)
/api/metrics/*       ← metrics.js     — Prometheus metrics
/api/logs/*          ← logs.js        — Winston log retrieval
/api/messages/*      ← messages.js    — User messaging
/api/notifications/* ← notifications.js — Push notifications
/api/settings/*      ← settings.js    — System config CRUD
/api/queue/*         ← queue.js       — Queue number management
/api/images/*        ← images.js      — Image delivery + upload
/api/ip-access/*     ← ipAccess.js    — IP whitelist/blacklist
/api/ai/*            ← ai/aiRoutes.js — Ollama AI endpoints
/api/ml/*            ← ml/mlRoutes.js — ML scoring endpoints
```

### Controllers (18 files)
| Controller | Key Functions | Tables Used |
|-----------|---------------|-------------|
| `authController.js` | login, register, changePassword, forgotPassword, resetPassword | users |
| `userController.js` | CRUD users, role assignment, profile image | users |
| `kioskController.js` | getCategories, getCategoryProducts, placeOrder | pc_parts, orders |
| `stockController.js` | getStock, updateStock, lowStockAlerts | pc_parts |
| `orderController.js` / `ordersController.js` | createOrder, listOrders, exportCSV | orders |
| `dashboardController.js` | getStats (parallel queries), recentActivity | orders, users, pc_parts |
| `pcCustomizedAIBuildsController.js` | getAllBuilds, regenerateBuilds, getStatistics | pc_customized_ai_reference_builds |
| `referenceBuildsController.js` | getAllBuilds, getActiveBuilds | referenceBuilds.js util |
| `settingsController.js` | getSettings, updateSettings | settings |
| `logsController.js` | getLogs, filterLogs | audit_logs |
| `servicesController.js` | getCleaning, getCheckup, getDiagnostics | services tables |
| `ipAccessController.js` | getList, addIP, removeIP | ip_access_list |

### Services Layer (60+ files — key services)
| Service | Purpose |
|---------|---------|
| `compatibilityService.js` | AI + rule-engine compatibility analysis (Ollama) |
| `advancedCompatibilityService.js` | 6-layer: power, physical, pairwise, bottleneck, rules, real-world |
| `compatibilityRules.js` | 23-rule deterministic validation (socket, memory, power, thermal) |
| `MLCompatibilityScorer.js` | JS-based ML scorer (2,513 rules, weighted pattern matching) |
| `pcCustomizedAIBuildGenerator.js` | AI build generation (budget + use-case → component set) |
| `ollamaService.js` | Ollama HTTP client (queue, retry, LRU cache, circuit breaker) |
| `prometheusMetrics.js` | HTTP request metrics, response time histograms |
| `queueManagerService.js` | Queue number assignment + daily auto-reset (midnight cron) |
| `authService.js` | Password hashing (bcrypt), JWT generation |
| `emailService.js` | Nodemailer (password reset, notifications) |
| `cacheWarmingService.js` | Background pre-load of popular queries |

### AI Module (KWise-Backend/ai/)
```
ai/
├── config/aiConfig.js        ← Ollama config (model: deepseek-r1:1.5b, TTL tiers, circuit breaker)
├── services/
│   ├── ollamaService.js      ← Core Ollama HTTP client (LRU cache, retry, keep-alive)
│   ├── compatibilityAnalyzer.js ← AI compatibility analysis + JSON extraction
│   ├── buildOptimizer.js     ← Build optimization for Philippine market
│   ├── valueAnalyzer.js      ← Hot picks / trending products analysis
│   └── performancePredictor.js ← FPS + benchmark prediction (GPU/CPU database)
├── prompts/
│   ├── specializedPrompts.js ← 6 prompt templates (compatibility, alternatives, hot picks)
│   └── enhancedCompatibilityPrompts.js ← Advanced compatibility prompts
├── utils/
│   ├── jsonExtractor.js      ← Robust JSON parser (handles DeepSeek R1 thinking tags)
│   ├── gpuDetector.js        ← Auto GPU detection (RTX 5060 tuning)
│   └── referenceBuilds.js    ← 72 reference build templates
├── training/
│   ├── datasets/             ← JSONL training data (hardware specs, compatibility rules)
│   ├── fineTuningManager.js  ← Fine-tuning orchestration
│   └── datasetGenerator.js   ← Training data generation
├── controllers/aiController.js
└── routes/aiRoutes.js, performanceRoutes.js, promptRoutes.js, trainingRoutes.js
```

### ML Module (KWise-Backend/ml/)
```
ml/
├── MLCompatibilityScorer.js  ← Pattern matching scorer (2,513 rules, weighted)
└── mlRoutes.js               ← ML prediction endpoints
```

---

## 5. KEY TECHNICAL DECISIONS

| Decision | Technology | Rationale |
|----------|-----------|-----------|
| Frontend framework | React 18 (CRA) | Fast SPA, component reuse across kiosk/admin |
| Styling | TailwindCSS 4 | Utility-first, responsive kiosk-friendly design |
| Backend | Node.js + Express | JSON-native, async I/O for concurrent kiosk users |
| Database | PostgreSQL | ACID compliance, JSONB for specs, complex queries |
| Caching | Redis + LRU in-memory | L1/L2/L3 tiers; 95%+ hit rate target |
| Auth | JWT (HS256) + bcrypt | Stateless auth, algorithm confusion attack prevention |
| AI | Ollama (local) DeepSeek R1 | No cloud dependency, low latency for kiosk use |
| Real-time | Socket.IO + SSE | Dual transport for order queue display |
| Validation | Joi + AJV JSON Schema | Two-layer validation at route and middleware level |
| Monitoring | Winston + Prometheus | Structured logging + metric scraping |

---

## 6. SECURITY IMPLEMENTATION

- JWT HS256 with algorithm enforcement (prevents algorithm confusion attacks)
- bcrypt password hashing with salt rounds
- IP Firewall middleware (network-level blocking before routes)
- Role-based access control (superadmin > admin > developer > staff)
- SQL injection prevention via parameterized queries (pg client)
- CORS origin whitelist (no wildcards in production)
- Rate limiting per route type (strictest for auth endpoints)
- Audit logging on all state-changing operations
- Session locking for concurrent order prevention

---

## 7. REAL-TIME FEATURES

- Socket.IO for queue number status updates
- Server-Sent Events (SSE) at `/api/realtime/orders` and `/api/realtime/logs`
- 30-second keep-alive pings on SSE connections
- Active connection tracking and cleanup

---

## 8. KIOSK USER JOURNEY (End-to-End)

```
1. User arrives at kiosk
   └─ / → Order.js: Choose Assisted or Self-Order

2. Choose transaction type
   └─ /transaction → Transac-components.js: 3-card carousel
       ├─ COMPONENTS → /pc-parts (browse by category)
       ├─ BUILD & CUSTOMIZE → /pcbuild-category
       └─ PC SERVICES → /pc-services

3A. Components flow
   └─ /pc-parts → kioskAPI.getCategories() + getCategoryProducts()
      → Add to cart (localStorage) → /order-summary

3B. Build flow
   └─ /pcbuild-category → choose path:
       ├─ Prebuilt → /prebuilt-options
       ├─ Tier-based → /tier-selection
       └─ AI Assessment → /pc-customized-ai-assessment (6 steps)
           → CustomizeAI.jsx matches reference build
           → EditBuild.jsx (user can swap components)
           → /ordersum-custom

4. Order Summary (ALL flows converge here)
   └─ kioskAPI.checkFullBuildCompatibility() (90s timeout, 6-layer check)
      → CompatibilityWarningModal (show issues/warnings)
      → User confirms → /payment-window

5. Payment
   └─ 4 options: Credit Card / Online Bank / Installment / Cash
      → POST /api/orders (create order with all cart items)

6. Queue
   └─ /queuing-display → assigned queue number
      → WebSocket real-time status update
      → Staff completes order in admin panel
```

---

## 9. ADMIN DASHBOARD FEATURES

| Feature | Route | Key Actions |
|---------|-------|-------------|
| Overview Stats | /admin/dashboard | Orders, users, revenue, low stock cards |
| Stock Management | /admin/stock | CRUD products, batch operations, price updates |
| Order Queue | /admin/order-queue | Live queue, complete/cancel orders, assign station |
| Order History | /admin/order-queue/history | Filter, search, CSV export |
| Analytics | /admin/analytics | Revenue trends, top products, category performance |
| AI Metrics | /admin/ai-metrics | Suggestion accuracy, conversion rate, response times |
| User Management | /admin/users | CRUD users, role assignment |
| IP Access Control | /admin/ip-access-control | Whitelist/blacklist management |
| Rule Builder | /admin/rule-builder | Visual compatibility rule creation |
| Auto Generate Orders | /admin/auto-generate-orders | Test data for development |

---

## 10. VERIFIED LIVE DATABASE NUMBERS

| Metric | Real Value |
|--------|-----------|
| Total tables | **133** |
| Database triggers | **48** |
| pc_parts (products) | **429** across 15 categories |
| users | **20** |
| orders | **382** (202 pending, 55 completed, 125 cancelled) |
| compatibility_rules | **3,200** rules (11 categories) |
| Most rules | thermal: 663, compatibility: 643, physical: 376 |
| Largest table | ai_audit_logs: **134 MB** |
| Product tiers | Starter, Entry, Mid Tier, High Tier, Elite |
| Avg GPU price | ₱28,180 |
| Avg CPU price | ₱12,153 |
| Pre-Built PC avg | ₱49,763 |

---

## 11. GIT HISTORY SUMMARY

| Commit | Date | Description |
|--------|------|-------------|
| 68bd925 | 2026-03-28 | fix: resolve all frontend ESLint compile warnings |
| 20c0f86 | 2026-03-28 | fix: remove hardcoded secrets and clean redundant CORS IPs |
| f03133a | 2026-03-28 | feat: fix collaborator setup + database optimization |
| 0aa02cd | 2026-03-28 | docs: add collaborator setup guide, updated .env.example |
| 7941852 | 2026-03-28 | fix: critical security fixes — JWT fallback, CORS, SQL injection, auth middleware |
| 59ab1c6 | 2026-03-28 | fix: prevent backend crashes from unhandled errors |
| 5748944 | 2026-03-28 | chore: add agent configuration files and update .gitignore |
| 18a40c6 | 2026-01-06 | Add kwise-launcher.exe and commit all modified files |
| 4b0cd31 | 2025-12-12 | docs: record contributions for 2025-12-12 |
| 4376ace | 2025-12-11 | OrderSumCustom/Upgrade fix, Dashboard redesign, admin CSS improvements |
| fc87aca | 2025-12-10 | Initial commit: K-Wise Admin System |

**All commits authored by: Gabriel Ludwig Rivera**

---

## 11. WHAT TO VERIFY MANUALLY

- [ ] Database is running and accessible: `psql -U postgres -d KWiseDB`
- [ ] Redis is running: `redis-cli ping`
- [ ] Ollama is running: `curl http://localhost:11434/api/tags`
- [ ] `.env` file is configured (never commit real .env)
- [ ] CONTRIBUTIONS/ folder contents
- [ ] LAUNCHER_README.md, SYSTEM_REVIEW_REPORT.md existence
- [ ] VIDEO_SHOWCASE_SCRIPT.md existence
- [ ] Which specific features were YOUR personal contribution (vs team)
