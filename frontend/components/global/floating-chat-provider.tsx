"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useConfigStore } from "@/store/config";
import { usePathname } from "@/i18n/routing";

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
    
    // Don't show chat on support pages (it's already rendered there)
    const isSupportPage = pathname.includes("/support");
    
    // Don't show chat on admin pages
    const isAdminPage = pathname.includes("/admin");
    
    // Don't show on auth pages
    const isAuthPage = pathname.includes("/auth") || pathname.includes("/login") || pathname.includes("/register");
    
    // Don't show on trading pages
    const isTradingPage = pathname.includes("/trade") || pathname.includes("/binary");
    
    // Only show floating chat if:
    // 1. Setting is enabled
    // 2. Not on support pages (to avoid duplicate)
    // 3. Not on admin pages
    // 4. Not on auth pages
    // 5. Not on trading pages (trade and binary)
    const shouldShow = isFloatingChatEnabled && !isSupportPage && !isAdminPage && !isAuthPage && !isTradingPage;
    
    setShouldShowChat(shouldShow);
  }, [settings, pathname]);

  // Don't render anything if chat shouldn't be shown
  if (!shouldShowChat) {
    return null;
  }

  return <LiveChat />;
}