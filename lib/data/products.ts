/**
 * Server-side data fetching functions for products
 * These functions run on the server and support Static Generation & ISR
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/app/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a server-side Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist sessions on server
  },
});

/**
 * Get all active products for the website
 * Supports Static Generation with ISR
 */
export async function getWebsiteProducts() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        main_image_url,
        category_id,
        is_active,
        is_hidden,
        is_featured,
        discount_percentage,
        discount_amount,
        discount_start_date,
        discount_end_date,
        rating,
        rating_count,
        display_order,
        categories (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .eq('is_hidden', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return products || [];
  } catch (error) {
    console.error('Error fetching website products:', error);
    return [];
  }
}

/**
 * Get product by ID for product detail page
 * Supports Static Generation with ISR
 */
export async function getProductById(productId: string) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        additional_images_urls,
        categories (
          id,
          name,
          name_en
        )
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .eq('is_hidden', false)
      .single();

    if (error) throw error;

    return product;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    return null;
  }
}

/**
 * Get store categories with their products
 * Used for category carousels
 */
export async function getStoreCategoriesWithProducts() {
  try {
    const { data: categories, error } = await supabase
      .from('store_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // For each category, get its products via the junction table
    const categoriesWithProducts = await Promise.all(
      (categories || []).map(async (category) => {
        // Get product IDs from junction table
        const { data: categoryProducts } = await supabase
          .from('store_category_products')
          .select('product_id')
          .eq('store_category_id', category.id)
          .order('sort_order', { ascending: true });

        const productIds = (categoryProducts?.map(cp => cp.product_id).filter((id): id is string => id !== null)) || [];

        if (productIds.length === 0) {
          return { ...category, products: [] };
        }

        const { data: products } = await supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            main_image_url,
            discount_percentage,
            discount_amount,
            discount_start_date,
            discount_end_date,
            rating,
            rating_count
          `)
          .in('id', productIds)
          .eq('is_active', true)
          .eq('is_hidden', false);

        return {
          ...category,
          products: products || [],
        };
      })
    );

    return categoriesWithProducts;
  } catch (error) {
    console.error('Error fetching store categories:', error);
    return [];
  }
}

/**
 * Get custom sections with their products
 * Used for custom product sections
 *
 * Note: Custom sections table doesn't exist yet in this database
 * Returning empty array for now - can be implemented when table is created
 */
export async function getCustomSections() {
  // TODO: Implement when custom_sections table is created
  return [];
}

/**
 * Get company settings
 *
 * Note: This will be implemented based on your actual settings table structure
 * For now, returning null
 */
export async function getCompanySettings() {
  // TODO: Implement when company settings table structure is confirmed
  return null;
}

/**
 * Get store theme colors
 *
 * Note: Returning default theme colors for now
 * Can be connected to actual theme table when available
 */
export async function getStoreTheme() {
  // TODO: Connect to actual theme table if exists
  return {
    primary_color: '#DC2626',
    primary_hover_color: '#B91C1C',
    interactive_color: '#EF4444'
  };
}

/**
 * Get product display settings
 *
 * Note: Returning default settings for now
 * Can be connected to actual settings table when available
 */
export async function getProductDisplaySettings() {
  // TODO: Connect to actual settings table if exists
  return {
    show_ratings: true,
    show_stock: true,
    show_prices: true
  };
}
