-- =====================================================
-- MIGRATION 021: FIX POWERLOGIC SLIM CASE GPU CLEARANCE
-- =====================================================
-- CRITICAL FIX: The POWERLOGIC SLIM case has been incorrectly specified
-- with 260mm max GPU length. Based on user testing and real-world specs,
-- this slim Micro-ATX case can only accommodate GPUs up to 250mm.
--
-- Issue: ARC B580 GPU (285mm) shows as compatible but WILL NOT FIT
-- Root Cause: dimensions.max_gpu_length_mm = 260mm (INCORRECT)
-- Fix: Update to 250mm (CORRECT specification for slim cases)
-- =====================================================

-- Update the dimensions JSONB column with correct specifications
UPDATE pc_parts 
SET dimensions = '{
    "max_gpu_length_mm": 250,
    "max_cooler_height_mm": 140,
    "form_factor": "Micro-ATX",
    "expansion_slots": 3,
    "max_psu_length_mm": 160,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 1},
    "fan_mounts": {"front": 1, "rear": 1, "top": 0},
    "note": "Slim design for compact builds - VERY limited GPU clearance"
}'::jsonb 
WHERE name ILIKE '%POWERLOGIC SLIM%' 
AND category = 'Case';

-- Verification query to confirm the fix
SELECT 
    name,
    category,
    price,
    dimensions->>'max_gpu_length_mm' as max_gpu_length,
    dimensions->>'max_cooler_height_mm' as max_cooler_height,
    dimensions->>'form_factor' as form_factor,
    dimensions->>'note' as note
FROM pc_parts 
WHERE name ILIKE '%POWERLOGIC SLIM%' 
AND category = 'Case';

-- =====================================================
-- EXPECTED OUTPUT:
-- name              | max_gpu_length | max_cooler_height | form_factor | note
-- POWERLOGIC SLIM   | 250           | 140               | Micro-ATX   | Slim design...
-- =====================================================
