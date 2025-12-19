"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Copy,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { toast } from "sonner";
import { useMerchantMode } from "../../context/merchant-mode";
import ApiKeyForm from "../components/ApiKeyForm";
import { useTranslations } from "next-intl";

interface CreatedKeys {
  publicKey: string;
  secretKey: string;
}

export default function CreateApiKeyClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { mode } = useMerchantMode();
  const [creating, setCreating] = useState(false);
  const [createdKeys, setCreatedKeys] = useState<CreatedKeys | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCreate = async (data: any) => {
    setCreating(true);
    const { data: result, error } = await $fetch({
      url: "/api/gateway/api-key",
      method: "POST",
      body: {
        name: data.name,
        type: mode,
        successUrl: data.successUrl || null,
        cancelUrl: data.cancelUrl || null,
        webhookUrl: data.webhookUrl || null,
        permissions: data.permissions,
        allowedWalletTypes: Object.keys(data.allowedWalletTypes).length > 0 ? data.allowedWalletTypes : null,
        ipWhitelist: data.ipWhitelist.length > 0 ? data.ipWhitelist : null,
      },
    });

    if (error) {
      toast.error(typeof error === "string" ? error : (error as any)?.message || "Failed to create API key");
    } else {
      setCreatedKeys({
        publicKey: result.publicKey,
        secretKey: result.secretKey,
      });
      toast.success("API key created successfully");
    }
    setCreating(false);
  };

  const copyToClipboard = async (text: string, keyType: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(keyType);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Show created keys page
  if (createdKeys) {
    return (
      <div className="space-y-6 container mx-auto pt-24 pb-12">
        {/* Success Header */}
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">API Keys Created Successfully</h1>
            <p className="text-muted-foreground mt-1">
              {t("save_your_keys_securely_the_secret")}
            </p>
          </div>
        </div>

        <Alert variant="destructive" className="border-red-500/50 bg-red-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{tExt("important")}:</strong> {t("copy_your_secret_key_now_and_store_it_securely")} {t("you_wont_be_able_to_see")}
          </AlertDescription>
        </Alert>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{tCommon("your_api_keys")}</CardTitle>
                <CardDescription>{t("use_these_keys_to_integrate_with_your_application")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Public Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    Public
                  </Badge>
                  {t("for_client_side_use")}
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={createdKeys.publicKey}
                  readOnly
                  className="font-mono text-sm bg-muted/50"
                />
                <Button
                  variant={copiedKey === "public" ? "default" : "outline"}
                  size="icon"
                  onClick={() => copyToClipboard(createdKeys.publicKey, "public")}
                  className="shrink-0"
                >
                  {copiedKey === "public" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("safe_to_expose_in_frontend_code")}
              </p>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                    Secret
                  </Badge>
                  {t("for_server_side_use_only")}
                </Label>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showSecretKey ? "text" : "password"}
                    value={createdKeys.secretKey}
                    readOnly
                    className="font-mono text-sm bg-muted/50 pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant={copiedKey === "secret" ? "default" : "outline"}
                  size="icon"
                  onClick={() => copyToClipboard(createdKeys.secretKey, "secret")}
                  className="shrink-0"
                >
                  {copiedKey === "secret" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("keep_this_secret_never_expose_in")}
              </p>
            </div>

            {/* Security Tips */}
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{tExt("security_best_practices")}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>{t("store_secret_keys_in_environment_variables")}</li>
                    <li>{t("never_log_or_expose_secret_keys_in_error_messages")}</li>
                    <li>{t("use_ip_whitelisting_for_production_environments")}</li>
                    <li>{t("rotate_keys_periodically_or_if_compromised")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Link href="/gateway/settings?tab=api-keys" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tExt("back_to_settings")}
            </Button>
          </Link>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => {
              setCreatedKeys(null);
              setShowSecretKey(false);
              setCopiedKey(null);
            }}
          >
            {t("create_another_key")}
          </Button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">{tCommon("create_api_key")}</h1>
            <p className="text-muted-foreground">
              {tCommon("create_a_new")} {mode === "LIVE" ? "live" : "test"} API key pair for your integration
            </p>
          </div>
        </div>
      </div>

      <ApiKeyForm
        mode="create"
        keyMode={mode}
        onSubmit={handleCreate}
        onCancel={() => router.push("/gateway/settings?tab=api-keys")}
        isSubmitting={creating}
      />
    </div>
  );
}
