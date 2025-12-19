"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Key,
  Shield,
  Wallet,
  Globe,
  Plus,
  X,
  Link2,
  Banknote,
  Coins,
  CircleDollarSign,
  Info,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import $fetch from "@/lib/api";
import { useTranslations } from "next-intl";

// Types
interface WalletTypeConfig {
  enabled: boolean;
  currencies: string[];
}

interface AllowedWalletTypes {
  [walletType: string]: WalletTypeConfig;
}

interface ApiKeyFormData {
  name: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  permissions: string[];
  allowedWalletTypes: AllowedWalletTypes;
  ipWhitelist: string[];
}

interface ApiKeyFormProps {
  mode: "create" | "edit";
  keyMode: "LIVE" | "TEST";
  keyType?: "PUBLIC" | "SECRET";
  initialData?: Partial<ApiKeyFormData>;
  lockedFields?: (keyof ApiKeyFormData | "name")[];
  onSubmit: (data: ApiKeyFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

// Constants
const AVAILABLE_PERMISSIONS = [
  {
    id: "payment.create",
    label: "Create Payments",
    description: "Create new payment sessions",
    secretOnly: true,
  },
  {
    id: "payment.read",
    label: "Read Payments",
    description: "View payment details and status",
    secretOnly: false,
  },
  {
    id: "payment.cancel",
    label: "Cancel Payments",
    description: "Cancel pending payments",
    secretOnly: true,
  },
  {
    id: "refund.create",
    label: "Create Refunds",
    description: "Initiate refunds for payments",
    secretOnly: true,
  },
  {
    id: "refund.read",
    label: "Read Refunds",
    description: "View refund details and status",
    secretOnly: false,
  },
];

const WALLET_TYPE_CONFIG: Record<string, { label: string; icon: typeof Banknote; description: string; color: string }> = {
  FIAT: {
    label: "Fiat",
    icon: Banknote,
    description: "Traditional currency payments (USD, EUR, etc.)",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  SPOT: {
    label: "Spot",
    icon: Coins,
    description: "Cryptocurrency payments (BTC, ETH, etc.)",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  ECO: {
    label: "Ecosystem",
    icon: CircleDollarSign,
    description: "Platform ecosystem tokens",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
};

export default function ApiKeyForm({
  mode,
  keyMode,
  keyType,
  initialData,
  lockedFields = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
}: ApiKeyFormProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [successUrl, setSuccessUrl] = useState(initialData?.successUrl || "");
  const [cancelUrl, setCancelUrl] = useState(initialData?.cancelUrl || "");
  const [webhookUrl, setWebhookUrl] = useState(initialData?.webhookUrl || "");
  const [permissions, setPermissions] = useState<string[]>(initialData?.permissions || ["*"]);
  const [allowedWalletTypes, setAllowedWalletTypes] = useState<AllowedWalletTypes>(initialData?.allowedWalletTypes || {});
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(initialData?.ipWhitelist || []);
  const [newIp, setNewIp] = useState("");

  // Global settings
  const [globalWalletTypes, setGlobalWalletTypes] = useState<AllowedWalletTypes>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setSuccessUrl(initialData.successUrl || "");
      setCancelUrl(initialData.cancelUrl || "");
      setWebhookUrl(initialData.webhookUrl || "");
      setPermissions(initialData.permissions || ["*"]);
      setAllowedWalletTypes(initialData.allowedWalletTypes || {});
      setIpWhitelist(initialData.ipWhitelist || []);
    }
  }, [initialData]);

  const fetchSettings = async () => {
    try {
      const { data } = await $fetch({ url: "/api/gateway/settings", silent: true });
      if (data?.gatewayAllowedWalletTypes) {
        setGlobalWalletTypes(data.gatewayAllowedWalletTypes);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSubmit = async () => {
    await onSubmit({
      name,
      successUrl,
      cancelUrl,
      webhookUrl,
      permissions,
      allowedWalletTypes,
      ipWhitelist,
    });
  };

  const addIp = () => {
    const trimmed = newIp.trim();
    if (trimmed && !ipWhitelist.includes(trimmed)) {
      setIpWhitelist([...ipWhitelist, trimmed]);
      setNewIp("");
    }
  };

  const removeIp = (index: number) => {
    setIpWhitelist(ipWhitelist.filter((_, i) => i !== index));
  };

  const toggleWalletType = (type: string, enabled: boolean) => {
    if (enabled) {
      const globalConfig = globalWalletTypes[type];
      setAllowedWalletTypes({
        ...allowedWalletTypes,
        [type]: {
          enabled: true,
          currencies: globalConfig?.currencies || [],
        },
      });
    } else {
      const newTypes = { ...allowedWalletTypes };
      delete newTypes[type];
      setAllowedWalletTypes(newTypes);
    }
  };

  const toggleCurrency = (type: string, currency: string, enabled: boolean) => {
    const currentConfig = allowedWalletTypes[type] || { enabled: true, currencies: [] };
    const newCurrencies = enabled
      ? [...currentConfig.currencies, currency]
      : currentConfig.currencies.filter((c) => c !== currency);

    if (newCurrencies.length === 0) {
      const newTypes = { ...allowedWalletTypes };
      delete newTypes[type];
      setAllowedWalletTypes(newTypes);
    } else {
      setAllowedWalletTypes({
        ...allowedWalletTypes,
        [type]: {
          enabled: true,
          currencies: newCurrencies,
        },
      });
    }
  };

  const isFieldLocked = (field: keyof ApiKeyFormData | "name") => lockedFields.includes(field);

  const enabledGlobalTypes = Object.entries(globalWalletTypes).filter(
    ([_, config]) => config.enabled && config.currencies?.length > 0
  );

  const hasFullAccess = permissions.includes("*");
  const selectedPermissionCount = hasFullAccess ? AVAILABLE_PERMISSIONS.length : permissions.length;
  const selectedWalletCount = Object.keys(allowedWalletTypes).length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border">
        <div className={`p-3 rounded-xl ${keyMode === "LIVE" ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
          <Key className={`h-6 w-6 ${keyMode === "LIVE" ? "text-emerald-600" : "text-amber-600"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              {mode === "create" ? "New API Key" : "Edit API Key"}
            </h3>
            <Badge variant={keyMode === "LIVE" ? "default" : "secondary"} className="text-xs">
              {keyMode}
            </Badge>
            {keyType && (
              <Badge variant="outline" className="text-xs">
                {keyType}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Configure your API key settings. Both public and secret keys will be generated."
              : "Update your API key configuration. Changes apply to both paired keys."
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
            {(selectedPermissionCount > 0 || ipWhitelist.length > 0) && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {ipWhitelist.length > 0 ? ipWhitelist.length : ""}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
            {selectedWalletCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selectedWalletCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">URLs</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("key_details")}</CardTitle>
              <CardDescription>
                {t("basic_information_about_your_api_key")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name">{t("key_name")}</Label>
                  {isFieldLocked("name") && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </div>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e_g_production_woocommerce_my_app")}
                  disabled={isFieldLocked("name")}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  {t("a_descriptive_name_to_help_you")}
                </p>
              </div>

              {mode === "create" && (
                <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{t("what_gets_created")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("two_keys_will_be_generated_a")} <strong>{t("public_key")}</strong> (pk_*) {t("pk_for_client_side_use_and_a")} <strong>{t("secret_key")}</strong> (sk_*) {t("sk_for_server_side_operations_both")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          {/* Permissions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permissions
                  </CardTitle>
                  <CardDescription>
                    {t("control_what_actions_this_api_key_can_perform")}
                  </CardDescription>
                </div>
                <Badge variant={hasFullAccess ? "default" : "secondary"}>
                  {hasFullAccess ? "Full Access" : `${selectedPermissionCount} selected`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  hasFullAccess
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/20"
                }`}
                onClick={() => setPermissions(hasFullAccess ? [] : ["*"])}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${hasFullAccess ? "bg-primary/10" : "bg-muted"}`}>
                    <CheckCircle2 className={`h-5 w-5 ${hasFullAccess ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">{t("full_access")}</p>
                    <p className="text-sm text-muted-foreground">{t("grant_all_permissions_to_this_api_key")}</p>
                  </div>
                </div>
                <Switch checked={hasFullAccess} />
              </div>

              {!hasFullAccess && (
                <>
                  <Separator />
                  <div className="grid gap-3">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isSelected = permissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary/50 bg-primary/5"
                              : "border-muted hover:border-muted-foreground/20"
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setPermissions(permissions.filter((p) => p !== perm.id));
                            } else {
                              setPermissions([...permissions, perm.id]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{perm.label}</p>
                                {perm.secretOnly && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="text-xs">
                                          {t("secret_only")}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t("this_permission_only_works_with_secret_keys_sk")} (sk_*)</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* IP Whitelist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    IP Whitelist
                  </CardTitle>
                  <CardDescription>
                    {t("restrict_api_access_to_specific_ip")}
                  </CardDescription>
                </div>
                {ipWhitelist.length > 0 && (
                  <Badge variant="secondary">{ipWhitelist.length} IPs</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`${t("enter_ip_address_or_cidr")} (${t("enter_ip_address_or_cidr_e")})`}
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIp();
                    }
                  }}
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={addIp}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {ipWhitelist.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ipWhitelist.map((ip, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1.5 text-sm font-mono gap-2"
                    >
                      {ip}
                      <button
                        type="button"
                        className="hover:text-destructive transition-colors"
                        onClick={() => removeIp(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-600">{t("no_ip_restrictions")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("your_secret_key_can_be_used")}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t("supports_ipv4_ipv6_and_cidr_notation_use")} <code className="bg-muted px-1 rounded">*</code> {t("to_explicitly_allow_all_ips")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    {t("accepted_payment_methods")}
                  </CardTitle>
                  <CardDescription>
                    {t("choose_which_wallet_types_and_currencies")}
                  </CardDescription>
                </div>
                <Badge variant={selectedWalletCount === 0 ? "default" : "secondary"}>
                  {selectedWalletCount === 0 ? "All Enabled" : `${selectedWalletCount} selected`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : enabledGlobalTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("no_payment_methods_configured")}</p>
                  <p className="text-sm">{t("contact_admin_to_enable_payment_methods")}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("leave_all_unselected_to_accept_all")}
                  </p>
                  <div className="grid gap-4">
                    {enabledGlobalTypes.map(([type, globalConfig]) => {
                      const isTypeEnabled = !!allowedWalletTypes[type];
                      const selectedCurrencies = allowedWalletTypes[type]?.currencies || [];
                      const walletConfig = WALLET_TYPE_CONFIG[type] || {
                        label: type,
                        icon: Wallet,
                        description: "",
                        color: "bg-muted text-muted-foreground",
                      };
                      const WalletIcon = walletConfig.icon;

                      return (
                        <div key={type} className="border rounded-xl overflow-hidden">
                          {/* Wallet Type Header */}
                          <div
                            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                              isTypeEnabled ? "bg-primary/5" : "hover:bg-muted/50"
                            }`}
                            onClick={() => toggleWalletType(type, !isTypeEnabled)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl border ${walletConfig.color}`}>
                                <WalletIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{walletConfig.label}</p>
                                  {isTypeEnabled && selectedCurrencies.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {selectedCurrencies.length} of {globalConfig.currencies?.length}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{walletConfig.description}</p>
                              </div>
                            </div>
                            <Switch checked={isTypeEnabled} />
                          </div>

                          {/* Currencies */}
                          {isTypeEnabled && globalConfig.currencies && globalConfig.currencies.length > 0 && (
                            <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium">{t("select_currencies")}</p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAllowedWalletTypes({
                                        ...allowedWalletTypes,
                                        [type]: {
                                          enabled: true,
                                          currencies: [...globalConfig.currencies],
                                        },
                                      });
                                    }}
                                  >
                                    {tCommon("select_all")}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newTypes = { ...allowedWalletTypes };
                                      delete newTypes[type];
                                      setAllowedWalletTypes(newTypes);
                                    }}
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {globalConfig.currencies.map((currency: string) => {
                                  const isSelected = selectedCurrencies.includes(currency);
                                  return (
                                    <button
                                      key={currency}
                                      type="button"
                                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-background hover:bg-muted border-muted-foreground/20"
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCurrency(type, currency, !isSelected);
                                      }}
                                    >
                                      {currency}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* URLs Tab */}
        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {t("redirect_urls")}
              </CardTitle>
              <CardDescription>
                {t("where_to_send_customers_after_payment")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="successUrl">{t("success_url")}</Label>
                <Input
                  id="successUrl"
                  type="url"
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                  placeholder="https://yoursite.com/payment/success"
                  className="h-11 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("customers_are_redirected_here_after_successful")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancelUrl">{t("cancel_url")}</Label>
                <Input
                  id="cancelUrl"
                  type="url"
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                  placeholder="https://yoursite.com/payment/cancel"
                  className="h-11 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("customers_are_redirected_here_if_they")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("webhook_url")}</CardTitle>
              <CardDescription>
                {t("receive_real_time_notifications_about_payment")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">{t("webhook_endpoint")}</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yoursite.com/webhooks/gateway"
                  className="h-11 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("well_send_post_requests_with_event")}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                <p className="text-sm font-medium mb-2">{t("webhook_events")}:</p>
                <div className="flex flex-wrap gap-2">
                  {["payment.completed", "payment.failed", "payment.expired", "refund.completed"].map((event) => (
                    <Badge key={event} variant="outline" className="font-mono text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (mode === "create" && !name.trim())}
          className="min-w-[140px]"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel || (mode === "create" ? "Create API Key" : "Save Changes")}
        </Button>
      </div>
    </div>
  );
}
