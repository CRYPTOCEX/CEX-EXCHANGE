"use client";
import React from "react";
import { useTranslations } from "next-intl";

import {
  Shield,
  User,
  DollarSign,
  Wallet,
  MapPin,
  Lock,
  CalendarIcon,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoneyFigure } from "@/components/ui/money-figure";
import { formatCurrencySafe } from "@/utils/currency";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
// One shared renderer, because this page and the admin wallets page had drifted
// into two copies of it — this one hardcoded English labels no locale reached.
import { renderEcoAddresses } from "@/components/blocks/wallet/eco-addresses";
import { CurrencyMark } from "../_components/finance-ui";
import { useCurrencyIcon } from "@/hooks/use-currency-icon";

// Wallet type badge colors
const walletTypeStyles: Record<string, { dot: string; badge: string }> = {
  FIAT: {
    dot: "bg-success",
    badge: "bg-success/10 text-success-ink",
  },
  SPOT: {
    dot: "bg-primary",
    badge: "bg-primary/10 text-primary-ink",
  },
  ECO: {
    dot: "bg-primary",
    badge: "bg-primary/10 text-primary-ink",
  },
  FUTURES: {
    dot: "bg-warning",
    badge: "bg-warning/10 text-warning-ink",
  },
};

function renderWalletType(value: string) {
  const style = walletTypeStyles[value] || {
    dot: "bg-muted",
    badge: "bg-muted/10 text-subtle-foreground",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
      <span className={`mr-1.5 h-2 w-2 rounded-full ${style.dot}`} />
      {value}
    </span>
  );
}

/**
 * The currency cell: coin logo + code, or just the code.
 *
 * Whether the logo appears at all is the `walletCurrencyIcons` system setting,
 * read inside the cell rather than passed down — a column definition is built
 * once per render of `useColumns` and its `render` closures outlive that call,
 * so reading the store here is what makes an admin flipping the switch reach a
 * table that is already on screen.
 *
 * Two sources, in order: ECO rows carry an operator-uploaded `icon` from
 * `ecosystemToken`, everything else has a path in the bundled `/img/crypto`
 * set. `CurrencyMark` walks the list and lands on its letter mark when both
 * miss, which is the whole point — a wallets list is a list of money, and a row
 * of broken-image glyphs reads as though the balances failed to load too.
 */
const CurrencyCell = ({ value, row }: { value: any; row?: any }) => {
  const { resolve } = useCurrencyIcon();
  const code = String(value ?? "").toUpperCase();
  const icon = resolve(code);

  if (!icon) {
    return <span className="font-medium">{code}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <CurrencyMark
        code={code}
        type={row?.type}
        size="sm"
        icon={[row?.icon, icon]}
        // The code is printed right beside it, so a letter mark here would read
        // BTC next to BTC. No icon means the cell is what it always was.
        fallback={null}
      />
      <span className="font-medium">{code}</span>
    </span>
  );
};

export function useColumns() {
  const t = useTranslations("finance_wallet");
  const tCommon = useTranslations("common");
  return [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: tCommon("unique_wallet_identifier"),
    priority: 3,
    expandedOnly: true,
  },
  /* Currency leads, and the card view already agreed.
   *
   * Column order is array order — `priority` only decides what survives a
   * narrow screen — so the leftmost column was the wallet TYPE. But a wallets
   * list is a list of currencies: the type is a qualifier on the row, not what
   * the row IS, and four rows reading FIAT / SPOT / SPOT / ECO down the left
   * edge sort the eye by the least distinguishing thing on the line. The card
   * view never had this problem, because it picks its own title by content and
   * had always picked `currency` — so the two views of the same table disagreed
   * about what identified a row. They agree now.
   *
   * It is also what the icon needs. A coin logo is the fastest thing on the row
   * to recognise, and that only pays if it is the first thing the eye lands on. */
  {
    key: "currency",
    title: tCommon("currency"),
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: tCommon("currency_code_for_this_wallet"),
    priority: 1,
    // Still `type: "text"` above, so sorting, searching and filtering keep
    // running server-side against the raw column — only the painting changes.
    render: {
      type: "custom",
      render: (value: any, row: any) => <CurrencyCell value={value} row={row} />,
    },
  },
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("type_of_wallet_fiat_spot_eco_or_futures"),
    options: [
      {
        value: "FIAT",
        label: tCommon("fiat"),
      },
      {
        value: "SPOT",
        label: tCommon("spot"),
      },
      {
        value: "ECO",
        label: tCommon("eco"),
      },
      {
        value: "FUTURES",
        label: tCommon("futures"),
      },
    ],
    render: {
      type: "custom",
      render: (value: string) => renderWalletType(value),
    },
    priority: 1,
  },
  {
    key: "balance",
    title: tCommon("balance"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    condition: (values) => !["ECO", "FUTURES"].includes(values.type),
    description: tCommon("available_balance_in_your_wallet"),
    priority: 1,
    render: {
      type: "custom",
      render: (value: any) => {
        const numValue = parseFloat(value) || 0;
        return numValue.toFixed(8);
      },
    },
  },
  {
    key: "inOrder",
    title: tCommon("in_order"),
    type: "number",
    icon: Lock,
    sortable: true,
    searchable: false,
    filterable: true,
    condition: (values) => !["ECO", "FUTURES"].includes(values.type),
    description: tCommon("funds_currently_locked_in_open_orders"),
    priority: 2,
    render: {
      type: "custom",
      render: (value: any) => {
        const numValue = parseFloat(value) || 0;
        return numValue.toFixed(8);
      },
    },
  },
  {
    key: "address",
    title: tCommon("address"),
    type: "custom",
    icon: MapPin,
    sortable: false,
    searchable: false,
    filterable: false,
    description: tCommon("blockchain_addresses_and_balances_for_eco_wallets"),
    render: {
      type: "custom",
      render: (value: any, row: any) => renderEcoAddresses(value, row),
    },
    priority: 2,
    expandedOnly: true,
  },
  // {
  //   key: "status",
  //   title: tCommon("status"),
  //   type: "boolean",
  //   icon: ClipboardList,
  //   sortable: true,
  //   searchable: true,
  //   filterable: true,
  //   editable: false,
  //   description: tCommon("wallet_status"),
  //   priority: 1,
  // },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: tCommon("date_when_this_wallet_was_created"),
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
    expandedOnly: true,
  },
] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A wallet is two money figures and a blob. The flat grid rendered `balance`
 * and `inOrder` as ordinary text tiles between the id and the created date —
 * they are the only two numbers anyone opens a wallet for, and their sum
 * (what the account actually holds) appeared nowhere at all. `address` is worse
 * off: it is a per-chain list of address/network/balance cards, and because
 * `custom` is not one of the block's full-width types it was laid out inside a
 * half-width tile.
 * -------------------------------------------------------------------------- */

const WALLET_TYPE_TONE: Record<
  string,
  "success" | "warning" | "destructive" | "info" | "neutral" | "primary"
> = {
  FIAT: "success",
  SPOT: "primary",
  ECO: "primary",
  FUTURES: "warning",
  COPY_TRADING: "info",
};

function walletAddresses(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

export function useViewConfig(): ViewConfig {
  const tCommon = useTranslations("common");
  const { resolve } = useCurrencyIcon();

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      // Title stays the currency (the table's primary column); the type and
      // the enabled flag are the badges beside it, so no subtitle repeats them.
      // With icons on it leads with the coin, so the dialog and the row it
      // opened from identify the wallet the same way.
      title: (row) => {
        const code = String(row?.currency ?? "").toUpperCase();
        const icon = resolve(code);
        if (!icon) return code;
        return (
          <span className="inline-flex items-center gap-2">
            <CurrencyMark
              code={code}
              type={row?.type}
              size="sm"
              icon={[row?.icon, icon]}
              fallback={null}
            />
            {code}
          </span>
        );
      },

      badges: (row) => (
        <>
          <Badge
            tone={WALLET_TYPE_TONE[String(row.type).toUpperCase()] ?? "neutral"}
            appearance="soft"
          >
            {row.type}
          </Badge>
          <Badge
            tone={row.status === false ? "destructive" : "success"}
            appearance="soft"
          >
            {row.status === false ? tCommon("disabled") : tCommon("active")}
          </Badge>
        </>
      ),

      stats: [
        {
          label: tCommon("balance"),
          icon: DollarSign,
          value: (row) => (
            <MoneyFigure
              value={formatCurrencySafe(
                Number(row.balance) || 0,
                row.currency || "USD"
              )}
            />
          ),
        },
        {
          label: tCommon("in_order"),
          icon: Lock,
          tone: "warning",
          value: (row) => (
            <MoneyFigure
              value={formatCurrencySafe(
                Number(row.inOrder) || 0,
                row.currency || "USD"
              )}
            />
          ),
        },
        {
          // Neither column holds this: it is what the account actually holds.
          label: tCommon("total_held"),
          icon: Coins,
          tone: "primary",
          value: (row) => (
            <MoneyFigure
              value={formatCurrencySafe(
                (Number(row.balance) || 0) + (Number(row.inOrder) || 0),
                row.currency || "USD"
              )}
            />
          ),
        },
      ],

      sections: [
        {
          id: "wallet",
          title: tCommon("wallet"),
          icon: Wallet,
          columns: 2,
          priority: 1,
          fields: [
            { key: "id", title: "ID", icon: Shield, copyable: true },
            {
              key: "createdAt",
              title: tCommon("created_at"),
              icon: CalendarIcon,
            },
          ],
        },
        {
          id: "addresses",
          title: tCommon("on_chain_addresses"),
          description:
            tCommon("deposit_addresses_and_per_chain_balances"),
          icon: MapPin,
          columns: 1,
          priority: 2,
          condition: (row) =>
            row.type === "ECO" &&
            Object.keys(walletAddresses(row.address)).length > 0,
          // Reuses the column's own renderer, but at full width — the chain
          // cards are unreadable in a half tile.
          fields: [
            { key: "address", title: tCommon("address"), fullWidth: true },
          ],
        },
      ],
    }),
    [tCommon, resolve]
  );
}
