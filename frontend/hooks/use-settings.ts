import { useCallback } from "react";
import { useConfigStore } from "@/store/config";
import { DEFAULT_SETTINGS } from "@/config/settings";

/**
 * Hook to access settings from the global config store
 * Note: This hook only reads from the store. Settings are fetched by useSettingsSync in providers.
 * Do not use this hook to trigger fetches - it will cause duplicate requests.
 */
export function useSettings() {
  const {
    settings,
    extensions,
    isLoading,
    settingsFetched,
    settingsError,
    setSettings,
    setExtensions,
    setSettingsFetched,
    setSettingsError,
    resetSettings,
  } = useConfigStore();

  /**
   * Fetch settings from the API
   * Can be used to manually trigger a settings refresh
   */
  const fetchSettings = useCallback(async () => {
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

        setSettings(finalSettings);
        setExtensions(data.extensions || []);
        setSettingsFetched(true);
        setSettingsError(null);
      } else {
        throw new Error("Invalid settings data received");
      }
    } catch (error) {
      console.warn("Failed to fetch settings:", error);
      setSettingsError(error instanceof Error ? error.message : "Unknown error");
    }
  }, [setSettings, setExtensions, setSettingsFetched, setSettingsError]);

  /**
   * Reset and retry fetching settings
   * Clears the current state and attempts a fresh fetch
   */
  const retryFetch = useCallback(async () => {
    resetSettings();
    await fetchSettings();
  }, [resetSettings, fetchSettings]);

  return {
    settings,
    extensions,
    isLoading,
    settingsFetched,
    settingsError,
    fetchSettings,
    retryFetch,
  };
}
