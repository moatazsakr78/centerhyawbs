import { supabase } from '@/app/lib/supabase/client';
import { POSTab } from '@/lib/hooks/usePOSTabs';

export interface POSTabsState {
  tabs: POSTab[];
  active_tab_id: string;
}

/**
 * Service for managing POS tabs state in Supabase
 */
class POSTabsService {
  private userId: string | null = null;
  private isInitialized = false;

  /**
   * Initialize the service with the current user
   */
  async initialize() {
    if (this.isInitialized) return;

    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;
    this.isInitialized = true;
  }

  /**
   * Ensure user is authenticated
   */
  private async ensureAuth() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.userId) {
      throw new Error('User not authenticated');
    }

    return this.userId;
  }

  /**
   * Load POS tabs state from database
   */
  async loadTabsState(): Promise<POSTabsState | null> {
    try {
      const userId = await this.ensureAuth();

      const { data, error } = await (supabase as any)
        .from('pos_tabs_state')
        .select('tabs, active_tab_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return null
          return null;
        }
        throw error;
      }

      return {
        tabs: data.tabs as POSTab[],
        active_tab_id: data.active_tab_id
      };
    } catch (error) {
      // Silent fail - POS will work with default tabs
      return null;
    }
  }

  /**
   * Save POS tabs state to database
   */
  async saveTabsState(tabs: POSTab[], activeTabId: string): Promise<boolean> {
    try {
      const userId = await this.ensureAuth();

      const { error } = await (supabase as any)
        .from('pos_tabs_state')
        .upsert({
          user_id: userId,
          tabs: tabs,
          active_tab_id: activeTabId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        // Silent fail
        return false;
      }

      return true;
    } catch (error) {
      // Silent fail - POS will work without persistence
      return false;
    }
  }

  /**
   * Clear POS tabs state from database
   */
  async clearTabsState(): Promise<boolean> {
    try {
      const userId = await this.ensureAuth();

      const { error } = await (supabase as any)
        .from('pos_tabs_state')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing POS tabs state:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error clearing POS tabs state:', error);
      return false;
    }
  }
}

// Export singleton instance
export const posTabsService = new POSTabsService();
