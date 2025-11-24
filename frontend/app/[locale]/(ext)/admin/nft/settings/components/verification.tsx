"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { Shield, UserCheck, AlertTriangle, Info } from "lucide-react";
import { useConfigStore } from "@/store/config";
import { isKycEnabled } from "@/utils/kyc";

interface NFTVerificationSettingsSectionProps {
  settings?: {
    RequireKycForCreators?: boolean;
    RequireKycForHighValue?: boolean;
    HighValueThreshold?: number;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function NFTVerificationSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: NFTVerificationSettingsSectionProps) {
  const t = useTranslations("ext");
  const { settings: platformSettings } = useConfigStore();
  const kycEnabled = isKycEnabled(platformSettings);

  const safeSettings = {
    RequireKycForCreators: settings.RequireKycForCreators ?? false,
    RequireKycForHighValue: settings.RequireKycForHighValue ?? true,
    HighValueThreshold: settings.HighValueThreshold ?? 1000,
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
      {/* Creator Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {t("creator_verification")}
          </CardTitle>
          <CardDescription>
            {t("configure_creator_verification_and")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("verification_settings_affect_marketplace")}
            </AlertDescription>
          </Alert>

          {!kycEnabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                KYC is currently disabled in platform settings. Enable KYC in the platform settings to use KYC-related verification features.
              </AlertDescription>
            </Alert>
          )}

          <div className={`flex items-center justify-between ${!kycEnabled ? 'opacity-50' : ''}`}>
            <div className="space-y-1">
              <Label htmlFor="requireKycCreators">{t("require_kyc_for_all_creators")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("mandate_identity_verification_for")}
              </p>
            </div>
            <Switch
              id="requireKycCreators"
              checked={safeSettings.RequireKycForCreators}
              onCheckedChange={(checked) => onUpdate("RequireKycForCreators", checked)}
              disabled={!kycEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* High-Value Transactions */}
      <Card className={!kycEnabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("high-value_transaction_protection")}
          </CardTitle>
          <CardDescription>
            {t("additional_verification_requirements_for")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!kycEnabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This feature requires KYC to be enabled in platform settings.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="requireKycHighValue">{t("require_kyc_for_high-value_sales")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("mandate_identity_verification_for")}
              </p>
            </div>
            <Switch
              id="requireKycHighValue"
              checked={safeSettings.RequireKycForHighValue}
              onCheckedChange={(checked) => onUpdate("RequireKycForHighValue", checked)}
              disabled={!kycEnabled}
            />
          </div>

          {safeSettings.RequireKycForHighValue && (
            <div className="space-y-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This feature uses real-time cryptocurrency prices from the currency table to convert transaction values to USD for comparison against the threshold.
                </AlertDescription>
              </Alert>

              <Label htmlFor="highValueThreshold">{t("High-Value Threshold (USD)")} *</Label>
              <Input
                id="highValueThreshold"
                type="number"
                min="0"
                step="100"
                value={safeSettings.HighValueThreshold}
                onChange={(e) => onUpdate("HighValueThreshold", parseInt(e.target.value) || 1000)}
                className={hasError("HighValueThreshold") ? "border-red-500" : ""}
                disabled={!kycEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Transactions above this USD value will require KYC verification. Crypto prices are automatically converted to USD using the currency table.
              </p>
              {getErrorMessage("HighValueThreshold") && (
                <p className="text-sm text-red-500">{getErrorMessage("HighValueThreshold")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}