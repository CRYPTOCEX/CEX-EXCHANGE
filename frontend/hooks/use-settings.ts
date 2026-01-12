import { useCallback } from "react";
import { useConfigStore } from "@/store/config";
import { useShallow } from "zustand/react/shallow";
import { DEFAULT_SETTINGS } from "@/config/settings";

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

    try {
      const response = await fetch("/api/settings", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.settings) {
        const settingsArray = data.settings.filter(
          (s: any) =>
            s.key !== "settings" &&
            s.key !== "extensions" &&
            !(
              typeof s.value === "string" &&
              s.value.includes("[object Object]")
            )
        );

        const settingsObj = settingsArray.reduce(
          (acc: Record<string, any>, cur: { key: string; value: any }) => {
            let parsedValue = cur.value;

            if (cur.value === "true" || cur.value === "1") parsedValue = true;
            else if (
              cur.value === "false" ||
              cur.value === "0" ||
              cur.value === ""
            )
              parsedValue = false;
            else if (cur.value && !isNaN(Number(cur.value)) && cur.value !== "") {
              if (
                cur.key.includes("Time") ||
                cur.key.includes("Amount") ||
                cur.key.includes("Fee") ||
                cur.key.includes("Percent") ||
                cur.key.includes("Window") ||
                cur.key.includes("Max") ||
                cur.key.includes("Min") ||
                cur.key.includes("Trades") ||
                cur.key.includes("Offers")
              ) {
                parsedValue = Number(cur.value);
              }
            }

            acc[cur.key] = parsedValue;
            return acc;
          },
          {}
        );

        const finalSettings =
          Object.keys(settingsObj).length === 0
            ? DEFAULT_SETTINGS
            : settingsObj;

        store.setSettings(finalSettings);
        store.setExtensions(data.extensions || []);
        store.setSettingsFetched(true);
        store.setSettingsError(null);
      } else {
        throw new Error("Invalid settings data received");
      }
    } catch (error) {
      console.warn("Failed to fetch settings:", error);
      store.setSettingsError(error instanceof Error ? error.message : "Unknown error");
    }
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
