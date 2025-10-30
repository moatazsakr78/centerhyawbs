import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase/client';

export interface BackgroundColor {
  id: string;
  name: string;
  background_color: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
}

// Default background color (fallback)
const DEFAULT_BACKGROUND_COLOR: BackgroundColor = {
  id: 'default',
  name: 'رمادي (افتراضي)',
  background_color: '#C0C0C0',
  is_active: true,
  is_default: true,
};

// Hook for getting active background color
export function useBackgroundColor() {
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR.background_color);
  const [colorName, setColorName] = useState(DEFAULT_BACKGROUND_COLOR.name);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch active color
    const fetchActiveColor = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('background_colors')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching active background color:', error);
          // Use default color on error
          setBackgroundColor(DEFAULT_BACKGROUND_COLOR.background_color);
          setColorName(DEFAULT_BACKGROUND_COLOR.name);
        } else if (data) {
          setBackgroundColor(data.background_color);
          setColorName(data.name);
        }
      } catch (err) {
        console.error('Unexpected error fetching background color:', err);
        // Use default color on error
        setBackgroundColor(DEFAULT_BACKGROUND_COLOR.background_color);
        setColorName(DEFAULT_BACKGROUND_COLOR.name);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveColor();

    // Subscribe to changes
    const subscription = (supabase as any)
      .channel('background_color_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_colors',
        },
        (payload: any) => {
          // Re-fetch when color changes
          fetchActiveColor();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    backgroundColor,
    colorName,
    isLoading,
  };
}

// Hook for managing all background colors (for settings page)
export function useBackgroundColors() {
  const [colors, setColors] = useState<BackgroundColor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchColors = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('background_colors')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching background colors:', error);
        setColors([DEFAULT_BACKGROUND_COLOR]);
      } else {
        setColors(data || [DEFAULT_BACKGROUND_COLOR]);
      }
    } catch (err) {
      console.error('Unexpected error fetching background colors:', err);
      setColors([DEFAULT_BACKGROUND_COLOR]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();

    // Subscribe to changes
    const subscription = (supabase as any)
      .channel('background_colors_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_colors',
        },
        () => {
          fetchColors();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addColor = async (name: string, backgroundColor: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('background_colors')
        .insert({
          name,
          background_color: backgroundColor,
          is_active: false,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding background color:', error);
        throw error;
      }

      await fetchColors();
      return data;
    } catch (err) {
      console.error('Error in addColor:', err);
      throw err;
    }
  };

  const activateColor = async (colorId: string) => {
    try {
      // First, deactivate all colors
      const { error: deactivateError } = await (supabase as any)
        .from('background_colors')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (deactivateError) {
        console.error('Error deactivating colors:', deactivateError);
        throw deactivateError;
      }

      // Then activate the selected color
      const { error: activateError } = await (supabase as any)
        .from('background_colors')
        .update({ is_active: true })
        .eq('id', colorId);

      if (activateError) {
        console.error('Error activating color:', activateError);
        throw activateError;
      }

      await fetchColors();
    } catch (err) {
      console.error('Error in activateColor:', err);
      throw err;
    }
  };

  const deleteColor = async (colorId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('background_colors')
        .delete()
        .eq('id', colorId);

      if (error) {
        console.error('Error deleting background color:', error);
        throw error;
      }

      await fetchColors();
    } catch (err) {
      console.error('Error in deleteColor:', err);
      throw err;
    }
  };

  const updateColor = async (colorId: string, name: string, backgroundColor: string) => {
    try {
      const { error } = await (supabase as any)
        .from('background_colors')
        .update({
          name,
          background_color: backgroundColor,
        })
        .eq('id', colorId);

      if (error) {
        console.error('Error updating background color:', error);
        throw error;
      }

      await fetchColors();
    } catch (err) {
      console.error('Error in updateColor:', err);
      throw err;
    }
  };

  return {
    colors,
    isLoading,
    addColor,
    activateColor,
    deleteColor,
    updateColor,
    refreshColors: fetchColors,
  };
}
