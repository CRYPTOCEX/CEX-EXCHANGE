import { useCallback } from "react";
import { useConfigStore } from "@/store/config";
import { useShallow } from "zustand/react/shallow";
import { loadSettings } from "@/lib/fetchers/settings-client";

/**
 * Hook to access settings from the global config store
 * Note: This hook only reads from the store. Settings are fetched by useSettingsSync in providers.
 * Do not use this hook to trigger fetches - it will cause duplicate requests.
 *
 * IMPORTANT: Uses shallow comparison to prevent unnecessary re-renders.
 * Only re-renders when the actual settings values change, not when other
 * parts of the config store change.
 */
export function useSettings() {
  // Use shallow selector to only subscribe to settings-related state
  // This prevents re-renders when unrelated store state changes
  const { settings, extensions, isLoading, settingsFetched, settingsError } =
    useConfigStore(
      useShallow((state) => ({
        settings: state.settings,
        extensions: state.extensions,
        isLoading: state.isLoading,
        settingsFetched: state.settingsFetched,
        settingsError: state.settingsError,
      }))
    );

  /**
   * Reset and retry fetching settings
   * Clears the current state and attempts a fresh fetch from the API
   * Note: This should only be used for manual retry scenarios (e.g., error recovery)
   */
  const retryFetch = useCallback(async () => {
    const store = useConfigStore.getState();
    store.resetSettings();

    // Same loader as the initial sync (retries, timeout, shared parsing) — this
    // used to be a second, drifting copy of the fetch-and-parse logic.
    const result = await loadSettings();

    if (result.ok) {
      store.setSettings(result.payload.settings);
      store.setExtensions(result.payload.extensions);
      store.setSettingsFetched(true);
      store.setSettingsError(null);
      return;
    }

    // resetSettings() just cleared the store, so there is nothing to preserve:
    // report the failure and let the caller keep offering a retry.
    store.setSettingsError(result.error);
  }, []); // No dependencies - uses getState() for store access

  return {
    settings,
    extensions,
    isLoading,
    settingsFetched,
    settingsError,
    retryFetch,
  };
}
