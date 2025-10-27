'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase/client';

export type DisplayMode = 'show_all' | 'show_with_stock' | 'show_with_stock_and_vote';

export interface ProductDisplaySettings {
  id?: string;
  display_mode: DisplayMode;
  selected_warehouses: string[];
  selected_branches: string[];
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseOrBranch {
  id: string;
  name: string;
  type: 'warehouse' | 'branch';
}

export function useProductDisplaySettings() {
  const [settings, setSettings] = useState<ProductDisplaySettings>({
    display_mode: 'show_all',
    selected_warehouses: [],
    selected_branches: []
  });
  const [warehouses, setWarehouses] = useState<WarehouseOrBranch[]>([]);
  const [branches, setBranches] = useState<WarehouseOrBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        // Load display settings
        const { data: settingsData, error: settingsError } = await (supabase as any)
          .from('product_display_settings')
          .select('*')
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error loading display settings:', settingsError);
        } else if (settingsData) {
          setSettings({
            id: settingsData.id,
            display_mode: settingsData.display_mode,
            selected_warehouses: settingsData.selected_warehouses || [],
            selected_branches: settingsData.selected_branches || [],
            created_at: settingsData.created_at,
            updated_at: settingsData.updated_at
          });
        }

        // Load warehouses
        const { data: warehousesData, error: warehousesError } = await (supabase as any)
          .from('warehouses')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (warehousesError) {
          console.error('Error loading warehouses:', warehousesError);
        } else {
          setWarehouses(
            (warehousesData || []).map((w: any) => ({
              id: w.id,
              name: w.name,
              type: 'warehouse' as const
            }))
          );
        }

        // Load branches
        const { data: branchesData, error: branchesError } = await (supabase as any)
          .from('branches')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (branchesError) {
          console.error('Error loading branches:', branchesError);
        } else {
          setBranches(
            (branchesData || []).map((b: any) => ({
              id: b.id,
              name: b.name,
              type: 'branch' as const
            }))
          );
        }
      } catch (error) {
        console.error('Error loading product display settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update settings in database
  const updateSettings = async (newSettings: Partial<ProductDisplaySettings>) => {
    try {
      setIsSaving(true);

      const updatedSettings = {
        ...settings,
        ...newSettings
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await (supabase as any)
          .from('product_display_settings')
          .update({
            display_mode: updatedSettings.display_mode,
            selected_warehouses: updatedSettings.selected_warehouses,
            selected_branches: updatedSettings.selected_branches,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await (supabase as any)
          .from('product_display_settings')
          .insert({
            display_mode: updatedSettings.display_mode,
            selected_warehouses: updatedSettings.selected_warehouses,
            selected_branches: updatedSettings.selected_branches
          })
          .select()
          .single();

        if (error) throw error;
        updatedSettings.id = data.id;
      }

      setSettings(updatedSettings);
      return { success: true };
    } catch (error) {
      console.error('Error updating product display settings:', error);
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  };

  // Get all available locations (warehouses + branches)
  const getAllLocations = (): WarehouseOrBranch[] => {
    return [...warehouses, ...branches];
  };

  return {
    settings,
    warehouses,
    branches,
    isLoading,
    isSaving,
    updateSettings,
    getAllLocations
  };
}
