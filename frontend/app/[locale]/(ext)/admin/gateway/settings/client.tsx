"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Save,
  Settings,
  DollarSign,
  Shield,
  Clock,
  Wallet,
  Coins,
  AlertCircle,
  Info,
  Search,
  ChevronDown,
  Palette,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import $fetch from "@/lib/api";
import { useTranslations } from "next-intl";

interface WalletTypeConfig {
  value: string;
  label: string;
  enabled: boolean;
  currencies: Array<{ value: string; label: string; icon?: string }>;
}

interface CurrencyOptions {
  walletTypes: WalletTypeConfig[];
  systemSettings: {
    kycEnabled: boolean;
  };
}

// Structure: { walletType: { enabled: boolean, currencies: string[] } }
interface AllowedWalletTypes {
  [walletType: string]: {
    enabled: boolean;
    currencies: string[];
  };
}

interface GatewaySettings {
  gatewayEnabled: boolean;
  gatewayTestMode: boolean;
  // Fee settings (in USD)
  gatewayFeePercentage: number;
  gatewayFeeFixed: number;
  // Limits (in USD)
  gatewayMinPaymentAmount: number;
  gatewayMaxPaymentAmount: number;
  gatewayDailyLimit: number;
  gatewayMonthlyLimit: number;
  // Payout settings
  gatewayMinPayoutAmount: number;
  gatewayPayoutSchedule: string;
  // Allowed wallet types and currencies
  gatewayAllowedWalletTypes: AllowedWalletTypes;
  // Security
  gatewayRequireKyc: boolean;
  gatewayAutoApproveVerified: boolean;
  // Payment session
  gatewayPaymentExpirationMinutes: number;
  // Webhooks
  gatewayWebhookRetryAttempts: number;
  gatewayWebhookRetryDelaySeconds: number;
  // Checkout Design
  gatewayCheckoutDesign: string;
}

const defaultSettings: GatewaySettings = {
  gatewayEnabled: true,
  gatewayTestMode: false,
  gatewayFeePercentage: 2.9,
  gatewayFeeFixed: 0.3,
  gatewayMinPaymentAmount: 1,
  gatewayMaxPaymentAmount: 10000,
  gatewayDailyLimit: 50000,
  gatewayMonthlyLimit: 500000,
  gatewayMinPayoutAmount: 50,
  gatewayPayoutSchedule: "DAILY",
  gatewayAllowedWalletTypes: {},
  gatewayRequireKyc: true,
  gatewayAutoApproveVerified: false,
  gatewayPaymentExpirationMinutes: 30,
  gatewayWebhookRetryAttempts: 3,
  gatewayWebhookRetryDelaySeconds: 60,
  gatewayCheckoutDesign: "v2",
};

export default function AdminGatewaySettingsPage() {
  const t = useTranslations("ext");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GatewaySettings>(defaultSettings);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOptions | null>(null);
  const [currencySearch, setCurrencySearch] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch both settings and currency options in parallel
      const [settingsRes, currenciesRes] = await Promise.all([
        $fetch({ url: "/api/admin/gateway/settings", silent: true }),
        $fetch({ url: "/api/admin/gateway/currencies", silent: true }),
      ]);

      if (!settingsRes.error && settingsRes.data) {
        setSettings({
          ...defaultSettings,
          ...settingsRes.data,
        });
      }

      if (!currenciesRes.error && currenciesRes.data) {
        setCurrencyOptions(currenciesRes.data);

        // Initialize allowed wallet types if empty
        if (
          !settingsRes.data?.gatewayAllowedWalletTypes ||
          Object.keys(settingsRes.data.gatewayAllowedWalletTypes).length === 0
        ) {
          const defaultAllowed: AllowedWalletTypes = {};
          currenciesRes.data.walletTypes.forEach((wt: WalletTypeConfig) => {
            defaultAllowed[wt.value] = {
              enabled: wt.value === "FIAT", // Enable FIAT by default
              currencies: wt.value === "FIAT" ? wt.currencies.slice(0, 3).map((c) => c.value) : [],
            };
          });
          setSettings((prev) => ({
            ...prev,
            gatewayAllowedWalletTypes: defaultAllowed,
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await $fetch({
      url: "/api/admin/gateway/settings",
      method: "PUT",
      body: settings,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved successfully");
    }
    setSaving(false);
  };

  const updateSetting = <K extends keyof GatewaySettings>(
    key: K,
    value: GatewaySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleWalletType = (walletType: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      gatewayAllowedWalletTypes: {
        ...prev.gatewayAllowedWalletTypes,
        [walletType]: {
          ...prev.gatewayAllowedWalletTypes[walletType],
          enabled,
          currencies: enabled
            ? prev.gatewayAllowedWalletTypes[walletType]?.currencies || []
            : [],
        },
      },
    }));
  };

  const toggleCurrency = (walletType: string, currency: string, enabled: boolean) => {
    setSettings((prev) => {
      const currentCurrencies =
        prev.gatewayAllowedWalletTypes[walletType]?.currencies || [];
      const newCurrencies = enabled
        ? [...currentCurrencies, currency]
        : currentCurrencies.filter((c) => c !== currency);

      return {
        ...prev,
        gatewayAllowedWalletTypes: {
          ...prev.gatewayAllowedWalletTypes,
          [walletType]: {
            ...prev.gatewayAllowedWalletTypes[walletType],
            currencies: newCurrencies,
          },
        },
      };
    });
  };

  const selectAllCurrencies = (walletType: string) => {
    const wt = currencyOptions?.walletTypes.find((w) => w.value === walletType);
    if (!wt) return;

    setSettings((prev) => ({
      ...prev,
      gatewayAllowedWalletTypes: {
        ...prev.gatewayAllowedWalletTypes,
        [walletType]: {
          ...prev.gatewayAllowedWalletTypes[walletType],
          currencies: wt.currencies.map((c) => c.value),
        },
      },
    }));
  };

  const deselectAllCurrencies = (walletType: string) => {
    setSettings((prev) => ({
      ...prev,
      gatewayAllowedWalletTypes: {
        ...prev.gatewayAllowedWalletTypes,
        [walletType]: {
          ...prev.gatewayAllowedWalletTypes[walletType],
          currencies: [],
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const kycEnabled = currencyOptions?.systemSettings?.kycEnabled ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("gateway_settings")}</h1>
          <p className="text-muted-foreground">
            {t("configure_payment_gateway_settings_and_defaults")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/gateway/settings/design">
            <Button variant="outline">
              <Palette className="mr-2 h-4 w-4" />
              Design
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t("save_changes")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="fees">{t("fees_&_limits")}</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("general_settings")}
              </CardTitle>
              <CardDescription>{t("basic_gateway_configuration_options")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("enable_gateway")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("allow_merchants_to_register_and_accept_payments")}
                  </p>
                </div>
                <Switch
                  checked={settings.gatewayEnabled}
                  onCheckedChange={(checked) => updateSetting("gatewayEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("global_test_mode")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("force_all_transactions_to_be_in_test_mode")}
                  </p>
                </div>
                <Switch
                  checked={settings.gatewayTestMode}
                  onCheckedChange={(checked) => updateSetting("gatewayTestMode", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">{t("payment_expiration_minutes")}</Label>
                <Input
                  id="expiration"
                  type="number"
                  className="max-w-xs"
                  value={settings.gatewayPaymentExpirationMinutes}
                  onChange={(e) =>
                    updateSetting(
                      "gatewayPaymentExpirationMinutes",
                      parseInt(e.target.value) || 30
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("how_long_before_unpaid_payment_sessions_expire")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payoutSchedule">{t("payout_schedule")}</Label>
                <Select
                  value={settings.gatewayPayoutSchedule}
                  onValueChange={(value) => updateSetting("gatewayPayoutSchedule", value)}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSTANT">Instant</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="MANUAL">{t("manual_only")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("default_payout_schedule_for_new_merchants")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t("supported_wallet_types_currencies")}
              </CardTitle>
              <CardDescription>
                {t("select_which_wallet_types_and_currencies")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t("merchants_will_receive_the_specified_currency")} {t("fees_are_calculated_in_usd_and")}
                </AlertDescription>
              </Alert>

              {currencyOptions?.walletTypes && currencyOptions.walletTypes.length > 0 ? (
                <Accordion type="multiple" className="space-y-3">
                  {currencyOptions.walletTypes.map((wt) => {
                    const wtConfig = settings.gatewayAllowedWalletTypes[wt.value] || {
                      enabled: false,
                      currencies: [],
                    };
                    const selectedCount = wtConfig.currencies?.length || 0;

                    return (
                      <AccordionItem
                        key={wt.value}
                        value={wt.value}
                        className="border rounded-lg group last:border-b"
                      >
                        <div className="flex items-center gap-4 px-4 py-4">
                          <Switch
                            checked={wtConfig.enabled}
                            onCheckedChange={(checked) => toggleWalletType(wt.value, checked)}
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                              <Coins className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{wt.label} Wallet</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>{wt.currencies.length} {t("currencies_available")}</span>
                                {selectedCount > 0 && (
                                  <Badge variant="secondary">
                                    {selectedCount} selected
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>
                          <AccordionTrigger className="hover:no-underline p-0 shrink-0 [&>svg]:hidden">
                            <div className="h-9 w-9 flex items-center justify-center rounded-md border hover:bg-muted transition-colors cursor-pointer">
                              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                          </AccordionTrigger>
                        </div>
                        <AccordionContent className="px-4">
                          {wtConfig.enabled ? (
                            <div className="pb-4 space-y-4">
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder={`Search ${wt.label.toLowerCase()} currencies...`}
                                    className="pl-9"
                                    value={currencySearch[wt.value] || ""}
                                    onChange={(e) =>
                                      setCurrencySearch((prev) => ({
                                        ...prev,
                                        [wt.value]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectAllCurrencies(wt.value)}
                                  >
                                    {t("select_all")}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deselectAllCurrencies(wt.value)}
                                  >
                                    {t("deselect_all")}
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {wt.currencies
                                  .filter((currency) => {
                                    const search = (currencySearch[wt.value] || "").toLowerCase();
                                    if (!search) return true;
                                    return (
                                      currency.value.toLowerCase().includes(search) ||
                                      currency.label.toLowerCase().includes(search)
                                    );
                                  })
                                  .map((currency) => (
                                    <div
                                      key={currency.value}
                                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        wtConfig.currencies?.includes(currency.value)
                                          ? "border-primary bg-primary/5"
                                          : "hover:border-muted-foreground/50"
                                      }`}
                                      onClick={() =>
                                        toggleCurrency(
                                          wt.value,
                                          currency.value,
                                          !wtConfig.currencies?.includes(currency.value)
                                        )
                                      }
                                    >
                                      <Checkbox
                                        checked={wtConfig.currencies?.includes(currency.value)}
                                        onCheckedChange={(checked) =>
                                          toggleCurrency(wt.value, currency.value, !!checked)
                                        }
                                      />
                                      <span className="text-sm font-medium">{currency.value}</span>
                                    </div>
                                  ))}
                              </div>
                              {wt.currencies.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  {t("no_currencies_available_for_this_wallet_type")}
                                </p>
                              )}
                              {wt.currencies.length > 0 &&
                                currencySearch[wt.value] &&
                                wt.currencies.filter((c) => {
                                  const search = currencySearch[wt.value].toLowerCase();
                                  return (
                                    c.value.toLowerCase().includes(search) ||
                                    c.label.toLowerCase().includes(search)
                                  );
                                }).length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    {t("no_currencies_match")}{currencySearch[wt.value]}"
                                  </p>
                                )}
                            </div>
                          ) : (
                            <p className="pb-4 text-sm text-muted-foreground">
                              {t("enable_this_wallet_type_to_select_currencies")}
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("no_wallet_types_available")}</p>
                  <p className="text-sm">
                    {t("enable_wallet_types_in_system_settings_first")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4 mt-4">
          <Alert className="mb-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("all_fees_and_limits_are_set_in_usd")} {t("they_will_be_automatically_converted_to")}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("fee_configuration")}
              </CardTitle>
              <CardDescription>
                {t("default_fees_for_all_transactions_set")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feePercentage">{t("fee_percentage")}</Label>
                  <Input
                    id="feePercentage"
                    type="number"
                    step="0.1"
                    value={settings.gatewayFeePercentage}
                    onChange={(e) =>
                      updateSetting("gatewayFeePercentage", parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("percentage_of_transaction_amount")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeFixed">{t("fixed_fee_usd")}</Label>
                  <Input
                    id="feeFixed"
                    type="number"
                    step="0.01"
                    value={settings.gatewayFeeFixed}
                    onChange={(e) =>
                      updateSetting("gatewayFeeFixed", parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("fixed_amount_per_transaction_converted_to")}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">{t("example_fee_calculation")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("for_a_100_payment")}: {settings.gatewayFeePercentage}% + $
                  {settings.gatewayFeeFixed.toFixed(2)} ={" "}
                  <span className="font-medium text-foreground">
                    ${(100 * (settings.gatewayFeePercentage / 100) + settings.gatewayFeeFixed).toFixed(2)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("transaction_limits_in_usd")}</CardTitle>
              <CardDescription>
                {t("limits_are_evaluated_in_usd_equivalent")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPayment">{t("minimum_payment")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="minPayment"
                      type="number"
                      step="0.01"
                      className="pl-7"
                      value={settings.gatewayMinPaymentAmount}
                      onChange={(e) =>
                        updateSetting("gatewayMinPaymentAmount", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPayment">{t("maximum_payment")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="maxPayment"
                      type="number"
                      step="1"
                      className="pl-7"
                      value={settings.gatewayMaxPaymentAmount}
                      onChange={(e) =>
                        updateSetting("gatewayMaxPaymentAmount", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">{t("daily_limit_per_merchant")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="dailyLimit"
                      type="number"
                      step="1"
                      className="pl-7"
                      value={settings.gatewayDailyLimit}
                      onChange={(e) =>
                        updateSetting("gatewayDailyLimit", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyLimit">{t("monthly_limit_per_merchant")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="monthlyLimit"
                      type="number"
                      step="1"
                      className="pl-7"
                      value={settings.gatewayMonthlyLimit}
                      onChange={(e) =>
                        updateSetting("gatewayMonthlyLimit", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="minPayout">{t("minimum_payout_amount")}</Label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="minPayout"
                    type="number"
                    step="1"
                    className="pl-7"
                    value={settings.gatewayMinPayoutAmount}
                    onChange={(e) =>
                      updateSetting("gatewayMinPayoutAmount", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("minimum_balance_required_before_payouts_are")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("security_verification")}
              </CardTitle>
              <CardDescription>{t("merchant_verification_and_approval_settings")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{t("require_kyc_for_merchants")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("merchants_must_complete_kyc_verification_before")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!kycEnabled && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      KYC Disabled System-wide
                    </Badge>
                  )}
                  <Switch
                    checked={settings.gatewayRequireKyc}
                    disabled={!kycEnabled}
                    onCheckedChange={(checked) => updateSetting("gatewayRequireKyc", checked)}
                  />
                </div>
              </div>

              {!kycEnabled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    KYC is currently disabled in system settings. Enable it first to require KYC
                    for merchants.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("auto_approve_verified_merchants")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("automatically_approve_merchants_who_pass_kyc")}
                  </p>
                </div>
                <Switch
                  checked={settings.gatewayAutoApproveVerified}
                  disabled={!settings.gatewayRequireKyc}
                  onCheckedChange={(checked) =>
                    updateSetting("gatewayAutoApproveVerified", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("webhook_configuration")}
              </CardTitle>
              <CardDescription>{t("configure_webhook_retry_behavior")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retryAttempts">{t("retry_attempts")}</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    value={settings.gatewayWebhookRetryAttempts}
                    onChange={(e) =>
                      updateSetting("gatewayWebhookRetryAttempts", parseInt(e.target.value) || 3)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("number_of_times_to_retry_failed_webhook_deliveries")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retryDelay">{t("retry_delay_seconds")}</Label>
                  <Input
                    id="retryDelay"
                    type="number"
                    value={settings.gatewayWebhookRetryDelaySeconds}
                    onChange={(e) =>
                      updateSetting(
                        "gatewayWebhookRetryDelaySeconds",
                        parseInt(e.target.value) || 60
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("time_to_wait_between_retry_attempts")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
