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

  if (!settings.isP2PEnabled) {
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
  const hasDisabledFeatures =
    !settings.isTradeDisputeEnabled || !settings.isEscrowEnabled;

  return (
    <>
      {hasDisabledFeatures && (
        <Alert variant="warning" className="mb-4">
          <Settings className="h-4 w-4" />
          <AlertTitle>{t("limited_functionality")}</AlertTitle>
          <AlertDescription>
            {t("some_trade_features_are_currently_disabled")}
            {!settings.isTradeDisputeEnabled && (
              <span className="block">
                {t("•_trade_dispute_resolution_is_unavailable")}
              </span>
            )}
            {!settings.isEscrowEnabled && (
              <span className="block">
                {t("•_escrow_services_are_unavailable")}
              </span>
            )}
            <Link href="/p2p/guide" className="mt-2">
              <Button variant="outline" size="sm">
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
