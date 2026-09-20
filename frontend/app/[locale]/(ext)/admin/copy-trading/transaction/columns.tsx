"use client";
import React from "react";
import {
  Shield,
  DollarSign,
  Calendar,
  User,
  Mail,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Users,
  Award,
  Wallet,
  Activity,
  Clock,
  Code,
  Percent,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { statusTone, statusLabel } from "@/lib/status-tone";

/*
  Direction needs BOTH signals, because the writers disagree about which one
  carries it.

  Some paths sign the amount: a transfer is written as two rows sharing one
  type, the outgoing leg negative and the incoming leg positive
  (follow.post.ts, remove-funds.post.ts, toggle.put.ts). Keying the arrow off
  `type` alone drew both legs of every allocation pointing the same way.

  Other paths store the magnitude and put the direction in the TYPE:
  `type: pnl >= 0 ? "TRADE_PROFIT" : "TRADE_LOSS", amount: Math.abs(pnl)`
  (binary.ts, fillMonitor.ts), and FEE rows are positive too. Keying the arrow
  off the sign alone therefore drew every realised LOSS and every platform FEE
  as a green inbound arrow — the whole point of the column, inverted.

  So: a negative amount is always a debit; otherwise the type decides.

  PROFIT_SHARE is the one type that cannot answer on its own. It writes two
  rows per event — the leader's credit and the follower's debit — carrying the
  same leaderId AND followerId, so only the row's own `userId` separates them.
  That is why the route selects `leader.userId` alongside the display name.

  Module scope rather than a closure inside `useColumns`, because the view
  dialog below needs the SAME answer the amount column gives. Two copies of a
  rule this subtle is how the two surfaces end up disagreeing about which way
  the money went.
*/
const isCredit = (row: any) => {
  if ((row?.amount ?? 0) < 0) return false;
  switch (row?.type) {
    case "DEALLOCATION":
    case "TRADE_PROFIT":
    case "REFUND":
      return true;
    case "ALLOCATION":
    case "TRADE_LOSS":
    case "FEE":
      return false;
    case "PROFIT_SHARE":
      return Boolean(row.leader?.userId) && row.leader.userId === row.userId;
    default:
      // An unrecognised type with a positive amount: money arrived. Better
      // than asserting a direction for an enum member added after this file.
      return true;
  }
};

export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: false,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Tag,
      sortable: true,
      searchable: false,
      filterable: true,
      // These are the members of copyTradingTransaction's `type` ENUM, and only
      // those. The list previously offered WITHDRAWAL / PLATFORM_FEE / REVERSAL
      // / ADJUSTMENT — names the model never stores — so picking any of them
      // filtered the table down to nothing.
      options: [
        { value: "ALLOCATION", label: tExt("allocation"), color: "info" },
        { value: "DEALLOCATION", label: tCommon("withdrawal"), color: "warning" },
        { value: "PROFIT_SHARE", label: tCommon("profit_share"), color: "success" },
        { value: "TRADE_PROFIT", label: tCommon("profit"), color: "success" },
        { value: "TRADE_LOSS", label: tCommon("loss"), color: "danger" },
        { value: "FEE", label: tCommon("fee"), color: "primary" },
        { value: "REFUND", label: tCommon("refund"), color: "muted" },
      ],
      render: {
        type: "custom",
        render: (value: string) => {
          const colors: Record<string, string> = {
            ALLOCATION: "bg-primary/10 text-primary-ink dark:bg-primary/30",
            DEALLOCATION: "bg-warning/10 text-warning-ink dark:bg-warning/30",
            PROFIT_SHARE: "bg-success/10 text-success-ink dark:bg-success/30",
            TRADE_PROFIT: "bg-success/10 text-success-ink dark:bg-success/30",
            TRADE_LOSS: "bg-destructive/10 text-destructive-ink dark:bg-destructive/30",
            FEE: "bg-info/10 text-info-ink dark:bg-info/30",
            REFUND: "bg-muted text-muted-foreground dark:bg-surface-2/30",
          };
          return (
            <Badge className={colors[value] || ""}>
              {value?.replace(/_/g, " ")}
            </Badge>
          );
        },
      },
      priority: 1,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: FileText,
      sortable: false,
      searchable: true,
      filterable: false,
      priority: 2,
      render: {
        type: "custom",
        render: (value: string, row: any) => (
          <div className="max-w-[200px]">
            <div className="truncate">{value}</div>
            {row.subscription?.leader && (
              <div className="text-xs text-muted-foreground">
                {tCommon("leader")}: {row.subscription.leader.displayName}
              </div>
            )}
          </div>
        ),
      },
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => {
          const credit = isCredit(row);
          return (
            <span
              className={`flex items-center justify-end font-mono tabular-nums ${
                credit ? "text-success" : "text-destructive"
              }`}
            >
              {credit ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {/* The CURRENCY, not a hardcoded `$`. These rows are denominated
                  in the market's quote asset (USDT, BTC, …) and the column read
                  every one of them as dollars. */}
              {Math.abs(value || 0).toLocaleString(undefined, {
                maximumFractionDigits: 8,
              })}
              <span className="ml-1 text-muted-foreground">{row?.currency}</span>
            </span>
          );
        },
      },
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      priority: 2,
      render: {
        type: "custom",
        render: (value: number, row: any) =>
          value > 0 ? (
            <span className="font-mono tabular-nums">
              {value.toLocaleString(undefined, { maximumFractionDigits: 8 })}
              <span className="ml-1 text-muted-foreground">{row?.currency}</span>
            </span>
          ) : (
            "-"
          ),
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: false,
      filterable: true,
      // The `status` ENUM is PENDING / COMPLETED / FAILED. There is no REVERSED
      // status — reversing a transaction leaves the original untouched and
      // writes a NEW compensating row (see transaction/[id]/reverse).
      options: [
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "PENDING", label: tCommon("pending") },
        { value: "FAILED", label: tCommon("failed") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "COMPLETED":
                return "success";
              case "PENDING":
                return "warning";
              case "FAILED":
                return "danger";
              default:
                return "secondary";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 1,
      render: {
        type: "date",
        format: "PPpp",
      },
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A copy-trading transaction is a LEDGER ENTRY, and the table shows barely half
 * of one. The row carries `balanceBefore`/`balanceAfter` — the pair that makes a
 * ledger auditable — plus the linked trade, the leader, the subscription and a
 * metadata blob, and none of those has a column, so the flat grid could not
 * reach them at all. What it did show, it showed table-shaped: the description
 * column truncates inside a `max-w-[200px]` box, which is exactly wrong for a
 * panel whose job is to show the whole sentence.
 *
 * There is no form config here (these rows are read-only), so without this the
 * dialog fell back to one undifferentiated grid of the nine visible columns.
 * -------------------------------------------------------------------------- */

/** Ledger amounts are denominated in the row's own `currency`, never in USD. */
function amountText(value: any, digits = 8): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function personName(user: any): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
}

/** The asset a figure is denominated in, kept quiet beside the number. */
function Denomination({ currency }: { currency?: string }) {
  if (!currency) return null;
  return <span className="ml-1 text-xs text-muted-foreground">{currency}</span>;
}

/** Bullish/bearish sides. TOUCH / NO_TOUCH carry no direction, so they stay neutral. */
const BULLISH_SIDES = new Set(["BUY", "RISE", "HIGHER", "CALL", "UP"]);
const BEARISH_SIDES = new Set(["SELL", "FALL", "LOWER", "PUT", "DOWN"]);

function sideTone(side: any): "success" | "destructive" | "neutral" {
  const key = String(side ?? "").toUpperCase();
  if (BULLISH_SIDES.has(key)) return "success";
  if (BEARISH_SIDES.has(key)) return "destructive";
  return "neutral";
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      /* 4xl, not 3xl. The section grids below are container-queried against the
         panel's own scroll region, so a 3-column group only actually reaches
         three columns once the panel clears 48rem of CONTENT width — at 3xl the
         padding puts it just under, and every `columns: 3` here would silently
         render as two. */
      size: "4xl",

      title: (row) => statusLabel(row.type) || tCommon("transaction"),

      subtitle: (row) => personName(row.user) || row.user?.email || undefined,

      badges: (row) => {
        const credit = isCredit(row);
        return (
          <>
            <Badge tone={statusTone(row.status)} appearance="soft">
              {statusLabel(row.status)}
            </Badge>
            <Badge tone={credit ? "success" : "destructive"} appearance="soft">
              {credit ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {credit ? t("credit") : t("debit")}
            </Badge>
          </>
        );
      },

      /* The four figures that make the entry reconcilable. Before and after sit
         beside the amount deliberately: an entry whose delta does not match its
         own balance pair is the thing an operator is looking for. Every one of
         them carries the row's own CURRENCY — these are quote-asset quantities
         (USDT, BTC, …), never dollars. */
      stats: [
        {
          label: tCommon("amount"),
          icon: DollarSign,
          // `tone` is fixed per stat while direction changes per row, so the
          // ink is chosen inside the value.
          value: (row) => {
            const credit = isCredit(row);
            return (
              <span
                className={
                  credit
                    ? "text-success font-mono tabular-nums"
                    : "text-destructive font-mono tabular-nums"
                }
              >
                {credit ? "+" : "−"}
                {amountText(Math.abs(Number(row.amount ?? 0)))}
                <Denomination currency={row.currency} />
              </span>
            );
          },
        },
        {
          label: tCommon("fee"),
          icon: Percent,
          value: (row) =>
            Number(row.fee ?? 0) > 0 ? (
              <span className="font-mono tabular-nums">
                {amountText(row.fee)}
                <Denomination currency={row.currency} />
              </span>
            ) : (
              <span className="text-muted-foreground">None</span>
            ),
        },
        {
          label: t("balance_before"),
          icon: Wallet,
          value: (row) => (
            <span className="font-mono tabular-nums">
              {amountText(row.balanceBefore)}
              <Denomination currency={row.currency} />
            </span>
          ),
        },
        {
          label: tExt("balance_after"),
          icon: Wallet,
          value: (row) => (
            <span className="font-mono tabular-nums">
              {amountText(row.balanceAfter)}
              <Denomination currency={row.currency} />
            </span>
          ),
        },
      ],

      sections: [
        {
          id: "parties",
          title: t("parties"),
          description:
            t("who_the_entry_debits_or_credits"),
          icon: Users,
          columns: 3,
          priority: 1,
          fields: [
            {
              key: "userId",
              title: tCommon("user"),
              icon: User,
              render: (_value, row) => (
                <span className="block min-w-0">
                  <span className="block break-words">
                    {personName(row.user) || row.user?.email || "—"}
                  </span>
                  {row.user?.email && personName(row.user) && (
                    <span className="block text-xs text-muted-foreground break-all">
                      {row.user.email}
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "leaderId",
              title: tCommon("leader"),
              icon: Award,
              emptyText: t("not_linked_to_a_leader"),
              render: (_value, row) => (
                <span className="break-words">
                  {row.leader?.displayName || "—"}
                </span>
              ),
            },
            {
              key: "followerId",
              title: tCommon("subscription"),
              icon: Users,
              copyable: true,
              emptyText: t("not_linked_to_a_subscription"),
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "trade",
          title: t("linked_trade"),
          icon: Activity,
          columns: 3,
          priority: 2,
          // A FEE or ALLOCATION row has no trade behind it; an empty "Linked
          // Trade" block would imply the link failed rather than never existed.
          condition: (row) => Boolean(row.trade),
          fields: [
            {
              key: "trade.symbol",
              title: tCommon("symbol"),
              icon: Activity,
              render: (value) => (
                <span className="font-mono">{String(value)}</span>
              ),
            },
            {
              key: "trade.side",
              title: tCommon("side"),
              icon: ArrowUpRight,
              render: (value) => (
                <Badge tone={sideTone(value)} appearance="soft">
                  {statusLabel(String(value))}
                </Badge>
              ),
            },
            {
              key: "trade.amount",
              title: t("trade_size"),
              icon: DollarSign,
              render: (value) => (
                <span className="font-mono tabular-nums">
                  {amountText(value)}
                </span>
              ),
            },
            {
              key: "tradeId",
              title: tExt("trade_id"),
              icon: Shield,
              copyable: true,
              fullWidth: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "description",
          title: tCommon("description"),
          icon: FileText,
          columns: 1,
          priority: 3,
          fields: [
            {
              key: "description",
              title: tCommon("description"),
              icon: FileText,
              fullWidth: true,
              emptyText: tCommon("no_description_recorded"),
              // The column's own renderer is table-shaped — it truncates inside
              // a `max-w-[200px]` box — so the panel supplies its own.
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "metadata",
          title: tCommon("metadata"),
          description: t("the_raw_payload_the_writing_service"),
          icon: Code,
          priority: 4,
          condition: (row) => Boolean(row.metadata),
          render: (row) => {
            let text = String(row.metadata ?? "");
            try {
              text = JSON.stringify(JSON.parse(text), null, 2);
            } catch {
              /* Not JSON — show it verbatim rather than nothing. */
            }
            return (
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap break-all text-muted-foreground">
                {text}
              </pre>
            );
          },
        },
        {
          id: "reference",
          title: tCommon("reference"),
          icon: Clock,
          columns: 2,
          priority: 5,
          fields: [
            { key: "id", title: tCommon("transaction_id"), icon: Shield, copyable: true },
            { key: "createdAt", title: tCommon("recorded"), icon: Calendar },
          ],
        },
      ],
    }),
    []
  );
}

export function useFormConfig(): FormConfig {
  // Transactions are read-only, no create/edit forms needed
  return {};
}
