"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { DollarSign, Percent, Zap, Wallet, Info } from "lucide-react";

interface NFTFeesSettingsSectionProps {
  settings?: {
    MarketplaceFeePercentage?: number;
    MaxRoyaltyPercentage?: number;
    ListingFee?: number;
    GasOptimizationEnabled?: boolean;
    FeeRecipientAddress?: string;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function NFTFeesSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: NFTFeesSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    MarketplaceFeePercentage: settings.MarketplaceFeePercentage ?? 2.5,
    MaxRoyaltyPercentage: settings.MaxRoyaltyPercentage ?? 10,
    ListingFee: settings.ListingFee ?? 0,
    GasOptimizationEnabled: settings.GasOptimizationEnabled ?? true,
    FeeRecipientAddress: settings.FeeRecipientAddress ?? "",
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

  return (
    <div className="space-y-6 pt-3">
      {/* Revenue Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("revenue_model")}
          </CardTitle>
          <CardDescription>
            {t("configure_marketplace_fees_and_revenue_structure")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("marketplace_fees_are_deducted")}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketplaceFee">{t("marketplace_fee_(%)")} *</Label>
              <Input
                id="marketplaceFee"
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={safeSettings.MarketplaceFeePercentage}
                onChange={(e) => onUpdate("MarketplaceFeePercentage", parseFloat(e.target.value) || 0)}
                className={hasError("MarketplaceFeePercentage") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">{t("percentage_of_sale_price")}</p>
              {getErrorMessage("MarketplaceFeePercentage") && (
                <p className="text-sm text-red-500">{getErrorMessage("MarketplaceFeePercentage")}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxRoyalty">{t("maximum_royalty_(%)")} *</Label>
              <Input
                id="maxRoyalty"
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={safeSettings.MaxRoyaltyPercentage}
                onChange={(e) => onUpdate("MaxRoyaltyPercentage", parseFloat(e.target.value) || 0)}
                className={hasError("MaxRoyaltyPercentage") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">{t("maximum_royalty_percentage_creators")}</p>
              {getErrorMessage("MaxRoyaltyPercentage") && (
                <p className="text-sm text-red-500">{getErrorMessage("MaxRoyaltyPercentage")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingFee">{t("listing_fee_(eth)")} *</Label>
              <Input
                id="listingFee"
                type="number"
                min="0"
                step="0.001"
                value={safeSettings.ListingFee}
                onChange={(e) => onUpdate("ListingFee", parseFloat(e.target.value) || 0)}
                className={hasError("ListingFee") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">{t("fixed_fee_charged_when")}</p>
              {getErrorMessage("ListingFee") && (
                <p className="text-sm text-red-500">{getErrorMessage("ListingFee")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feeRecipient">{t("fee_recipient_address")}</Label>
              <Input
                id="feeRecipient"
                type="text"
                value={safeSettings.FeeRecipientAddress}
                onChange={(e) => onUpdate("FeeRecipientAddress", e.target.value)}
                placeholder="0x..."
                className={hasError("FeeRecipientAddress") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">{t("ethereum_address_to_receive_marketplace_fees")}</p>
              {getErrorMessage("FeeRecipientAddress") && (
                <p className="text-sm text-red-500">{getErrorMessage("FeeRecipientAddress")}</p>
              )}
            </div>
          </div>

          {/* Fee Preview */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">{t("fee_structure_preview")}</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>{t("on_a_1_eth_sale")}</span>
                <span></span>
              </div>
              <div className="flex justify-between pl-4">
                <span>{t("marketplace_fee")}</span>
                <span>{(safeSettings.MarketplaceFeePercentage / 100).toFixed(3)} ETH ({safeSettings.MarketplaceFeePercentage}%)</span>
              </div>
              <div className="flex justify-between pl-4">
                <span>{t("creator_royalty_(if_5%)")}</span>
                <span>0.050 ETH (5%)</span>
              </div>
              <div className="flex justify-between pl-4">
                <span>{t("seller_receives")}</span>
                <span>{(1 - (safeSettings.MarketplaceFeePercentage + 5) / 100).toFixed(3)} ETH</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gas Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t("gas_optimization")}
          </CardTitle>
          <CardDescription>
            {t("configure_gas_fee_handling")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="gasOptimization">{t("enable_gas_optimization")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("use_gas-efficient_smart_contract")}
              </p>
            </div>
            <Switch
              id="gasOptimization"
              checked={safeSettings.GasOptimizationEnabled}
              onCheckedChange={(checked) => onUpdate("GasOptimizationEnabled", checked)}
            />
          </div>

          {safeSettings.GasOptimizationEnabled && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                {t("gas_optimization_includes_lazy")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}