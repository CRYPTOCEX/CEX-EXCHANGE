"use client";

import { useSettings } from "@/hooks/use-settings";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function SettingsStatus() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const { isLoading, settingsError, settingsFetched } = useSettings();
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

  if (!isDevelopment || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {isLoading && (
            <>
              <div className="animate-spin h-3 w-3 border border-zinc-500 border-t-yellow-500 rounded-full" />
              <span className="text-yellow-400">{tCommon("loading_settings_ellipsis")}</span>
            </>
          )}

          {settingsError && (
            <>
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400">{t("settings_error")}</span>
            </>
          )}

          {!settingsFetched && !isLoading && (
            <>
              <div className="h-3 w-3 bg-orange-500 rounded-full" />
              <span className="text-orange-400">{t("using_fallback_menu")}</span>
            </>
          )}

        </div>

        {settingsError && (
          <div className="mt-2 text-xs text-zinc-400">{settingsError}</div>
        )}

        <div className="mt-2 text-xs text-zinc-500">
          {t("press_ctrl_shift_r_to_retry")}
        </div>
      </div>
    </div>
  );
}
