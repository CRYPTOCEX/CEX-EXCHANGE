"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Hash,
  Key,
  Link2,
  Mail,
  MapPin,
  MoreVertical,
  Percent,
  Phone,
  RefreshCcw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  TestTube,
  TrendingUp,
  User,
  Wallet,
  XCircle,
  AlertCircle,
  Ban,
  Play,
  Zap,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { statusTone } from "@/lib/status-tone";
import { toast } from "sonner";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { MoneyFigure } from "@/components/ui/money-figure";
import { formatCurrencyAuto } from "@/utils/currency";
import { useTranslations } from "next-intl";

interface AllowedWalletTypesConfig {
  [walletType: string]: {
    enabled: boolean;
    currencies: string[];
  };
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastFourChars: string;
  type: string;
  mode: string;
  permissions: string[];
  ipWhitelist?: string[];
  allowedWalletTypes?: AllowedWalletTypesConfig;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  status: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface MerchantBalance {
  id: string;
  currency: string;
  walletType: string;
  available: number;
  pending: number;
  reserved: number;
  totalReceived: number;
  totalRefunded: number;
  totalFees: number;
  totalPaidOut: number;
}

interface MerchantUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
}

interface MerchantStats {
  paymentCount: number;
  refundCount: number;
  payoutCount: number;
  /** Converted per currency, then summed. A real dollar figure. */
  totalVolumeUSD?: number | null;
  totalPaidOutUSD?: number | null;
  /** The native breakdown the totals were built from, for the caption. */
  volumeByCurrency?: Record<string, number>;
  paidOutByCurrency?: Record<string, number>;
  /** Held in a currency with no rate — excluded, so the totals are a lower bound. */
  unpricedCurrencies?: string[];
}

interface MerchantDetails {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  businessType?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  testMode: boolean;
  allowedCurrencies: string[];
  allowedWalletTypes: string[];
  defaultCurrency: string;
  feeType: string;
  feePercentage: number;
  feeFixed: number;
  payoutSchedule: string;
  payoutThreshold: number;
  status: string;
  verificationStatus: string;
  dailyLimit: number;
  monthlyLimit: number;
  transactionLimit: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  user?: MerchantUser;
  gatewayMerchantBalances?: MerchantBalance[];
  gatewayApiKeys?: ApiKey[];
  stats?: MerchantStats;
}

/**
 * Icon + label only; the hue comes from `statusTone()`. Decided locally before,
 * and `REJECTED` was grey here where the platform table says destructive — a
 * rejected merchant read as merely inert.
 */
const STATUS_CONFIG: Record<string, { icon: any; label: string }> = {
  PENDING: { icon: Clock, label: "Pending" },
  ACTIVE: { icon: CheckCircle2, label: "Active" },
  SUSPENDED: { icon: Ban, label: "Suspended" },
  REJECTED: { icon: XCircle, label: "Rejected" },
};

/**
 * Same shape for the KYC chip beside it. `UNVERIFIED` was grey here and is
 * `warning` in the table — it is a needs-attention state, not an absence of one.
 * The verification enum's `PENDING` is `PENDING_REVIEW`-shaped, but the bare key
 * already resolves to warning, so the lookup is left as the raw status.
 */
const VERIFICATION_CONFIG: Record<string, { icon: any; label: string }> = {
  UNVERIFIED: { icon: ShieldX, label: "Unverified" },
  PENDING: { icon: ShieldAlert, label: "Pending Verification" },
  VERIFIED: { icon: ShieldCheck, label: "Verified" },
};

/** The `soft` chip recipe, for the two chips that are not Badges. */
const TONE_SURFACE: Record<BadgeTone, string> = {
  primary: "bg-primary/10 border-primary/20",
  secondary: "bg-secondary border-transparent",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  destructive: "bg-destructive/10 border-destructive/20",
  info: "bg-info/10 border-info/20",
  neutral: "bg-muted border-transparent",
};

const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-secondary-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-muted-foreground",
};

const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

const WALLET_COLORS: Record<string, string> = {
  FIAT: "text-success",
  SPOT: "text-warning",
  ECO: "text-primary",
};

export default function AdminMerchantDetailsClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const params = useParams();
  const merchantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<MerchantDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mode, setMode] = useState<"LIVE" | "TEST">("LIVE");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetails();
    }
  }, [merchantId, mode]);

  const fetchMerchantDetails = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await $fetch({
      url: `/api/admin/gateway/merchant/${merchantId}?mode=${mode}`,
      silent: true,
    });

    if (fetchError) {
      setError(fetchError || t("failed_to_load_merchant_details"));
    } else if (data) {
      setMerchant(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tExt("copied_to_clipboard", { label: String(label) }));
  };

  const toggleKeyExpanded = (keyId: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(keyId)) {
      newExpanded.delete(keyId);
    } else {
      newExpanded.add(keyId);
    }
    setExpandedKeys(newExpanded);
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    const { error } = await $fetch({
      url: `/api/admin/gateway/merchant/${merchantId}/status`,
      method: "PUT",
      body: { status: newStatus },
    });

    if (error) {
      toast.error(typeof error === 'string' ? error : tCommon("failed_to_update_status"));
    } else {
      toast.success(tCommon("status_updated_successfully"));
      fetchMerchantDetails();
    }
    setActionLoading(false);
  };

  const handleVerify = async () => {
    setActionLoading(true);
    const { error } = await $fetch({
      url: `/api/admin/gateway/merchant/${merchantId}/verify`,
      method: "PUT",
      body: { verificationStatus: "VERIFIED" },
    });

    if (error) {
      toast.error(typeof error === 'string' ? error : t("failed_to_verify_merchant"));
    } else {
      toast.success(t("merchant_verified_successfully"));
      fetchMerchantDetails();
    }
    setActionLoading(false);
  };

  const isTestMode = mode === "TEST";

  /*
    THE PENDING TREE WAS A DIFFERENT PAGE, DOWN TO ITS CONTAINER.
    ==========================================================================
    The real return opens `container ${PAGE_PADDING} pt-20 space-y-6`; the
    pending copy was a bare `space-y-6`, so before any content-level difference
    is counted the whole page moved 80px down and gained its gutters when the
    fetch landed. Inside it: `h-10 w-10` against a 64px logo tile, `h-6`/`h-4`
    against a `text-2xl` heading plus a slug line, and four boxes (two `h-48`,
    an `h-64` and another `h-48`) against cards whose height is set by their contents
    — six independent guesses, none able to follow a change to what it imitates.

    It is deleted. The page renders once; only the values wait.

    `error || !merchant` is now `merchantUnavailable`, because `!merchant` is
    true during the fetch too: the ONLY thing keeping "Merchant not found" off
    the screen on every load was that the spinner returned first.
  */
  const merchantUnavailable = !loading && (error || !merchant);

  if (merchantUnavailable) {
    return (
      /* The same container the loaded page opens with. This branch was the
         last copy of the bare `space-y-6` root described above: no gutters,
         and 80px short of the clearance the `fixed top-0` header needs, so
         "Merchant not found" rendered behind the navbar. */
      <div className={`container ${PAGE_PADDING} pt-20 space-y-6`}>
        <Link href="/admin/gateway/merchant">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back_to_merchants")}
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || t("merchant_not_found")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /*
    ONE PENDING VIEW OBJECT, NOT THIRTY OPTIONAL CHAINS.
    --------------------------------------------------------------------------
    Removing the early return also removes TypeScript's narrowing, and the
    tempting repair — sprinkling `merchant?.` down the render — is the wrong
    one: an optional chain quietly yields `undefined` exactly where a figure
    should be showing a placeholder, which is the confident-zero bug in a shape
    the compiler cannot see.

    `Partial<MerchantDetails>` instead. Every field becomes explicitly optional,
    so the compiler points at each place that assumed a value, and each of those
    places gets a `<Loadable>` rather than a `?? 0`. The empty object IS the
    pending payload; the array fields are already read with `?.`/`&&` guards.
  */
  const m: Partial<MerchantDetails> = merchant ?? {};

  const statusConfig = STATUS_CONFIG[m.status ?? ""] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const statusToneName = statusTone(m.status);
  const verificationConfig =
    VERIFICATION_CONFIG[m.verificationStatus ?? ""] ||
    VERIFICATION_CONFIG.UNVERIFIED;
  const VerificationIcon = verificationConfig.icon;
  /* `undefined` while pending, NOT "UNVERIFIED": the old default asserted a
     KYC verdict about a merchant whose record had not arrived, and unverified
     is a needs-attention state that paints warning. */
  const verificationToneName = statusTone(
    loading ? undefined : m.verificationStatus || "UNVERIFIED"
  );

  /*
    A MERCHANT'S BALANCES ARE PER (currency, walletType), SO THERE IS NO TOTAL.
    --------------------------------------------------------------------------
    This was three `reduce((sum, b) => sum + b.available, 0)` scalars, and every
    figure on the page that came out of them was printed with a `$`. A merchant
    holding 40,000 NGN, 0.5 BTC and 25 USDT was shown "$40,025.50" — a figure
    that is not dollars, not naira and not bitcoin. It moved by 40,000 when a
    ₦40,000 payment settled and by 1 when a bitcoin one did, so the biggest
    number on the screen tracked whichever currency happened to have the
    smallest unit. Nothing said which unit it was in because there is no unit it
    could be in.

    The page groups instead of totalling. There is no rate anywhere in this
    payload — the endpoint returns the raw `gatewayMerchantBalance` rows — and an
    admin detail screen must not go and fetch one per currency in the browser,
    so a real USD conversion is not available here and a fake one is worse than
    the breakdown. Rows that share a currency code ARE addable (a merchant can
    hold USDT in both a SPOT and an ECO wallet), so the currency alone is the
    grouping key, and every figure below is printed with the code it is
    denominated in.

    `available` and `pending` also stay apart. The old "Total Balance" tile was
    `available + pending`, i.e. it added money a payment has merely promised to
    money that has settled, under a label that says "balance" — an admin reading
    it would have believed the merchant could be paid out funds the platform has
    not yet received.
  */
  const balancesByCurrency = Object.values(
    (m.gatewayMerchantBalances ?? []).reduce<
      Record<string, { currency: string; available: number; pending: number }>
    >((acc, b) => {
      const row =
        acc[b.currency] ??
        (acc[b.currency] = { currency: b.currency, available: 0, pending: 0 });
      row.available += b.available;
      row.pending += b.pending;
      return acc;
    }, {})
  ).sort((a, b) => b.available - a.available);

  /*
    The KPI tile up top holds ONE figure, and one figure can only be honest when
    there is one currency to put in it. With several, it names how many there
    are and points at the Balances tab, where each is printed in its own unit —
    strictly more than the old tile said, which was arithmetic across
    incompatible units wearing a dollar sign.
  */
  const availableSummary: { value: string } =
    balancesByCurrency.length === 1
      ? {
          value: formatCurrencyAuto(
            balancesByCurrency[0].available,
            balancesByCurrency[0].currency
          ),
        }
      : balancesByCurrency.length > 1
        ? { value: `${balancesByCurrency.length} currencies` }
        : { value: "—" };

  /*
    The caption under Total Volume, and it is a CONSTANT-SHAPED string on
    purpose — StatsCard renders its description row in both states, so a caption
    that is absent while loading and present afterwards makes the card grow and
    takes the other three in the `h-full` row with it.

    It names the currencies the converted total was built from, and says so when
    one of them could not be priced: that total is then a LOWER BOUND, and a
    short figure that reads as a complete one is the failure this whole pass
    exists to remove.
  */
  const volumeCurrencies = Object.keys(m.stats?.volumeByCurrency ?? {});
  const volumeUnpriced = m.stats?.unpricedCurrencies ?? [];
  const volumeCaption = volumeUnpriced.length
    ? `Excludes ${volumeUnpriced.join(", ")} — no exchange rate`
    : volumeCurrencies.length > 1
      ? `Converted from ${volumeCurrencies.join(", ")}`
      : volumeCurrencies.length === 1
        ? `Converted from ${volumeCurrencies[0]}`
        : "Completed payments, converted to USD";

  return (
    <div className={`container ${PAGE_PADDING} pt-20 space-y-6`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/admin/gateway/merchant">
            <Button variant="ghost" size="icon" className="shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-start gap-4">
            {/* The 64px tile renders in BOTH states; only what is inside it
                waits. A logo has no text metrics, so this is the one place on
                the page that takes a raw block — sized with the SAME
                `h-16 w-16` string the real image carries. */}
            {loading ? (
              <SkeletonBlock className="h-16 w-16 rounded-xl border-2 border-border" />
            ) : m.logo ? (
              <img
                src={m.logo}
                alt={m.name}
                className="h-16 w-16 rounded-xl object-cover border-2 border-border shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">
                  <Loadable loading={loading} chars={16}>
                    {m.name}
                  </Loadable>
                </h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${TONE_SURFACE[statusToneName]}`}
                >
                  <StatusIcon
                    className={`h-3.5 w-3.5 ${TONE_INK[statusToneName]}`}
                  />
                  {/* The chip's box is chrome; only the word waits. While
                      pending `statusToneName` resolves off an undefined status
                      to the neutral tone, so the pill does not assert a verdict
                      on a merchant nobody has read yet. */}
                  <span className={TONE_INK[statusToneName]}>
                    <Loadable loading={loading} placeholder="Active">
                      {statusConfig.label}
                    </Loadable>
                  </span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${TONE_SURFACE[verificationToneName]}`}
                >
                  <VerificationIcon
                    className={`h-3.5 w-3.5 ${TONE_INK[verificationToneName]}`}
                  />
                  <span className={TONE_INK[verificationToneName]}>
                    <Loadable loading={loading} placeholder="Verified">
                      {verificationConfig.label}
                    </Loadable>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <code className="text-sm font-mono">
                  @
                  <Loadable loading={loading} chars={12}>
                    {m.slug}
                  </Loadable>
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={loading}
                  onClick={() => m.slug && copyToClipboard(m.slug, "Slug")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {m.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  {m.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions + Mode Toggle */}
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                isTestMode
                  ? "bg-warning/10 text-warning-ink"
                  : "bg-success/10 text-success-ink"
              }`}
            >
              {isTestMode ? (
                <TestTube className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              {isTestMode ? tCommon("test") : tCommon("live")}
            </div>
            <Switch
              checked={!isTestMode}
              onCheckedChange={(checked) => setMode(checked ? "LIVE" : "TEST")}
              className="data-[state=checked]:bg-success data-[state=unchecked]:bg-warning"
            />
          </div>

          {m.verificationStatus !== "VERIFIED" && (
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={actionLoading}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={actionLoading}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {m.status !== "ACTIVE" && (
                <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {m.status === "ACTIVE" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("SUSPENDED")}
                  className="text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              )}
              {m.status === "SUSPENDED" && (
                <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                  <Play className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* There is nothing to copy until the record arrives, and the
                  compiler said so — `m.id` is optional on the pending view. */}
              <DropdownMenuItem
                disabled={loading}
                onClick={() => m.id && copyToClipboard(m.id, "Merchant ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("copy_merchant_id")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Overview. `loading` goes to each CARD, not around the grid:
          StatsCard holds its own border, label, icon tile and 130.5px height
          while pending, and the `|| 0` defaults below never reach the screen
          because the flag replaces the figure with a measured placeholder. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* This used to print `sum("amount")` over every payment currency with a
            "$" in front of it, so a merchant who took ₦40,000 and $50 read
            "$40.1K" — a figure that is neither. The endpoint now groups by
            currency and converts, so the headline is real dollars and the
            caption names the currencies behind it. `description` is passed in
            BOTH states so the card does not grow when the payload lands. */}
        <StatsCard
          label={tCommon("total_volume")}
          value={
            typeof m.stats?.totalVolumeUSD === "number"
              ? m.stats.totalVolumeUSD
              : "—"
          }
          isCurrency={typeof m.stats?.totalVolumeUSD === "number"}
          description={volumeCaption}
          icon={TrendingUp}
          index={0}
          loading={loading}
          {...statsCardColors.success}
        />
        <StatsCard
          label="Payments"
          value={formatNumber(m.stats?.paymentCount || 0)}
          icon={CreditCard}
          index={1}
          loading={loading}
          {...statsCardColors.primary}
        />
        {/* `MoneyFigure` so the amount stays monospaced and the currency code
            does not: a value carrying three letters reads as prose to
            `isFigureValue`, which is exactly why the code has to be split off at
            the call site rather than handed to the card as one string.

            The caption is a CONSTANT, not `availableSummary.description`.
            StatsCard renders that row in both states on purpose, and a caption
            derived from the payload is absent for the whole fetch and then
            appears — the card grew ~17px as the data landed, and `h-full`
            takes the other three cards in the row with it. It is true in every
            state anyway: the Balances tab is where the per-currency amounts
            are, whether there is one of them or five. */}
        <StatsCard
          label="Available"
          value={<MoneyFigure value={availableSummary.value} />}
          description={t("per_currency_amounts_in_the_balances_tab")}
          icon={Wallet}
          index={2}
          loading={loading}
          {...statsCardColors.warning}
        />
        <StatsCard
          label="Refunds"
          value={formatNumber(m.stats?.refundCount || 0)}
          icon={RefreshCcw}
          index={3}
          loading={loading}
          {...statsCardColors.primary}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for different sections */}
          <Tabs defaultValue="api-keys" className="space-y-6">
            <TabsList>
              <TabsTrigger value="api-keys">{tCommon("api_keys")}</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
            </TabsList>

            <TabsContent value="api-keys" className="space-y-6">
              {/* API Keys */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Key className="h-3.5 w-3.5" />
                    </span>
                    API Keys ({mode})
                  </CardTitle>
                  <CardDescription>
                    {isTestMode ? tCommon("test") : tCommon("live")} mode API keys and their configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Three states. Gated on the array alone this panel said
                      "no API keys" for the duration of the fetch — a claim
                      about the merchant's integration, not about the request. */}
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-lg border p-4 space-y-2">
                          <p className="font-medium">
                            <SkeletonText chars={18} />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <SkeletonText chars={34} />
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : m.gatewayApiKeys && m.gatewayApiKeys.length > 0 ? (
                    <div className="space-y-4">
                      {m.gatewayApiKeys.map((apiKey) => (
                        <Collapsible
                          key={apiKey.id}
                          open={expandedKeys.has(apiKey.id)}
                          onOpenChange={() => toggleKeyExpanded(apiKey.id)}
                        >
                          <div className="border rounded-lg">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${apiKey.status ? "bg-success/10" : "bg-muted/10"}`}>
                                    <Key className={`h-5 w-5 ${apiKey.status ? "text-success" : "text-subtle-foreground"}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{apiKey.name}</span>
                                      <Badge variant={apiKey.type === "SECRET" ? "destructive" : "secondary"}>
                                        {apiKey.type}
                                      </Badge>
                                      <Badge variant={apiKey.status ? "default" : "secondary"}>
                                        {apiKey.status ? tCommon("active") : tCommon("inactive")}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs text-muted-foreground font-mono">
                                        {apiKey.keyPrefix}...{apiKey.lastFourChars}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedKeys.has(apiKey.id) ? "rotate-180" : ""}`} />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t p-4 space-y-4 bg-muted/20">
                                {/* URLs */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {apiKey.successUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">{tExt("success_url")}</p>
                                      <div className="flex items-center gap-2">
                                        <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <code className="text-xs truncate">{apiKey.successUrl}</code>
                                      </div>
                                    </div>
                                  )}
                                  {apiKey.cancelUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">{tExt("cancel_url")}</p>
                                      <div className="flex items-center gap-2">
                                        <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <code className="text-xs truncate">{apiKey.cancelUrl}</code>
                                      </div>
                                    </div>
                                  )}
                                  {apiKey.webhookUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">{tExt("webhook_url")}</p>
                                      <div className="flex items-center gap-2">
                                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <code className="text-xs truncate">{apiKey.webhookUrl}</code>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Allowed Wallet Types */}
                                {apiKey.allowedWalletTypes && Object.keys(apiKey.allowedWalletTypes).length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">{tExt("accepted_payment_methods")}</p>
                                    <div className="space-y-2">
                                      {Object.entries(apiKey.allowedWalletTypes).map(([walletType, config]) => {
                                        if (!config.enabled) return null;
                                        const WalletIcon = WALLET_ICONS[walletType] || Wallet;
                                        const walletColor = WALLET_COLORS[walletType] || "text-muted-foreground";
                                        return (
                                          <div key={walletType} className="flex items-center gap-3 p-2 rounded-lg bg-background border">
                                            <WalletIcon className={`h-4 w-4 ${walletColor}`} />
                                            <span className="font-medium text-sm">{walletType}</span>
                                            <div className="flex flex-wrap gap-1">
                                              {config.currencies.map((currency) => (
                                                <Badge key={currency} variant="outline" className="text-xs">
                                                  {currency}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* IP Whitelist */}
                                {apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">{tCommon("ip_whitelist")}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {apiKey.ipWhitelist.map((ip) => (
                                        <Badge key={ip} variant="outline" className="text-xs font-mono">
                                          {ip}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Permissions */}
                                {apiKey.permissions && apiKey.permissions.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Permissions</p>
                                    <div className="flex flex-wrap gap-1">
                                      {apiKey.permissions.map((perm) => (
                                        <Badge key={perm} variant="secondary" className="text-xs">
                                          {perm}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Last Used & Expiry */}
                                <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2 border-t">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {tCommon("created")}: {formatShortDate(apiKey.createdAt)}
                                  </div>
                                  {apiKey.lastUsedAt && (
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      {tCommon("last_used")}: {formatShortDate(apiKey.lastUsedAt)}
                                      {apiKey.lastUsedIp && t("from", { lastUsedIp: String(apiKey.lastUsedIp) })}
                                    </div>
                                  )}
                                  {apiKey.expiresAt && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {tCommon("expires")}: {formatShortDate(apiKey.expiresAt)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No {isTestMode ? "test" : "live"} {t("api_keys_found")}</p>
                      <p className="text-sm">This merchant hasn't created any API keys for {mode.toLowerCase()} mode yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                    </span>
                    {tCommon("business_information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("business_name")}</p>
                      <p className="font-medium">{m.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${m.email}`} className="font-medium hover:underline">
                          {m.email}
                        </a>
                      </div>
                    </div>
                    {m.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{m.phone}</span>
                        </div>
                      </div>
                    )}
                    {m.website && (
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={m.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {m.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                    {/* Asked for at registration and part of what this page is
                        reviewing, so it belongs beside the other business
                        details rather than only in the database. */}
                    {m.businessType && (
                      <div>
                        <p className="text-sm text-muted-foreground">{tCommon("business_type")}</p>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{m.businessType}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(m.address || m.city || m.country) && (
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="font-medium">
                            {m.address && <p>{m.address}</p>}
                            <p>
                              {[m.city, m.state, m.postalCode]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {m.country && <p>{m.country}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">{tCommon("member_since")}</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          <Loadable loading={loading} placeholder={tCommon("jan_1") + " 2026"}>
                            {m.createdAt ? formatShortDate(m.createdAt) : null}
                          </Loadable>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                    </span>
                    {tCommon("transaction_limits")}
                  </CardTitle>
                  {/* NO `$` on these three. `gateway/v1/payment/create.post.ts`
                      gates on `amount > merchant.transactionLimit` without ever
                      looking at the payment's currency — its own rejection
                      interpolates the currency after the bare number, "exceeds
                      transaction limit of 5000 NGN" — so the stored 5,000 stops
                      a $5,001 payment and a ₦5,001 one (about $3) alike.
                      Printed as "$5,000" it told an operator the cap was five
                      thousand dollars, and a merchant taking naira was held
                      ~1,500x tighter than this screen claimed. `dailyLimit` and
                      `monthlyLimit` are read by nothing at all yet, so they are
                      even less denominated than that. */}
                  <CardDescription>
                    {t("bare_thresholds_applied_to_the_payment")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{tExt("per_transaction")}</p>
                        {/* A limit of "0" is a policy statement — it would
                            read as a merchant blocked from transacting. */}
                        <span className="font-medium">
                          <Loadable loading={loading} placeholder="00,000">
                            {m.transactionLimit?.toLocaleString()}
                          </Loadable>
                        </span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{tCommon("daily_limit")}</p>
                        <span className="font-medium">
                          <Loadable loading={loading} placeholder="00,000">
                            {m.dailyLimit?.toLocaleString()}
                          </Loadable>
                        </span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{t("monthly_limit_per_merchant")}</p>
                        <span className="font-medium">
                          <Loadable loading={loading} placeholder="000,000">
                            {m.monthlyLimit?.toLocaleString()}
                          </Loadable>
                        </span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Merchant Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Percent className="h-3.5 w-3.5" />
                    </span>
                    {t("fees_payout_settings")}
                  </CardTitle>
                  {/* Same story as the limits above. `calculateFees` adds
                      `feeFixed` straight onto an amount in the payment's own
                      currency, and the payout cron compares `payoutThreshold`
                      against each balance row in THAT row's currency ("payable
                      X NGN below threshold 100"). Neither number is dollars;
                      "$0.30" and "$100" said both were, and an operator reading
                      the threshold as $100 was looking at a merchant whose NGN
                      payouts fire at ₦100. */}
                  <CardDescription>
                    {t("the_fixed_fee_and_the_threshold")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">{tCommon("fee_structure")}</p>
                      {/* The fixed-fee clause is data-dependent (many merchants
                          have no fixed component), so it stays conditional — but
                          it must not be evaluated against an undefined fee, and
                          the percentage itself is a figure, not a zero. The word
                          "fixed" carries the weight the `$` used to: without a
                          symbol, "2.90% + 0.30" would read as another percent. */}
                      <p className="font-medium mt-1">
                        <Loadable loading={loading} placeholder="0.00">
                          {m.feePercentage}
                        </Loadable>
                        %
                        {!loading && (m.feeFixed ?? 0) > 0
                          ? ` + ${(m.feeFixed ?? 0).toFixed(2)} fixed`
                          : null}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("payout_schedule")}</p>
                      <Badge variant="outline" className="mt-1">
                        <Loadable loading={loading} placeholder="Weekly">
                          {m.payoutSchedule}
                        </Loadable>
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("payout_threshold")}</p>
                      <p className="font-medium mt-1">
                        <Loadable loading={loading} placeholder="0,000">
                          {m.payoutThreshold?.toLocaleString()}
                        </Loadable>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="space-y-6">
              {/* Balance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" />
                    </span>
                    {t("balance_summary")}
                  </CardTitle>
                  <CardDescription>{t("available_and_pending_per_currency")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* ONE TILE PER CURRENCY, not three tiles per merchant.
                      Available / Pending / Total Balance were three cross-currency
                      sums with a `$` in front of each, so a merchant holding naira
                      and bitcoin got three numbers denominated in nothing. A tile
                      per currency is the same three facts with the unit attached,
                      and pending keeps its own line under the available figure
                      rather than being folded into it. */}
                  {!loading && balancesByCurrency.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {balancesByCurrency.map((c) => (
                        <div key={c.currency} className="p-4 rounded-lg border border-border bg-card">
                          <p className="text-xs font-medium text-muted-foreground">{c.currency} Available</p>
                          <p className="text-2xl font-semibold leading-tight tracking-tight text-success mt-1">
                            <MoneyFigure value={formatCurrencyAuto(c.available, c.currency)} />
                          </p>
                          <p className="text-xs text-warning mt-1.5">
                            <MoneyFigure value={formatCurrencyAuto(c.pending, c.currency)} /> pending
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Balance by Wallet Type */}
                  {/* Same three-state split as the API-keys panel above. */}
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg border p-4 flex items-center justify-between">
                          <p className="font-medium">
                            <SkeletonText placeholder="USDT" />
                          </p>
                          <p className="font-mono tabular-nums font-medium">
                            <SkeletonText placeholder="$0,000.00" />
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : m.gatewayMerchantBalances && m.gatewayMerchantBalances.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-medium">{t("by_wallet_type")}</h4>
                      {m.gatewayMerchantBalances.map((balance) => {
                        const WalletIcon = WALLET_ICONS[balance.walletType] || Wallet;
                        const walletColor = WALLET_COLORS[balance.walletType] || "text-muted-foreground";
                        return (
                          <div
                            key={balance.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-background">
                                <WalletIcon className={`h-5 w-5 ${walletColor}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{balance.walletType} Wallet</span>
                                  <Badge variant="outline">{balance.currency}</Badge>
                                </div>
                                {/* Lifetime figures for THIS row, so they are in
                                    this row's currency — the `$` in front of them
                                    described the naira row's lifetime takings as
                                    dollars. */}
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                  <span>{tExt("received")}: {formatCurrencyAuto(balance.totalReceived, balance.currency)}</span>
                                  <span>{tCommon("fees")}: {formatCurrencyAuto(balance.totalFees, balance.currency)}</span>
                                  <span>{tExt("paid_out")}: {formatCurrencyAuto(balance.totalPaidOut, balance.currency)}</span>
                                </div>
                              </div>
                            </div>
                            {/* This row is a single currency, so the amount only
                                ever needed its own code — it carried BOTH, and
                                rendered "$1,200.00 NGN". Two units on one figure,
                                and the one a reader takes from a leading glyph is
                                the wrong one, so the row read as $1,200 of naira. */}
                            <div className="text-right">
                              <p className="text-lg font-semibold leading-tight tracking-tight text-foreground"><MoneyFigure value={formatCurrencyAuto(balance.available, balance.currency)} /></p>
                              {balance.pending > 0 && (
                                <p className="text-sm text-warning">+{formatCurrencyAuto(balance.pending, balance.currency)} pending</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("no_balance_records_found")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Account Owner */}
          {m.user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  {t("account_owner")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={m.user.avatar} alt={m.user.firstName} />
                    <AvatarFallback>
                      {m.user.firstName?.[0]}
                      {m.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {m.user.firstName} {m.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <Link href={`/admin/crm/user/${m.user.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("view_user_profile")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                </span>
                {tExt("quick_info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className={`inline-flex items-center gap-1.5 mt-1 ${TONE_INK[statusToneName]}`}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="font-medium">{statusConfig.label}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verification</p>
                <div className={`inline-flex items-center gap-1.5 mt-1 ${TONE_INK[verificationToneName]}`}>
                  <VerificationIcon className="h-4 w-4" />
                  <span className="font-medium">{verificationConfig.label}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  <Loadable loading={loading} placeholder={tCommon("jan_1") + " 2026"}>
                    {m.createdAt ? formatShortDate(m.createdAt) : null}
                  </Loadable>
                </p>
              </div>
              {m.updatedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">{tCommon("last_updated")}</p>
                  <p className="font-medium">{formatShortDate(m.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCommon("quick_actions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href={`/admin/gateway/payment?merchantId=${m.id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {tExt("view_payments")}
                </Button>
              </Link>
              <Link href={`/admin/gateway/payout?merchantId=${m.id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Wallet className="h-4 w-4 mr-2" />
                  {t("view_payouts")}
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() => m.id && copyToClipboard(m.id, "Merchant ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("copy_merchant_id")}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const data = JSON.stringify(merchant, null, 2);
                  copyToClipboard(data, "Merchant data");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                {tCommon("export_as_json")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
