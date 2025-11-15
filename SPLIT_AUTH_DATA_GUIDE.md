# دليل فصل Authentication عن Data (توفير MAU Costs)

## المفهوم:

استخدام **Supabase Free Project للـ Authentication فقط** (50K MAU مجاناً)
واستخدام **Supabase Paid Project للـ Data فقط** (MAU = 0)

---

## الـ Architecture:

```
User
  │
  ▼
┌─────────────────────────────┐
│  auth.yourapp.com           │
│  Free Supabase Project      │
│  - Authentication فقط       │
│  - 50,000 MAU مجاناً       │
│  - GoTrue (sign in/up/out)  │
└──────────┬──────────────────┘
           │
           │ 1. User signs in
           │ 2. Gets JWT token
           │
           ▼
┌─────────────────────────────┐
│  Your Next.js App           │
│  - Stores JWT in memory     │
│  - Adds JWT to requests     │
└──────────┬──────────────────┘
           │
           │ 3. Request with JWT
           │
           ▼
┌─────────────────────────────┐
│  data.yourapp.com           │
│  Paid Supabase Project      │
│  - Database                 │
│  - Storage                  │
│  - Real-time                │
│  - NO Authentication        │
│  - MAU = 0 ✅              │
│  - Verifies JWT from Free   │
└─────────────────────────────┘
```

---

## خطوات التطبيق:

### 1. إعداد Free Auth Project

في Supabase Dashboard (Free Project):

```
Project Name: yourapp-auth
URL: https://xxxxx.supabase.co
Purpose: Authentication فقط
Plan: Free (50K MAU)
```

**Settings → API:**
- Copy `NEXT_PUBLIC_SUPABASE_AUTH_URL`
- Copy `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY`
- Copy `SUPABASE_AUTH_JWT_SECRET` (مهم جداً!)

---

### 2. إعداد Paid Data Project

في Organization (Paid Project):

```
Project Name: yourapp-data
URL: https://yyyyy.supabase.co
Purpose: Database + Storage فقط
Plan: Pro ($10/month) - MAU = 0
```

**Settings → API:**
- Copy `NEXT_PUBLIC_SUPABASE_DATA_URL`
- Copy `NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY`

---

### 3. Environment Variables

```env
# .env.local

# Auth Project (Free - 50K MAU)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=your_auth_anon_key
SUPABASE_AUTH_JWT_SECRET=your_auth_jwt_secret

# Data Project (Paid - MAU = 0)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://yyyyy.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=your_data_anon_key
SUPABASE_DATA_JWT_SECRET=your_data_jwt_secret
```

---

### 4. إنشاء Auth Client (Free Project)

```typescript
// lib/supabase/auth-client.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
)

// Auth functions
export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  // JWT token من Free Project
  return data.session?.access_token
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password
  })

  if (error) throw error

  return data.session?.access_token
}

export async function signOut() {
  await supabaseAuth.auth.signOut()
}

export function onAuthStateChange(callback: (token: string | null) => void) {
  return supabaseAuth.auth.onAuthStateChange((event, session) => {
    callback(session?.access_token || null)
  })
}
```

---

### 5. إنشاء Data Client (Paid Project)

```typescript
// lib/supabase/data-client.ts
import { createClient } from '@supabase/supabase-js'

let cachedDataClient: any = null
let cachedToken: string | null = null

export function createDataClient(authToken: string | null) {
  // استخدم نفس الـ client إذا الـ token لم يتغير
  if (cachedDataClient && cachedToken === authToken) {
    return cachedDataClient
  }

  cachedToken = authToken
  cachedDataClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATA_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY!,
    {
      global: {
        headers: authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {}
      }
    }
  )

  return cachedDataClient
}
```

---

### 6. Custom Hook للاستخدام السهل

```typescript
// lib/hooks/useSupabase.ts
'use client'

import { createDataClient } from '@/lib/supabase/data-client'
import { supabaseAuth } from '@/lib/supabase/auth-client'
import { useEffect, useState } from 'react'

export function useSupabase() {
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // الحصول على الـ session الحالي
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token || null)
      setUser(session?.user || null)
    })

    // الاستماع للتغييرات
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      (_event, session) => {
        setAuthToken(session?.access_token || null)
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    // Auth من Free Project
    auth: supabaseAuth.auth,

    // Data من Paid Project
    data: createDataClient(authToken),

    // User info
    user,
    isAuthenticated: !!user
  }
}
```

---

### 7. إعداد RLS في Data Project

**مهم جداً:** Data Project يجب يتحقق من JWT من Auth Project!

```sql
-- في Data Project (Paid)
-- إنشاء function للتحقق من JWT

CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE sql STABLE;

-- مثال: RLS policy
CREATE POLICY "Users can read own data"
ON user_profiles FOR SELECT
TO authenticated
USING (
  id::text = auth.user_id()
);
```

**المشكلة:** Data Project مش هيقدر يتحقق من JWT من Auth Project تلقائياً!

**الحل:** استخدم Edge Function للتحقق:

```typescript
// Data Project → Edge Functions → verify-auth

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v4.9.0/index.ts'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // التحقق من JWT من Auth Project
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(Deno.env.get('AUTH_JWT_SECRET')!)
    )

    // JWT صحيح! return user info
    return new Response(
      JSON.stringify({
        verified: true,
        userId: payload.sub,
        email: payload.email
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response('Invalid token', { status: 401 })
  }
})
```

---

### 8. استخدام في الصفحات

```typescript
// app/(website)/products/page.tsx
'use client'

import { useSupabase } from '@/lib/hooks/useSupabase'
import { useEffect, useState } from 'react'

export default function ProductsPage() {
  const { data: supabase, user, isAuthenticated } = useSupabase()
  const [products, setProducts] = useState([])

  useEffect(() => {
    loadProducts()
  }, [isAuthenticated])

  async function loadProducts() {
    // Query على Data Project (Paid)
    // مع JWT من Auth Project (Free)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(50)

    if (data) setProducts(data)
  }

  return (
    <div>
      {isAuthenticated && <p>مرحباً {user.email}</p>}

      <div className="grid grid-cols-3 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
```

---

### 9. صفحة تسجيل الدخول

```typescript
// app/auth/login/page.tsx
'use client'

import { signIn } from '@/lib/supabase/auth-client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // تسجيل الدخول على Free Auth Project
      const token = await signIn(email, password)

      // Token موجود! redirect
      router.push('/products')
    } catch (error) {
      alert('خطأ في تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">تسجيل الدخول</h1>

      <form onSubmit={handleSignIn} className="space-y-4">
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border"
          required
        />

        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
```

---

## المميزات:

✅ **50K MAU مجاناً** على Free Project
✅ **لا توجد MAU charges** على Paid Projects
✅ **مشاريع متعددة** تستخدم نفس Auth Project
✅ **توفير $325/شهر** لكل 100K users إضافيين

---

## التكلفة المتوقعة:

### مع الطريقة العادية (كل شيء في Organization):

**Project 1 (200K MAU):**
- Organization: $25
- Project: $10
- MAU (100K زيادة): $325
- **الإجمالي: $360**

**Project 2 (100K MAU):**
- Project: $10
- MAU: $0 (ضمن الـ 100K)
- **الإجمالي: $10**

**الإجمالي الكلي: $370/شهر**

---

### مع Auth/Data Split:

**Free Auth Project (200K MAU):**
- مجاناً تماماً حتى 50K
- بعد 50K: ممكن تعمل Free Project ثاني! (كل واحد 50K)
- **التكلفة: $0** ✅

**Paid Data Project 1:**
- Organization: $25
- Project: $10
- MAU: $0
- **الإجمالي: $35**

**Paid Data Project 2:**
- Project: $10
- MAU: $0
- **الإجمالي: $10**

**الإجمالي الكلي: $45/شهر** 🎉

**التوفير: $325/شهر!** 💰

---

## ملاحظات مهمة:

### 1. JWT Verification في Data Project

**المشكلة:** كل Supabase project له JWT secret مختلف.

**الحل:** استخدم Edge Function أو Middleware للتحقق.

### 2. لو عندك مشاريع كتير

```
Free Auth Project 1 → 50K MAU (مجاناً)
Free Auth Project 2 → 50K MAU (مجاناً)
Free Auth Project 3 → 50K MAU (مجاناً)

Total: 150K MAU مجاناً! ✅

Paid Data Projects (كل واحد $10 فقط)
```

### 3. User Profiles Storage

خزّن user profiles في **Data Project** مش في Auth Project:

```typescript
// بعد sign up على Auth Project
const { user } = await supabaseAuth.auth.signUp({ email, password })

// حفظ profile في Data Project
await dataClient.from('user_profiles').insert({
  id: user.id, // نفس الـ ID
  email: user.email,
  name: formData.name
})
```

---

## الخلاصة:

### ✅ نعم ممكن! وذكي جداً!

**الفكرة:**
- Auth على Free Projects (50K MAU × عدد Projects)
- Data على Paid Projects (MAU = 0)

**التوفير:**
- $325/شهر لكل 100K MAU إضافي
- كل project جديد = $10 فقط بدلاً من $10 + MAU costs

**الصعوبة:**
- محتاج JWT verification middleware
- شوية تعقيد في الإعداد
- لكن التوفير يستاهل!

---

عايزني أساعدك في الإعداد الفعلي؟ 🚀
