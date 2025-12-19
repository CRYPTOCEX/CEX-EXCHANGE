"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";
import SettingsLoading from "./loading";
import SettingsErrorState from "./error-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  Key,
  Plus,
  Trash2,
  Copy,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  CreditCard,
  Lock,
  ShieldCheck,
  Globe,
  Pencil,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { toast } from "sonner";
import { useMerchantMode } from "../context/merchant-mode";
import { useTranslations } from "next-intl";
import { SettingsHero } from "./components/settings-hero";

const AVAILABLE_PERMISSIONS = [
  { id: "payment.create", label: "Create Payments" },
  { id: "payment.read", label: "Read Payments" },
  { id: "payment.cancel", label: "Cancel Payments" },
  { id: "refund.create", label: "Create Refunds" },
  { id: "refund.read", label: "Read Refunds" },
];

const WALLET_TYPE_LABELS: Record<string, string> = {
  FIAT: "Fiat",
  SPOT: "Spot",
  ECO: "ECO",
};

interface Merchant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  businessType?: string;
  taxId?: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  testMode: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  successUrl?: string;
  cancelUrl?: string;
}

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
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  status: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

const VALID_TABS = ["general", "api-keys", "webhooks"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function MerchantSettingsClient() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const { mode } = useMerchantMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab") as TabValue | null;
  const initialTab = tabFromQuery && VALID_TABS.includes(tabFromQuery) ? tabFromQuery : "general";

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync tab with URL query
  const handleTabChange = useCallback((value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === "general") {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    const queryString = params.toString();
    router.replace(`/gateway/settings${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  // Update tab when URL changes
  useEffect(() => {
    if (tabFromQuery && VALID_TABS.includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  // Delete confirmation
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState(false);

  // Rotate key result
  const [rotatedKey, setRotatedKey] = useState<{ key: string; type: string } | null>(null);
  const [showRotatedKey, setShowRotatedKey] = useState(false);

  useEffect(() => {
    fetchData();
  }, [mode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [merchantRes, keysRes] = await Promise.all([
        $fetch({ url: "/api/gateway/merchant", silent: true }),
        $fetch({ url: `/api/gateway/api-key?mode=${mode}`, silent: true }),
      ]);

      if (merchantRes.error || !merchantRes.data?.merchant) {
        setMerchant(null);
        return;
      }

      setMerchant(merchantRes.data.merchant);
      setApiKeys(keysRes.data?.items || keysRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!merchant) return;
    setSaving(true);

    const { error: saveError } = await $fetch({
      url: "/api/gateway/merchant",
      method: "PUT",
      body: {
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        website: merchant.website,
        description: merchant.description,
        businessType: merchant.businessType,
        country: merchant.country,
        city: merchant.city,
        state: merchant.state,
        postalCode: merchant.postalCode,
        address: merchant.address,
      },
    });

    if (saveError) {
      toast.error(saveError);
    } else {
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  const handleDeleteApiKey = async () => {
    if (!deleteKeyId) return;
    setDeletingKey(true);

    const { error: deleteError } = await $fetch({
      url: `/api/gateway/api-key/${deleteKeyId}`,
      method: "DELETE",
    });

    if (deleteError) {
      toast.error(deleteError);
    } else {
      toast.success("API key deleted");
      fetchData();
    }
    setDeleteKeyId(null);
    setDeletingKey(false);
  };

  const handleRotateApiKey = async (keyId: string) => {
    const { data, error: rotateError } = await $fetch({
      url: `/api/gateway/api-key/${keyId}/rotate`,
      method: "POST",
    });

    if (rotateError) {
      toast.error(rotateError);
    } else {
      setRotatedKey({ key: data.key, type: data.type });
      fetchData();
      toast.success("API key rotated successfully");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return <SettingsLoading />;
  }

  if (error) {
    return <SettingsErrorState error={error} />;
  }

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("register_as_a_payment_gateway_merchant")}
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">{t("register_as_merchant")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SettingsHero />
      <div className="container mx-auto space-y-6 pb-12 pt-8">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {tCommon("save_changes")}
          </Button>
        </div>

        <TabsContent value="general" className="space-y-4 mt-4">
          {merchant.verificationStatus === "PENDING" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("your_business_details_are_pending_review")} {t("fields_are_locked_until_verification_is_complete")}
              </AlertDescription>
            </Alert>
          )}
          {merchant.verificationStatus === "VERIFIED" && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <AlertDescription>
                {t("your_business_is_verified")} {t("fields_are_locked_and_require_contacting")}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tCommon("business_information")}
                {merchant.verificationStatus === "PENDING" && (
                  <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                    <Lock className="h-3 w-3 mr-1" />
                    {tCommon("pending_review")}
                  </Badge>
                )}
                {merchant.verificationStatus === "VERIFIED" && (
                  <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{tExtAdmin('business_name')}</Label>
                  <Input
                    id="name"
                    value={merchant.name}
                    onChange={(e) => setMerchant({ ...merchant, name: e.target.value })}
                    disabled={merchant.verificationStatus !== "UNVERIFIED"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input id="slug" value={merchant.slug} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={merchant.email}
                    onChange={(e) => setMerchant({ ...merchant, email: e.target.value })}
                    disabled={merchant.verificationStatus !== "UNVERIFIED"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={merchant.phone || ""}
                    onChange={(e) => setMerchant({ ...merchant, phone: e.target.value })}
                    disabled={merchant.verificationStatus !== "UNVERIFIED"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={merchant.website || ""}
                  onChange={(e) => setMerchant({ ...merchant, website: e.target.value })}
                  disabled={merchant.verificationStatus !== "UNVERIFIED"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={merchant.description || ""}
                  onChange={(e) => setMerchant({ ...merchant, description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("business_address")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  {merchant.verificationStatus !== "UNVERIFIED" ? (
                    <Input value={merchant.country || ""} disabled className="bg-muted" />
                  ) : (
                    <CountrySelect
                      value={merchant.country || ""}
                      onValueChange={(value) => setMerchant({ ...merchant, country: value, state: "", city: "" })}
                      placeholder={tCommon('select_country')}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{tExt("state_province")}</Label>
                  {merchant.verificationStatus !== "UNVERIFIED" ? (
                    <Input value={merchant.state || ""} disabled className="bg-muted" />
                  ) : (
                    <StateSelect
                      value={merchant.state || ""}
                      onValueChange={(value) => setMerchant({ ...merchant, state: value, city: "" })}
                      countryCode={merchant.country}
                      placeholder={tCommon('select_state')}
                      disabled={!merchant.country}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  {merchant.verificationStatus !== "UNVERIFIED" ? (
                    <Input value={merchant.city || ""} disabled className="bg-muted" />
                  ) : (
                    <CitySelect
                      value={merchant.city || ""}
                      onValueChange={(value) => setMerchant({ ...merchant, city: value })}
                      countryCode={merchant.country}
                      stateName={merchant.state}
                      placeholder={tCommon('select_city')}
                      disabled={!merchant.state}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{tExt("postal_code")}</Label>
                  <Input
                    id="postalCode"
                    value={merchant.postalCode || ""}
                    onChange={(e) => setMerchant({ ...merchant, postalCode: e.target.value })}
                    placeholder="12345"
                    disabled={merchant.verificationStatus !== "UNVERIFIED"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{tCommon("street_address")}</Label>
                <Input
                  id="address"
                  value={merchant.address || ""}
                  onChange={(e) => setMerchant({ ...merchant, address: e.target.value })}
                  placeholder={`123 ${tCommon('business_street_suite_100')}`}
                  disabled={merchant.verificationStatus !== "UNVERIFIED"}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4 mt-4">
          {merchant.verificationStatus !== "VERIFIED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t("verification_required")}:</strong> {t("your_merchant_account_must_be_verified")}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>{t("manage_your_api_keys_for_integration")}</CardDescription>
              </div>
              <Link href="/gateway/api-key/create">
                <Button variant="outline" disabled={merchant.verificationStatus !== "VERIFIED"}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("create_key")}
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {apiKeys.filter(k => k.type === "PUBLIC").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("no_api_keys_yet")}</p>
                  <p className="text-sm">{t("create_your_first_api_key_to_start_integrating")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys
                    .filter((key) => key.type === "PUBLIC")
                    .map((publicKey) => {
                      const secretKey = apiKeys.find(
                        (k) => k.type === "SECRET" && k.mode === publicKey.mode && k.name.replace(" (Public)", "") === publicKey.name.replace(" (Public)", "")
                      );
                      const keyName = publicKey.name.replace(" (Public)", "");
                      const hasUrls = publicKey.successUrl || publicKey.cancelUrl || publicKey.webhookUrl;

                      return (
                        <div key={publicKey.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{keyName}</span>
                            <div className="flex items-center gap-1">
                              <Link href={`/gateway/api-key/${publicKey.id}/edit`}>
                                <Button variant="outline" size="sm" title={t("edit_key_settings")}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteKeyId(publicKey.id)}
                                title={t("delete_key_pair")}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{t("public_key")}</p>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded font-mono flex-1">
                                  {publicKey.keyPreview}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRotateApiKey(publicKey.id)}
                                  title={t("rotate_public_key")}
                                  className="h-7 w-7 p-0"
                                >
                                  <RefreshCcw className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{t("secret_key")}</p>
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-muted px-2 py-1 rounded font-mono flex-1">
                                  {secretKey?.keyPreview || "••••••••••••"}
                                </code>
                                {secretKey && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRotateApiKey(secretKey.id)}
                                    title={t("rotate_secret_key")}
                                    className="h-7 w-7 p-0"
                                  >
                                    <RefreshCcw className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {hasUrls && (
                            <div className="text-xs text-muted-foreground border-t pt-2 mt-2 space-y-1">
                              {publicKey.successUrl && <p><span className="font-medium">{tExt("success")}:</span> {publicKey.successUrl}</p>}
                              {publicKey.cancelUrl && <p><span className="font-medium">{tCommon("cancel")}:</span> {publicKey.cancelUrl}</p>}
                              {publicKey.webhookUrl && <p><span className="font-medium">{t("webhook")}:</span> {publicKey.webhookUrl}</p>}
                            </div>
                          )}

                          <div className="flex items-center gap-1 flex-wrap mt-2">
                            <span className="text-xs text-muted-foreground">{tCommon("permissions")}:</span>
                            {publicKey.permissions?.includes("*") ? (
                              <Badge variant="secondary" className="text-xs">{t("full_access")}</Badge>
                            ) : (
                              publicKey.permissions?.map((perm) => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                                </Badge>
                              ))
                            )}
                          </div>

                          {publicKey.allowedWalletTypes && Object.keys(publicKey.allowedWalletTypes).length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{t("accepts")}:</span>
                              {Object.entries(publicKey.allowedWalletTypes).map(([type, config]) => (
                                config.enabled && (
                                  <Badge key={type} variant="outline" className="text-xs">
                                    {WALLET_TYPE_LABELS[type] || type} ({config.currencies?.length || 0})
                                  </Badge>
                                )
                              ))}
                            </div>
                          )}

                          {publicKey.lastUsedAt && (
                            <p className="text-xs text-muted-foreground">
                              {t("last_used")}: {new Date(publicKey.lastUsedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("integration_details")}
              </CardTitle>
              <CardDescription>{t("use_these_details_to_configure_your")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={typeof window !== "undefined" ? window.location.origin : ""}
                    readOnly
                    className="font-mono bg-muted"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(window.location.origin)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("full_api_endpoint")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/gateway/v1` : ""}
                    readOnly
                    className="font-mono bg-muted text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${window.location.origin}/api/gateway/v1`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{tExt("webhook_configuration")}</CardTitle>
              <CardDescription>{t("receive_real_time_notifications_about_payment")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("webhook_urls_are_configured_per_api_key_go_to_the")} <strong>API Keys</strong> {t("tab_and_edit_each_key_to_configure_its_webhook_url")}
                </AlertDescription>
              </Alert>

              {merchant.webhookSecret && (
                <div className="space-y-2">
                  <Label>{t("webhook_secret")}</Label>
                  <div className="flex gap-2">
                    <Input value={merchant.webhookSecret} disabled className="font-mono bg-muted" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(merchant.webhookSecret!)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("use_this_secret_to_verify_webhook_signatures")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("webhook_events")}</CardTitle>
              <CardDescription>{t("events_that_trigger_webhook_notifications")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { event: "payment.created", description: "New payment initiated" },
                  { event: "payment.completed", description: "Payment successfully completed" },
                  { event: "payment.failed", description: "Payment failed" },
                  { event: "payment.cancelled", description: "Payment cancelled" },
                  { event: "refund.created", description: "Refund initiated" },
                  { event: "refund.completed", description: "Refund processed" },
                ].map((item) => (
                  <div key={item.event} className="flex items-center gap-3 py-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <code className="text-sm font-medium">{item.event}</code>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete_api_key_pair")}</DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to_delete_this_api_key_pair")} {t("this_will_delete_both_the_public_and_secret_keys")} {tCommon('this_action_cannot_be_undone')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKeyId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteApiKey} disabled={deletingKey}>
              {deletingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotated Key Dialog */}
      <Dialog open={!!rotatedKey} onOpenChange={() => { setRotatedKey(null); setShowRotatedKey(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("key_rotated")}</DialogTitle>
            <DialogDescription>{t("your_new")} {rotatedKey?.type?.toLowerCase()} {t("key_has_been_generated_copy_it")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("new_key")}</Label>
            <div className="flex gap-2">
              <Input
                type={showRotatedKey ? "text" : "password"}
                value={rotatedKey?.key || ""}
                readOnly
                className="font-mono"
              />
              <Button variant="outline" size="icon" onClick={() => setShowRotatedKey(!showRotatedKey)}>
                {showRotatedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(rotatedKey?.key || "")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setRotatedKey(null); setShowRotatedKey(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
