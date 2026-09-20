import type { SlaKey } from "@/config/sla";

/**
 * The shapes `/admin` reads. One file so the page and its blocks cannot drift
 * into two slightly different ideas of what the server sends.
 */

export type TimeframeOption = "weekly" | "monthly" | "yearly";

/** `GET /api/admin/dashboard` */
export interface DashboardData {
  timeframe: TimeframeOption;
  generatedAt: string;
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisPeriod: number;
    totalTransactions: number;
    pendingKYC: number;
    revenue: {
      total: number;
      currency: string;
      /**
       * Currencies the server held revenue in but could not price into USD.
       * NON-EMPTY MEANS `total` IS A LOWER BOUND — the UI has to say so rather
       * than presenting an under-count as the figure.
       */
      unpriced: string[];
    };
    /** Percent change vs the equivalent preceding window; null when it had no rows. */
    deltas: {
      users: number | null;
      revenue: number | null;
      trades: number | null;
    };
  };
  userMetrics: {
    registrations: Array<{ date: string; total: number; new: number }>;
    usersByLevel: Array<{ level: string; count: number }>;
  };
  financialMetrics: {
    dailyRevenue: Array<{ date: string; revenue: number }>;
    transactionVolume: Array<{ type: string; value: number }>;
  };
  tradingActivity: {
    dailyTrades: Array<{ date: string; count: number; volume: number }>;
    topAssets: Array<{ asset: string; volume: number; trades: number }>;
  };
  /** Fee revenue attributed to the product that earned it. */
  revenueByStream: Array<{
    key: string;
    label: string;
    /** The extension that owns this stream; null for core platform. */
    extension: string | null;
    amount: number;
    share: number;
  }>;
}

/** `GET /api/admin/operations/summary` */
export interface QueueSummary {
  key: string;
  label: string;
  href: string;
  permission: string;
  group: "core" | "addon";
  extension: string | null;
  count: number;
  breached: number;
  slaHours: number;
  oldestAt: string | null;
  /** The table could not be read — a count of 0 here means "unknown", not "clear". */
  unavailable?: boolean;
}

export interface OperationsSummary {
  total: number;
  breached: number;
  queues: QueueSummary[];
}

/** `GET /api/admin/system/health/batch` */
export interface HealthService {
  name: string;
  status: "up" | "down" | "warning" | "unconfigured";
  message: string;
  latency?: number;
  critical?: boolean;
}

export interface HealthData {
  overall: { score: number; status: "healthy" | "warning" | "critical" };
  services: HealthService[];
  timestamp: string;
}

/** `GET /api/admin/system/cron/scheduler` */
export interface SchedulerStatus {
  status: "running" | "missing" | "stale" | "duplicate" | "unknown";
  message: string;
}

/** `GET /api/admin/system/extension` */
export interface ExtensionData {
  id: string;
  productId: string;
  name: string;
  title: string;
  description: string;
  link: string;
  status: boolean;
  version: string;
  image: string;
  licenseVerified?: boolean;
}

/** `POST /api/admin/system/update/check/batch`, mapped. */
export interface UpdateInfo {
  productId: string;
  name: string;
  title: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  type: "core" | "extension";
}

/*
 * Queue PRESENTATION — the icon per queue, the urgency rule, the tone maps and
 * the sort order — lives in `@/config/operations`, not here. Two surfaces render
 * queues (this dashboard work board and the header Operations dropdown), and
 * they have to agree on all four; a copy in this folder would be reachable from
 * only one of them.
 */
export type { SlaKey };
