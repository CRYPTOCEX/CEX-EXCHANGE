"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Download, Images, ImageOff, RefreshCw, SquareDashed } from "lucide-react";

import { $fetch } from "@/lib/api";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { useUserStore } from "@/store/user";
import { cn } from "@/lib/utils";

import { CoverageBand } from "./components/coverage-band";
import { SourceBreakdown } from "./components/source-breakdown";
import { SyncPanel } from "./components/sync-panel";
import { SymbolExplorer, type ExplorerQuery } from "./components/symbol-explorer";
import { count, type IconReport } from "./components/types";

const DEFAULT_QUERY: ExplorerQuery = {
  search: "",
  bucket: "all",
  outcome: "all",
  sort: "outcome",
  perPage: 25,
  page: 1,
};

/**
 * Currency icons — the coverage figure, the resolver breakdown and the queue of
 * symbols that cannot draw themselves yet.
 *
 * The queue is SERVER-PAGED. The catalog runs to thousands of symbols and this
 * page used to render one fixed slice of 250 with no way to reach anything
 * past it. Every control in the explorer is a query parameter now; the scan
 * behind them is cached by the route, so filtering and paging cost a lookup
 * rather than a process spawn.
 */
export default function CurrencyIconPage() {
  const t = useTranslations("dashboard_admin");

  const user = useUserStore((state) => state.user);
  const hasPermission = useUserStore((state) => state.hasPermission);
  /* Optimistic while the profile is still loading: an action that appears a
     second after the page does reads as a glitch, and the route enforces the
     permission regardless. */
  const canFetch = !user || hasPermission("edit.currency.icon");

  const [report, setReport] = useState<IconReport | null>(null);
  /** First paint only. A page change keeps the old rows and dims them. */
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingSymbol, setFetchingSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [enabledOnly, setEnabledOnly] = useState(false);
  const [offline, setOffline] = useState(false);

  /**
   * Held separately from `report`. A sync re-reads the report so the counts
   * reflect what is now on disk, and that GET response replaces the whole
   * object — which threw away the POST's `message` one tick after it arrived,
   * so the outcome of the run never appeared.
   */
  const [lastRun, setLastRun] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState<ExplorerQuery>(DEFAULT_QUERY);

  /**
   * The box updates on every keystroke; the QUERY updates once you stop typing.
   *
   * Debounced in the handler rather than by watching a debounced value in an
   * effect: the effect form is a setState in an effect body — the cascading
   * render `react-hooks/set-state-in-effect` exists to catch — and it has to
   * re-derive "did this actually change" on every render to avoid looping.
   * Here the commit is an event, which is what it is.
   */
  const commitSearch = useDebouncedCallback((value: string) => {
    // Back to page 1: the row that was 26th under the old search is not the
    // 26th under the new one, and there may be no 26th at all.
    setQuery((q) => (q.search === value ? q : { ...q, search: value, page: 1 }));
  }, 300);

  const onSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      commitSearch(value);
    },
    [commitSearch]
  );

  /**
   * Only the newest request may write state. Typing in the search box fires one
   * per debounce window and they do not necessarily come back in order — a slow
   * "b" landing after "bt" would put the wrong rows on screen and leave the box
   * disagreeing with the table.
   */
  const requestId = useRef(0);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      const id = ++requestId.current;
      if (loadedOnce.current) setFetching(true);
      else setLoading(true);
      setError(null);

      // $fetch NEVER throws — it always resolves to { data, error }. A try/catch
      // here would be dead code and an outage would silently render as empty data.
      const { data, error: err } = await $fetch<IconReport>({
        url: "/api/admin/system/icon",
        params: {
          page: query.page,
          perPage: query.perPage,
          sort: query.sort,
          ...(query.search ? { search: query.search } : {}),
          ...(query.bucket !== "all" ? { bucket: query.bucket } : {}),
          ...(query.outcome !== "all" ? { outcome: query.outcome } : {}),
          ...(enabledOnly ? { enabledOnly: "true" } : {}),
          ...(opts?.refresh ? { refresh: "true" } : {}),
        },
        silent: true,
      });

      if (id !== requestId.current) return;

      if (err) setError(err);
      else if (data) setReport(data);

      loadedOnce.current = true;
      setLoading(false);
      setFetching(false);
    },
    [query, enabledOnly]
  );

  /* eslint-disable react-hooks/set-state-in-effect --
     Load-on-mount and reload-on-query-change. `load` flips the pending flag
     before it awaits, which is the point: a filter change has to dim the table
     it is about to replace. Same note as admin/dex/page.tsx. */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const runSync = useCallback(
    async (body: Record<string, unknown>, successMessage: string) => {
      setError(null);
      const { data, error: err } = await $fetch<{ message?: string }>({
        url: "/api/admin/system/icon/sync",
        method: "POST",
        // 90s, not 10 minutes: this is a synchronous request and a typical
        // reverse-proxy read timeout cuts it long before then, so a longer run
        // just produces a response nobody receives. `limit` keeps a run inside
        // it; the CLI does full backfills.
        body: { noNetwork: offline, timeoutMs: 90000, ...body },
        successMessage,
      });
      if (err) setError(err);
      else setLastRun(data?.message ?? null);
      // Re-read, forcing a rescan: the run just changed what is on disk, so the
      // cached report is stale by definition.
      if (!err) await load({ refresh: true });
      return !err;
    },
    [offline, load]
  );

  const runBulkSync = useCallback(async () => {
    setSyncing(true);
    await runSync({ enabledOnly, limit: 200 }, t("icons_synced_successfully"));
    setSyncing(false);
  }, [runSync, enabledOnly, t]);

  const fetchOne = useCallback(
    async (symbol: string) => {
      setFetchingSymbol(symbol);
      await runSync(
        { symbols: [symbol], limit: 1, timeoutMs: 60000 },
        t("fetched_icon_for_symbol", { symbol: symbol.toUpperCase() })
      );
      setFetchingSymbol(null);
    },
    [runSync, t]
  );

  const patchQuery = useCallback((patch: Partial<ExplorerQuery>) => {
    setQuery((q) => ({ ...q, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    // Overwrite any pending debounced commit, which would otherwise land 300ms
    // later and put the search term the operator just cleared back on.
    commitSearch("");
    setQuery((q) => ({ ...q, search: "", bucket: "all", outcome: "all", page: 1 }));
  }, [commitSearch]);

  const resolvable = useMemo(() => {
    if (!report) return 0;
    return (report.byOutcome?.["would-write"] || 0) + (report.byOutcome?.written || 0);
  }, [report]);

  const scannedAt = report?.scannedAt ?? report?.generatedAt ?? null;

  return (
    <TooltipProvider delayDuration={200}>
      <PageShell rhythm="md">
        <PageHeader
          title={t("currency_icons")}
          description={t("find_missing_currency_icons_and_fetch_them")}
          actions={
            <div className="flex items-center gap-2">
              {scannedAt && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {t("scanned_time_ago", {
                    time: formatDistanceToNowStrict(new Date(scannedAt), { addSuffix: true }),
                  })}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load({ refresh: true })}
                disabled={loading || fetching || syncing}
              >
                <RefreshCw className={cn("mr-1.5 size-3.5", fetching && "animate-spin")} />
                {t("rescan")}
              </Button>
            </div>
          }
        />

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="font-medium">{t("could_not_read_the_icon_report")}</p>
                <p className="mt-1 break-words text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatsCard
            label={t("missing_icons")}
            value={loading ? "—" : count(report?.missing)}
            icon={ImageOff}
            {...(report && report.missing > 0 ? statsCardColors.warning : statsCardColors.success)}
            index={0}
          />
          <StatsCard
            label={t("resolvable_now")}
            value={loading ? "—" : count(resolvable)}
            icon={Download}
            description={t("can_be_fetched_without_a_manual_source")}
            index={1}
          />
          <StatsCard
            label={t("icons_on_disk")}
            value={loading ? "—" : count(report?.existingIcons)}
            icon={Images}
            index={2}
          />
          <StatsCard
            label={t("blank_placeholders")}
            value={loading ? "—" : count(report?.placeholderIcons)}
            icon={SquareDashed}
            description={t("files_that_exist_but_render_as_the_generic_coin")}
            index={3}
          />
        </m.div>

        <CoverageBand report={report} loading={loading} />

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SyncPanel
              enabledOnly={enabledOnly}
              onEnabledOnly={(v) => {
                setEnabledOnly(v);
                // The scope of the scan changed, so row 1 is a different row.
                patchQuery({ page: 1 });
              }}
              offline={offline}
              onOffline={setOffline}
              syncing={syncing}
              disabled={loading || !canFetch}
              onRun={() => void runBulkSync()}
              lastRun={lastRun}
            />
          </div>
          <div className="lg:col-span-2">
            <SourceBreakdown report={report} loading={loading} />
          </div>
        </div>

        <SymbolExplorer
          report={report}
          loading={loading}
          fetching={fetching}
          query={query}
          searchInput={searchInput}
          onSearchInput={onSearchInput}
          onQuery={patchQuery}
          onResetFilters={resetFilters}
          onFetchSymbol={(symbol) => void fetchOne(symbol)}
          fetchingSymbol={fetchingSymbol}
          canFetch={canFetch}
        />
      </PageShell>
    </TooltipProvider>
  );
}
