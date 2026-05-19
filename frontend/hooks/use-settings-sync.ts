"use client";

import { useEffect } from 'react';
import { useConfigStore } from '@/store/config';
import { useShallow } from 'zustand/react/shallow';
import { DEFAULT_SETTINGS } from '@/config/settings';

// Module-level flag to prevent StrictMode double-initialization and HMR re-fetches
// Using a global window property to persist across HMR in development
const SETTINGS_SYNC_KEY = '__SETTINGS_SYNC_INITIALIZED__';

function isSettingsSyncInitialized(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any)[SETTINGS_SYNC_KEY] === true;
}

function markSettingsSyncInitialized(): void {
  if (typeof window !== 'undefined') {
    (window as any)[SETTINGS_SYNC_KEY] = true;
  }
}

/**
 * Hook to ensure settings are synchronized with fresh data
 * Implements optimistic updates with localStorage fallback
 *
 * IMPORTANT: This hook should only be called ONCE in the app, typically in providers.tsx.
 * It uses a module-level flag to ensure settings are only fetched once per app load.
 */
export const useSettingsSync = () => {
  // Use shallow selector to minimize re-renders - only subscribe to what we need for the return value
  const { settings, settingsFetched } = useConfigStore(
    useShallow((state) => ({
      settings: state.settings,
      settingsFetched: state.settingsFetched,
    }))
  );

  useEffect(() => {
    // Only run once per app load - using window property to persist across HMR and StrictMode remounts
    if (isSettingsSyncInitialized() || typeof window === 'undefined') return;
    markSettingsSyncInitialized();

    const fetchFreshSettings = async () => {
      // Use getState() to avoid adding dependencies to useEffect
      // This keeps the effect stable and only runs once
      const store = useConfigStore.getState();

      // Skip fetch if settings are already loaded from SSR
      // This prevents duplicate fetches when SSR already provided settings
      if (store.settingsFetched && store.settings && Object.keys(store.settings).length > 0) {
        console.debug('Settings already loaded from SSR, skipping client fetch');
        return;
      }

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

          store.setSettings(finalSettings);
          store.setExtensions(data.extensions || []);
          store.setSettingsFetched(true);
          store.setSettingsError(null);
        } else {
          throw new Error('Invalid settings data received');
        }
      } catch (error) {
        console.warn('Failed to fetch fresh settings:', error);
        store.setSettingsError(error instanceof Error ? error.message : 'Unknown error');

        // If we don't have any settings yet, try to load from localStorage
        const currentState = useConfigStore.getState();
        if (!currentState.settingsFetched && (!currentState.settings || Object.keys(currentState.settings).length === 0)) {
          try {
            const cached = localStorage.getItem('bicrypto-config-store');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.state?.settings && Object.keys(parsed.state.settings).length > 0) {
                store.setSettings(parsed.state.settings);
                store.setExtensions(parsed.state?.extensions || []);
                store.setSettingsFetched(true);
                console.info('Using cached settings from localStorage');
              }
            }
          } catch (cacheError) {
            console.warn('Failed to load cached settings:', cacheError);
          }
        }
      }
    };

    fetchFreshSettings();
  }, []); // Empty dependency array - only run once, uses getState() for store access

  return {
    settings,
    settingsFetched,
    isLoading: !settingsFetched,
  };
};