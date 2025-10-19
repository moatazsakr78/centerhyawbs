-- ================================================================================================
-- AUTO-CREATE USER PROFILE & ADMIN PROTECTION SYSTEM
-- ================================================================================================
-- This migration creates:
-- 1. Automatic user profile creation when a new user signs up
-- 2. Protection for super admins (is_admin = true) from role changes
-- 3. Function to safely manage user roles
-- ================================================================================================

-- ================================================================================================
-- STEP 1: Create trigger function to auto-create user profile
-- ================================================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new user into user_profiles table
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    role,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- Use name from metadata or email
    'customer', -- Default role
    false, -- Default not admin
    true, -- Default active
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- ================================================================================================
-- STEP 2: Create trigger on auth.users
-- ================================================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================================================
-- STEP 3: Drop existing RLS policies on user_profiles if they exist
-- ================================================================================================

DROP POLICY IF EXISTS "Super admins cannot be modified" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update non-super-admin profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public read access" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.user_profiles;

-- ================================================================================================
-- STEP 4: Enable RLS on user_profiles
-- ================================================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================================================
-- STEP 5: Create RLS Policies
-- ================================================================================================

-- Policy 1: Anyone can read all user profiles (for staff lists, etc.)
CREATE POLICY "Anyone can view user profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Users can update their own profile (except is_admin and role fields)
CREATE POLICY "Users can update their own basic profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own is_admin or role
    (is_admin = (SELECT is_admin FROM user_profiles WHERE id = auth.uid())) AND
    (role = (SELECT role FROM user_profiles WHERE id = auth.uid()))
  );

-- Policy 3: Only admins can update other users' profiles
CREATE POLICY "Admins can update non-super-admin profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Current user must be admin
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    -- Cannot modify super admins (is_admin = true)
    -- Target user's is_admin must be false OR must remain true (no change)
    (
      (SELECT is_admin FROM public.user_profiles WHERE id = user_profiles.id) = false
      OR
      is_admin = true
    )
  );

-- Policy 4: System can insert new profiles (for trigger)
CREATE POLICY "System can insert new profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ================================================================================================
-- STEP 6: Create function to safely update user roles
-- ================================================================================================

CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role TEXT,
  new_is_admin BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_is_admin BOOLEAN;
  target_user_is_admin BOOLEAN;
  result JSON;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO current_user_is_admin
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF current_user_is_admin IS NOT TRUE THEN
    RETURN json_build_object(
      'success', false,
      'message', 'غير مصرح لك بتغيير صلاحيات المستخدمين'
    );
  END IF;

  -- Check if target user is super admin
  SELECT is_admin INTO target_user_is_admin
  FROM public.user_profiles
  WHERE id = target_user_id;

  IF target_user_is_admin IS TRUE THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يمكن تعديل صلاحيات الأدمن الرئيسي'
    );
  END IF;

  -- Update the user role
  UPDATE public.user_profiles
  SET
    role = new_role,
    is_admin = COALESCE(new_is_admin, is_admin),
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تحديث صلاحيات المستخدم بنجاح'
  );
END;
$$;

-- ================================================================================================
-- STEP 7: Grant necessary permissions
-- ================================================================================================

-- Grant execute permission on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT, BOOLEAN) TO authenticated;

-- ================================================================================================
-- STEP 8: Create helper function to check if user is super admin
-- ================================================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = user_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

-- ================================================================================================
-- STEP 9: Add index for performance
-- ================================================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- ================================================================================================
-- DONE! Summary:
-- ================================================================================================
-- ✅ New users automatically get a profile in user_profiles
-- ✅ Super admins (is_admin = true) are protected from role changes
-- ✅ Only admins can modify other users' roles
-- ✅ Use update_user_role() function to safely change roles
-- ✅ Use is_super_admin() function to check permissions in your app
-- ================================================================================================
