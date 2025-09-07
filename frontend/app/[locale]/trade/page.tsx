"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useSettings } from "@/hooks/use-settings";
import TradingLayout from "./components/trading-layout";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { usePathname } from "@/i18n/routing";
import { getKycRequirement } from "@/utils/kyc";

export default function TradePage() {
  // 1. Always call all hooks first
  const { hasKyc, canAccessFeature, user } = useUserStore();
  const { settings } = useConfigStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize settings early to prevent chart loading issues
  useSettings();

  const { requiredFeature } = useMemo(() => {
    if (pathname.startsWith("/binary")) {
      return { requiredFeature: "binary_trading" };
    }
    const type = searchParams.get("type");
    if (type === "futures") {
      return {
        requiredFeature: "futures_trading",
      };
    }
    return { requiredFeature: "trade" };
  }, [pathname, searchParams]);

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";

  // 2. Websocket cleanup hook — always called!
  useEffect(() => {
    return () => {
      const openWebSockets = Array.from(
        document.querySelectorAll(".chart-container")
      )
        .map((container) => (container as any).__chartWebSocket)
        .filter(Boolean);

      openWebSockets.forEach((ws) => {
        try {
          ws.close();
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  // 3. Now branch and return
  // Only check KYC for logged-in users who want to actually trade
  // Visitors can view the trade page without KYC
  if (kycEnabled && user) {
    const kycRequirement = getKycRequirement(user, requiredFeature);
    if (kycRequirement.required) {
      return <KycRequiredNotice feature={requiredFeature} />;
    }
  }

  return (
    <div className="h-full w-full">
      <TradingLayout />
    </div>
  );
}
