# تشخيص مشكلة التصدير/الاستيراد

## المشكلة المُبلّغ عنها:
1. التصدير يظهر: **0 صور فرعية** (بينما يجب أن يكون 6)
2. الاستيراد: الصور لا تظهر في الموقع
3. الفيديو مفقود

## السبب المحتمل:

### 1. مشكلة في قراءة البيانات
الكود في `useProducts.ts` و `useProductsOptimized.ts` يقرأ من `additional_images_urls`:

```typescript
const parsedAdditionalImages = product.additional_images_urls || []
```

ثم يحفظها في:
```typescript
additional_images: parsedAdditionalImages
```

**لكن**: قد تكون `additional_images_urls` في قاعدة البيانات null أو فارغة!

### 2. خطوات التحقق:

#### أ) تحقق من قاعدة البيانات:
```sql
SELECT
  name,
  additional_images_urls,
  jsonb_array_length(additional_images_urls) as count
FROM products
WHERE is_active = true
LIMIT 5;
```

#### ب) تحقق من console logs:
عند فتح صفحة المنتجات، افتح Console وابحث عن:
```
🔍 Processing product: [اسم المنتج]
  - additional_images_urls: X images
```

### 3. الحل المقترح:

#### إضافة fallback للصور القديمة:

في `useProducts.ts` و `useProductsOptimized.ts`، نحتاج fallback إلى `sub_image_url`:

```typescript
// الكود الحالي
const parsedAdditionalImages = product.additional_images_urls || []

// الكود المقترح
let parsedAdditionalImages = product.additional_images_urls || []

// Fallback: إذا كانت فارغة، حاول قراءة sub_image_url القديم
if (parsedAdditionalImages.length === 0 && product.sub_image_url) {
  try {
    const parsed = JSON.parse(product.sub_image_url)
    if (Array.isArray(parsed)) {
      parsedAdditionalImages = parsed
    }
  } catch (e) {
    // Ignore
  }
}
```

## الخطوات التالية:

1. ✅ تحقق من البيانات في قاعدة البيانات
2. ⏳ أضف fallback إلى sub_image_url
3. ⏳ اختبر التصدير مرة أخرى
4. ⏳ اختبر الاستيراد

