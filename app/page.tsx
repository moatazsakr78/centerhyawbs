import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import ClientHomePage from '@/components/website/ClientHomePage';
import { CartProvider } from '@/lib/contexts/CartContext';
import { headers } from 'next/headers';

// Initialize Supabase client for server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ISR: Revalidate every hour (3600 seconds)
export const revalidate = 3600;

// Server-side function to fetch all products with their variants
async function getAllProducts() {
  try {
    console.log('🔵 Server: Fetching all products from database...');

    // Fetch products with categories
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        wholesale_price,
        discount_percentage,
        main_image_url,
        stock,
        rating,
        rating_count,
        is_hidden,
        is_featured,
        display_order,
        category:categories(id, name),
        product_images(image_url, sort_order)
      `)
      .eq('is_hidden', false)
      .order('display_order', { ascending: true });

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return { products: [], variants: [], sizeGroups: [], categories: [] };
    }

    // Fetch all product variants (colors and shapes)
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .in('variant_type', ['color', 'shape']);

    if (variantsError) {
      console.error('❌ Error fetching variants:', variantsError);
    }

    // Fetch size groups with their items
    const { data: sizeGroups, error: sizeGroupsError } = await supabase
      .from('product_size_groups')
      .select(`
        *,
        product_size_group_items (
          *,
          products (
            id,
            name,
            main_image_url,
            price,
            description
          )
        )
      `)
      .eq('is_active', true);

    if (sizeGroupsError) {
      console.error('❌ Error fetching size groups:', sizeGroupsError);
    }

    // Fetch store categories with products
    const { data: categories, error: categoriesError } = await supabase
      .from('store_categories')
      .select(`
        id,
        name,
        description,
        image_url,
        color,
        is_active,
        sort_order
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
    }

    console.log('✅ Server: Fetched', products?.length || 0, 'products');
    console.log('✅ Server: Fetched', variants?.length || 0, 'variants');
    console.log('✅ Server: Fetched', sizeGroups?.length || 0, 'size groups');
    console.log('✅ Server: Fetched', categories?.length || 0, 'categories');

    return {
      products: products || [],
      variants: variants || [],
      sizeGroups: sizeGroups || [],
      categories: categories || []
    };
  } catch (error) {
    console.error('❌ Server: Error in getAllProducts:', error);
    return { products: [], variants: [], sizeGroups: [], categories: [] };
  }
}

// Server-side device detection
function getDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري تحميل التطبيق...</p>
      </div>
    </div>
  );
}

// Main HomePage - Server Component
export default async function HomePage() {
  // Get user agent from headers for server-side device detection
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  const deviceType = getDeviceType(userAgent);

  // Fetch all data on the server (SSG/ISR)
  const { products, variants, sizeGroups, categories } = await getAllProducts();

  // Process products to add variants and size groups
  const productsWithVariants = products.map((product: any) => {
    // Get product variants
    const productColors = variants.filter(
      (v: any) => v.product_id === product.id && v.variant_type === 'color'
    );
    const productShapes = variants.filter(
      (v: any) => v.product_id === product.id && v.variant_type === 'shape'
    );

    // Get all images (main + sub images)
    const allImages = [
      product.main_image_url,
      ...(product.product_images || []).map((img: any) => img.image_url)
    ].filter(Boolean);

    // Calculate discount
    const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
    const finalPrice = hasDiscount
      ? Number(product.price) * (1 - Number(product.discount_percentage) / 100)
      : Number(product.price);

    return {
      ...product,
      finalPrice,
      hasDiscount,
      colors: productColors.map((v: any) => ({
        id: v.id,
        name: v.color_name || v.name || 'لون غير محدد',
        hex: v.color_hex || '#000000',
        image_url: v.image_url || null
      })),
      shapes: productShapes.map((v: any) => ({
        id: v.id,
        name: v.name || 'شكل غير محدد',
        image_url: v.image_url || null
      })),
      allImages
    };
  });

  // Pass data to client component based on device type
  const commonProps = {
    initialProducts: productsWithVariants,
    initialCategories: categories,
    initialSizeGroups: sizeGroups
  };

  return (
    <CartProvider>
      <Suspense fallback={<LoadingScreen />}>
        <ClientHomePage
          deviceType={deviceType}
          {...commonProps}
        />
      </Suspense>
    </CartProvider>
  );
}
