"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { ShoppingCart, Clock, Zap, Package } from "lucide-react";

interface NFTTradingSettingsSectionProps {
  settings?: {
    EnableFixedPriceSales?: boolean;
    EnableAuctions?: boolean;
    EnableOffers?: boolean;
    MinAuctionDuration?: number;
    MaxAuctionDuration?: number;
    BidIncrementPercentage?: number;
    EnableAntiSnipe?: boolean;
    AntiSnipeExtension?: number;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function NFTTradingSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: NFTTradingSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    EnableFixedPriceSales: settings.EnableFixedPriceSales ?? true,
    EnableAuctions: settings.EnableAuctions ?? true,
    EnableOffers: settings.EnableOffers ?? true,
    MinAuctionDuration: settings.MinAuctionDuration ?? 3600,
    MaxAuctionDuration: settings.MaxAuctionDuration ?? 604800,
    BidIncrementPercentage: settings.BidIncrementPercentage ?? 5,
    EnableAntiSnipe: settings.EnableAntiSnipe ?? true,
    AntiSnipeExtension: settings.AntiSnipeExtension ?? 300,
  };

  // Get the effective error message (server validation takes priority)
  const getErrorMessage = (field: string) => {
    if (hasSubmitted && validationErrors[`nft${field}`]) {
      return validationErrors[`nft${field}`];
    }
    return "";
  };

  const hasError = (field: string) => {
    return hasSubmitted && !!validationErrors[`nft${field}`];
  };

  // Convert seconds to hours for display
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return hours;
  };

  // Convert hours to seconds for storage
  const parseHours = (hours: string) => {
    const hoursNum = parseInt(hours) || 1;
    return hoursNum * 3600;
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Trading Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("trading_features")}
          </CardTitle>
          <CardDescription>
            {t("enable_or_disable_different")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableFixedPrice">{t("fixed_price_sales")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("allow_creators_to_set")}
                </p>
              </div>
              <Switch
                id="enableFixedPrice"
                checked={safeSettings.EnableFixedPriceSales}
                onCheckedChange={(checked) => onUpdate("EnableFixedPriceSales", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableAuctions">{t("auction_sales")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("allow_timed_auctions_with_bidding_mechanisms")}
                </p>
              </div>
              <Switch
                id="enableAuctions"
                checked={safeSettings.EnableAuctions}
                onCheckedChange={(checked) => onUpdate("EnableAuctions", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableOffers">{t("direct_offers")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("allow_users_to_make_offers_on_any_nft")}
                </p>
              </div>
              <Switch
                id="enableOffers"
                checked={safeSettings.EnableOffers}
                onCheckedChange={(checked) => onUpdate("EnableOffers", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auction Settings */}
      {safeSettings.EnableAuctions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("auction_configuration")}
            </CardTitle>
            <CardDescription>
              {t("configure_auction_duration_limits")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAuctionDuration">{t("minimum_auction_duration_(hours)")} *</Label>
                <Input
                  id="minAuctionDuration"
                  type="number"
                  min="1"
                  max="168"
                  value={formatDuration(safeSettings.MinAuctionDuration)}
                  onChange={(e) => onUpdate("MinAuctionDuration", parseHours(e.target.value))}
                  className={hasError("MinAuctionDuration") ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">{t("minimum_1_hour_maximum_168_hours_(7_days)")}</p>
                {getErrorMessage("MinAuctionDuration") && (
                  <p className="text-sm text-red-500">{getErrorMessage("MinAuctionDuration")}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxAuctionDuration">{t("maximum_auction_duration_(hours)")} *</Label>
                <Input
                  id="maxAuctionDuration"
                  type="number"
                  min="1"
                  max="720"
                  value={formatDuration(safeSettings.MaxAuctionDuration)}
                  onChange={(e) => onUpdate("MaxAuctionDuration", parseHours(e.target.value))}
                  className={hasError("MaxAuctionDuration") ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">{t("minimum_1_hour_maximum_720_hours_(30_days)")}</p>
                {getErrorMessage("MaxAuctionDuration") && (
                  <p className="text-sm text-red-500">{getErrorMessage("MaxAuctionDuration")}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidIncrement">{t("minimum_bid_increment_(%)")} *</Label>
                <Input
                  id="bidIncrement"
                  type="number"
                  min="1"
                  max="50"
                  step="0.1"
                  value={safeSettings.BidIncrementPercentage}
                  onChange={(e) => onUpdate("BidIncrementPercentage", parseFloat(e.target.value) || 5)}
                  className={hasError("BidIncrementPercentage") ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">{t("percentage_above_current_highest_bid")}</p>
                {getErrorMessage("BidIncrementPercentage") && (
                  <p className="text-sm text-red-500">{getErrorMessage("BidIncrementPercentage")}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="antiSnipeExtension">{t("anti-snipe_extension_(seconds)")} *</Label>
                <Input
                  id="antiSnipeExtension"
                  type="number"
                  min="60"
                  max="3600"
                  value={safeSettings.AntiSnipeExtension}
                  onChange={(e) => onUpdate("AntiSnipeExtension", parseInt(e.target.value) || 300)}
                  className={hasError("AntiSnipeExtension") ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">{t("time_extension_when_bid_placed_near_auction_end")}</p>
                {getErrorMessage("AntiSnipeExtension") && (
                  <p className="text-sm text-red-500">{getErrorMessage("AntiSnipeExtension")}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableAntiSnipe">{t("enable_anti-snipe_protection")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("automatically_extend_auctions_when")}
                </p>
              </div>
              <Switch
                id="enableAntiSnipe"
                checked={safeSettings.EnableAntiSnipe}
                onCheckedChange={(checked) => onUpdate("EnableAntiSnipe", checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}