# RLS (Row Level Security) Troubleshooting Guide for POS System

## Problem Description
The admin product management page is experiencing issues where category changes (like visibility toggles and reordering) are not being applied to the database. This is likely due to missing or incorrect Row Level Security (RLS) policies in Supabase.

## Symptoms
- Category visibility toggles don't save
- Category reordering doesn't persist
- Console shows database update errors
- Changes appear to work in the UI but don't persist after page refresh

## Root Cause Analysis
Based on the code analysis, the issue is in the `saveCategoryChanges` function in `/app/(website)/admin/products/page.tsx`. The function tries to update the `categories` table but may be blocked by RLS policies.

## Solution Steps

### Step 1: Run the RLS Setup Script
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/hecedrbnbknohssgaoso
2. Go to the SQL Editor
3. Copy and paste the contents of `SUPABASE_RLS_SETUP.sql`
4. Execute the script

### Step 2: Verify Authentication
The application uses Supabase Auth. Ensure you're properly authenticated:

```typescript
// Check auth status in browser console:
import { supabase } from './lib/supabase/client';
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

### Step 3: Test Database Operations
Use the test API endpoint created:
```
GET /api/test-categories
```

### Step 4: Alternative Solutions

#### Option A: Temporary Bypass (Development Only)
If authentication is working but policies are still blocking, temporarily use permissive policies:

```sql
-- WARNING: Only use in development
DROP POLICY IF EXISTS "categories_allow_all" ON public.categories;
CREATE POLICY "categories_allow_all" ON public.categories
    FOR ALL USING (true) WITH CHECK (true);
```

#### Option B: Service Role Key (Backend Only)
For server-side operations, use the service role key instead of anon key:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

## Expected Database Schema

The `categories` table should have:
- `id` (uuid, primary key)
- `name` (text, required)
- `name_en` (text, optional)
- `is_active` (boolean, default: true)
- `sort_order` (integer, for ordering)
- `parent_id` (uuid, references categories.id)
- `image_url` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## RLS Policies Required

### For Categories Table:
1. **SELECT Policy**: Allow public read access
   - Name: `categories_select_public`
   - Command: `SELECT`
   - Using: `true`

2. **INSERT Policy**: Allow authenticated users to create
   - Name: `categories_insert_auth`
   - Command: `INSERT`
   - With Check: `auth.role() = 'authenticated'`

3. **UPDATE Policy**: Allow authenticated users to modify
   - Name: `categories_update_auth`
   - Command: `UPDATE`
   - Using: `auth.role() = 'authenticated'`
   - With Check: `auth.role() = 'authenticated'`

4. **DELETE Policy**: Allow authenticated users to delete
   - Name: `categories_delete_auth`
   - Command: `DELETE`
   - Using: `auth.role() = 'authenticated'`

## Testing Checklist

- [ ] RLS is enabled on categories table
- [ ] All 4 policies exist (SELECT, INSERT, UPDATE, DELETE)
- [ ] User can authenticate successfully
- [ ] SELECT queries work (category list loads)
- [ ] UPDATE queries work (visibility toggles save)
- [ ] Reordering saves properly (sort_order updates)

## Common Issues and Fixes

### Issue 1: "new row violates row-level security policy"
**Cause**: Missing or incorrect INSERT/UPDATE policy
**Fix**: Verify the policies exist and auth.role() returns 'authenticated'

### Issue 2: "permission denied for table categories"
**Cause**: RLS is enabled but no policies exist
**Fix**: Run the RLS setup script to create policies

### Issue 3: Updates appear successful but don't persist
**Cause**: Policy allows the operation but WITH CHECK clause fails
**Fix**: Ensure WITH CHECK clause matches USING clause for UPDATE policies

### Issue 4: Authentication state is null
**Cause**: User is not properly authenticated
**Fix**: Check authentication flow, ensure login is working

## Verification Commands

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'categories';

-- Check policies
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'categories';

-- Test SELECT
SELECT id, name, is_active FROM categories LIMIT 1;
```

## Next Steps After Fix

1. Test the admin product management page
2. Verify category visibility toggles work
3. Test category reordering functionality
4. Confirm changes persist after page refresh
5. Apply similar fixes to other tables if needed (products, customer_groups, supplier_groups)

## Support

If issues persist:
1. Check browser console for detailed error messages
2. Check Supabase Dashboard > Authentication > Users for active sessions
3. Verify environment variables are set correctly
4. Consider using service role key for admin operations