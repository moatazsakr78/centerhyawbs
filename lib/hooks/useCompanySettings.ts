'use client';

import { useSystemSettings } from './useSystemSettings';
import { CompanySettings, SocialMedia, Branch } from '../types/settings';

// Hook for managing company information
export function useCompanySettings() {
  const { getCompanySettings, updateSettings, isLoading } = useSystemSettings();

  // Get company settings from system settings
  const companySettings = getCompanySettings();

  const updateCompanySettings = async (settings: Partial<CompanySettings>) => {
    try {
      await updateSettings({
        company: settings
      });
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  };

  return {
    companyName: companySettings.name,
    logoUrl: companySettings.logoUrl,
    socialMedia: companySettings.socialMedia,
    branches: companySettings.branches,
    logoWidth: companySettings.logoWidth || 80,
    logoHeight: companySettings.logoHeight || 80,
    logoWidthCompact: companySettings.logoWidthCompact || 40,
    logoHeightCompact: companySettings.logoHeightCompact || 40,
    updateCompanySettings,
    isLoading
  };
}

// Export types for convenience
export type { CompanySettings, SocialMedia, Branch };
