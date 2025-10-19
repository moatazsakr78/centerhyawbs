# إعداد المصادقة - Authentication Setup

## نظرة عامة
تم تطوير نظام المصادقة ليعمل تلقائياً في جميع البيئات (التطوير والإنتاج) بدون الحاجة لتعديل الكود يدوياً.

## البيئات المدعومة

### 🏠 بيئة التطوير (Development)
- **URL التلقائي**: `http://localhost:3000`
- **يعمل تلقائياً** عند تشغيل `npm run dev`
- **لا يحتاج إعداد خاص**

### 🚀 بيئة الإنتاج (Production)
- **URL الإنتاج**: `https://full-system-20.vercel.app`
- **يُعرَّف في**: `NEXT_PUBLIC_SITE_URL`

## إعداد متغيرات البيئة

### للتطوير المحلي
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# اختياري - سيتم اكتشاف localhost تلقائياً
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### للإنتاج (Vercel)
```env
# Environment Variables in Vercel Dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://full-system-20.vercel.app
```

## كيف يعمل النظام

### 🔄 الاكتشاف التلقائي
```typescript
// النظام يكتشف البيئة تلقائياً:
if (origin.includes('localhost')) {
  return 'http://localhost:3000/auth/callback';
}

if (process.env.NEXT_PUBLIC_SITE_URL) {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
}
```

### 📱 URLs المدعومة
- ✅ `http://localhost:3000` (تطوير)
- ✅ `http://localhost:3001` (تطوير - بورت بديل)
- ✅ `http://localhost:3002` (تطوير - بورت بديل)
- ✅ `https://full-system-20.vercel.app` (إنتاج)

## إعداد Supabase

### في Supabase Dashboard:
1. اذهب إلى **Authentication** → **URL Configuration**
2. أضف هذه URLs في **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   http://localhost:3002/auth/callback
   http://localhost:3003/auth/callback
   https://full-system-20.vercel.app/auth/callback
   ```

### في Google Cloud Console:
1. اذهب إلى **APIs & Services** → **Credentials**
2. أضف هذه URLs في **Authorized redirect URIs**:
   ```
   https://hecedrbnbknohssgaoso.supabase.co/auth/v1/callback
   ```

## الاستخدام في الكود

```typescript
// الاستخدام البسيط - يعمل في كل البيئات
const { signInWithGoogle } = useAuth();

// سيختار الـ redirect URL المناسب تلقائياً
await signInWithGoogle();
```

## استكشاف الأخطاء

### المشكلة: "Invalid redirect URL"
**الحل**: تأكد من إضافة جميع URLs في إعدادات Supabase

### المشكلة: تسجيل الدخول لا يعمل في الإنتاج
**الحل**: تأكد من ضبط `NEXT_PUBLIC_SITE_URL` في Vercel

### المشكلة: تسجيل الدخول لا يعمل محلياً
**الحل**: تأكد من تشغيل الخادم على البورت الصحيح

## المزايا

- ✅ **تلقائي بالكامل** - لا يحتاج تعديل كود
- ✅ **متعدد البيئات** - يعمل في التطوير والإنتاج
- ✅ **مرن** - يدعم أي بورت محلي
- ✅ **آمن** - URLs محددة مسبقاً
- ✅ **سهل الصيانة** - كود واحد لكل البيئات