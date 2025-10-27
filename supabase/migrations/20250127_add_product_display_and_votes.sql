-- Create product_display_settings table
CREATE TABLE IF NOT EXISTS product_display_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_mode VARCHAR(50) NOT NULL DEFAULT 'show_all',
  -- Options: 'show_all', 'show_with_stock', 'show_with_stock_and_vote'

  selected_warehouses UUID[] DEFAULT ARRAY[]::UUID[],
  -- Array of warehouse IDs to check for inventory

  selected_branches UUID[] DEFAULT ARRAY[]::UUID[],
  -- Array of branch IDs to check for inventory

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO product_display_settings (display_mode, selected_warehouses, selected_branches)
VALUES ('show_all', ARRAY[]::UUID[], ARRAY[]::UUID[])
ON CONFLICT DO NOTHING;

-- Create product_votes table for voting on out-of-stock products
CREATE TABLE IF NOT EXISTS product_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_identifier VARCHAR(255) NOT NULL,
  -- Can be user_id, session_id, or IP address for anonymous users

  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no')),
  -- 'yes' = want product restocked, 'no' = don't want it

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one vote per user per product
  UNIQUE(product_id, user_identifier)
);

-- Create indexes for performance
CREATE INDEX idx_product_votes_product_id ON product_votes(product_id);
CREATE INDEX idx_product_votes_user ON product_votes(user_identifier);
CREATE INDEX idx_product_votes_created_at ON product_votes(created_at);

-- Create function to get vote statistics for a product
CREATE OR REPLACE FUNCTION get_product_vote_stats(p_product_id UUID)
RETURNS TABLE (
  total_votes BIGINT,
  yes_votes BIGINT,
  no_votes BIGINT,
  yes_percentage NUMERIC,
  no_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_votes,
    COUNT(*) FILTER (WHERE vote = 'yes')::BIGINT as yes_votes,
    COUNT(*) FILTER (WHERE vote = 'no')::BIGINT as no_votes,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE vote = 'yes')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
      ELSE 0
    END as yes_percentage,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE vote = 'no')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
      ELSE 0
    END as no_percentage
  FROM product_votes
  WHERE product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user has voted
CREATE OR REPLACE FUNCTION has_user_voted(p_product_id UUID, p_user_identifier VARCHAR)
RETURNS TABLE (
  has_voted BOOLEAN,
  vote VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM product_votes WHERE product_id = p_product_id AND user_identifier = p_user_identifier) as has_voted,
    (SELECT pv.vote FROM product_votes pv WHERE pv.product_id = p_product_id AND pv.user_identifier = p_user_identifier LIMIT 1) as vote;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_product_display_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_display_settings_updated_at
  BEFORE UPDATE ON product_display_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_product_display_settings_updated_at();

-- RLS Policies (everyone can read, only authenticated users can update settings)
ALTER TABLE product_display_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_votes ENABLE ROW LEVEL SECURITY;

-- Allow public to read display settings
CREATE POLICY "Allow public read access to display settings"
  ON product_display_settings FOR SELECT
  USING (true);

-- Allow authenticated users to update settings
CREATE POLICY "Allow authenticated users to update display settings"
  ON product_display_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow public to read votes
CREATE POLICY "Allow public read access to votes"
  ON product_votes FOR SELECT
  USING (true);

-- Allow public to insert votes (anonymous users can vote)
CREATE POLICY "Allow public to insert votes"
  ON product_votes FOR INSERT
  WITH CHECK (true);

-- Users can only update their own votes (but votes are immutable in our design)
CREATE POLICY "Users can view their own votes"
  ON product_votes FOR SELECT
  USING (true);
