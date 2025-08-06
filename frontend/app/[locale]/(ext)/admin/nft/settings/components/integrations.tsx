"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Globe, Info } from "lucide-react";
import { $fetch } from "@/lib/api";

interface NFTIntegrationSettingsSectionProps {
  settings?: {
    EnableCrossChain?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
  validationErrors?: Record<string, string>;
  hasSubmitted?: boolean;
}

export default function NFTIntegrationSettingsSection({
  settings = {},
  onUpdate,
  validationErrors = {},
  hasSubmitted = false,
}: NFTIntegrationSettingsSectionProps) {
  const t = useTranslations("ext");
  
  const safeSettings = {
    EnableCrossChain: settings.EnableCrossChain ?? true,
  };

  // State for blockchain options
  const [blockchainOptions, setBlockchainOptions] = useState<{ value: string; label: string }[]>([]);
  const [blockchainLoading, setBlockchainLoading] = useState(true);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  // Fetch enabled blockchains from the options endpoint
  useEffect(() => {
    const fetchBlockchains = async () => {
      try {
        setBlockchainLoading(true);
        setBlockchainError(null);
        
        const { data, error } = await $fetch({
          url: "/api/admin/nft/blockchain/options",
          method: "GET",
        });

        if (error) {
          setBlockchainError(error);
        } else {
          setBlockchainOptions(data || []);
        }
      } catch (err) {
        setBlockchainError(err instanceof Error ? err.message : "Failed to load blockchains");
      } finally {
        setBlockchainLoading(false);
      }
    };

    fetchBlockchains();
  }, []);

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
      {/* Blockchain Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("blockchain_integration")}
          </CardTitle>
          <CardDescription>
            {t("configure_multi-chain_support_and")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="crossChain">{t("enable_cross-chain_support")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("allow_nfts_to_be")}
              </p>
            </div>
            <Switch
              id="crossChain"
              checked={safeSettings.EnableCrossChain}
              onCheckedChange={(checked) => onUpdate("EnableCrossChain", checked)}
            />
          </div>

          {safeSettings.EnableCrossChain && (
            <>
              <div className="space-y-2">
                <Label>{t("supported_blockchains")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("based_on_enabled_blockchains_in_ecosystem_settings")}
                </p>

                {/* Chain Preview */}
                <div className="rounded-lg bg-muted p-3">
                  <h4 className="text-sm font-medium mb-2">{t("enabled_networks")}</h4>
                  {blockchainLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading blockchains...
                    </p>
                  ) : blockchainError ? (
                    <p className="text-sm text-red-500">
                      Error loading blockchains: {blockchainError}
                    </p>
                  ) : blockchainOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {blockchainOptions.map(option => (
                        <Badge key={option.value} variant="outline" className="text-xs">
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("no_blockchains_enabled_please")}
                    </p>
                  )}
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t("supported_blockchains_are_automatically")}
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}