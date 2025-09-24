"use client";

import { useEffect, useRef } from 'react';
import { useConfigStore } from '@/store/config';

/**
 * Hook to ensure settings are synchronized with fresh data
 * Implements optimistic updates with localStorage fallback
 */
export const useSettingsSync = () => {
  const {
    settings,
    settingsFetched,
    setSettings,
    setExtensions,
    setSettingsFetched,
    setSettingsError
  } = useConfigStore();

  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once per app load
    if (hasInitialized.current || typeof window === 'undefined') return;
    hasInitialized.current = true;

    const fetchFreshSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Update the store with fresh data
        if (data && typeof data === 'object') {
          setSettings(data);
          setExtensions([]); // Extensions might be handled separately
          setSettingsFetched(true);
          setSettingsError(null);
        } else {
          throw new Error('Invalid settings data received');
        }
      } catch (error) {
        console.warn('Failed to fetch fresh settings:', error);
        setSettingsError(error instanceof Error ? error.message : 'Unknown error');

        // If we don't have any settings yet, try to load from localStorage
        if (!settingsFetched && (!settings || Object.keys(settings).length === 0)) {
          try {
            const cached = localStorage.getItem('bicrypto-config-store');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.state?.settings && Object.keys(parsed.state.settings).length > 0) {
                setSettings(parsed.state.settings);
                setExtensions(parsed.state?.extensions || []);
                setSettingsFetched(true);
                console.info('Using cached settings from localStorage');
              }
            }
          } catch (cacheError) {
            console.warn('Failed to load cached settings:', cacheError);
          }
        }
      }
    };

    // If we already have settings from SSR, use them but fetch fresh data in background
    if (settingsFetched && settings && Object.keys(settings).length > 0) {
      // Background refresh
      setTimeout(fetchFreshSettings, 100);
    } else {
      // Immediate fetch if no settings available
      fetchFreshSettings();
    }
  }, [settings, settingsFetched, setSettings, setExtensions, setSettingsFetched, setSettingsError]);

  return {
    settings,
    settingsFetched,
    isLoading: !settingsFetched,
  };
};