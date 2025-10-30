'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase/client';

interface BackgroundColorContextType {
  isLoading: boolean;
}

const BackgroundColorContext = createContext<BackgroundColorContextType>({ isLoading: true });

export function BackgroundColorProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set CSS variable on the document root
    const setColorVariable = (backgroundColor: string) => {
      const root = document.documentElement;
      root.style.setProperty('--background-color', backgroundColor);
    };

    // Set default color immediately (before fetching from DB)
    setColorVariable('#C0C0C0'); // Default gray color

    // Fetch active color from database
    const fetchActiveColor = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('background_colors')
          .select('*')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          setColorVariable(data.background_color);
        }
      } catch (err) {
        console.error('Error fetching background color:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveColor();

    // Subscribe to color changes
    const subscription = (supabase as any)
      .channel('background_color_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_colors',
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
    <BackgroundColorContext.Provider value={{ isLoading }}>
      {children}
    </BackgroundColorContext.Provider>
  );
}

export function useBackgroundColorContext() {
  return useContext(BackgroundColorContext);
}
