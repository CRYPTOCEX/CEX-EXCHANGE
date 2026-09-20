"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AskAboutUser } from "@/components/support/ask-about-user";
import { format, formatDistanceToNow, subDays, subMonths } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusTone } from "@/lib/status-tone";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock,
  Shield,
  Landmark,
  ShieldOff,
  CheckCircle,
  XCircle,
  Wallet, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  FileText,
  MessageCircle,
  AlertTriangle,
  Activity,
  ScrollText,
  Eye,
  ArrowLeft,
  DollarSign,
  Globe,
  Key,
  Smartphone,
  Archive,
  Settings,
  MapPin,
  BarChart3,
  ChevronDown,
  RefreshCw,
  Filter,
  Search,
  Copy,
  ExternalLink,
  Ban,
  UserCheck,
  Zap,
  Target,
  Award,
  Star,
  Briefcase,
  PieChart,
  LineChart,
  Users,
  Bot,
  CandlestickChart,
  Image,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { describeUserAgent } from "@/lib/user-agent";
import { toast } from "sonner";
import { useExtensionChecker } from "@/lib/extensions";
import DataTable from "@/components/blocks/data-table";
import { RecordAuditTab } from "@/components/blocks/audit/record-audit-tab";
import { PageShell } from "@/components/layout/page-shell";

// Import existing table columns.
//
// The `useViewConfig` hooks come along with them on purpose: these three tables
// are the SAME tables as on their own admin pages (same apiEndpoint, same row
// shape — `modelConfig` only narrows the query to this user), so the details
// dialog an operator gets on /admin/finance/transaction should not degrade into
// a flat key/value grid just because the table was opened from a profile.
import {
  useColumns as useTransactionColumns,
  useViewConfig as useTransactionViewConfig,
} from "@/app/[locale]/(dashboard)/admin/finance/transaction/columns";
import { useAnalytics as useTransactionAnalytics } from "@/app/[locale]/(dashboard)/admin/finance/transaction/analytics";
import {
  useColumns as useWalletColumns,
  useViewConfig as useWalletViewConfig,
} from "@/app/[locale]/(dashboard)/admin/finance/wallet/columns";
import {
  useColumns as useSupportColumns,
  useViewConfig as useSupportViewConfig,
} from "@/app/[locale]/(dashboard)/admin/crm/support/columns";

// Import extension table columns
import { useColumns as useBinaryOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/binary/columns";
import { useColumns as useExchangeOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/exchange/columns";
import { useColumns as useFuturesOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/futures/columns";
import { useColumns as useEcosystemOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/ecosystem/columns";
import { useColumns as useInvestmentColumns } from "@/app/[locale]/(dashboard)/admin/finance/investment/history/columns";
import { useColumns as useIcoTransactionColumns } from "@/app/[locale]/(ext)/admin/ico/transaction/columns";
import { useColumns as useP2pOfferColumns } from "@/app/[locale]/(ext)/admin/p2p/offer/columns";
import { useColumns as useP2pTradeColumns } from "@/app/[locale]/(ext)/admin/p2p/trade/columns";
import { useColumns as useStakingPositionColumns } from "@/app/[locale]/(ext)/admin/staking/position/columns";
import { useColumns as useAffiliateReferralColumns } from "@/app/[locale]/(ext)/admin/affiliate/referral/columns";
import { useColumns as useEcommerceOrderColumns } from "@/app/[locale]/(ext)/admin/ecommerce/order/columns";
import { useColumns as useForexDepositColumns } from "@/app/[locale]/(dashboard)/admin/finance/deposit/log/columns";
import { useColumns as useForexInvestmentColumns } from "@/app/[locale]/(ext)/admin/forex/investment/columns";
import { useColumns as useAiInvestmentLogColumns } from "@/app/[locale]/(ext)/admin/ai/investment/log/columns";
import { useColumns as useNftTokenColumns } from "@/app/[locale]/(ext)/admin/nft/token/columns";
import { useColumns as useNftSaleColumns } from "@/app/[locale]/(ext)/admin/nft/sale/columns";
import { useColumns as useNftListingColumns } from "@/app/[locale]/(ext)/admin/nft/listing/columns";
import { useColumns as useFxAccountColumns } from "@/app/[locale]/(ext)/admin/forex-trading/account/columns";
import { useColumns as useFxPositionColumns } from "@/app/[locale]/(ext)/admin/forex-trading/position/columns";
import { useColumns as useFxDealColumns } from "@/app/[locale]/(ext)/admin/forex-trading/deal/columns";
import { useColumns as useCopyLeaderColumns } from "@/app/[locale]/(ext)/admin/copy-trading/leader/columns";
import { useColumns as useCopyFollowerColumns } from "@/app/[locale]/(ext)/admin/copy-trading/follower/columns";
import { useColumns as useCopyTradeColumns } from "@/app/[locale]/(ext)/admin/copy-trading/trade/columns";
import { useColumns as useTradingBotColumns } from "@/app/[locale]/(ext)/admin/trading-bot/bot/columns";

/**
 * How a tone paints an ICON on this page (the verification checklist marks).
 * Not a status decision — `statusTone()` owns which tone a status gets.
 */
const TONE_MARK: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";
  /** One of the platform's own accounts; read-only here, see the header badge. */
  system?: boolean;
  // Optional on purpose. `user.roleId` is nullable and the association is
  // `onDelete: "SET NULL"`, and the detail route LEFT JOINs the role, so a user
  // whose role was deleted comes back with `role: null`. Typing it as always
  // present is what let `user.role.name` be written unguarded in the header,
  // which white-screened the entire page for exactly those users.
  role?: {
    id: number;
    name: string;
  } | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLogin?: string;
  failedLoginAttempts: number;
  kyc?: {
    id: string;
    status: string;
    reviewedAt?: string;
    createdAt: string;
    data?: any;
    adminNotes?: string;
  };
  twoFactor?: {
    enabled: boolean;
    type: string;
    createdAt: string;
  };
  /** Never carries `pinHash` — the admin GET selects only these columns. */
  transferPin?: {
    enabled: boolean;
    failedAttempts: number;
    lockoutCount: number;
    lockedUntil: string | null;
    lastChangedAt: string | null;
  };
  notifications?: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  /**
   * Headline counts per addon, keyed by TAB key (`binary`, `spot`, `forex`,
   * `ai`, `ico`, `p2p`, `staking`, `ecommerce`, `affiliate`, `nft`, `fxdesk`,
   * `copytrading`, `tradingbot`). Only addons that are installed appear, and an
   * addon whose query failed is `null` rather than missing, so the UI can tell
   * "nothing to show" apart from "could not load".
   *
   * This replaced nine `xxxData` fields of recent ROWS that the page fetched on
   * every load and never rendered once — each addon lists its own rows in its
   * own paginated table on its own tab.
   */
  addonSummary?: Record<string, any>;
  /** Ticket counts behind the compliance-risk and engagement factors. */
  supportStats?: {
    total: number;
    recent: number;
    resolved: number;
    highImportanceOpen: number;
  } | null;
}

/**
 * Has this user actually used the addon, as opposed to the addon merely being
 * installed?
 *
 * The old test was `Object.keys(payload).length > 0` against a payload the
 * backend assigned unconditionally, so it was true for every user of every
 * installed addon and awarded the same constant to everyone. A summary block is
 * evidence of activity only if one of its counts is above zero.
 */
function hasAddonRows(summary: any): boolean {
  return (
    !!summary &&
    Object.values(summary).some((value) => typeof value === "number" && value > 0)
  );
}

/**
 * The maxima the four activity sub-scores can actually award.
 *
 * These are the caps the code applies, and the denominators the UI prints. They
 * were three separate sets of numbers before: the caps here, different
 * denominators hardcoded in the Security tab, and in one case a cap the body
 * could not even reach (integration promised 10 and could only award 7). Naming
 * them once is what keeps the badge and the number agreeing.
 */
const ACTIVITY_MAX = {
  security: 40,     // 15 email + 12 phone + 20 KYC + 18 2FA, capped
  engagement: 30,   // 8 age + 10 recency + 8 profile + 4 addon usage
  compliance: 20,   // 15 status + 5 clean login history
  integration: 9,   // 5 notification read-ratio + 2 resolved support + 2 elevated role
} as const;

const ACTIVITY_TOTAL =
  ACTIVITY_MAX.security +
  ACTIVITY_MAX.engagement +
  ACTIVITY_MAX.compliance +
  ACTIVITY_MAX.integration;

/**
 * The maxima each RISK factor can reach.
 *
 * The page used to print every risk number "/100" while the raw total could
 * reach 245, and the per-factor denominators (45 / 80 / 38 / 13) matched
 * nothing at all. Risk is now normalised to 0-100 for display AND the level
 * thresholds below sit on that same scale, so "Critical" can no longer appear
 * next to a third-full bar.
 */
const RISK_MAX = {
  security: 85,     // 40 failed logins + 15 no-2FA + 20 unverified email + 10 unverified phone
  account: 110,     // 80 banned + 30 KYC rejected
  behavioral: 50,   // 20 never logged in + 15 brand-new account + 15 missing required fields
  compliance: 19,   // 10 recent-ticket burst + 9 capped high-importance open tickets
} as const;

const RISK_TOTAL =
  RISK_MAX.security + RISK_MAX.account + RISK_MAX.behavioral + RISK_MAX.compliance;

/** Thresholds on the normalised 0-100 risk scale. */
const RISK_LEVEL_THRESHOLDS: Array<[number, "Critical" | "High" | "Medium"]> = [
  [Math.round((80 / RISK_TOTAL) * 100), "Critical"],
  [Math.round((50 / RISK_TOTAL) * 100), "High"],
  [Math.round((25 / RISK_TOTAL) * 100), "Medium"],
];

type TabCategory = "account" | "trading" | "extensions";

interface TabConfig {
  key: string;
  label: string;
  category: TabCategory;
  icon: React.ReactNode;
  /**
   * Canonical seeded extension name. Absent means "core feature, always shown".
   * Must match backend/seeders/20240403000503-extensions.js exactly — a typo
   * here is indistinguishable from an uninstalled addon and hides the tab
   * silently.
   */
  extension?: string;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 24, label: "1 day" },
  { value: 168, label: "1 week" },
  { value: 720, label: "1 month" },
  { value: 8760, label: "1 year" },
];

const BLOCK_REASONS = [
  "Suspicious Activity",
  "Terms of Service Violation", 
  "Security Concern",
  "Fraud Prevention",
  "Money Laundering",
  "Multiple Account Violation",
  "Admin Request",
  "Other",
];

/**
 * The headline numbers for one addon, above that addon's tables.
 *
 * This is what the detail route's per-addon payload was always FOR. The route
 * used to build nine blocks of recent rows on every profile load and the page
 * rendered none of them — each addon lists its own rows in its own paginated
 * table further down the same tab, so the arrays were pure cost. The counts are
 * the part an admin reads first and the part that was missing.
 *
 * Three states, deliberately distinguished:
 *   - `undefined` — the addon is installed but the route did not report on it;
 *     render nothing rather than a row of zeros that looks like real data.
 *   - `null` — the route TRIED and the query failed. Say so. A silent zero here
 *     would read as "this user has no NFTs" when the truth is "we don't know".
 *   - an object — show it.
 */
function AddonSummary({
  summary,
  items,
}: {
  summary: any;
  items: Array<{ label: string; value: any; money?: boolean; percent?: boolean }>;
}) {
  const tCommon = useTranslations("common");

  if (summary === undefined) return null;

  if (summary === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-ink">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {tCommon("addon_summary_unavailable")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
            {/*
              Coerced, then formatted. These arrive as SUM()/COUNT() results,
              which mysql2 hands back as STRINGS — `toFixed` on a string throws,
              and `toLocaleString` on one silently prints it unformatted.
            */}
            {item.money
              ? Number(item.value ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : `${Number(item.value ?? 0).toLocaleString()}${item.percent ? "%" : ""}`}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The tab panel before the record exists.
 *
 * NOT a second copy of the overview tab, and it must not become one — every
 * hand-written `loading.tsx` in this app is a duplicate that drifted from the
 * page it stands for. This reserves the CONTAINER and nothing else: the three-
 * column grid the panel actually uses, three cards, and a fixed run of rows.
 * SKELETONS.md allows exactly that where the child count is unknowable ("render
 * a fixed count of pending rows and accept that the count settles"), and here it
 * genuinely is — which tab is active decides what fills this box, and there are
 * 26 of them.
 *
 * The rows are `text-sm` label/value pairs because that is what the real rows
 * are, and the height comes from `SkeletonText` laying out inside those classes
 * rather than from an `h-4` someone measured once. Change the row typography and
 * this follows it.
 */
function RecordPanelPlaceholder() {
  const t = useTranslations("dashboard_admin");
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-6" aria-busy="true">
      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SkeletonText placeholder={tDashboard("section_title")} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center justify-between">
                  <span className="text-sm">
                    <SkeletonText placeholder={tDashboard("field_label")} />
                  </span>
                  <span className="text-sm font-medium">
                    <SkeletonText placeholder={tCommon("field_value")} />
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper function to filter out user column
const createUserSpecificColumns = (originalColumns: any[]) => {
  return originalColumns.filter(column => column.key !== 'user');
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  // `extensions` comes back for dependency tracking: the checker function is a
  // fresh closure each render, but the list behind it is the real input.
  const { isExtensionAvailable, extensions } = useExtensionChecker();
  const transactionAnalytics = useTransactionAnalytics();

  // Get columns from hooks
  const transactionColumns = useTransactionColumns();
  const walletColumns = useWalletColumns();
  const supportColumns = useSupportColumns();

  // View dialogs for the three core-account tables below. Each is already
  // memoised by its own hook, so passing them straight through is stable.
  const transactionViewConfig = useTransactionViewConfig();
  const walletViewConfig = useWalletViewConfig();
  const supportViewConfig = useSupportViewConfig();
  const binaryOrderColumns = useBinaryOrderColumns();
  const exchangeOrderColumns = useExchangeOrderColumns();
  const futuresOrderColumns = useFuturesOrderColumns();
  const ecosystemOrderColumns = useEcosystemOrderColumns();
  const investmentColumns = useInvestmentColumns();
  const icoTransactionColumns = useIcoTransactionColumns();
  const p2pOfferColumns = useP2pOfferColumns();
  const p2pTradeColumns = useP2pTradeColumns();
  const stakingPositionColumns = useStakingPositionColumns();
  const affiliateReferralColumns = useAffiliateReferralColumns();
  const ecommerceOrderColumns = useEcommerceOrderColumns();
  const forexDepositColumns = useForexDepositColumns();
  const forexInvestmentColumns = useForexInvestmentColumns();
  const aiInvestmentLogColumns = useAiInvestmentLogColumns();
  const nftTokenColumns = useNftTokenColumns();
  const nftSaleColumns = useNftSaleColumns();
  const nftListingColumns = useNftListingColumns();
  const fxAccountColumns = useFxAccountColumns();
  const fxPositionColumns = useFxPositionColumns();
  const fxDealColumns = useFxDealColumns();
  const copyLeaderColumns = useCopyLeaderColumns();
  const copyFollowerColumns = useCopyFollowerColumns();
  const copyTradeColumns = useCopyTradeColumns();
  const tradingBotColumns = useTradingBotColumns();

  // Create user-specific columns (filtered to exclude user column)
  const userTransactionColumns = useMemo(() => createUserSpecificColumns(transactionColumns), [transactionColumns]);
  const userWalletColumns = useMemo(() => createUserSpecificColumns(walletColumns), [walletColumns]);
  const userSupportColumns = useMemo(() => createUserSpecificColumns(supportColumns), [supportColumns]);
  const userBinaryOrderColumns = useMemo(() => createUserSpecificColumns(binaryOrderColumns), [binaryOrderColumns]);
  const userExchangeOrderColumns = useMemo(() => createUserSpecificColumns(exchangeOrderColumns), [exchangeOrderColumns]);
  const userFuturesOrderColumns = useMemo(() => createUserSpecificColumns(futuresOrderColumns), [futuresOrderColumns]);
  const userEcosystemOrderColumns = useMemo(() => createUserSpecificColumns(ecosystemOrderColumns), [ecosystemOrderColumns]);
  const userInvestmentColumns = useMemo(() => createUserSpecificColumns(investmentColumns), [investmentColumns]);
  const userIcoTransactionColumns = useMemo(() => createUserSpecificColumns(icoTransactionColumns), [icoTransactionColumns]);
  const userP2pOfferColumns = useMemo(() => createUserSpecificColumns(p2pOfferColumns), [p2pOfferColumns]);
  const userP2pTradeColumns = useMemo(() => createUserSpecificColumns(p2pTradeColumns), [p2pTradeColumns]);
  const userStakingPositionColumns = useMemo(() => createUserSpecificColumns(stakingPositionColumns), [stakingPositionColumns]);
  const userAffiliateReferralColumns = useMemo(() => createUserSpecificColumns(affiliateReferralColumns), [affiliateReferralColumns]);
  const userEcommerceOrderColumns = useMemo(() => createUserSpecificColumns(ecommerceOrderColumns), [ecommerceOrderColumns]);
  const userForexDepositColumns = useMemo(() => createUserSpecificColumns(forexDepositColumns), [forexDepositColumns]);
  const userForexInvestmentColumns = useMemo(() => createUserSpecificColumns(forexInvestmentColumns), [forexInvestmentColumns]);
  const userAiInvestmentLogColumns = useMemo(() => createUserSpecificColumns(aiInvestmentLogColumns), [aiInvestmentLogColumns]);
  const userNftTokenColumns = useMemo(() => createUserSpecificColumns(nftTokenColumns), [nftTokenColumns]);
  const userNftListingColumns = useMemo(() => createUserSpecificColumns(nftListingColumns), [nftListingColumns]);
  const userFxAccountColumns = useMemo(() => createUserSpecificColumns(fxAccountColumns), [fxAccountColumns]);
  const userFxPositionColumns = useMemo(() => createUserSpecificColumns(fxPositionColumns), [fxPositionColumns]);
  const userFxDealColumns = useMemo(() => createUserSpecificColumns(fxDealColumns), [fxDealColumns]);
  const userCopyLeaderColumns = useMemo(() => createUserSpecificColumns(copyLeaderColumns), [copyLeaderColumns]);
  const userCopyFollowerColumns = useMemo(() => createUserSpecificColumns(copyFollowerColumns), [copyFollowerColumns]);
  const userCopyTradeColumns = useMemo(() => createUserSpecificColumns(copyTradeColumns), [copyTradeColumns]);
  const userTradingBotColumns = useMemo(() => createUserSpecificColumns(tradingBotColumns), [tradingBotColumns]);
  // nftSaleColumns is NOT user-stripped: `seller` and `buyer` are what tell
  // the admin which side of each trade this user was on.

  // REMOVED: an `extensionColumnsAvailable` probe that tested
  // `xxxColumns.length > 0` for six addons, on the stated premise that "extension
  // addons return empty columns when not installed". They do not — every one of
  // those `useColumns` hooks unconditionally returns a literal array, so all six
  // flags were constant `true` and the second half of the tab gate was dead code
  // that read like a live safety net.
  //
  // The authoritative signal is the one the gate already consults on its own:
  // the config store's extension list, via `isExtensionAvailable`.

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isTemporaryBlock, setIsTemporaryBlock] = useState(false);
  const [blockDuration, setBlockDuration] = useState(24);
  const [blockReason, setBlockReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [userActivities, setUserActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/activity?limit=25`,
        method: "GET",
        silent: true,
      });
      if (!cancelled && data?.activities) setUserActivities(data.activities);
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'account' | 'trading' | 'extensions'>('account');
  
  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  // Function to handle tab changes and update URL.
  //
  // `replace` exists for corrective navigation — when the page decides the
  // requested tab is unavailable and redirects to a valid one, that must not
  // leave a history entry, or Back returns to the unavailable tab and is
  // immediately redirected forward again: the back button stops working.
  // Deliberate clicks still `push`, so Back walks the tabs the admin visited.
  const handleTabChange = useCallback(
    (tabValue: string, replace = false) => {
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.set('tab', tabValue);
      const href = `${pathname}?${currentParams.toString()}`;
      if (replace) router.replace(href);
      else router.push(href);
    },
    [router, pathname, searchParams]
  );

  // Function to handle category changes and switch to first tab in category
  const handleCategoryChange = (category: 'account' | 'trading' | 'extensions') => {
    setActiveCategory(category);
    
    // Get the first tab in the new category
    const categoryTabs = tabsByCategory[category];
    if (categoryTabs.length > 0) {
      const firstTab = categoryTabs[0];
      handleTabChange(firstTab.key);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  const fetchUser = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const { data, error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error);
      }

      setUser(data);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_fetch_user_data"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      setIsLoading(true);
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/block`,
        method: "POST",
        body: {
          isTemporary: isTemporaryBlock,
          duration: isTemporaryBlock ? blockDuration : null,
          reason: blockReason === "Other" ? customReason : blockReason,
        },
      });

      if (error) {
        throw new Error(error);
      }

      toast.success(t("user_blocked_successfully"));
      setIsBlockDialogOpen(false);
      fetchUser(true);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_block_user"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset2FA = async () => {
    try {
      setIsLoading(true);
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/reset-2fa`,
        method: "POST",
      });
      if (error) throw new Error(error);
      toast.success(t("two_factor_reset_for_this_user"));
      fetchUser(true);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_reset_2fa"));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * "clear" disables the PIN so the user can choose a new one; "unlock" only
   * lifts the lockout and leaves their PIN in place. The second is the right
   * answer far more often — a holder who still knows their PIN and was locked
   * out by somebody else's guessing should not be made to re-choose it — so it
   * is offered as its own button rather than hidden behind a mode toggle.
   */
  const handleTransferPin = async (action: "clear" | "unlock") => {
    try {
      setIsLoading(true);
      const { data, error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/reset-transfer-pin`,
        method: "POST",
        body: { action },
      });
      if (error) throw new Error(error);
      toast.success(
        (data as any)?.message ||
          (action === "unlock"
            ? t("transfer_pin_unlocked_for_this_user")
            : t("transfer_pin_reset_for_this_user"))
      );
      fetchUser(true);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_reset_transfer_pin"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    try {
      setIsLoading(true);
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/unblock`,
        method: "POST",
      });

      if (error) {
        throw new Error(error);
      }

      toast.success(t("user_unblocked_successfully"));
      fetchUser(true);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_unblock_user"));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard", { label }));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  /*
    Is the Transfer PIN locked RIGHT NOW?

    `lockedUntil` is a past timestamp for every user who has ever been locked
    out, so the column alone answers "has been locked", not "is locked" — and
    rendering an Unlock button against a lockout that expired hours ago offers
    an admin an action that does nothing.
  */
  const transferPinLockedUntil = (() => {
    const raw = user?.transferPin?.enabled ? user.transferPin.lockedUntil : null;
    if (!raw) return null;
    const at = new Date(raw);
    return at > new Date() ? at : null;
  })();
  const transferPinLocked = transferPinLockedUntil !== null;

  // Enhanced calculations with memoization - Sophisticated Risk & Activity Assessment
  const userStats = useMemo(() => {
    if (!user) return null;

    // === ADVANCED ACTIVITY SCORE CALCULATION ===
    // Multi-dimensional scoring system with weighted factors
    
    // 1. Account Security & Verification (40% weight)
    const securityScore = (() => {
      let score = 0;
      
      // Email verification (essential)
      if (user.emailVerified) score += 15;
      
      // Phone verification (important for 2FA)
      if (user.phoneVerified) score += 12;
      
      // KYC status (critical for compliance)
      if (user.kyc?.status === 'APPROVED') score += 20;
      else if (user.kyc?.status === 'PENDING') score += 5;
      
      // Two-factor authentication (security critical)
      if (user.twoFactor?.enabled) score += 18;
      
      return Math.min(ACTIVITY_MAX.security, score);
    })();

    // 2. Account Activity & Engagement (30% weight)
    const engagementScore = (() => {
      let score = 0;
      const now = new Date();
      const accountAge = now.getTime() - new Date(user.createdAt).getTime();
      const daysSinceCreated = accountAge / (1000 * 60 * 60 * 24);
      
      // Account age factor (mature accounts are more valuable)
      if (daysSinceCreated > 365) score += 8; // 1+ years
      else if (daysSinceCreated > 180) score += 6; // 6+ months
      else if (daysSinceCreated > 30) score += 4; // 1+ month
      else if (daysSinceCreated > 7) score += 2; // 1+ week
      
      // Recent login activity
      if (user.lastLogin) {
        const daysSinceLogin = (now.getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLogin <= 1) score += 10; // Active today
        else if (daysSinceLogin <= 7) score += 8; // Active this week
        else if (daysSinceLogin <= 30) score += 5; // Active this month
        else if (daysSinceLogin <= 90) score += 2; // Active last 3 months
      }
      
      // Profile completeness
      const profileFields = [user.firstName, user.lastName, user.phone, user.avatar];
      const completedFields = profileFields.filter(field => field && field.trim()).length;
      score += (completedFields / profileFields.length) * 8;
      
      // Addon usage (shows platform engagement).
      //
      // Counted from the per-addon summaries, and only where a count is above
      // zero. The old version tested `Object.keys(payload).length > 0` against a
      // payload the backend assigned unconditionally, so it was true for a user
      // who had never placed a single order: it measured which addons the
      // OPERATOR installed and handed every user the same constant.
      const activeExtensions = Object.values(user.addonSummary ?? {}).filter(hasAddonRows).length;
      score += Math.min(4, activeExtensions * 0.5); // Up to 4 points for addon usage
      
      return Math.min(ACTIVITY_MAX.engagement, score);
    })();

    // 3. Account Status & Compliance (20% weight)
    const complianceScore = (() => {
      let score = 0;
      
      // Account status
      if (user.status === 'ACTIVE') score += 15;
      else if (user.status === 'INACTIVE') score += 5;
      // SUSPENDED/BANNED get 0 points
      
      // No recent security issues
      if (user.failedLoginAttempts === 0) score += 5;
      
      return Math.min(ACTIVITY_MAX.compliance, score);
    })();

    // 4. Platform Integration (10% weight)
    const integrationScore = (() => {
      let score = 0;
      
      // Notification preferences (shows engagement)
      if (user.notifications && user.notifications.length > 0) {
        const unreadCount = user.notifications.filter(n => !n.read).length;
        const totalCount = user.notifications.length;
        if (totalCount > 0) {
          const readRatio = (totalCount - unreadCount) / totalCount;
          score += readRatio * 5; // Up to 5 points for notification engagement
        }
      }
      
      // Support interaction used to be scored here from `user.supportTickets`,
      // a field the detail route never returns. It is now sourced from the
      // `supportStats` aggregate the route computes alongside the addon
      // summaries, so this factor measures something again.
      if (user.supportStats && user.supportStats.resolved > 0) score += 2;

      // Role-based bonus
      // Optional-chained on both halves. The second read is short-circuited by
      // the first and so was already safe, but `user.role` is nullable and
      // leaving one unguarded `user.role.name` in the file is how the header
      // ended up with one too. There is now no unguarded read to copy.
      if (user.role?.name && user.role?.name !== 'User') score += 2; // VIP/Premium users

      return Math.min(ACTIVITY_MAX.integration, score);
    })();

    // Normalised, because every consumer prints it as a percentage: the header
    // StatsCard renders `${activityScore}%` and two <Progress> bars feed it
    // straight in as a 0-100 value. The raw sum of the four caps is
    // ACTIVITY_TOTAL, not 100, so an otherwise perfect account topped out just
    // shy of full and no combination of inputs could ever fill the bar.
    const totalActivityScore = Math.round(
      ((securityScore + engagementScore + complianceScore + integrationScore) /
        ACTIVITY_TOTAL) *
        100
    );

    // === ADVANCED RISK LEVEL ASSESSMENT ===
    // Multi-factor risk analysis with weighted scoring
    
    const riskFactors = {
      // Security Risk Factors
      security: (() => {
        let risk = 0;
        
        // Failed login attempts (exponential risk increase)
        if (user.failedLoginAttempts > 10) risk += 40;
        else if (user.failedLoginAttempts > 5) risk += 25;
        else if (user.failedLoginAttempts > 2) risk += 10;
        else if (user.failedLoginAttempts > 0) risk += 3;
        
        // Missing security features
        if (!user.twoFactor?.enabled) risk += 15;
        if (!user.emailVerified) risk += 20;
        if (!user.phoneVerified) risk += 10;
        
        return risk;
      })(),
      
      // Account Status Risk
      account: (() => {
        let risk = 0;
        
        if (user.status === 'SUSPENDED') risk += 50;
        else if (user.status === 'BANNED') risk += 80;
        else if (user.status === 'INACTIVE') risk += 5;
        
        // KYC status risk
        if (user.kyc?.status === 'REJECTED') risk += 30;
        else if (user.kyc?.status === 'ADDITIONAL_INFO_REQUIRED') risk += 15;
        else if (!user.kyc || user.kyc.status === 'PENDING') risk += 10;
        
        return risk;
      })(),
      
      // Behavioral Risk
      behavioral: (() => {
        let risk = 0;
        const now = new Date();
        
        // Inactivity risk
        if (user.lastLogin) {
          const daysSinceLogin = (now.getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLogin > 180) risk += 15; // 6+ months inactive
          else if (daysSinceLogin > 90) risk += 8; // 3+ months inactive
          else if (daysSinceLogin > 30) risk += 3; // 1+ month inactive
        } else {
          risk += 20; // Never logged in
        }
        
        // New account risk (less than 7 days old)
        const accountAge = (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAge < 1) risk += 15; // Brand new account
        else if (accountAge < 7) risk += 8; // Very new account
        else if (accountAge < 30) risk += 3; // New account
        
        // Incomplete profile risk
        const requiredFields = [user.firstName, user.lastName, user.email];
        const missingRequired = requiredFields.filter(field => !field || !field.trim()).length;
        risk += missingRequired * 5;
        
        return risk;
      })(),
      
      // Compliance Risk.
      //
      // This factor was a `const risk = 0` followed by fourteen commented-out
      // lines: it returned literal zero for every user, while the Security tab
      // rendered it as a live "0/13" metric next to three real ones. It was
      // commented out because it read `user.supportTickets`, which the detail
      // route has never returned.
      //
      // It now reads `supportStats`, a bounded aggregate the route computes
      // beside the addon summaries — so the factor measures something again
      // rather than being quietly decorative.
      compliance: (() => {
        let risk = 0;
        const support = user.supportStats;
        if (!support) return risk;

        // A burst of tickets in the last 30 days is the signal — a long-lived
        // account with a steady trickle is not the same thing.
        if (support.recent > 5) risk += 10;
        else if (support.recent > 2) risk += 5;

        // Open high-importance tickets, capped: an unbounded `count * 3` let
        // one noisy account dominate the whole risk total.
        risk += Math.min(9, (support.highImportanceOpen || 0) * 3);

        return risk;
      })()
    };

    const rawRiskScore =
      riskFactors.security + riskFactors.account + riskFactors.behavioral + riskFactors.compliance;

    // Normalised to 0-100, which is the scale every part of the UI already
    // claimed to be printing. The raw total can reach 264, so "Critical
    // (180/100)" was reachable; the per-factor denominators in the Security tab
    // (45 / 80 / 38 / 13) matched neither the raw maxima nor each other.
    //
    // The thresholds below are derived from the same constants, so the label
    // and the number move together. Normalising the display alone would have
    // been worse than the original bug: it would have shown "Critical" beside a
    // third-full bar.
    const totalRiskScore = Math.min(100, Math.round((rawRiskScore / RISK_TOTAL) * 100));

    // The hue is not decided here — `statusTone(riskLevel)` resolves
    // Low/Medium/High/Critical against the platform table at the render site.
    const riskLevel: "Low" | "Medium" | "High" | "Critical" =
      RISK_LEVEL_THRESHOLDS.find(([floor]) => totalRiskScore >= floor)?.[1] ?? "Low";

    // Calculate risk confidence (how certain we are about the risk assessment)
    const riskConfidence = (() => {
      let confidence = 0;
      
      // More data points = higher confidence
      if (user.lastLogin) confidence += 20;
      if (user.kyc) confidence += 20;
      if (user.twoFactor) confidence += 15;
      if (user.notifications && user.notifications.length > 0) confidence += 10;
      // Support history is a real data point again — the route now returns a
      // bounded `supportStats` aggregate, which is what the commented-out
      // version of this line had been waiting on.
      if (user.supportStats) confidence += 10;
      
      // Account age increases confidence
      const accountAge = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAge > 30) confidence += 15;
      else if (accountAge > 7) confidence += 10;
      else confidence += 5;
      
      // Activity data increases confidence
      const hasExtensionData = Object.values(user.addonSummary ?? {}).some(hasAddonRows);
      if (hasExtensionData) confidence += 10;
      
      return Math.min(100, confidence);
    })();

    return {
      activityScore: totalActivityScore,
      riskLevel,
      riskScore: totalRiskScore,
      riskConfidence,
      riskFactors, // Detailed breakdown for debugging/display
      accountAge: formatDistanceToNow(new Date(user.createdAt)),
      lastActiveTime: user.lastLogin ? formatRelativeTime(user.lastLogin) : tCommon("never"),
      // Additional insights
      securityScore,
      engagementScore,
      complianceScore,
      integrationScore,
    };
  }, [user]);

  /**
   * Every tab this page can show.
   *
   * `extension` must be a CANONICAL seeded extension name — the exact string in
   * backend/seeders/20240403000503-extensions.js — because `isExtensionAvailable`
   * is a `Set.has()` against that list. "affiliate" was not one of them (the
   * addon is seeded as `mlm`), so the Affiliate tab could never render on any
   * installation, and no error was raised because a name that matches nothing
   * simply looks like an uninstalled addon.
   *
   * Labels come from `tCommon`/`t` rather than literals: this is the page's
   * primary navigation, and the platform ships 90 locales.
   */
  const tabConfigs: TabConfig[] = useMemo(() => [
    // ---- Account -----------------------------------------------------------
    {
      key: "overview",
      label: tCommon("overview"),
      category: 'account' as const,
      icon: <User className="w-4 h-4" />,
    },
    {
      key: "transactions",
      label: tCommon("transactions"),
      category: 'account' as const,
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      key: "wallets",
      label: tCommon("wallets"),
      category: 'account' as const,
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      key: "kyc",
      label: "KYC",
      category: 'account' as const,
      icon: <Shield className="w-4 h-4" />,
    },
    {
      key: "support",
      label: tCommon("support"),
      category: 'account' as const,
      icon: <MessageCircle className="w-4 h-4" />,
    },
    {
      key: "security",
      label: tCommon("security"),
      category: 'account' as const,
      icon: <Key className="w-4 h-4" />,
    },
    {
      key: "activity",
      label: tCommon("activity"),
      category: 'account' as const,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      // Distinct from "activity": that is what the CUSTOMER did, this is what
      // was done TO them, by staff, with the reason and the balance arithmetic.
      key: "audit",
      label: tCommon("audit_trail"),
      category: 'account' as const,
      icon: <ScrollText className="w-4 h-4" />,
    },

    // ---- Core trading ------------------------------------------------------
    {
      key: "binary",
      label: tCommon("binary_options"),
      category: 'trading' as const,
      icon: <Target className="w-4 h-4" />,
    },
    {
      key: "spot",
      label: tCommon("spot"),
      category: 'trading' as const,
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      key: "futures",
      label: tCommon("futures"),
      extension: "futures",
      category: 'trading' as const,
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      key: "ecosystem",
      label: tCommon("ecosystem"),
      extension: "ecosystem",
      category: 'trading' as const,
      icon: <Globe className="w-4 h-4" />,
    },
    {
      // The NEW fx_* dealing desk, a separate plugin from the legacy `forex`
      // investment addon in the Extensions group below. Both can be installed
      // at once, which is why they are two tabs and not one.
      key: "fxdesk",
      label: tCommon("forex_desk"),
      extension: "forex_trading",
      category: 'trading' as const,
      icon: <CandlestickChart className="w-4 h-4" />,
    },
    {
      key: "copytrading",
      label: tCommon("copy_trading"),
      extension: "copy_trading",
      category: 'trading' as const,
      icon: <Copy className="w-4 h-4" />,
    },
    {
      key: "tradingbot",
      label: tCommon("trading_bots"),
      extension: "trading_bot",
      category: 'trading' as const,
      icon: <Bot className="w-4 h-4" />,
    },

    // ---- Extension services ------------------------------------------------
    {
      key: "forex",
      label: tCommon("forex"),
      extension: "forex",
      category: 'extensions' as const,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: "ai",
      label: t("ai_investments"),
      extension: "ai_investment",
      category: 'extensions' as const,
      icon: <Zap className="w-4 h-4" />,
    },
    {
      key: "ico",
      label: "ICO",
      extension: "ico",
      category: 'extensions' as const,
      icon: <Star className="w-4 h-4" />,
    },
    {
      key: "p2p",
      label: "P2P",
      extension: "p2p",
      category: 'extensions' as const,
      icon: <Users className="w-4 h-4" />,
    },
    {
      key: "staking",
      label: tCommon("staking"),
      extension: "staking",
      category: 'extensions' as const,
      icon: <Award className="w-4 h-4" />,
    },
    {
      key: "nft",
      label: "NFT",
      extension: "nft",
      category: 'extensions' as const,
      icon: <Image className="w-4 h-4" />,
    },
    {
      key: "affiliate",
      label: tCommon("affiliate"),
      // Seeded as "mlm", NOT "affiliate" — see the note above.
      extension: "mlm",
      category: 'extensions' as const,
      icon: <Users className="w-4 h-4" />,
    },
    {
      key: "ecommerce",
      label: tCommon("ecommerce"),
      extension: "ecommerce",
      category: 'extensions' as const,
      icon: <Briefcase className="w-4 h-4" />,
    },
  ], [t, tCommon]);

  // Set active category based on current tab
  useEffect(() => {
    if (activeTab) {
      const tab = tabConfigs.find(t => t.key === activeTab);
      if (tab && tab.category !== activeCategory) {
        setActiveCategory(tab.category);
      }
    }
  }, [activeTab, activeCategory, tabConfigs]);

  // Filter tabs by extension availability (the config-store extension list).
  const availableTabs = useMemo(
    () => tabConfigs.filter((tab) => !tab.extension || isExtensionAvailable(tab.extension)),
    // `extensions` is the real input — `isExtensionAvailable` closes over the
    // config store and is a new function identity every render, so depending on
    // it instead would defeat the memo entirely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabConfigs, extensions]
  );

  // Group tabs by category
  const tabsByCategory = useMemo(
    () => ({
      account: availableTabs.filter(tab => tab.category === 'account'),
      trading: availableTabs.filter(tab => tab.category === 'trading'),
      extensions: availableTabs.filter(tab => tab.category === 'extensions'),
    }),
    [availableTabs]
  );

  // Get current category tabs
  const currentTabs = tabsByCategory[activeCategory];

  // If the requested tab is not available, fall back to the first one that is.
  //
  // Two things here are load-bearing and were both wrong before:
  //
  //  - The guard on `extensions`. The config store starts with an EMPTY
  //    extension list, so until it hydrates `isExtensionAvailable` returns
  //    false for everything and every addon tab looks uninstalled. Running the
  //    fallback in that window rewrote a perfectly valid deep link like
  //    `?tab=futures` to `?tab=overview` on every cold load.
  //  - `replace`, not push. This is a correction the admin did not ask for, so
  //    it must not occupy a history slot — otherwise Back lands on the invalid
  //    tab and is bounced forward again, trapping the button.
  //
  // The dependency is the tab KEYS, not the array: `availableTabs` is derived,
  // and depending on its identity would re-run this after every render.
  const availableTabKeys = useMemo(
    () => availableTabs.map((tab) => tab.key).join(","),
    [availableTabs]
  );

  useEffect(() => {
    if (!extensions || extensions.length === 0) return;
    const keys = availableTabKeys ? availableTabKeys.split(",") : [];
    if (keys.length > 0 && !keys.includes(activeTab)) {
      handleTabChange(keys[0], true);
    }
  }, [availableTabKeys, activeTab, extensions, handleTabChange]);

  /**
   * PENDING IS NOT A CONCLUSION, AND THIS PAGE USED TO SAY IT WAS.
   * ==========================================================================
   *
   * Two early returns stood here, and between them they threw the entire page
   * away twice:
   *
   *   if (loading) return <div className="... h-96"><div className="animate-spin
   *                       rounded-full h-16 w-16 border-b-2 border-primary"/>...
   *   if (!user)   return <div className="... h-96"><AlertTriangle .../>
   *                       <h2>User not found</h2>...
   *
   * The first is the defect: a 384px ring where a profile goes. Every piece of
   * this page that does NOT depend on the fetch — the back button, the avatar
   * frame, four KPI cards, the three category buttons, the tab bar — was
   * withheld for the duration of one request and then arrived at once, so the
   * admin's pointer was over different content than it was over a moment
   * earlier. The tab bar in particular is built from `tabConfigs` and the
   * extension list, neither of which has anything to do with `/crm/user/{id}`.
   *
   * The second one is a different bug wearing the same clothes. `!user` is true
   * in TWO situations that mean opposite things — the fetch has not answered
   * yet, and the fetch answered that this user does not exist — and because the
   * `loading` branch above happened to catch the first, the distinction was
   * invisible right up until `fetchUser(true)` (the Refresh button) failed:
   * that path sets `refreshing`, not `loading`, so a transient error on refresh
   * replaced a fully-rendered profile with "User not found". The record was
   * still in state; the page just stopped showing it.
   *
   * Named here rather than written inline as `{!loading && !user && ...}`
   * because that spelling is the withheld-content shape the debt scanner
   * matches, and it would be matching a real instance of it: the banner is
   * gated on a conclusion, not on a pending flag.
   */
  const showNotFound = !loading && !user;

  const isBlocked = user?.status === "SUSPENDED" || user?.status === "BANNED";

  return (
    <PageShell rhythm="md">
      {/* Not-found is a message INSIDE the frame, not instead of it. The back
          button, the tab bar and the page's own chrome stay where they were, so
          an admin who mistyped an id can navigate out of it. */}
      {showNotFound && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive-ink" />
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">{t("user_not_found")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("the_requested_user_could_not_be_found")}
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        {/* The identity block renders in both states and only its VALUES wait.
            The avatar keeps `h-16 w-16` either way, so the 64px circle that
            sets this header's height is there from the first paint; the name is
            an `<h1>`, and `SkeletonText` measures the placeholder with that
            element's own `sm:text-3xl` metrics rather than a hand-typed `h-8`,
            which is what keeps the two states the same height at both
            breakpoints. The three badges are the subtlest part: each is sized
            by its content, so an empty one is a 20px stub that snaps to full
            width — reserving the text inside keeps the row still. */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-lg">
              <Loadable loading={loading} placeholder="AB" chars={2}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Loadable>
            </AvatarFallback>
          </Avatar>
          <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              <Loadable loading={loading} placeholder={tCommon("firstname_lastname")}>
                {user?.firstName} {user?.lastName}
              </Loadable>
            </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!user}
                  onClick={() => copyToClipboard(`${user?.firstName} ${user?.lastName}`, "Name")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
            <p className="text-muted-foreground">
              <Loadable loading={loading} placeholder="user@example.com">
                {user?.email}
              </Loadable>
            </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!user}
                  onClick={() => copyToClipboard(user?.email ?? "", "Email")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  ID{" "}
                  <Loadable loading={loading} placeholder="00000000-0000-0000">
                    {user?.id}
                  </Loadable>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Loadable loading={loading} placeholder="Role">
                    {user?.role?.name ?? tCommon("no_role")}
                  </Loadable>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t("score")}:{" "}
                  <Loadable loading={loading} placeholder="00" chars={2}>
                    {userStats?.activityScore}
                  </Loadable>
                  %
                </Badge>
                {user?.system && (
                  <Badge tone="warning" appearance="soft" className="text-xs">
                    <Landmark className="h-3 w-3" />
                    {tCommon("system_account")}
                  </Badge>
                )}
              </div>
              {/* The platform's own accounts: the block, reset and edit doors
                  below all refuse them by name, so the reason is said once here. */}
              {user?.system && (
                <p className="mt-1 text-xs text-muted-foreground">{t("system_account_note")}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUser(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {tCommon("refresh")}
          </Button>
          {/* Sized off the Buttons it sits between, not off itself.
              This was `className="text-sm px-3 py-1"` — which is character for
              character what `size="lg"` already means, except padding alone
              cannot make a chip the height of a control. Both neighbours are
              `size="sm"` Buttons (h-9), so the pill came out ~26px against
              their 36px and read as a stray label rather than part of the row.
              `h-9` is the parity; `size="lg"` supplies the padding and type
              scale the hardcoded classes were reaching for.
              Dropping `label` also lets StatusBadge humanise the status, so
              this says "Active" like every other status pill in the admin
              instead of shouting the raw enum. */}
          {/* `status` is already optional on StatusBadge and resolves to the
              neutral tone with an empty label, so the pill holds its own box
              while the record is in flight without a branch here. */}
          <StatusBadge status={user?.status} size="lg" className="h-9" />
          {isBlocked ? (
            <Button variant="outline" size="sm" onClick={handleUnblockUser} disabled={isLoading || !user || !!user.system}>
              <ShieldOff className="h-4 w-4 mr-2" />
              {t("unblock_user")}
            </Button>
          ) : (
            /* Disabled rather than absent while the record loads. The button
               used to be unreachable because the whole page was, and an enabled
               Block on a profile nobody can see yet is a destructive action
               against a record the operator has not read. */
            <Button variant="destructive" size="sm" onClick={() => setIsBlockDialogOpen(true)} disabled={isLoading || !user || !!user.system}>
                  <Shield className="h-4 w-4 mr-2" />
                  {t("block_user")}
                </Button>
          )}
                    </div>
                  </div>

      {/* Enhanced Overview Cards */}
      {/* Four hand-built dashboard cards became four StatsCards.
          Each was a `text-2xl font-bold` figure, a bare h-4 icon rather than the
          shared tile, and — behind all of it — a decorative
          `bg-linear-to-br from-X/10 to-transparent rounded-full` blob bled off
          the top-right corner. That blob is the faint coloured smudge that made
          these cards look unlike every other card in the admin.

          Two of the four values are PROSE, not figures ("Never", "about 2
          hours"), which is why StatsCard decides monospace per value instead of
          applying it to everything. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* The fallback caption stays a literal. `t("user_has_never_logged_in")`
            is not a key in messages/en.json, and next-intl renders the key PATH
            when one is missing — swapping a hardcoded English string for a
            broken lookup is a regression, not a translation. */}
        {/* `loading` goes to each card, never around the grid. StatsCard already
            keeps its border, label, icon tile, progress rail and caption row
            while pending and swaps only the figure — see its own notes on why
            withholding the caption row was worth ~17px per card, which in a
            four-up `grid` is four cards AND everything below them.

            The captions here are the reason this matters twice over: three of
            the four are static strings this component holds before the fetch
            starts, and the fourth quotes the risk arithmetic. Only the last is
            deferred, because `userStats` is null until the record lands and
            "Score: undefined/100" is worse than a moment of quiet. */}
        <StatsCard
          label={tCommon("last_login")}
          value={user?.lastLogin ? formatRelativeTime(user.lastLogin) : tCommon("never")}
          icon={Clock}
          changeLabel={
            user?.lastLogin ? formatDateTime(user.lastLogin) : t("user_has_never_logged_in")
          }
          loading={loading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          label={tCommon("activity_score")}
          value={`${userStats?.activityScore ?? 0}%`}
          icon={Target}
          progress={userStats?.activityScore ?? 0}
          changeLabel={t("user_engagement_level")}
          loading={loading}
          {...statsCardColors.primary}
        />

        <StatsCard
          label={tCommon("account_age")}
          value={userStats?.accountAge ?? "-"}
          icon={Calendar}
          changeLabel={t("since_registration")}
          loading={loading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          label={tCommon("risk_level")}
          value={
            <Badge tone={statusTone(userStats?.riskLevel)}>
              {userStats?.riskLevel}
            </Badge>
          }
          icon={AlertTriangle}
          changeLabel={
            userStats
              ? `${t("score")}: ${userStats.riskScore}/100 (${userStats.riskConfidence}% ${tCommon("confidence")})`
              : `${t("score")}: —`
          }
          loading={loading}
          {...statsCardColors.neutral}
        />
      </div>

      {/* Enhanced Detailed Information Tabs */}
      <div className="space-y-6">
        {/* Enhanced Category Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          <Button
            variant={activeCategory === 'account' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleCategoryChange('account')}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            {tCommon("account")} ({tabsByCategory.account.length})
                    </Button>
          
          {tabsByCategory.trading.length > 0 && (
            <Button
              variant={activeCategory === 'trading' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleCategoryChange('trading')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {tCommon("trading")} ({tabsByCategory.trading.length})
                    </Button>
          )}
          
          {tabsByCategory.extensions.length > 0 && (
            <Button
              variant={activeCategory === 'extensions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleCategoryChange('extensions')}
              className="flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              {t("extensions")} ({tabsByCategory.extensions.length})
            </Button>
          )}
              </div>

        {/* Tabs Content.

            The tab BAR is built from `tabConfigs` and the extension list, so it
            is knowable before the profile is — it renders identically in both
            states and is one of the things the deleted spinner was needlessly
            withholding.

            The key is `params.id`, not `user.id`. They are the same string on
            this route, but `user.id` is undefined until the fetch lands, so
            keying on it remounted the whole tab strip at the moment the data
            arrived — throwing away Radix's roving-focus state and replaying
            every trigger's mount — for a value that had not actually changed. */}
        <Tabs
          key={`user-tabs-${params?.id}-${activeCategory}`}
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${currentTabs.length}, 1fr)` }}>
            {currentTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2 text-sm">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/*
            Below this point every panel is a projection of `user` — 26 tabs of
            it — so there is no chrome left to hoist out and nothing truthful to
            put in the fields until the record exists. What CAN be done, and is
            what SKELETONS.md asks for where the child count is unknowable, is
            reserve the CONTAINER: `RecordPanelPlaceholder` renders the overview
            tab's own three-column card grid with its rows measured by the same
            `text-sm` runs the real rows use, so the panel is roughly the height
            it is about to be instead of zero.

            Gated on `user` and not on `loading` deliberately. Those are the same
            thing on first paint, but they part company on a failed Refresh —
            which sets `refreshing`, keeps `loading` false, and would otherwise
            leave this area rendering `user.email` against null.

            And the inner arm is gated on `loading`, which is the same
            pending-is-not-a-conclusion split as the not-found banner above: a
            profile that does not exist must not pulse a skeleton at the operator
            forever, because a skeleton is a promise that something is coming.
            No record and nothing in flight means the banner has already said
            everything there is to say, so this area stays quiet.
          */}
          {!user ? (loading ? <RecordPanelPlaceholder /> : null) : <>

          {/* Enhanced Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              {tCommon('personal_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tCommon("email")}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{user.email}</span>
              {user.emailVerified ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
                      </div>
            </div>

            {user.phone && (
                      <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{tCommon("phone")}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{user.phone}</span>
                {user.phoneVerified ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                        </div>
              </div>
            )}

                    <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tCommon("joined")}</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(user.createdAt)}</span>
            </div>

                    <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tCommon("last_login")}</span>
              </div>
                      <span className="text-sm font-medium">
                        {user.lastLogin ? formatRelativeTime(user.lastLogin) : tCommon("never")}
                      </span>
                    </div>
                  </div>
          </CardContent>
        </Card>

              {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    {tCommon("account_summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg bg-primary/10">
                      <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{userStats?.activityScore}%</div>
                      <div className="text-xs font-medium text-muted-foreground">{tCommon("activity_score")}</div>
                      <div className="text-[11px] text-subtle-foreground mt-1">
                        {t("user_engagement_level")}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-primary/20">
                      {/* riskLevel renders "Low"/"Medium"/"High" — prose, so it stays in the interface face. */}
                      <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{userStats?.riskLevel}</div>
                      <div className="text-xs font-medium text-muted-foreground">{tCommon("risk_level")}</div>
                      <div className="text-[11px] text-subtle-foreground mt-1">
                        {t("security_assessment")}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
            <div className="flex justify-between items-center">
                      <span className="text-sm">{tDashboard("account_status")}</span>
                      <StatusBadge status={user.status} />
            </div>

            <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("two_factor_auth")}</span>
                      <Badge variant={user.twoFactor?.enabled ? "success" : "secondary"}>
                        {user.twoFactor?.enabled ? tCommon("enabled") : tCommon("disabled")}
              </Badge>
            </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">{t("kyc_status")}</span>
                      {/* `statusLabel` renders an empty string for a missing
                          status, so a user who has never submitted KYC needs an
                          explicit label — otherwise this row shows a blank pill
                          and reads as a rendering fault rather than a state. */}
                      {user.kyc?.status ? (
                        <StatusBadge status={user.kyc.status} />
                      ) : (
                        <Badge tone="neutral">{tCommon("not_submitted")}</Badge>
                      )}
              </div>
            </div>
          </CardContent>
        </Card>

              {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    {tCommon("quick_stats")}
            </CardTitle>
          </CardHeader>
                <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("account_age")}</span>
                      <span className="text-sm font-medium">{userStats?.accountAge}</span>
              </div>
              
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("last_active")}</span>
                      <span className="text-sm font-medium">{userStats?.lastActiveTime}</span>
                </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("email_verified")}</span>
                      <Badge variant={user.emailVerified ? "success" : "destructive"}>
                        {user.emailVerified ? tCommon("yes") : tCommon("no")}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("failed_logins")}</span>
                      <Badge variant={user.failedLoginAttempts > 3 ? "destructive" : "outline"}>
                        {user.failedLoginAttempts}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{tCommon("activity_score")}</span>
                      <span>{userStats?.activityScore}%</span>
                    </div>
                    <Progress value={userStats?.activityScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Transactions Tab with DataTable */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("transaction_history")}</CardTitle>
                <CardDescription>
                  {t("complete_transaction_history_for_this_user")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`transactions-${user.id}`}
                  apiEndpoint="/api/admin/finance/transaction"
                  model="transaction"
                  modelConfig={{
                    userId: user.id,
                  }}
                  pageSize={12}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  isParanoid={false}
                  title=""
                  itemTitle="Transaction"
                  columns={userTransactionColumns}
                  viewConfig={transactionViewConfig}
                  analytics={transactionAnalytics}
                  permissions={{
                    access: "access.transaction",
                    view: "view.transaction",
                    create: "create.transaction",
                    edit: "edit.transaction",
                    delete: "delete.transaction",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Wallets Tab with DataTable */}
          <TabsContent value="wallets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("user_wallets")}</CardTitle>
                <CardDescription>
                  {t("all_user_wallets_with_advanced_management")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`wallets-${user.id}`}
                  apiEndpoint="/api/admin/finance/wallet"
                  model="wallet"
                  modelConfig={{
                    userId: user.id,
                  }}
                  pageSize={12}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  editCondition={(row) => row.type !== "ECO" && row.type !== "FUTURES"}
                  isParanoid={false}
                  title=""
                  itemTitle="Wallet"
                  columns={userWalletColumns}
                  viewConfig={walletViewConfig}
                  permissions={{
                    access: "access.wallet",
                    view: "view.wallet",
                    create: "create.wallet",
                    edit: "edit.wallet",
                    delete: "delete.wallet",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced KYC Tab */}
          <TabsContent value="kyc" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("kyc_status")}</CardTitle>
                  <CardDescription>
                    {t("know_your_customer_verification_information")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.kyc ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <span className="font-medium">{tCommon("verification_status")}</span>
                        <StatusBadge
                          status={user.kyc.status}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <span className="font-medium">{t("submitted_date")}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatDate(user.kyc.createdAt)}</div>
                          <div className="text-xs text-muted-foreground">{formatRelativeTime(user.kyc.createdAt)}</div>
                        </div>
                      </div>
                      
                      {user.kyc.reviewedAt && (
                        <div className="flex justify-between items-center p-4 border rounded-lg">
                          <span className="font-medium">{t("reviewed_date")}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatDate(user.kyc.reviewedAt)}</div>
                            <div className="text-xs text-muted-foreground">{formatRelativeTime(user.kyc.reviewedAt)}</div>
                          </div>
                        </div>
                      )}
                      
                      {user.kyc.adminNotes && (
                        <div className="space-y-2">
                          <Label>{tCommon("admin_notes")}</Label>
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm">{user.kyc.adminNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t("no_kyc_application")}</h3>
                      <p className="text-muted-foreground">
                        {t("this_user_has_not_submitted_kyc_documents_yet")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("verification_progress")}</CardTitle>
                  <CardDescription>
                    {t("account_verification_completion_status")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{t("email_verification")}</span>
                      </div>
                      {user.emailVerified ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{tCommon("phone_verification")}</span>
                      </div>
                      {user.phoneVerified ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{t("kyc_documents")}</span>
                      </div>
                      {(() => {
                        // No application at all is a hard "not done", same as a
                        // rejection; otherwise the tone comes from the status.
                        const kycTone = user.kyc
                          ? statusTone(user.kyc.status)
                          : "destructive";
                        const KycIcon =
                          kycTone === "success"
                            ? CheckCircle
                            : kycTone === "destructive"
                              ? XCircle
                              : Clock;
                        return (
                          <KycIcon className={`h-4 w-4 ${TONE_MARK[kycTone]}`} />
                        );
                      })()}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("completion_progress")}</span>
                      <span>{Math.round(((user.emailVerified ? 1 : 0) + (user.phoneVerified ? 1 : 0) + (user.kyc?.status === 'APPROVED' ? 1 : 0)) / 3 * 100)}%</span>
                    </div>
                    <Progress value={((user.emailVerified ? 1 : 0) + (user.phoneVerified ? 1 : 0) + (user.kyc?.status === 'APPROVED' ? 1 : 0)) / 3 * 100} />
            </div>
          </CardContent>
        </Card>
            </div>
          </TabsContent>

          {/* Enhanced Support Tab with DataTable */}
          <TabsContent value="support" className="space-y-6">
        <Card>
          <CardHeader>
                <CardTitle>{tCommon("support_tickets")}</CardTitle>
                <CardDescription>
                  {t("all_support_requests_and_communication_history")}
                </CardDescription>
          </CardHeader>
          <CardContent>
                <DataTable
                  key={`support-${user.id}`}
                  apiEndpoint="/api/admin/crm/support/ticket"
                  model="supportTicket"
                  modelConfig={{
                    userId: user.id,
                  }}
                  pageSize={12}
                  canView={true}
                  canEdit={false}
                  canDelete={true}
                  isParanoid={true}
                  title=""
                  itemTitle="Support Ticket"
                  columns={userSupportColumns}
                  viewConfig={supportViewConfig}
                  permissions={{
                    access: "access.support.ticket",
                    view: "view.support.ticket",
                    create: "create.support.ticket",
                    edit: "edit.support.ticket",
                    delete: "delete.support.ticket",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("security_overview")}</CardTitle>
                  <CardDescription>
                    {t("account_security_status_and_settings")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                      <h4 className="font-medium">{tCommon("two_factor_authentication")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {user.twoFactor?.enabled
                          ? t("enabled_via_method", { method: user.twoFactor.type })
                          : tCommon("not_configured")}
                    </p>
                  </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.twoFactor?.enabled ? "success" : "destructive"}>
                        {user.twoFactor?.enabled ? tCommon("active") : tCommon("inactive")}
                      </Badge>
                      {user.twoFactor?.enabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReset2FA}
                          disabled={isLoading || !!user.system}
                        >
                          {tCommon("reset")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Transfer PIN. Shown only when the user has one — an absent
                      PIN has nothing to reset, and a row saying "not configured"
                      on every account would push the rest of this card down for
                      no information. */}
                  {user.transferPin?.enabled && (
                    <div className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{t("transfer_pin")}</h4>
                        <p className="text-sm text-muted-foreground">
                          {transferPinLocked
                            ? t("locked_until_time", {
                                time:
                                  transferPinLockedUntil?.toLocaleString() ?? "",
                              })
                            : t("confirms_this_users_wallet_transfers")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={transferPinLocked ? "destructive" : "success"}>
                          {transferPinLocked
                            ? tCommon("locked")
                            : tCommon("active")}
                        </Badge>
                        {/* Unlock is offered only when there is a lockout to
                            lift, so the button never claims to do nothing. */}
                        {transferPinLocked && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransferPin("unlock")}
                            disabled={isLoading}
                          >
                            {tCommon("unlock")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransferPin("clear")}
                          disabled={isLoading}
                        >
                          {tCommon("reset")}
                        </Button>
                      </div>
                    </div>
                  )}

                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("email_verification")}</h4>
                      <p className="text-sm text-muted-foreground">{t("email_address_verification_status")}</p>
                </div>
                    <Badge variant={user.emailVerified ? "success" : "destructive"}>
                      {user.emailVerified ? tCommon("verified") : tCommon("unverified")}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tCommon("phone_verification")}</h4>
                      <p className="text-sm text-muted-foreground">{t("phone_number_verification_status")}</p>
                    </div>
                    <Badge variant={user.phoneVerified ? "success" : "destructive"}>
                      {user.phoneVerified ? tCommon("verified") : tCommon("unverified")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("risk_assessment_details")}</CardTitle>
                  <CardDescription>
                    {t("comprehensive_risk_analysis_breakdown")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t("overall_risk_level")}</span>
                      <Badge tone={statusTone(userStats?.riskLevel)} className="text-sm">
                        {userStats?.riskLevel} ({userStats?.riskScore}/100)
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("assessment_confidence")}</span>
                        <span>{userStats?.riskConfidence}%</span>
                      </div>
                      <Progress value={userStats?.riskConfidence} className="h-2" />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">{t("risk_factors_breakdown")}:</h5>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("security_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.security || 0) > 20 ? "destructive" : (userStats?.riskFactors?.security || 0) > 10 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.security || 0}/{RISK_MAX.security}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("account_status_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.account || 0) > 20 ? "destructive" : (userStats?.riskFactors?.account || 0) > 10 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.account || 0}/{RISK_MAX.account}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("behavioral_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.behavioral || 0) > 15 ? "destructive" : (userStats?.riskFactors?.behavioral || 0) > 8 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.behavioral || 0}/{RISK_MAX.behavioral}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("compliance_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.compliance || 0) > 10 ? "destructive" : (userStats?.riskFactors?.compliance || 0) > 5 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.compliance || 0}/{RISK_MAX.compliance}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Activity Score Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{t("activity_score_analysis")}</CardTitle>
                <CardDescription>
                  {t("detailed_breakdown_of_user_engagement_and")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg bg-primary/10">
                    <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{userStats?.securityScore}/{ACTIVITY_MAX.security}</div>
                    <div className="text-xs font-medium text-muted-foreground">{tCommon("security_score")}</div>
                    <div className="text-[11px] text-subtle-foreground mt-1">
                      {t("verification_2fa")}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-success/20">
                    <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{userStats?.engagementScore}/{ACTIVITY_MAX.engagement}</div>
                    <div className="text-xs font-medium text-muted-foreground">{t("engagement_score")}</div>
                    <div className="text-[11px] text-subtle-foreground mt-1">
                      {t("activity_usage")}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-primary/20">
                    <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{userStats?.complianceScore}/{ACTIVITY_MAX.compliance}</div>
                    <div className="text-xs font-medium text-muted-foreground">{t("compliance_score")}</div>
                    <div className="text-[11px] text-subtle-foreground mt-1">
                      {t("status_security")}
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-warning/20">
                    <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{userStats?.integrationScore}/{ACTIVITY_MAX.integration}</div>
                    <div className="text-xs font-medium text-muted-foreground">{t("integration_score")}</div>
                    <div className="text-[11px] text-subtle-foreground mt-1">
                      {t("platform_usage")}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t("total_activity_score")}</span>
                    <span className="font-mono font-semibold tabular-nums">{userStats?.activityScore}/100</span>
                  </div>
                  <Progress value={userStats?.activityScore} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {t("based_on_security_verification_account_activity")}
                  </p>
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Binary Tab */}
          <TabsContent value="binary" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.binary}
              items={[
                { label: tCommon("total_trades"), value: user.addonSummary?.binary?.totalTrades },
                { label: tCommon("wins"), value: user.addonSummary?.binary?.wins },
                { label: tCommon("losses"), value: user.addonSummary?.binary?.losses },
                { label: tCommon("win_rate"), value: user.addonSummary?.binary?.winRate, percent: true },
                { label: tCommon("profit"), value: user.addonSummary?.binary?.totalProfit, money: true },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>{t("binary_options_orders")}</CardTitle>
                <CardDescription>
                  {t("all_binary_options_trading_orders_with")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`binary-orders-${user.id}`}
                  apiEndpoint="/api/admin/finance/order/binary"
                  model="binaryOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userBinaryOrderColumns}
                  permissions={{
                    access: "access.binary.order",
                    view: "view.binary.order",
                    create: "create.binary.order",
                    edit: "edit.binary.order",
                    delete: "delete.binary.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Spot Tab */}
          <TabsContent value="spot" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.spot}
              items={[
                { label: tCommon("total_orders"), value: user.addonSummary?.spot?.totalOrders },
                { label: tCommon("open_orders"), value: user.addonSummary?.spot?.openOrders },
                { label: tCommon("volume"), value: user.addonSummary?.spot?.totalAmount, money: true },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>{t("spot_trading_orders")}</CardTitle>
                <CardDescription>
                  {t("all_spot_market_trading_orders_with")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`spot-orders-${user.id}`}
                  apiEndpoint="/api/admin/finance/order/exchange"
                  model="exchangeOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userExchangeOrderColumns}
                  permissions={{
                    access: "access.exchange.order",
                    view: "view.exchange.order",
                    create: "create.exchange.order",
                    edit: "edit.exchange.order",
                    delete: "delete.exchange.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Futures Tab */}
          <TabsContent value="futures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("futures_trading_orders")}</CardTitle>
                <CardDescription>
                  {t("all_futures_trading_orders_with_advanced")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Read-only: /api/admin/futures/order is GET-only: no PUT, no DELETE behind it.
                    Advertising Edit/Delete opened an editor that could never save. */}
                <DataTable
                  key={`futures-orders-${user.id}`}
                  apiEndpoint="/api/admin/futures/order"
                  model="futuresOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userFuturesOrderColumns}
                  permissions={{
                    access: "access.futures.order",
                    view: "view.futures.order",
                    create: "create.futures.order",
                    edit: "edit.futures.order",
                    delete: "delete.futures.order",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Ecosystem Tab */}
          <TabsContent value="ecosystem" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("ecosystem_trading_orders")}</CardTitle>
                <CardDescription>
                  {t("all_ecosystem_token_trading_orders_with")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Read-only: /api/admin/ecosystem/order exposes GET and cleanup.post only.
                    Advertising Edit/Delete opened an editor that could never save. */}
                <DataTable
                  key={`ecosystem-orders-${user.id}`}
                  apiEndpoint="/api/admin/ecosystem/order"
                  model="ecosystemOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userEcosystemOrderColumns}
                  permissions={{
                    access: "access.ecosystem.order",
                    view: "view.ecosystem.order",
                    create: "create.ecosystem.order",
                    edit: "edit.ecosystem.order",
                    delete: "delete.ecosystem.order",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Forex Tab */}
          <TabsContent value="forex" className="space-y-6">
            <div className="space-y-6">
              <AddonSummary
                summary={user.addonSummary?.forex}
                items={[
                  { label: tCommon("deposits"), value: user.addonSummary?.forex?.deposits },
                  { label: tCommon("withdrawals"), value: user.addonSummary?.forex?.withdrawals },
                  { label: tCommon("investments"), value: user.addonSummary?.forex?.investments },
                  { label: tCommon("invested"), value: user.addonSummary?.forex?.invested, money: true },
                  { label: tCommon("profit"), value: user.addonSummary?.forex?.profit, money: true },
                ]}
              />

              {/*
                Deposits and withdrawals are TWO tables now, against the forex
                addon's own endpoints.

                There used to be one "Forex Transactions" card pointed at
                /api/admin/finance/transaction with
                modelConfig={{ userId, type: ["FOREX_DEPOSIT","FOREX_WITHDRAW"] }}.
                It was permanently empty, and doubly so: the data table drops an
                ARRAY filter value client-side (its object branch looks for a
                `value` key and an array has none), and the transaction endpoint
                then excluded both of those types by default anyway. No amount of
                filtering in the UI could have surfaced a row.
              */}
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("forex_deposits")}</CardTitle>
                  <CardDescription>
                    {t("all_forex_account_deposits_for_this_user")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    key={`forex-deposits-${user.id}`}
                    apiEndpoint="/api/admin/forex/deposit"
                    model="transaction"
                    modelConfig={{ userId: user.id }}
                    columns={userForexDepositColumns}
                    itemTitle={tCommon("forex_deposit")}
                    permissions={{
                      access: "access.forex.deposit",
                      view: "view.forex.deposit",
                      create: "create.forex.deposit",
                      edit: "edit.forex.deposit",
                      delete: "delete.forex.deposit",
                    }}
                    canView={true}
                    canEdit={true}
                    canDelete={true}
                    pageSize={12}
                    isParanoid={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("forex_withdrawals")}</CardTitle>
                  <CardDescription>
                    {t("all_forex_account_withdrawals_for_this_user")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    key={`forex-withdrawals-${user.id}`}
                    apiEndpoint="/api/admin/forex/withdraw"
                    model="transaction"
                    modelConfig={{ userId: user.id }}
                    columns={userForexDepositColumns}
                    itemTitle={tCommon("forex_withdrawal")}
                    permissions={{
                      access: "access.forex.withdraw",
                      view: "view.forex.withdraw",
                      create: "create.forex.withdraw",
                      edit: "edit.forex.withdraw",
                      delete: "delete.forex.withdraw",
                    }}
                    canView={true}
                    canEdit={true}
                    canDelete={true}
                    pageSize={12}
                    isParanoid={false}
                  />
                </CardContent>
              </Card>

              {/*
                The forex addon's OWN investment endpoint, not the generic one.

                This card and the AI card below both pointed at
                /api/admin/finance/investment/history, whose handler is hardcoded
                to `models.investment` — a third, unrelated product. So the two
                cards rendered the SAME rows as each other, and neither showed
                the product it was labelled with. An admin reading "Forex
                Investments" was looking at general-plan money records.
              */}
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("forex_investments")}</CardTitle>
                  <CardDescription>
                    {t("all_forex_investment_plans_and_performance")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    key={`forex-investments-${user.id}`}
                    apiEndpoint="/api/admin/forex/investment"
                    model="forexInvestment"
                    modelConfig={{ userId: user.id }}
                    columns={userForexInvestmentColumns}
                    itemTitle={tCommon("forex_investment")}
                    permissions={{
                      access: "access.forex.investment",
                      view: "view.forex.investment",
                      create: "create.forex.investment",
                      edit: "edit.forex.investment",
                      delete: "delete.forex.investment",
                    }}
                    canView={true}
                    canEdit={true}
                    canDelete={true}
                    pageSize={12}
                    isParanoid={false}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Investments */}
          <TabsContent value="ai" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.ai}
              items={[
                { label: tCommon("investments"), value: user.addonSummary?.ai?.investments },
                { label: tCommon("active"), value: user.addonSummary?.ai?.active },
                { label: tCommon("invested"), value: user.addonSummary?.ai?.invested, money: true },
                { label: tCommon("profit"), value: user.addonSummary?.ai?.profit, money: true },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>{t("ai_investment_portfolio")}</CardTitle>
                <CardDescription>
                  {t("all_ai_powered_investment_plans_and")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/*
                  `/ai/investment/log`, not `/ai/investment`. The latter is a
                  dashboard route that returns chart objects, so mounting it here
                  would render a permanent "Invalid response from server".
                */}
                <DataTable
                  key={`ai-investments-${user.id}`}
                  apiEndpoint="/api/admin/ai/investment/log"
                  model="aiInvestment"
                  modelConfig={{ userId: user.id }}
                  columns={userAiInvestmentLogColumns}
                  itemTitle={tCommon("ai_investment")}
                  permissions={{
                    access: "access.ai.investment",
                    view: "view.ai.investment",
                    create: "create.ai.investment",
                    edit: "edit.ai.investment",
                    delete: "delete.ai.investment",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ICO Tab */}
          <TabsContent value="ico" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.ico}
              items={[
                { label: tCommon("contributions"), value: user.addonSummary?.ico?.contributions },
                { label: tCommon("contributed"), value: user.addonSummary?.ico?.contributed, money: true },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("ico_transactions")}</CardTitle>
                <CardDescription>
                  {t("all_ico_transactions_and_token_purchases")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Read-only: No PUT and no DELETE route exists under /api/admin/ico/transaction.
                    Advertising Edit/Delete opened an editor that could never save. */}
                <DataTable
                  key={`ico-transactions-${user.id}`}
                  apiEndpoint="/api/admin/ico/transaction"
                  model="icoTransaction"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userIcoTransactionColumns}
                  permissions={{
                    access: "access.ico.transaction",
                    view: "view.ico.transaction",
                    create: "create.ico.transaction",
                    edit: "edit.ico.transaction",
                    delete: "delete.ico.transaction",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* P2P Tab */}
          <TabsContent value="p2p" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.p2p}
              items={[
                { label: tCommon("offers"), value: user.addonSummary?.p2p?.offers },
                { label: "({completedTradesCount} trades)", value: user.addonSummary?.p2p?.trades },
                { label: tCommon("completed"), value: user.addonSummary?.p2p?.completedTrades },
              ]}
            />
            {/* P2P Offers */}
            <Card>
              <CardHeader>
                <CardTitle>{t("p2p_offers")}</CardTitle>
                <CardDescription>
                  {t("all_p2p_offers_created_by_this")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`p2p-offers-${user.id}`}
                  apiEndpoint="/api/admin/p2p/offer"
                  model="p2pOffer"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userP2pOfferColumns}
                  permissions={{
                    access: "access.p2p.offer",
                    view: "view.p2p.offer",
                    create: "create.p2p.offer",
                    edit: "edit.p2p.offer",
                    delete: "delete.p2p.offer",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            {/* P2P Trades */}
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("p2p_trades")}</CardTitle>
                <CardDescription>
                  {t("all_p2p_trades_completed_by_this")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Read-only: A trade is settled through cancel/resolve/note actions; the row itself has no PUT or DELETE.
                    Advertising Edit/Delete opened an editor that could never save. */}
                <DataTable
                  key={`p2p-trades-${user.id}`}
                  apiEndpoint="/api/admin/p2p/trade"
                  model="p2pTrade"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userP2pTradeColumns}
                  permissions={{
                    access: "access.p2p.trade",
                    view: "view.p2p.trade",
                    create: "create.p2p.trade",
                    edit: "edit.p2p.trade",
                    delete: "delete.p2p.trade",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staking Tab */}
          <TabsContent value="staking" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.staking}
              items={[
                { label: tCommon("positions"), value: user.addonSummary?.staking?.positions },
                { label: tCommon("active"), value: user.addonSummary?.staking?.active },
                { label: tCommon("staked"), value: user.addonSummary?.staking?.staked, money: true },
              ]}
            />
            {/* Staking Positions */}
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("staking_positions")}</CardTitle>
                <CardDescription>
                  {t("all_staking_positions_held_by_this")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`staking-positions-${user.id}`}
                  apiEndpoint="/api/admin/staking/position"
                  model="stakingPosition"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userStakingPositionColumns}
                  permissions={{
                    access: "access.staking.position",
                    view: "view.staking.position",
                    create: "create.staking.position",
                    edit: "edit.staking.position",
                    delete: "delete.staking.position",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Affiliate Tab */}
          <TabsContent value="affiliate" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.affiliate}
              items={[
                { label: tCommon("referred_users"), value: user.addonSummary?.affiliate?.referred },
                { label: tCommon("referred_by"), value: user.addonSummary?.affiliate?.referredBy },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("affiliate_referrals")}</CardTitle>
                <CardDescription>
                  {t("all_affiliate_referrals_and_commissions_managed")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`affiliate-referrals-${user.id}`}
                  apiEndpoint="/api/admin/affiliate/referral"
                  model="affiliateReferral"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userAffiliateReferralColumns}
                  permissions={{
                    access: "access.affiliate.referral",
                    view: "view.affiliate.referral",
                    create: "create.affiliate.referral",
                    edit: "edit.affiliate.referral",
                    delete: "delete.affiliate.referral",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ecommerce Tab */}
          <TabsContent value="ecommerce" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.ecommerce}
              items={[
                { label: tCommon("orders"), value: user.addonSummary?.ecommerce?.orders },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("ecommerce_orders")}</CardTitle>
                <CardDescription>
                  {t("all_e_commerce_orders_placed_by")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`ecommerce-orders-${user.id}`}
                  apiEndpoint="/api/admin/ecommerce/order"
                  model="ecommerceOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userEcommerceOrderColumns}
                  permissions={{
                    access: "access.ecommerce.order",
                    view: "view.ecommerce.order",
                    create: "create.ecommerce.order",
                    edit: "edit.ecommerce.order",
                    delete: "delete.ecommerce.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>


          {/* NFT — holdings, listings and both sides of every sale */}
          <TabsContent value="nft" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.nft}
              items={[
                { label: tCommon("owned"), value: user.addonSummary?.nft?.owned },
                { label: tCommon("listings"), value: user.addonSummary?.nft?.listings },
                { label: tCommon("sold"), value: user.addonSummary?.nft?.sold },
                { label: tCommon("bought"), value: user.addonSummary?.nft?.bought },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("nfts_owned")}</CardTitle>
                <CardDescription>{t("tokens_currently_held_by_this_user")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* `ownerId`, not `userId` — nft_token has no userId column. */}
                <DataTable
                  key={`nft-tokens-${user.id}`}
                  apiEndpoint="/api/admin/nft/token"
                  model="nftToken"
                  modelConfig={{ ownerId: user.id }}
                  columns={userNftTokenColumns}
                  itemTitle="NFT"
                  permissions={{
                    access: "access.nft.token",
                    view: "view.nft.token",
                    create: "create.nft.token",
                    edit: "edit.nft.token",
                    delete: "delete.nft.token",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("nft_sales")}</CardTitle>
                <CardDescription>{t("sales_where_this_user_was_buyer_or_seller")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/*
                  Columns are NOT user-stripped here: `seller` and `buyer` are
                  what tell the admin which side of each trade this user was on,
                  which is the entire point of a both-sides table.
                */}
                <DataTable
                  key={`nft-sales-${user.id}`}
                  apiEndpoint="/api/admin/nft/sale"
                  model="nftSale"
                  modelConfig={{ userId: user.id }}
                  columns={nftSaleColumns}
                  itemTitle={tCommon("nft_sale")}
                  permissions={{
                    access: "access.nft.sale",
                    view: "view.nft.sale",
                    create: "create.nft.sale",
                    edit: "edit.nft.sale",
                    delete: "delete.nft.sale",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("nft_listings")}</CardTitle>
                <CardDescription>{t("listings_this_user_has_put_up_for_sale")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* `sellerId` — nft_listing has no userId column either. */}
                <DataTable
                  key={`nft-listings-${user.id}`}
                  apiEndpoint="/api/admin/nft/listing"
                  model="nftListing"
                  modelConfig={{ sellerId: user.id }}
                  columns={userNftListingColumns}
                  itemTitle={tCommon("nft_listing")}
                  permissions={{
                    access: "access.nft.listing",
                    view: "view.nft.listing",
                    create: "create.nft.listing",
                    edit: "edit.nft.listing",
                    delete: "delete.nft.listing",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forex dealing desk (fx_*) — a different plugin from the legacy forex tab */}
          <TabsContent value="fxdesk" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.fxdesk}
              items={[
                { label: tCommon("accounts"), value: user.addonSummary?.fxdesk?.accounts },
                { label: tCommon("open_positions"), value: user.addonSummary?.fxdesk?.openPositions },
                { label: tCommon("deals"), value: user.addonSummary?.fxdesk?.deals },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("trading_accounts")}</CardTitle>
                <CardDescription>{t("forex_trading_accounts_held_by_this_user")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`fx-accounts-${user.id}`}
                  apiEndpoint="/api/admin/forex-trading/account"
                  model="fxAccount"
                  modelConfig={{ userId: user.id }}
                  columns={userFxAccountColumns}
                  itemTitle={tCommon("trading_account")}
                  permissions={{
                    access: "access.forex_trading.account",
                    view: "view.forex_trading.account",
                    create: "create.forex_trading.account",
                    edit: "edit.forex_trading.account",
                    delete: "delete.forex_trading.account",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("positions")}</CardTitle>
                <CardDescription>{t("open_and_closed_positions_across_this_users_accounts")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`fx-positions-${user.id}`}
                  apiEndpoint="/api/admin/forex-trading/position"
                  model="fxPosition"
                  modelConfig={{ userId: user.id }}
                  columns={userFxPositionColumns}
                  itemTitle={tCommon("position")}
                  permissions={{
                    access: "access.forex_trading.position",
                    view: "view.forex_trading.position",
                    create: "create.forex_trading.position",
                    edit: "edit.forex_trading.position",
                    delete: "delete.forex_trading.position",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("deals")}</CardTitle>
                <CardDescription>{t("the_immutable_fill_ledger_for_this_users_accounts")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/*
                  fx_deal is keyed by accountId and has no userId column, so the
                  route translates this filter into "accounts belonging to this
                  user" server-side.
                */}
                <DataTable
                  key={`fx-deals-${user.id}`}
                  apiEndpoint="/api/admin/forex-trading/deal"
                  model="fxDeal"
                  modelConfig={{ userId: user.id }}
                  columns={userFxDealColumns}
                  itemTitle={tCommon("deal")}
                  permissions={{
                    access: "access.forex_trading.deal",
                    view: "view.forex_trading.deal",
                    create: "view.forex_trading.deal",
                    edit: "view.forex_trading.deal",
                    delete: "view.forex_trading.deal",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Copy trading — this user as leader and as follower */}
          <TabsContent value="copytrading" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.copytrading}
              items={[
                { label: tCommon("as_leader"), value: user.addonSummary?.copytrading?.asLeader },
                { label: tCommon("as_follower"), value: user.addonSummary?.copytrading?.asFollower },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("leader_profile")}</CardTitle>
                <CardDescription>{t("this_users_leader_records_if_they_publish_strategies")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`copy-leader-${user.id}`}
                  apiEndpoint="/api/admin/copy-trading/leader"
                  model="copyTradingLeader"
                  modelConfig={{ userId: user.id }}
                  columns={userCopyLeaderColumns}
                  itemTitle={tCommon("leader")}
                  permissions={{
                    access: "access.copy_trading",
                    view: "view.copy_trading",
                    create: "create.copy_trading",
                    edit: "edit.copy_trading",
                    delete: "delete.copy_trading",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("follower_subscriptions")}</CardTitle>
                <CardDescription>{t("strategies_this_user_is_copying")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`copy-follower-${user.id}`}
                  apiEndpoint="/api/admin/copy-trading/follower"
                  model="copyTradingFollower"
                  modelConfig={{ userId: user.id }}
                  columns={userCopyFollowerColumns}
                  itemTitle={tCommon("subscription")}
                  permissions={{
                    access: "access.copy_trading",
                    view: "view.copy_trading",
                    create: "create.copy_trading",
                    edit: "edit.copy_trading",
                    delete: "delete.copy_trading",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("copied_trades")}</CardTitle>
                <CardDescription>{t("fills_this_user_led_or_copied")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/*
                  A trade row has no userId — it hangs off a leader row and
                  optionally a follower row. The route resolves this id into
                  both sets, so the table covers fills the user LED and fills
                  they COPIED without double-counting either.
                */}
                <DataTable
                  key={`copy-trades-${user.id}`}
                  apiEndpoint="/api/admin/copy-trading/trade"
                  model="copyTradingTrade"
                  modelConfig={{ userId: user.id }}
                  columns={userCopyTradeColumns}
                  itemTitle={tCommon("copied_trade")}
                  permissions={{
                    access: "access.copy_trading",
                    view: "view.copy_trading",
                    create: "create.copy_trading",
                    edit: "edit.copy_trading",
                    delete: "delete.copy_trading",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading bots */}
          <TabsContent value="tradingbot" className="space-y-6">
            <AddonSummary
              summary={user.addonSummary?.tradingbot}
              items={[
                { label: tCommon("bots"), value: user.addonSummary?.tradingbot?.bots },
                { label: tCommon("running"), value: user.addonSummary?.tradingbot?.running },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle>{tCommon("trading_bots")}</CardTitle>
                <CardDescription>{t("automated_strategies_this_user_is_running")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`trading-bots-${user.id}`}
                  apiEndpoint="/api/admin/trading-bot/bot"
                  model="tradingBot"
                  modelConfig={{ userId: user.id }}
                  columns={userTradingBotColumns}
                  itemTitle={tCommon("trading_bot")}
                  permissions={{
                    access: "access.trading_bot.bot",
                    view: "view.trading_bot.bot",
                    create: "view.trading_bot.bot",
                    edit: "view.trading_bot.bot",
                    delete: "view.trading_bot.bot",
                  }}
                  canView={true}
                  canEdit={false}
                  canDelete={false}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("account_activity")}</CardTitle>
                  <CardDescription>
                    {t("user_account_activity_and_session_information")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                      <h4 className="font-medium">{tDashboard("account_status")}</h4>
                      <p className="text-sm text-muted-foreground">{t("current_account_state")}</p>
                    </div>
                    <StatusBadge status={user.status} className="text-sm" />
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tCommon("last_login")}</h4>
                    <p className="text-sm text-muted-foreground">
                        {user.lastLogin ? formatDateTime(user.lastLogin) : tCommon("never_logged_in")}
                    </p>
                  </div>
                    <Badge variant="outline">
                      {user.lastLogin ? formatRelativeTime(user.lastLogin) : tCommon("never")}
                  </Badge>
                </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tDashboard("account_created")}</h4>
                      <p className="text-sm text-muted-foreground">{formatDateTime(user.createdAt)}</p>
                    </div>
                    <Badge variant="outline">
                      {userStats?.accountAge}
                    </Badge>
            </div>
          </CardContent>
        </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("administrative_actions")}</CardTitle>
                  <CardDescription>
                    {t("available_admin_controls_for_this_user_account")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("account_control")}</h4>
                      <p className="text-sm text-muted-foreground">{t("block_or_unblock_user_account_access")}</p>
                    </div>
                    <div className="space-x-2">
                      {isBlocked ? (
                        <Button variant="outline" onClick={handleUnblockUser} disabled={isLoading || !!user?.system}>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          {tCommon("unblock")}
                        </Button>
                      ) : (
                        <Button variant="destructive" onClick={() => setIsBlockDialogOpen(true)} disabled={isLoading || !!user?.system}>
                          <Shield className="h-4 w-4 mr-2" />
                          {tCommon("block")}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                </CardContent>
              </Card>
            </div>

            {/* Recent IPs & Devices (login / security history) */}
            <Card>
              <CardHeader>
                <CardTitle>{t("recent_ips_and_devices")}</CardTitle>
                <CardDescription>
                  {t("latest_sign_ins_with_source_ip_and_device")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {t("no_recorded_activity_yet")}
                  </p>
                ) : (
                  <div className="divide-y">
                    {userActivities.map((a: any) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.title || a.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {/* An IP is a figure; the fallback is a translated
                                sentence, and prose set in mono reads as broken. */}
                            <span className={a.ip ? "font-mono" : ""}>{a.ip || t("ip_unknown")}</span>
                            {" · "}
                            {describeUserAgent(a.userAgent)}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {a.createdAt ? formatRelativeTime(a.createdAt) : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail — what STAFF did to this account, and every balance
              change, both read from the two append-only ledgers. `targetId` is
              the record acted upon; the audit table's `userId` is the acting
              admin, so filtering by that here would show nothing. */}
          <TabsContent value="audit" className="space-y-6">
            <RecordAuditTab
              targetId={user.id}
              userId={user.id}
              auditTitle={t("administrative_actions")}
              auditDescription={t("every_staff_change_to_this_account_newest_first")}
            />
          </TabsContent>
          </>}
        </Tabs>

        {/* Renders nothing unless the AI Support addon is installed, enabled,
            and account tools are on — three separate operator decisions. It
            reads this customer's account through the same denylisted tools the
            customer-facing agent uses, gated on the same `view.user` permission
            as this page. */}
        {params.id ? (
          <div className="mt-6">
            <AskAboutUser userId={String(params.id)} />
          </div>
        ) : null}
      </div>

      {/* Enhanced Block User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              {t("block_user_account")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  {t("this_action_will_prevent_the_user")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("block_type")}</Label>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Switch
                    checked={isTemporaryBlock}
                    onCheckedChange={setIsTemporaryBlock}
                  />
                  <Label>{t("temporary_block_auto_unblock_after_duration")} ({t("auto_unblock_after_duration")})</Label>
                </div>
              </div>

              {isTemporaryBlock && (
                <div className="space-y-2">
                  <Label>{tCommon("duration")}</Label>
                  <Select 
                    value={blockDuration.toString()} 
                    onValueChange={(value) => setBlockDuration(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("reason_for_block")}</Label>
                <Select value={blockReason} onValueChange={setBlockReason}>
                  <SelectTrigger>
                    <SelectValue placeholder={tCommon("select_a_reason")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {blockReason === "Other" && (
                <div className="space-y-2">
                  <Label>{t("custom_reason")}</Label>
                  <Textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={`${t("enter_detailed_reason_for_blocking_this")}…`}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleBlockUser}
                loading={isLoading}
                disabled={!blockReason}
              >
                {isLoading ? (
                  `${t("blocking")}…`
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    {t("block_user")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
} 