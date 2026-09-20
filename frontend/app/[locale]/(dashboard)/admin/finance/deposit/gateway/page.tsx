"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Coins,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  Webhook,
  X,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroSection } from "@/components/ui/hero-section";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import $fetch from "@/lib/api";
import { cn } from "@/lib/utils";

import { GatewayCard, GatewayCardSkeleton } from "./components/gateway-card";
import {
  readinessOf,
  type GatewayConfigResponse,
  type GatewayListItem,
} from "./types";
import { useTranslations } from "next-intl";

/**
 * Payment gateway management.
 *
 * WHY THIS IS NOT A DATATABLE
 * ---------------------------
 * A DataTable is the right shape for records that are ROWS: many of them,
 * unbounded, sorted and paged, where the answer to "which one" is found by
 * filtering columns. There are sixteen deposit gateways, the set is fixed by
 * what is bundled in `api/finance/deposit/fiat/*`, and none of the questions an
 * operator has about one is answerable from a column:
 *
 *   - Can this gateway take a payment right now?   -> environment, not the row
 *   - Why not?                                     -> which env var is unset
 *   - Am I pointed at test or live?                -> a key PREFIX
 *   - Where do I paste the webhook?                -> derived, not stored
 *
 * The table answered none of them. It showed `status`, which is the switch, and
 * a switch that is on while the credentials are missing is exactly the failure
 * this page now leads with. Sixteen fixed items with a health verdict each is a
 * gallery, so it is one.
 */

type FilterId = "all" | "live" | "attention" | "off" | "unsupported";

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "live", label: "Accepting deposits" },
  { id: "attention", label: "Needs attention" },
  { id: "off", label: "Switched off" },
  { id: "unsupported", label: "No integration" },
];

function matchesFilter(gateway: GatewayListItem, filter: FilterId): boolean {
  const readiness = readinessOf(gateway);
  switch (filter) {
    case "live":
      return readiness === "live";
    case "attention":
      return (
        readiness === "on-but-unconfigured" ||
        readiness === "needs-credentials" ||
        // Takes money and cannot credit it. It belongs here rather than under
        // "Accepting deposits", where it would sit beside the healthy ones
        // wearing the same word.
        readiness === "cannot-confirm"
      );
    case "off":
      return gateway.supported && !gateway.status;
    case "unsupported":
      return !gateway.supported;
    default:
      return true;
  }
}

export default function DepositGatewayPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [config, setConfig] = useState<GatewayConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const { data, error } = await $fetch<GatewayConfigResponse>({
      url: "/api/admin/finance/deposit/gateway/config",
      silent: true,
    });
    if (error) {
      setLoadError(
        typeof error === "string" ? error : "Failed to load payment gateways"
      );
    } else {
      setLoadError(null);
      setConfig(data ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Optimistic, and reverted on failure.
   *
   * The switch is the one control on this page that moves money, so it must
   * respond immediately AND must never end up showing a state the server did
   * not accept. The local row is patched first, the PUT decides, and a failure
   * puts the row back exactly as it was rather than re-fetching the whole list
   * (which would also discard the operator's search and filter).
   */
  const toggleStatus = useCallback(
    async (gateway: GatewayListItem, next: boolean) => {
      setPending((prev) => ({ ...prev, [gateway.id]: true }));
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              gateways: prev.gateways.map((row) =>
                row.id === gateway.id ? { ...row, status: next } : row
              ),
            }
          : prev
      );

      const { error } = await $fetch({
        url: `/api/admin/finance/deposit/gateway/${gateway.id}/status`,
        method: "PUT",
        body: { status: next },
        silent: true,
      });

      setPending((prev) => {
        const copy = { ...prev };
        delete copy[gateway.id];
        return copy;
      });

      if (error) {
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                gateways: prev.gateways.map((row) =>
                  row.id === gateway.id ? { ...row, status: !next } : row
                ),
              }
            : prev
        );
        toast({
          title: t("could_not_change_the_gateway_status"),
          description: typeof error === "string" ? error : t("the_update_failed"),
          variant: "destructive",
        });
        return;
      }

      /*
       * Switching a gateway on whose credentials are absent is allowed — an
       * operator may be staging the change — but it is silent failure by
       * default: the vendor is never called, and the customer sees a generic
       * error at deposit time. Say so at the moment it happens.
       */
      if (next && gateway.supported && !gateway.credentialsComplete) {
        toast({
          title: t("is_on_but_cannot_authenticate", { title: String(gateway.title) }),
          description: `${gateway.missingRequired.length} required environment variable${
            gateway.missingRequired.length === 1 ? " is" : tCommon("s_are")
          } unset, so every deposit through it will fail. Open it to finish setup.`,
          variant: "destructive",
        });
      } else if (
        next &&
        gateway.supported &&
        gateway.inboundComplete === false
      ) {
        /*
         * The dangerous one, and it is invisible without this: every credential
         * the deposit form needs IS present, so the gateway looks finished and
         * the vendor really will take the customer's money. What is missing is
         * the key its confirmation webhook refuses to run without, so the
         * delivery that credits the wallet answers 5xx and the deposit never
         * appears.
         */
        toast({
          title: `${gateway.title} is on and cannot confirm a payment`,
          description: `${gateway.missingInbound.join(", ")} ${
            gateway.missingInbound.length === 1 ? "is" : "are"
          } unset, so the confirmation webhook refuses every delivery. Customers can pay and may not be credited.`,
          variant: "destructive",
        });
      } else if (next && !gateway.supported) {
        toast({
          title: t("has_no_integration", { title: String(gateway.title) }),
          description:
            t("no_deposit_handler_is_bundled_for"),
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const gateways = config?.gateways ?? [];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return gateways.filter((gateway) => {
      if (!matchesFilter(gateway, filter)) return false;
      if (!needle) return true;
      return [
        gateway.title,
        gateway.name,
        gateway.alias,
        gateway.summary,
        gateway.regions,
        ...gateway.currencies,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [gateways, filter, query]);

  const summary = config?.summary;
  const brokenActive = summary?.brokenActive ?? 0;
  const cannotConfirm = summary?.cannotConfirm ?? 0;

  /**
   * THE ALERT BANNER — a legitimate `!loading`, named so it stays one.
   *
   * This is the page's headline failure ("3 gateways are switched on and
   * cannot authenticate"), and it is derived from `brokenActive`, which is
   * `?? 0` until the config lands. It cannot render eagerly: a count of zero
   * is the "all clear" case, so a reserved banner would either be empty or
   * would have to assert a number it does not have. It is an ALERT — its
   * presence IS the information — so it belongs in the small class of nodes
   * that must stay withheld.
   *
   * It sits above the toolbar and the grid, so its arrival does push the page
   * down by roughly 96px. That is accepted deliberately: the alternative is a
   * permanent 96px hole on the healthy installs, which are most of them.
   */
  const showBrokenActiveAlert = !loading && brokenActive > 0;

  /**
   * The SECOND alert, and it leads — same rules as the one above it.
   *
   * A gateway counted here passes every check that one makes: it is switched
   * on, it is bundled, and every credential the deposit form needs is present.
   * It is stated separately because it is the opposite failure and the more
   * expensive one — nothing is hidden and nothing fails in front of the
   * customer; they pay, and the webhook that credits them refuses to run.
   */
  const showCannotConfirmAlert = !loading && cannotConfirm > 0;

  /**
   * The provenance note under the grid.
   *
   * Unlike the banner this is nearly all static prose — only the count in its
   * badge is unknown — so it renders while pending too. The `loading ||` half
   * is what makes it render: it is consistent with the grid directly above it,
   * which draws six pending cards on the same assumption that this install has
   * gateways. An install with none is the case where it collapses, and that is
   * also the case where the grid collapses from six cards to one empty card,
   * i.e. this note is not what the user notices moving.
   */
  const showInstallNote = loading || (!loadError && gateways.length > 0);

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <CreditCard className="h-3.5 w-3.5" />,
          text: "Deposits",
        }}
        title={tCommon("payment_gateways")}
        description={t("every_gateway_bundled_with_the_platform")}
        /*
          A RAIL, NOT FOUR KPI TILES.

          This was a `bottomSlot` holding `grid-cols-4` of `StatsCard` — bordered
          surfaces ~96px tall — which put 260px of heading above the alert that is
          the entire point of this screen, and pushed the first gateway card off
          a 900px viewport. The figures are a caption on the title, so they are
          rendered as one.

          The WARNING TINT on "Need credentials" is deliberately not carried
          over. Colour is not what tells an operator about it: the destructive
          banner immediately below says "12 gateways are switched on and cannot
          authenticate" in words and hands them a button that filters to exactly
          those rows. An amber number was the quieter, less actionable half of
          the same sentence.

          `statsLoading` for the same reason the `loading` props were here:
          without it these read "0 / 0 / 0 / 0" for the whole fetch — an install
          with sixteen gateways and sixty-five currencies reporting that it has
          none. The `?? 0` fallbacks stay because the skeleton needs a value to
          replace, not because zero is ever shown.
        */
        stats={[
          { icon: CreditCard, label: t("gateways"), value: summary?.total ?? 0 },
          /* No `hint`. It read "Switched on with every credential present",
             which is the DEFINITION of the label beside it — and a rail where
             one entry is three lines and the rest are two draws the eye to the
             wrong figure. */
          {
            icon: CheckCircle2,
            label: t("accepting_deposits"),
            value: summary?.ready ?? 0,
          },
          {
            icon: KeyRound,
            label: t("need_credentials"),
            value: summary?.needsCredentials ?? 0,
          },
          {
            icon: Coins,
            label: t("currencies_covered"),
            value: summary?.currencies ?? 0,
          },
        ]}
        statsLoading={loading}
      />

      <div className="container mx-auto space-y-6 py-8">
        {/*
          The headline failure, stated before the grid rather than left to be
          found by opening sixteen tiles. It only appears when it is true.
        */}
        {showCannotConfirmAlert && (
          <Card tone="destructive" className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <Webhook
                className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {cannotConfirm} gateway
                  {cannotConfirm === 1 ? " is" : tCommon("s_are")} taking
                  payments {cannotConfirm === 1 ? "it" : "they"} cannot confirm
                </p>
                <p className="text-sm text-muted-foreground">
                  The deposit succeeds at the vendor and the webhook that
                  credits the wallet refuses to run for want of a signing
                  secret. Open{" "}
                  {cannotConfirm === 1 ? "it" : "them"} to see which variable,
                  or switch {cannotConfirm === 1 ? "it" : "them"} off until it
                  is set.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                tone="destructive"
                onClick={() => {
                  setFilter("attention");
                  setQuery("");
                }}
              >
                {t("show_them")}
              </Button>
            </div>
          </Card>
        )}

        {showBrokenActiveAlert && (
          <Card tone="destructive" className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {brokenActive} gateway{brokenActive === 1 ? " is" : tCommon("s_are")}{" "}
                  switched on and cannot authenticate
                </p>
                <p className="text-sm text-muted-foreground">
                  Customers can select {brokenActive === 1 ? "it" : "them"} on
                  the deposit form, and every attempt fails at the vendor.
                  Either finish the setup or switch{" "}
                  {brokenActive === 1 ? "it" : "them"} off.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                tone="destructive"
                onClick={() => {
                  setFilter("attention");
                  setQuery("");
                }}
              >
                {t("show_them")}
              </Button>
            </div>
          </Card>
        )}

        {/* ---- toolbar --------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search_by_name_alias_region_or_currency")}
              className="pl-9"
              aria-label={t("search_payment_gateways")}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={tCommon("clear_search")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((entry) => {
              const count = gateways.filter((gateway) =>
                matchesFilter(gateway, entry.id)
              ).length;
              const active = filter === entry.id;
              return (
                <Button
                  key={entry.id}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  tone={active ? "primary" : "neutral"}
                  onClick={() => setFilter(entry.id)}
                  aria-pressed={active}
                >
                  {entry.label}
                  <span
                    className={cn(
                      "font-mono text-[10px] tabular-nums",
                      active ? "opacity-80" : "text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
            disabled={loading}
            aria-label={t("reload_gateway_configuration")}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* ---- the grid --------------------------------------------------- */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <GatewayCardSkeleton key={index} />
            ))}
          </div>
        ) : loadError ? (
          <Card className="p-10 text-center">
            <XCircle
              className="mx-auto mb-3 h-12 w-12 text-destructive opacity-60"
              aria-hidden
            />
            <p className="font-medium">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </Card>
        ) : visible.length === 0 ? (
          <Card variant="dashed" className="p-10 text-center">
            <ShieldCheck
              className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-60"
              aria-hidden
            />
            <p className="font-medium">{t("no_gateway_matches_this_view")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {gateways.length === 0
                ? t("no_deposit_gateways_are_present_in")
                : t("clear_the_search_or_choose_a_different_filter")}
            </p>
            {gateways.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                {tCommon("show_all")} {gateways.length}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((gateway, index) => (
              <GatewayCard
                key={gateway.id}
                gateway={gateway}
                index={index}
                busy={Boolean(pending[gateway.id])}
                onToggle={(next) => void toggleStatus(gateway, next)}
              />
            ))}
          </div>
        )}

        {/*
          Where the rows come from, said once. There is no create endpoint for
          deposit_gateway and the old table hard-disabled its create button
          without explaining why, which reads as a missing permission.
        */}
        {showInstallNote && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge tone="neutral" appearance="soft">
              <Loadable loading={loading} placeholder="00">
                {gateways.length}
              </Loadable>
            </Badge>
            Gateways are installed by the platform, not created here. Each one
            maps to a handler under{" "}
            <code className="font-mono">{t("api_finance_deposit_fiat")}</code> by its
            alias.
          </p>
        )}
      </div>
    </div>
  );
}
