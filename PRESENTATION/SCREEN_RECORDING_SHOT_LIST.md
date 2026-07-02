# SCREEN RECORDING SHOT LIST
# K-Wise Presentation — Exact Actions Per Scene

> **Before recording:** Start backend (npm run dev in KWise-Backend), start frontend (npm start in K-Wise), ensure psql is accessible, open VS Code with the project loaded.

---

## SCENE 1 — Repository Overview
**Presentation Time:** 3:00–3:45 | **Duration:** 45 seconds | **Section:** 3 — Live Demo
**Why it matters:** Shows project scale, organization, and professionalism

### What to show:
1. Open VS Code with "K-Wise Final 2" workspace loaded
2. In the Explorer panel, show the ROOT level folders:
   - `K-Wise/` (frontend)
   - `KWise-Backend/` (backend)
   - `launcher.js`, `start-all.bat`, `README.md`, `AGENTS.md`

### What to say:
"This is the project root. The K-Wise folder is the React frontend — the kiosk and admin interfaces. KWise-Backend is the Node.js Express server. The launcher.js starts both simultaneously for development."

### Verify:
- [ ] Both folders visible in VS Code Explorer

---

## SCENE 2 — Frontend Entry Point: App.js + Routing
**Presentation Time:** 3:45–4:45 | **Duration:** 1 minute | **Section:** 3 — Live Demo
**Why it matters:** Shows frontend architecture decision (routing, context providers)

### What to show:
1. Open `K-Wise/src/core/App.js`
2. Scroll to show:
   - `AuthProvider` and `ThemeProvider` wrappers (lines ~1-30)
   - Route definitions: kiosk routes, admin routes with guards (lines ~50-200)
3. Highlight one admin route with role-based guard

### What to say:
"Here's the main App component. It wraps everything in two context providers — one for authentication state, one for the theme. Then it defines all routes using React Router v7. Admin routes have role-based guards — you need admin or superadmin role to access them."

### Verify:
- [ ] `src/core/App.js` exists and has route definitions

---

## SCENE 3 — API Integration Layer: kioskAPI.js
**Presentation Time:** 4:45–5:45 | **Duration:** 1 minute | **Section:** 4 — Code
**Why it matters:** Shows clean API abstraction, error handling, response normalization

### What to show:
1. Open `K-Wise/src/api/kioskAPI.js`
2. Scroll to show:
   - `getCategories()` function
   - `checkFullBuildCompatibility()` function (note the 90-second timeout)
   - Response normalization (handling flat array vs `{ items: [...] }`)

### What to say:
"This is the API integration layer for the kiosk. Every HTTP call is abstracted here so components don't deal with axios directly. Notice checkFullBuildCompatibility — it has a 90-second timeout because the 6-layer analysis can take time on first run. The normalization code handles different response formats from the backend."

### Verify:
- [ ] `src/api/kioskAPI.js` exists at ~873 lines

---

## SCENE 4 — Kiosk User Flow: Live Demo
**Presentation Time:** 2:30–5:30 | **Duration:** 3 minutes | **Section:** 3 — Live Demo
**Why it matters:** Shows the actual product in action — most impactful moment (CORE OF SECTION 3)

### What to show:
1. Open browser at `http://localhost:3000`
2. Click **Self-Order**
3. Click **Build and Customize** (middle card)
4. Walk through AI Assessment — 3-4 steps (don't need to finish all 6)
5. Show the AI-generated build result
6. Click on a component — show swap/edit (EditBuild.jsx)
7. Navigate to /order-summary — wait for compatibility check
8. Show CompatibilityWarningModal or compatibility badges
9. Navigate to /payment-window briefly
10. Switch to admin: `http://localhost:3000/admin`
11. Show dashboard stats + charts
12. Show order queue (even if empty)

### What to say (narrate while clicking):
- "Customer arrives at kiosk. Two choices — assisted by staff, or self-serve."
- "They choose Build and Customize. Six questions: use case, budget, performance preference..."
- "Here's the AI recommendation — a complete build sourced from in-stock inventory."
- "They can swap any component. As soon as they change something, we run a compatibility check."
- "At checkout, we run a full 6-layer analysis. Red means incompatible, orange means warning, green means all clear."
- "On the admin side — live stats, charts, order management."

### Verify:
- [ ] App is running on localhost:3000
- [ ] Backend is running on localhost:5000
- [ ] At least some products exist in the database

---

## SCENE 5 — Backend Entry: server.js
**Presentation Time:** 6:30–7:30 | **Duration:** 1 minute | **Section:** 4 — Code
**Why it matters:** Shows middleware chain, security setup, professional backend architecture

### What to show:
1. Open `KWise-Backend/server.js`
2. Scroll slowly — point at:
   - CORS configuration section
   - Rate limiting definitions (global 1000/15min, kiosk 5000/min)
   - IP Firewall middleware line
   - Route registrations (show ~10 of the 47 routes)
   - Socket.IO initialization
   - Graceful shutdown handler (SIGTERM/SIGINT)

### What to say:
"Server.js is the entry point for the backend. It sets up CORS with an explicit origin whitelist. Rate limiting is layered — the kiosk routes allow 5,000 requests per minute because the UI makes many calls, while the global limit is tighter. There's an IP firewall middleware that runs before any route. And at the bottom, a graceful shutdown handler — so in-flight requests complete before the server stops."

### Verify:
- [ ] `KWise-Backend/server.js` exists

---

## SCENE 6 — Backend Routes: routes/ folder
**Presentation Time:** 7:30–8:15 | **Duration:** 45 seconds | **Section:** 4 — Code
**Why it matters:** Shows modular route organization — 47 files = mature architecture

### What to show:
1. In VS Code Explorer, expand `KWise-Backend/routes/`
2. Let panel show all ~47 files
3. Click open `routes/compatibility.js`
4. Show the POST /analyze endpoint definition
5. Point at: middleware applied (validateBuild), controller called

### What to say:
"The routes folder has 47 files — each feature area has its own route file. This is the compatibility route. It validates the request body against a JSON schema before passing it to the controller."

### Verify:
- [ ] `KWise-Backend/routes/` has 40+ .js files
- [ ] `routes/compatibility.js` exists

---

## SCENE 7 — Compatibility Engine: advancedCompatibilityService.js
**Presentation Time:** 8:15–10:15 | **Duration:** 2 minutes | **Section:** 4 — Code
**Why it matters:** Core technical innovation — shows the 6-layer engine (KEY MOMENT)

### What to show:
1. Open `KWise-Backend/services/advancedCompatibilityService.js`
2. Scroll through to show:
   - Layer 1: Power budget calculation function
   - Layer 2: Physical clearance check
   - Layer 3: Pairwise component check
   - Layer 4: Bottleneck detection
   - Layer 5: Rule engine call
   - Layer 6: Real-world data lookup

### What to say:
"This is the core of the compatibility engine — the most technically complex module in the system. It runs six layers sequentially. Layer 1 calculates total power draw — CPU + GPU + other components — and checks if the PSU has a 20% safety margin. Layer 2 checks physical dimensions: will the GPU fit in the case? Is the cooler too tall? Layer 3 does pairwise matching — socket compatibility, memory type. Layer 4 detects bottlenecks — if you pair an RTX 4090 with an entry-level CPU, we flag that. Layer 5 applies the 1,000+ rules from the database. Layer 6 integrates real-world data from user reports and successful build patterns."

### Also show:
3. Open `KWise-Backend/ai/services/compatibilityAnalyzer.js` briefly
4. Point at: Ollama call, JSON extraction from AI response

### What to say:
"And here's where we call the local Ollama AI model — it receives the component specs and returns a compatibility assessment. We have a custom JSON extractor because the DeepSeek R1 model includes thinking-process text before the final answer."

### Verify:
- [ ] `KWise-Backend/services/advancedCompatibilityService.js` exists
- [ ] `KWise-Backend/ai/services/compatibilityAnalyzer.js` exists

---

## SCENE 8 — Database Config: config/db.js
**Presentation Time:** 10:15–11:00 | **Duration:** 45 seconds | **Section:** 4→5
**Why it matters:** Shows professional database configuration, caching awareness

### What to show:
1. Open `KWise-Backend/config/db.js`
2. Scroll to show:
   - Pool settings (max: 100, min: 10, timeout: 5000ms)
   - Query caching section (Redis first, in-memory fallback)
3. Open `KWise-Backend/config/redis.js` briefly
4. Show: multi-tier cache (L1 memory, L2 Redis, L3 database)

### What to say:
"The database configuration uses connection pooling — up to 100 connections — for concurrent kiosk users. The query layer has a built-in cache: Redis first, in-memory LRU as fallback. This is what gives us the 3-5x speedup on repeated compatibility queries."

### Verify:
- [ ] `KWise-Backend/config/db.js` exists
- [ ] `KWise-Backend/config/redis.js` exists

---

## SCENE 9 — AI Config: aiConfig.js + Ollama
**Presentation Time:** 11:00–11:45 | **Duration:** 45 seconds | **Section:** 5 — Innovation
**Why it matters:** Shows local AI setup — no cloud dependency is a key differentiator

### What to show:
1. Open `KWise-Backend/ai/config/aiConfig.js`
2. Show:
   - `model: 'deepseek-r1:1.5b'`
   - Cache tier configuration (hot/warm/cold with TTLs)
   - Circuit breaker settings

### What to say:
"The AI runs on Ollama — a local inference server. We're using DeepSeek R1 at 1.5 billion parameters. It runs on the local machine — no API key, no cloud cost per query, no internet latency. The cache is organized in tiers: hot results cached for 10 minutes, warm for 1 hour, cold for 4 hours."

### Also show (if Ollama is running):
3. Open terminal, run: `curl http://localhost:11434/api/tags`
   (shows available models)

### Verify:
- [ ] `KWise-Backend/ai/config/aiConfig.js` exists
- [ ] Ollama is running if you want to demo a live query

---

## SCENE 10 — Database: psql Live Commands
**Presentation Time:** 11:45–13:45 | **Duration:** 2 minutes | **Section:** 5→6
**Why it matters:** Shows real database — proves the system has actual data and schema depth (KEY MOMENT: 3,200 rules)

### What to show:
1. Open terminal (PowerShell or CMD)
2. Connect: `psql -U postgres -d KWiseDB`  (enter password when prompted)
3. Run these commands one by one (pause after each for effect):

```sql
\dt
```
**Expected:** 133 tables listed — scroll slowly for effect

```sql
SELECT category, COUNT(*) as products, SUM(stock) as total_stock
FROM pc_parts WHERE is_active=true
GROUP BY category ORDER BY products DESC;
```
**Expected:** 15 categories, 429 total products — Cooling (60), Motherboard (54), GPU (45)...

```sql
SELECT COUNT(*) FROM compatibility_rules;
```
**Expected: 3200** — pause here, let the panel see this number

```sql
SELECT rule_category, COUNT(*) FROM compatibility_rules
WHERE enabled=true GROUP BY rule_category ORDER BY COUNT(*) DESC;
```
**Expected:** thermal 663, compatibility 643, physical 376, power 299...

```sql
\d pc_parts
```
**Expected:** Shows `specifications (jsonb)`, `dimensions (jsonb)`, `compatible_sockets (jsonb)`, `kiosk_metadata (jsonb)`, `total_value` GENERATED column, 35+ indexes, 2 triggers

```sql
SELECT id, name, category, brand, price, stock, tier FROM pc_parts LIMIT 5;
```
**Expected:** Real product names, prices in PHP

```sql
SELECT status, COUNT(*) FROM orders GROUP BY status;
```
**Expected:** pending 202, cancelled 125, completed 55

### What to say:
- `\dt` (133 rows): "One hundred thirty-three tables — organized around products, orders, compatibility rules, AI intelligence, monitoring, and system management."
- `SELECT COUNT(*) FROM compatibility_rules` → 3200: "Three thousand, two hundred compatibility rules. This is the foundation of our compatibility engine — covering thermal limits, physical clearance, socket compatibility, power requirements, and more."
- `\d pc_parts`: "Notice the JSONB columns — specifications, dimensions, compatible_sockets. We store flexible component data in JSON that PostgreSQL can still index and query. And this total_value column is generated — it's automatically computed as price times stock, always in sync."
- orders status: "382 orders in the system — 202 pending, 55 completed. The pending orders include test data from development."

### Verify:
- [ ] `psql -U postgres -d KWiseDB` connects successfully
- [ ] Tables are populated

---

## SCENE 11 — Git Log: Contribution Evidence
**Duration:** 30 seconds
**Why it matters:** Proves authorship and professional commit practice

### What to show:
1. Open terminal in project root
2. Run:
```
git log --oneline -15
```
3. Show semantic commits: fix:, feat:, docs:, chore:

### What to say:
"Structured commits — each one scoped and labeled. Security fixes are isolated. Feature work is separated from maintenance. The commit history tells the story of how the system evolved."

### Also show (optional):
```
git diff HEAD~5 --stat
```
(Shows files changed in recent commits)

### Verify:
- [ ] Git repo has commits
- [ ] Commit messages are semantic

---

## SCENE 12 — Admin Features: Stock + Queue
**Duration:** 1 minute
**Why it matters:** Shows the full admin side of the system

### What to show:
1. In browser, navigate to `http://localhost:3000/admin/stock`
2. Show product categories and counts
3. Navigate to `http://localhost:3000/admin/order-queue`
4. Show the queue interface (even if no active orders, explain what it does)
5. Navigate briefly to analytics or AI metrics

### What to say:
"The admin stock page shows all inventory organized by category. Clicking a category shows the full product list — with filters for brand, price, and stock level. The order queue is the operational hub — staff see pending orders here, mark them as serving, and complete them. The AI metrics page shows how well the compatibility and recommendation engine is performing."

---

## TOTAL RECORDING STRUCTURE

| Scene | Content | Duration |
|-------|---------|---------|
| 1 | Repo overview | 0:45 |
| 2 | App.js routing | 1:00 |
| 3 | kioskAPI.js | 1:00 |
| 4 | Live kiosk + admin demo | 3:00 |
| 5 | server.js | 1:00 |
| 6 | Routes folder | 0:45 |
| 7 | Compatibility engine | 2:00 |
| 8 | DB config | 0:45 |
| 9 | AI config | 0:45 |
| 10 | psql live commands | 2:00 |
| 11 | Git log | 0:30 |
| 12 | Admin stock + queue | 1:00 |
| **TOTAL** | | **~14:30** |

---

## PRE-RECORDING CHECKLIST

- [ ] Backend running: `cd KWise-Backend && npm run dev`
- [ ] Frontend running: `cd K-Wise && npm start`
- [ ] psql accessible: `psql -U postgres -d KWiseDB`
- [ ] Ollama running (if demoing AI live): `ollama serve`
- [ ] VS Code open with K-Wise Final 2 workspace
- [ ] Browser open at localhost:3000
- [ ] Terminal open (separate window)
- [ ] Screen resolution set (1920x1080 recommended)
- [ ] Font size increased in VS Code for visibility (Ctrl+= to zoom)
- [ ] Close unnecessary browser tabs and notifications
- [ ] Dark/light mode set consistently
- [ ] Practice the psql commands once before recording
