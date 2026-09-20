"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useConfigStore } from "@/store/config";
import { usePathname } from "@/i18n/routing";
import { isFloatingChatHidden } from "./floating-chat-routes";

// Dynamically import LiveChat to avoid SSR issues
const LiveChat = dynamic(
  () => import("@/app/[locale]/support/ticket/components/live-chat"),
  { ssr: false }
);

export default function FloatingChatProvider() {
  const pathname = usePathname();
  const { settings } = useConfigStore();
  const [shouldShowChat, setShouldShowChat] = useState(false);

  useEffect(() => {
    // Check if floating chat is enabled in settings
    const floatingChatValue = settings?.floatingLiveChat;
    
    // Check against multiple possible truthy values
    const isFloatingChatEnabled = floatingChatValue === true || 
                                 floatingChatValue === "true" ||
                                 floatingChatValue === "1" ||
                                 floatingChatValue === 1;
    
    /*
     * The suppression list lives in `floating-chat-routes.ts` and is anchored
     * regex, not `pathname.includes(...)`.
     *
     * The substring version failed in both directions at once. It killed the
     * bubble on `/p2p/trade`, `/p2p/trades` and `/copy-trading/trade` — none of
     * which are terminals, and the P2P trade page is where a customer waiting
     * on a silent seller most wants support. And it MISSED `/futures`, a full
     * trading terminal containing neither "/trade" nor "/binary", so the bubble
     * has been sitting on top of the futures workspace.
     */
    const shouldShow = isFloatingChatEnabled && !isFloatingChatHidden(pathname);

    setShouldShowChat(shouldShow);
  }, [settings, pathname]);

  // Don't render anything if chat shouldn't be shown
  if (!shouldShowChat) {
    return null;
  }

  return <LiveChat />;
}