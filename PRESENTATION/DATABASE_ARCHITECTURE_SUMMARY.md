# DATABASE ARCHITECTURE SUMMARY — K-Wise KWiseDB

> PostgreSQL Database | **133 Tables** | 67+ Migration Files | **3,200 Compatibility Rules** | 48 Triggers | 429 Products | 382 Orders

---

## 1. DATABASE TABLE MAP

### Group A — Core Product & Inventory

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `pc_parts` | Master product catalog (ALL PC components) | id, name, category, brand, price, stock, tier, compatibility_data (JSONB), physical_dimensions (JSONB), power_requirements (JSONB) |
| `cpu_specs` | CPU-specific specifications | socket, series, base_clock, turbo_clock, cores, threads, tdp, benchmark_score, fps data |
| `gpu_specs` | GPU-specific specifications | memory_type, memory_capacity, length, tdp, fps (ultra/high/medium/low) |
| `motherboard_specs` | Motherboard specifications | socket, chipset, memory_type, max_ram, ram_slots, m2_slots |
| `ram_specs` | RAM specifications | memory_type, configuration, speed, voltage |
| `storage_specs` | Storage specifications | capacity, storage_type, interface, nvme_support, m2_type |
| `psu_specs` | PSU specifications | form_factor, efficiency_rating, wattage, modular |
| `case_specs` | Case specifications | category, color, fans_included |
| `cooling_specs` | Cooling specifications | max_rpm, max_noise, height, water_cooled |

### Group B — Users & Authentication

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts (admin/staff/kiosk) | id, name, email, password (hashed), role, display_name, profile_image, last_login, last_active_at |

### Group C — Orders & Transactions

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `orders` | Transaction records | id, status (pending/serving/completed/cancelled), total_amount, cart_items (JSONB), assisted_by, created_at |
| `queue` | Queue number assignment | id, order_id, queue_number, station, status, created_at |

### Group D — Compatibility Engine

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `compatibility_rules` | 1000+ rule engine rules | rule_name, rule_category (socket/memory/power/physical/thermal/bios), rule_type, rule_expression (JSONB), severity (error/warning/info), priority |
| `compatibility_cache` | Cached analysis results (3-5x speedup) | cache_key, build_config (JSONB), result (JSONB), expires_at, hit_count |
| `compatibility_matrix` | Pre-computed pairwise scores | component_a_id, component_b_id, compatibility_score, is_compatible, issues (JSONB) |
| `cpu_compatibility` | CPU-motherboard rules | cpu_socket, motherboard_chipset, compatible, requires_bios_update |
| `motherboard_compatibility` | Motherboard capability map | form_factor, socket, chipset, memory_type, max_memory_speed |
| `gpu_compatibility` | GPU clearance rules | gpu_length_mm, gpu_slots, min_psu_wattage, tdp |
| `ram_compatibility` | RAM validation rules | memory_type, memory_speed, chipset_support, voltage |
| `psu_compatibility` | PSU adequacy rules | wattage, efficiency_rating, pcie_8pin_connectors, has_12vhpwr |
| `case_compatibility` | Physical fit rules | max_gpu_length_mm, max_cpu_cooler_height_mm, motherboard_support (JSONB) |
| `cooling_compatibility` | Cooler fit rules | cooler_height_mm, socket_support (JSONB), tdp_rating |
| `bios_compatibility` | BIOS update requirements | motherboard_model, cpu_generation, min_bios_version, critical_update |
| `thermal_compatibility` | Thermal limit rules | case_model, cpu_tdp_limit, gpu_tdp_limit, requires_liquid_cooling |
| `storage_compatibility` | Storage interface rules | storage_type, interface_type, pcie_gen, disables_sata_ports (JSONB) |
| `known_compatibility_issues` | User-reported issues | affected_parts (JSONB), severity, workaround, resolved |
| `user_compatibility_reports` | User-submitted reports | build_hash, parts_json, issue_type, resolution_status |
| `compatibility_issue_templates` | Issue message templates | issue_code, issue_category, title, description, solution |

### Group E — AI Reference Builds

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `pc_customized_ai_reference_builds` | Pre-generated AI builds (per use case + budget + preference) | build_key, usage_type, budget_range, performance_preference, gaming_preference, cpu_id → cooling_id FKs, total_price, ai_reasoning, compatibility_score, performance_score, value_score |
| `pc_customized_usage_types` | Usage type parameters | id, name, display_name, is_active, sort_order |
| `pc_customized_budget_ranges` | Budget tier definitions | id, name, min_budget, max_budget, representative_budget |
| `pc_customized_performance_preferences` | Performance weight config | id, name, performance_weight, budget_weight |
| `pc_customized_gaming_preferences` | Gaming preference config | id, name, gpu_priority_weight, cpu_priority_weight |

### Group F — AI / ML Intelligence

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ai_interaction_history` | Every AI call logged | interaction_type, input_data (JSONB), ai_model, ai_response (JSONB), ai_confidence, user_decision, outcome, response_time_ms, cache_hit |
| `successful_build_patterns` | Builds that resulted in purchases | build_hash, components_json, purchase_count, user_satisfaction_avg, compatibility_score, return_rate |
| `compatibility_learning_data` | AI vs deterministic comparison | deterministic_compatible, ai_predicted_compatible, ai_confidence, actual_outcome, ai_was_correct |
| `ai_learned_patterns` | Patterns discovered by ML | pattern_type, pattern_rule (JSONB), confidence_score, success_rate, is_active |
| `ai_admin_feedback` | Admin corrections to AI | accuracy_rating, corrected_recommendation, should_use_for_training |
| `build_embeddings` | 384-dim semantic embeddings for builds | semantic_description, use_case_tags, embedding (JSONB), embedding_model |
| `component_embeddings` | 384-dim semantic embeddings per component | same structure |
| `user_persona_profiles` | Behavioral user profiles | persona_type, primary_use_case, budget_range (JSONB), experience_level, browsing_patterns (JSONB) |
| `ai_prompt_templates` | Versioned prompt templates | template_name, template_version, system_prompt, usage_count, success_count, avg_confidence |
| `ai_ab_experiments` | A/B testing for prompts | experiment_name, variant metrics, winner |
| `ml_model_versions` | Trained model registry | model_name, base_model, version, validation_accuracy, status |
| `ml_training_sessions` | Training run history | model_version_id, epochs, learning_rate, progress_percent, status |
| `ml_daily_metrics` | Daily ML performance KPIs | total_interactions, accuracy_rate, cache_hit_rate, conversion_rate |
| `ml_knowledge_base` | Q&A knowledge base for AI | category, question, answer, confidence_score, usage_count |

### Group G — Audit, Logging & Monitoring

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `audit_logs` | All state-changing operations | user_id, action, entity_type, entity_id, old_value (JSONB), new_value (JSONB), created_at |
| `price_history` | Historical pricing data | product_id, old_price, new_price, changed_at |
| `historical_patterns` | User behavior mining | pattern_type, pattern_data (JSONB), frequency, confidence |

### Group H — Communication & Notifications

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `messages` | User messaging | sender_id, recipient_id, content, read_at |
| `notifications` | System notifications | user_id, type, title, message, read_at |
| `assistance_requests` | Kiosk help requests | session_id, request_type, status, assigned_to |
| `admin_feedback` | Admin feedback collection | admin_id, feedback_type, content, created_at |

### Group I — System Configuration

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `settings` | System-wide config | key, value, category, description |
| `ip_access_list` | IP whitelist/blacklist | ip_address, access_type, reason, created_by |

---

## 2. ERD-STYLE RELATIONSHIP EXPLANATION

```
users
  ├─ id (PK)
  └─ orders.assisted_by (FK) ──────────────────────────────────┐
                                                                │
pc_parts                                                        │
  ├─ id (PK)                                                    │
  ├─ cpu_specs.part_id (FK)                                     │
  ├─ gpu_specs.part_id (FK)                                     │
  ├─ motherboard_specs.part_id (FK)                             │
  ├─ ram_specs.part_id (FK)                                     │
  ├─ storage_specs.part_id (FK)                                 │
  ├─ psu_specs.part_id (FK)                                     │
  ├─ case_specs.part_id (FK)                                    │
  ├─ cooling_specs.part_id (FK)                                 │
  ├─ compatibility_matrix.component_a_id (FK)                   │
  ├─ compatibility_matrix.component_b_id (FK)                   │
  └─ pc_customized_ai_reference_builds.cpu_id etc (FK)         │
                                                                │
orders ◄───────────────────────────────────────────────────────┘
  ├─ id (PK)
  ├─ status: pending → serving → completed/cancelled
  ├─ cart_items: JSONB (array of {product_id, name, price, qty})
  └─ queue.order_id (FK)

compatibility_rules
  └─ id (PK)
     (Standalone — applied programmatically against pc_parts data)

pc_customized_ai_reference_builds
  ├─ id (PK)
  ├─ build_key (UNIQUE)
  ├─ cpu_id → pc_parts.id (FK)
  ├─ gpu_id → pc_parts.id (FK)
  ├─ motherboard_id → pc_parts.id (FK)
  ├─ ram_id → pc_parts.id (FK)
  ├─ storage_id → pc_parts.id (FK)
  ├─ psu_id → pc_parts.id (FK)
  ├─ case_id → pc_parts.id (FK)
  └─ cooling_id → pc_parts.id (FK)

ai_interaction_history
  ├─ id (PK)
  └─ compatibility_learning_data.interaction_history_id (FK)
```

---

## 3. DATA FLOW EXPLANATION

### Flow 1: Kiosk PC Parts Order

```
Frontend (K-Wise React)
  ↓ GET /api/kiosk/categories
  ↓ GET /api/kiosk/categories/:cat/products
Backend (Express)
  ↓ kioskController.getCategoryProducts()
  ↓ SELECT * FROM pc_parts WHERE category = $1 AND is_active = TRUE AND stock > 0
PostgreSQL (KWiseDB) → pc_parts table
  ↓ Returns product list with specs + images
Frontend renders product grid
  ↓ User adds to cart (localStorage)
  ↓ POST /api/orders { cart_items, payment_method }
Backend (Express)
  ↓ ordersController.createOrder()
  ↓ BEGIN TRANSACTION
  ↓ INSERT INTO orders (cart_items, total_amount, status='pending')
  ↓ INSERT INTO queue (order_id, queue_number)
  ↓ COMMIT
Frontend → /queuing-display with queue number
  ↓ Socket.IO real-time: admin completes order
  ↓ UPDATE orders SET status='completed' WHERE id = $1
```

### Flow 2: AI Build Recommendation

```
Frontend (CustomizeAI.jsx)
  ↓ User completes 6-step questionnaire
    (usage: gaming, budget: 35000, performance: balanced, gaming: aaa-games)
  ↓ GET /api/pc-customized-ai-builds/all
Backend (Express)
  ↓ pcCustomizedAIBuildsController.getAllBuilds()
  ↓ SELECT * FROM pc_customized_ai_reference_builds
    WHERE is_active = TRUE
PostgreSQL → pc_customized_ai_reference_builds
  ↓ Returns 20+ pre-generated builds
Frontend matches user profile to best build (client-side scoring)
  ↓ GET /api/kiosk/categories/:cat/products (for each component)
  ↓ Maps component IDs → full product details (name, price, image, stock)
Frontend renders complete build (CPU + GPU + MOBO + RAM + Storage + PSU + Case + Cooler)
  ↓ User can swap components via EditBuild.jsx
  ↓ POST /api/compatibility/analyze (check new component)
Backend (Express)
  ↓ compatibilityService.analyze()
    1. Check compatibility_cache (cache_key = MD5(build_components))
    2. If cache miss: compatibilityRules.js (23 deterministic rules)
    3. If inconclusive: ollamaService → Ollama DeepSeek R1 (local AI)
    4. MLCompatibilityScorer.js (2,513 pattern rules)
    5. Synthesize result → INSERT INTO compatibility_cache
PostgreSQL → compatibility_cache, compatibility_rules, pc_parts
  ↓ Returns { compatible: true/false, score: 0-100, issues: [...], suggestions: [...] }
Frontend shows CompatibilityBadge + warnings
User confirms → Order flow (see Flow 1)
```

### Flow 3: Admin Dashboard Stats

```
Frontend (Dashboard.js)
  ↓ GET /api/dashboard/stats
Backend (Express)
  ↓ dashboardController.getStats()
  ↓ PARALLEL QUERIES:
    - SELECT COUNT(*), SUM(total_amount) FROM orders (by status)
    - SELECT COUNT(*), COUNT(DISTINCT role) FROM users
    - SELECT COUNT(*), SUM(price * stock) FROM pc_parts
    - SELECT COUNT(*) FROM pc_parts WHERE stock < 5 (low stock)
    - SELECT name, SUM(qty) FROM orders GROUP BY (top products)
PostgreSQL → orders, users, pc_parts tables
  ↓ Returns aggregated stats in single response
Frontend renders stats cards + Recharts graphs (line, bar, pie)
  ↓ SSE: /api/realtime/orders updates order count in real-time
```

---

## 4. KEY INDEXES (Performance Optimization)

| Table | Index Name | Columns | Purpose |
|-------|-----------|---------|---------|
| pc_parts | idx_pc_parts_category | category | Fast category filtering |
| pc_parts | idx_pc_parts_active | is_active | Exclude inactive products |
| pc_parts | idx_pc_parts_tier | tier | Tier-based queries |
| pc_parts | idx_pc_parts_compatibility_data | compatibility_data (GIN) | JSONB search |
| pc_parts | idx_pc_parts_physical_dimensions | physical_dimensions (GIN) | Dimensions JSONB |
| compatibility_rules | idx_compatibility_rules_category | rule_category | Rule filtering |
| compatibility_rules | idx_compatibility_rules_priority | priority | Ordered rule evaluation |
| compatibility_cache | idx_cache_key | cache_key | Cache lookup speed |
| compatibility_cache | idx_expires_at | expires_at | Cache expiry cleanup |
| orders | idx_orders_status | status | Queue filtering |
| orders | idx_orders_created | created_at | Date-range queries |

---

## 5. DATABASE MIGRATION HISTORY

The database is version-controlled via **67+ migration files** in `KWise-Backend/migrations/` and `KWise-Backend/sql/migrations/`:

| Migration Phase | What Changed |
|----------------|-------------|
| Phase 1-5 | Core tables: pc_parts, users, orders, queue, audit_logs |
| Phase 6-8 | Component spec tables (cpu_specs, gpu_specs, etc.) |
| Phase 9 | JSON Schema validation for compatibility API |
| Phase 10 | Compatibility cache (3-5x speedup) |
| Phase 11 | 23-rule deterministic compatibility system |
| Phase 12-15 | Advanced compatibility tables (cpu_compatibility, case_compatibility, etc.) |
| Phase 16-20 | Compatibility rules population (1000+ rules in JSONL batches) |
| Phase 21-25 | AI tables (ai_interaction_history, successful_build_patterns) |
| Phase 26-30 | ML tables (ml_model_versions, ml_training_sessions, ml_daily_metrics) |
| Phase 31-35 | PC Customized AI build system tables |
| Phase 36-40 | Physical clearance and thermal rules |
| Phase 41+ | Embedding tables, persona profiles, prompt templates, A/B experiments |

---

## 6. WHAT TO SHOW DURING PRESENTATION

**Most impactful database moments:**

1. `\dt` — Show the **133-table** list (demonstrates scale and planning)
2. `\d pc_parts` — Show JSONB columns (specifications, dimensions, compatible_sockets, kiosk_metadata), 35+ indexes, and 2 triggers — demonstrates modern PostgreSQL use
3. `SELECT COUNT(*) FROM compatibility_rules;` — **3,200 rules** (key differentiator — say this number clearly)
4. `SELECT rule_category, COUNT(*) FROM compatibility_rules WHERE enabled=true GROUP BY rule_category ORDER BY count DESC;` — Shows rule engine depth
5. `\d pc_customized_ai_reference_builds` — Show all 8 FK references to pc_parts (cpu_id, gpu_id, motherboard_id, etc.) — demonstrates relational design
6. `SELECT category, COUNT(*), AVG(price)::NUMERIC(10,2) FROM pc_parts WHERE is_active=true GROUP BY category ORDER BY count DESC;` — **429 products, 15 categories**
7. `SELECT status, COUNT(*) FROM orders GROUP BY status;` — **382 orders** in the system

---

## 7. VERIFIED REAL DATABASE STATISTICS (from live psql)

| Metric | Value |
|--------|-------|
| Total tables | **133** |
| Database triggers | **48** |
| pc_parts (products) | **429** |
| users | **20** |
| orders | **382** |
| compatibility_rules | **3,200** |
| Product categories | 15 (CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooling, Monitor, Pre-Built, Mouse, Keyboard, Headphones, Webcam, Speakers) |
| Product tiers | 5 (Starter, Entry, Mid Tier, High Tier, Elite) |
| Orders pending | 202 |
| Orders completed | 55 |
| Orders cancelled | 125 |
| ai_audit_logs size | **134 MB** |
| ip_logs size | 95 MB |
| compatibility_logs size | 54 MB |

### Compatibility Rules by Category (real data)
| Category | Rule Count |
|----------|-----------|
| thermal | 663 |
| compatibility | 643 |
| physical | 376 |
| power | 299 |
| pcie | 226 |
| memory | 221 |
| performance | 218 |
| bios | 214 |
| storage | 190 |
| socket | 103 |
| chipset | 47 |
| **TOTAL** | **3,200** |

### Products by Category (real data)
| Category | Count | Avg Price (₱) | Total Stock |
|----------|-------|---------------|-------------|
| Cooling | 60 | 2,861 | 739 |
| Motherboard | 54 | 9,223 | 1,951 |
| GPU | 45 | 28,180 | 748 |
| Case | 35 | 2,208 | 602 |
| CPU | 34 | 12,153 | 491 |
| RAM | 29 | 5,907 | 567 |
| Storage | 29 | 4,407 | 486 |
| PSU | 28 | 4,935 | 514 |
| Monitor | 28 | 7,833 | 635 |
| Pre-Built | 18 | 49,763 | 176 |
| Mouse | 12 | 1,100 | 183 |
| Keyboard | 12 | 1,341 | 165 |
| Headphones | 6 | 1,333 | 68 |
| Webcam | 5 | 3,223 | 159 |
| Speakers | 4 | 762 | 31 |

### Notable Database Triggers (48 total)
- `price_change_trigger` on pc_parts — logs every price change to price_history
- `trigger_update_queue_status` on orders — syncs queue status when order status changes
- `rule_version_trigger` on compatibility_rules — records version history on every update
- `trigger_auto_block_suspicious_ip` on ip_access_control — automatic IP blocking
- `trigger_audit_log_activity` on audit_logs — cascades all activity to central log
