// Database Settings Service - Advanced user preferences management
// Handles user-specific table configurations with intelligent caching and fallback mechanisms

import { supabase } from '@/app/lib/supabase/client';

export interface ColumnConfig {
  id: string;
  width: number;
  order: number;
  visible: boolean;
}

export interface TablePreferences {
  columns: ColumnConfig[];
  timestamp: number;
  version: string;
  reportType: string;
  userId: string;
}

interface CacheEntry {
  data: TablePreferences;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DatabaseSettingsService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  private readonly CURRENT_VERSION = '2.0.0';
  private pendingSaves = new Map<string, NodeJS.Timeout>();

  /**
   * Generate cache key for user settings
   */
  private getCacheKey(userId: string, reportType: string): string {
    return `${userId}_${reportType}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Get current user ID from Supabase session with enhanced error handling
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      // Check if we have a session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        return null;
      }

      if (!session) {
        return null;
      }

      // If we have a session, get the user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error getting current user:', userError.message);
        return null;
      }

      return user?.id || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Load user settings with intelligent caching
   */
  async loadUserSettings(reportType: string, userId?: string): Promise<TablePreferences | null> {
    try {
      // Get user ID if not provided
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        return null;
      }

      const cacheKey = this.getCacheKey(currentUserId, reportType);

      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        // console.log(`📦 Settings loaded from cache for ${reportType}:`, {
        //   userId: currentUserId,
        //   columns: cached.data.columns.length,
        //   cachedAt: new Date(cached.timestamp).toLocaleString('ar-SA')
        // });
        return cached.data;
      }

      // Load from database
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('report_type', reportType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading user settings:', error);
        return null;
      }

      if (!data) {
        // console.log(`📭 No saved preferences found for user ${currentUserId}, report ${reportType}`);
        return null;
      }

      // Parse and validate preferences
      const preferences: TablePreferences = {
        columns: (data.preferences as unknown as ColumnConfig[]) || [],
        timestamp: new Date(data.updated_at || Date.now()).getTime(),
        version: this.CURRENT_VERSION,
        reportType: reportType,
        userId: currentUserId
      };

      // Cache the loaded data
      this.cache.set(cacheKey, {
        data: preferences,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      // console.log(`✅ Settings loaded from database for ${reportType}:`, {
      //   userId: currentUserId,
      //   columns: preferences.columns.length,
      //   visibleColumns: preferences.columns.filter(col => col.visible).length,
      //   lastUpdated: new Date(preferences.timestamp).toLocaleString('ar-SA')
      // });

      return preferences;

    } catch (error) {
      console.error('Failed to load user settings:', error);
      return null;
    }
  }

  /**
   * Save user settings with debounced updates
   */
  async saveUserSettings(
    reportType: string,
    columns: ColumnConfig[],
    userId?: string,
    debounceMs: number = 1000
  ): Promise<boolean> {
    try {
      // Get user ID if not provided
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        // console.log('ℹ️ No authenticated user found - skipping database save for settings');
        return false;
      }

      const cacheKey = this.getCacheKey(currentUserId, reportType);

      // Cancel any pending save for this cache key
      const pendingTimeout = this.pendingSaves.get(cacheKey);
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }

      // Create the preferences object
      const preferences: TablePreferences = {
        columns,
        timestamp: Date.now(),
        version: this.CURRENT_VERSION,
        reportType,
        userId: currentUserId
      };

      // Update cache immediately for responsive UI
      this.cache.set(cacheKey, {
        data: preferences,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      // Debounce the database save
      const savePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(async () => {
          try {
            const { error } = await supabase
              .from('user_column_preferences')
              .upsert({
                user_id: currentUserId,
                report_type: reportType,
                preferences: columns as any,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id, report_type'
              });

            if (error) {
              console.error('Error saving user settings:', error);
              resolve(false);
              return;
            }

            // console.log(`💾 Settings saved to database for ${reportType}:`, {
            //   userId: currentUserId,
            //   columns: columns.length,
            //   visibleColumns: columns.filter(col => col.visible).length,
            //   hiddenColumns: columns.filter(col => !col.visible).length,
            //   savedAt: new Date().toLocaleString('ar-SA')
            // });

            // Clean up pending saves
            this.pendingSaves.delete(cacheKey);
            resolve(true);

          } catch (error) {
            console.error('Failed to save user settings:', error);
            resolve(false);
          }
        }, debounceMs);

        this.pendingSaves.set(cacheKey, timeout);
      });

      return await savePromise;

    } catch (error) {
      console.error('Failed to save user settings:', error);
      return false;
    }
  }

  /**
   * Clear cache for specific user and report type
   */
  clearCache(reportType: string, userId?: string): void {
    if (userId) {
      const cacheKey = this.getCacheKey(userId, reportType);
      this.cache.delete(cacheKey);
    } else {
      // Clear all cache entries for this report type
      const keysToDelete = Array.from(this.cache.keys()).filter(key =>
        key.endsWith(`_${reportType}`)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    // console.log('🧹 All settings cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    size: number;
    entries: Array<{key: string; size: number; age: number; ttl: number}>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Sync settings with localStorage as backup
   */
  async syncWithLocalStorage(reportType: string, userId?: string): Promise<void> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) return;

      const settings = await this.loadUserSettings(reportType, currentUserId);
      if (settings) {
        const backupKey = `backup_${reportType}_${currentUserId}`;
        localStorage.setItem(backupKey, JSON.stringify({
          ...settings,
          backupTimestamp: Date.now()
        }));

        // console.log(`🔄 Settings synced to localStorage backup for ${reportType}`);
      }
    } catch (error) {
      // console.warn('Failed to sync with localStorage:', error);
    }
  }

  /**
   * Load backup settings from localStorage
   */
  loadBackupSettings(reportType: string, userId: string): TablePreferences | null {
    try {
      const backupKey = `backup_${reportType}_${userId}`;
      const backupData = localStorage.getItem(backupKey);

      if (!backupData) return null;

      const parsed = JSON.parse(backupData);

      // Check if backup is not too old (24 hours)
      const backupAge = Date.now() - (parsed.backupTimestamp || 0);
      const maxBackupAge = 24 * 60 * 60 * 1000; // 24 hours

      if (backupAge > maxBackupAge) {
        localStorage.removeItem(backupKey);
        return null;
      }

      // console.log(`🔄 Loaded backup settings from localStorage for ${reportType}`);
      return parsed;

    } catch (error) {
      // console.warn('Failed to load backup settings:', error);
      return null;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    database: boolean;
    cache: boolean;
    user: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let database = false;
    let cache = true;
    let user = false;

    try {
      // Test database connection
      const { error } = await supabase
        .from('user_column_preferences')
        .select('id')
        .limit(1);

      database = !error;
      if (error) errors.push(`Database: ${error.message}`);

      // Skip Supabase Auth user check since we use NextAuth
      // The user session is managed by NextAuth, not Supabase Auth
      user = true;

      // Cache is always healthy if no errors
      const cacheStats = this.getCacheStats();
      // console.log('📊 Health Check Cache Stats:', cacheStats);

    } catch (error) {
      errors.push(`System: ${error}`);
    }

    const isHealthy = database && cache && errors.length === 0;

    return {
      isHealthy,
      database,
      cache,
      user,
      errors
    };
  }
}

// Create singleton instance
export const databaseSettingsService = new DatabaseSettingsService();

// Export class for testing purposes
export { DatabaseSettingsService };