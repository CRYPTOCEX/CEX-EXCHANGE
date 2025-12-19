"use client";

import { useEffect, useState } from "react";
import type { FormData } from "../types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { $fetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
interface TokenConfigurationStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}

export default function TokenConfigurationStep({
  formData,
  updateFormData,
  errors,
}: TokenConfigurationStepProps) {
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const [blockchains, setBlockchains] = useState<icoBlockchainAttributes[]>([]);
  const [tokenTypes, setTokenTypes] = useState<icoTokenTypeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfigurations = async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        // Fetch blockchains and token types concurrently
        const [blockchainData, tokenTypeData] = await Promise.all([
          $fetch<icoBlockchainAttributes[]>({
            url: "/api/ico/blockchain",
            silent: true,
          }),
          $fetch<icoTokenTypeAttributes[]>({
            url: "/api/ico/token/type",
            silent: true,
          }),
        ]);

        // Use the response directly since the endpoints return plain arrays
        setBlockchains(blockchainData.data || []);
        setTokenTypes(tokenTypeData.data || []);
      } catch (err: any) {
        setFetchError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfigurations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("token_configuration")}</h2>
        <p className="text-muted-foreground">
          {t("configure_the_technical_details_of_your_token")}.
        </p>
      </div>

      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blockchain Select */}
        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : blockchains.length === 0 ? (
            <Alert className="mt-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("no_blockchains_are_currently_available")}.{" "}
                {t("please_contact_support")}.
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={formData.blockchain}
              onValueChange={(value) => updateFormData("blockchain", value)}
            >
              <SelectTrigger
                id="blockchain"
                className="w-full"
                title="Blockchain"
                error={!!errors.blockchain}
                errorMessage={errors.blockchain}
                description={t("the_blockchain_network_your_token_will")}
              >
                <SelectValue placeholder={t("select_blockchain")} />
              </SelectTrigger>
              <SelectContent>
                {blockchains.map((blockchain) => (
                  <SelectItem key={blockchain.value} value={blockchain.value}>
                    {blockchain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Token Type Select */}
        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : tokenTypes.length === 0 ? (
            <Alert className="mt-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("no_token_types_are_currently_available")}.{" "}
                {t("please_contact_support")}.
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={formData.tokenType}
              onValueChange={(value) => updateFormData("tokenType", value)}
            >
              <SelectTrigger
                id="tokenType"
                className="w-full"
                title={tExt("token_type")}
                error={!!errors.tokenType}
                errorMessage={errors.tokenType}
                description={t("the_type_of_token_you_are_creating")}
              >
                <SelectValue placeholder={t("select_token_type")} />
              </SelectTrigger>
              <SelectContent>
                {tokenTypes.map((tokenType) => (
                  <SelectItem key={tokenType.id} value={tokenType.id}>
                    {tokenType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Total Supply Input */}
        <Input
          id="totalSupply"
          type="number"
          placeholder={t("e_g_1000000")}
          value={formData.totalSupply}
          onChange={(e) =>
            updateFormData("totalSupply", Number(e.target.value))
          }
          title={tExt("total_supply")}
          error={!!errors.totalSupply}
          errorMessage={errors.totalSupply}
          description={t("the_total_number_of_tokens_that_will_ever_exist")}
        />

        {/* Initial Token Price Input */}
        <Input
          id="targetAmount"
          type="number"
          step="0.000001"
          placeholder={t("e_g_0_05")}
          value={formData.targetAmount}
          onChange={(e) =>
            updateFormData("targetAmount", Number(e.target.value))
          }
          title={t("initial_token_price_usd")}
          error={!!errors.targetAmount}
          errorMessage={errors.targetAmount}
          description={t("the_initial_price_per_token_in_usd")}
        />
      </div>

      {/* Token Description Textarea */}
      <Textarea
        id="description"
        placeholder={t("brief_description_of_your_token")}
        value={formData.description}
        onChange={(e) => updateFormData("description", e.target.value)}
        title={t("token_description")}
        error={!!errors.description}
        errorMessage={errors.description}
        description={t("a_short_description_of_your_tokens")}
      />
    </div>
  );
}
