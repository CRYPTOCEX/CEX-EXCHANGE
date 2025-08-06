"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { FileText, Image, Shield, HardDrive, Info } from "lucide-react";

interface NFTContentSettingsSectionProps {
  settings?: {
    EnableContentModeration?: boolean;
    AllowExplicitContent?: boolean;
    MaxFileSize?: number;
    SupportedFormats?: string;
    RequireMetadataValidation?: boolean;
    EnableIpfsStorage?: boolean;
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
    EnableContentModeration: settings.EnableContentModeration ?? true,
    AllowExplicitContent: settings.AllowExplicitContent ?? false,
    MaxFileSize: settings.MaxFileSize ?? 100,
    SupportedFormats: settings.SupportedFormats ?? "jpg,jpeg,png,gif,mp4,mp3,webp",
    RequireMetadataValidation: settings.RequireMetadataValidation ?? true,
    EnableIpfsStorage: settings.EnableIpfsStorage ?? true,
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

  // Parse supported formats for display
  const formatList = safeSettings.SupportedFormats.split(',').map(f => f.trim().toLowerCase());
  const imageFormats = formatList.filter(f => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(f));
  const videoFormats = formatList.filter(f => ['mp4', 'mov', 'avi', 'webm'].includes(f));
  const audioFormats = formatList.filter(f => ['mp3', 'wav', 'ogg'].includes(f));
  const otherFormats = formatList.filter(f => !imageFormats.includes(f) && !videoFormats.includes(f) && !audioFormats.includes(f));

  return (
    <div className="space-y-6 pt-3">
      {/* Content Moderation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("content_moderation")}
          </CardTitle>
          <CardDescription>
            {t("configure_content_policies_and_moderation_rules")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="contentModeration">{t("enable_content_moderation")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("automatically_scan_uploads_for")}
                </p>
              </div>
              <Switch
                id="contentModeration"
                checked={safeSettings.EnableContentModeration}
                onCheckedChange={(checked) => onUpdate("EnableContentModeration", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="explicitContent">{t("allow_explicit_content")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("permit_adult_content_with")}
                </p>
              </div>
              <Switch
                id="explicitContent"
                checked={safeSettings.AllowExplicitContent}
                onCheckedChange={(checked) => onUpdate("AllowExplicitContent", checked)}
              />
            </div>
          </div>

          {safeSettings.EnableContentModeration && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {t("content_moderation_uses_ai")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            {t("file_requirements")}
          </CardTitle>
          <CardDescription>
            {t("configure_file_size_limits_and_supported_formats")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">{t("maximum_file_size_(mb)")} *</Label>
              <Input
                id="maxFileSize"
                type="number"
                min="1"
                max="1000"
                value={safeSettings.MaxFileSize}
                onChange={(e) => onUpdate("MaxFileSize", parseInt(e.target.value) || 100)}
                className={hasError("MaxFileSize") ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">{t("maximum_file_size_for_nft_uploads_(1-1000_mb)")}</p>
              {getErrorMessage("MaxFileSize") && (
                <p className="text-sm text-red-500">{getErrorMessage("MaxFileSize")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadataValidation">{t("metadata_validation")}</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("require_valid_metadata_for_all_nfts")}
                </p>
                <Switch
                  id="metadataValidation"
                  checked={safeSettings.RequireMetadataValidation}
                  onCheckedChange={(checked) => onUpdate("RequireMetadataValidation", checked)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportedFormats">{t("supported_file_formats")} *</Label>
            <Textarea
              id="supportedFormats"
              value={safeSettings.SupportedFormats}
              onChange={(e) => onUpdate("SupportedFormats", e.target.value)}
              placeholder="jpg,jpeg,png,gif,mp4,mp3,webp"
              rows={2}
              className={hasError("SupportedFormats") ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground">{t("comma-separated_list_of_allowed_file_extensions")}</p>
            {getErrorMessage("SupportedFormats") && (
              <p className="text-sm text-red-500">{getErrorMessage("SupportedFormats")}</p>
            )}
          </div>

          {/* Format Preview */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">{t("supported_formats_preview")}</h4>
            <div className="space-y-2">
              {imageFormats.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">{t("Images")}:</span>
                  <div className="flex flex-wrap gap-1">
                    {imageFormats.map(format => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {videoFormats.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">{t("Videos")}:</span>
                  <div className="flex flex-wrap gap-1">
                    {videoFormats.map(format => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {audioFormats.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">{t("Audio")}:</span>
                  <div className="flex flex-wrap gap-1">
                    {audioFormats.map(format => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {otherFormats.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-[60px]">{t("Other")}:</span>
                  <div className="flex flex-wrap gap-1">
                    {otherFormats.map(format => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t("decentralized_storage")}
          </CardTitle>
          <CardDescription>
            {t("configure_decentralized_storage_options")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="ipfsStorage">{t("enable_ipfs_storage")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("store_nft_metadata_and")}
                </p>
              </div>
              <Switch
                id="ipfsStorage"
                checked={safeSettings.EnableIpfsStorage}
                onCheckedChange={(checked) => onUpdate("EnableIpfsStorage", checked)}
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("decentralized_storage_ensures_nft")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}