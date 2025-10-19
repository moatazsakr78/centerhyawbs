-- إنشاء المجموعة الرئيسية "منتجات" إذا لم تكن موجودة
-- هذه المجموعة هي المجموعة الأم التي لا يمكن حذفها

-- التحقق من عدم وجود مجموعة "منتجات" مسبقاً
DO $$
DECLARE
    products_category_id UUID;
BEGIN
    -- البحث عن مجموعة "منتجات" الحالية
    SELECT id INTO products_category_id
    FROM categories
    WHERE name = 'منتجات'
    LIMIT 1;

    -- إذا لم تكن موجودة، قم بإنشائها
    IF products_category_id IS NULL THEN
        INSERT INTO categories (
            name,
            name_en,
            parent_id,
            is_active,
            sort_order,
            created_at,
            updated_at
        ) VALUES (
            'منتجات',
            'Products',
            NULL,  -- لا يوجد parent لأنها المجموعة الأم
            true,
            0,     -- أول مجموعة في الترتيب
            NOW(),
            NOW()
        );

        RAISE NOTICE 'تم إنشاء المجموعة الرئيسية "منتجات" بنجاح';
    ELSE
        RAISE NOTICE 'المجموعة الرئيسية "منتجات" موجودة مسبقاً';
    END IF;
END $$;

-- ملاحظة: هذه المجموعة يجب أن تكون محمية من الحذف في التطبيق
