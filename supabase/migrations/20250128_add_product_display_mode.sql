-- Add product_display_mode column to system_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings'
    AND column_name = 'product_display_mode'
  ) THEN
    ALTER TABLE system_settings
    ADD COLUMN product_display_mode TEXT DEFAULT 'all' CHECK (product_display_mode IN ('all', 'in_stock', 'in_stock_with_voting'));

    -- Update existing record
    UPDATE system_settings
    SET product_display_mode = 'all'
    WHERE id = 1;
  END IF;
END $$;
