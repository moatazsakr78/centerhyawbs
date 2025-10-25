-- Function to automatically update role when is_admin changes
CREATE OR REPLACE FUNCTION auto_update_role_on_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_admin is set to true, automatically update role to 'أدمن رئيسي'
  IF NEW.is_admin = true AND (OLD.is_admin IS NULL OR OLD.is_admin = false) THEN
    NEW.role = 'أدمن رئيسي';
  END IF;

  -- If is_admin is set to false, and role was 'أدمن رئيسي', change it back to 'عميل'
  IF NEW.is_admin = false AND OLD.role = 'أدمن رئيسي' THEN
    NEW.role = 'عميل';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_update_role ON user_profiles;

-- Create trigger on user_profiles table
CREATE TRIGGER trigger_auto_update_role
  BEFORE INSERT OR UPDATE OF is_admin
  ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_role_on_admin_change();

-- Add comment for documentation
COMMENT ON FUNCTION auto_update_role_on_admin_change() IS 'Automatically updates user role to أدمن رئيسي when is_admin is set to true';
COMMENT ON TRIGGER trigger_auto_update_role ON user_profiles IS 'Triggers role update when is_admin field changes';
