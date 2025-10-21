"use client";

import { useEffect, useRef } from 'react';
import { useConfigStore } from '@/store/config';
import { DEFAULT_SETTINGS } from '@/config/settings';

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
        if (data && data.settings) {
          // Convert settings array to object and parse values
          const settingsArray = data.settings.filter(
            (s: any) => s.key !== "settings" && s.key !== "extensions" &&
            !(typeof s.value === 'string' && s.value.includes('[object Object]'))
          );

          const settingsObj = settingsArray.reduce(
            (acc: Record<string, any>, cur: { key: string; value: any }) => {
              let parsedValue = cur.value;

              if (cur.value === 'true' || cur.value === '1') parsedValue = true;
              else if (cur.value === 'false' || cur.value === '0' || cur.value === '') parsedValue = false;
              else if (cur.value && !isNaN(Number(cur.value)) && cur.value !== '') {
                if (cur.key.includes('Time') || cur.key.includes('Amount') ||
                    cur.key.includes('Fee') || cur.key.includes('Percent') ||
                    cur.key.includes('Window') || cur.key.includes('Max') ||
                    cur.key.includes('Min') || cur.key.includes('Trades') ||
                    cur.key.includes('Offers')) {
                  parsedValue = Number(cur.value);
                }
              }

              acc[cur.key] = parsedValue;
              return acc;
            },
            {}
          );

          // If settings are empty, use default settings
          const finalSettings = Object.keys(settingsObj).length === 0
            ? DEFAULT_SETTINGS
            : settingsObj;

          setSettings(finalSettings);
          setExtensions(data.extensions || []);
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
  }, []);

  return {
    settings,
    settingsFetched,
    isLoading: !settingsFetched,
  };
};