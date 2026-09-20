"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertCircle, RefreshCw, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import WebSocketManager from "@/utils/ws";
import {
  handleWebSocketMessage,
  useCronStore,
  type CronStatusFilter,
} from "@/store/cron";
import { PageShell } from "@/components/layout/page-shell";

import { ActivityFeed } from "./components/activity-feed";
import { ConnectionStatus } from "./components/connection-status";
import { CronDetailModal } from "./components/cron-detail-modal";
import { JobList } from "./components/job-list";
import { LogStream } from "./components/log-stream";
import { Overview } from "./components/overview";
import { SchedulerBanner } from "./components/scheduler-banner";
import {
  categoryLabel,
  cronJobState,
  needsAttention,
} from "./components/job-state";

/**
 * The cron operations page.
 *
 * WHAT IT IS FOR. Since the scheduler became its own process the deployment can
 * fail in ways every other screen calls healthy: the `cron` app stops and the
 * site keeps serving; a job REFUSES itself every tick and returns normally.
 * Both are silent by construction, and both mean money work is not happening.
 * This page is where an operator finds out, so its whole shape is "what is not
 * working" first and "what is working" second.
 *
 * THREE INDEPENDENT SIGNALS, deliberately not merged:
 *   1. the scheduler heartbeat (is ANYTHING registering jobs — banner);
 *   2. the job registry with its run state and sticky refusals (list);
 *   3. the live WebSocket relay (log + activity).
 * Any one of them can be down while the others look fine, and the page says
 * which rather than folding them into a single green tick.
 */
export default function HomePage() {
  return <CronManagementClient />;
}

/** How often the job list is re-read over HTTP, as a floor under the socket. */
const JOB_POLL_MS = 20_000;
/** The heartbeat's own cadence is 15s; asking twice as often buys nothing. */
const SCHEDULER_POLL_MS = 15_000;

export function CronManagementClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const cronJobs = useCronStore((state) => state.cronJobs);
  const logs = useCronStore((state) => state.logs);
  const timelineEvents = useCronStore((state) => state.timelineEvents);
  const isConnected = useCronStore((state) => state.isConnected);
  const activeTab = useCronStore((state) => state.activeTab);
  const categoryFilter = useCronStore((state) => state.categoryFilter);
  /*
    Subscribed even though the input below owns the text. `getFilteredJobs()`
    reads the store imperatively, so without a subscription here the debounced
    query would land in the store during an effect — AFTER the render that the
    debounce triggered — and the list would stay one keystroke behind.
  */
  const searchQuery = useCronStore((state) => state.searchQuery);
  const scheduler = useCronStore((state) => state.scheduler);
  const isLoadingJobs = useCronStore((state) => state.isLoadingJobs);
  const jobsError = useCronStore((state) => state.jobsError);
  const lastFetchedAt = useCronStore((state) => state.lastFetchedAt);
  const setActiveTab = useCronStore((state) => state.setActiveTab);
  const setCategoryFilter = useCronStore((state) => state.setCategoryFilter);
  const setSearchQuery = useCronStore((state) => state.setSearchQuery);
  const clearLogs = useCronStore((state) => state.clearLogs);
  const getFilteredJobs = useCronStore((state) => state.getFilteredJobs);
  const fetchCronJobs = useCronStore((state) => state.fetchCronJobs);
  const fetchScheduler = useCronStore((state) => state.fetchScheduler);
  const triggerCronJob = useCronStore((state) => state.triggerCronJob);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 250);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [focusedLogJob, setFocusedLogJob] = useState<string | null>(null);
  const [rightPane, setRightPane] = useState<"log" | "activity">("log");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // ---------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------

  /**
   * HTTP is the floor, the socket is the fast path.
   *
   * The socket only carries CHANGES, so a page opened between two ticks of a
   * six-hourly job would otherwise show nothing about it until that job ran.
   * And on a split deployment the browser's socket is attached to the web
   * process while the state is written by the cron one, so a relay that drops
   * (Redis pub/sub blip) would leave a page that looks live and is frozen.
   * Polling underneath means the worst case is 20 seconds stale, not forever.
   */
  useEffect(() => {
    void fetchCronJobs();
    void fetchScheduler();

    const jobsTimer = setInterval(() => void fetchCronJobs(), JOB_POLL_MS);
    const schedulerTimer = setInterval(
      () => void fetchScheduler(),
      SCHEDULER_POLL_MS
    );

    return () => {
      clearInterval(jobsTimer);
      clearInterval(schedulerTimer);
    };
  }, [fetchCronJobs, fetchScheduler]);

  /**
   * The live stream.
   *
   * `SUBSCRIBE` on open is what puts this browser in the relay's audience set,
   * which is what makes the cron process start publishing ordinary log lines at
   * all (`handler/ws/relay.ts` — the scheduler holds no sockets, so it asks the
   * web process whether anyone is looking before it builds a payload).
   */
  useEffect(() => {
    const manager = new WebSocketManager("/api/admin/system/cron");

    manager.on("open", () => {
      useCronStore.getState().setIsConnected(true);
      manager.send({ action: "SUBSCRIBE", payload: {} });
    });
    manager.on("close", () => {
      useCronStore.getState().setIsConnected(false);
    });
    manager.on("message", (message: any) => handleWebSocketMessage(message));

    manager.connect();
    return () => manager.disconnect();
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchCronJobs(), fetchScheduler()]);
    setIsRefreshing(false);
  }, [fetchCronJobs, fetchScheduler]);

  // ---------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------

  const filteredJobs = useMemo(
    () => getFilteredJobs(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the function reads
    // the store imperatively; these four ARE its inputs.
    [getFilteredJobs, cronJobs, activeTab, categoryFilter, searchQuery]
  );

  const counts = useMemo(() => {
    const byState = {
      all: cronJobs.length,
      attention: 0,
      idle: 0,
      running: 0,
      completed: 0,
      failed: 0,
      refused: 0,
    };
    for (const job of cronJobs) {
      const state = cronJobState(job);
      if (state === "refused") byState.refused += 1;
      if (state === "failed") byState.failed += 1;
      if (state === "running") byState.running += 1;
      if (state === "completed") byState.completed += 1;
      if (state === "idle") byState.idle += 1;
      if (needsAttention(job)) byState.attention += 1;
    }
    return byState;
  }, [cronJobs]);

  const categories = useMemo(() => {
    const set = new Set(cronJobs.map((job) => job.category || "normal"));
    return Array.from(set).sort();
  }, [cronJobs]);

  const selected = useMemo(
    () => cronJobs.find((job) => job.name === selectedJob) ?? null,
    [cronJobs, selectedJob]
  );

  // Trusted only when the endpoint actually answered. On an older backend that
  // has no scheduler route the button stays ENABLED and the server's own 503
  // explains itself — better than this page inventing a refusal.
  const canTrigger = scheduler?.process ? scheduler.process.canTrigger : true;

  const handleTrigger = useCallback(
    async (name: string) => {
      if (triggering) return;
      setTriggering(name);
      try {
        await triggerCronJob(name);
        // The manual run writes lastRun/status/refusal; read them back rather
        // than waiting for the next poll, so the row settles immediately.
        await fetchCronJobs();
      } finally {
        setTriggering(null);
      }
    },
    [fetchCronJobs, triggerCronJob, triggering]
  );

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  const TABS: { value: CronStatusFilter; label: string; count: number }[] = [
    { value: "all", label: tCommon("all"), count: counts.all },
    { value: "attention", label: t("cron_needs_attention"), count: counts.attention },
    { value: "running", label: tCommon("running"), count: counts.running },
    { value: "completed", label: tCommon("completed"), count: counts.completed },
    { value: "idle", label: t("idle"), count: counts.idle },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <PageShell rhythm="sm">
        <m.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl truncate leading-tight">
              {t("cron_management")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("real_time_cron_job_monitoring_dashboard")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lastFetchedAt ? (
              <span className="hidden text-xs text-subtle-foreground sm:inline">
                {t("cron_as_of", {
                  time: formatDistanceToNowStrict(new Date(lastFetchedAt), {
                    addSuffix: true,
                  }),
                })}
              </span>
            ) : null}
            <ConnectionStatus />
            <Button
              size="xs"
              variant="outline"
              onClick={() => void refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("mr-1.5 h-3 w-3", isRefreshing && "animate-spin")}
              />
              {tCommon("refresh")}
            </Button>
          </div>
        </m.div>

        <SchedulerBanner info={scheduler} />

        {/* A failed refresh, said once, without blanking the list underneath. */}
        {jobsError ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning bg-warning/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-foreground">
              <span className="font-medium">{t("cron_list_stale")}</span>{" "}
              <span className="text-muted-foreground">{jobsError}</span>
            </p>
          </div>
        ) : null}

        <Overview jobs={cronJobs} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* ---------------------------------------------------------- */}
          {/* Jobs                                                        */}
          {/* ---------------------------------------------------------- */}
          <Card className="flex min-h-0 flex-col overflow-hidden xl:col-span-7">
            <div className="space-y-3 border-b border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`${t("search_cron_jobs")}…`}
                    className="pl-8 pr-8 text-sm"
                  />
                  {search ? (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="absolute right-1 top-1"
                      aria-label={tCommon("clear")}
                      onClick={() => setSearch("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-full text-sm sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tCommon("all_categories")}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {categoryLabel(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as CronStatusFilter)}
              >
                <TabsList className="grid w-full grid-cols-5">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 text-xs"
                    >
                      <span className="truncate">{tab.label}</span>
                      <Badge
                        appearance="soft"
                        /* The one tab that changes colour with its contents:
                           "Needs attention" carrying a number is the reason to
                           be on this page, and a grey chip said otherwise. */
                        tone={
                          tab.value === "attention" && tab.count > 0
                            ? "destructive"
                            : "neutral"
                        }
                        className="px-1.5 text-[10px] tabular-nums"
                      >
                        {tab.count}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="max-h-[38rem] min-h-0 flex-1 overflow-y-auto">
              <JobList
                jobs={filteredJobs}
                allJobs={cronJobs}
                loading={isLoadingJobs}
                onSelect={setSelectedJob}
                onTrigger={handleTrigger}
                triggering={triggering}
                canTrigger={canTrigger}
              />
            </div>
          </Card>

          {/* ---------------------------------------------------------- */}
          {/* Live stream                                                 */}
          {/* ---------------------------------------------------------- */}
          <Card className="flex h-[46rem] min-h-0 flex-col overflow-hidden xl:col-span-5">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Tabs
                value={rightPane}
                onValueChange={(value) => setRightPane(value as "log" | "activity")}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="log" className="text-xs">
                    {t("cron_live_log")}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">
                    {tCommon("activity")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {focusedLogJob ? (
                <Button
                  size="2xs"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setFocusedLogJob(null)}
                >
                  <X className="mr-1 h-3 w-3" />
                  {t("all_jobs")}
                </Button>
              ) : null}
            </div>

            {/*
              Both panes stay MOUNTED — the log keeps its scroll position and its
              paused/following state while the operator glances at the activity
              feed. TabsContent unmounts, which would silently resume a stream
              they had deliberately paused.
            */}
            <div className={cn("min-h-0 flex-1", rightPane === "log" ? "flex" : "hidden")}>
              <div className="min-h-0 w-full">
                <LogStream
                  logs={logs}
                  jobs={cronJobs}
                  focusedJob={focusedLogJob}
                  onFocusJob={setFocusedLogJob}
                  onClear={clearLogs}
                  connected={isConnected}
                />
              </div>
            </div>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-hidden",
                rightPane === "activity" ? "block" : "hidden"
              )}
            >
              <ActivityFeed
                events={timelineEvents}
                jobs={cronJobs}
                focusedJob={focusedLogJob}
                onFocusJob={setFocusedLogJob}
              />
            </div>
          </Card>
        </div>

        <CronDetailModal
          job={selected}
          isOpen={Boolean(selected)}
          onClose={() => setSelectedJob(null)}
          onTrigger={handleTrigger}
          isTriggering={triggering === selected?.name}
          canTrigger={canTrigger}
          triggerBlockedReason={
            canTrigger ? undefined : t("cron_manual_runs_unavailable_why")
          }
          onFocusLog={(name) => {
            setFocusedLogJob(name);
            setRightPane("log");
          }}
        />
      </PageShell>
    </TooltipProvider>
  );
}
