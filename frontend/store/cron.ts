import { create } from "zustand";
import { $fetch } from "@/lib/api";

// Module-level lock to prevent duplicate triggers
const triggerInProgress: Record<string, boolean> = {};

/**
 * Why a job is not doing its work — backend `cron/refusal.ts`.
 *
 * A refused handler RETURNS NORMALLY, so without this the admin table showed a
 * job that has not executed a line of its work in days as "completed" every
 * tick. Sticky on the backend: it survives across runs and is cleared only by a
 * run that did not refuse, so an empty value here means healthy, not unknown.
 */
export interface CronRefusal {
  /** `refused` — the handler did not run. `degraded` — it ran with nowhere for its work to land. */
  kind: "refused" | "degraded";
  reason: string;
  impact: string;
  fix: string;
  /** When the refusal STARTED — "skipped for six hours", not "skipped just now". */
  since: Date | string;
  lastSeen: Date | string;
}

// Define types
export interface CronJob {
  name: string;
  title: string;
  description: string;
  period: number;
  function: string;
  // Arrives as an ISO string over JSON/WS — always parse with new Date(...),
  // never check `instanceof Date` (that made the list view show "Never").
  lastRun: Date | string | null;
  lastRunError: string | null;
  category: string;
  status: "idle" | "running" | "completed" | "failed" | "refused";
  progress: number;
  executionTime?: number;
  successRate?: number;
  refusal?: CronRefusal | null;
  lastExecutions?: {
    timestamp: Date;
    duration: number;
    status: "completed" | "failed" | "refused";
  }[];
  resourceUsage?: {
    cpu: number;
    memory: number;
  };
  nextScheduledRun?: Date | string;
}

export interface CronLog {
  id: string;
  cronName: string;
  timestamp: Date;
  message: string;
  type: "info" | "warning" | "error" | "success";
}

/**
 * WHO is registering cron jobs — `GET /api/admin/system/cron/scheduler`.
 *
 * The job list cannot answer this. Every process carries the same registry and
 * hydrates its run bookkeeping from a Redis snapshot that outlives the process
 * that wrote it by 24 hours, so a scheduler that died an hour ago still renders
 * as 65 jobs with plausible "last run" times. This is the separate liveness
 * signal (15s beat, 90s TTL) that says whether any of it is still true.
 */
export type SchedulerStatus =
  | "running"
  | "missing"
  | "stale"
  | "duplicate"
  /** The heartbeat could not be READ — not the same as "no scheduler". */
  | "unknown"
  /** This backend has no such route (an older build). Say so, do not guess. */
  | "unavailable";

export interface SchedulerPeer {
  instanceId: string;
  pid: number;
  hostname: string;
  at: number;
}

export interface SchedulerInfo {
  status: SchedulerStatus;
  message: string;
  /** The process that SERVED this request — the one the browser talks to. */
  process: {
    mode: "inline" | "off" | "only";
    pid: number;
    hostname: string;
    registersJobs: boolean;
    delegated: boolean;
    /** Mirrors the two refusals in triggerJob, so "Run now" can explain itself. */
    canTrigger: boolean;
  } | null;
  /** The process that is BEATING, which may be a different one entirely. */
  scheduler: {
    instanceId: string;
    pid: number;
    hostname: string;
    mode: "inline" | "off" | "only";
    jobs: number;
    at: string;
    ageMs: number;
    stale: boolean;
    sameProcess: boolean;
    peer: SchedulerPeer | null;
  } | null;
}

export interface TimelineEvent {
  id: string;
  cronName: string;
  eventType: "started" | "completed" | "failed" | "scheduled" | "refused";
  timestamp: Date;
  duration?: number;
}

/**
 * The filter rail above the job list.
 *
 * `attention` is not a backend status — it is the union an operator actually
 * arrives on this page looking for: refused, degraded, or failed. Those three
 * live in two different fields (`status` and `refusal.kind`), and a degraded
 * job reports `status: "completed"`, so no single status tab can gather them.
 */
export type CronStatusFilter =
  | "all"
  | "attention"
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "refused";

interface CronState {
  // State
  cronJobs: CronJob[];
  logs: CronLog[];
  timelineEvents: TimelineEvent[];
  isConnected: boolean;
  activeTab: CronStatusFilter;
  searchQuery: string;
  categoryFilter: string;
  scheduler: SchedulerInfo | null;
  /** True until the first job list resolves — distinguishes empty from pending. */
  isLoadingJobs: boolean;
  /** Non-null when the job list could not be read at all. */
  jobsError: string | null;
  /** When the job list was last read over HTTP (ms epoch), for "as of". */
  lastFetchedAt: number | null;

  // Actions
  setCronJobs: (jobs: unknown) => void;
  updateCronJob: (name: string, data: Partial<CronJob>) => void;
  addLog: (log: CronLog) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  setIsConnected: (connected: boolean) => void;
  setActiveTab: (tab: CronStatusFilter) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  clearLogs: () => void;

  // Derived state
  getFilteredJobs: () => CronJob[];

  // API actions
  fetchCronJobs: () => Promise<void>;
  fetchScheduler: () => Promise<void>;
  triggerCronJob: (cronName: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * A job's OPERATIONAL state — the one thing the cron page exists to get right.
 *
 * The backend sends two fields and they disagree on purpose. `status` is the
 * outcome of the last TICK; `refusal` is a STANDING condition that survives
 * across runs (backend `cron/refusal.ts`). Reading `status` alone is the bug
 * the cron dashboard was rebuilt to remove, in two distinct shapes:
 *
 *   - a REFUSED job's handler returns normally, so before the sticky state
 *     existed it was stamped "completed" every tick. A money job that had not
 *     executed a line of its work in a week was byte-identical to one
 *     succeeding every 30 seconds.
 *   - a DEGRADED job genuinely runs and genuinely returns — its `status` really
 *     is "completed" — but its work has nowhere to land. No status value says
 *     that, and none should: the tick was not skipped. It needs its own state.
 *
 * Derived here, in the store, so the filter below and every component read the
 * same answer. `statusTone()` resolves the colour from the platform table
 * (REFUSED -> destructive, DEGRADED -> warning); nothing here picks a hue.
 */
export type CronJobState =
  | "running"
  | "refused"
  | "failed"
  | "degraded"
  | "completed"
  | "idle";

/**
 * PRECEDENCE, and why refused outranks failed.
 *
 * A failed job tried and will try again on its next tick — it may well be green
 * by the time an operator finishes reading. A refused job will keep declining,
 * every tick, until somebody changes a setting or a process layout. Of the two
 * it is the one that cannot fix itself, so it is the one that gets the row.
 * (The backend's `status` breaks the tie the other way because it describes a
 * single RUN; this describes a JOB.)
 */
export function cronJobState(job: CronJob): CronJobState {
  if (job.status === "running") return "running";
  if (job.refusal?.kind === "refused" || job.status === "refused") {
    return "refused";
  }
  if (job.status === "failed" || job.lastRunError) return "failed";
  if (job.refusal?.kind === "degraded") return "degraded";
  if (job.status === "completed") return "completed";
  return "idle";
}

/** A job that is scheduled and is not doing its work — refused OR degraded. */
export function isNotWorking(job: CronJob): boolean {
  const state = cronJobState(job);
  return state === "refused" || state === "degraded";
}

/** Does this job need a human? The union the "Attention" filter gathers. */
export function needsAttention(job: CronJob): boolean {
  const state = cronJobState(job);
  return state === "refused" || state === "degraded" || state === "failed";
}

export const useCronStore = create<CronState>((set, get) => ({
  // Initial state
  cronJobs: [],
  logs: [],
  timelineEvents: [],
  isConnected: false,
  activeTab: "all",
  searchQuery: "",
  categoryFilter: "all",
  scheduler: null,
  isLoadingJobs: true,
  jobsError: null,
  lastFetchedAt: null,

  // Actions
  setCronJobs: (jobs) => {
    // Guarded, because `getFilteredJobs` spreads this and a non-array would
    // throw during RENDER — taking the whole page down rather than showing an
    // empty list. The backend answers a bare array, but this codebase also
    // returns error envelopes at HTTP 200 (CORS pins uWS to 200), so a body
    // that is not an array is a shape this store has to survive.
    set({
      cronJobs: Array.isArray(jobs) ? (jobs as CronJob[]) : [],
      isLoadingJobs: false,
      lastFetchedAt: Date.now(),
    });
  },

  updateCronJob: (name, data) => {
    set((state) => ({
      cronJobs: state.cronJobs.map((job) =>
        job.name === name ? { ...job, ...data } : job
      ),
    }));
  },

  addLog: (log) => {
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 1000),
    }));
  },

  addTimelineEvent: (event) => {
    set((state) => ({
      timelineEvents: [event, ...state.timelineEvents].slice(0, 100),
    }));
  },

  setIsConnected: (connected) => {
    set({ isConnected: connected });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  setCategoryFilter: (category) => {
    set({ categoryFilter: category });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  // Derived state
  getFilteredJobs: () => {
    const { cronJobs, activeTab, searchQuery, categoryFilter } = get();

    // Defensive: see setCronJobs. This runs during render.
    let filtered = Array.isArray(cronJobs) ? [...cronJobs] : [];

    if (activeTab === "attention") {
      // The union no status tab can express — see CronStatusFilter.
      filtered = filtered.filter(needsAttention);
    } else if (activeTab !== "all") {
      // The DERIVED state, not `job.status`: filtering on the raw field would
      // put a degraded job (status "completed") under Completed, which is the
      // exact reading this page exists to prevent.
      filtered = filtered.filter((job) => cronJobState(job) === activeTab);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (job) => (job.category || "normal") === categoryFilter
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.name.toLowerCase().includes(query) ||
          job.title.toLowerCase().includes(query) ||
          (job.description || "").toLowerCase().includes(query) ||
          (job.category || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  },

  // API actions
  fetchCronJobs: async () => {
    const { data, error } = await $fetch({
      url: "/api/admin/system/cron",
      silent: true,
    });
    if (error) {
      // Keep whatever list is already on screen: a failed refresh must not
      // blank a page an operator is reading during an incident. The banner
      // says the figures are stale; it does not pretend there are no jobs.
      set({ isLoadingJobs: false, jobsError: String(error) });
      return;
    }
    set({ jobsError: null });
    get().setCronJobs(data);
  },

  fetchScheduler: async () => {
    const { data, error } = await $fetch({
      url: "/api/admin/system/cron/scheduler",
      silent: true,
    });
    if (error || !data || typeof data !== "object") {
      // `unavailable`, NOT `missing`. A backend built before this route existed
      // answers 404 here, and rendering that as "NO SCHEDULER IS RUNNING" would
      // be a false alarm of exactly the kind that teaches operators to ignore
      // this banner.
      set({
        scheduler: {
          status: "unavailable",
          message: String(
            error ||
              "The scheduler placement endpoint did not answer, so this page cannot say which process is running the jobs."
          ),
          process: null,
          scheduler: null,
        },
      });
      return;
    }
    set({ scheduler: data as SchedulerInfo });
  },

  triggerCronJob: async (cronName: string) => {
    // Prevent duplicate triggers using module-level lock
    if (triggerInProgress[cronName]) {
      return { success: false, error: "Trigger already in progress" };
    }

    triggerInProgress[cronName] = true;

    try {
      const { error } = await $fetch({
        url: "/api/admin/system/cron/trigger",
        method: "POST",
        body: { cronName },
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    } finally {
      // Clear the lock after a short delay to prevent rapid re-triggers
      setTimeout(() => {
        delete triggerInProgress[cronName];
      }, 1000);
    }
  },
}));

// Helper function to handle WebSocket messages
export function handleWebSocketMessage(message: any) {
  const { type, cronName, data, timestamp } = message;
  const store = useCronStore.getState();

  switch (type) {
    case "init":
      if (data.cronJobs && Array.isArray(data.cronJobs)) {
        store.setCronJobs(data.cronJobs);
      }
      break;

    case "status": {
      // The engine broadcasts an "idle" reset ~5s after a run finishes; it
      // only clears the transient status/progress — never clobber the
      // lastRun/duration just recorded, and skip timeline/log noise for it.
      if (data.status === "idle") {
        store.updateCronJob(cronName, { status: "idle", progress: 0 });
        break;
      }

      const finished =
        data.status === "completed" ||
        data.status === "failed" ||
        data.status === "refused";

      const update: Partial<CronJob> = { status: data.status };
      if (finished) {
        update.lastRun = new Date(timestamp);
        if (typeof data.duration === "number") {
          update.executionTime = data.duration;
        }
        // Present on every finished broadcast, `null` included — that null is
        // what clears a refusal banner off a dashboard left open across the
        // fix, so it must not be treated as "no news".
        if ("refusal" in data) {
          update.refusal = data.refusal ?? null;
        }
      }
      store.updateCronJob(cronName, update);

      // Add timeline event
      if (data.status === "running") {
        store.addTimelineEvent({
          id: Date.now().toString(),
          cronName,
          eventType: "started",
          timestamp: new Date(timestamp),
        });
      } else if (finished) {
        store.addTimelineEvent({
          id: Date.now().toString(),
          cronName,
          eventType:
            data.status === "completed"
              ? "completed"
              : data.status === "refused"
                ? "refused"
                : "failed",
          timestamp: new Date(timestamp),
          // Only the real reported duration — never fabricate one. Failed
          // broadcasts may carry none; TimelineView renders it conditionally.
          duration:
            typeof data.duration === "number" ? data.duration : undefined,
        });
      }

      // Add log. A refusal reads as an error, not information: the job did not
      // do its work, and the whole point of the state is that it must not blend
      // into the run-by-run chatter.
      store.addLog({
        id: Date.now().toString(),
        cronName,
        timestamp: new Date(timestamp),
        message:
          data.status === "refused" && data.refusal?.reason
            ? `Refused to run: ${data.refusal.reason}`
            : `Status changed to ${data.status}`,
        type:
          data.status === "failed" || data.status === "refused"
            ? "error"
            : "info",
      });
      break;
    }

    case "progress":
      store.updateCronJob(cronName, { progress: data.progress });
      break;

    case "log":
      store.addLog({
        id: Date.now().toString(),
        cronName,
        timestamp: new Date(timestamp),
        message: data.message,
        type: data.logType || "info",
      });
      break;

    case "timelineEvents":
      if (data.timelineEvents && Array.isArray(data.timelineEvents)) {
        data.timelineEvents.forEach((event: TimelineEvent) => {
          store.addTimelineEvent(event);
        });
      }
      break;
  }
}
