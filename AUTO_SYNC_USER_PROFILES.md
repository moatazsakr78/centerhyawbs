# دليل مزامنة user_profiles تلقائياً بين Free Auth و Paid Data Projects

## المشكلة:

عندك trigger/function في Supabase بيعمل insert في `user_profiles` تلقائياً لما user يتسجل:

```sql
-- الكود القديم (كل شيء في project واحد)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

لكن دلوقتي:
- Auth في Free Project
- `user_profiles` table في Paid Project

**ازاي نخلي الـ sync يحصل تلقائياً؟**

---

## الحل الأفضل: Edge Function في Free Auth Project

### الفكرة:

```
Free Auth Project
  │
  │ 1. User signs up
  │
  ▼
auth.users table (Free Project)
  │
  │ 2. Trigger Edge Function
  │
  ▼
Edge Function (Free Project)
  │
  │ 3. HTTP Request
  │
  ▼
Paid Data Project API
  │
  │ 4. Insert into user_profiles
  │
  ▼
user_profiles table (Paid Project) ✅
```

---

## التطبيق خطوة بخطوة:

### 1. إنشاء API Endpoint في Next.js (لاستقبال Users الجدد)

```typescript
// app/api/sync-user/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Paid Data Project
const supabaseData = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_DATA_URL!,
  process.env.SUPABASE_DATA_SERVICE_ROLE_KEY! // Service Role
)

// Secret للتحقق من الطلبات
const SYNC_SECRET = process.env.USER_SYNC_SECRET!

export async function POST(request: NextRequest) {
  try {
    // التحقق من السرية
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${SYNC_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, email, user_metadata } = body

    console.log('Syncing user:', user_id, email)

    // إدراج في user_profiles (Paid Data Project)
    const { data, error } = await supabaseData
      .from('user_profiles')
      .insert({
        id: user_id, // نفس الـ ID من Auth Project
        email: email,
        full_name: user_metadata?.full_name || '',
        phone: user_metadata?.phone || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error syncing user:', error)
      throw error
    }

    console.log('User synced successfully:', data)

    return NextResponse.json({
      success: true,
      user_id: data.id
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

### 2. إنشاء Edge Function في Free Auth Project

في Supabase Dashboard (Free Auth Project):
- اذهب إلى **Edge Functions**
- Create New Function: `sync-user-to-data-project`

```typescript
// supabase/functions/sync-user-to-data-project/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SYNC_API_URL = Deno.env.get('SYNC_API_URL')! // Your Next.js API
const SYNC_SECRET = Deno.env.get('SYNC_SECRET')!

console.log('Edge Function started')

serve(async (req) => {
  try {
    const { record } = await req.json()

    console.log('New user created:', record.id, record.email)

    // إرسال HTTP request لـ Next.js API
    const response = await fetch(SYNC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SYNC_SECRET}`
      },
      body: JSON.stringify({
        user_id: record.id,
        email: record.email,
        user_metadata: record.raw_user_meta_data || {}
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Sync failed: ${result.error}`)
    }

    console.log('User synced successfully:', result)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Deploy the function:**

```bash
# في terminal
npx supabase functions deploy sync-user-to-data-project --project-ref YOUR_FREE_AUTH_PROJECT_REF
```

**Set Environment Variables:**

في Supabase Dashboard (Free Project) → Edge Functions → sync-user-to-data-project → Settings:

```
SYNC_API_URL=https://yourapp.com/api/sync-user
SYNC_SECRET=your_super_secret_key_here
```

---

### 3. إنشاء Database Webhook في Free Auth Project

في Supabase Dashboard (Free Auth Project):
- اذهب إلى **Database** → **Webhooks**
- Create Webhook:

```
Name: sync_user_on_signup
Table: auth.users
Events: INSERT
Type: Edge Function
Edge Function: sync-user-to-data-project
```

**أو عبر SQL:**

```sql
-- في Free Auth Project

-- إنشاء trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- استدعاء Edge Function
  PERFORM
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-user-to-data-project',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:=json_build_object(
        'record', json_build_object(
          'id', NEW.id,
          'email', NEW.email,
          'raw_user_meta_data', NEW.raw_user_meta_data
        )
      )::jsonb
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الـ trigger بـ auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## الطريقة البديلة: مباشرة من Edge Function للـ Data Project

**أسهل وأسرع!** بدون Next.js API:

```typescript
// supabase/functions/sync-user-to-data-project/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Paid Data Project credentials
const DATA_PROJECT_URL = Deno.env.get('DATA_PROJECT_URL')!
const DATA_PROJECT_SERVICE_KEY = Deno.env.get('DATA_PROJECT_SERVICE_KEY')!

const supabaseData = createClient(DATA_PROJECT_URL, DATA_PROJECT_SERVICE_KEY)

serve(async (req) => {
  try {
    const { record } = await req.json()

    console.log('Syncing user:', record.id, record.email)

    // إدراج مباشر في Paid Data Project
    const { data, error } = await supabaseData
      .from('user_profiles')
      .insert({
        id: record.id,
        email: record.email,
        full_name: record.raw_user_meta_data?.full_name || '',
        phone: record.raw_user_meta_data?.phone || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    console.log('User synced successfully:', data)

    return new Response(
      JSON.stringify({ success: true, user_id: data.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Sync error:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Environment Variables:**

```
DATA_PROJECT_URL=https://yyyyy.supabase.co
DATA_PROJECT_SERVICE_KEY=your_paid_project_service_role_key
```

---

## الطريقة الثالثة: Client-side Sync (أبسط)

إذا كنت لا تريد تعقيدات Edge Functions:

```typescript
// lib/auth/signup.ts

import { supabaseAuth } from '@/lib/supabase/auth-client'
import { createDataClient } from '@/lib/supabase/data-client'

export async function signUpWithSync(
  email: string,
  password: string,
  fullName: string,
  phone: string
) {
  // 1. التسجيل في Free Auth Project
  const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone
      }
    }
  })

  if (authError) throw authError

  const user = authData.user!
  const token = authData.session?.access_token!

  // 2. إنشاء profile في Paid Data Project
  const dataClient = createDataClient(token)

  const { error: profileError } = await dataClient
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email!,
      full_name: fullName,
      phone: phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (profileError) {
    console.error('Failed to create profile:', profileError)
    // يمكنك إعادة المحاولة أو تسجيل الخطأ
  }

  return { user, token }
}
```

**الاستخدام:**

```typescript
// app/auth/signup/page.tsx

import { signUpWithSync } from '@/lib/auth/signup'

async function handleSignUp(e: React.FormEvent) {
  e.preventDefault()

  try {
    await signUpWithSync(email, password, fullName, phone)
    router.push('/products')
  } catch (error) {
    alert('خطأ في التسجيل')
  }
}
```

---

## مقارنة الطرق:

| الطريقة | السهولة | التلقائية | الأمان |
|---------|---------|----------|--------|
| **Edge Function → Next.js API** | ⭐⭐⭐ | ✅ 100% | ⭐⭐⭐⭐⭐ |
| **Edge Function → Data Project مباشرة** | ⭐⭐⭐⭐ | ✅ 100% | ⭐⭐⭐⭐⭐ |
| **Client-side Sync** | ⭐⭐⭐⭐⭐ | ❌ Manual | ⭐⭐⭐ |

---

## نصيحتي:

✅ **استخدم Edge Function → Data Project مباشرة**

**المميزات:**
- تلقائي 100% (زي ما كان شغال)
- مفيش Next.js API endpoint محتاج صيانة
- Secure (Service Role Key في Environment Variables)
- Fast (مباشرة بدون وسيط)

**الخطوات:**
1. إنشاء Edge Function في Free Auth Project
2. إضافة credentials للـ Paid Data Project
3. إنشاء Database Webhook أو Trigger
4. **خلاص! automatic sync** ✅

---

## Environment Variables المطلوبة:

```env
# .env.local (Next.js)

# Free Auth Project
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=your_free_auth_anon_key

# Paid Data Project
NEXT_PUBLIC_SUPABASE_DATA_URL=https://yyyyy.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=your_paid_data_anon_key
SUPABASE_DATA_SERVICE_ROLE_KEY=your_paid_data_service_key

# User Sync Secret (اختياري إذا استخدمت Next.js API)
USER_SYNC_SECRET=your_super_secret_key
```

---

## الخلاصة:

### ✅ نعم، العملاء مش هيضيعوا!

**الـ user_profiles هيتملى تلقائياً** في Paid Data Project لما user يسجل في Free Auth Project.

**الطريقة:**
1. User يسجل في Free Auth Project
2. Edge Function يتفعل تلقائياً
3. يعمل insert في user_profiles (Paid Data Project)
4. **زي ما كان شغال بالضبط!** ✅

**مفيش فرق من ناحية الـ UX أو الـ functionality!**

---

عايزني أساعدك في إعداد Edge Function ده؟ 🚀
