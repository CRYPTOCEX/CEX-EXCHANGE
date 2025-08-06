"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { Shield, UserCheck, Star, AlertTriangle } from "lucide-react";

interface NFTVerificationSettingsSectionProps {
  settings?: {
    AutoVerifyCreators?: boolean;
    RequireKycForCreators?: boolean;
    RequireKycForHighValue?: boolean;
    HighValueThreshold?: number;
    VerificationBadgeEnabled?: boolean;
    ManualReviewRequired?: boolean;
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
  const safeSettings = {
    AutoVerifyCreators: settings.AutoVerifyCreators ?? false,
    RequireKycForCreators: settings.RequireKycForCreators ?? false,
    RequireKycForHighValue: settings.RequireKycForHighValue ?? true,
    HighValueThreshold: settings.HighValueThreshold ?? 1000,
    VerificationBadgeEnabled: settings.VerificationBadgeEnabled ?? true,
    ManualReviewRequired: settings.ManualReviewRequired ?? true,
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="autoVerify">{t("auto-verify_new_creators")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("automatically_grant_verification_status")}
                </p>
              </div>
              <Switch
                id="autoVerify"
                checked={safeSettings.AutoVerifyCreators}
                onCheckedChange={(checked) => onUpdate("AutoVerifyCreators", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
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
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="manualReview">{t("manual_review_required")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("all_verification_requests_require_admin_approval")}
                </p>
              </div>
              <Switch
                id="manualReview"
                checked={safeSettings.ManualReviewRequired}
                onCheckedChange={(checked) => onUpdate("ManualReviewRequired", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High-Value Transactions */}
      <Card>
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
            />
          </div>

          {safeSettings.RequireKycForHighValue && (
            <div className="space-y-2">
              <Label htmlFor="highValueThreshold">{t("high-value_threshold_(usd)")} *</Label>
              <Input
                id="highValueThreshold"
                type="number"
                min="0"
                step="100"
                value={safeSettings.HighValueThreshold}
                onChange={(e) => onUpdate("HighValueThreshold", parseInt(e.target.value) || 1000)}
                className={hasError("HighValueThreshold") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("transactions_above_this_usd")}
              </p>
              {getErrorMessage("HighValueThreshold") && (
                <p className="text-sm text-red-500">{getErrorMessage("HighValueThreshold")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t("verification_badges")}
          </CardTitle>
          <CardDescription>
            {t("configure_visual_verification_indicators")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="verificationBadge">{t("enable_verification_badges")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("display_verification_checkmarks_on")}
              </p>
            </div>
            <Switch
              id="verificationBadge"
              checked={safeSettings.VerificationBadgeEnabled}
              onCheckedChange={(checked) => onUpdate("VerificationBadgeEnabled", checked)}
            />
          </div>

          {safeSettings.VerificationBadgeEnabled && (
            <Alert>
              <Star className="h-4 w-4" />
              <AlertDescription>
                {t("verification_badges_help_users")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}