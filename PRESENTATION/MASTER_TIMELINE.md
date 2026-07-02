# MASTER TIMELINE — K-Wise Programmer of the Year Presentation
# Complete 14:30 Presentation Timeline (Aligned Across All 4 Documents)

**All presentation materials are synchronized to this single timeline.**

---

## PRESENTATION TIMELINE: 0:00 → 14:30 (14 minutes 30 seconds)

### 0:00–1:00 | SECTION 1 — Context & Role (1 minute)
**Script:** Quick Context & My Role (1 minute)
**Slides:** Title (0:00–0:30) → Problem (0:30–1:00)
**Recording:** Intro / no recording segment for intro
**Notes:** Maintain eye contact, speak naturally about your role

---

### 1:00–2:30 | SECTION 2 — System Overview (1.5 minutes)
**Script:** System Overview (1:00–2:30)
**Slides:** My Role & Contribution (1:00–1:30) → System Architecture (1:30–2:30)
**Recording:** No live recording (slides only)
**Key Message:** 133 tables, 429 products, 3,200 compatibility rules

---

### 2:30–6:30 | SECTION 3 — Live System Demonstration (4 minutes)
**Script:** Live System Demonstration (2:30–6:30)
**Slides:** Main User Flows (2:30–3:00) → Frontend Code (3:00–3:30) → Backend Code (3:30–4:30) → Database (4:30–5:30)
**Recording Scenes:**
- **Scene 4** (2:30–5:30): Kiosk Live Demo — **CORE OF THIS SECTION**
  - Open browser at localhost:3000
  - Self-Order → Build & Customize → 6-step AI questionnaire
  - Show AI build result, component swapping, compatibility check
  - Switch to admin dashboard, order queue
- **Scene 1** (3:00–3:45): Repo Overview (while opening kiosk)
- **Scene 2** (3:45–4:45): App.js routing (background exploration)

**Key Moments:**
- 2:30: "Let me show you the kiosk..."
- 3:00: Open kiosk screen — click Self-Order
- 4:00: Navigate through AI wizard (2-3 steps)
- 4:30: Show compatibility badge on component swap
- 5:00: Admin queue + order management (real-time updates)

---

### 6:30–10:30 | SECTION 4 — Source Code Walkthrough (4 minutes)
**Script:** Source Code Walkthrough (6:30–10:30)
**Slides:** Core Features 1/2/3 (5:30–8:30) → Source Code Trace (8:30–9:30) → Tech Decisions (9:30–10:30)
**Recording Scenes:**
- **Scene 5** (6:30–7:30): Backend server.js — middleware chain, rate limiting, Socket.IO setup
- **Scene 6** (7:30–8:15): Routes folder — show all 47 route files
- **Scene 3** (4:45–5:45): kioskAPI.js integration layer (covered in previous section)
- **Scene 7** (8:15–10:15): **COMPATIBILITY ENGINE — 6-layer analysis (KEY MOMENT)**
  - Open advancedCompatibilityService.js
  - Point at: Layer 1 (power), Layer 2 (physical), Layer 3 (pairwise), Layer 4 (bottleneck), Layer 5 (rules), Layer 6 (real-world)
  - Also show: compatibilityAnalyzer.js — Ollama AI call
- **Scene 8** (10:15–11:00): DB config — connection pooling, caching tiers

**Key Moments:**
- 6:30: "Here's server.js — the entry point..."
- 7:00: Show Express middleware chain
- 7:30: "47 route files — each feature isolated..."
- 8:15: "This is the compatibility engine — the most technically complex module..."
- 8:45: Explain the 6 layers sequentially
- 9:00: Show Ollama DeepSeek R1 integration

---

### 10:30–12:00 | SECTION 5 — Innovation, Impact & Relevance (1.5 minutes)
**Script:** Innovation, Impact & Relevance (10:30–12:00)
**Slides:** Code Quality (10:30–11:00) → Innovation & Impact (11:00–12:00)
**Recording Scenes:**
- **Scene 9** (11:00–11:45): AI Config — Ollama setup, no cloud dependency
- **Scene 10** (11:45–13:45): **psql Live Commands — THE KEY DATABASE MOMENT**
  - **0:00 (in scene):** Run `\dt` → shows **133 rows** (ALL TABLES)
  - **0:15:** Run `SELECT COUNT(*) FROM compatibility_rules` → shows **3200** (SAY THIS NUMBER CLEARLY)
  - **0:30:** Run `SELECT rule_category, COUNT(*) ...` → shows breakdown
  - **0:45:** Run `\d pc_parts` → show JSONB columns, 35+ indexes, triggers
  - **1:00:** Run `SELECT ... FROM pc_parts LIMIT 5` → real product data
  - **1:30:** Run orders by status → show 382 orders

**Key Messages:**
- "3,200 compatibility rules — covering every hardware constraint..."
- "133 tables organized around products, orders, compatibility, AI intelligence..."
- "Local Ollama AI means zero cloud cost, no latency, no data privacy concerns..."

---

### 12:00–13:00 | SECTION 6 — UI/UX Contribution (1 minute)
**Script:** UI/UX Contribution (12:00–13:00)
**Slides:** UI/UX Contribution (12:00–13:00)
**Recording Scenes:**
- **Scene 11** (13:45–14:45): Admin Features — Stock management + Order queue (shown before timeline, part of previous section)

**Key Points:**
- Kiosk design for touchscreen
- Compatibility badges (green/orange/red)
- Admin dashboard information hierarchy
- Dark mode support

---

### 13:00–14:00 | SECTION 7 — Collaboration & Professional Practice (1 minute)
**Script:** Collaboration & Professional Practice (13:00–14:00)
**Slides:** Collaboration & Professional Practice (13:00–14:00)
**Recording Scenes:**
- **Scene 12** (14:45–15:15): Git Log — semantic commits, security fixes

**Key Points:**
- Structured commits (feat:, fix:, docs:, chore:)
- Security hardening (JWT, CORS, SQL injection)
- COLLABORATOR_SETUP.md documentation
- 80+ test scripts

---

### 14:00–14:30 | SECTION 8 — Closing Statement (30 seconds)
**Script:** Closing Statement (14:00–14:30)
**Slides:** Closing (14:00–14:30)
**Recording:** None
**What to Say:** "To summarize — K-Wise is a production-grade full-stack system... [summary]... Thank you. I'm happy to answer questions."

---

## Q&A SESSION (typically 14:30 onward)
**Reference:** TECHNICAL_QA_PREP.md contains 15 prepared Q&A answers.

---

## KEY NUMBERS TO MEMORIZE & SAY CLEARLY

- **133 tables** in PostgreSQL
- **3,200 compatibility rules** (not 1,000+)
- **429 products** across 15 categories
- **382 orders** in system
- **48 database triggers**
- **134 MB** ai_audit_logs (shows system usage)

---

## CRITICAL TIMING NOTES

1. **Live demo (Scene 4)** is 3 minutes of your 4-minute Section 3
   - If pressed for time, can shorten to 2:30
   - If running early, can extend the build swap + compatibility check demo

2. **Compatibility engine (Scene 7)** is the 2-minute technical deep-dive
   - This is your "showstopper" moment
   - Don't rush; make sure the panel understands the 6 layers

3. **psql (Scene 10)** is where you say "3,200 rules" and show it's real
   - 2 minutes, but the first 15 seconds is the biggest impact
   - The `SELECT COUNT(*) FROM compatibility_rules → 3200` moment

4. **Total with all slides + recording:** ~14:30
   - Leaves 15–30 min for Q&A in typical 15-minute slot... wait, that's backwards.
   - You have 14:30 presentation + ~5-10 min Q&A if time allows
   - May need to trim slightly if running over

---

## FILE CROSS-REFERENCE

| File | Primary Use | Aligned Timeline |
|------|------------|-----------------|
| [PRESENTATION_SCRIPT_10_TO_15_MINUTES.md](PRESENTATION_SCRIPT_10_TO_15_MINUTES.md) | What to say word-by-word | 0:00–14:30 |
| [PRESENTATION_FLOW.md](PRESENTATION_FLOW.md) | Slide-by-slide outline | 0:00–14:30 (18 slides) |
| [SCREEN_RECORDING_SHOT_LIST.md](SCREEN_RECORDING_SHOT_LIST.md) | Live code/demo moments | 2:30–15:15 (12 scenes) |
| [TECHNICAL_QA_PREP.md](TECHNICAL_QA_PREP.md) | Q&A backup answers | After 14:30 |
| [DATABASE_SCAN_COMMANDS.sql](DATABASE_SCAN_COMMANDS.sql) | psql commands for Scene 10 | 11:45–13:45 |
