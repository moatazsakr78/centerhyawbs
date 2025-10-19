-- ================================================================================================
-- SUPABASE RLS POLICIES SETUP FOR POS SYSTEM
-- ================================================================================================
-- This script fixes Row Level Security policies for the categories table and related tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hecedrbnbknohssgaoso/sql
-- ================================================================================================

-- STEP 1: Check current RLS status
-- ================================================================================================
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename IN ('categories', 'products', 'customer_groups', 'supplier_groups')
ORDER BY tablename;

-- STEP 2: Check existing policies
-- ================================================================================================
SELECT 
    schemaname,
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd as "Command",
    qual as "Using Expression",
    with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename IN ('categories', 'products', 'customer_groups', 'supplier_groups')
ORDER BY tablename, policyname;

-- STEP 3: Enable RLS on categories table (if not already enabled)
-- ================================================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop existing policies to avoid conflicts
-- ================================================================================================
DROP POLICY IF EXISTS "Allow public read access on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated insert on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated update on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated delete on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;

-- STEP 5: Create comprehensive RLS policies for categories
-- ================================================================================================

-- 5.1: Allow public SELECT access (for website display)
CREATE POLICY "categories_select_public" ON public.categories
    FOR SELECT 
    USING (true);

-- 5.2: Allow authenticated users to INSERT categories
CREATE POLICY "categories_insert_auth" ON public.categories
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 5.3: Allow authenticated users to UPDATE categories
CREATE POLICY "categories_update_auth" ON public.categories
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5.4: Allow authenticated users to DELETE categories
CREATE POLICY "categories_delete_auth" ON public.categories
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- STEP 6: Apply similar policies to related tables
-- ================================================================================================

-- 6.1: Products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_insert_auth" ON public.products;
DROP POLICY IF EXISTS "products_update_auth" ON public.products;
DROP POLICY IF EXISTS "products_delete_auth" ON public.products;

CREATE POLICY "products_select_public" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "products_insert_auth" ON public.products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_update_auth" ON public.products
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_delete_auth" ON public.products
    FOR DELETE USING (auth.role() = 'authenticated');

-- 6.2: Customer Groups table
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_groups_select_public" ON public.customer_groups;
DROP POLICY IF EXISTS "customer_groups_insert_auth" ON public.customer_groups;
DROP POLICY IF EXISTS "customer_groups_update_auth" ON public.customer_groups;
DROP POLICY IF EXISTS "customer_groups_delete_auth" ON public.customer_groups;

CREATE POLICY "customer_groups_select_public" ON public.customer_groups
    FOR SELECT USING (true);

CREATE POLICY "customer_groups_insert_auth" ON public.customer_groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customer_groups_update_auth" ON public.customer_groups
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customer_groups_delete_auth" ON public.customer_groups
    FOR DELETE USING (auth.role() = 'authenticated');

-- 6.3: Supplier Groups table
ALTER TABLE public.supplier_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_groups_select_public" ON public.supplier_groups;
DROP POLICY IF EXISTS "supplier_groups_insert_auth" ON public.supplier_groups;
DROP POLICY IF EXISTS "supplier_groups_update_auth" ON public.supplier_groups;
DROP POLICY IF EXISTS "supplier_groups_delete_auth" ON public.supplier_groups;

CREATE POLICY "supplier_groups_select_public" ON public.supplier_groups
    FOR SELECT USING (true);

CREATE POLICY "supplier_groups_insert_auth" ON public.supplier_groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "supplier_groups_update_auth" ON public.supplier_groups
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "supplier_groups_delete_auth" ON public.supplier_groups
    FOR DELETE USING (auth.role() = 'authenticated');

-- STEP 7: Verify the policies were created successfully
-- ================================================================================================
SELECT 
    schemaname,
    tablename, 
    policyname, 
    cmd as "Operation",
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as "Using Status",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as "With Check Status"
FROM pg_policies 
WHERE tablename IN ('categories', 'products', 'customer_groups', 'supplier_groups')
ORDER BY tablename, policyname;

-- STEP 8: Test queries
-- ================================================================================================
-- These should work after applying the policies

-- Test SELECT (should work for everyone)
SELECT id, name, is_active, sort_order, created_at 
FROM public.categories 
ORDER BY sort_order ASC, name ASC 
LIMIT 5;

-- Test basic UPDATE (should work for authenticated users)
-- Uncomment and modify the ID to test:
-- UPDATE public.categories 
-- SET updated_at = NOW() 
-- WHERE id = 'replace-with-actual-category-id';

-- STEP 9: Alternative - More permissive policies (use only if the above fail)
-- ================================================================================================
-- Uncomment these ONLY if you need to bypass all RLS restrictions temporarily

/*
-- DANGER: These policies allow all operations for everyone
-- Only use for testing/development

DROP POLICY IF EXISTS "categories_allow_all" ON public.categories;
CREATE POLICY "categories_allow_all" ON public.categories
    FOR ALL 
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "products_allow_all" ON public.products;
CREATE POLICY "products_allow_all" ON public.products
    FOR ALL 
    USING (true)
    WITH CHECK (true);
*/

-- ================================================================================================
-- COMPLETION SUMMARY
-- ================================================================================================
-- After running this script:
-- 1. RLS is enabled on categories, products, customer_groups, and supplier_groups tables
-- 2. Public SELECT access is allowed (for website functionality)
-- 3. Authenticated users can INSERT, UPDATE, and DELETE records
-- 4. The admin product management page should now work properly
-- ================================================================================================

-- Final status check
SELECT 
    tablename,
    rowsecurity as "RLS Enabled",
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as "Policy Count"
FROM pg_tables 
WHERE tablename IN ('categories', 'products', 'customer_groups', 'supplier_groups')
ORDER BY tablename;