"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRightLeft, CheckCircle2, Cog, FileSearch, Landmark, Layers, Network, RefreshCw, Scale, Send, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/app/[locale]/(dashboard)/admin/finance/deposit/gateway/[id]/components/copy-field";

/**
 * POOL BACKING — what each pool owes against what it holds.
 *
 * A SPOT balance is a number backed by one pooled exchange account; a Funding
 * (ECO) balance is a number backed by on-chain custody. A transfer between the
 * two, or an admin credit, moves the number and leaves the coins where they
 * were. The backend keeps one obligation row per such move and reconciles
 * every currency's liabilities against the exchange's holdings every fifteen
 * minutes; this page shows both and carries the operator's doors: run a
 * reconciliation now, acknowledge a persistent unexplained drift, record a
 * movement made outside the platform, and waive an obligation as a
 * recognised loss.
 *
 * Phase 2 added the engine that moves the coins. The page now also shows the
 * engine's state and what it refused last cycle, the treasury (the platform's
 * own custody wallets that settlements are paid into and sent from), every
 * settlement with its transaction id and proof, and the doors a stuck
 * settlement needs — attach the txid the engine lost, mark it arrived on the
 * receiving side's evidence, or mark it failed so its obligations reopen —
 * plus "Settle now" per currency, which runs one engine cycle by hand.
 *
 * Phase 3 widened the ledger to the ecosystem side. The page now shows, per
 * currency and chain, what the Funding wallets are owed (Le) against what the
 * platform's custody addresses hold on-chain (He) — a live sum only when every
 * address has a figure, otherwise the known part with its read coverage and the
 * oldest read, because a sum that silently omits addresses is the one lie this
 * page must never tell. Liabilities gained the parallel-stores line (principals
 * parked in stores Spot funded) with its breakdown; settlements gained the
 * exchange conversion (a market order that buys the currency the exchange owes
 * and never received) with its order id and fill, and the "Convert now" door
 * that opens only while the conversion switch is on in manual or auto; the
 * obligation list gained a source filter so the venue-fee rows the attribution
 * job books can be found.
 *
 * Every read here is null-safe against the response shapes: the routes are
 * built alongside this page, and a field the backend has not written yet must
 * degrade to a dash or a hidden section, never to a blank page.
 */

/** Principals parked in stores Spot funded — the parallel-stores line of L. */
interface ParallelStores {
  copyTrading: number;
  investment: number;
  aiInvestment: number;
  staking: number;
  forex: number;
  fxTrading: number;
  total: number;
  notes: string[];
}

/** The ecosystem side of one (currency, chain), as the reconciliation persisted it. */
interface EcoChainFigures {
  le: number;
  leTreasury: number;
  leUnattributed: number;
  /** a number ONLY when `status` is `ok`; the page shows `heKnown` with the coverage otherwise */
  he: number | null;
  heKnown: number;
  heByKind: Record<string, number>;
  addressesTotal: number;
  addressesRead: number;
  addressesErrored: number;
  oldestReadAt: string | null;
  newestReadAt: string | null;
  gapE: number | null;
  status: "ok" | "partial" | "unknown";
  /** why `unknown`: the treasury/master read that failed, or was not made this run */
  unknownReason?: string | null;
  /** the wallet table's own figure — non-authoritative, never used to decide anything */
  mirror: number | null;
  openObligations: number;
  residual: number | null;
}

/** The custody read cache's live coverage for one (currency, chain). */
interface CustodyCoverage {
  total: number;
  read: number;
  neverRead: number;
  errored: number;
  anchorsErrored: number;
  mirrored: number;
  oldestReadAt: string | null;
  newestReadAt: string | null;
}

interface CurrencyRow {
  currency: string;
  reconciliation: {
    at: string;
    status: "ok" | "h_unknown";
    liabilities: number;
    liabilitiesSplit: { customers: number; superAdmin: number; pendingWithdrawals: number; parallelStores?: ParallelStores | null } | null;
    /** the breakdown behind the parallel-stores line; null = not read that run (not zero) */
    parallelStores?: ParallelStores | null;
    holdings: number | null;
    holdingsSplit: { accounts?: Array<{ type: string | null; fetchedAt: string; error?: string }>; perAccount?: Record<string, number> } | null;
    ecosystemSplit?: Record<string, EcoChainFigures> | null;
    /** why the ecosystem side was NOT read that run; null when it was, or when the currency has none */
    ecosystemError?: string | null;
    inFlight: number;
    gap: number | null;
    openObligations: number;
    residual: number | null;
    driftRunStreak: number;
    /**
     * Σ WAIVED rows of the currency — recognised loss that still explains the
     * gap (residual = gap − open − waived). Named as the summary route emits it
     * (`reconciliation.waivedObligations`, index.get.ts); absent on older rows.
     */
    waivedObligations?: number | null;
  } | null;
  custodyReads?: Record<string, CustodyCoverage> | null;
  open: { exchange: number; ecosystem: number; nettable: number; bySource: Record<string, number>; rows: number; convertible?: number };
  drift: { amount: number | null; firstSeenAt: string | null; acknowledged: boolean; acknowledgedAt: string | null; acknowledgedAmount: number | null };
  capUsd: number | null;
  thresholdUsd: number | null;
  notes: string | null;
}

/** The venue order behind an exchange conversion, lifted from its proof. */
interface Conversion {
  exchangeOrderId: string | null;
  symbol: string | null;
  side: string | null;
  requested: number | null;
  filled: number | null;
  cost: number | null;
  average: number | null;
  fee: { cost: number | null; currency: string | null } | number | null;
}

interface Settlement {
  id: string;
  currency: string;
  direction: string;
  chain: string | null;
  network?: string | null;
  amountRequested: string | number;
  amountSent?: string | number | null;
  amountReceived?: string | number | null;
  status: string;
  txid?: string | null;
  proof?: unknown;
  fees?: unknown;
  note?: string | null;
  initiatedBy?: string | null;
  conversion?: Conversion | null;
  createdAt: string;
  updatedAt?: string;
}

interface EngineInfo {
  mode?: string;
  paused?: boolean;
  autoConvert?: boolean;
  ecosystemInstalled?: boolean;
  lastCycleAt?: string | null;
  lastRefusals?: unknown;
  planningSkipped?: string | null;
}

interface Summary {
  settings: { mode: string; capUsd: number | null; thresholdUsd: number; paused: boolean; driftRuns: number; alertUsd: number | null; maxSettlementUsd?: number | null; autoConvert?: boolean };
  ecosystemInstalled: boolean;
  lastRunAt: string | null;
  currencies: CurrencyRow[];
  settlements: Settlement[];
  engine?: EngineInfo | null;
  treasury?: { userId?: string | null; currencies?: number } | null;
}

interface Obligation {
  id: string;
  currency: string;
  side: string;
  chain: string | null;
  amount: string | number;
  source: string;
  status: string;
  nettable: boolean;
  sourceRef: string | null;
  legs?: unknown;
  evidence?: unknown;
  createdBy: string | null;
  createdAt: string;
  waiveReason: string | null;
}

interface TreasuryChain {
  chain: string;
  address: string | null;
  balance: number | null;
  networkId: string | null;
  source: string | null;
  flags: Array<"unmapped" | "deposit_disabled" | "withdraw_disabled" | "unsupported">;
}

interface TreasuryCurrency {
  currency: string;
  walletId: string | null;
  balance: number | null;
  chains: TreasuryChain[];
}

interface Treasury {
  userId: string | null;
  email: string | null;
  currencies: TreasuryCurrency[];
  /** `poolBackingMasterReserve` as the signer reads it, and the keys it never looks up. */
  masterReserve: { entries: Record<string, number>; unknownChains: string[] } | null;
}

const ACTIVE_SETTLEMENT_STATUSES = ["PLANNED", "DISPATCHED", "CONFIRMED", "NEEDS_REVIEW"];
const SETTLEMENT_FILTERS = ["ACTIVE", "NEEDS_REVIEW", "SETTLED", "FAILED", "RECORDED", "CONVERSIONS", "ALL"];
/** The obligation `source` ENUM, in the ledger's order; the list's second filter. */
const OBLIGATION_SOURCES = ["transfer", "conversion", "fiat_transfer", "admin", "minted", "exchange_fee"];
/** The custody-read kinds, in the order He is summed. */
const CUSTODY_KINDS = ["treasury", "master", "custodial", "customer"];
const CONVERSION_DIRECTION = "exchange_convert";

const fmt = (value: number | null | undefined, digits = 8) =>
  value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(digits).replace(/\.?0+$/, "") || "0";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "—");

const shortHash = (hash: string) => (hash.length > 18 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash);

/** JSON columns may arrive as objects, as strings, or as strings of strings. */
const parseJsonish = (value: unknown): any => {
  let v = value;
  for (let i = 0; i < 2 && typeof v === "string"; i++) {
    try {
      v = JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
};

const txidOf = (s: Settlement): string | null => {
  const proof = parseJsonish(s.proof);
  const raw = s.txid ?? proof?.txid ?? proof?.txHashPending ?? null;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * The venue order behind a conversion settlement. The summary route lifts it
 * to `conversion`; the list route hands the raw row, so the proof is read the
 * same way (`{ exchangeOrderId, symbol, side, requested, filled, cost,
 * average, fee }`). Null for every other direction.
 */
const conversionOf = (s: Settlement): Conversion | null => {
  if (s.direction !== CONVERSION_DIRECTION) return null;
  if (s.conversion && typeof s.conversion === "object") return s.conversion;
  const proof = parseJsonish(s.proof);
  const p = proof && typeof proof === "object" ? proof : {};
  const fee = p.fee && typeof p.fee === "object" ? { cost: toNumberOrNull(p.fee.cost), currency: typeof p.fee.currency === "string" ? p.fee.currency : null } : toNumberOrNull(p.fee);
  return {
    exchangeOrderId: p.exchangeOrderId == null ? null : String(p.exchangeOrderId),
    symbol: typeof p.symbol === "string" ? p.symbol : null,
    side: typeof p.side === "string" ? p.side : null,
    requested: toNumberOrNull(p.requested),
    filled: toNumberOrNull(p.filled),
    cost: toNumberOrNull(p.cost),
    average: toNumberOrNull(p.average),
    fee,
  };
};

/** The parallel-stores breakdown of a currency's latest run, wherever the route put it. */
const parallelStoresOf = (row: CurrencyRow): ParallelStores | null => {
  const rec = row.reconciliation;
  if (!rec) return null;
  const stores = rec.parallelStores ?? rec.liabilitiesSplit?.parallelStores ?? null;
  return stores && typeof stores === "object" ? stores : null;
};

/**
 * `engine.lastRefusals` lists refusals by currency with reasons. Accept the
 * shapes that phrase can mean — an array of {currency, reason}, a map of
 * currency → reason, a map of currency → reasons[] — and flatten to one list.
 */
function refusalList(value: unknown): Array<{ currency: string; reason: string }> {
  if (!value) return [];
  const reasonOf = (r: any): string =>
    typeof r === "string" ? r : typeof r?.reason === "string" ? r.reason : typeof r?.message === "string" ? r.message : JSON.stringify(r);
  if (Array.isArray(value)) {
    return value.map((r: any) => ({ currency: typeof r?.currency === "string" ? r.currency : "", reason: reasonOf(r) }));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([currency, r]) =>
      Array.isArray(r) ? r.map((x) => ({ currency, reason: reasonOf(x) })) : [{ currency, reason: reasonOf(r) }]
    );
  }
  return [{ currency: "", reason: String(value) }];
}

/**
 * The treasury route returns `readTreasuryHoldings()` (currency, walletId,
 * balance, chains: chain → {address, balance}) plus the user and the network
 * map validation per chain (`resolveNetworkId` + capability flags). Where the
 * validation sits — on the chain entry, on the currency row, or in a top-level
 * map — is the route owner's call; read every one of those places.
 */
function normaliseTreasury(raw: any): Treasury {
  const user = raw?.user ?? raw?.treasury ?? null;
  const list: any[] = Array.isArray(raw?.holdings)
    ? raw.holdings
    : Array.isArray(raw?.currencies)
      ? raw.currencies
      : Array.isArray(raw?.wallets)
        ? raw.wallets
        : Array.isArray(raw)
          ? raw
          : [];
  const topNetworks = raw?.networks ?? raw?.networkMap ?? raw?.validation ?? null;

  const currencies: TreasuryCurrency[] = list
    .filter((h) => h && typeof h.currency === "string")
    .map((h) => {
      const chainsRaw = h.chains ?? h.addresses ?? {};
      const entries: Array<[string, any]> = Array.isArray(chainsRaw)
        ? chainsRaw.filter((c: any) => c && typeof c.chain === "string").map((c: any) => [c.chain, c] as [string, any])
        : Object.entries(chainsRaw ?? {});
      const chains: TreasuryChain[] = entries.map(([chain, info]) => {
        const net =
          info?.network ??
          h.networks?.[chain] ??
          h.networkMap?.[chain] ??
          topNetworks?.[h.currency]?.[chain] ??
          topNetworks?.[h.currency]?.chains?.[chain] ??
          null;
        const networkId =
          typeof net === "string" ? net : typeof net?.networkId === "string" ? net.networkId : typeof info?.networkId === "string" ? info.networkId : null;
        const source = typeof net?.source === "string" ? net.source : null;
        const flags: TreasuryChain["flags"] = [];
        if (!networkId || source === "none") flags.push("unmapped");
        if (net?.deposit === false || net?.active === false || net?.depositEnabled === false) flags.push("deposit_disabled");
        if (net?.withdraw === false || net?.withdrawEnabled === false) flags.push("withdraw_disabled");
        if (net?.kind === "unsupported" || net?.supported === false || info?.kind === "unsupported" || info?.supported === false) flags.push("unsupported");
        return {
          chain,
          address: typeof info?.address === "string" ? info.address : typeof info === "string" ? info : null,
          balance: toNumberOrNull(info?.balance),
          networkId,
          source,
          flags,
        };
      });
      return {
        currency: h.currency,
        walletId: typeof h.walletId === "string" ? h.walletId : null,
        balance: toNumberOrNull(h.balance),
        chains,
      };
    });

  // The reserve map: every entry the parser kept, and the keys that name no
  // ecosystem chain — listed, never silently dropped.
  const reserveRaw = raw?.masterReserve ?? null;
  const reserveEntries: Record<string, number> = {};
  for (const [chain, amount] of Object.entries(reserveRaw?.entries ?? {})) {
    const n = toNumberOrNull(amount);
    if (n != null) reserveEntries[chain] = n;
  }
  const masterReserve =
    reserveRaw && typeof reserveRaw === "object"
      ? {
          entries: reserveEntries,
          unknownChains: Array.isArray(reserveRaw.unknownChains) ? reserveRaw.unknownChains.map((c: unknown) => String(c)) : [],
        }
      : null;

  return {
    userId: raw?.userId ?? user?.id ?? user?.userId ?? null,
    email: raw?.email ?? user?.email ?? null,
    currencies,
    masterReserve,
  };
}

export default function PoolBackingPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [obligationsTotal, setObligationsTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<Obligation | null>(null);
  const [convertTarget, setConvertTarget] = useState<{ currency: string; convertible: number } | null>(null);

  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [treasuryError, setTreasuryError] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementsTotal, setSettlementsTotal] = useState(0);
  const [settlementFilter, setSettlementFilter] = useState<string>("ACTIVE");
  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementsFromSummary, setSettlementsFromSummary] = useState(false);
  const [settleTarget, setSettleTarget] = useState<{ currency: string; chains: string[] } | null>(null);
  const [attachTarget, setAttachTarget] = useState<Settlement | null>(null);
  const [arrivedTarget, setArrivedTarget] = useState<Settlement | null>(null);
  const [failTarget, setFailTarget] = useState<Settlement | null>(null);

  const loadSummary = useCallback(async () => {
    const { data, error } = await $fetch<Summary>({ url: "/api/admin/finance/pool-backing", silent: true });
    if (error || !data) {
      toast.error(typeof error === "string" ? error : t("pool_backing_failed_to_load"));
      return;
    }
    setSummary(data);
  }, [t]);

  const loadTreasury = useCallback(async () => {
    const { data, error } = await $fetch<any>({ url: "/api/admin/finance/pool-backing/treasury", silent: true });
    if (error || !data) {
      setTreasuryError(typeof error === "string" ? error : "unavailable");
      return;
    }
    setTreasuryError(null);
    setTreasury(normaliseTreasury(data));
  }, []);

  const loadObligations = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "25", sortField: "createdAt", sortOrder: "desc" });
    const filter: Record<string, string> = {};
    if (statusFilter !== "ALL") filter.status = statusFilter;
    if (sourceFilter !== "ALL") filter.source = sourceFilter;
    if (Object.keys(filter).length > 0) params.set("filter", JSON.stringify(filter));
    const { data, error } = await $fetch<{ items: Obligation[]; pagination: { totalItems: number } }>({
      url: `/api/admin/finance/pool-backing/obligation?${params.toString()}`,
      silent: true,
    });
    if (error || !data) return;
    setObligations(data.items ?? []);
    setObligationsTotal(data.pagination?.totalItems ?? 0);
  }, [page, statusFilter, sourceFilter]);

  const loadSettlements = useCallback(async () => {
    const params = new URLSearchParams({ page: String(settlementPage), perPage: "25", sortField: "createdAt", sortOrder: "desc" });
    if (settlementFilter === "ACTIVE") {
      params.set("filter", JSON.stringify({ status: { value: ACTIVE_SETTLEMENT_STATUSES, operator: "in" } }));
    } else if (settlementFilter === "CONVERSIONS") {
      params.set("filter", JSON.stringify({ direction: CONVERSION_DIRECTION }));
    } else if (settlementFilter !== "ALL") {
      params.set("filter", JSON.stringify({ status: settlementFilter }));
    }
    const { data, error } = await $fetch<{ items: Settlement[]; pagination: { totalItems: number } }>({
      url: `/api/admin/finance/pool-backing/settlement?${params.toString()}`,
      silent: true,
    });
    if (error || !data) {
      // The list route is unreachable: fall back to the in-flight rows the
      // summary carries so the doors stay usable.
      setSettlementsFromSummary(true);
      return;
    }
    setSettlementsFromSummary(false);
    setSettlements(data.items ?? []);
    setSettlementsTotal(data.pagination?.totalItems ?? 0);
  }, [settlementPage, settlementFilter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadSummary(), loadTreasury()]);
      setLoading(false);
    })();
  }, [loadSummary, loadTreasury]);

  useEffect(() => {
    loadObligations();
  }, [loadObligations]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSummary(), loadTreasury(), loadObligations(), loadSettlements()]);
  }, [loadSummary, loadTreasury, loadObligations, loadSettlements]);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await $fetch<any>({ url: "/api/admin/finance/pool-backing/reconcile", method: "POST", silent: true });
    setRunning(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_reconciliation_failed"));
      return;
    }
    toast.success(
      data?.skipped
        ? `${t("pool_backing_reconciliation_skipped")}: ${data.skipped}`
        : t("pool_backing_reconciled_currencies", { count: data?.currencies ?? 0 })
    );
    await loadSummary();
  };

  const acknowledge = async (currency: string) => {
    const { error, data } = await $fetch<any>({
      url: `/api/admin/finance/pool-backing/currency/${encodeURIComponent(currency)}/acknowledge-drift`,
      method: "POST",
      body: {},
      silent: true,
    });
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_acknowledge_failed"));
      return;
    }
    toast.success(data?.message ?? t("pool_backing_drift_acknowledged"));
    await loadSummary();
  };

  const mode = summary?.settings.mode ?? "monitor";
  const stale = useMemo(() => summary?.currencies.some((c) => c.reconciliation?.status === "h_unknown") ?? false, [summary]);
  const unacknowledged = useMemo(
    () => summary?.currencies.filter((c) => c.drift.amount != null && !c.drift.acknowledged) ?? [],
    [summary]
  );

  const engine = summary?.engine ?? null;
  const engineMode = engine?.mode ?? mode;
  const enginePaused = engine?.paused ?? summary?.settings.paused ?? false;
  const ecosystemInstalled = summary?.ecosystemInstalled ?? engine?.ecosystemInstalled ?? false;
  const refusals = useMemo(() => refusalList(engine?.lastRefusals), [engine]);
  // Literal map, never a computed key: the extractor and the optimiser can only
  // see keys written out in full.
  const engineLabel: Record<string, string> = {
    off: t("pool_backing_engine_off"),
    monitor: t("pool_backing_engine_monitor"),
    manual: t("pool_backing_engine_manual"),
    auto: t("pool_backing_engine_auto"),
  };
  const directionLabel: Record<string, string> = {
    eco_to_exchange: t("pool_backing_direction_eco_to_exchange_short"),
    exchange_to_eco: t("pool_backing_direction_exchange_to_eco_short"),
    exchange_convert: t("pool_backing_direction_exchange_convert_short"),
    external: t("pool_backing_direction_external"),
  };
  const networkFlagLabel: Record<TreasuryChain["flags"][number], string> = {
    unmapped: t("pool_backing_network_unmapped"),
    deposit_disabled: t("pool_backing_network_deposit_disabled"),
    withdraw_disabled: t("pool_backing_network_withdraw_disabled"),
    unsupported: t("pool_backing_network_unsupported"),
  };
  const sourceLabel: Record<string, string> = {
    transfer: t("pool_backing_source_transfer"),
    conversion: t("pool_backing_source_conversion"),
    fiat_transfer: t("pool_backing_source_fiat_transfer"),
    admin: t("pool_backing_source_admin"),
    minted: t("pool_backing_source_minted"),
    exchange_fee: t("pool_backing_source_exchange_fee"),
  };
  const ecoStatusLabel: Record<string, string> = {
    ok: t("pool_backing_eco_status_ok"),
    partial: t("pool_backing_eco_status_partial"),
    unknown: t("pool_backing_eco_status_unknown"),
  };
  const kindLabel: Record<string, string> = {
    treasury: t("pool_backing_kind_treasury"),
    master: t("pool_backing_kind_master"),
    custodial: t("pool_backing_kind_custodial"),
    customer: t("pool_backing_kind_customer"),
  };

  const settleBlockedReason = !summary
    ? null
    : enginePaused
      ? t("pool_backing_settle_disabled_paused")
      : mode !== "manual" && mode !== "auto"
        ? t("pool_backing_settle_disabled_mode")
        : null;
  const canSettle = !!summary && ecosystemInstalled && settleBlockedReason === null;
  // The conversion door exists only while the switch is on and the mode is at
  // least manual; a paused engine keeps it visible but shut, like Settle now.
  const autoConvert = engine?.autoConvert ?? summary?.settings.autoConvert ?? false;
  const showConvert = !!summary && autoConvert && (mode === "manual" || mode === "auto");
  const hasActions = ecosystemInstalled || showConvert;
  const currencyColumns = hasActions ? 9 : 8;

  const treasuryChainsFor = useCallback(
    (currency: string): string[] => treasury?.currencies.find((c) => c.currency === currency)?.chains.map((c) => c.chain) ?? [],
    [treasury]
  );

  /** One row per (currency, chain) the latest reconciliation read on the ecosystem side. */
  const ecosystemRows = useMemo(
    () =>
      (summary?.currencies ?? []).flatMap((c) =>
        Object.entries(c.reconciliation?.ecosystemSplit ?? {}).map(([chain, figures], idx) => ({
          currency: c.currency,
          chain,
          figures,
          coverage: c.custodyReads?.[chain] ?? null,
          at: c.reconciliation?.at ?? null,
          first: idx === 0,
        }))
      ),
    [summary]
  );
  /** Currencies whose ecosystem side was NOT read in the latest reconciliation: shown as such, never as "no ecosystem side". */
  const ecosystemUnread = useMemo(
    () =>
      (summary?.currencies ?? [])
        .filter((c) => !!c.reconciliation?.ecosystemError)
        .map((c) => ({ currency: c.currency, error: String(c.reconciliation?.ecosystemError), at: c.reconciliation?.at ?? null, coverage: c.custodyReads ?? null })),
    [summary]
  );

  const visibleSettlements: Settlement[] = useMemo(() => {
    if (!settlementsFromSummary) return settlements;
    const rows = summary?.settlements ?? [];
    if (settlementFilter === "ACTIVE" || settlementFilter === "ALL") return rows;
    if (settlementFilter === "CONVERSIONS") return rows.filter((s) => s.direction === CONVERSION_DIRECTION);
    return rows.filter((s) => s.status === settlementFilter);
  }, [settlementsFromSummary, settlements, summary, settlementFilter]);
  const visibleSettlementsTotal = settlementsFromSummary ? visibleSettlements.length : settlementsTotal;

  const settlementBadgeVariant = (status: string): "default" | "destructive" | "outline" | "success" | "warning" => {
    if (status === "NEEDS_REVIEW") return "destructive";
    if (status === "SETTLED" || status === "RECORDED") return "success";
    if (status === "FAILED") return "warning";
    if (status === "PLANNED" || status === "DISPATCHED" || status === "CONFIRMED") return "default";
    return "outline";
  };

  return (
    <PageShell rhythm="md">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/finance/wallet">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("pool_backing")}</h1>
            <p className="text-muted-foreground">{t("pool_backing_page_description")}</p>
          </div>
        </div>
      </m.div>

      {/* Mode + status banner */}
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={mode === "off" ? "outline" : "default"}>
                {t("pool_backing_mode")}: {t(`pool_backing_mode_${mode}` as any)}
              </Badge>
              {summary?.settings.paused && (
                <Badge variant="destructive">{t("pool_backing_paused")}</Badge>
              )}
              {summary && !summary.ecosystemInstalled && (
                <Badge variant="outline">{t("pool_backing_monitor_only_no_ecosystem")}</Badge>
              )}
              {stale && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {t("pool_backing_exchange_unreadable")}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {t("pool_backing_last_reconciliation")}: {when(summary?.lastRunAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setRecordOpen(true)} disabled={!summary}>
                {t("pool_backing_record_external")}
              </Button>
              <Button onClick={runNow} disabled={running || mode === "off"}>
                <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
                {t("pool_backing_run_reconciliation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* Engine banner */}
      {summary && (
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className={enginePaused ? "border-destructive/50" : engineMode === "auto" ? "border-primary/40" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" /> {t("pool_backing_engine")}
              </CardTitle>
              <CardDescription>{t("pool_backing_engine_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={engineMode === "off" ? "outline" : engineMode === "auto" ? "default" : "secondary"}>
                  {engineLabel[engineMode] ?? engineMode}
                </Badge>
                {enginePaused && <Badge variant="destructive">{t("pool_backing_paused")}</Badge>}
                {!ecosystemInstalled && <Badge variant="outline">{t("pool_backing_monitor_only_no_ecosystem")}</Badge>}
                <Badge variant={autoConvert ? "secondary" : "outline"} className="gap-1">
                  <ArrowRightLeft className="h-3 w-3" /> {autoConvert ? t("pool_backing_auto_convert_on") : t("pool_backing_auto_convert_off")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t("pool_backing_threshold")}: ${fmt(summary.settings.thresholdUsd, 2)}
                  {summary.settings.maxSettlementUsd != null && (
                    <> · {t("pool_backing_max_settlement")}: ${fmt(summary.settings.maxSettlementUsd, 2)}</>
                  )}
                  {summary.treasury?.currencies != null && (
                    <> · {t("pool_backing_treasury")}: {t("pool_backing_treasury_currencies", { count: summary.treasury.currencies })}</>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("pool_backing_last_cycle")}: {engine?.lastCycleAt ? when(engine.lastCycleAt) : t("pool_backing_no_cycle_yet")}
                </span>
              </div>
              {engine?.planningSkipped && (
                <p className="flex items-center gap-2 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" /> {t("pool_backing_planning_skipped")}: {engine.planningSkipped}
                </p>
              )}
              {refusals.length > 0 ? (
                <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
                  <p className="mb-1 flex items-center gap-2 text-sm font-medium text-warning">
                    <AlertTriangle className="h-4 w-4" /> {t("pool_backing_refusals")}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {refusals.map((r, i) => (
                      <li key={`${r.currency}-${i}`} className="flex gap-2">
                        {r.currency && <span className="font-medium">{r.currency}</span>}
                        <span className="text-muted-foreground">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                engine?.lastCycleAt && <p className="text-sm text-muted-foreground">{t("pool_backing_no_refusals")}</p>
              )}
            </CardContent>
          </Card>
        </m.div>
      )}

      {unacknowledged.length > 0 && (
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-warning/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" /> {t("pool_backing_unacknowledged_drift")}
              </CardTitle>
              <CardDescription>{t("pool_backing_unacknowledged_drift_description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {unacknowledged.map((c) => (
                <Button key={c.currency} variant="outline" size="sm" onClick={() => acknowledge(c.currency)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {c.currency}: {fmt(c.drift.amount)}
                </Button>
              ))}
            </CardContent>
          </Card>
        </m.div>
      )}

      {/* Per-currency table */}
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" /> {t("pool_backing_liabilities_vs_holdings")}
            </CardTitle>
            <CardDescription>{t("pool_backing_table_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && (summary?.currencies.length ?? 0) === 0 ? (
              <div className="py-12 text-center text-muted-foreground">{t("pool_backing_nothing_reconciled_yet")}</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("pool_backing_currency")}</TableHead>
                      <TableHead className="text-right">{t("pool_backing_liabilities")}</TableHead>
                      <TableHead className="text-right">{t("pool_backing_holdings")}</TableHead>
                      <TableHead className="text-right">{t("pool_backing_gap")}</TableHead>
                      <TableHead className="text-right">{t("pool_backing_open_obligations")}</TableHead>
                      <TableHead className="text-right">{t("pool_backing_residual")}</TableHead>
                      <TableHead className="text-right">{t("pool_backing_drift")}</TableHead>
                      <TableHead>{t("pool_backing_read_at")}</TableHead>
                      {hasActions && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(loading ? Array.from({ length: 6 }, () => null) : summary?.currencies ?? []).map((row, i) =>
                      row === null ? (
                        <TableRow key={`pending-${i}`}>
                          {Array.from({ length: currencyColumns }, (_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ) : (
                        <TableRow key={row.currency}>
                          <TableCell className="font-medium">
                            {row.currency}
                            {row.capUsd != null && (
                              <span className="ml-2 text-xs text-muted-foreground">{t("pool_backing_cap")}: ${fmt(row.capUsd, 2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums" title={
                            row.reconciliation?.liabilitiesSplit
                              ? `${t("pool_backing_customers")}: ${fmt(row.reconciliation.liabilitiesSplit.customers)} · ${t("pool_backing_super_admin")}: ${fmt(row.reconciliation.liabilitiesSplit.superAdmin)} · ${t("pool_backing_pending_withdrawals")}: ${fmt(row.reconciliation.liabilitiesSplit.pendingWithdrawals)} · ${t("pool_backing_parallel_stores")}: ${parallelStoresOf(row) ? fmt(parallelStoresOf(row)!.total) : t("pool_backing_parallel_stores_not_read")}`
                              : undefined
                          }>
                            {fmt(row.reconciliation?.liabilities)}
                            {row.reconciliation && (
                              <div className="mt-0.5 flex justify-end">
                                <ParallelStoresLine stores={parallelStoresOf(row)} />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums" title={
                            row.reconciliation?.holdingsSplit?.perAccount
                              ? Object.entries(row.reconciliation.holdingsSplit.perAccount).map(([k, v]) => `${k}: ${fmt(Number(v))}`).join(" · ")
                              : undefined
                          }>
                            {row.reconciliation?.status === "h_unknown" ? (
                              <Badge variant="destructive">{t("pool_backing_unknown")}</Badge>
                            ) : (
                              fmt(row.reconciliation?.holdings)
                            )}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums ${row.reconciliation?.gap != null && row.reconciliation.gap > 0 ? "text-destructive" : ""}`}>
                            {fmt(row.reconciliation?.gap)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums" title={Object.entries(row.open.bySource).map(([k, v]) => `${k}: ${fmt(Number(v))}`).join(" · ")}>
                            {fmt(row.open.exchange)} <span className="text-xs text-muted-foreground">({row.open.rows})</span>
                            {/* Waived rows are loss the platform recognised; they still explain the gap, so they sit next to what is open. */}
                            {row.reconciliation?.waivedObligations != null && Number(row.reconciliation.waivedObligations) !== 0 && (
                              <div className="mt-0.5 text-xs text-muted-foreground" title={t("pool_backing_waived_total_hint")}>
                                {t("pool_backing_waived_total")}: {fmt(Number(row.reconciliation.waivedObligations))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(row.reconciliation?.residual)}
                            {(row.reconciliation?.driftRunStreak ?? 0) > 0 && (
                              <div className="mt-0.5 text-xs text-muted-foreground" title={t("pool_backing_drift_streak_hint")}>
                                {t("pool_backing_drift_streak", { count: Number(row.reconciliation!.driftRunStreak) })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.drift.amount == null ? (
                              "—"
                            ) : row.drift.acknowledged ? (
                              <span title={`${t("pool_backing_acknowledged")} ${when(row.drift.acknowledgedAt)}`}>{fmt(row.drift.amount)} ✓</span>
                            ) : (
                              <Button variant="ghost" size="2xs" className="text-warning" onClick={() => acknowledge(row.currency)}>
                                {fmt(row.drift.amount)} · {t("pool_backing_acknowledge")}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{when(row.reconciliation?.at)}</TableCell>
                          {hasActions && (
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                {ecosystemInstalled && (
                                  <span title={settleBlockedReason ?? undefined}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={!canSettle}
                                      onClick={() => setSettleTarget({ currency: row.currency, chains: treasuryChainsFor(row.currency) })}
                                    >
                                      <Send className="mr-2 h-3.5 w-3.5" /> {t("pool_backing_settle_now")}
                                    </Button>
                                  </span>
                                )}
                                {showConvert && (
                                  <span
                                    title={
                                      enginePaused
                                        ? t("pool_backing_settle_disabled_paused")
                                        : !((row.open.convertible ?? 0) > 0)
                                          ? t("pool_backing_convert_disabled_none")
                                          : `${t("pool_backing_convertible")}: ${fmt(row.open.convertible)}`
                                    }
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={enginePaused || !((row.open.convertible ?? 0) > 0)}
                                      onClick={() => setConvertTarget({ currency: row.currency, convertible: row.open.convertible ?? 0 })}
                                    >
                                      <ArrowRightLeft className="mr-2 h-3.5 w-3.5" /> {t("pool_backing_convert_now")}
                                    </Button>
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </m.div>

      {/* Treasury */}
      {ecosystemInstalled && (
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" /> {t("pool_backing_treasury")}
              </CardTitle>
              <CardDescription>{t("pool_backing_treasury_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {treasury?.userId && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t("pool_backing_treasury_user")}:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{treasury.userId}</code>
                  <CopyButton value={treasury.userId} size="xs" variant="ghost" />
                  {treasury.email && <span className="text-xs text-muted-foreground">{treasury.email}</span>}
                </div>
              )}
              {/* The master reserve as the signer reads it; a key that is no ecosystem chain is shown, not swallowed. */}
              {treasury?.masterReserve && (Object.keys(treasury.masterReserve.entries).length > 0 || treasury.masterReserve.unknownChains.length > 0) && (
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{t("pool_backing_master_reserve")}:</span>
                    {Object.keys(treasury.masterReserve.entries).length === 0 ? (
                      <span className="text-xs text-muted-foreground">{t("pool_backing_master_reserve_defaults")}</span>
                    ) : (
                      Object.entries(treasury.masterReserve.entries).map(([chain, amount]) => (
                        <Badge
                          key={chain}
                          variant={treasury.masterReserve!.unknownChains.includes(chain) ? "destructive" : "outline"}
                          className="font-mono text-xs"
                        >
                          {chain} {fmt(amount)}
                        </Badge>
                      ))
                    )}
                  </div>
                  {treasury.masterReserve.unknownChains.length > 0 && (
                    <p className="flex items-start gap-2 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {t("pool_backing_master_reserve_unknown", { chains: treasury.masterReserve.unknownChains.join(", ") })}{" "}
                        {t("pool_backing_master_reserve_unknown_hint")}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {treasuryError ? (
                <p className="text-sm text-muted-foreground">
                  {t("pool_backing_treasury_unavailable")}
                  {treasuryError !== "unavailable" && <span className="ml-1 text-xs">({treasuryError})</span>}
                </p>
              ) : (treasury?.currencies.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{t("pool_backing_treasury_empty")}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("pool_backing_currency")}</TableHead>
                        <TableHead>{t("pool_backing_chain")}</TableHead>
                        <TableHead>{t("pool_backing_address")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_db_balance")}</TableHead>
                        <TableHead>{t("pool_backing_network")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treasury!.currencies.flatMap((c) =>
                        c.chains.length === 0
                          ? [
                              <TableRow key={c.currency}>
                                <TableCell className="font-medium">{c.currency}</TableCell>
                                <TableCell className="text-muted-foreground">—</TableCell>
                                <TableCell className="text-muted-foreground">{t("pool_backing_no_address")}</TableCell>
                                <TableCell className="text-right tabular-nums">{fmt(c.balance)}</TableCell>
                                <TableCell />
                              </TableRow>,
                            ]
                          : c.chains.map((ch, idx) => (
                              <TableRow key={`${c.currency}-${ch.chain}`}>
                                <TableCell className="font-medium">
                                  {idx === 0 ? c.currency : <span className="text-muted-foreground">·</span>}
                                </TableCell>
                                <TableCell>{ch.chain}</TableCell>
                                <TableCell>
                                  {ch.address ? (
                                    <span className="flex items-center gap-1">
                                      <code className="font-mono text-xs" title={ch.address}>{shortHash(ch.address)}</code>
                                      <CopyButton value={ch.address} size="xs" variant="ghost" />
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{t("pool_backing_no_address")}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums" title={idx === 0 && c.balance != null ? `${c.currency}: ${fmt(c.balance)}` : undefined}>
                                  {fmt(ch.balance ?? (c.chains.length === 1 ? c.balance : null))}
                                </TableCell>
                                <TableCell>
                                  <span className="flex flex-wrap items-center gap-1">
                                    {ch.networkId && <code className="font-mono text-xs">{ch.networkId}</code>}
                                    {ch.flags.length === 0 ? (
                                      <Badge variant="success">{t("pool_backing_network_ok")}</Badge>
                                    ) : (
                                      ch.flags.map((f) => (
                                        <Badge key={f} variant={f === "unmapped" || f === "unsupported" ? "destructive" : "warning"}>
                                          {networkFlagLabel[f]}
                                        </Badge>
                                      ))
                                    )}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </m.div>
      )}

      {/* Ecosystem side: Le vs He per chain, from the latest reconciliation */}
      {(ecosystemInstalled || ecosystemRows.length > 0 || ecosystemUnread.length > 0) && (
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" /> {t("pool_backing_ecosystem_side")}
              </CardTitle>
              <CardDescription>{t("pool_backing_ecosystem_side_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {ecosystemUnread.length > 0 && (
                <div className="mb-3 space-y-2">
                  {ecosystemUnread.map(({ currency, error, at, coverage }) => (
                    <div key={`unread-${currency}`} className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="destructive" title={when(at)}>{t("pool_backing_eco_status_unknown")}</Badge>
                        <span className="font-medium">{t("pool_backing_ecosystem_unread", { currency })}</span>
                      </div>
                      <div className="mt-1 break-words text-muted-foreground">{error}</div>
                      {coverage && Object.keys(coverage).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground" title={t("pool_backing_custody_cache")}>
                          {Object.entries(coverage)
                            .map(([chain, c]) => `${chain}: ${t("pool_backing_addresses_read", { read: c.read, total: c.total })}`)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {ecosystemRows.length === 0 ? (
                ecosystemUnread.length === 0 && <p className="text-sm text-muted-foreground">{t("pool_backing_no_ecosystem_side")}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("pool_backing_currency")}</TableHead>
                        <TableHead>{t("pool_backing_chain")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_eco_liabilities")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_eco_holdings")}</TableHead>
                        <TableHead>{t("pool_backing_read_coverage")}</TableHead>
                        <TableHead>{t("pool_backing_status")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_gap")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_open_eco_rows")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_residual")}</TableHead>
                        <TableHead className="text-right">{t("pool_backing_mirror")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ecosystemRows.map(({ currency, chain, figures: f, coverage, at, first }) => {
                        const byKind = CUSTODY_KINDS.filter((k) => f.heByKind?.[k] != null)
                          .map((k) => `${kindLabel[k] ?? k}: ${fmt(Number(f.heByKind[k]))}`)
                          .join(" · ");
                        const liveErrors = coverage?.errored ?? 0;
                        const neverRead = coverage?.neverRead ?? Math.max(0, f.addressesTotal - f.addressesRead);
                        return (
                          <TableRow key={`${currency}-${chain}`}>
                            <TableCell className="font-medium">
                              {first ? currency : <span className="text-muted-foreground">·</span>}
                              {first && f.leUnattributed !== 0 && (
                                <span className="ml-2 text-xs text-muted-foreground" title={t("pool_backing_unattributed_hint")}>
                                  {t("pool_backing_unattributed")}: {fmt(f.leUnattributed)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{chain}</TableCell>
                            <TableCell className="text-right tabular-nums" title={`${t("pool_backing_treasury")}: ${fmt(f.leTreasury)}`}>
                              {fmt(f.le)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums" title={byKind || undefined}>
                              {f.status === "ok" && f.he != null ? (
                                fmt(f.he)
                              ) : (
                                <span className="text-muted-foreground">
                                  {fmt(f.heKnown)} <span className="text-xs">({t("pool_backing_known_part")})</span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <div>{t("pool_backing_addresses_read", { read: f.addressesRead, total: f.addressesTotal })}</div>
                              <div>
                                {t("pool_backing_oldest_read")}: {f.oldestReadAt ? when(f.oldestReadAt) : "—"}
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {neverRead > 0 && <Badge variant="outline">{t("pool_backing_never_read", { count: neverRead })}</Badge>}
                                {(f.addressesErrored > 0 || liveErrors > 0) && (
                                  <Badge variant="warning">{t("pool_backing_read_errors", { count: Math.max(f.addressesErrored, liveErrors) })}</Badge>
                                )}
                                {coverage && coverage.mirrored > 0 && (
                                  <Badge variant="outline" title={t("pool_backing_mirror_hint")}>{t("pool_backing_mirrored_reads", { count: coverage.mirrored })}</Badge>
                                )}
                              </div>
                              {coverage?.newestReadAt && (
                                <div title={t("pool_backing_custody_cache")}>
                                  {t("pool_backing_newest_read")}: {when(coverage.newestReadAt)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={f.status === "ok" ? "success" : f.status === "partial" ? "warning" : "destructive"}
                                title={f.status === "unknown" && f.unknownReason ? `${when(at)} — ${f.unknownReason}` : when(at)}
                              >
                                {ecoStatusLabel[f.status] ?? f.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right tabular-nums ${f.gapE != null && f.gapE > 0 ? "text-destructive" : ""}`}>{fmt(f.gapE)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(f.openObligations)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt(f.residual)}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground" title={t("pool_backing_mirror_hint")}>{fmt(f.mirror)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </m.div>
      )}

      {/* Settlements */}
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("pool_backing_settlements")}</CardTitle>
              <CardDescription>{t("pool_backing_settlements_description")}</CardDescription>
            </div>
            <Select value={settlementFilter} onValueChange={(v) => { setSettlementFilter(v); setSettlementPage(1); }}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SETTLEMENT_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "ACTIVE" ? t("pool_backing_settlements_in_flight") : s === "CONVERSIONS" ? t("pool_backing_settlements_conversions") : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {settlementsFromSummary && (
              <p className="mb-2 text-xs text-muted-foreground">{t("pool_backing_settlements_list_unavailable")}</p>
            )}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pool_backing_created")}</TableHead>
                    <TableHead>{t("pool_backing_currency")}</TableHead>
                    <TableHead>{t("pool_backing_direction")}</TableHead>
                    <TableHead className="text-right">{t("pool_backing_requested")}</TableHead>
                    <TableHead className="text-right">{t("pool_backing_received")}</TableHead>
                    <TableHead>{t("pool_backing_status")}</TableHead>
                    <TableHead>{t("pool_backing_txid")}</TableHead>
                    <TableHead>{t("pool_backing_proof")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSettlements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">{t("pool_backing_no_settlements")}</TableCell>
                    </TableRow>
                  ) : (
                    visibleSettlements.map((s) => {
                      const txid = txidOf(s);
                      const conversion = conversionOf(s);
                      // A conversion has no chain transaction to attach; its
                      // order id is its proof.
                      const canAttach = !conversion && (s.status === "NEEDS_REVIEW" || s.status === "DISPATCHED") && !txid;
                      const canArrive = s.status === "NEEDS_REVIEW" || s.status === "CONFIRMED";
                      const canFail = s.status === "NEEDS_REVIEW";
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs text-muted-foreground">{when(s.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            {s.currency}
                            {s.chain ? <span className="ml-1 text-xs text-muted-foreground">· {s.chain}</span> : null}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant={conversion ? "secondary" : "outline"} title={conversion ? t("pool_backing_direction_exchange_convert") : undefined}>
                              {directionLabel[s.direction] ?? s.direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(toNumberOrNull(s.amountRequested))}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {conversion ? (
                              <span title={`${t("pool_backing_filled")}: ${fmt(conversion.filled)} / ${fmt(conversion.requested ?? toNumberOrNull(s.amountRequested))}`}>
                                {fmt(toNumberOrNull(s.amountReceived) ?? conversion.filled)}
                                <span className="ml-1 text-xs text-muted-foreground">({t("pool_backing_filled")})</span>
                              </span>
                            ) : (
                              fmt(toNumberOrNull(s.amountReceived))
                            )}
                          </TableCell>
                          <TableCell><Badge variant={settlementBadgeVariant(s.status)}>{s.status}</Badge></TableCell>
                          <TableCell>
                            {conversion ? (
                              conversion.exchangeOrderId ? (
                                <span className="flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1">
                                    <code className="font-mono text-xs" title={`${t("pool_backing_order_id")}: ${conversion.exchangeOrderId}`}>{shortHash(conversion.exchangeOrderId)}</code>
                                    <CopyButton value={conversion.exchangeOrderId} size="xs" variant="ghost" />
                                  </span>
                                  {(conversion.symbol || conversion.side) && (
                                    <span className="text-xs text-muted-foreground">{[conversion.symbol, conversion.side].filter(Boolean).join(" · ")}</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t("pool_backing_no_order_yet")}</span>
                              )
                            ) : txid ? (
                              <span className="flex items-center gap-1">
                                <code className="font-mono text-xs" title={txid}>{shortHash(txid)}</code>
                                <CopyButton value={txid} size="xs" variant="ghost" />
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ProofPopover settlement={s} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              {canAttach && (
                                <Button variant="ghost" size="sm" onClick={() => setAttachTarget(s)}>{t("pool_backing_attach_txid")}</Button>
                              )}
                              {canArrive && (
                                <Button variant="ghost" size="sm" onClick={() => setArrivedTarget(s)}>{t("pool_backing_mark_arrived")}</Button>
                              )}
                              {canFail && (
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setFailTarget(s)}>{t("pool_backing_mark_failed")}</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>{t("pool_backing_settlement_count", { count: visibleSettlementsTotal })}</span>
              {!settlementsFromSummary && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={settlementPage <= 1} onClick={() => setSettlementPage((p) => p - 1)}>{tCommon("previous")}</Button>
                  <Button variant="outline" size="sm" disabled={settlementPage * 25 >= settlementsTotal} onClick={() => setSettlementPage((p) => p + 1)}>{tCommon("next")}</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* Obligations */}
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("pool_backing_obligations")}</CardTitle>
              <CardDescription>{t("pool_backing_obligations_description")}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("pool_backing_all_sources")}</SelectItem>
                  {OBLIGATION_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{sourceLabel[s] ?? s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["OPEN", "CLAIMED", "SETTLED", "WAIVED", "CANCELLED", "ALL"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pool_backing_created")}</TableHead>
                    <TableHead>{t("pool_backing_currency")}</TableHead>
                    <TableHead>{t("pool_backing_source")}</TableHead>
                    <TableHead>{t("pool_backing_side")}</TableHead>
                    <TableHead className="text-right">{t("pool_backing_amount")}</TableHead>
                    <TableHead>{t("pool_backing_status")}</TableHead>
                    <TableHead>{t("pool_backing_reference")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t("pool_backing_no_obligations")}</TableCell>
                    </TableRow>
                  ) : (
                    obligations.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs text-muted-foreground">{when(o.createdAt)}</TableCell>
                        <TableCell className="font-medium">{o.currency}{o.chain ? <span className="ml-1 text-xs text-muted-foreground">· {o.chain}</span> : null}</TableCell>
                        <TableCell>
                          <span title={o.source}>{sourceLabel[o.source] ?? o.source}</span>
                          {o.nettable ? "" : <span className="ml-1 text-xs text-muted-foreground">({t("pool_backing_not_nettable")})</span>}
                          <UncoveredBadge obligation={o} />
                        </TableCell>
                        <TableCell>{o.side}</TableCell>
                        <TableCell className={`text-right tabular-nums ${Number(o.amount) > 0 ? "text-destructive" : "text-success"}`}>{fmt(Number(o.amount))}</TableCell>
                        <TableCell><Badge variant={o.status === "OPEN" ? "default" : "outline"}>{o.status}</Badge></TableCell>
                        <TableCell className="max-w-[220px] truncate font-mono text-xs" title={o.sourceRef ?? undefined}>{o.sourceRef ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <EvidencePopover obligation={o} />
                            {o.status === "OPEN" && (
                              <Button variant="ghost" size="sm" onClick={() => setWaiveTarget(o)}>{t("pool_backing_waive")}</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>{t("pool_backing_obligation_count", { count: obligationsTotal })}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{tCommon("previous")}</Button>
                <Button variant="outline" size="sm" disabled={page * 25 >= obligationsTotal} onClick={() => setPage((p) => p + 1)}>{tCommon("next")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>

      <RecordExternalDialog open={recordOpen} onClose={() => setRecordOpen(false)} onDone={refreshAll} />
      <WaiveDialog target={waiveTarget} onClose={() => setWaiveTarget(null)} onDone={refreshAll} />
      <SettleNowDialog target={settleTarget} onClose={() => setSettleTarget(null)} onDone={refreshAll} />
      <ConvertNowDialog target={convertTarget} onClose={() => setConvertTarget(null)} onDone={refreshAll} />
      <AttachTxidDialog target={attachTarget} onClose={() => setAttachTarget(null)} onDone={refreshAll} />
      <MarkArrivedDialog target={arrivedTarget} onClose={() => setArrivedTarget(null)} onDone={refreshAll} />
      <MarkFailedDialog target={failTarget} onClose={() => setFailTarget(null)} onDone={refreshAll} />
    </PageShell>
  );
}

/** The settlement's proof, fees and note, as the backend recorded them. */
function ProofPopover({ settlement }: { settlement: Settlement }) {
  const t = useTranslations("dashboard_admin");
  const proof = parseJsonish(settlement.proof);
  const fees = parseJsonish(settlement.fees);
  const hasProof = proof && typeof proof === "object" && Object.keys(proof).length > 0;
  const hasFees = fees && typeof fees === "object" && Object.keys(fees).length > 0;
  const note = typeof settlement.note === "string" && settlement.note.trim() ? settlement.note : null;
  if (!hasProof && !hasFees && !note) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  // Phase 3 signers leave facts an operator needs before the raw JSON: the
  // memo a memo network was sent with, the TON payload that finds a row whose
  // hash was never matched, whether the master wallet (not the treasury) paid,
  // and the gas. Lifted out so they are read, not hunted for.
  const memo = typeof proof?.tag === "string" && proof.tag ? proof.tag : typeof proof?.memo === "string" && proof.memo ? proof.memo : null;
  const tonPayload = typeof proof?.tonPayload === "string" && proof.tonPayload ? proof.tonPayload : null;
  const tonSeqno = proof?.tonSeqno != null ? String(proof.tonSeqno) : null;
  const sourceKind = typeof proof?.source?.kind === "string" ? proof.source.kind : null;
  const gasRaw = proof?.gas ?? (proof?.gasNative != null ? { native: proof.gasNative, symbol: proof.gasSymbol } : null);
  const gas =
    gasRaw == null
      ? null
      : typeof gasRaw === "object"
        ? Object.entries(gasRaw as Record<string, unknown>)
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => `${k}: ${typeof v === "number" ? fmt(v) : String(v)}`)
            .join(" · ")
        : String(gasRaw);
  const hasHighlights = !!(memo || tonPayload || sourceKind === "master" || gas);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs">
          <FileSearch className="mr-1 h-3.5 w-3.5" /> {t("pool_backing_proof")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[28rem] max-w-[90vw] space-y-3 text-xs">
        {hasHighlights && (
          <dl className="space-y-1 rounded border border-border/60 p-2">
            {sourceKind === "master" && (
              <div className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" /> {t("pool_backing_sent_from_master")}
              </div>
            )}
            {memo && (
              <div className="flex items-center gap-1">
                <dt className="font-medium">{t("pool_backing_memo")}:</dt>
                <dd className="font-mono break-all">{memo}</dd>
                <CopyButton value={memo} size="xs" variant="ghost" />
              </div>
            )}
            {tonPayload && (
              <div className="flex items-start gap-1">
                <dt className="shrink-0 font-medium">{t("pool_backing_ton_payload")}{tonSeqno ? ` (#${tonSeqno})` : ""}:</dt>
                <dd className="font-mono break-all" title={tonPayload}>{shortHash(tonPayload)}</dd>
                <CopyButton value={tonPayload} size="xs" variant="ghost" />
              </div>
            )}
            {gas && (
              <div className="flex items-center gap-1">
                <dt className="font-medium">{t("pool_backing_gas")}:</dt>
                <dd className="text-muted-foreground">{gas}</dd>
              </div>
            )}
          </dl>
        )}
        {hasProof ? (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_proof")}</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(proof, null, 2)}</pre>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("pool_backing_no_proof")}</p>
        )}
        {hasFees && (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_fees")}</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(fees, null, 2)}</pre>
          </div>
        )}
        {note && (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_note")}</p>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{note}</p>
          </div>
        )}
        {settlement.initiatedBy && (
          <p className="text-muted-foreground">{settlement.initiatedBy}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RecordExternalDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [currency, setCurrency] = useState("");
  const [direction, setDirection] = useState<"eco_to_exchange" | "exchange_to_eco">("eco_to_exchange");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setCurrency(""); setAmount(""); setReference(""); setNote(""); setDirection("eco_to_exchange"); };

  const submit = async () => {
    setBusy(true);
    const { data, error } = await $fetch<any>({
      url: "/api/admin/finance/pool-backing/record-external",
      method: "POST",
      body: { currency: currency.trim().toUpperCase(), direction, amount: Number(amount), proof: { reference: reference.trim(), note: note.trim() } },
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_record_failed"));
      return;
    }
    toast.success(data?.message ?? t("pool_backing_recorded"));
    reset();
    onClose();
    await onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pool_backing_record_external")}</DialogTitle>
          <DialogDescription>{t("pool_backing_record_external_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={t("pool_backing_currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eco_to_exchange">{t("pool_backing_direction_eco_to_exchange")}</SelectItem>
              <SelectItem value="exchange_to_eco">{t("pool_backing_direction_exchange_to_eco")}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min="0" step="any" placeholder={t("pool_backing_amount_received")} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder={t("pool_backing_proof_reference")} value={reference} onChange={(e) => setReference(e.target.value)} />
          <Input placeholder={t("pool_backing_proof_note")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>{tCommon("cancel")}</Button>
          <Button onClick={submit} disabled={busy || !currency.trim() || !(Number(amount) > 0) || !(reference.trim() || note.trim())}>
            {t("pool_backing_record")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** What `GET obligation/{id}/waive/verification` answers: the step-up policy as the server will enforce it. */
interface WaivePolicy {
  requireChallenge: boolean;
  acceptedTypes: string[];
  userType: string | null;
  userEnabled: boolean;
  satisfied: boolean;
  blockedReason: string | null;
  obligation?: { createdByYou?: boolean; status?: string } | null;
}

/**
 * Writing off money takes a reason, another admin, and a fresh two-factor code.
 *
 * The dialog asks the server for the policy first rather than recomputing it
 * (that is how two sources of truth drift): an admin with no accepted second
 * factor sees the refusal and a disabled button; one with a factor types the
 * reason, is sent a code (nothing is sent for an authenticator app), verifies
 * it, and the waive is posted with the single-use token the verification
 * minted. The token is bound to THIS obligation, so a second waive starts over.
 */
function WaiveDialog({ target, onClose, onDone }: { target: Obligation | null; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState<WaivePolicy | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [stage, setStage] = useState<"reason" | "code">("reason");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ type: string; delivered: boolean; message?: string } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const reset = () => {
    setReason("");
    setStage("reason");
    setCode("");
    setSent(null);
    setCodeError(null);
  };

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setPolicy(null);
    setPolicyError(null);
    (async () => {
      const { data, error } = await $fetch<WaivePolicy>({
        url: `/api/admin/finance/pool-backing/obligation/${target.id}/waive/verification`,
        silent: true,
      });
      if (cancelled) return;
      if (error || !data) {
        setPolicyError(typeof error === "string" ? error : t("pool_backing_waive_policy_failed"));
        return;
      }
      setPolicy(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [target, t]);

  const blocked: string | null = !policy
    ? null
    : policy.obligation?.createdByYou
      ? t("pool_backing_waive_two_person")
      : !policy.satisfied
        ? policy.blockedReason
          ? `${t("pool_backing_waive_no_second_factor")} (${policy.blockedReason})`
          : t("pool_backing_waive_no_second_factor")
        : null;

  /** Ask for the code: EMAIL/SMS are delivered, APP has nothing to deliver. */
  const requestCode = async () => {
    if (!target) return;
    setBusy(true);
    setCodeError(null);
    const { data, error } = await $fetch<{ type: string; delivered: boolean; message?: string }>({
      url: `/api/admin/finance/pool-backing/obligation/${target.id}/waive/verification`,
      method: "POST",
      body: {},
      silent: true,
    });
    setBusy(false);
    if (error || !data) {
      setCodeError(typeof error === "string" ? error : t("pool_backing_waive_send_failed"));
      return;
    }
    setSent(data);
    setStage("code");
  };

  /** Verify the code, then post the waive with the token it minted. */
  const verifyAndWaive = async () => {
    if (!target) return;
    setBusy(true);
    setCodeError(null);
    const verified = await $fetch<{ twoFactorToken: string }>({
      url: `/api/admin/finance/pool-backing/obligation/${target.id}/waive/verification/verify`,
      method: "POST",
      body: { otp: code.trim() },
      silent: true,
    });
    if (verified.error || !verified.data?.twoFactorToken) {
      setBusy(false);
      setCodeError(typeof verified.error === "string" ? verified.error : t("pool_backing_waive_verify_failed"));
      return;
    }
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/pool-backing/obligation/${target.id}/waive`,
      method: "POST",
      body: { reason: reason.trim(), twoFactorToken: verified.data.twoFactorToken },
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_waive_failed"));
      return;
    }
    toast.success(data?.message ?? t("pool_backing_waived"));
    reset();
    onClose();
    await onDone();
  };

  const channelCopy =
    sent?.type === "EMAIL"
      ? t("pool_backing_waive_code_sent_email")
      : sent?.type === "SMS"
        ? t("pool_backing_waive_code_sent_sms")
        : t("pool_backing_waive_code_app");

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stage === "code" && <ShieldCheck className="h-5 w-5 text-primary" />}
            {stage === "code" ? t("pool_backing_waive_confirm") : t("pool_backing_waive_obligation")}
          </DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} ${fmt(Number(target.amount))} · ${target.source}` : ""} — {stage === "code" ? t("pool_backing_waive_verify_description") : t("pool_backing_waive_description")}
          </DialogDescription>
        </DialogHeader>

        {stage === "reason" ? (
          <>
            {policyError && (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-warning-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{policyError}</span>
              </div>
            )}
            {blocked && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{blocked}</span>
              </div>
            )}
            {codeError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}
            <Input placeholder={t("pool_backing_waive_reason")} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy || !!blocked} />
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>{tCommon("cancel")}</Button>
              <Button
                variant="destructive"
                onClick={requestCode}
                disabled={busy || !!blocked || (!policy && !policyError) || reason.trim().length < 10}
              >
                {busy ? <Loader size="sm" className="mr-2" /> : null}
                {tCommon("continue")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{channelCopy}</p>
            {codeError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}
            <Input
              className="text-center font-mono text-lg tracking-widest"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder={t("pool_backing_waive_code_placeholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && code.trim().length >= 6 && !busy) void verifyAndWaive(); }}
              disabled={busy}
            />
            <DialogFooter className="sm:justify-between">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setStage("reason"); setCode(""); setCodeError(null); }} disabled={busy}>
                  {tCommon("back")}
                </Button>
                {sent?.type !== "APP" && (
                  <Button variant="outline" size="sm" onClick={requestCode} disabled={busy}>
                    <RefreshCw className={`mr-1 h-3 w-3 ${busy ? "animate-spin" : ""}`} /> {tCommon("resend_code")}
                  </Button>
                )}
              </div>
              <Button variant="destructive" onClick={verifyAndWaive} disabled={busy || code.trim().length < 6}>
                {busy ? <Loader size="sm" className="mr-2" /> : null}
                {t("pool_backing_waive")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Run one engine cycle for a currency by hand. The engine verifies what is in
 * flight, then plans a settlement from the net obligation; direction and chain
 * default to the engine's own choice and are only overridable, never forced
 * past its refusals — a refusal comes back as a reason and is shown as one.
 */
function SettleNowDialog({ target, onClose, onDone }: { target: { currency: string; chains: string[] } | null; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [direction, setDirection] = useState<"auto" | "eco_to_exchange" | "exchange_to_eco">("auto");
  const [chain, setChain] = useState("auto");
  const [busy, setBusy] = useState(false);

  const reset = () => { setDirection("auto"); setChain("auto"); };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const body: Record<string, string> = { currency: target.currency };
    if (direction !== "auto") body.direction = direction;
    if (chain !== "auto") body.chain = chain;
    const { data, error } = await $fetch<any>({ url: "/api/admin/finance/pool-backing/settle", method: "POST", body, silent: true });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_settle_failed"));
      return;
    }
    const settlement = data?.settlement ?? null;
    const refusedRaw = data?.refusal ?? null;
    const refusals = refusalList(data?.summary?.refusals);
    const refused =
      typeof refusedRaw === "string"
        ? refusedRaw
        : refusals.length > 0
          ? refusals.map((r) => (r.currency ? `${r.currency}: ${r.reason}` : r.reason)).join("; ")
          : null;
    if (settlement) {
      toast.success(t("pool_backing_settle_started", { currency: target.currency, status: String(settlement.status ?? "PLANNED") }));
    } else if (refused) {
      toast.warning(t("pool_backing_settle_refused", { reason: refused }));
    } else {
      toast.success(data?.message ?? t("pool_backing_settle_nothing", { currency: target.currency }));
    }
    reset();
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pool_backing_settle_now")}{target ? ` · ${target.currency}` : ""}</DialogTitle>
          <DialogDescription>{t("pool_backing_settle_now_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("pool_backing_direction")}</p>
            <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t("pool_backing_direction_auto")}</SelectItem>
                <SelectItem value="eco_to_exchange">{t("pool_backing_direction_eco_to_exchange")}</SelectItem>
                <SelectItem value="exchange_to_eco">{t("pool_backing_direction_exchange_to_eco")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("pool_backing_chain")}</p>
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t("pool_backing_chain_auto")}</SelectItem>
                {(target?.chains ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>{tCommon("cancel")}</Button>
          <Button onClick={submit} disabled={busy || !target}>
            <Send className="mr-2 h-4 w-4" /> {t("pool_backing_settle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachTxidDialog({ target, onClose, onDone }: { target: Settlement | null; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [txid, setTxid] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/pool-backing/settlement/${target.id}/attach-txid`,
      method: "POST",
      body: { txid: txid.trim() },
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_attach_txid_failed"));
      return;
    }
    toast.success(data?.message ?? t("pool_backing_txid_attached"));
    setTxid("");
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { setTxid(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pool_backing_attach_txid")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} ${fmt(toNumberOrNull(target.amountRequested))} · ${target.direction}` : ""} — {t("pool_backing_attach_txid_description")}
          </DialogDescription>
        </DialogHeader>
        <Input className="font-mono" placeholder={t("pool_backing_txid_placeholder")} value={txid} onChange={(e) => setTxid(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setTxid(""); onClose(); }} disabled={busy}>{tCommon("cancel")}</Button>
          <Button onClick={submit} disabled={busy || txid.trim().length < 8}>{t("pool_backing_attach_txid")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkArrivedDialog({ target, onClose, onDone }: { target: Settlement | null; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Prefill with what was requested: the common case is a full arrival and
  // the operator edits down by the venue's fee.
  useEffect(() => {
    if (target) {
      const requested = toNumberOrNull(target.amountReceived) ?? toNumberOrNull(target.amountRequested);
      setAmount(requested == null ? "" : String(requested));
    }
  }, [target]);

  const reset = () => { setAmount(""); setReference(""); setNote(""); };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const proof: Record<string, string> = {};
    if (note.trim()) proof.note = note.trim();
    if (reference.trim()) proof.reference = reference.trim();
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/pool-backing/settlement/${target.id}/mark-arrived`,
      method: "POST",
      body: { amountReceived: Number(amount), proof },
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_mark_arrived_failed"));
      return;
    }
    toast.success(data?.message ?? t("pool_backing_marked_arrived"));
    reset();
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pool_backing_mark_arrived")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} ${fmt(toNumberOrNull(target.amountRequested))} · ${target.direction}` : ""} — {t("pool_backing_mark_arrived_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="number" min="0" step="any" placeholder={t("pool_backing_amount_received")} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder={t("pool_backing_proof_reference")} value={reference} onChange={(e) => setReference(e.target.value)} />
          <Input placeholder={t("pool_backing_proof_note")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>{tCommon("cancel")}</Button>
          <Button onClick={submit} disabled={busy || !(Number(amount) > 0) || !(reference.trim() || note.trim())}>{t("pool_backing_mark_arrived")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkFailedDialog({ target, onClose, onDone }: { target: Settlement | null; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");
  const [confirmNotBroadcast, setConfirmNotBroadcast] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasTxid = target ? txidOf(target) !== null : false;
  // The route's own "the coins may have moved" test, mirrored: a hash, an
  // exchange withdrawal the exchange accepted / reported COMPLETED / may have
  // accepted (indeterminate), an eco_to_exchange dispatch that started and
  // was parked without a hash, or an exchange conversion order the venue
  // accepted (an order id), was asked for under a client id, or may have
  // accepted (indeterminate). Each demands the operator's confirmation.
  const proof = target ? parseJsonish(target.proof) ?? {} : {};
  const exchangeMayHaveHonoured =
    !!target && target.direction === "exchange_to_eco" && (target.status === "CONFIRMED" || !!proof?.exchangeWithdrawalId || proof?.indeterminate === true);
  const dispatchMayHaveSent =
    !!target && target.direction === "eco_to_exchange" && target.status !== "PLANNED" && !!proof?.dispatchStartedAt && proof?.nothingSent !== true;
  const orderMayHaveFilled =
    !!target &&
    target.direction === CONVERSION_DIRECTION &&
    target.status !== "PLANNED" &&
    (!!proof?.exchangeOrderId || proof?.indeterminate === true || !!proof?.clientOrderId) &&
    proof?.nothingSent !== true;
  const needsConfirmation = hasTxid || exchangeMayHaveHonoured || dispatchMayHaveSent || orderMayHaveFilled;
  const confirmationLabel = hasTxid
    ? t("pool_backing_confirm_not_broadcast")
    : exchangeMayHaveHonoured
      ? t("pool_backing_confirm_exchange_not_honoured")
      : orderMayHaveFilled
        ? t("pool_backing_confirm_order_not_filled")
        : t("pool_backing_confirm_dispatch_not_sent");

  const reset = () => { setReason(""); setConfirmNotBroadcast(false); };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const body: Record<string, unknown> = { reason: reason.trim() };
    if (needsConfirmation) body.confirmNotBroadcast = confirmNotBroadcast;
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/pool-backing/settlement/${target.id}/mark-failed`,
      method: "POST",
      body,
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_mark_failed_failed"));
      return;
    }
    toast.success(data?.message ?? t("pool_backing_marked_failed"));
    reset();
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pool_backing_mark_failed")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} ${fmt(toNumberOrNull(target.amountRequested))} · ${target.direction}` : ""} — {t("pool_backing_mark_failed_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={t("pool_backing_mark_failed_reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          {needsConfirmation && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={confirmNotBroadcast} onCheckedChange={(v) => setConfirmNotBroadcast(v === true)} className="mt-0.5" />
              <span>{confirmationLabel}</span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>{tCommon("cancel")}</Button>
          <Button variant="destructive" onClick={submit} disabled={busy || reason.trim().length < 10 || (needsConfirmation && !confirmNotBroadcast)}>
            {t("pool_backing_mark_failed")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The parallel-stores line under a currency's liabilities: principals parked
 * in stores Spot funded, counted in L since phase 3. NULL means the stores
 * were not read that run — shown as "not read", never as zero. The breakdown
 * and the run's notes (an absent addon counted as 0, REAL staking pools on
 * Spot, the derived FX figure) sit in the popover.
 */
function ParallelStoresLine({ stores }: { stores: ParallelStores | null }) {
  const t = useTranslations("dashboard_admin");
  if (!stores) {
    return (
      <span className="text-xs text-muted-foreground" title={t("pool_backing_parallel_stores_description")}>
        {t("pool_backing_parallel_stores")}: {t("pool_backing_parallel_stores_not_read")}
      </span>
    );
  }
  const lines: Array<[string, number]> = [
    [t("pool_backing_store_copy_trading"), stores.copyTrading],
    [t("pool_backing_store_investment"), stores.investment],
    [t("pool_backing_store_ai_investment"), stores.aiInvestment],
    [t("pool_backing_store_staking"), stores.staking],
    [t("pool_backing_store_forex"), stores.forex],
    [t("pool_backing_store_fx_trading"), stores.fxTrading],
  ];
  const notes = Array.isArray(stores.notes) ? stores.notes.filter((n) => typeof n === "string" && n.trim()) : [];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" className="h-[calc(1.25rem*var(--control-height-scale))] px-[calc(0.25rem*var(--control-padding-scale))] text-xs font-normal text-muted-foreground">
          <Layers className="mr-1 h-3 w-3" /> {t("pool_backing_parallel_stores")}: {fmt(stores.total)}
          {notes.length > 0 && <AlertTriangle className="ml-1 h-3 w-3 text-warning" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[90vw] space-y-2 text-xs">
        <p className="text-muted-foreground">{t("pool_backing_parallel_stores_description")}</p>
        <dl className="space-y-1">
          {lines.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt>{label}</dt>
              <dd className="tabular-nums">{fmt(value)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t pt-1 font-medium">
            <dt>{t("pool_backing_total")}</dt>
            <dd className="tabular-nums">{fmt(stores.total)}</dd>
          </div>
        </dl>
        {notes.length > 0 && (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_notes")}</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * A venue-fee row the attribution job could not fully book as a loss: the
 * Super Admin's Spot wallet was short, so `evidence.loss.uncovered` stays
 * OPEN on the row. Shown inline so the operator does not have to open the
 * evidence to learn that the fee is still owed.
 */
function UncoveredBadge({ obligation }: { obligation: Obligation }) {
  const t = useTranslations("dashboard_admin");
  if (obligation.source !== "exchange_fee") return null;
  const evidence = parseJsonish(obligation.evidence);
  const uncovered = toNumberOrNull(evidence?.loss?.uncovered);
  if (uncovered == null || uncovered <= 0) return null;
  return (
    <Badge variant="warning" className="ml-1" title={t("pool_backing_uncovered_hint")}>
      {t("pool_backing_uncovered")}: {fmt(uncovered)}
    </Badge>
  );
}

/** An obligation's evidence and legs, as the ledger recorded them. */
function EvidencePopover({ obligation }: { obligation: Obligation }) {
  const t = useTranslations("dashboard_admin");
  const evidence = parseJsonish(obligation.evidence);
  const legs = parseJsonish(obligation.legs);
  const hasEvidence = evidence && typeof evidence === "object" && Object.keys(evidence).length > 0;
  const hasLegs = legs && typeof legs === "object" && Object.keys(legs).length > 0;
  const waiveReason = typeof obligation.waiveReason === "string" && obligation.waiveReason.trim() ? obligation.waiveReason : null;
  if (!hasEvidence && !hasLegs && !waiveReason) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <FileSearch className="mr-1 h-3.5 w-3.5" /> {t("pool_backing_evidence")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[28rem] max-w-[90vw] space-y-3 text-xs">
        {hasEvidence && (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_evidence")}</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(evidence, null, 2)}</pre>
          </div>
        )}
        {hasLegs && (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_legs")}</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(legs, null, 2)}</pre>
          </div>
        )}
        {waiveReason && (
          <div>
            <p className="mb-1 font-medium">{t("pool_backing_waive_reason_label")}</p>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{waiveReason}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Run one exchange conversion for a currency by hand. The engine sizes and
 * places a market order on the exchange that acquires what the exchange owes
 * in the currency and never received, under its own rules — the custody leg
 * of the same transfer settled, the switch on, a market for the currency, the
 * venue's minimums, the max settlement cap — and a refusal comes back as a
 * reason and is shown as one. Nothing is forced past it.
 */
function ConvertNowDialog({ target, onClose, onDone }: { target: { currency: string; convertible: number } | null; onClose: () => void; onDone: () => Promise<void> }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const { data, error } = await $fetch<any>({
      url: "/api/admin/finance/pool-backing/convert",
      method: "POST",
      body: { currency: target.currency },
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("pool_backing_convert_failed"));
      return;
    }
    const settlement = data?.settlement ?? null;
    const refusedRaw = data?.refusal ?? data?.reason ?? null;
    const refusals = refusalList(data?.summary?.refusals);
    const refused =
      typeof refusedRaw === "string" && refusedRaw
        ? refusedRaw
        : refusals.length > 0
          ? refusals.map((r) => (r.currency ? `${r.currency}: ${r.reason}` : r.reason)).join("; ")
          : null;
    if (settlement) {
      toast.success(t("pool_backing_convert_started", { currency: target.currency, status: String(settlement.status ?? "PLANNED") }));
    } else if (refused) {
      toast.warning(t("pool_backing_convert_refused", { reason: refused }));
    } else {
      toast.success(data?.message ?? t("pool_backing_convert_nothing", { currency: target.currency }));
    }
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pool_backing_convert_now")}{target ? ` · ${target.currency}` : ""}</DialogTitle>
          <DialogDescription>{t("pool_backing_convert_now_description")}</DialogDescription>
        </DialogHeader>
        {target && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("pool_backing_convertible")}:</span>{" "}
            <span className="font-medium tabular-nums">{fmt(target.convertible)} {target.currency}</span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{tCommon("cancel")}</Button>
          <Button onClick={submit} disabled={busy || !target}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> {t("pool_backing_convert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
