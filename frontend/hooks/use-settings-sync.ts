"use client";

import { useEffect } from 'react';
import { useConfigStore } from '@/store/config';
import { useShallow } from 'zustand/react/shallow';
import { loadSettings, readCachedSettings } from '@/lib/fetchers/settings-client';

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
 * Released after a failed load so a later remount (or the user navigating) can
 * try again. Without this, one unlucky request at boot — a backend still
 * starting up — left the app with no settings for the rest of the session.
 */
function clearSettingsSyncInitialized(): void {
  if (typeof window !== 'undefined') {
    (window as any)[SETTINGS_SYNC_KEY] = false;
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

      // loadSettings never throws: it retries what is retryable and reports the
      // outcome. Anything left is a settled failure the user has to know about.
      const result = await loadSettings();

      if (result.ok) {
        store.setSettings(result.payload.settings);
        store.setExtensions(result.payload.extensions);
        store.setSettingsFetched(true);
        store.setSettingsError(null);
        return;
      }

      // Fall back to the last configuration we actually saw, so a backend
      // restart doesn't blank the shell. Note the ordering: setSettings clears
      // settingsError, so the error has to be recorded after it — the banner
      // must stay up even while cached values are on screen, otherwise stale
      // config reads as current.
      const currentState = useConfigStore.getState();
      const hasSettings =
        currentState.settingsFetched &&
        currentState.settings &&
        Object.keys(currentState.settings).length > 0;

      if (!hasSettings) {
        const cached = readCachedSettings();
        if (cached) {
          store.setSettings(cached.settings);
          store.setExtensions(cached.extensions);
          store.setSettingsFetched(true);
          console.info('[settings] using last known settings from localStorage');
        }
      }

      // Left last on purpose (see above). With no cache this also leaves
      // settingsFetched false, which is what makes the shell show its
      // "settings unavailable" screen instead of an empty menu.
      store.setSettingsError(result.error);
      clearSettingsSyncInitialized();
    };

    fetchFreshSettings();
  }, []); // Empty dependency array - only run once, uses getState() for store access

  return {
    settings,
    settingsFetched,
    isLoading: !settingsFetched,
  };
};