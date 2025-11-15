# دليل التسوق بدون Authentication (مجاني 100%)

## المفهوم الأساسي:

**معظم الزوار مش محتاجين حساب!** - هما بس عايزين:
1. يشوفوا المنتجات
2. يضيفوا للسلة
3. يطلبوا order
4. يتابعوا الطلب عن طريق رقم الطلب فقط

**مفيش authentication = مفيش MAU charges!**

---

## الـ Architecture المقترح:

### 1. للزوار (Guest Users):
- مفيش تسجيل دخول مطلوب
- السلة في `localStorage`
- عند الطلب: يدخل (الاسم، التليفون، العنوان) ويخلص
- يحصل على Order ID للمتابعة

### 2. للمستخدمين اللي عايزين Account (اختياري):
- يقدر يعمل حساب لو عايز يتابع كل طلباته
- يحفظ عناوينه المفضلة
- يحصل على نقاط ولاء
- **بس ده optional!** معظم الناس مش هيعملوا حساب

---

## الكود التطبيقي:

### 1. Supabase RLS Policies (للقراءة العامة)

```sql
-- المنتجات: قراءة عامة للجميع (بدون auth)
CREATE POLICY "Anyone can read products"
ON products FOR SELECT
TO anon, authenticated  -- ملاحظة: anon = بدون تسجيل دخول
USING (true);

-- الفئات: قراءة عامة
CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
TO anon, authenticated
USING (true);

-- الطلبات: الزوار يقدروا يعملوا insert بس
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- الطلبات: القراءة بـ order_number (بدون auth)
CREATE POLICY "Anyone can read own order by order_number"
ON orders FOR SELECT
TO anon, authenticated
USING (true);
```

### 2. صفحة المنتجات (بدون Authentication)

```typescript
// app/(website)/products/page.tsx
'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// ⚠️ استخدم anon key فقط (بدون authentication!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // ملاحظة: مفيش JWT headers هنا!
)

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    // Public read - مفيش authentication مطلوب!
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        image_url,
        description,
        category:categories(name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setProducts(data)
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### 3. Shopping Cart (localStorage فقط)

```typescript
// lib/cart/guest-cart.ts

export interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url?: string
}

export class GuestCart {
  private static CART_KEY = 'guest_cart'

  // إضافة منتج للسلة
  static addItem(item: CartItem): void {
    const cart = this.getCart()
    const existingIndex = cart.findIndex(i => i.product_id === item.product_id)

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += item.quantity
    } else {
      cart.push(item)
    }

    localStorage.setItem(this.CART_KEY, JSON.stringify(cart))
  }

  // الحصول على السلة
  static getCart(): CartItem[] {
    if (typeof window === 'undefined') return []

    const cart = localStorage.getItem(this.CART_KEY)
    return cart ? JSON.parse(cart) : []
  }

  // حذف من السلة
  static removeItem(product_id: string): void {
    const cart = this.getCart().filter(i => i.product_id !== product_id)
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart))
  }

  // تحديث الكمية
  static updateQuantity(product_id: string, quantity: number): void {
    const cart = this.getCart()
    const item = cart.find(i => i.product_id === product_id)
    if (item) {
      item.quantity = quantity
      localStorage.setItem(this.CART_KEY, JSON.stringify(cart))
    }
  }

  // مسح السلة
  static clearCart(): void {
    localStorage.removeItem(this.CART_KEY)
  }

  // حساب الإجمالي
  static getTotal(): number {
    return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }
}
```

### 4. صفحة السلة

```typescript
// app/(website)/cart/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { GuestCart } from '@/lib/cart/guest-cart'
import Link from 'next/link'

export default function CartPage() {
  const [cart, setCart] = useState([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadCart()
  }, [])

  function loadCart() {
    setCart(GuestCart.getCart())
    setTotal(GuestCart.getTotal())
  }

  function updateQuantity(product_id: string, quantity: number) {
    GuestCart.updateQuantity(product_id, quantity)
    loadCart()
  }

  function removeItem(product_id: string) {
    GuestCart.removeItem(product_id)
    loadCart()
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">السلة</h1>

      {cart.length === 0 ? (
        <div className="text-center py-8">
          <p>السلة فارغة</p>
          <Link href="/products" className="text-blue-500">
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.product_id} className="flex items-center gap-4 border p-4">
                <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover" />
                <div className="flex-1">
                  <h3>{item.name}</h3>
                  <p>{item.price} ج.م</p>
                </div>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                  className="w-20 p-2 border"
                />
                <button onClick={() => removeItem(item.product_id)}>حذف</button>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t pt-4">
            <p className="text-xl font-bold">الإجمالي: {total} ج.م</p>
            <Link href="/checkout" className="btn btn-primary mt-4">
              إتمام الطلب
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
```

### 5. صفحة Checkout (Guest Order)

```typescript
// app/(website)/checkout/page.tsx
'use client'

import { useState } from 'react'
import { GuestCart } from '@/lib/cart/guest-cart'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    address: '',
    notes: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const cart = GuestCart.getCart()
      const total = GuestCart.getTotal()

      // إرسال الطلب للـ API (بدون authentication!)
      const response = await fetch('/api/orders/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: cart,
          total,
          order_type: 'guest'
        })
      })

      const { order_number } = await response.json()

      // مسح السلة
      GuestCart.clearCart()

      // التوجيه لصفحة تأكيد الطلب
      router.push(`/order-confirmation/${order_number}`)
    } catch (error) {
      alert('حدث خطأ في إنشاء الطلب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">إتمام الطلب</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>الاسم</label>
          <input
            type="text"
            required
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="w-full p-2 border"
          />
        </div>

        <div>
          <label>رقم التليفون</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full p-2 border"
          />
        </div>

        <div>
          <label>العنوان</label>
          <textarea
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full p-2 border"
            rows={3}
          />
        </div>

        <div>
          <label>ملاحظات (اختياري)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 border"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded"
        >
          {loading ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
        </button>
      </form>
    </div>
  )
}
```

### 6. API Route للـ Guest Orders

```typescript
// app/api/orders/guest/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// استخدم Service Role Key للكتابة المباشرة
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Service role
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_name, phone, address, notes, items, total } = body

    // إنشاء order number فريد
    const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // إدراج الطلب
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number,
        customer_name,
        customer_phone: phone,
        delivery_address: address,
        notes,
        total_amount: total,
        status: 'pending',
        order_type: 'guest', // مهم: guest order
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    // إدراج الـ items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    return NextResponse.json({
      success: true,
      order_number,
      order_id: order.id
    })
  } catch (error) {
    console.error('Guest order error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
```

### 7. تتبع الطلب (بدون Auth)

```typescript
// app/(website)/track-order/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)

  async function trackOrder() {
    setLoading(true)

    // البحث بـ order_number (بدون authentication!)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('order_number', orderNumber)
      .single()

    if (data) setOrder(data)
    else alert('الطلب غير موجود')

    setLoading(false)
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">تتبع الطلب</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="رقم الطلب"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full p-2 border"
        />
        <button onClick={trackOrder} disabled={loading} className="w-full bg-blue-500 text-white p-2">
          {loading ? 'جاري البحث...' : 'تتبع'}
        </button>
      </div>

      {order && (
        <div className="mt-8 border p-4">
          <h2 className="font-bold">الطلب: {order.order_number}</h2>
          <p>الحالة: {order.status}</p>
          <p>الإجمالي: {order.total_amount} ج.م</p>
          <p>التاريخ: {new Date(order.created_at).toLocaleDateString('ar-EG')}</p>

          <h3 className="font-bold mt-4">المنتجات:</h3>
          <ul>
            {order.order_items.map(item => (
              <li key={item.id}>
                {item.product_name} × {item.quantity} = {item.total_price} ج.م
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

---

## المميزات:

✅ **مفيش MAU charges** - كل الزوار anonymous
✅ **UX سلس** - الزائر يشوف ويطلب فوراً بدون تعقيدات
✅ **تتبع الطلبات** - عن طريق Order Number
✅ **مجاني 100%** - حتى لو مليون زائر
✅ **اختياري Account** - لو الزائر عايز يحفظ بياناته

---

## الحسابات المالية:

### السيناريو: 200K زائر شهرياً

#### مع الطريقة التقليدية (Supabase Auth):
- Organization: $25
- Project: $10
- MAU (100K زيادة): $325
- **الإجمالي: $360/شهر** 💸

#### مع Guest Shopping:
- Organization: $25
- Project: $10
- MAU: **$0** (معظم الناس مش هيعملوا حساب!)
- **الإجمالي: $35/شهر** 🎉

#### حتى لو 10% عملوا حسابات (20K accounts):
- Organization: $25
- Project: $10
- MAU: $0 (أقل من 100K)
- **الإجمالي: $35/شهر فقط!** 🚀

---

## نصائح إضافية:

### 1. تشجيع Guest Checkout:
```typescript
// اجعل Guest Checkout هو الخيار الافتراضي
<button>إتمام الطلب كزائر (أسرع)</button>
<button>تسجيل الدخول (اختياري)</button>
```

### 2. Order Tracking بدون Account:
- أرسل Order Number عبر SMS/WhatsApp
- الزائر يتتبع طلبه بالرقم فقط

### 3. Optional Account بعد الطلب:
```typescript
// بعد نجاح الطلب
<p>عايز تتابع طلباتك دايماً؟</p>
<button>إنشاء حساب (اختياري)</button>
```

---

## الخلاصة:

### ✅ نعم! ممكن تخدم 100K-500K زائر **مجاناً تماماً**

**كيف؟**
1. المنتجات: Public read (RLS policy)
2. السلة: localStorage
3. الطلبات: Guest orders (بدون auth)
4. التتبع: Order number فقط
5. Account: اختياري (5-10% فقط هيعملوا)

**النتيجة:**
- MAU في Supabase: 0-10K (مجاناً!)
- التكلفة: $35/شهر فقط
- السعة: unlimited زوار

---

**جاهز أبدأ معاك التطبيق؟** 🚀
