"use client";

/**
 * Payment-gateway landing page — Obsidian.
 *
 * See `components/landing/kit.tsx` for why the generic page-builder
 * composition had to go rather than simply be recoloured.
 */

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Award,
  BarChart3,
  Code,
  Globe,
  KeyRound,
  Plug,
  Shield,
  Sparkles,
  Timer,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import {
  CapabilityGrid,
  ClosingCta,
  LandingHero,
  LandingShell,
  MetricStrip,
  StepRail,
  TrustRow,
} from "@/components/landing";
import { GatewayArt } from "@/components/landing/art";
import SupportedCurrenciesSection from "./components/landing/supported-currencies-section";
import FeeCalculatorSection from "./components/landing/fee-calculator-section";
import LiveActivitySection from "./components/landing/live-activity-section";

interface GatewayStats {
  totalMerchants: number;
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  avgProcessingTime?: number;
  currenciesSupported?: number;
  uptime?: number;
}

/**
 * The `/api/gateway/landing` payload.
 *
 * Exported so `./page.tsx` — a server component — can name it when it fetches
 * this during SSR and hands it down as `initialData`. A type-only import
 * erases, so naming it there does not pull this "use client" module onto the
 * server.
 */
export interface LandingData {
  stats: GatewayStats;
  supportedPayments: { fiat: string[]; crypto: string[]; walletTypes: string[] };
  feeStructure: {
    type: string;
    percentage: number;
    fixed: number;
    example: { amount: number; fee: number; netAmount: number };
  };
  payoutOptions: any[];
  recentActivity: any[];
  integrations: any[];
}

/**
 * NO CURRENCY MARK, BECAUSE THE FIGURE HAS NO CURRENCY.
 *
 * `gateway/landing/index.get.ts:61` is `[fn("SUM", col("amount")), "totalVolume"]`
 * with no currency grouping — while lines 69-74 of the SAME query batch collect
 * the DISTINCT currency list, which is the endpoint telling us there is more
 * than one. Stamping `$` on that sum publishes a dollar figure that is naira
 * plus bitcoin plus tether.
 *
 * The merchant-facing surfaces were already fixed and say so in prose
 * (`gateway/dashboard/client.tsx:301-314`, `gateway/payouts/client.tsx:311-326`);
 * only the public landing page still did it.
 */
function compact(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B+`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K+`;
  return `${Math.round(value)}`;
}

export default function GatewayClient({
  initialData = null,
}: {
  /**
   * `/api/gateway/landing` as the server saw it, or `null` when it could not
   * be reached. See `./page.tsx`.
   */
  initialData?: LandingData | null;
} = {}) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();

  /* `stats` is a projection of `landingData.stats` and nothing else ever sets
     it, so it is seeded from the same prop rather than left null — otherwise
     `showStats` below would be false on the server despite the figures being
     in hand, and the hero would ship without its `<dl>` and grow one after
     paint. `?? null` because the prop's own absence and a payload without a
     `stats` block are the same thing to every reader of this state. */
  const [stats, setStats] = useState<GatewayStats | null>(
    initialData?.stats ?? null
  );
  const [landingData, setLandingData] = useState<LandingData | null>(
    initialData
  );
  /* SEEDED FROM THE PROP, not left at `true`, and this half is load-bearing.
     `isLoadingLanding` is what puts the hero figures and every section flag behind
     `<Loadable>`. Keep it `true` while holding the real numbers and the server
     would render the placeholder pass it already has the answers for, then swap
     it one commit later — which is the exact class of shift these landing
     pages were reworked to remove, paid twice over on a page that no longer
     has to wait for anything. `initialData === null` keeps the pending pass for
     the only case that still needs it: the server fetch missed and the effect
     below is about to run. */
  const [isLoadingLanding, setIsLoadingLanding] = useState(
    initialData === null
  );
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    if (fetchInitiatedRef.current) return;
    // Nothing to ask for — the server already delivered it.
    if (initialData !== null) return;
    fetchInitiatedRef.current = true;
    let isMounted = true;

    (async () => {
      const { data } = await $fetch<LandingData>({ url: "/api/gateway/landing", method: "GET", silent: true });
      if (!isMounted) return;
      if (data) {
        setLandingData(data);
        setStats(data.stats);
      }
      setIsLoadingLanding(false);
    })();

    return () => {
      isMounted = false;
      fetchInitiatedRef.current = false;
    };
  }, []);

  const showStats = Boolean(
    stats && (stats.totalMerchants > 0 || stats.totalTransactions > 0 || stats.totalVolume > 0)
  );

  const heroStats =
    showStats && stats
      ? ([
          stats.totalMerchants > 0 && { value: `${stats.totalMerchants.toLocaleString()}+`, label: t("merchants") },
          stats.totalVolume > 0 && { value: compact(stats.totalVolume), label: t("processed") },
          stats.successRate > 0 && { value: `${Number(stats.successRate).toFixed(1)}%`, label: tCommon("success_rate") },
        ].filter(Boolean) as { value: string; label: string }[])
      : [];

  return (
    <LandingShell>
      <LandingHero
        eyebrow={t("next_gen_payment_gateway")}
        eyebrowIcon={Sparkles}
        title={t("accept_payments")}
        highlight={t("anywhere_anytime")}
        subtitle={`${t("power_your_business_with_our_secure")} ${t("start_accepting_crypto_payments_in_minutes")}`}
        actions={[
          {
            label: user ? tCommon("go_to_dashboard") : t("start_free"),
            href: user ? "/gateway/dashboard" : "/gateway/register",
          },
          { label: t("view_documentation"), href: "/gateway/docs", variant: "secondary" },
        ]}
        stats={heroStats}
        visual={<GatewayArt />}
      />

      <TrustRow
        items={[
          { icon: Shield, label: "HMAC-signed webhooks", detail: "IP-restricted API keys" },
          { icon: Timer, label: t("settles_daily"), detail: "Automatic payouts" },
          { icon: Globe, label: t("fiat_and_crypto"), detail: "One integration" },
          { icon: Code, label: t("rest_api_webhooks"), detail: "Test keys from day one" },
        ]}
      />

      <SupportedCurrenciesSection
        payments={landingData?.supportedPayments || { fiat: [], crypto: [], walletTypes: [] }}
        isLoading={isLoadingLanding}
      />

      <FeeCalculatorSection
        feeStructure={
          landingData?.feeStructure || {
            type: "BOTH",
            percentage: 2.9,
            fixed: 0.3,
            example: { amount: 100, fee: 3.2, netAmount: 96.8 },
          }
        }
        isLoading={isLoadingLanding}
      />

      <LiveActivitySection activity={landingData?.recentActivity || []} isLoading={isLoadingLanding} />

      {showStats && stats && (
        <MetricStrip
          className="py-4"
          stats={[
            { icon: Users, value: `${stats.totalMerchants.toLocaleString()}+`, label: t("merchants") },
            { icon: BarChart3, value: `${stats.totalTransactions.toLocaleString()}+`, label: tCommon("transactions") },
            { icon: Globe, value: compact(stats.totalVolume), label: tCommon("total_volume") },
            { icon: Zap, value: `${Number(stats.successRate).toFixed(1)}%`, label: tCommon("success_rate") },
          ]}
        />
      )}

      <CapabilityGrid
        eyebrow={tCommon("why_choose_us")}
        eyebrowIcon={Award}
        title={t("built_for_modern_businesses")}
        subtitle={t("everything_you_need_to_accept_payments")}
        items={[
          {
            icon: Zap,
            title: t("fast_settlement"),
            description:
              t("authorisation_in_under_a_second_and"),
          },
          {
            icon: Globe,
            title: t("global_reach"),
            description:
              t("card_bank_transfer_and_crypto_in"),
          },
          {
            icon: Code,
            title: t("developer_friendly"),
            description:
              t("a_rest_api_signed_webhooks_and"),
          },
        ]}
        columns={3}
      />

      <StepRail
        eyebrow={t("simple_integration")}
        eyebrowIcon={Sparkles}
        title={t("get_started_in_4_steps")}
        subtitle={t("from_signing_up_to_taking_a")}
        steps={[
          {
            icon: KeyRound,
            title: t("get_api_keys"),
            description: t("create_an_account_and_generate_a"),
          },
          {
            icon: Plug,
            title: t("integrate"),
            description: t("drop_in_the_hosted_checkout_or"),
          },
          {
            icon: Webhook,
            title: t("configure_webhooks"),
            description: t("point_one_endpoint_at_your_server"),
          },
          {
            icon: Zap,
            title: t("start_accepting"),
            description: t("swap_the_test_key_for_the"),
          },
        ]}
        action={{ label: t("view_documentation"), href: "/gateway/docs" }}
      />

      <ClosingCta
        eyebrow="Start accepting payments"
        eyebrowIcon={Sparkles}
        title={t("take_your_first_payment")}
        highlight="today"
        subtitle={t("create_an_account_generate_a_test")}
        actions={[
          {
            label: user ? tCommon("go_to_dashboard") : t("start_free"),
            href: user ? "/gateway/dashboard" : "/gateway/register",
          },
          { label: t("view_documentation"), href: "/gateway/docs", variant: "secondary" },
        ]}
        note="No monthly fee · transparent per-transaction pricing · cancel anytime"
      />
    </LandingShell>
  );
}
