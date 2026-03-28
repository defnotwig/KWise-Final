-- =====================================================
-- COMMUNITY BUILD SUPPORT MIGRATION
-- =====================================================
-- Adds all necessary fields to pc_parts table to support
-- Community Builds functionality
-- Date: November 17, 2025
-- =====================================================

-- 1. Ensure 'Pre-Built' category exists and is allowed
DO $$ 
BEGIN
    -- Check if pc_parts category constraint exists and includes 'Pre-Built'
    -- If not, drop old constraint and create new one
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'pc_parts' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%category%check'
    ) THEN
        -- Drop existing category constraint
        ALTER TABLE pc_parts DROP CONSTRAINT IF EXISTS pc_parts_category_check;
        RAISE NOTICE 'Dropped old category constraint';
    END IF;
    
    -- Add new comprehensive category constraint including Pre-Built
    ALTER TABLE pc_parts ADD CONSTRAINT pc_parts_category_check 
    CHECK (category IN (
        'CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling',
        'Headphones', 'Keyboard', 'Mouse', 'Speakers', 'Webcam', 'Monitor',
        'Pre-Built'  -- ✅ Added for Community Builds
    ));
    RAISE NOTICE 'Added new category constraint with Pre-Built support';
END $$;

-- 2. Add description field (TEXT) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pc_parts' AND column_name = 'description'
    ) THEN
        ALTER TABLE pc_parts ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;
END $$;

-- 3. Add specifications field (JSONB) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pc_parts' AND column_name = 'specifications'
    ) THEN
        ALTER TABLE pc_parts ADD COLUMN specifications JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added specifications column';
    END IF;
END $$;

-- 4. Add tier field (VARCHAR) if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pc_parts' AND column_name = 'tier'
    ) THEN
        ALTER TABLE pc_parts ADD COLUMN tier VARCHAR(50);
        RAISE NOTICE 'Added tier column';
    END IF;
END $$;

-- 5. Ensure kiosk_visible field exists (from migration 011)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pc_parts' AND column_name = 'kiosk_visible'
    ) THEN
        ALTER TABLE pc_parts ADD COLUMN kiosk_visible BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added kiosk_visible column';
    END IF;
END $$;

-- 6. Ensure is_active field exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pc_parts' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE pc_parts ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    END IF;
END $$;

-- 7. Add tier constraint to ensure valid values
-- First, update any existing tier values to match the new constraint
UPDATE pc_parts 
SET tier = CASE 
    WHEN LOWER(tier) LIKE '%entry%' OR LOWER(tier) LIKE '%starter%' OR LOWER(tier) LIKE '%budget%' THEN 'Entry'
    WHEN LOWER(tier) LIKE '%mid%' THEN 'Mid Tier'
    WHEN LOWER(tier) LIKE '%high%' THEN 'High Tier'
    WHEN LOWER(tier) LIKE '%elite%' OR LOWER(tier) LIKE '%enthusiast%' THEN 'Elite'
    ELSE NULL
END
WHERE tier IS NOT NULL 
  AND tier NOT IN ('Starter', 'Entry', 'Mid Tier', 'High Tier', 'Elite');

-- Now add the constraint
ALTER TABLE pc_parts DROP CONSTRAINT IF EXISTS tier_classification_check;
ALTER TABLE pc_parts DROP CONSTRAINT IF EXISTS pc_parts_tier_check;
ALTER TABLE pc_parts ADD CONSTRAINT tier_classification_check 
    CHECK (tier IS NULL OR tier IN ('Starter', 'Entry', 'Mid Tier', 'High Tier', 'Elite'));

-- 8. Create indexes for Community Build queries
CREATE INDEX IF NOT EXISTS idx_pc_parts_specifications_gin 
    ON pc_parts USING gin(specifications);

CREATE INDEX IF NOT EXISTS idx_pc_parts_tier 
    ON pc_parts(tier) WHERE tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pc_parts_category_prebuilt 
    ON pc_parts(category) WHERE category = 'Pre-Built';

CREATE INDEX IF NOT EXISTS idx_pc_parts_community_builds 
    ON pc_parts(category, (specifications->>'buildSource')) 
    WHERE category = 'Pre-Built' AND specifications->>'buildSource' = 'community';

CREATE INDEX IF NOT EXISTS idx_pc_parts_approval_status 
    ON pc_parts((specifications->>'approvalStatus')) 
    WHERE category = 'Pre-Built' AND specifications->>'buildSource' = 'community';

-- 9. Add comments for documentation
COMMENT ON COLUMN pc_parts.description IS 'Detailed description of the product or build';
COMMENT ON COLUMN pc_parts.specifications IS 'JSONB field storing product specifications and build metadata. For Community Builds: {buildType, buildSource, approvalStatus, components, purposes, customizations, baseProductId, submittedAt}';
COMMENT ON COLUMN pc_parts.tier IS 'Product/Build tier classification: Starter, Entry, Mid Tier, High Tier, Elite';
COMMENT ON COLUMN pc_parts.kiosk_visible IS 'Whether this product should appear in kiosk interface';
COMMENT ON COLUMN pc_parts.is_active IS 'Whether this product is active and available for sale';

-- 10. Verify schema is correct
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    -- Check for required columns
    SELECT ARRAY_AGG(column_name) INTO missing_columns
    FROM (VALUES 
        ('description'),
        ('specifications'),
        ('tier'),
        ('kiosk_visible'),
        ('is_active')
    ) AS required(column_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pc_parts' 
        AND columns.column_name = required.column_name
    );
    
    IF missing_columns IS NOT NULL THEN
        RAISE EXCEPTION 'Missing required columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist for Community Build support';
    END IF;
END $$;

-- 11. Display final schema for pc_parts
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pc_parts'
ORDER BY ordinal_position;
