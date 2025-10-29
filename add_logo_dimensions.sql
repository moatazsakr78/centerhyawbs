-- Migration to add logo dimension fields to company_settings table
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS logo_width INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS logo_height INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS logo_width_compact INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS logo_height_compact INTEGER DEFAULT 40;
