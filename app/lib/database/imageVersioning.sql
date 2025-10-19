-- Image versioning system for products
-- Maintains complete history of all product images with versioning

-- Table to store image versions for products
CREATE TABLE IF NOT EXISTS product_image_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('main', 'sub', 'variant', 'additional')),
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  storage_bucket TEXT NOT NULL,
  public_url TEXT NOT NULL,
  is_current BOOLEAN DEFAULT true,
  upload_context TEXT, -- 'admin', 'user', 'import', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID, -- Reference to user who uploaded
  replaced_at TIMESTAMPTZ, -- When this version was replaced
  replaced_by UUID  -- Reference to the version that replaced this
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_image_versions_product_id ON product_image_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_image_versions_current ON product_image_versions(product_id, image_type, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_product_image_versions_created_at ON product_image_versions(created_at DESC);

-- Table to store current image mappings for quick access (denormalized for performance)
CREATE TABLE IF NOT EXISTS product_current_images (
  product_id UUID NOT NULL,
  main_image_id UUID,
  main_image_url TEXT,
  sub_image_id UUID, 
  sub_image_url TEXT,
  additional_images JSONB DEFAULT '[]', -- Array of {id, url, type}
  variant_images JSONB DEFAULT '[]',   -- Array of {id, url, variant_id, color_hex}
  last_updated TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (product_id)
);

-- Function to update current images cache when versions change
CREATE OR REPLACE FUNCTION update_current_images_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert current images for the product
  INSERT INTO product_current_images (
    product_id,
    main_image_id,
    main_image_url,
    sub_image_id,
    sub_image_url,
    additional_images,
    variant_images,
    last_updated
  )
  SELECT 
    p.id as product_id,
    main_img.id as main_image_id,
    main_img.public_url as main_image_url,
    sub_img.id as sub_image_id,
    sub_img.public_url as sub_image_url,
    COALESCE(additional_imgs.images, '[]'::jsonb) as additional_images,
    COALESCE(variant_imgs.images, '[]'::jsonb) as variant_images,
    now() as last_updated
  FROM products p
  LEFT JOIN product_image_versions main_img ON (
    main_img.product_id = p.id 
    AND main_img.image_type = 'main' 
    AND main_img.is_current = true
  )
  LEFT JOIN product_image_versions sub_img ON (
    sub_img.product_id = p.id 
    AND sub_img.image_type = 'sub' 
    AND sub_img.is_current = true
  )
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', piv.id,
        'url', piv.public_url,
        'type', piv.image_type,
        'version', piv.version_number
      )
    ) as images
    FROM product_image_versions piv 
    WHERE piv.product_id = p.id 
    AND piv.image_type = 'additional' 
    AND piv.is_current = true
  ) additional_imgs ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', piv.id,
        'url', piv.public_url,
        'type', piv.image_type,
        'version', piv.version_number,
        'metadata', piv.metadata
      )
    ) as images
    FROM product_image_versions piv 
    WHERE piv.product_id = p.id 
    AND piv.image_type = 'variant' 
    AND piv.is_current = true
  ) variant_imgs ON true
  WHERE p.id = COALESCE(NEW.product_id, OLD.product_id)
  ON CONFLICT (product_id) DO UPDATE SET
    main_image_id = EXCLUDED.main_image_id,
    main_image_url = EXCLUDED.main_image_url,
    sub_image_id = EXCLUDED.sub_image_id,
    sub_image_url = EXCLUDED.sub_image_url,
    additional_images = EXCLUDED.additional_images,
    variant_images = EXCLUDED.variant_images,
    last_updated = EXCLUDED.last_updated;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update cache when image versions change
CREATE OR REPLACE TRIGGER trigger_update_current_images_cache
  AFTER INSERT OR UPDATE OR DELETE ON product_image_versions
  FOR EACH ROW EXECUTE FUNCTION update_current_images_cache();

-- Function to add new image version
CREATE OR REPLACE FUNCTION add_product_image_version(
  p_product_id UUID,
  p_image_type TEXT,
  p_file_path TEXT,
  p_file_name TEXT,
  p_original_name TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL,
  p_mime_type TEXT DEFAULT NULL,
  p_storage_bucket TEXT DEFAULT 'main-products-pos-images',
  p_public_url TEXT DEFAULT NULL,
  p_upload_context TEXT DEFAULT 'admin',
  p_metadata JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_new_version_id UUID;
  v_public_url TEXT;
BEGIN
  -- Generate public URL if not provided
  IF p_public_url IS NULL THEN
    v_public_url := 'https://hecedrbnbknohssgaoso.supabase.co/storage/v1/object/public/' || p_storage_bucket || '/' || p_file_path;
  ELSE
    v_public_url := p_public_url;
  END IF;

  -- Get next version number for this product and image type
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM product_image_versions
  WHERE product_id = p_product_id AND image_type = p_image_type;

  -- Mark existing current version as not current
  UPDATE product_image_versions
  SET 
    is_current = false,
    replaced_at = now()
  WHERE product_id = p_product_id 
  AND image_type = p_image_type 
  AND is_current = true;

  -- Insert new version
  INSERT INTO product_image_versions (
    product_id,
    image_type,
    version_number,
    file_path,
    file_name,
    original_name,
    file_size,
    mime_type,
    storage_bucket,
    public_url,
    is_current,
    upload_context,
    metadata,
    created_by
  ) VALUES (
    p_product_id,
    p_image_type,
    v_version_number,
    p_file_path,
    p_file_name,
    p_original_name,
    p_file_size,
    p_mime_type,
    p_storage_bucket,
    v_public_url,
    true,
    p_upload_context,
    p_metadata,
    p_created_by
  ) RETURNING id INTO v_new_version_id;

  -- Update replaced_by for previous version
  UPDATE product_image_versions
  SET replaced_by = v_new_version_id
  WHERE product_id = p_product_id 
  AND image_type = p_image_type 
  AND version_number = v_version_number - 1;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get current images for a product
CREATE OR REPLACE FUNCTION get_product_current_images(p_product_id UUID)
RETURNS TABLE (
  main_image_url TEXT,
  sub_image_url TEXT,
  additional_images JSONB,
  variant_images JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pci.main_image_url,
    pci.sub_image_url,
    pci.additional_images,
    pci.variant_images
  FROM product_current_images pci
  WHERE pci.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get image history for a product
CREATE OR REPLACE FUNCTION get_product_image_history(
  p_product_id UUID,
  p_image_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  image_type TEXT,
  version_number INTEGER,
  public_url TEXT,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ,
  replaced_at TIMESTAMPTZ,
  upload_context TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    piv.id,
    piv.image_type,
    piv.version_number,
    piv.public_url,
    piv.is_current,
    piv.created_at,
    piv.replaced_at,
    piv.upload_context,
    piv.metadata
  FROM product_image_versions piv
  WHERE piv.product_id = p_product_id
  AND (p_image_type IS NULL OR piv.image_type = p_image_type)
  ORDER BY piv.image_type, piv.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE product_image_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_current_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your authentication setup)
CREATE POLICY "Allow read access to product image versions" ON product_image_versions
  FOR SELECT USING (true);

CREATE POLICY "Allow insert/update for authenticated users" ON product_image_versions
  FOR ALL USING (true);

CREATE POLICY "Allow read access to current images" ON product_current_images
  FOR SELECT USING (true);

CREATE POLICY "Allow insert/update current images" ON product_current_images
  FOR ALL USING (true);

-- Initial migration to populate versioning table from existing products
-- This will run once to migrate existing images to the versioning system
INSERT INTO product_image_versions (
  product_id,
  image_type,
  version_number,
  file_path,
  file_name,
  storage_bucket,
  public_url,
  is_current,
  upload_context,
  created_at
)
SELECT 
  p.id as product_id,
  'main' as image_type,
  1 as version_number,
  COALESCE(
    SUBSTRING(p.main_image_url FROM '.*/([^/]+)$'),
    'legacy_' || p.id || '.jpg'
  ) as file_path,
  COALESCE(
    SUBSTRING(p.main_image_url FROM '.*/([^/]+)$'),
    'legacy_' || p.id || '.jpg'  
  ) as file_name,
  'main-products-pos-images' as storage_bucket,
  p.main_image_url as public_url,
  true as is_current,
  'migration' as upload_context,
  p.created_at
FROM products p
WHERE p.main_image_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM product_image_versions piv 
  WHERE piv.product_id = p.id AND piv.image_type = 'main'
);

-- Migrate sub images
INSERT INTO product_image_versions (
  product_id,
  image_type,
  version_number,
  file_path,
  file_name,
  storage_bucket,
  public_url,
  is_current,
  upload_context,
  created_at
)
SELECT 
  p.id as product_id,
  'sub' as image_type,
  1 as version_number,
  COALESCE(
    SUBSTRING(p.sub_image_url FROM '.*/([^/]+)$'),
    'legacy_sub_' || p.id || '.jpg'
  ) as file_path,
  COALESCE(
    SUBSTRING(p.sub_image_url FROM '.*/([^/]+)$'),
    'legacy_sub_' || p.id || '.jpg'
  ) as file_name,
  'sub-products-pos-images' as storage_bucket,
  p.sub_image_url as public_url,
  true as is_current,
  'migration' as upload_context,
  p.created_at
FROM products p
WHERE p.sub_image_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM product_image_versions piv 
  WHERE piv.product_id = p.id AND piv.image_type = 'sub'
);

-- Comments
COMMENT ON TABLE product_image_versions IS 'Complete history of all product images with versioning support';
COMMENT ON TABLE product_current_images IS 'Denormalized cache of current product images for fast access';
COMMENT ON FUNCTION add_product_image_version IS 'Add new version of product image, automatically handling version numbers';
COMMENT ON FUNCTION get_product_current_images IS 'Get current active images for a product';
COMMENT ON FUNCTION get_product_image_history IS 'Get complete version history for product images';