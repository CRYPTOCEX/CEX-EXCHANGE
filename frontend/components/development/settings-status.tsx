"use client";

import { useSettings } from "@/hooks/use-settings";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsStatus() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const { isLoading, settingsError, settingsFetched, retryFetch } = useSettings();
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Only show in development
    const devMode = Boolean(
      typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          process.env.NODE_ENV === "development")
    );

    setIsDevelopment(devMode);

    // Show when there are issues or when loading
    const shouldShow = Boolean(
      devMode && (isLoading || settingsError || !settingsFetched)
    );
    setIsVisible(shouldShow);
  }, [isLoading, settingsError, settingsFetched]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryFetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isDevelopment || !isVisible) {
    return null;
  }

  // Show centered error overlay for critical errors
  if (settingsError) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card border border-destructive/50 rounded-lg p-6 shadow-2xl max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t("settings_error")}</h3>
              <p className="text-sm text-muted-foreground">Failed to load application settings</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 mb-4">
            <code className="text-xs text-destructive break-all">{settingsError}</code>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            {t("press_ctrl_shift_r_to_retry")}
          </p>
        </div>
      </div>
    );
  }

  // Show small indicator for loading or fallback states
  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm">
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {isLoading && (
            <>
              <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
              <span className="text-yellow-500">{tCommon("loading_settings_ellipsis")}</span>
            </>
          )}

          {!settingsFetched && !isLoading && (
            <>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-orange-500">{t("using_fallback_menu")}</span>
            </>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {t("press_ctrl_shift_r_to_retry")}
        </div>
      </div>
    </div>
  );
}
