"use client";
import React, { useEffect, PropsWithChildren } from "react";
import { useThemeStore } from "@/store";
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";
import { useWebSocket } from "./websocket.provider";
import { isRTL } from "@/i18n/utils";

interface DirectionProviderProps {
  locale: string;
}

const DirectionProvider = ({
  children,
  locale,
}: PropsWithChildren<DirectionProviderProps>) => {
  const { isRtl } = useThemeStore();
  const { wsManager } = useWebSocket();

  /*
   * `isRTL(locale)`, not `locale === "ar"`.
   *
   * The hardcoded check meant Persian, Urdu, Hebrew, Pashto, Sindhi, Divehi
   * and Kurdish all rendered left-to-right — Persian is one of only two
   * genuinely finished locales in the catalogue and was unusable for this one
   * comparison. `isRTL()` in i18n/utils.ts already carried the full set.
   *
   * <html dir> is now set on the server in app/[locale]/layout.tsx, which is
   * what the browser actually keys off. This stays for Radix, whose portalled
   * components read direction from context rather than the DOM, and for the
   * user's own `isRtl` override.
   */
  const direction = isRTL(locale) || isRtl ? "rtl" : "ltr";

  useEffect(() => {
    if (wsManager && wsManager.isConnected()) {
      wsManager.send({ type: "SUBSCRIBE", payload: { type: "auth" } });
    }
  }, [wsManager]);

  return (
    <div dir={direction}>
      <RadixDirectionProvider dir={direction}>
        {children}
      </RadixDirectionProvider>
    </div>
  );
};

export default DirectionProvider;
