"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loadable } from "@/components/ui/skeleton";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { toast } from "sonner";
import ApiKeyForm from "../../components/ApiKeyForm";
import { useTranslations } from "next-intl";

interface WalletTypeConfig {
  enabled: boolean;
  currencies: string[];
}

interface AllowedWalletTypes {
  [walletType: string]: WalletTypeConfig;
}

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  type: "PUBLIC" | "SECRET";
  mode: "LIVE" | "TEST";
  permissions: string[];
  allowedWalletTypes?: AllowedWalletTypes;
  ipWhitelist?: string[];
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  status: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export default function EditApiKeyClient() {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const tExtGateway = useTranslations("ext_gateway");
  const params = useParams();
  const router = useRouter();
  const keyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [keyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await $fetch({ url: "/api/gateway/api-key", silent: true });

      const keys = data?.items || data || [];
      const key = keys.find((k: ApiKey) => k.id === keyId);

      if (!key) {
        setError(t("api_key_not_found"));
        return;
      }

      setApiKey(key);
    } catch (err: any) {
      setError(err.message || t("failed_to_load_api_key"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    const { error: saveError } = await $fetch({
      url: `/api/gateway/api-key/${keyId}`,
      method: "PUT",
      body: {
        successUrl: data.successUrl || null,
        cancelUrl: data.cancelUrl || null,
        webhookUrl: data.webhookUrl || null,
        permissions: data.permissions,
        allowedWalletTypes: Object.keys(data.allowedWalletTypes).length > 0 ? data.allowedWalletTypes : null,
        ipWhitelist: data.ipWhitelist.length > 0 ? data.ipWhitelist : null,
      },
    });

    if (saveError) {
      toast.error(typeof saveError === "string" ? saveError : (saveError as any)?.message || t("failed_to_save"));
    } else {
      toast.success(t("api_key_settings_saved_successfully"));
      router.push("/gateway/settings?tab=api-keys");
    }
    setSaving(false);
  };

  /**
   * NO `if (loading) return <Skeleton/>`.
   *
   * The block that used to be here was a `h-10 w-10` square, two bars and a
   * single `h-[600px]` rectangle standing in for the whole form — a hardcoded
   * height for a form whose real height depends on how many wallet types the
   * platform has enabled, so it was wrong by whatever that difference happened
   * to be, and the page jumped by that much every time. It also dropped the
   * `mb-6` the real header carries, so even the header moved.
   *
   * The header is literals plus one value (the key's name); the form renders
   * its own controls, whose boxes do not depend on their values.
   */
  if (error) {
    return (
        <div className="container mx-auto pt-24 pb-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Link href="/gateway/settings?tab=api-keys">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon("back_to_settings")}
          </Button>
        </Link>
      </div>
    );
  }

  /* Still a hard stop, but only once the fetch has finished with nothing —
     `!apiKey` is true while loading too, and returning `null` for that would
     have been a blank page rather than a pending one. */
  if (!loading && !apiKey) {
    return null;
  }

  const keyName = (apiKey?.name ?? "").replace(" (Public)", "").replace(" (Secret)", "");

  return (
    <div className="container mx-auto pt-24 pb-12">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link href="/gateway/settings?tab=api-keys">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{tCommon("edit_api_key")}</h1>
            <p className="text-muted-foreground">
              {tExtGateway("configure_settings_for")}:{" "}
              <span className="font-medium">
                <Loadable loading={loading} placeholder={t("production_key")}>
                  {keyName}
                </Loadable>
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* The form renders in both states. It already syncs itself from
          `initialData` when that prop changes, so the values arrive without a
          remount — no second tree, no swap.

          `isSubmitting` covers the pending state as well as the saving one: it
          is what disables Save, and a Save pressed before the key has loaded
          would PUT a blank success/cancel/webhook URL over the merchant's real
          configuration. */}
      <ApiKeyForm
        mode="edit"
        keyMode={apiKey?.mode ?? "LIVE"}
        keyType={apiKey?.type}
        initialData={{
          name: keyName,
          successUrl: apiKey?.successUrl || "",
          cancelUrl: apiKey?.cancelUrl || "",
          webhookUrl: apiKey?.webhookUrl || "",
          permissions: apiKey?.permissions || ["*"],
          allowedWalletTypes: apiKey?.allowedWalletTypes || {},
          ipWhitelist: apiKey?.ipWhitelist || [],
        }}
        lockedFields={["name"]}
        onSubmit={handleSave}
        onCancel={() => router.push("/gateway/settings?tab=api-keys")}
        isSubmitting={saving || loading}
      />
    </div>
  );
}
