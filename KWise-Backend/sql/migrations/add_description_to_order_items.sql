-- Migration: Add description column to order_items table
-- Purpose: Store assessment details, PC re-case requests, and other order item metadata
-- Date: 2025-10-29
-- Author: K-Wise System

-- Add description column to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for faster searching on description
CREATE INDEX IF NOT EXISTS idx_order_items_description ON order_items(description);

-- Add comment to explain the column purpose
COMMENT ON COLUMN order_items.description IS 'Stores assessment details, PC re-case requests, diagnostic issues, and other order item metadata';
