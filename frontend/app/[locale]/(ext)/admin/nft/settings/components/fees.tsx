"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { DollarSign, Percent, Info } from "lucide-react";

interface NFTFeesSettingsSectionProps {
  settings?: {
    MarketplaceFeePercentage?: number;
    MaxRoyaltyPercentage?: number;
    ListingFee?: number;
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
      {/* Marketplace Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("Marketplace Fees")}
          </CardTitle>
          <CardDescription>
            {t("Configure platform and creator fees")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketplaceFee">{t("Marketplace Fee (%)")} *</Label>
              <Input
                id="marketplaceFee"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={safeSettings.MarketplaceFeePercentage}
                onChange={(e) => onUpdate("MarketplaceFeePercentage", parseFloat(e.target.value) || 2.5)}
                className={hasError("MarketplaceFeePercentage") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("Percentage fee charged on each sale (0-10%)")}
              </p>
              {getErrorMessage("MarketplaceFeePercentage") && (
                <p className="text-sm text-red-500">{getErrorMessage("MarketplaceFeePercentage")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRoyalty">{t("Maximum Royalty (%)")} *</Label>
              <Input
                id="maxRoyalty"
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={safeSettings.MaxRoyaltyPercentage}
                onChange={(e) => onUpdate("MaxRoyaltyPercentage", parseFloat(e.target.value) || 10)}
                className={hasError("MaxRoyaltyPercentage") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("Maximum royalty creators can set (0-50%)")}
              </p>
              {getErrorMessage("MaxRoyaltyPercentage") && (
                <p className="text-sm text-red-500">{getErrorMessage("MaxRoyaltyPercentage")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingFee">{t("Listing Fee (Optional)")}</Label>
              <Input
                id="listingFee"
                type="number"
                min="0"
                step="0.01"
                value={safeSettings.ListingFee}
                onChange={(e) => onUpdate("ListingFee", parseFloat(e.target.value) || 0)}
                className={hasError("ListingFee") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("Fixed fee to create a listing (0 = free)")}
              </p>
              {getErrorMessage("ListingFee") && (
                <p className="text-sm text-red-500">{getErrorMessage("ListingFee")}</p>
              )}
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("Marketplace fees are deducted from sale proceeds. Royalty fees go to the original creator on secondary sales.")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}