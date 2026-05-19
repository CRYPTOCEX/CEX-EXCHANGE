"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import dynamic from "next/dynamic";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { usePathname } from "@/i18n/routing";
import { getKycRequirement } from "@/utils/kyc";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// Lazy load TradingLayout to speed up initial page compilation in dev mode
const TradingLayout = dynamic(() => import("./components/trading-layout"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

// Lazy load Trading Pro component
const TradingPro = lazy(() =>
  import("./pro").then((mod) => ({
    default: mod.TradingPro,
  }))
);

// Loading fallback for Trading Pro
function TradingProLoader() {
  const t = useTranslations("trade");
  return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{t("loading_trading_pro_ellipsis")}</p>
      </div>
    </div>
  );
}

// Loading fallback for the page
function PageLoader() {
  return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TradePageContent />
    </Suspense>
  );
}

function TradePageContent() {
  // 1. Always call all hooks first
  const { hasKyc, canAccessFeature, user } = useUserStore();
  const { settings, extensions, settingsFetched } = useConfigStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Trading Pro module availability state
  const [tradingProAvailable, setTradingProAvailable] = useState<boolean | null>(null);

  // Note: Settings are already loaded via SSR and synced via useSettingsSync in providers.tsx
  // No need to call useSettings() here - we already have settings from useConfigStore above

  const { requiredFeature, marketType } = useMemo(() => {
    if (pathname.startsWith("/binary")) {
      return { requiredFeature: "binary_trading", marketType: "spot" as const };
    }
    const type = searchParams.get("type");
    if (type === "futures") {
      return {
        requiredFeature: "futures_trading",
        marketType: "futures" as const,
      };
    }
    if (type === "spot-eco") {
      return { requiredFeature: "trade", marketType: "eco" as const };
    }
    return { requiredFeature: "trade", marketType: "spot" as const };
  }, [pathname, searchParams]);

  const initialSymbol = searchParams.get("symbol") || undefined;

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";

  // Check if new trading interface is enabled via admin settings (default: false)
  const isTradingProEnabled = settings?.tradingProEnabled === true || settings?.tradingProEnabled === "true";

  // Check if Trading Pro module is available (installed)
  useEffect(() => {
    const checkModule = async () => {
      try {
        await import("./pro");
        setTradingProAvailable(true);
      } catch {
        setTradingProAvailable(false);
      }
    };
    checkModule();
  }, []);

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
    const kycRequirement = getKycRequirement(user as any, requiredFeature);
    if (kycRequirement.required) {
      return <KycRequiredNotice feature={requiredFeature} />;
    }
  }

  // Show loading only if we don't have settings at all and module check is pending
  // Check both settingsFetched flag AND if settings object has data (for persisted store)
  const hasSettings = settingsFetched || (settings && Object.keys(settings).length > 0);
  if (!hasSettings || tradingProAvailable === null) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Use Trading Pro if enabled and available
  if (isTradingProEnabled && tradingProAvailable) {
    return (
      <Suspense fallback={<TradingProLoader />}>
        <TradingPro
          initialSymbol={initialSymbol}
          marketType={marketType}
        />
      </Suspense>
    );
  }

  // Fall back to standard trading layout
  return (
    <div className="h-full w-full">
      <TradingLayout />
    </div>
  );
}
