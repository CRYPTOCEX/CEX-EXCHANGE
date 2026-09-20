"use client";

import { ArrowRight, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { format } from "date-fns";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuditFeed } from "./use-audit-feed";
import { useTranslations } from "next-intl";

/**
 * The balance ledger — every credit, debit, hold and release, with the balance
 * either side of it.
 *
 * `wallet_audit_log` has been written on every balance mutation since
 * `services/wallet/audit/AuditLogger.ts` was built, and until the read endpoint
 * landed it had no API and no UI at all. This is the panel that makes "my
 * balance is wrong" answerable in one screen instead of a database session.
 *
 * NOT a timeline and NOT a `DataTable`: the whole value is the arithmetic —
 * `previousBalance → newBalance` beside the amount that caused it — which needs
 * columns that line up. (And a second `DataTable` on a page fights the first
 * over the single global `useTableStore`; see `use-audit-feed.ts`.)
 *
 * EVERY MONEY FIELD ARRIVES AS A STRING. They are `DECIMAL(30,18)` and mysql2
 * returns DECIMAL as a string to avoid float loss, so `amount.toFixed()` throws
 * and `a + b` concatenates. Nothing here touches a raw value without `Number()`.
 */

interface WalletLedgerPanelProps {
  /** A customer's whole trail across every wallet. */
  userId?: string;
  /** One wallet's history. */
  walletId?: string;
  title?: string;
  perPage?: number;
}

interface LedgerRow {
  id: string;
  userId: string;
  walletId: string;
  operation: string;
  amount: string | number;
  previousBalance?: string | number | null;
  newBalance?: string | number | null;
  previousInOrder?: string | number | null;
  newInOrder?: string | number | null;
  transactionId?: string | null;
  idempotencyKey?: string;
  createdAt: string;
  metadata?: Record<string, any> | string | null;
  wallet?: { id: string; currency?: string; type?: string } | null;
}

/**
 * Direction of travel per operation, for the tone only.
 *
 * `HOLD` and `RELEASE` are deliberately neutral: they move money between
 * `balance` and `inOrder` on the same wallet and do not change what the
 * customer owns, so painting them as a debit or credit would misrepresent them.
 */
const OPERATION_TONE: Record<string, BadgeTone> = {
  WALLET_CREATED: "info",
  CREDIT: "success",
  DEBIT: "destructive",
  HOLD: "neutral",
  RELEASE: "neutral",
  TRANSFER_IN: "success",
  TRANSFER_OUT: "destructive",
  EXECUTE_FROM_HOLD: "warning",
};

const CREDITS = new Set(["CREDIT", "TRANSFER_IN"]);
const DEBITS = new Set(["DEBIT", "TRANSFER_OUT", "EXECUTE_FROM_HOLD"]);

/** DECIMAL(30,18) arrives as a string. Never format one without this. */
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Trims the 18 stored decimals to something readable without rounding a real
 * balance away: significant digits are kept, trailing zeroes are not.
 */
function amount(value: unknown): string {
  const n = num(value);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const decimals = abs < 0.0001 ? 10 : abs < 1 ? 8 : 4;
  return n
    .toFixed(decimals)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

export function WalletLedgerPanel({
  userId,
  walletId,
  title = "Balance ledger",
  perPage = 10,
}: WalletLedgerPanelProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const { rows, isLoading, error, hasMore, total, loadMore } =
    useAuditFeed<LedgerRow>({
      endpoint: "/api/admin/finance/wallet/audit",
      filter: { userId, walletId },
      perPage,
    });

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-6">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning-ink mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {t("the_balance_ledger_could_not_be_loaded")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("append_only_every_balance_change_with")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && rows.length === 0 ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("no_balance_changes")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("nothing_has_moved_on_this_wallet_yet")}
            </p>
          </div>
        ) : (
          // Wide content scrolls inside its own box; the page must not scroll
          // sideways because a ledger has six columns.
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Operation</th>
                  <th className="py-2 pr-4 font-medium text-right">Amount</th>
                  <th className="py-2 pr-4 font-medium">Balance</th>
                  <th className="py-2 pr-4 font-medium">{tCommon("in_order")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const op = String(row.operation || "").toUpperCase();
                  const sign = CREDITS.has(op) ? "+" : DEBITS.has(op) ? "−" : "";
                  const currency = row.wallet?.currency || "";
                  const inOrderMoved =
                    num(row.previousInOrder) !== num(row.newInOrder);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 last:border-0 align-top"
                    >
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              {format(new Date(row.createdAt), "dd MMM, HH:mm")}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-0.5">
                              <div>
                                {format(new Date(row.createdAt), "PPP 'at' pp")}
                              </div>
                              {row.transactionId && (
                                <div className="font-mono text-xs">
                                  txn {row.transactionId}
                                </div>
                              )}
                              {row.idempotencyKey && (
                                <div className="font-mono text-xs">
                                  key {row.idempotencyKey}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      <td className="py-2.5 pr-4">
                        <Badge
                          tone={OPERATION_TONE[op] ?? "neutral"}
                          appearance="soft"
                        >
                          {op.replace(/_/g, " ")}
                        </Badge>
                        {row.wallet?.type && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {row.wallet.type}
                          </span>
                        )}
                      </td>

                      <td
                        className={cn(
                          "py-2.5 pr-4 text-right font-mono tabular-nums whitespace-nowrap",
                          CREDITS.has(op) && "text-success-ink",
                          DEBITS.has(op) && "text-destructive-ink"
                        )}
                      >
                        {sign}
                        {amount(row.amount)} {currency}
                      </td>

                      <td className="py-2.5 pr-4 font-mono tabular-nums whitespace-nowrap text-muted-foreground">
                        <span>{amount(row.previousBalance)}</span>
                        <ArrowRight className="inline h-3 w-3 mx-1.5" />
                        <span className="text-foreground">
                          {amount(row.newBalance)}
                        </span>
                      </td>

                      <td className="py-2.5 pr-4 font-mono tabular-nums whitespace-nowrap text-muted-foreground">
                        {inOrderMoved ? (
                          <>
                            <span>{amount(row.previousInOrder)}</span>
                            <ArrowRight className="inline h-3 w-3 mx-1.5" />
                            <span className="text-foreground">
                              {amount(row.newInOrder)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {rows.length > 0 && (
        <div className="border-t bg-muted/50 flex items-center justify-between p-2 px-4">
          <div className="text-xs text-muted-foreground">
            Showing {rows.length} of {total}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  {tCommon("loading")}…
                </>
              ) : (
                tCommon("load_more")
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default WalletLedgerPanel;
