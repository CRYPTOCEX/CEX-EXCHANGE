"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
        setError("API key not found");
        return;
      }

      setApiKey(key);
    } catch (err: any) {
      setError(err.message || "Failed to load API key");
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
      toast.error(typeof saveError === "string" ? saveError : (saveError as any)?.message || "Failed to save");
    } else {
      toast.success("API key settings saved successfully");
      router.push("/gateway/settings?tab=api-keys");
    }
    setSaving(false);
  };

  if (loading) {
    return (
        <div className="container mx-auto pt-24 pb-12">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    );
  }

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
            {t("back_to_settings")}
          </Button>
        </Link>
      </div>
    );
  }

  if (!apiKey) {
    return null;
  }

  const keyName = apiKey.name.replace(" (Public)", "").replace(" (Secret)", "");

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
              {tExtGateway("configure_settings_for")}: <span className="font-medium">{keyName}</span>
            </p>
          </div>
        </div>
      </div>

      <ApiKeyForm
        mode="edit"
        keyMode={apiKey.mode}
        keyType={apiKey.type}
        initialData={{
          name: keyName,
          successUrl: apiKey.successUrl || "",
          cancelUrl: apiKey.cancelUrl || "",
          webhookUrl: apiKey.webhookUrl || "",
          permissions: apiKey.permissions || ["*"],
          allowedWalletTypes: apiKey.allowedWalletTypes || {},
          ipWhitelist: apiKey.ipWhitelist || [],
        }}
        lockedFields={["name"]}
        onSubmit={handleSave}
        onCancel={() => router.push("/gateway/settings?tab=api-keys")}
        isSubmitting={saving}
      />
    </div>
  );
}
