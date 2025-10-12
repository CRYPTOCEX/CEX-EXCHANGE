import { useConfigStore } from "@/store/config";

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
  } = useConfigStore();

  return {
    settings,
    extensions,
    isLoading,
    settingsFetched,
    settingsError,
  };
}
