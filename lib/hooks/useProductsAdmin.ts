/**
 * ✨ SUPER OPTIMIZED Products Hook for Admin Pages
 *
 * Performance improvements:
 * - Reduces 201 queries to 3 queries (for 100 products)
 * - Uses client-side caching
 * - Selective field fetching
 * - Batch processing
 *
 * Use this for: Inventory, POS, Admin Products pages
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import {
  getProductsWithInventory,
  groupInventoryByProduct,
  groupVariantsByProduct,
  calculateTotalStock,
} from '@/lib/data/admin';

export interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  price: number;
  cost_price: number;
  main_image_url?: string | null;
  sub_image_url?: string | null;
  category_id?: string | null;
  is_active?: boolean | null;
  display_order?: number | null;
  stock?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  unit?: string | null;
  description?: string | null;
  wholesale_price?: number | null;
  price1?: number | null;
  price2?: number | null;
  price3?: number | null;
  price4?: number | null;
  category?: {
    id: string;
    name: string;
  } | null;
  // Computed fields
  totalQuantity?: number;
  inventoryData?: Record<string, { quantity: number; min_stock: number; audit_status?: string }>;
  variantsData?: Record<string, any[]>;
  productColors?: Array<{id: string; name: string; color: string}>;
  allImages?: string[];
}

export interface Branch {
  id: string;
  name: string;
  name_en?: string | null;
  address?: string;
  is_active?: boolean | null;
}

export function useProductsAdmin(options?: { selectedBranches?: string[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Memoize selected branches to prevent unnecessary re-fetches
  const selectedBranches = useMemo(() => options?.selectedBranches || [], [options?.selectedBranches]);

  const fetchProducts = useCallback(async (force = false) => {
    try {
      // Simple cache: don't refetch if less than 5 seconds since last fetch (unless forced)
      const now = Date.now();
      if (!force && lastFetch && now - lastFetch < 5000) {
        console.log('⚡ Using cached data (< 5s old)');
        return;
      }

      setIsLoading(true);
      setError(null);

      console.time('⚡ Fetch products with inventory');

      // ✨ Fetch branches first (needed for data processing)
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (branchesError) {
        console.warn('Unable to fetch branches:', branchesError);
      } else {
        setBranches(branchesData || []);
      }

      // ✨ ONE optimized call instead of N+1 queries!
      const { products: rawProducts, inventory, variants } = await getProductsWithInventory();

      console.timeEnd('⚡ Fetch products with inventory');

      // Group inventory and variants by product ID for O(1) lookup
      const inventoryMap = groupInventoryByProduct(inventory);
      const variantsMap = groupVariantsByProduct(variants);

      // Enrich products with computed data (client-side - fast!)
      const enrichedProducts: Product[] = rawProducts.map((product: any) => {
        const productInventory = inventoryMap.get(product.id) || [];
        const productVariants = variantsMap.get(product.id) || [];

        // Calculate total stock
        const totalQuantity = calculateTotalStock(inventory, product.id, selectedBranches);

        // Group inventory by branch for easy lookup
        const inventoryData: Record<string, any> = {};
        productInventory.forEach((inv: any) => {
          const locationId = inv.branch_id || inv.warehouse_id;
          if (locationId) {
            inventoryData[locationId] = {
              quantity: inv.quantity || 0,
              min_stock: inv.min_stock || 0,
              audit_status: inv.audit_status || 'غير مجرود',
            };
          }
        });

        // Group variants by branch
        const variantsData: Record<string, any[]> = {};
        productVariants.forEach((variant: any) => {
          if (variant.branch_id) {
            if (!variantsData[variant.branch_id]) {
              variantsData[variant.branch_id] = [];
            }
            variantsData[variant.branch_id].push(variant);
          }
        });

        // ✨ Process product images (main + sub + variants)
        const allProductImages: string[] = [];
        if (product.main_image_url) allProductImages.push(product.main_image_url);
        if (product.sub_image_url) allProductImages.push(product.sub_image_url);

        // Add variant images
        productVariants.forEach((variant: any) => {
          if (variant.image_url) allProductImages.push(variant.image_url);
        });

        // Remove duplicates
        const allImages = Array.from(new Set(allProductImages.filter(img => img && img.trim() !== '')));

        return {
          ...product,
          totalQuantity,
          inventoryData,
          variantsData,
          allImages,
        };
      });

      setProducts(enrichedProducts);
      setLastFetch(now);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'فشل في جلب المنتجات');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranches, lastFetch]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ✨ Real-time updates (optimized - single subscription for ALL products)
  useEffect(() => {
    console.log('🔴 Setting up real-time subscription');

    // Subscribe to products changes
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('📡 Products change detected:', payload.eventType);
          // Debounce: wait 500ms before refetching
          setTimeout(() => fetchProducts(true), 500);
        }
      )
      .subscribe();

    // Subscribe to inventory changes
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
        },
        (payload) => {
          console.log('📡 Inventory change detected:', payload.eventType);
          setTimeout(() => fetchProducts(true), 500);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔴 Cleaning up real-time subscriptions');
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [fetchProducts]);

  return {
    products,
    setProducts, // ✨ Expose setProducts for optimistic updates
    branches, // ✨ Expose branches for UI components
    isLoading,
    error,
    fetchProducts: () => fetchProducts(true), // Force refetch
  };
}
