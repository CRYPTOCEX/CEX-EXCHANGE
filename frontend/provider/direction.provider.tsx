"use client";
import React, { useEffect, PropsWithChildren } from "react";
import { useThemeStore } from "@/store";
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";
import { useWebSocket } from "./websocket.provider";

interface DirectionProviderProps {
  locale: string;
}

const DirectionProvider = ({
  children,
  locale,
}: PropsWithChildren<DirectionProviderProps>) => {
  const { isRtl } = useThemeStore();
  const { wsManager } = useWebSocket();

  const direction = locale === "ar" || isRtl ? "rtl" : "ltr";

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
