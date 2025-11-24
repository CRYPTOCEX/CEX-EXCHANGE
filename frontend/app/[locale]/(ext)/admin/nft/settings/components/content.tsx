"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { FileText, Info } from "lucide-react";

interface NFTContentSettingsSectionProps {
  settings?: {
    RequireMetadataValidation?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function NFTContentSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: NFTContentSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    RequireMetadataValidation: settings.RequireMetadataValidation ?? true,
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
      {/* Metadata Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("Metadata & IPFS")}
          </CardTitle>
          <CardDescription>
            {t("Configure NFT metadata requirements")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="metadataValidation">{t("Require Metadata Validation")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("Validate IPFS metadata URLs before accepting NFT listings")}
              </p>
            </div>
            <Switch
              id="metadataValidation"
              checked={safeSettings.RequireMetadataValidation}
              onCheckedChange={(checked) => onUpdate("RequireMetadataValidation", checked)}
            />
          </div>

          {safeSettings.RequireMetadataValidation && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                When enabled, the system will fetch and validate IPFS metadata when users create listings. This ensures metadata is accessible and contains required NFT fields (name, image).
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("This marketplace uses IPFS for decentralized NFT storage. Users provide IPFS URLs for their NFT assets and metadata. File size and format restrictions are enforced by IPFS, not by the platform.")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}