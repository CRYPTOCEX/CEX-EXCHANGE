"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/store/config";
import { AlertTriangle, Settings, ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TradeDetailsWrapper } from "./components/trade-details-wrapper";
import { useTranslations } from "next-intl";

interface TradeDetailsClientProps {
  tradeId: string;
}

export function TradeDetailsClient({ tradeId }: TradeDetailsClientProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { settings } = useConfigStore();

  // Helper to safely check boolean settings
  const getBooleanSetting = (value: any) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  };

  const p2pEnabled = getBooleanSetting(settings?.p2pEnabled);
  const isTradeDisputeEnabled = getBooleanSetting(settings?.isTradeDisputeEnabled);
  const isEscrowEnabled = getBooleanSetting(settings?.isEscrowEnabled);

  if (settings.isMaintenanceMode) {
    return (
      <Alert variant="destructive" className="mb-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("platform_maintenance")}</AlertTitle>
        <AlertDescription>
          {t("the_platform_is_currently_undergoing_maintenance")}.{" "}
          {t("trade_details_are_temporarily_unavailable")}.{" "}
          {tCommon("please_check_back_later")}.
        </AlertDescription>
      </Alert>
    );
  }

  if (!p2pEnabled) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("p2p_trading_disabled")}</AlertTitle>
        <AlertDescription>
          {t("p2p_trading_is_currently_disabled_on_the_platform")}.{" "}
          {t("trade_details_are_not_accessible_at_this_time")}.{" "}
          {tExt("please_contact_support_for_more_information")}.
        </AlertDescription>
      </Alert>
    );
  }

  // Display warning if certain features are disabled but still allow viewing the trade
  const hasDisabledFeatures = !isTradeDisputeEnabled || !isEscrowEnabled;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-violet-50 to-white dark:from-blue-950 dark:via-violet-950 dark:to-black`}>
      {/* Hero Section */}
      <section className={`relative pt-24 pb-12 overflow-hidden border-zinc-200 dark:border-zinc-800`}>
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: "#3b82f6" }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: "#8b5cf6" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: "#6366f1" }}
          />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                {tCommon("trade_details")}
              </span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t("manage_your_active_trading_activity")}
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto py-12 space-y-6">
        {hasDisabledFeatures && (
          <Alert className={`border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20`}>
            <Settings className={`h-4 w-4 text-amber-700 dark:text-amber-400`} />
            <AlertTitle className="text-amber-700 dark:text-amber-400">{t("limited_functionality")}</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {t("some_trade_features_are_currently_disabled")}
              {!isTradeDisputeEnabled && (
                <span className="block mt-2">
                  • {t("trade_dispute_resolution_is_unavailable")}
                </span>
              )}
              {!isEscrowEnabled && (
                <span className="block">
                  • {t("escrow_services_are_unavailable")}
                </span>
              )}
              <Link href="/p2p/guide" className="mt-3 inline-block">
                <Button variant="outline" size="sm" className={`border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20`}>
                  {t("learn_more_about_trading_options")}
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <TradeDetailsWrapper tradeId={tradeId} />
      </main>
    </div>
  );
}
