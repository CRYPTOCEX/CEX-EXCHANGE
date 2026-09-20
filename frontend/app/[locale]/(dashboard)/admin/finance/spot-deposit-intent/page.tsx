"use client";

import React, { useCallback, useEffect, useState } from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
 * SPOT DEPOSIT INTENTS — the console for the deposits a machine would not
 * decide on its own.
 *
 * Every spot deposit under `plans/done/SPOT-DEPOSIT-MODES.md` starts as an intent
 * row, and two of its states are questions addressed to a human: REVIEW (the
 * verifier found something it will not credit blind — an amount that does not
 * match, a deposit older than the intent, a claim from an app built before
 * intents existed) and FAILED (usually a mode C sweep that never left the
 * customer's Funding wallet — read the row's reason and the reject door's
 * answer for where the money is, because a rejected intent whose sweep had
 * already broadcast has its coins on the exchange instead). Neither is visible
 * on the deposit log: that screen lists
 * TRANSACTIONS, and a REVIEW intent's claim row looks there like an ordinary
 * slow deposit with no reason attached.
 *
 * So this page is the queue, and it carries three doors, each of which the
 * backend owns end to end:
 *
 *   - APPROVE credits through the deposit-log approval path — the same locked
 *     idempotent credit, the same pool-backing obligation recorded with the
 *     exchange's own evidence, the same fee booking and customer email. The
 *     screen therefore shows THE VENUE'S ANSWER BEFORE the button: crediting a
 *     deposit the exchange never received is how a pooled account goes short,
 *     and the operator should see that as a warning, not discover it later in
 *     an obligation row.
 *   - REJECT closes the intent and releases the hash so the real sender can
 *     submit it again. Nothing is debited, and the reason is shown to the
 *     customer — hence the ten-character floor the backend enforces and this
 *     form mirrors.
 *   - RESWEEP re-runs the ecosystem sweep, and only for a FAILED
 *     `ecosystem_custody` intent whose coins the queue already refunded.
 *
 * Read defensively throughout: DECIMAL columns arrive as strings, `metadata`
 * may arrive as a string (or a string of a string), and a field the backend has
 * not written yet must degrade to a dash, never to a blank page.
 */

interface IntentUser {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatar?: string | null;
}

interface IntentRow {
  id: string;
  userId: string;
  walletId?: string | null;
  currency: string;
  network: string;
  chain?: string | null;
  mode: string;
  declaredAmount?: string | number | null;
  expectedAmount?: string | number | null;
  address?: string | null;
  tag?: string | null;
  status: string;
  stage?: string | null;
  claimedTxid?: string | null;
  matchedDepositId?: string | null;
  sweepTransactionId?: string | null;
  spotTransactionId?: string | null;
  metadata?: unknown;
  expiresAt?: string | null;
  sendBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: IntentUser | null;
  wallet?: { id?: string; currency?: string; type?: string } | null;
  /**
   * A PRE-INTENT CLAIM wearing the row shape: a PENDING SPOT deposit from an
   * app built before deposit requests existed, listed from the `pre-intent`
   * route. `id` is then the CLAIM id (which both doors accept), there is no
   * request to open, and the exchange's answer rides on the row itself.
   */
  preIntent?: boolean;
  evidence?: Evidence | null;
  review?: string | null;
}

/** One row of `GET /api/admin/finance/spot-deposit-intent/pre-intent`. */
interface PreIntentItem {
  id: string;
  userId: string;
  walletId?: string | null;
  currency: string;
  chain?: string | null;
  trx?: string | null;
  referenceId?: string | null;
  amount?: string | number | null;
  status: string;
  review?: string | null;
  reviewMessage?: string | null;
  metadata?: unknown;
  evidence?: Evidence | null;
  createdAt: string;
  updatedAt?: string;
  user?: IntentUser | null;
  wallet?: { id?: string; currency?: string; type?: string } | null;
  preIntent: true;
}

interface Evidence {
  backed: boolean;
  reason: string;
  exchangeDepositId?: string | null;
  exchangeStatus?: string | null;
  exchangeAmount?: number | null;
  checkedAt: string;
}

interface Detail {
  intent: IntentRow;
  spotTransaction: Record<string, any> | null;
  sweepTransaction: Record<string, any> | null;
  evidence: Evidence | null;
}

/** The two states that are a question for an operator, and the shortcut that shows both. */
const NEEDS_ACTION_STATUSES = ["REVIEW", "FAILED"];
const IN_FLIGHT_STATUSES = ["OPEN", "MATCHED", "SWEEPING"];
const STATUS_FILTERS = [
  "NEEDS_ACTION",
  "PRE_INTENT",
  "IN_FLIGHT",
  "OPEN",
  "MATCHED",
  "SWEEPING",
  "REVIEW",
  "CREDITED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "ALL",
];

/** The backend's own gates, mirrored so a button is never offered that the door refuses. */
const REJECTABLE = new Set(["OPEN", "MATCHED", "SWEEPING", "REVIEW"]);
/**
 * The states in which an ecosystem-custody sweep may already be moving the
 * customer's coins. The reject door refuses those with a 409 — closing the
 * intent would not put the money back, and the resweep door would then send it
 * a second time — so the button is not offered either.
 */
const CUSTODY_SWEEP_IN_FLIGHT = new Set(["MATCHED", "SWEEPING"]);
// A pre-intent claim is PENDING by construction and both doors take its id.
const canApprove = (row: { status: string; preIntent?: boolean }) => row.preIntent === true || row.status === "REVIEW";
const canReject = (row: { status: string; mode?: string; metadata?: unknown; preIntent?: boolean }) => {
  if (row.preIntent) return true;
  if (!REJECTABLE.has(row.status)) return false;
  if (row.mode !== "ecosystem_custody" || !CUSTODY_SWEEP_IN_FLIGHT.has(row.status)) return true;
  // Once the sweep has a hash the claim row exists and rejecting is honest;
  // before that the debit has happened and nothing would give it back.
  const meta = metaOf(row.metadata);
  return !!(meta.sweepTxid || meta.spotClaimTransactionId);
};
const canResweep = (row: { status: string; mode: string }) =>
  row.mode === "ecosystem_custody" && row.status === "FAILED";

const PER_PAGE = 25;

const fmt = (value: number | null | undefined, digits = 8) =>
  value == null || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toFixed(digits).replace(/\.?0+$/, "") || "0";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "—");

const shortHash = (hash: string) => (hash.length > 18 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash);

/** DECIMAL(36,18) comes back as a string; an empty column comes back as null. */
const toNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

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

const metaOf = (value: unknown): Record<string, any> => {
  const parsed = parseJsonish(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

/** The review reason the verifier recorded, when it recorded one. */
const reviewReasonOf = (row: { metadata?: unknown }): string | null => {
  const reason = metaOf(row.metadata).review;
  return typeof reason === "string" && reason.trim() ? reason : null;
};

/**
 * A pre-intent claim in the row shape the table and the doors already handle.
 * The amount column reads `expectedAmount ?? declaredAmount`, so the venue's
 * figure (what approve will credit) is put first and the row's own — 0 for a
 * pasted hash — second. `spotTransactionId` is the claim itself.
 */
const toIntentRow = (item: PreIntentItem): IntentRow => ({
  id: item.id,
  userId: item.userId,
  walletId: item.walletId ?? null,
  currency: item.currency,
  network: item.chain ?? "",
  chain: null,
  mode: "pre_intent",
  declaredAmount: item.amount ?? null,
  expectedAmount: item.evidence?.exchangeAmount ?? null,
  address: null,
  tag: null,
  status: item.status,
  stage: "review",
  claimedTxid: item.trx ?? item.referenceId ?? null,
  matchedDepositId: item.evidence?.exchangeDepositId ?? null,
  sweepTransactionId: null,
  spotTransactionId: item.id,
  metadata: item.metadata,
  expiresAt: null,
  sendBy: null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  user: item.user ?? null,
  wallet: item.wallet ?? null,
  preIntent: true,
  evidence: item.evidence ?? null,
  review: item.review ?? null,
});

const nameOf = (user: IntentUser | null | undefined): string => {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || user.id || "—";
};

const statusVariant = (status: string): "default" | "destructive" | "outline" | "success" | "warning" => {
  if (status === "REVIEW") return "warning";
  if (status === "FAILED") return "destructive";
  if (status === "CREDITED") return "success";
  if (status === "OPEN" || status === "MATCHED" || status === "SWEEPING") return "default";
  return "outline";
};

export default function SpotDepositIntentPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [rows, setRows] = useState<IntentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [needsAction, setNeedsAction] = useState<number | null>(null);
  // The pre-intent half of the badge, kept apart so the operator can see it is
  // a different kind of row (no request behind it) and where to find it.
  const [preIntentWaiting, setPreIntentWaiting] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("NEEDS_ACTION");
  const [search, setSearch] = useState("");
  // What the list is actually filtered by. Typing "USDT" would otherwise be four
  // requests, three of them for a prefix nobody asked about.
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<IntentRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<IntentRow | null>(null);
  const [resweepTarget, setResweepTarget] = useState<IntentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
      sortField: "createdAt",
      sortOrder: "desc",
    });

    /*
      THE PRE-INTENT TAB IS A DIFFERENT TABLE. A claim from an app built before
      deposit requests existed has no intent row, so it cannot come out of the
      intent list however it is filtered; it comes out of `pre-intent`, which
      lists the PENDING SPOT claims flagged `no_intent` with the venue's answer
      on each. The currency search is applied here rather than sent: the
      transaction table has no currency column for the server to filter on.
    */
    if (statusFilter === "PRE_INTENT") {
      const { data, error } = await $fetch<{ items: PreIntentItem[]; pagination: { totalItems: number } }>({
        url: `/api/admin/finance/spot-deposit-intent/pre-intent?${params.toString()}`,
        silent: true,
      });
      setLoading(false);
      if (error || !data) {
        toast.error(typeof error === "string" ? error : t("spot_deposit_intent_failed_to_load"));
        return;
      }
      const term = searchTerm.trim().toUpperCase();
      const mapped = (data.items ?? []).map(toIntentRow);
      setRows(term ? mapped.filter((row) => row.currency.toUpperCase().startsWith(term)) : mapped);
      setTotal(data.pagination?.totalItems ?? 0);
      return;
    }

    const filter: Record<string, unknown> = {};
    if (statusFilter === "NEEDS_ACTION") {
      filter.status = { value: NEEDS_ACTION_STATUSES, operator: "in" };
    } else if (statusFilter === "IN_FLIGHT") {
      filter.status = { value: IN_FLIGHT_STATUSES, operator: "in" };
    } else if (statusFilter !== "ALL") {
      filter.status = statusFilter;
    }
    const term = searchTerm.trim();
    if (term) filter.currency = { value: term.toUpperCase(), operator: "startsWith" };
    if (Object.keys(filter).length > 0) params.set("filter", JSON.stringify(filter));

    const { data, error } = await $fetch<{ items: IntentRow[]; pagination: { totalItems: number } }>({
      url: `/api/admin/finance/spot-deposit-intent?${params.toString()}`,
      silent: true,
    });
    setLoading(false);
    if (error || !data) {
      toast.error(typeof error === "string" ? error : t("spot_deposit_intent_failed_to_load"));
      return;
    }
    setRows(data.items ?? []);
    setTotal(data.pagination?.totalItems ?? 0);
  }, [page, statusFilter, searchTerm, t]);

  /*
    THE QUEUE DEPTH IS ITS OWN QUESTION, ASKED SEPARATELY.

    Counting REVIEW + FAILED rows in `rows` would count only the 25 on the
    current page, and would read as "nothing waiting" whenever the operator is
    looking at page 2 or at a CREDITED filter. One `perPage=1` request answers
    it for the whole table.
  */
  const loadNeedsAction = useCallback(async () => {
    const params = new URLSearchParams({
      page: "1",
      perPage: "1",
      filter: JSON.stringify({ status: { value: NEEDS_ACTION_STATUSES, operator: "in" } }),
    });
    // The pre-intent claims are the other half of the queue — rows an operator
    // has to decide that no intent filter can reach — so they are counted into
    // the same badge. `evidence=0`: a count needs no exchange lookup.
    const [intents, preIntent] = await Promise.all([
      $fetch<{ pagination?: { totalItems?: number } }>({
        url: `/api/admin/finance/spot-deposit-intent?${params.toString()}`,
        silent: true,
      }),
      $fetch<{ pagination?: { totalItems?: number } }>({
        url: `/api/admin/finance/spot-deposit-intent/pre-intent?page=1&perPage=1&evidence=0`,
        silent: true,
      }),
    ]);
    const intentCount = typeof intents.data?.pagination?.totalItems === "number" ? intents.data.pagination.totalItems : null;
    const preIntentCount =
      typeof preIntent.data?.pagination?.totalItems === "number" ? preIntent.data.pagination.totalItems : null;
    setPreIntentWaiting(preIntentCount);
    setNeedsAction(intentCount === null && preIntentCount === null ? null : (intentCount ?? 0) + (preIntentCount ?? 0));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadNeedsAction();
  }, [loadNeedsAction]);

  const refresh = useCallback(async () => {
    await Promise.all([load(), loadNeedsAction()]);
  }, [load, loadNeedsAction]);

  // Literal maps, never a computed key: the extractor and the optimiser can only
  // see keys written out in full.
  const modeLabel: Record<string, string> = {
    hash_claim: t("spot_deposit_intent_mode_hash_claim"),
    amount_match: t("spot_deposit_intent_mode_amount_match"),
    ecosystem_custody: t("spot_deposit_intent_mode_ecosystem_custody"),
    pre_intent: t("spot_deposit_intent_mode_pre_intent"),
  };
  const stageLabel: Record<string, string> = {
    waiting: t("spot_deposit_intent_stage_waiting"),
    received: t("spot_deposit_intent_stage_received"),
    moving: t("spot_deposit_intent_stage_moving"),
    on_exchange: t("spot_deposit_intent_stage_on_exchange"),
    credited: t("spot_deposit_intent_stage_credited"),
    review: t("spot_deposit_intent_stage_review"),
    failed: t("spot_deposit_intent_stage_failed"),
    expired: t("spot_deposit_intent_stage_expired"),
  };
  const filterLabel: Record<string, string> = {
    NEEDS_ACTION: t("spot_deposit_intent_filter_needs_action"),
    PRE_INTENT: t("spot_deposit_intent_filter_pre_intent"),
    IN_FLIGHT: t("spot_deposit_intent_filter_in_flight"),
    ALL: t("spot_deposit_intent_filter_all"),
  };
  const showingPreIntent = statusFilter === "PRE_INTENT";

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
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("spot_deposit_intent_title")}</h1>
            <p className="text-muted-foreground">{t("spot_deposit_intent_page_description")}</p>
          </div>
        </div>
      </m.div>

      {/* What this queue is, and the one case that does not appear in it. */}
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {needsAction != null && needsAction > 0 ? (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t("spot_deposit_intent_needs_action_count", { count: needsAction })}
                </Badge>
              ) : needsAction === 0 ? (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("spot_deposit_intent_nothing_waiting")}
                </Badge>
              ) : null}
              {preIntentWaiting != null && preIntentWaiting > 0 && (
                <Badge variant="outline" className="gap-1">
                  {t("spot_deposit_intent_pre_intent_count", { count: preIntentWaiting })}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {t("spot_deposit_intent_pre_intent_listed_hint")}{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => {
                    setStatusFilter("PRE_INTENT");
                    setPage(1);
                  }}
                >
                  {t("spot_deposit_intent_filter_pre_intent")}
                </button>{" "}
                {t("spot_deposit_intent_pre_intent_or_in")}{" "}
                <Link className="underline underline-offset-2" href="/admin/finance/deposit/log">
                  {t("spot_deposit_intent_deposit_records")}
                </Link>
              </span>
            </div>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {tCommon("refresh")}
            </Button>
          </CardContent>
        </Card>
      </m.div>

      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{showingPreIntent ? t("spot_deposit_intent_filter_pre_intent") : t("spot_deposit_intent_queue")}</CardTitle>
              <CardDescription>
                {showingPreIntent
                  ? t("spot_deposit_intent_pre_intent_queue_description")
                  : t("spot_deposit_intent_queue_description")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-[180px] pl-9"
                  placeholder={t("spot_deposit_intent_search_currency")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {filterLabel[s] ?? s}
                    </SelectItem>
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
                    <TableHead>{t("spot_deposit_intent_created")}</TableHead>
                    <TableHead>{t("spot_deposit_intent_customer")}</TableHead>
                    <TableHead>{t("spot_deposit_intent_currency")}</TableHead>
                    <TableHead>{t("spot_deposit_intent_mode")}</TableHead>
                    <TableHead className="text-right">{t("spot_deposit_intent_amount")}</TableHead>
                    <TableHead>{t("spot_deposit_intent_status")}</TableHead>
                    <TableHead>{t("spot_deposit_intent_reference")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={`pending-${i}`}>
                        {Array.from({ length: 8 }, (_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        {t("spot_deposit_intent_none")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const reason = reviewReasonOf(row);
                      const amount = toNumberOrNull(row.expectedAmount) ?? toNumberOrNull(row.declaredAmount);
                      const txid = row.claimedTxid || row.matchedDepositId || null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs text-muted-foreground">{when(row.createdAt)}</TableCell>
                          <TableCell>
                            <span className="block max-w-[180px] truncate font-medium" title={nameOf(row.user)}>
                              {nameOf(row.user)}
                            </span>
                            {row.user?.email && (
                              <span className="block max-w-[180px] truncate text-xs text-muted-foreground" title={row.user.email}>
                                {row.user.email}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{row.currency}</span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {row.network}
                              {row.chain ? ` · ${row.chain}` : ""}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{modeLabel[row.mode] ?? row.mode}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(amount)}</TableCell>
                          <TableCell>
                            <Badge variant={row.preIntent ? "warning" : statusVariant(row.status)}>{row.status}</Badge>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {stageLabel[String(row.stage ?? "")] ?? row.stage ?? ""}
                            </span>
                            {reason && (
                              <span className="block max-w-[200px] truncate text-xs text-warning" title={reason}>
                                {reason}
                              </span>
                            )}
                            {/* The venue's answer, on the row: a pre-intent claim has no detail dialog to show it in. */}
                            {row.preIntent && (
                              <span className="mt-1 block">
                                {row.evidence ? (
                                  <Badge variant={row.evidence.backed ? "success" : "destructive"} title={row.evidence.reason}>
                                    {row.evidence.backed
                                      ? t("spot_deposit_intent_evidence_backed")
                                      : t("spot_deposit_intent_evidence_not_backed")}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">{t("spot_deposit_intent_evidence_pending")}</Badge>
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {txid ? (
                              <span className="flex items-center gap-1">
                                <code className="font-mono text-xs" title={txid}>
                                  {shortHash(txid)}
                                </code>
                                <CopyButton value={txid} size="xs" variant="ghost" />
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              {/* No request to open behind a pre-intent claim: the detail route 404s on a claim id. */}
                              {row.preIntent ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  title={t("spot_deposit_intent_pre_intent_no_detail")}
                                >
                                  <FileSearch className="mr-1 h-3.5 w-3.5" />
                                  {tCommon("details")}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => setDetailId(row.id)}>
                                  <FileSearch className="mr-1 h-3.5 w-3.5" />
                                  {tCommon("details")}
                                </Button>
                              )}
                              {canApprove(row) && (
                                <Button variant="ghost" size="sm" onClick={() => setApproveTarget(row)}>
                                  {t("spot_deposit_intent_approve")}
                                </Button>
                              )}
                              {canResweep(row) && (
                                <Button variant="ghost" size="sm" onClick={() => setResweepTarget(row)}>
                                  {t("spot_deposit_intent_resweep")}
                                </Button>
                              )}
                              {canReject(row) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => setRejectTarget(row)}
                                >
                                  {t("spot_deposit_intent_reject")}
                                </Button>
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
              <span>{t("spot_deposit_intent_count", { count: total })}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {tCommon("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * PER_PAGE >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>

      <DetailDialog
        intentId={detailId}
        onClose={() => setDetailId(null)}
        onApprove={(row) => {
          setDetailId(null);
          setApproveTarget(row);
        }}
        onReject={(row) => {
          setDetailId(null);
          setRejectTarget(row);
        }}
        onResweep={(row) => {
          setDetailId(null);
          setResweepTarget(row);
        }}
      />
      <ApproveDialog target={approveTarget} onClose={() => setApproveTarget(null)} onDone={refresh} />
      <RejectDialog target={rejectTarget} onClose={() => setRejectTarget(null)} onDone={refresh} />
      <ResweepDialog target={resweepTarget} onClose={() => setResweepTarget(null)} onDone={refresh} />
    </PageShell>
  );
}

/** One labelled fact. The value is always something — a dash beats an empty cell. */
function Fact({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`break-words text-sm ${mono ? "font-mono text-xs" : ""}`}>{value ?? "—"}</p>
    </div>
  );
}

/**
 * The whole answer to "did this customer's money arrive, and where is it now?":
 * the intent, the SPOT claim row it produced, the ECO sweep that moved the
 * coins, and the exchange's own answer about the hash. The doors are offered
 * from here as well as from the row, because this is where an operator actually
 * decides.
 */
function DetailDialog({
  intentId,
  onClose,
  onApprove,
  onReject,
  onResweep,
}: {
  intentId: string | null;
  onClose: () => void;
  onApprove: (row: IntentRow) => void;
  onReject: (row: IntentRow) => void;
  onResweep: (row: IntentRow) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!intentId) {
      setDetail(null);
      setFailed(null);
      return;
    }
    (async () => {
      setLoading(true);
      setDetail(null);
      setFailed(null);
      const { data, error } = await $fetch<Detail>({
        url: `/api/admin/finance/spot-deposit-intent/${intentId}`,
        silent: true,
      });
      if (cancelled) return;
      setLoading(false);
      if (error || !data?.intent) {
        setFailed(typeof error === "string" ? error : t("spot_deposit_intent_detail_failed"));
        return;
      }
      setDetail(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [intentId, t]);

  // Literal map, never a computed key: the extractor can only see keys written
  // out in full, and this component declares its own namespace.
  const stageLabel: Record<string, string> = {
    waiting: t("spot_deposit_intent_stage_waiting"),
    received: t("spot_deposit_intent_stage_received"),
    moving: t("spot_deposit_intent_stage_moving"),
    on_exchange: t("spot_deposit_intent_stage_on_exchange"),
    credited: t("spot_deposit_intent_stage_credited"),
    review: t("spot_deposit_intent_stage_review"),
    failed: t("spot_deposit_intent_stage_failed"),
    expired: t("spot_deposit_intent_stage_expired"),
  };

  const intent = detail?.intent ?? null;
  const evidence = detail?.evidence ?? null;
  const claim = detail?.spotTransaction ?? null;
  const sweep = detail?.sweepTransaction ?? null;
  const reason = intent ? reviewReasonOf(intent) : null;
  const meta = intent ? metaOf(intent.metadata) : {};

  return (
    <Dialog open={intentId !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("spot_deposit_intent_details")}</DialogTitle>
          <DialogDescription>{t("spot_deposit_intent_details_description")}</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>}
        {failed && <p className="text-sm text-destructive">{failed}</p>}

        {intent && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(intent.status)}>{intent.status}</Badge>
              <Badge variant="outline">{intent.mode}</Badge>
              <span className="text-sm text-muted-foreground">
                {intent.currency} · {intent.network}
                {intent.chain ? ` · ${intent.chain}` : ""}
              </span>
              <code className="font-mono text-xs text-muted-foreground">{intent.id}</code>
              <CopyButton value={intent.id} size="xs" variant="ghost" />
            </div>

            {reason && (
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-warning">
                  <AlertTriangle className="h-4 w-4" /> {t("spot_deposit_intent_review_reason")}
                </p>
                <p className="mt-1 text-sm">{reason}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label={t("spot_deposit_intent_customer")} value={nameOf(intent.user)} />
              <Fact label={t("spot_deposit_intent_created")} value={when(intent.createdAt)} />
              <Fact label={t("spot_deposit_intent_expires")} value={when(intent.expiresAt)} />
              <Fact label={t("spot_deposit_intent_declared")} value={fmt(toNumberOrNull(intent.declaredAmount))} />
              <Fact label={t("spot_deposit_intent_expected")} value={fmt(toNumberOrNull(intent.expectedAmount))} />
              <Fact
                label={t("spot_deposit_intent_stage")}
                value={intent.stage ? (stageLabel[String(intent.stage)] ?? String(intent.stage)) : "—"}
              />
              <Fact label={t("spot_deposit_intent_address")} value={intent.address || "—"} mono />
              <Fact label={t("spot_deposit_intent_tag")} value={intent.tag || "—"} mono />
              <Fact label={t("spot_deposit_intent_reference")} value={intent.claimedTxid || intent.matchedDepositId || "—"} mono />
            </div>

            {/* The venue's answer, before the approve button rather than after it. */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4" /> {t("spot_deposit_intent_evidence")}
              </p>
              {evidence ? (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={evidence.backed ? "success" : "destructive"}>
                      {evidence.backed
                        ? t("spot_deposit_intent_evidence_backed")
                        : t("spot_deposit_intent_evidence_not_backed")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{evidence.reason}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Fact label={t("spot_deposit_intent_exchange_status")} value={evidence.exchangeStatus || "—"} />
                    <Fact
                      label={t("spot_deposit_intent_exchange_amount")}
                      value={fmt(toNumberOrNull(evidence.exchangeAmount))}
                    />
                    <Fact label={t("spot_deposit_intent_exchange_deposit_id")} value={evidence.exchangeDepositId || "—"} mono />
                    <Fact label={t("spot_deposit_intent_evidence_checked_at")} value={when(evidence.checkedAt)} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("spot_deposit_intent_evidence_none")}</p>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">{t("spot_deposit_intent_claim_row")}</p>
                {claim ? (
                  <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                    <Fact label={t("spot_deposit_intent_row_id")} value={String(claim.id ?? "—")} mono />
                    <Fact label={t("spot_deposit_intent_row_status")} value={String(claim.status ?? "—")} />
                    <Fact label={t("spot_deposit_intent_row_amount")} value={fmt(toNumberOrNull(claim.amount))} />
                    <Fact label={t("spot_deposit_intent_reference")} value={String(claim.referenceId ?? "—")} mono />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("spot_deposit_intent_no_claim_row")}</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{t("spot_deposit_intent_sweep_row")}</p>
                {sweep ? (
                  <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                    <Fact label={t("spot_deposit_intent_row_id")} value={String(sweep.id ?? "—")} mono />
                    <Fact label={t("spot_deposit_intent_row_status")} value={String(sweep.status ?? "—")} />
                    <Fact label={t("spot_deposit_intent_row_amount")} value={fmt(toNumberOrNull(sweep.amount))} />
                    <Fact label={t("spot_deposit_intent_reference")} value={String(sweep.trxId ?? "—")} mono />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("spot_deposit_intent_no_sweep_row")}</p>
                )}
              </div>
            </div>

            {Object.keys(meta).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">{t("spot_deposit_intent_metadata")}</p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[11px]">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
          {intent && canResweep(intent) && (
            <Button variant="outline" onClick={() => onResweep(intent)}>
              <RotateCw className="mr-2 h-4 w-4" /> {t("spot_deposit_intent_resweep")}
            </Button>
          )}
          {intent && canReject(intent) && (
            <Button variant="destructive" onClick={() => onReject(intent)}>
              <XCircle className="mr-2 h-4 w-4" /> {t("spot_deposit_intent_reject")}
            </Button>
          )}
          {intent && canApprove(intent) && (
            <Button onClick={() => onApprove(intent)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> {t("spot_deposit_intent_approve")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * APPROVE. The door credits real money, so this form re-reads the intent when
 * it opens for two reasons the operator cannot get from the row:
 *
 *   - the exchange's evidence, shown as a warning when the venue does NOT
 *     confirm the deposit — the credit is still allowed (the operator may know
 *     something the venue's API does not), but never by accident;
 *   - the claim row's amount. A pasted hash creates the row with 0, and the
 *     backend refuses that naming `amount`; the gross figure the exchange shows
 *     is prefilled so the common case is one click.
 */
function ApproveDialog({
  target,
  onClose,
  onDone,
}: {
  target: IntentRow | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAmount("");
    setNote("");
    setDetail(null);
    if (!target) return;
    /*
      A PRE-INTENT CLAIM HAS NO DETAIL ROUTE TO ASK. The listing already put
      the venue's answer on the row, so the same two decisions — warn when the
      exchange does not confirm, prefill the figure it shows — are made from
      the row itself, in the shape the detail response would have carried.
    */
    if (target.preIntent) {
      setDetail({
        intent: target,
        spotTransaction: { id: target.id, amount: target.declaredAmount ?? 0, referenceId: target.claimedTxid ?? null },
        sweepTransaction: null,
        evidence: target.evidence ?? null,
      });
      const venue = toNumberOrNull(target.evidence?.exchangeAmount);
      if (venue != null && venue > 0) setAmount(String(venue));
      return;
    }
    (async () => {
      setLoadingDetail(true);
      const { data } = await $fetch<Detail>({
        url: `/api/admin/finance/spot-deposit-intent/${target.id}`,
        silent: true,
      });
      if (cancelled) return;
      setLoadingDetail(false);
      if (!data?.intent) return;
      setDetail(data);
      // The row's own figure wins when it has one; a 0 row is filled from the
      // venue, which is exactly the figure the backend asks for.
      const rowAmount = toNumberOrNull(data.spotTransaction?.amount);
      if (rowAmount == null || rowAmount <= 0) {
        const venue = toNumberOrNull(data.evidence?.exchangeAmount);
        if (venue != null && venue > 0) setAmount(String(venue));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target]);

  const rowAmount = toNumberOrNull(detail?.spotTransaction?.amount);
  const amountRequired = detail !== null && (rowAmount == null || rowAmount <= 0);
  const typedAmount = amount.trim();
  const amountOk = !amountRequired || Number(typedAmount) > 0;
  const unbacked = detail !== null && detail.evidence !== null && !detail.evidence.backed;

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const body: Record<string, unknown> = { note: note.trim() };
    if (typedAmount) body.amount = Number(typedAmount);
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/spot-deposit-intent/${target.id}/approve`,
      method: "POST",
      body,
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("spot_deposit_intent_approve_failed"));
      return;
    }
    if (data?.reconciled) {
      toast.info(data?.message ?? t("spot_deposit_intent_reconciled"));
    } else {
      toast.success(data?.message ?? t("spot_deposit_intent_approved"));
    }
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("spot_deposit_intent_approve")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} · ${target.network} · ${nameOf(target.user)}` : ""} —{" "}
            {t("spot_deposit_intent_approve_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loadingDetail && <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>}
          {unbacked && (
            <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-warning-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t("spot_deposit_intent_approve_unbacked_warning")}
                {detail?.evidence?.reason ? ` (${detail.evidence.reason})` : ""}
              </span>
            </p>
          )}
          {amountRequired && (
            <p className="text-sm text-muted-foreground">{t("spot_deposit_intent_approve_amount_required")}</p>
          )}
          <Input
            type="number"
            min="0"
            step="any"
            placeholder={t("spot_deposit_intent_approve_amount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea
            rows={3}
            placeholder={t("spot_deposit_intent_approve_note")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || note.trim().length < 10 || !amountOk}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> {t("spot_deposit_intent_approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** REJECT. Nothing is debited; the hash goes back so the real sender can use it. */
function RejectDialog({
  target,
  onClose,
  onDone,
}: {
  target: IntentRow | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/spot-deposit-intent/${target.id}/reject`,
      method: "POST",
      body: { reason: reason.trim() },
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("spot_deposit_intent_reject_failed"));
      return;
    }
    const released = Array.isArray(data?.releasedReferences)
      ? data.releasedReferences.filter((r: any) => r?.released).length
      : 0;
    toast.success(
      released > 0
        ? `${data?.message ?? t("spot_deposit_intent_rejected")} · ${t("spot_deposit_intent_references_released", { count: released })}`
        : (data?.message ?? t("spot_deposit_intent_rejected"))
    );
    setReason("");
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { setReason(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("spot_deposit_intent_reject")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} · ${target.network} · ${nameOf(target.user)}` : ""} —{" "}
            {t("spot_deposit_intent_reject_description")}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={3}
          placeholder={t("spot_deposit_intent_reject_reason")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setReason(""); onClose(); }} disabled={busy}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || reason.trim().length < 10}>
            {t("spot_deposit_intent_reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * RESWEEP. Mode C only, FAILED only — the coins are back in the customer's
 * Funding wallet and the sweep is being asked to run again. The route reports
 * the intent's REAL status afterwards, so a `started: false` answer is shown as
 * a warning with the backend's own explanation rather than as a success.
 */
function ResweepDialog({
  target,
  onClose,
  onDone,
}: {
  target: IntentRow | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const { data, error } = await $fetch<any>({
      url: `/api/admin/finance/spot-deposit-intent/${target.id}/resweep`,
      method: "POST",
      body: note.trim() ? { note: note.trim() } : {},
      silent: true,
    });
    setBusy(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("spot_deposit_intent_resweep_failed"));
      return;
    }
    if (data?.started) {
      toast.success(data?.message ?? t("spot_deposit_intent_resweep_started"));
    } else {
      toast.warning(data?.message ?? t("spot_deposit_intent_resweep_not_started"));
    }
    setNote("");
    onClose();
    await onDone();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => { if (!next && !busy) { setNote(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("spot_deposit_intent_resweep")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.currency} · ${target.chain ?? target.network}` : ""} —{" "}
            {t("spot_deposit_intent_resweep_description")}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={2}
          placeholder={t("spot_deposit_intent_resweep_note")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setNote(""); onClose(); }} disabled={busy}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            <RotateCw className="mr-2 h-4 w-4" /> {t("spot_deposit_intent_resweep")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
