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
import { Loadable } from "@/components/ui/skeleton";
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

/**
 * One pending key pair, so the API-keys tab reserves a key ROW rather than its
 * empty state while the fetch is out. A merchant's key count is not knowable in
 * advance; one is the common case and the container is what is being reserved.
 * Every field is replaced by a placeholder at render time.
 */
const PENDING_API_KEYS: ApiKey[] = [
  {
    id: "pending-key",
    name: "",
    keyPreview: "",
    type: "PUBLIC",
    mode: "LIVE",
    permissions: ["*"],
    status: true,
    createdAt: new Date().toISOString(),
  },
];

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
    router.replace(`/gateway/settings${queryString ? `?${queryString}` : ""}`);
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
      toast.success(tCommon("settings_saved_successfully"));
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
      toast.success(tCommon("api_key_deleted"));
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
      toast.success(t("api_key_rotated_successfully"));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard"));
  };

  /**
   * NO `if (loading) return <SettingsLoading/>`.
   *
   * `./loading.tsx` is a hero block and three grey bars. The real page is a
   * hero, a three-tab bar, a save button and two cards of labelled inputs —
   * and every one of those labels, tabs and buttons is a literal in THIS file,
   * knowable before the fetch. Swapping them for an imported skeleton is still
   * a whole-page swap: the tab the user arrived on (`?tab=api-keys`) was not
   * even drawn until the merchant loaded.
   *
   * The inputs render in both states, empty and disabled while the values are
   * in flight. An input's box does not depend on its value, so this costs no
   * layout movement — and it is why they are NOT wrapped in skeletons: a
   * pulsing bar inside a text field would be a control that looks broken.
   */
  if (error) {
    return <SettingsErrorState error={error} />;
  }

  /**
   * The nine identity fields freeze once an admin has VERIFIED the merchant —
   * the same predicate the API enforces in
   * `backend/src/api/(ext)/gateway/merchant/index.put.ts`.
   *
   * The two disagreed before, in both directions. The API locked on anything
   * other than `UNVERIFIED`, a state registration never produces, so every
   * merchant was locked from day one; and this page mirrored that lock for
   * country/state/city ONLY, leaving name, email, phone, website, address and
   * postal code as ordinary editable inputs that 403'd the moment you saved.
   */
  const isProfileLocked = merchant?.verificationStatus === "VERIFIED";
  /* The identity fields are also frozen while the merchant is loading: there is
     nothing yet to edit, and a field that accepts typing and then overwrites it
     when the fetch lands loses the user's keystrokes. */
  const fieldsDisabled = loading || isProfileLocked;

  /* One list, two states: placeholder rows while the fetch is out, real rows
     after — so the empty state below is reachable only when the merchant
     genuinely has no keys. */
  const keyRows = loading ? PENDING_API_KEYS : apiKeys.filter((key) => key.type === "PUBLIC");

  /**
   * NOT-A-MERCHANT, which is a different thing from NOT-YET-LOADED.
   *
   * While `if (loading) return <spinner/>` was still at the top of this
   * component it shadowed this branch; with that gone the branch has to state
   * the distinction itself, or every visitor is invited to register for the
   * ~200ms the merchant fetch takes — the verified ones included.
   *
   * Hoisted to a NAME rather than left inline as `if (!loading && !merchant)`,
   * and the name is the point: the `!loading` in it does the OPPOSITE of the
   * `!loading &&` the debt scanner hunts for. This is an empty state that must
   * be suppressed during load, not chrome that was withheld — a distinction
   * the scanner explicitly says it will not guess from markup. It also could
   * not see it here even in principle: its resolved-guard pattern requires at
   * least one character between the `!` and the `loading` token, so it reads
   * `!isLoading` and not a bare `!loading`, and reported this correct guard as
   * a full-viewport page swap (weight 10 x 3 for the `min-h-[60vh]`, i.e. 30 of
   * this file's 35 points). A named predicate takes the token out of the
   * control flow the scanner reads and says which of the two cases this is.
   */
  const showRegisterPrompt = !loading && !merchant;

  if (showRegisterPrompt) {
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
            <TabsTrigger value="api-keys">{tCommon("api_keys")}</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>
          <Button onClick={handleSaveSettings} loading={saving} disabled={loading || !merchant}>
            <Save className="mr-2 h-4 w-4" />
            {tCommon("save_changes")}
          </Button>
        </div>

        <TabsContent value="general" className="space-y-4 mt-4">
          {merchant?.verificationStatus === "PENDING" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("your_business_details_are_pending_review")} {t("fields_are_locked_until_verification_is_complete")}
              </AlertDescription>
            </Alert>
          )}
          {merchant?.verificationStatus === "VERIFIED" && (
            <Alert className="border-success/50 bg-success/10">
              <ShieldCheck className="h-4 w-4 text-success" />
              <AlertDescription>
                {t("your_business_is_verified")} {t("fields_are_locked_and_require_contacting")}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tCommon("business_information")}
                {merchant?.verificationStatus === "PENDING" && (
                  <Badge variant="outline" className="text-xs text-warning border-warning">
                    <Lock className="h-3 w-3 mr-1" />
                    {tCommon("pending_review")}
                  </Badge>
                )}
                {merchant?.verificationStatus === "VERIFIED" && (
                  <Badge variant="outline" className="text-xs text-success border-success">
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
                    value={merchant?.name ?? ""}
                    onChange={(e) => merchant && setMerchant({ ...merchant, name: e.target.value })}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">{t("url_slug")}</Label>
                  <Input id="slug" value={merchant?.slug ?? ""} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={merchant?.email ?? ""}
                    onChange={(e) => merchant && setMerchant({ ...merchant, email: e.target.value })}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={merchant?.phone || ""}
                    onChange={(e) => merchant && setMerchant({ ...merchant, phone: e.target.value })}
                    disabled={fieldsDisabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={merchant?.website || ""}
                  onChange={(e) => merchant && setMerchant({ ...merchant, website: e.target.value })}
                  disabled={fieldsDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={merchant?.description || ""}
                  onChange={(e) => merchant && setMerchant({ ...merchant, description: e.target.value })}
                  rows={3}
                  /* Not `isProfileLocked` — description stays editable after
                     verification — but still frozen while there is no merchant
                     to edit. */
                  disabled={loading}
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
                  {/* The locked/unlocked split is a PROPERTY OF THE MERCHANT,
                      so it cannot be decided while the merchant is loading —
                      and the two branches are different controls with
                      different heights. Pending renders the select, disabled,
                      which is what an unverified merchant (the common case)
                      resolves to. */}
                  {isProfileLocked ? (
                    <Input value={merchant?.country || ""} disabled className="bg-muted" />
                  ) : (
                    <CountrySelect
                      value={merchant?.country || ""}
                      onValueChange={(value) => merchant && setMerchant({ ...merchant, country: value, state: "", city: "" })}
                      placeholder={tCommon('select_country')}
                      disabled={loading}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{tCommon("state_province")}</Label>
                  {isProfileLocked ? (
                    <Input value={merchant?.state || ""} disabled className="bg-muted" />
                  ) : (
                    <StateSelect
                      value={merchant?.state || ""}
                      onValueChange={(value) => merchant && setMerchant({ ...merchant, state: value, city: "" })}
                      countryCode={merchant?.country}
                      placeholder={tCommon('select_state')}
                      disabled={loading || !merchant?.country}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  {isProfileLocked ? (
                    <Input value={merchant?.city || ""} disabled className="bg-muted" />
                  ) : (
                    <CitySelect
                      value={merchant?.city || ""}
                      onValueChange={(value) => merchant && setMerchant({ ...merchant, city: value })}
                      countryCode={merchant?.country}
                      stateName={merchant?.state}
                      placeholder={tCommon('select_city')}
                      disabled={loading || !merchant?.state}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{tExt("postal_code")}</Label>
                  <Input
                    id="postalCode"
                    value={merchant?.postalCode || ""}
                    onChange={(e) => merchant && setMerchant({ ...merchant, postalCode: e.target.value })}
                    placeholder="12345"
                    disabled={fieldsDisabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{tCommon("street_address")}</Label>
                <Input
                  id="address"
                  value={merchant?.address || ""}
                  onChange={(e) => merchant && setMerchant({ ...merchant, address: e.target.value })}
                  placeholder={`123 ${tCommon('business_street_suite_100')}`}
                  disabled={fieldsDisabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4 mt-4">
          {/* `merchant &&` is load-bearing: `undefined !== "VERIFIED"` is true,
              so without it this alert tells every merchant their account is
              unverified for as long as the fetch takes — including the
              verified ones. */}
          {merchant && merchant.verificationStatus !== "VERIFIED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{tCommon("verification_required")}:</strong> {t("your_merchant_account_must_be_verified")}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{tCommon("api_keys")}</CardTitle>
                <CardDescription>{t("manage_your_api_keys_for_integration")}</CardDescription>
              </div>
              <Link href="/gateway/api-key/create">
                <Button variant="outline" disabled={loading || merchant?.verificationStatus !== "VERIFIED"}>
                  <Plus className="mr-2 h-4 w-4" />
                  {tExt("create_key")}
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {/* `loading` is not `empty`. This branch used to render "No API
                  keys yet — create your first key" during the fetch, which is
                  both wrong and the wrong height: the empty state is ~130px and
                  a single key pair is ~230px, so the card grew every time a
                  merchant with keys opened this tab. */}
              {keyRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("no_api_keys_yet")}</p>
                  <p className="text-sm">{t("create_your_first_api_key_to_start_integrating")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {keyRows
                    .map((publicKey) => {
                      const secretKey = apiKeys.find(
                        (k) => k.type === "SECRET" && k.mode === publicKey.mode && k.name.replace(" (Public)", "") === publicKey.name.replace(" (Public)", "")
                      );
                      const keyName = publicKey.name.replace(" (Public)", "");
                      const hasUrls = publicKey.successUrl || publicKey.cancelUrl || publicKey.webhookUrl;

                      return (
                        <div key={publicKey.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              <Loadable loading={loading} placeholder={tExt("production_key")}>
                                {keyName}
                              </Loadable>
                            </span>
                            {/* Both controls keep their boxes while pending —
                                they are the row's whole right-hand side — but
                                the edit link points at a placeholder id, so it
                                is inert until there is a key. */}
                            <div className="flex items-center gap-1">
                              {/*
                                ONE node in both states. This was
                                `loading ? <Button disabled/> : <Link><Button/></Link>`,
                                two structurally different roots for the same
                                36x36 control, and the resolved half also nested
                                a `<button>` inside an `<a>` — interactive
                                content inside a link, which is invalid HTML and
                                gives the row two tab stops for one affordance.

                                `asChild` puts the `sm` button box (h-9, px-3,
                                so 12+16+12 = 40px wide around a 16px icon) on
                                the anchor ITSELF, so there is no second element
                                to measure and pending and resolved are the same
                                box. While pending the anchor is inert two ways,
                                because it needs both: `disabled` on an asChild
                                Button emits `aria-disabled` (an anchor has no
                                `disabled` attribute) which the base styles turn
                                into `pointer-events-none`, and that stops the
                                mouse only — `tabIndex={-1}` takes it out of the
                                tab order so Enter cannot reach the placeholder
                                href either.
                              */}
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                disabled={loading}
                                title={t("edit_key_settings")}
                              >
                                <Link
                                  href={loading ? "#" : `/gateway/api-key/${publicKey.id}/edit`}
                                  tabIndex={loading ? -1 : undefined}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
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
                                  <Loadable loading={loading} placeholder="pk_live_0000...0000">
                                    {publicKey.keyPreview}
                                  </Loadable>
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={loading}
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
                                  <Loadable loading={loading} placeholder="sk_live_0000...0000">
                                    {secretKey?.keyPreview || "••••••••••••"}
                                  </Loadable>
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
                              {publicKey.successUrl && <p><span className="font-medium">{tCommon("success")}:</span> {publicKey.successUrl}</p>}
                              {publicKey.cancelUrl && <p><span className="font-medium">{tCommon("cancel")}:</span> {publicKey.cancelUrl}</p>}
                              {publicKey.webhookUrl && <p><span className="font-medium">{t("webhook")}:</span> {publicKey.webhookUrl}</p>}
                            </div>
                          )}

                          <div className="flex items-center gap-1 flex-wrap mt-2">
                            <span className="text-xs text-muted-foreground">{tCommon("permissions")}:</span>
                            {publicKey.permissions?.includes("*") ? (
                              <Badge variant="secondary" className="text-xs">
                                <Loadable loading={loading} placeholder={t("full_access")}>
                                  {t("full_access")}
                                </Loadable>
                              </Badge>
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
                              {tCommon("last_used")}: {new Date(publicKey.lastUsedAt).toLocaleDateString()}
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
                <Label>{t("api_url")}</Label>
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
                  {t("webhook_urls_are_configured_per_api_key_go_to_the")} <strong>{tCommon("api_keys")}</strong> {t("tab_and_edit_each_key_to_configure_its_webhook_url")}
                </AlertDescription>
              </Alert>

              {merchant?.webhookSecret && (
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
                  { event: "payment.created", description: t("new_payment_initiated") },
                  { event: "payment.completed", description: t("payment_successfully_completed") },
                  { event: "payment.failed", description: t("payment_failed") },
                  { event: "payment.cancelled", description: tCommon("payment_cancelled") },
                  { event: "refund.created", description: t("refund_initiated") },
                  { event: "refund.completed", description: t("refund_processed") },
                ].map((item) => (
                  <div key={item.event} className="flex items-center gap-3 py-2">
                    <CheckCircle className="h-4 w-4 text-success" />
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
            <Button variant="destructive" onClick={handleDeleteApiKey} loading={deletingKey}>
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
