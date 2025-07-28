import { useEffect, useCallback, useRef } from "react";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import { ExtensionChecker } from "@/lib/extensions";

// Development mode detection
const isDevelopment =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    process.env.NODE_ENV === "development");

export function useSettings() {
  const {
    settings,
    extensions,
    isLoading,
    settingsFetched,
    settingsError,
    setSettings,
    setExtensions,
    setIsLoading,
    setSettingsError,
    resetSettings,
  } = useConfigStore();

  // Use ref to track retry attempts
  const retryCountRef = useRef(0);
  const maxRetries = isDevelopment ? 3 : 1;

  const fetchSettings = useCallback(
    async (isRetry = false) => {
      // Reset retry count if this is a fresh fetch (not a retry)
      if (!isRetry) {
        retryCountRef.current = 0;
      }

      if (settingsFetched && !isRetry) return;
      if (isLoading) return;

      setIsLoading(true);
      setSettingsError(null);

      try {
        const { data, error } = await $fetch<{
          settings: { key: string; value: any }[];
          extensions: string[];
        }>({
          url: "/api/settings",
          silent: true,
        });

        if (error) {
          throw new Error(error);
        }

        if (data && data.settings) {
          const settingsArray = data.settings.filter(
            (s) => {
              // Filter out problematic settings
              if (s.key === "settings") return false;
              if (s.key === "extensions") return false;
              
              // Filter out settings with invalid serialized object values
              if (typeof s.value === 'string' && s.value.includes('[object Object]')) {
                console.warn(`Filtering out setting with invalid serialized value: ${s.key}`);
                return false;
              }
              
              return true;
            }
          );
          
          // Convert array to object
          const settingsObj = settingsArray.reduce(
            (acc, cur) => {
              acc[cur.key] = cur.value;
              return acc;
            },
            {} as Record<string, any>
          );

          setSettings(settingsObj);
          setExtensions(data.extensions || []);
          
          // Initialize extension checker with available extensions
          if (data.extensions && data.extensions.length > 0) {
            ExtensionChecker.getInstance().initialize(data.extensions);
          }

          // Reset retry count on success
          retryCountRef.current = 0;

          if (isDevelopment) {
            console.log("✅ Settings loaded successfully");
          }
        } else {
          // If data is empty or null, treat as error
          throw new Error("No settings data received");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch settings";

        // In development, try to recover from common errors
        if (isDevelopment) {
          console.warn(
            `⚠️  Settings fetch attempt ${retryCountRef.current + 1}/${maxRetries} failed:`,
            errorMessage
          );

          // Retry logic for development
          if (retryCountRef.current < maxRetries - 1) {
            retryCountRef.current++;

            // Exponential backoff with jitter
            const delay =
              Math.pow(2, retryCountRef.current) * 100 + Math.random() * 100;

            setTimeout(() => {
              fetchSettings(true);
            }, delay);

            return; // Don't set error state yet, we're retrying
          } else {
            console.error(
              "🔴 All settings fetch attempts failed. Using fallback behavior."
            );
            console.info(
              "💡 Development tip: Check backend connection or try refreshing the page"
            );
          }
        } else {
          console.error("Settings fetch error:", errorMessage);
        }

        setSettingsError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      settingsFetched,
      isLoading,
      setSettings,
      setExtensions,
      setIsLoading,
      setSettingsError,
    ]
  );

  const retryFetch = useCallback(() => {
    if (isDevelopment) {
      console.log("🔄 Retrying settings fetch...");
    }
    resetSettings();
    fetchSettings();
  }, [resetSettings, fetchSettings]);

  // Auto-fetch on mount if not already fetched
  useEffect(() => {
    if (!settingsFetched && !isLoading && !settingsError) {
      fetchSettings();
    }
  }, [settingsFetched, isLoading, settingsError, fetchSettings]);

  // In development, add window event listener for manual retry
  useEffect(() => {
    if (!isDevelopment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+R to retry settings fetch
      if (event.ctrlKey && event.shiftKey && event.key === "R") {
        event.preventDefault();
        console.log("🔄 Manual settings refresh triggered");
        retryFetch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [retryFetch]);

  return {
    settings,
    extensions,
    isLoading,
    settingsFetched,
    settingsError,
    fetchSettings,
    retryFetch,
    // Development helpers
    ...(isDevelopment && {
      _dev: {
        retryCount: retryCountRef.current,
        maxRetries,
        manualRetry: () => {
          console.log("🔄 Manual retry triggered");
          retryFetch();
        },
      },
    }),
  };
}
