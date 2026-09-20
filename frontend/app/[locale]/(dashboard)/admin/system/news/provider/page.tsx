"use client";

import { useCallback, useEffect, useState } from "react";
import { m } from "framer-motion";
import {
  CheckCircle2,
  Info,
  Newspaper,
  PenLine,
  PlugZap,
  RefreshCw,
  Rss,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import $fetch from "@/lib/api";
import { HeroSection } from "@/components/ui/hero-section";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProviderCard } from "./provider-card";
import type { NewsProviderList, NewsSyncSummary } from "./types";

/**
 * Market News → Providers.
 *
 * WHAT THIS SCREEN REPLACED. The core news feed had one provider, chosen at
 * compile time, switched on by the presence of an environment variable, and
 * tuned by three constants in a cron job. Admin → Market News listed the
 * stories and said nothing about where they came from; an operator asking "can
 * I add a source, or turn this one off?" had no answer that did not involve
 * editing TypeScript.
 *
 * WHY IT IS NOT A DATATABLE. Every other row-shaped admin screen here is one,
 * and this deliberately is not: the useful content per provider is prose an
 * operator reads once while deciding — what it covers, what it costs, whether
 * it tags instruments, what its free tier forbids — and a table renders that as
 * a column of truncated cells. The rows are also a fixed catalogue, not user
 * data: nothing is created or deleted here, only enabled and configured.
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <m.div
      variants={itemVariants}
      /*
       * SELF-ORCHESTRATING ON PURPOSE — do not drop these to bare `variants`.
       * A motion child carrying only `variants` inherits its parent's label
       * through MotionContext, which works when it mounts WITH the parent and
       * fails silently when it mounts after the parent's `animate` has run: it
       * picks up `initial="hidden"` and never receives `visible`, rendering at
       * full height with opacity 0. Every card here sits behind the provider
       * fetch, i.e. mounts on loading true -> false, which is exactly that case.
       */
      initial="hidden"
      animate="visible"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/10 bg-card/50 backdrop-blur-xl",
        "shadow-[0_8px_32px_hsl(var(--shadow)/0.12)] dark:shadow-[0_8px_32px_hsl(var(--shadow)/0.3)]",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </m.div>
  );
}

export default function MarketNewsProvidersPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [list, setList] = useState<NewsProviderList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<NewsSyncSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await $fetch<NewsProviderList>({
      url: "/api/admin/system/news/provider",
      silent: true,
    });
    if (error) {
      setLoadError(
        typeof error === "string" ? error : "Failed to load news providers"
      );
    } else {
      setLoadError(null);
      setList(data ?? null);
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     Load-on-mount. `refresh` sets nothing synchronously — its first statement
     is the await — so there is no cascading render here; the rule flags it
     because it can see a setState reachable from the effect at all. `loading`
     already starts true, so the first load needs no pending flag set on its
     behalf. Same shape as the SMS provider page next door. */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSummary(null);
    const { data, error } = await $fetch<NewsSyncSummary>({
      url: "/api/admin/system/news/provider/sync",
      method: "POST",
      silent: true,
    });
    setSyncing(false);
    if (error || !data) {
      setSyncError(typeof error === "string" ? error : "The sync could not be run");
      return;
    }
    setSyncSummary(data);
    // Story counts and every row's last-sync state moved, so the list is
    // re-read rather than patched — the summary and the cards must agree.
    await refresh();
  }, [refresh]);

  const providers = list?.providers ?? [];
  const enabledCount = providers.filter((provider) => provider.status).length;
  const readyCount = providers.filter(
    (provider) => provider.ready && !provider.status
  ).length;
  const storedCount = providers.reduce(
    (total, provider) => total + provider.storedStories,
    0
  );

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Rss className="h-3.5 w-3.5" />,
          text: "Market News",
        }}
        title={t("news_providers")}
        description={t("choose_where_the_terminals_news_feed")}
        stats={[
          { icon: PlugZap, label: tCommon("enabled"), value: String(enabledCount) },
          { icon: CheckCircle2, label: t("ready_to_enable"), value: String(readyCount) },
          { icon: Newspaper, label: t("provider_stories"), value: String(storedCount) },
          {
            icon: PenLine,
            label: t("desk_authored"),
            value: String(list?.manualStories ?? 0),
          },
        ]}
      />

      <div className="container mx-auto py-8 space-y-6">
        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {loading ? (
            <div className="space-y-6">
              <GlassCard>
                <CardHeader>
                  <CardTitle>
                    <SkeletonText placeholder={t("scheduled_sync")} />
                  </CardTitle>
                  <CardDescription>
                    <SkeletonText
                      placeholder={t("every_enabled_provider_runs_on_the_same_schedule")}
                    />
                  </CardDescription>
                </CardHeader>
              </GlassCard>
              <div className="grid gap-6 xl:grid-cols-2">
                {[...Array(4)].map((_, index) => (
                  <GlassCard key={index}>
                    <CardHeader>
                      <CardTitle>
                        <SkeletonText placeholder={t("provider_name")} />
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <SkeletonText
                          placeholder={t("what_this_provider_covers_and_what_it_costs")}
                        />
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[0, 1, 2].map((row) => (
                        <p key={row} className="text-sm text-muted-foreground">
                          <SkeletonText placeholder="APP_PROVIDER_API_KEY  is set" />
                        </p>
                      ))}
                    </CardContent>
                  </GlassCard>
                ))}
              </div>
            </div>
          ) : loadError ? (
            <GlassCard>
              <CardContent className="py-10 text-center pt-10">
                <XCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-60" />
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
                  {tCommon("retry")}
                </Button>
              </CardContent>
            </GlassCard>
          ) : (
            <>
              <GlassCard>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>{t("scheduled_sync")}</CardTitle>
                      <CardDescription className="mt-1">
                        {t("every_enabled_provider_runs_every_n_minutes", {
                          minutes: list?.syncPeriodMinutes ?? 15,
                        })}
                      </CardDescription>
                    </div>
                    <Button size="sm" disabled={syncing} onClick={() => void syncNow()}>
                      <RefreshCw
                        className={cn("h-4 w-4", syncing && "animate-spin")}
                      />
                      {syncing ? `${t("syncing")}…` : t("sync_now")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    {/*
                      Stated up front because it is the fear that stops people
                      touching this screen: disabling a provider does not delete
                      anything, and nothing here can reach the stories the desk
                      wrote by hand.
                    */}
                    {t("disabling_a_provider_does_not_delete")}
                  </p>

                  {syncError ? (
                    <p className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                      <span className="text-foreground">{syncError}</span>
                    </p>
                  ) : null}

                  {syncSummary ? (
                    <div className="space-y-1.5">
                      <p className="text-sm text-foreground">{syncSummary.message}</p>
                      {syncSummary.results.map((result) => (
                        <p
                          key={result.provider}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          {result.status === "OK" ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                          ) : result.status === "ERROR" ? (
                            <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                          ) : (
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                          )}
                          <span className="break-words">
                            <span className="text-foreground">{result.provider}</span>
                            {" — "}
                            {result.message}
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </GlassCard>

              {providers.length === 0 ? (
                <GlassCard>
                  <CardContent className="py-10 text-center pt-10">
                    <Newspaper className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-60" />
                    <p className="font-medium">{t("no_providers_registered")}</p>
                  </CardContent>
                </GlassCard>
              ) : (
                <m.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-6 xl:grid-cols-2 items-start"
                >
                  {providers.map((provider) => (
                    <GlassCard key={provider.id}>
                      <ProviderCard provider={provider} onChanged={refresh} />
                    </GlassCard>
                  ))}
                </m.div>
              )}
            </>
          )}
        </m.div>
      </div>
    </div>
  );
}
