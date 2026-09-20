"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loadable } from "@/components/ui/skeleton";
import { MoneyFigure } from "@/components/ui/money-figure";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { RecordAuditTab } from "@/components/blocks/audit/record-audit-tab";
import { AdjustBalanceDialog } from "@/components/blocks/wallet/adjust-balance-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusLabel } from "@/lib/status-tone";
import { checkPermission } from "@/components/blocks/data-table/utils/permissions";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  Coins,
  DollarSign,
  ExternalLink,
  Fingerprint,
  Link2,
  Loader2,
  Lock,
  Power,
  PowerOff,
  RefreshCw,
  ScrollText,
  User as UserIcon,
  Wallet,
} from "lucide-react";

/**
 * The wallet record page — balance, owner, movements and the full audit trail.
 *
 * WHY IT EXISTS. `wallet_audit_log` is the platform's forensic record: an
 * append-only row per balance mutation carrying `previousBalance → newBalance`
 * and `previousInOrder → newInOrder`. It was reachable only from the CRM user
 * record and the three transaction detail pages, so Wallet Management could
 * ADJUST a balance but not AUDIT the wallet it had just adjusted — the operator
 * had to leave for the owning customer's record to see what their own click
 * did. This page closes that loop: the adjust control and the ledger it writes
 * to are on one screen.
 *
 * IT IS NOT A SECOND WALLET LIST. `useTableStore` is a single global zustand
 * store, so a `DataTable` here would fight the one on the list page. The
 * movements table below is plain markup over the `transactions` the record
 * endpoint already includes, and the ledger is `WalletLedgerPanel`, which is
 * built on `useAuditFeed` for exactly this reason.
 *
 * EVERY MONEY FIELD ARRIVES AS A STRING. `balance` and `inOrder` are
 * DECIMAL(36,18) and mysql2 returns DECIMAL as a string to avoid float loss, so
 * `a + b` concatenates and `.toFixed()` throws. Nothing here touches a raw
 * value without `toNumber()`.
 */

interface WalletRecord {
  id: string;
  type?: string;
  currency?: string;
  balance?: string | number | null;
  inOrder?: string | number | null;
  status?: boolean;
  address?: Record<string, any> | string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  /** Stripped from the LIST payload (`excludeFields`), present on the record. */
  userId?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  } | null;
  transactions?: Array<{
    id: string;
    type?: string;
    amount?: string | number | null;
    fee?: string | number | null;
    status?: string;
    createdAt?: string;
    metadata?: string | Record<string, any> | null;
  }>;
}

/** Mirrors the hues the wallet table's `type` column already paints. */
function walletTypeTone(type?: string) {
  switch (String(type ?? "").toUpperCase()) {
    case "FIAT":
      return "success" as const;
    case "SPOT":
      return "primary" as const;
    case "ECO":
      return "info" as const;
    case "FUTURES":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtAmount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

/** `format()` throws on `new Date(undefined)`. One guard, used everywhere. */
function fmtDate(value: unknown, pattern: string): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "—" : format(d, pattern);
}

/** The `address` column is a JSON getter; it can arrive parsed or as a string. */
function parseAddresses(
  address: WalletRecord["address"]
): Array<{ network: string; address: string; balance?: number }> {
  if (!address) return [];
  let parsed: any = address;
  if (typeof address === "string") {
    try {
      parsed = JSON.parse(address);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== "object") return [];
  return Object.entries(parsed)
    .map(([key, v]: [string, any]) => ({
      network: String(v?.network ?? key),
      address: String(v?.address ?? ""),
      balance: v?.balance != null ? toNumber(v.balance) : undefined,
    }))
    .filter((a) => a.address);
}

export default function WalletDetailClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const params = useParams();
  const user = useUserStore((state) => state.user);

  const [wallet, setWallet] = useState<WalletRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  /*
   * The SAME `edit.wallet` the two endpoints demand.
   *
   * Without this the buttons render for a read-only role and the only thing
   * standing between the click and the customer's money is a 403 the operator
   * reads as a bug. `checkPermission` resolves Super Admin too, so it matches
   * what the table's row menu decides.
   */
  const canEdit = checkPermission(user, "edit.wallet");

  const walletId = params?.id ? String(params.id) : "";

  /*
   * The load. It sets NOTHING synchronously — its first statement is the await —
   * which is what keeps the mount effect below free of the cascading synchronous
   * setState that `react-hooks/set-state-in-effect` (rightly) rejects.
   * `isLoading` already starts `true`, so the first load needs no pending flag
   * set on its behalf; `refresh()` is the one that does.
   *
   * `$fetch` resolves an envelope and never throws, so there is no try/catch to
   * write here — the error arrives as a value. The success branch clears `error`
   * explicitly so a retry that works removes the banner a failure left behind.
   */
  const loadWallet = useCallback(async () => {
    const { data, error: fetchError } = await $fetch({
      url: `/api/admin/finance/wallet/${walletId}`,
      silent: true,
    });

    if (fetchError) {
      setError(fetchError);
      setWallet(null);
    } else if (!data) {
      setError(tCommon("wallet_not_found"));
      setWallet(null);
    } else {
      setError(null);
      setWallet(data);
    }
    setIsLoading(false);
  }, [walletId, tCommon]);

  useEffect(() => {
    if (!walletId) return;
    void loadWallet();
  }, [walletId, loadWallet]);

  /** Refetch after a mutation. Unlike the mount load, this one shows pending. */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadWallet();
  }, [loadWallet]);

  const handleStatusToggle = useCallback(async () => {
    if (!wallet || isToggling) return;
    const next = !wallet.status;
    setIsToggling(true);
    try {
      const { error: toggleError } = await $fetch({
        url: `/api/admin/finance/wallet/${wallet.id}/status`,
        method: "PUT",
        body: { status: next },
      });
      if (toggleError) return;
      toast.success(`Wallet ${next ? "enabled" : "disabled"}`);
      await refresh();
    } finally {
      setIsToggling(false);
    }
  }, [wallet, isToggling, refresh]);

  /*
   * PENDING AND NOT-FOUND ARE DIFFERENT ANSWERS.
   *
   * `awaitingRecord` is `isLoading && !wallet`, not plain `isLoading`: adjusting
   * a balance refetches, and blanking a record the operator is looking at back
   * to placeholders for that round trip would be a second flash on top of the
   * one they just caused. `loadFailed` is a CONCLUSION — only reachable once the
   * request has finished — and it is a banner INSIDE the frame rather than a
   * takeover of it, so a failed refetch does not throw away the page.
   */
  const awaitingRecord = isLoading && !wallet;
  const loadFailed = !isLoading && (!!error || !wallet);

  const currency = wallet?.currency ?? "";
  const balance = toNumber(wallet?.balance);
  const inOrder = toNumber(wallet?.inOrder);
  const total = balance + inOrder;

  const ownerId = wallet?.user?.id ?? wallet?.userId;
  const ownerName =
    `${wallet?.user?.firstName ?? ""} ${wallet?.user?.lastName ?? ""}`.trim();
  const ownerInitials =
    ownerName
      .split(" ")
      .map((n) => n[0] ?? "")
      .join("")
      .toUpperCase() || "?";

  const addresses = parseAddresses(wallet?.address);
  const transactions = wallet?.transactions ?? [];

  const stats = [
    {
      label: tCommon("available"),
      icon: DollarSign,
      tone: "text-success",
      value: `${fmtAmount(balance)} ${currency}`.trim(),
      placeholder: "1,234.00",
    },
    {
      label: tCommon("in_orders"),
      icon: Lock,
      tone: "text-warning",
      value: `${fmtAmount(inOrder)} ${currency}`.trim(),
      placeholder: "1,234.00",
    },
    {
      // `total_balance`, not `common.total`: this tile names a BALANCE, and the
      // bare word beside "Available" and "In Orders" does not say of what.
      label: tCommon("total_balance"),
      icon: Coins,
      tone: "text-primary",
      value: `${fmtAmount(total)} ${currency}`.trim(),
      placeholder: "1,234.00",
    },
  ];

  return (
    /*
     * `PageShell`, NOT a hand-rolled container.
     *
     * Neither admin root has a `layout.tsx` that owns a frame, and
     * `site-header.tsx` is `fixed top-0` over an `h-16` bar — so a page that
     * supplies its own `container … py-6` renders its first element UNDERNEATH
     * the navbar. This page did exactly that: the title sat on top of the logo.
     * The shell owns ground, container, gutter, header clearance and rhythm.
     */
    <PageShell>
      {/* Back first, on its own line — inside `PageHeader` it would compete
          with the two controls on the opposite edge. */}
      <Link
        href="/admin/finance/wallet"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("wallet_management")}
      </Link>

      {/* Chrome that is knowable before the fetch renders immediately; only the
          values inside it wait. `PageHeader` wraps its actions below the title
          on a narrow viewport, which is what stops the buttons running off the
          right edge. */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {/* No `shadow-lg`: depth belongs to the surface ramp (R3), not to
                an ad-hoc shadow on a page-level surface. */}
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </span>
            <span>
              <Loadable loading={awaitingRecord} placeholder="USDT">
                {currency}
              </Loadable>{" "}
              {tCommon("wallet")}
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">
              #
              <Loadable loading={awaitingRecord} placeholder="a1b2c3d4">
                {wallet?.id?.slice(0, 8)}
              </Loadable>
            </span>
            <span aria-hidden>•</span>
            {wallet?.type && (
              <Badge tone={walletTypeTone(wallet.type)} appearance="soft">
                {wallet.type}
              </Badge>
            )}
            <Badge
              tone={wallet?.status ? "success" : "neutral"}
              appearance="soft"
            >
              {wallet?.status ? tCommon("active") : tCommon("disabled")}
            </Badge>
            {wallet?.deletedAt && (
              <Badge tone="destructive" appearance="soft">
                Deleted
              </Badge>
            )}
          </span>
        }
        actions={
          /* Both actions move or lock real money, so both carry the same
             `edit.wallet` their endpoints demand. */
          canEdit && wallet ? (
            <>
              <Button onClick={() => setAdjustOpen(true)}>
                <DollarSign className="mr-2 h-4 w-4" />
                {tCommon("adjust_balance")}
              </Button>
              <Button
                variant="outline"
                onClick={handleStatusToggle}
                disabled={isToggling}
              >
                {isToggling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : wallet.status ? (
                  <PowerOff className="mr-2 h-4 w-4 text-destructive" />
                ) : (
                  <Power className="mr-2 h-4 w-4 text-success" />
                )}
                {wallet.status ? t("disable_wallet") : t("enable_wallet")}
              </Button>
            </>
          ) : null
        }
      />

      {loadFailed && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-destructive">
                  {error || tCommon("wallet_not_found")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  This wallet could not be loaded.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/admin/finance/wallet">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {tCommon("back")}
                </Button>
              </Link>
              {error && (
                <Button onClick={() => void refresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {tCommon("retry")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Balance band */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted">
                <stat.icon className={cn("h-5 w-5", stat.tone)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {/* The currency code is knowable before the balance is, so
                    `MoneyFigure` holds back only the digits. */}
                <MoneyFigure
                  className="text-xl font-semibold"
                  value={stat.value}
                  loading={awaitingRecord}
                  figurePlaceholder={stat.placeholder}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-12 w-full grid-cols-3">
          <TabsTrigger value="overview" className="h-full gap-2">
            <Fingerprint className="h-4 w-4" />
            <span>{tCommon("overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="h-full gap-2">
            <ScrollText className="h-4 w-4" />
            <span>{tCommon("transactions")}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="h-full gap-2">
            <Lock className="h-4 w-4" />
            <span>{tCommon("audit_trail")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" />
                {tCommon("owner")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={wallet?.user?.avatar} alt={ownerName} />
                  <AvatarFallback>{ownerInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium">
                    <Loadable loading={awaitingRecord} placeholder="Jane Doe">
                      {ownerName || "—"}
                    </Loadable>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    <Loadable
                      loading={awaitingRecord}
                      placeholder="jane@example.com"
                    >
                      {wallet?.user?.email || "—"}
                    </Loadable>
                  </p>
                </div>
              </div>

              {/* The ledger below is THIS WALLET. The customer's whole trail,
                  across every wallet they own, is on their CRM record. */}
              {ownerId && (
                <Link href={`/admin/crm/user/${ownerId}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Customer record
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-4 w-4" />
                {tCommon("identifiers")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {tCommon("wallet_id")}
                </p>
                <p className="mt-1 font-mono text-xs break-all">
                  <Loadable
                    loading={awaitingRecord}
                    placeholder="00000000-0000-0000-0000-000000000000"
                  >
                    {wallet?.id}
                  </Loadable>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {tCommon("user_id")}
                </p>
                <p className="mt-1 font-mono text-xs break-all">
                  <Loadable
                    loading={awaitingRecord}
                    placeholder="00000000-0000-0000-0000-000000000000"
                  >
                    {ownerId ?? "—"}
                  </Loadable>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {tCommon("opened")}
                </p>
                <p className="mt-1 text-sm">
                  <Loadable loading={awaitingRecord} placeholder="1 Jan, 2026">
                    {fmtDate(wallet?.createdAt, "PPP")}
                  </Loadable>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {tCommon("last_updated")}
                </p>
                <p className="mt-1 text-sm">
                  <Loadable loading={awaitingRecord} placeholder="1 Jan, 2026">
                    {fmtDate(wallet?.updatedAt, "PPP 'at' p")}
                  </Loadable>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Every non-ECO wallet renders "N/A" here, which is a heading and a
              tile spent saying nothing. Drop the section instead. */}
          {addresses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" />
                  {tCommon("on_chain_addresses")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={`${addr.network}-${addr.address}`}
                    className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Badge tone="info" appearance="soft">
                        {addr.network}
                      </Badge>
                      <p className="mt-1 font-mono text-xs break-all">
                        {addr.address}
                      </p>
                    </div>
                    {addr.balance != null && (
                      <MoneyFigure
                        className="text-sm text-muted-foreground"
                        value={`${fmtAmount(addr.balance)} ${currency}`.trim()}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        <TabsContent value="transactions" className="mt-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4" />
                {tCommon("transactions")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Money movements recorded against this wallet.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="mb-3 rounded-full bg-muted p-3">
                    <ScrollText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No transactions</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nothing has moved on this wallet yet.
                  </p>
                </div>
              ) : (
                // Wide content scrolls inside its own box; the page must never
                // scroll sideways.
                <div className="-mx-2 overflow-x-auto px-2">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">
                          {tCommon("date")}
                        </th>
                        <th className="py-2 pr-4 font-medium">
                          {tCommon("type")}
                        </th>
                        <th className="py-2 pr-4 text-right font-medium">
                          {tCommon("amount")}
                        </th>
                        <th className="py-2 pr-4 text-right font-medium">
                          {tCommon("fee")}
                        </th>
                        <th className="py-2 pr-4 font-medium">
                          {tCommon("status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr
                          key={txn.id}
                          className="border-b border-border/50 align-top last:border-0"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-4 text-muted-foreground">
                            {fmtDate(txn.createdAt, "dd MMM yyyy, HH:mm")}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge tone="neutral" appearance="soft">
                              {String(txn.type ?? "").replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-right font-mono tabular-nums">
                            {fmtAmount(txn.amount)} {currency}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-right font-mono tabular-nums text-muted-foreground">
                            {fmtAmount(txn.fee)} {currency}
                          </td>
                          <td className="py-2.5 pr-4">
                            <StatusBadge
                              status={txn.status}
                              label={statusLabel(txn.status)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Audit — what STAFF did to this wallet, and every balance change,
            both read from append-only tables. Nothing on this tab can write.
            `targetId` is the wallet: `extractTargetId` takes the last id-shaped
            path segment, so both `/wallet/{id}/balance` and `/wallet/{id}/status`
            file their audit rows under this wallet's id. `walletId` scopes the
            balance ledger to this wallet alone — the owner's whole trail is a
            click away on their CRM record. */}
        <TabsContent value="audit" className="mt-6">
          {/* No `auditTitle`/`auditDescription` override: the panel's own
              defaults say "this record", which is what a wallet is. The user
              record page overrides them because "account" is right there. */}
          <RecordAuditTab targetId={wallet?.id} walletId={wallet?.id} />
        </TabsContent>
      </Tabs>

      <AdjustBalanceDialog
        wallet={wallet}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onAdjusted={refresh}
      />
    </PageShell>
  );
}
