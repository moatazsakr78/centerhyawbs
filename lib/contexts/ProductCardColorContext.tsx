'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase/client';

interface ProductCardColorContextType {
  isLoading: boolean;
}

const ProductCardColorContext = createContext<ProductCardColorContextType>({ isLoading: true });

export function ProductCardColorProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set CSS variable on the document root
    const setColorVariable = (backgroundColor: string) => {
      const root = document.documentElement;
      root.style.setProperty('--product-card-bg-color', backgroundColor);
    };

    // Set default color immediately (before fetching from DB)
    setColorVariable('#D1D5DB'); // Default gray color

    // Fetch active color from database
    const fetchActiveColor = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('product_card_colors')
          .select('*')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          setColorVariable(data.background_color);
        }
      } catch (err) {
        console.error('Error fetching product card color:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveColor();

    // Subscribe to color changes
    const subscription = (supabase as any)
      .channel('product_card_color_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_card_colors',
        },
        () => {
          fetchActiveColor();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ProductCardColorContext.Provider value={{ isLoading }}>
      {children}
    </ProductCardColorContext.Provider>
  );
}

export function useProductCardColorContext() {
  return useContext(ProductCardColorContext);
}
