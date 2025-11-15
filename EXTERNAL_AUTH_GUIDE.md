# دليل استخدام External Auth مع Supabase

## الطريقة 1: Clerk + Supabase (الأسهل والأفضل)

### خطوات التنفيذ:

#### 1. تثبيت Clerk

```bash
npm install @clerk/nextjs
```

#### 2. إعداد Clerk

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="ar" dir="rtl">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

#### 3. إنشاء Supabase Client مع Clerk JWT

```typescript
// lib/supabase/client-with-clerk.ts
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'

export function useSupabaseWithClerk() {
  const { getToken } = useAuth()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: async () => {
          const token = await getToken({ template: 'supabase' })
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      },
    }
  )

  return supabase
}
```

#### 4. إعداد JWT Template في Clerk Dashboard

في Clerk Dashboard → JWT Templates → Create Template:

```json
{
  "aud": "authenticated",
  "exp": {{session.expires_at}},
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "role": "authenticated",
  "app_metadata": {
    "provider": "clerk"
  },
  "user_metadata": {}
}
```

#### 5. تعديل RLS Policies في Supabase

```sql
-- مثال: policy للـ products table
CREATE POLICY "Users can read products"
ON products FOR SELECT
TO authenticated
USING (
  -- JWT من Clerk هيحتوي على user.id في sub claim
  true
);

-- policy للـ user-specific data
CREATE POLICY "Users can read own data"
ON user_profiles FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'sub' = id::text
);
```

#### 6. استخدام في الكود

```typescript
// app/(website)/products/page.tsx
'use client'

import { useSupabaseWithClerk } from '@/lib/supabase/client-with-clerk'
import { useEffect, useState } from 'react'

export default function ProductsPage() {
  const supabase = useSupabaseWithClerk()
  const [products, setProducts] = useState([])

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .limit(20)

      setProducts(data || [])
    }

    loadProducts()
  }, [])

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

---

## الطريقة 2: NextAuth.js + Supabase (مجاني تماماً)

### 1. تثبيت NextAuth

```bash
npm install next-auth
```

### 2. إعداد NextAuth

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import { encode } from 'next-auth/jwt'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key
)

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // تحقق من المستخدم في database منفصل أو في Supabase
        const { data: user } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('email', credentials?.email)
          .single()

        if (user && verifyPassword(credentials?.password, user.password_hash)) {
          return {
            id: user.id,
            email: user.email,
            name: user.name
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.supabaseAccessToken = await createSupabaseJWT(token)
      }
      return session
    }
  }
})

// إنشاء JWT متوافق مع Supabase
async function createSupabaseJWT(token: any) {
  return encode({
    token: {
      sub: token.sub,
      email: token.email,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    },
    secret: process.env.SUPABASE_JWT_SECRET! // من Supabase Settings → API
  })
}

export { handler as GET, handler as POST }
```

### 3. استخدام مع Supabase

```typescript
// lib/supabase/client-with-nextauth.ts
import { createClient } from '@supabase/supabase-js'
import { useSession } from 'next-auth/react'

export function useSupabaseWithNextAuth() {
  const { data: session } = useSession()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: session?.supabaseAccessToken
          ? { Authorization: `Bearer ${session.supabaseAccessToken}` }
          : {}
      }
    }
  )

  return supabase
}
```

---

## الطريقة 3: Custom JWT (أقصى تحكم)

### 1. إنشاء Auth Service خاص

```typescript
// lib/auth/custom-auth.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!

export async function signIn(email: string, password: string) {
  // تحقق من المستخدم في database
  const user = await verifyUserCredentials(email, password)

  if (!user) {
    throw new Error('Invalid credentials')
  }

  // إنشاء JWT Token متوافق مع Supabase
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    JWT_SECRET,
    { algorithm: 'HS256' }
  )

  return { token, user }
}

export async function signUp(email: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, 10)

  // حفظ المستخدم في Supabase
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      email,
      password_hash: hashedPassword,
      name
    })
    .select()
    .single()

  if (error) throw error

  const token = jwt.sign(
    {
      sub: data.id,
      email: data.email,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    JWT_SECRET,
    { algorithm: 'HS256' }
  )

  return { token, user: data }
}
```

### 2. استخدام في الكود

```typescript
// app/api/auth/signin/route.ts
import { signIn } from '@/lib/auth/custom-auth'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  try {
    const { token, user } = await signIn(email, password)

    return Response.json({ token, user })
  } catch (error) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }
}
```

---

## مقارنة الخيارات:

| الحل | التكلفة (100K MAU) | السهولة | المميزات |
|------|-------------------|---------|-----------|
| **Clerk** | $25/شهر | ⭐⭐⭐⭐⭐ | UI جاهز، Social Login، أسهل حل |
| **NextAuth.js** | مجاني | ⭐⭐⭐⭐ | مجاني تماماً، مرن |
| **Custom JWT** | مجاني | ⭐⭐ | أقصى تحكم، معقد |

---

## الخلاصة:

### ✅ نعم، هتدفع $0 على MAU في Supabase!

**التكلفة المتوقعة لـ 200K MAU:**

#### مع Supabase Auth (الطريقة التقليدية):
- Organization: $25
- Project: $10
- MAU (100K إضافي): $325
- **الإجمالي: $360/شهر** 💸

#### مع Clerk + Supabase Data:
- Organization: $25
- Project: $10
- Clerk (200K MAU): $25 + (100K × $0.02) = $45
- Supabase MAU: **$0** ✅
- **الإجمالي: $80/شهر** 🎉

#### مع NextAuth + Supabase Data:
- Organization: $25
- Project: $10
- NextAuth: **$0** ✅
- Supabase MAU: **$0** ✅
- **الإجمالي: $35/شهر** 🚀

---

## النصيحة النهائية:

1. ✅ **استخدم Clerk** (أسهل وأسرع) إذا كنت عايز UI جاهز
2. ✅ **استخدم NextAuth.js** (مجاني تماماً) إذا كنت عايز توفر فلوس
3. ✅ **Custom JWT** فقط إذا كنت محتاج تحكم كامل

**كلهم هيخلوا MAU في Supabase = 0**

عايزني أساعدك في تطبيق أي طريقة منهم في المشروع الحالي؟
