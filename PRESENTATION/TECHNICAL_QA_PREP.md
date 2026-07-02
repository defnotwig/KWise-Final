# TECHNICAL Q&A PREPARATION

# K-Wise — Programmer of the Year Panel

> Read every question. Practice saying the answer out loud. Aim for 30–60 seconds per answer.
> **Aligned with master timeline:** 0:00–14:30 (see PRESENTATION_SCRIPT_10_TO_15_MINUTES.md)
> Q&A session typically begins around 14:30–15:00 and continues as time allows.

---

## CATEGORY 1 — TECHNOLOGY CHOICES

### Q: Why did you choose React for the frontend?

**Answer:**
"React was the right choice for K-Wise for two reasons. First, we have two very different UIs — the kiosk interface and the admin dashboard — but they share a lot of components: the same product cards, the same compatibility badges, the same loading states. React's component model made it natural to build once and reuse across both. Second, the kiosk involves multi-step workflows — the AI wizard, the order summary, the payment flow — and React's state management handles those step transitions cleanly. We also used React Router v7 for declarative routing, which made adding new pages straightforward."

---

### Q: Why did you choose Node.js and Express for the backend?

**Answer:**
"Node.js fits this use case well because the backend is I/O-bound, not compute-bound. The kiosk sends many concurrent requests — product queries, compatibility checks, order creation — and Node's event loop handles those efficiently without spawning a thread per request. Express gave us the middleware pattern we needed: authentication, rate limiting, IP firewall, logging — all as composable middleware functions applied in sequence. We also wanted a JavaScript-native backend so the team could share knowledge across frontend and backend code."

---

### Q: Why did you choose PostgreSQL instead of MySQL or MongoDB?

**Answer:**
"PostgreSQL gave us the best of both worlds for this project. We needed ACID transactions for orders — you don't want a partial order committed if something fails mid-insert. We also needed complex joins — the compatibility check queries join pc_parts with cpu_specs, motherboard_specs, and case_specs in a single query. And PostgreSQL's JSONB type was perfect for component specs like physical dimensions and power requirements — data that varies significantly between component types. We could store flexible JSON while still indexing and querying it with full SQL power. MongoDB would have given us the JSON flexibility but sacrificed joins and transactions. MySQL would have required rigid schemas for every spec type."

---

### Q: Why Ollama instead of OpenAI or another cloud API?

**Answer:**
"Three reasons. Cost, latency, and privacy. In a production kiosk environment, every compatibility check that hits a cloud API costs money per call. Multiply that by hundreds of customers per day and it adds up. Ollama lets us run DeepSeek R1 locally — zero per-query cost. Second, latency: a local inference server responds in 2-5 seconds for cached queries, versus 8-15 seconds for a cloud round-trip with network latency. Third, customer builds contain hardware preferences and budget information — running that through a third-party API creates a data privacy concern. With Ollama, everything stays on-premises."

---

## CATEGORY 2 — SYSTEM DESIGN

### Q: How does the AI recommendation work?

**Answer:**
"The AI recommendation has two parts. First, we pre-generate reference builds for every combination of use case, budget range, performance preference, and gaming preference — and store these in the pc_customized_ai_reference_builds table with component IDs, AI reasoning text, and three score columns: compatibility, performance, and value. When a customer completes the 6-step questionnaire, we fetch all reference builds and do a client-side profile match — finding the closest match to the customer's selections. Then we expand the component IDs to full product details from the database, checking real-time stock and pricing. So the AI reasoning already happened offline — the real-time part is just matching and populating product data."

---

### Q: How do you ensure hardware compatibility?

**Answer:**
"We use a three-tier hybrid approach. The first tier is deterministic rules — 1,000-plus rules stored in the compatibility_rules database table, organized by category: socket rules, memory type rules, power rules, physical clearance rules, thermal rules, BIOS update requirements. These are hard constraints — a Ryzen CPU in an Intel motherboard is always incompatible, no matter what. The second tier is AI analysis via Ollama — for nuanced cases where the rules aren't definitive, we pass the full build specification to the AI model and get a structured compatibility assessment. The third tier is ML pattern matching — we have a table of successful_build_patterns that tracks which builds led to successful purchases with high satisfaction scores. We use that as a confidence signal. The three tiers run in sequence: deterministic rules first, then AI, then ML scoring. Results are cached to give 3-5x speedup for repeated queries."

---

### Q: How does the caching strategy work?

**Answer:**
"We have three levels of caching. L1 is in-process LRU cache — for the fastest repeated requests, using the lru-cache library. L2 is Redis — for results that need to survive restarts and be shared across multiple server instances. L3 is PostgreSQL — the compatibility_cache table stores analysis results with an expires_at timestamp and a hit_count column so we can track the most frequently requested builds. Cache keys are generated by hashing the build component IDs with MD5 — so the same build always hits the same cache entry. For the kiosk, this is critical because many customers will check similar builds. We target a 95% cache hit rate for compatibility queries."

---

### Q: How do you secure the login and user sessions?

**Answer:**
"Authentication uses JWT with the HS256 algorithm. We explicitly enforce the algorithm in the middleware — this prevents algorithm confusion attacks where an attacker might try to pass a token signed with 'none' or RS256 to a server expecting HS256. Passwords are hashed with bcrypt before storage — never stored in plaintext. The token is stored in localStorage on the client. We have role-based access control — superadmin, admin, developer, staff — with route guards on both the frontend and backend. The backend protect middleware verifies the token on every protected request and checks that the user still exists in the database — a revoked user can't use an old token. We also have an IP firewall middleware that runs before any route handler, blocking known-bad IPs before they reach business logic."

---

### Q: How do you handle errors gracefully?

**Answer:**
"Error handling is layered. At the Express level, there's a centralized error handler in middleware/errorHandler.js that catches any unhandled errors from controllers and returns a consistent JSON error response — never stack traces in production. For AI calls, we use a circuit breaker pattern — if Ollama fails five consecutive times, the circuit opens and we return a pre-computed fallback response instead of timing out. The AI service also has retry logic with exponential backoff. On the frontend, the API layer catches 401 errors globally and redirects to login. For network errors, there are fallback data sets — if the categories API fails, we return a hardcoded list so the kiosk is still usable. We also have an auto-restart service that monitors for AI service failures and can restart the Ollama integration automatically."

---

### Q: How scalable is this system?

**Answer:**
"The backend is horizontally scalable. The Express server is stateless — JWT auth means no server-side session storage. The PostgreSQL connection pool supports up to 100 concurrent connections per instance. Redis is shared cache, so multiple backend instances can share cache state. Rate limiting is applied per IP, not per server instance. For vertical scaling, the database has 15+ performance indexes on high-frequency query columns like category, status, and created_at. The compatibility_cache table eliminates repeated AI computation for popular builds. In practice, a single backend instance with these optimizations should handle hundreds of concurrent kiosk sessions. For a larger deployment, you'd add a load balancer and additional backend instances sharing the same PostgreSQL and Redis."

---

## CATEGORY 3 — TECHNICAL IMPLEMENTATION

### Q: What was your hardest technical challenge?

**Answer:**
"The hardest challenge was making the compatibility engine both fast and accurate. Early versions called the AI model on every request — and at 5-15 seconds per response, that was too slow for a kiosk. We solved this in three steps: first, we added the compatibility_cache table with MD5-keyed results that persist across restarts. Second, we implemented the deterministic rule engine as a pre-check — most compatibility decisions can be made in milliseconds from 1,000+ stored rules, without touching the AI at all. Third, we added the ML pattern scorer using successful build history — so even for builds not in cache, we have a confidence signal from historical data. The result was a 3-5x speedup on repeated queries and acceptable response times even on cache misses."

---

### Q: What is your individual contribution specifically?

**Answer (VERIFY THIS — customize to your actual work):**
"[This should match your actual contributions — verify against git blame and the task tracker if one exists]

Looking at the git history, I authored all commits — from the initial commit in December 2025 through the security hardening and ESLint fixes in March 2026. Specific contributions include: the admin dashboard redesign and CSS improvements in the December 2025 commit; the critical security fixes commit — JWT algorithm enforcement, CORS origin hardening, SQL injection parameterization; the frontend ESLint cleanup; and the collaborator setup documentation and database optimization.

[VERIFY: Which specific modules did you build from scratch vs. inherit? The compatibility engine, AI integration, kiosk flow, admin panel?]"

---

### Q: How do you test the compatibility engine?

**Answer:**
"Multiple test layers. In the scripts/ folder, there are 30+ test scripts — test-compatibility-api.js runs through known-good and known-bad component pairings and verifies the expected result. test-kiosk-api.js covers the end-to-end kiosk flow including order placement. For the AI layer specifically, there's a circuit breaker test that simulates Ollama failures and verifies fallback behavior. The ML scorer has its own validation pass — it checks prediction accuracy against the ai_interaction_history table where we track whether the AI assessment matched the actual outcome. There's also a deployment readiness check script that runs all component health checks before going live."

---

### Q: How does the queue system work?

**Answer:**
"When an order is placed, we create a record in the orders table and simultaneously insert a queue record with an auto-assigned queue number. On the kiosk, the QueuingDisplay component connects via Socket.IO to the server and receives real-time status updates. The admin order queue page also uses WebSocket — when a staff member marks an order as 'serving,' the event propagates to the customer's queue display immediately. The queue auto-resets at midnight via a node-cron job in queueAutoResetScheduler.js — so queue numbers start fresh each business day. We also support dual station display — two service counters can independently call 'Now Serving.'"

---

### Q: How does the admin dashboard get its data?

**Answer:**
"The dashboard controller runs parallel database queries — using Promise.all — rather than sequential queries. It simultaneously queries order counts by status, user counts by role, product totals, low-stock counts, revenue figures, and recent activity. This parallel execution means the dashboard loads in roughly the time of the slowest single query, not the sum of all queries. The data is then supplemented by real-time updates via Server-Sent Events at /api/realtime/orders — so if an order comes in while the admin is viewing the dashboard, the order count updates without a page refresh."

---

### Q: Walk me through a specific API endpoint end-to-end.

**Answer (use POST /api/compatibility/analyze):**
"Sure. POST /api/compatibility/analyze.

The request comes in from the frontend when a user adds a component to their build. First, it hits the rate limiter — kiosk endpoints allow 5,000 requests per minute. Then the IP firewall checks the client IP against the blocklist. Then the validateBuild middleware runs JSON Schema validation on the request body — if the schema doesn't match, we return 400 immediately without hitting the controller.

If validation passes, the request reaches the compatibility controller. It extracts the build configuration and generates a cache key by hashing the component IDs. If there's a cache hit in compatibility_cache, we return the stored result immediately — sub-10ms.

On a cache miss, the controller calls the advancedCompatibilityService. That runs all 6 layers — power budget, physical clearance, pairwise matching, bottleneck detection, rule engine, real-world data. If the rule engine is inconclusive, it delegates to the AI layer — builds the prompt, calls ollamaService, which manages the request queue and LRU cache. The AI response is parsed by our custom JSON extractor (which strips DeepSeek's thinking tags). The ML scorer adds a confidence signal.

The final result — compatible boolean, score 0-100, list of issues and suggestions — is inserted into compatibility_cache and returned to the client as JSON."

---

## CATEGORY 4 — PANEL WILD CARDS

### Q: What would you change or improve if you had more time?

**Answer:**
"A few things. First, I'd add a fine-tuned model for compatibility specifically — we have the training data (compatibility_rules_training.jsonl) and the framework for fine-tuning via fineTuningManager.js, but haven't completed the training cycle. A fine-tuned model would give better accuracy and faster inference. Second, I'd implement the A/B testing framework that's already in the database — the ai_ab_experiments table and the prompt template system are ready, but we haven't run live experiments to optimize AI response quality. Third, I'd add mobile support for the kiosk — right now it's optimized for touchscreen monitors, but making it work well on phones would expand the use case."

---

### Q: How would you handle 100 simultaneous users?

**Answer:**
"The architecture handles this reasonably well today. The Express server is non-blocking, so 100 concurrent requests don't create 100 threads — Node's event loop handles them. The PostgreSQL pool has 100 connections, so each concurrent request can have its own database connection. The rate limiter would kick in before overloading the AI — Ollama has a 20-request concurrent queue configured in aiConfig.js, and additional requests wait in line rather than failing. The compatibility cache means most of those 100 users are likely checking similar builds — hitting cache, not the AI. For a truly high-concurrency scenario, I'd add a second backend instance behind a load balancer, pointing to the same PostgreSQL and Redis."

---

### Q: What security vulnerabilities did you fix or prevent?

**Answer:**
"Looking at the git history, the security fix commit specifically addressed: JWT algorithm enforcement — preventing algorithm confusion where an attacker uses 'none' as the algorithm; SQL injection — ensuring all database queries use parameterized queries via the pg library's query function; CORS wildcard removal — replacing wildcard origin with explicit whitelisted origins; IP firewall middleware — blocking known-bad IPs at the network level before they reach business logic; and password hashing enforcement — ensuring bcrypt is always applied before storage. There's also input validation at every API entry point using Joi and JSON Schema, which prevents unexpected input from reaching the database layer."

---

### Q: If a component goes out of stock mid-session, what happens?

**Answer:**
"Good question — this is a real edge case. At the order placement stage, we validate stock in the database before committing the order. If a product went out of stock between when the user added it to cart and when they place the order, the order creation will fail with an appropriate error. The frontend then shows an error message and prompts the user to remove the out-of-stock item. We also filter kiosk product queries to `stock > 0` by default — so products that are already out of stock don't appear in the browse or recommendation flows. The admin low-stock alert system flags items when they drop below a threshold, so staff can reorder before they hit zero."

---

## QUICK-FIRE CHEAT SHEET

| If asked about...         | Say...                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Frontend framework        | React 18, CRA, TailwindCSS 4                                       |
| Backend framework         | Node.js, Express 4.18.2                                            |
| Database                  | PostgreSQL, **133 tables**, JSONB for specs                        |
| Caching                   | 3-tier: LRU memory → Redis → PostgreSQL                            |
| Auth                      | JWT HS256 + bcrypt, RBAC (admin/superadmin/developer)              |
| AI model                  | Ollama, DeepSeek R1 1.5B, local inference                          |
| Real-time                 | Socket.IO + Server-Sent Events                                     |
| Compatibility layers      | 6 layers: power, physical, pairwise, bottleneck, rules, real-world |
| Compatibility rules count | **3,200** in database (11 categories)                              |
| Database tables count     | **133**                                                            |
| Database triggers         | **48**                                                             |
| Products in db            | **429** across 15 categories                                       |
| Orders in db              | **382** (202 pending, 55 completed)                                |
| Route files               | 47                                                                 |
| Test scripts              | 80+                                                                |
| Migration files           | 67+                                                                |
| Cache speedup             | 3-5x for repeated compatibility queries                            |
| AI timeout                | 60 seconds max; 10-minute hot cache TTL                            |
| Largest table             | ai_audit_logs at **134 MB**                                        |
| Product tiers             | Starter, Entry, Mid Tier, High Tier, Elite                         |
| Most rules category       | thermal (663), compatibility (643), physical (376)                 |
