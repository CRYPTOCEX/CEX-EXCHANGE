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
  const t = useTranslations("ext");
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
          {t("please_check_back_later")}.
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
          {t("please_contact_support_for_more_information")}.
        </AlertDescription>
      </Alert>
    );
  }

  // Display warning if certain features are disabled but still allow viewing the trade
  const hasDisabledFeatures = !isTradeDisputeEnabled || !isEscrowEnabled;

  return (
    <>
      {hasDisabledFeatures && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <Settings className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">{t("limited_functionality")}</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            {t("some_trade_features_are_currently_disabled")}
            {!isTradeDisputeEnabled && (
              <span className="block mt-2">
                {t("•_trade_dispute_resolution_is_unavailable")}
              </span>
            )}
            {!isEscrowEnabled && (
              <span className="block">
                {t("•_escrow_services_are_unavailable")}
              </span>
            )}
            <Link href="/p2p/guide" className="mt-3 inline-block">
              <Button variant="outline" size="sm" className="border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/30">
                {t("learn_more_about_trading_options")}
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <TradeDetailsWrapper tradeId={tradeId} />
    </>
  );
}
