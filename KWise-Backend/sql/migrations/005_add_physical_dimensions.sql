-- ============================================================
-- MIGRATION: Add Physical Dimensions to PC Parts
-- PRIORITY: 1 (Critical for 40% → 55% accuracy improvement)
-- ROOT CAUSE FIX: Issues #2 & #3 from Brutal Analysis
-- ============================================================
-- Problem: AI currently GUESSES physical fit (GPU in case, cooler height)
-- Solution: Store real measurements, use math instead of AI guessing
-- Impact: +15% accuracy → +0.3 rating (3.8 → 4.1)
-- ============================================================

-- Step 1: Add dimensions column to pc_parts table
ALTER TABLE pc_parts 
ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}';

-- Step 2: Create index for fast dimension queries
CREATE INDEX IF NOT EXISTS idx_pc_parts_dimensions 
ON pc_parts USING GIN (dimensions);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN pc_parts.dimensions IS 'Physical dimensions and clearance data for compatibility validation. Structure varies by category:
GPU: {length_mm, width_mm, height_mm, slots, tdp_watts, recommended_psu_watts}
Case: {max_gpu_length_mm, max_cooler_height_mm, form_factor, psu_form_factor}
Cooler: {height_mm, width_mm, depth_mm, ram_clearance_mm, socket_support[]}
PSU: {form_factor, length_mm, modular_type}
Motherboard: {form_factor, socket, ram_slots, max_ram_gb}';

-- ============================================================
-- CATEGORY-SPECIFIC DIMENSION SCHEMAS
-- ============================================================

-- GPU Dimensions Schema:
-- {
--   "length_mm": 320,           -- Total card length
--   "width_mm": 140,             -- Card width (usually 2-3 slots)
--   "height_mm": 61,             -- Bracket to top of card
--   "slots": 3,                  -- PCIe slots occupied (2, 2.5, 3, 3.5, 4)
--   "tdp_watts": 450,            -- Thermal Design Power
--   "recommended_psu_watts": 850, -- Minimum PSU wattage
--   "power_connectors": "2x 8-pin" -- Power connector type
-- }

-- Case Dimensions Schema:
-- {
--   "max_gpu_length_mm": 380,   -- Maximum GPU card length supported
--   "max_cooler_height_mm": 165, -- Maximum CPU cooler height
--   "form_factor": "ATX",        -- ATX, Micro-ATX, Mini-ITX
--   "psu_form_factor": "ATX",    -- PSU size support
--   "drive_bays_35": 2,          -- 3.5" HDD bays
--   "drive_bays_25": 4,          -- 2.5" SSD bays
--   "expansion_slots": 7,        -- PCIe slot count
--   "radiator_support": "360mm"  -- Water cooling support
-- }

-- CPU Cooler Dimensions Schema:
-- {
--   "height_mm": 158,            -- Total cooler height
--   "width_mm": 140,             -- Cooler width
--   "depth_mm": 85,              -- Front-to-back depth
--   "ram_clearance_mm": 40,      -- Clearance for tall RAM
--   "socket_support": ["AM4", "AM5", "LGA1700"], -- Compatible sockets
--   "tdp_rating": 220,           -- Max TDP cooling capacity
--   "fan_size_mm": 140           -- Fan diameter
-- }

-- PSU Dimensions Schema:
-- {
--   "form_factor": "ATX",        -- ATX, SFX, SFX-L
--   "length_mm": 160,            -- PSU depth (critical for small cases)
--   "modular_type": "full",      -- full, semi, non-modular
--   "wattage": 850,              -- Power output
--   "efficiency_rating": "80+ Gold"
-- }

-- Motherboard Dimensions Schema:
-- {
--   "form_factor": "ATX",        -- ATX, Micro-ATX, Mini-ITX, E-ATX
--   "socket": "AM5",             -- CPU socket type
--   "ram_slots": 4,              -- Memory slot count
--   "max_ram_gb": 128,           -- Maximum RAM capacity
--   "pcie_slots": 3,             -- PCIe x16 slots
--   "m2_slots": 3,               -- M.2 NVMe slots
--   "length_mm": 305,            -- Standard ATX: 305mm
--   "width_mm": 244              -- Standard ATX: 244mm
-- }

-- ============================================================
-- VALIDATION RULES (will be used by backend)
-- ============================================================

-- GPU fit validation:
-- IF gpu.length_mm > case.max_gpu_length_mm THEN incompatible
-- IF gpu.slots > case.expansion_slots THEN incompatible
-- IF gpu.recommended_psu_watts > psu.wattage THEN warning

-- Cooler fit validation:
-- IF cooler.height_mm > case.max_cooler_height_mm THEN incompatible
-- IF cpu.socket NOT IN cooler.socket_support THEN incompatible
-- IF cooler.ram_clearance_mm < ram.height_mm THEN warning

-- Form factor validation:
-- IF motherboard.form_factor = 'E-ATX' AND case.form_factor != 'E-ATX' THEN incompatible
-- IF case.form_factor = 'Mini-ITX' AND motherboard.form_factor = 'ATX' THEN incompatible

-- ============================================================
-- MIGRATION VERIFICATION QUERIES
-- ============================================================

-- Verify column added:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name='pc_parts' AND column_name='dimensions';

-- Verify index created:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename='pc_parts' AND indexname='idx_pc_parts_dimensions';

-- Count products with dimensions:
-- SELECT category, COUNT(*) as total, 
--        SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END) as with_dimensions
-- FROM pc_parts 
-- WHERE is_active = true 
-- GROUP BY category;

-- ============================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================

-- DROP INDEX IF EXISTS idx_pc_parts_dimensions;
-- ALTER TABLE pc_parts DROP COLUMN IF EXISTS dimensions;

-- ============================================================
-- NEXT STEPS AFTER MIGRATION
-- ============================================================

-- 1. Run this migration: psql -U postgres -d KWiseDB -f 005_add_physical_dimensions.sql
-- 2. Run data population: 006_populate_gpu_dimensions.sql (RTX 40-series, RX 7000-series)
-- 3. Run data population: 007_populate_case_dimensions.sql (Top 50 cases)
-- 4. Run data population: 008_populate_cooler_dimensions.sql (Top 30 coolers)
-- 5. Update advancedCompatibilityService.js to use real dimensions
-- 6. Test with real examples: RTX 4090 + NZXT H510 (should FAIL - too long)
-- 7. Test with real examples: RTX 4060 + NZXT H510 (should PASS - fits)

-- ============================================================
-- EXPECTED IMPACT
-- ============================================================

-- Before: AI guesses GPU fit → 40% accuracy
-- After:  Real math validation → 55% accuracy
-- Rating: 3.8 → 4.1 (+0.3 points)
-- Time:   6-8 hours total (migration + data + service update)

-- ============================================================
