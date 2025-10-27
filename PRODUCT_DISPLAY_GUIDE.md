# دليل استخدام ميزة إدارة ظهور المنتجات

## نظرة عامة
تم تطبيق نظام متقدم لإدارة ظهور المنتجات في المتجر الإلكتروني بناءً على المخزون المتوفر، مع إمكانية التصويت على المنتجات النافذة.

## المميزات الرئيسية

### 1. أوضاع عرض المنتجات (3 خيارات)

#### أ) ظهور كلي (Show All)
- تظهر جميع المنتجات في المتجر بغض النظر عن حالة المخزون
- حتى المنتجات ذات الكمية صفر ستظهر
- الوضع الافتراضي للنظام

#### ب) ظهور بالمخزون (Show With Stock)
- تظهر فقط المنتجات المتوفرة في المخزون
- المنتجات النافذة (الكمية = 0) لن تظهر في المتجر
- يتم إخفاءها تماماً من قوائم المنتجات

#### ج) ظهور بالمخزون مع التصويت (Show With Stock And Vote)
- المنتجات المتوفرة تظهر بشكل عادي
- المنتجات النافذة تظهر مع بطاقة تصويت
- يمكن للعملاء التصويت: هل يريدون توفير المنتج مرة أخرى؟
- يعرض إحصائيات التصويت بعد التصويت (مثل WhatsApp)

### 2. تحديد المخازن والفروع
عند اختيار الوضع (ب) أو (ج)، يمكنك:
- تحديد مخازن وفروع معينة لحساب المخزون
- إذا لم تحدد أي شيء، سيتم احتساب جميع المخازن والفروع
- يمكن استبعاد فروع معينة من الحساب

## البنية التقنية

### الجداول في قاعدة البيانات

#### 1. جدول `product_display_settings`
```sql
- id: UUID (Primary Key)
- display_mode: VARCHAR (show_all | show_with_stock | show_with_stock_and_vote)
- selected_warehouses: UUID[] (مصفوفة من معرفات المخازن)
- selected_branches: UUID[] (مصفوفة من معرفات الفروع)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 2. جدول `product_votes`
```sql
- id: UUID (Primary Key)
- product_id: UUID (Foreign Key -> products)
- user_identifier: VARCHAR (معرف المستخدم/الجلسة/IP)
- vote: VARCHAR (yes | no)
- created_at: TIMESTAMPTZ
- UNIQUE(product_id, user_identifier) -- تصويت واحد لكل مستخدم لكل منتج
```

### الوظائف (Functions)

#### 1. `get_product_vote_stats(product_id)`
تُرجع إحصائيات التصويت لمنتج معين:
- total_votes: إجمالي عدد الأصوات
- yes_votes: عدد أصوات "نعم"
- no_votes: عدد أصوات "لا"
- yes_percentage: نسبة "نعم"
- no_percentage: نسبة "لا"

#### 2. `has_user_voted(product_id, user_identifier)`
تتحقق من إذا كان المستخدم قد صوّت مسبقاً:
- has_voted: Boolean
- vote: VARCHAR (yes | no)

## الملفات والمكونات

### Hooks

#### 1. `useProductDisplaySettings.ts`
Hook لإدارة إعدادات ظهور المنتجات في لوحة التحكم
```typescript
import { useProductDisplaySettings } from '@/lib/hooks/useProductDisplaySettings';

const {
  settings,           // الإعدادات الحالية
  warehouses,        // قائمة المخازن
  branches,          // قائمة الفروع
  isLoading,         // حالة التحميل
  isSaving,          // حالة الحفظ
  updateSettings,    // دالة تحديث الإعدادات
  getAllLocations    // دالة للحصول على جميع المواقع
} = useProductDisplaySettings();
```

#### 2. `useProductFilter.ts`
Hook لتطبيق فلترة المنتجات في صفحات المتجر
```typescript
import { useProductFilter } from '@/lib/hooks/useProductFilter';

const {
  displaySettings,         // الإعدادات الحالية
  isLoading,              // حالة التحميل
  filterProducts,         // فلترة قائمة منتجات
  shouldDisplayProduct,   // فحص منتج واحد
  getProductInventory     // جلب المخزون
} = useProductFilter();
```

### المكونات (Components)

#### `ProductVoteCard.tsx`
مكون بطاقة التصويت للمنتجات النافذة
```typescript
import ProductVoteCard from '@/components/website/ProductVoteCard';

<ProductVoteCard
  productId={product.id}
  productName={product.name}
  onVoteComplete={() => console.log('Vote submitted!')}
/>
```

**المميزات:**
- تخزين معرف المستخدم في localStorage للحفاظ على هوية المستخدم
- منع التصويت المتكرر (تصويت واحد فقط لكل منتج)
- عرض نتائج التصويت بشكل تفاعلي مع أشرطة تقدم
- واجهة مستخدم جميلة ومتجاوبة

## كيفية الاستخدام في صفحات المتجر

### مثال 1: فلترة قائمة منتجات
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useProductFilter } from '@/lib/hooks/useProductFilter';
import ProductVoteCard from '@/components/website/ProductVoteCard';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const { filterProducts, displaySettings, isLoading } = useProductFilter();

  useEffect(() => {
    // جلب المنتجات من قاعدة البيانات
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0 && !isLoading) {
      // تطبيق الفلترة
      applyFilter();
    }
  }, [products, displaySettings, isLoading]);

  const fetchProducts = async () => {
    // جلب المنتجات من Supabase
    const { data } = await supabase.from('products').select('*');
    setProducts(data || []);
  };

  const applyFilter = async () => {
    const filtered = await filterProducts(products);
    setFilteredProducts(filtered);
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {filteredProducts.map((product) => (
        <div key={product.id} className="product-card">
          <img src={product.image} alt={product.name} />
          <h3>{product.name}</h3>
          <p>{product.price}</p>

          {/* عرض زر الإضافة أو بطاقة التصويت */}
          {product.is_available ? (
            <button>أضف إلى السلة</button>
          ) : displaySettings.display_mode === 'show_with_stock_and_vote' ? (
            <ProductVoteCard
              productId={product.id}
              productName={product.name}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
```

### مثال 2: فحص منتج واحد
```typescript
const { shouldDisplayProduct, displaySettings } = useProductFilter();

const checkProduct = async (product) => {
  const { display, isAvailable, inventory } = await shouldDisplayProduct(product);

  if (!display) {
    return null; // لا تعرض المنتج
  }

  if (!isAvailable && displaySettings.display_mode === 'show_with_stock_and_vote') {
    return <ProductVoteCard productId={product.id} productName={product.name} />;
  }

  return <ProductNormalCard product={product} />;
};
```

## إعدادات الصفحة الإدارية

### مسار صفحة الإعدادات
`http://localhost:3000/settings`

انتقل إلى قسم **"المظهر"** ← **"إعدادات ظهور المنتجات في المتجر"**

### الخطوات:
1. اختر وضع العرض المناسب (ظهور كلي / بالمخزون / بالمخزون مع التصويت)
2. إذا اخترت "بالمخزون" أو "بالمخزون مع التصويت":
   - حدد المخازن والفروع التي تريد احتساب مخزونها
   - استخدم "تحديد الكل" لتحديد جميع المواقع
   - أو حدد مواقع معينة فقط
3. التغييرات تُحفظ تلقائياً

## حالات الاستخدام

### 1. متجر بفرع واحد
- اختر "ظهور بالمخزون"
- لن تظهر المنتجات النافذة

### 2. متجر متعدد الفروع
- اختر "ظهور بالمخزون"
- حدد الفروع التي تريد احتساب مخزونها
- مثلاً: حدد فروع القاهرة فقط، واستبعد فروع الإسكندرية

### 3. جمع آراء العملاء
- اختر "ظهور بالمخزون مع التصويت"
- المنتجات النافذة ستظهر مع خيار التصويت
- يمكنك تحليل نتائج التصويت لاحقاً

### 4. موقع دائم (24/7)
- اختر "ظهور كلي"
- جميع المنتجات تظهر بغض النظر عن المخزون
- يمكن للعملاء الطلب والحجز المسبق

## استعلامات مفيدة

### عرض إحصائيات التصويت لجميع المنتجات
```sql
SELECT
  p.name,
  p.name_en,
  stats.*
FROM products p
CROSS JOIN LATERAL get_product_vote_stats(p.id) stats
WHERE stats.total_votes > 0
ORDER BY stats.yes_percentage DESC;
```

### عرض المنتجات الأكثر طلباً (أعلى تصويت بـ "نعم")
```sql
SELECT
  p.name,
  stats.yes_votes,
  stats.yes_percentage
FROM products p
CROSS JOIN LATERAL get_product_vote_stats(p.id) stats
WHERE stats.total_votes >= 10  -- على الأقل 10 أصوات
ORDER BY stats.yes_percentage DESC
LIMIT 20;
```

### حذف الأصوات القديمة (أكثر من 30 يوم)
```sql
DELETE FROM product_votes
WHERE created_at < NOW() - INTERVAL '30 days';
```

## الأمان والخصوصية

### Row Level Security (RLS)
- جميع الجداول محمية بـ RLS
- القراءة متاحة للجميع (Public)
- التعديل على الإعدادات يتطلب مصادقة
- إدراج التصويتات متاح للجميع (لدعم المستخدمين الضيوف)

### معرف المستخدم
- يتم إنشاء معرف فريد لكل جلسة
- يُخزن في localStorage
- لا يحتوي على معلومات شخصية
- يمكن استبداله بمعرف المستخدم المسجل إذا كان متاحاً

## الملاحظات والتحذيرات

⚠️ **مهم:**
1. عند تغيير الإعدادات، قد يحتاج المستخدمون لتحديث الصفحة لرؤية التغييرات
2. حساب المخزون قد يكون بطيئاً للمنتجات الكثيرة - يُنصح باستخدام Caching
3. التصويتات لا يمكن تعديلها أو حذفها من قبل المستخدمين (لمنع التلاعب)
4. في حالة عدم تحديد أي مخازن أو فروع، سيتم احتساب الكل

💡 **نصائح:**
1. استخدم "ظهور بالمخزون" للتجارة الإلكترونية التقليدية
2. استخدم "ظهور بالمخزون مع التصويت" لجمع Insights عن العملاء
3. استخدم "ظهور كلي" للمواقع التي تعتمد على الطلب المسبق
4. راجع إحصائيات التصويت دورياً لاتخاذ قرارات شراء ذكية

## الدعم والمساعدة

إذا واجهت أي مشاكل أو كانت لديك أسئلة:
1. تحقق من console.log في المتصفح للأخطاء
2. تحقق من صحة الاتصال بقاعدة البيانات
3. تأكد من تطبيق الـ migration بنجاح
4. راجع الوثائق أعلاه

---

✅ **تم التنفيذ بنجاح!**
جميع الميزات المطلوبة تم تطبيقها وتعمل بشكل كامل.
