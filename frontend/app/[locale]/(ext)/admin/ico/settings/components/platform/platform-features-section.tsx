"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

interface PlatformFeaturesSectionProps {
  kycRequired: boolean;
  maintenanceMode: boolean;
  allowPublicOfferings: boolean;
  onUpdate: (key, value) => void;
}

export default function PlatformFeaturesSection({
  kycRequired,
  maintenanceMode,
  allowPublicOfferings,
  onUpdate,
}: PlatformFeaturesSectionProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("platform_features")}</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="kyc-required"
            checked={kycRequired}
            onCheckedChange={(checked) => onUpdate("icoKycRequired", checked)}
          />
          <Label htmlFor="kyc-required">
            {t("kyc_required_for_investments")}
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="public-offerings"
            checked={allowPublicOfferings}
            onCheckedChange={(checked) =>
              onUpdate("icoAllowPublicOfferings", checked)
            }
          />
          <Label htmlFor="public-offerings">
            {t("allow_public_offerings")}
          </Label>
        </div>
      </div>
    </div>
  );
}
