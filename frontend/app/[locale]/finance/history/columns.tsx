"use client";

import {
  Shield,
  User,
  DollarSign,
  ArrowLeftRight,
  Activity,
  FileText,
  Hash,
  Info,
  CalendarIcon,
} from "lucide-react";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
/* IMPORTED, NOT MIRRORED. This file carried a hand-copied duplicate of the
   cell's helper, kept in step by a comment — and both copies had the same
   defect: every value at or above a thousandth was capped at three decimals, so
   a 0.0099 BTC credit printed here as "+0.01". One implementation now. */
import { countSignificantDecimals } from "@/components/blocks/data-table/content/rows/cells/number";
import { TransactionHash } from "@/components/blocks/wallet/transaction-hash";
import { looksLikeTxHash } from "@/lib/blockchain-explorer";

import { useTranslations } from "next-intl";
// Mapping for friendly labels
const metadataLabels: Record<string, string> = {
  fromWallet: "From Wallet",
  toWallet: "To Wallet",
  fromCurrency: "From Currency",
  toCurrency: "To Currency",
};

// ---------------------------------------------------------------------------
// Money-flow direction for the Amount column.
//
// Colour-codes and signs each amount so users (including colour-vision-impaired
// users, who rely on the +/- sign rather than the colour) can read the flow at a
// glance: money IN → green, prefixed "+"; money OUT → red, prefixed "-".
//
// Direction is read in order of authority:
//
//   1. `metadata.flow` — stamped by WalletService from the OPERATION that wrote
//      the row, so it cannot be wrong. IN / OUT / INTERNAL.
//   2. `metadata.operationType` — legacy rows written before `flow` existed, and
//      only for labels that exactly one kind of operation ever wrote.
//   3. `row.type` — last resort, for rows created outside WalletService.
//
// Anything still unresolved renders neutral (no sign, default colour) rather
// than guessing.
//
// Step 2 is a fallback and not a source of truth, because the label is chosen by
// the caller and the same string is written by operations that move money in
// OPPOSITE directions. "RELEASE" is the one that bit us: `release()` writes it
// when a hold is handed back (nothing gained) and the ecosystem matching engine
// writes it via `executeFromHold()` when a hold is CONSUMED by a fill (the funds
// left for the counterparty). Reading it as a credit made every filled sell
// order render as money ARRIVING — and, paired with the "HOLD" debit at
// placement, made a completed sale net to zero in the history.
//
// The three directions are about TOTAL holdings (balance + inOrder), which is
// what a transaction history is asked to account for. Placing an order and
// cancelling it are both INTERNAL: only the available/reserved split moved.
// ---------------------------------------------------------------------------

// operationType (from metadata.operationType) → direction. Legacy rows only.
const CREDIT_OPS = new Set([
  "DEPOSIT", "ECO_DEPOSIT", "INCOMING_TRANSFER", "REFUND", "ECO_REFUND",
  "REFUND_WITHDRAWAL", "REFUND_TRANSFER", "FX_TRADING_WITHDRAW_REFUND",
  "COPY_TRADING_REVERSAL", "INVESTMENT_ROI", "AI_INVESTMENT_ROI",
  "FOREX_INVESTMENT_ROI", "STAKING_REWARD", "REFERRAL_REWARD", "FOREX_DEPOSIT",
  "FX_TRADING_DEPOSIT", "TRADE_CREDIT", "BINARY_ORDER_WIN",
  "NFT_SALE", "ADMIN_ADJUSTMENT_CREDIT",
  // Legacy. Admin adjustments in BOTH directions were written as a bare
  // "ADJUSTMENT" until the direction-specific types were adopted, so rows
  // written before that are indistinguishable here and keep the old, sometimes
  // wrong, credit rendering. New rows carry the direction.
  "ADJUSTMENT",
]);
const DEBIT_OPS = new Set([
  "WITHDRAW", "ECO_WITHDRAW", "OUTGOING_TRANSFER", "PAYMENT", "FEE", "ECO_FEE",
  "INVESTMENT", "AI_INVESTMENT", "FOREX_INVESTMENT", "FOREX_WITHDRAW",
  "FX_TRADING_WITHDRAW", "ICO_CONTRIBUTION", "STAKING", "STAKING_DEPOSIT",
  "TRADE_DEBIT", "BINARY_ORDER_LOSS", "NFT_PURCHASE", "NFT_MINT",
  "NFT_AUCTION_BID", "ADMIN_ADJUSTMENT_DEBIT",
  // Hold CONSUMED at settlement: inOrder falls and nothing returns to balance,
  // so the funds are gone. Each of these is written only by executeFromHold.
  "EXCHANGE_ORDER_FILL", "P2P_TRADE_RELEASE",
]);
// Available <-> reserved only; total holdings unchanged, so no sign and no
// colour. Each label here is written only by hold() and/or release(), never by
// executeFromHold — so unlike a bare "RELEASE" it is not ambiguous.
const INTERNAL_OPS = new Set([
  "HOLD", "BINARY_ORDER", "NFT_OFFER", "P2P_TRADE_LOCK", "P2P_OFFER_LOCK",
  "P2P_OFFER_DELETE", "EXCHANGE_ORDER_CANCEL",
]);

// DB transaction type → direction. Fallback when operationType is unavailable.
// Only the types whose direction is unambiguous on their own are listed here;
// EXCHANGE_ORDER / FUTURES_ORDER / BINARY_ORDER / P2P_TRADE need operationType.
const CREDIT_TYPES = new Set([
  "DEPOSIT", "INCOMING_TRANSFER", "REFUND", "INVESTMENT_ROI", "AI_INVESTMENT_ROI",
  "FOREX_DEPOSIT", "FOREX_INVESTMENT_ROI", "FX_TRADING_DEPOSIT", "REFERRAL_REWARD",
  "STAKING_REWARD",
]);
const DEBIT_TYPES = new Set([
  "WITHDRAW", "OUTGOING_TRANSFER", "PAYMENT", "INVESTMENT", "AI_INVESTMENT",
  "FOREX_WITHDRAW", "FOREX_INVESTMENT", "FX_TRADING_WITHDRAW", "ICO_CONTRIBUTION",
  "STAKING",
]);

// metadata can be a JSON string (MariaDB) or an already-parsed object (MySQL).
function readMetadata(metadata: any): any {
  if (!metadata) return null;
  if (typeof metadata !== "string") return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function readUpper(value: any): string | null {
  return typeof value === "string" ? value.toUpperCase() : null;
}

export function getTransactionDirection(row: any): "in" | "out" | null {
  const metadata = readMetadata(row?.metadata);

  // 1. The operation's own account of itself. Authoritative.
  const flow = readUpper(metadata?.flow);
  if (flow === "IN") return "in";
  if (flow === "OUT") return "out";
  if (flow === "INTERNAL") return null;

  // 2. Legacy rows: the caller's label, for labels only one operation wrote.
  const op = readUpper(metadata?.operationType);
  if (op) {
    if (CREDIT_OPS.has(op)) return "in";
    if (DEBIT_OPS.has(op)) return "out";
    if (INTERNAL_OPS.has(op)) return null;
  }

  // 3. Rows created outside WalletService.
  const type = String(row?.type || "").toUpperCase();
  if (CREDIT_TYPES.has(type)) return "in";
  if (DEBIT_TYPES.has(type)) return "out";
  return null;
}

/**
 * The chain a transaction settled on, as recorded by whichever engine moved it.
 *
 * Both withdrawal engines stamp `metadata.chain`, but with DIFFERENT
 * vocabularies — the ecosystem writes its own symbol ("ETH", "TRON"), spot
 * writes the exchange's network code ("ERC20", "TRC20") — which is why the
 * explorer resolver accepts both rather than this normalising here. `network`
 * is stamped by the ecosystem withdrawal path only; its absence means mainnet,
 * which is also the only thing a spot payout can be.
 *
 * `wallet.currency` is the last resort and is deliberately last: for a
 * single-chain asset (BTC, XMR, TON) the currency IS the chain, but for USDT it
 * is not a chain at all — so it can only be consulted once metadata has had its
 * say.
 */
export function getTransactionChain(row: any): {
  chain: string | null;
  network: string | null;
  explorerUrl: string | null;
} {
  const metadata = readMetadata(row?.metadata);
  const chain =
    (typeof metadata?.chain === "string" && metadata.chain) ||
    (typeof row?.wallet?.currency === "string" && row.wallet.currency) ||
    null;
  // `network` means the network WITHIN the chain (sepolia, shasta, amoy), never
  // the chain itself — no flow records a chain under that key. Absent on rows
  // written before the ecosystem started stamping it, and on every spot payout;
  // both are mainnet, which is what the resolver defaults to.
  const network =
    typeof metadata?.network === "string" ? metadata.network : null;
  // Present only on operator-defined custom chains, whose explorer no
  // compiled-in table can know (stamped by `createPendingTransaction`).
  const explorerUrl =
    typeof metadata?.explorerUrl === "string" ? metadata.explorerUrl : null;
  return { chain, network, explorerUrl };
}

/**
 * The on-chain hash of a transaction, wherever the flow that settled it put it.
 *
 * `trxId` is the field for this and every broadcaster writes it — but it is NOT
 * the only place a hash ends up:
 *
 *   - A withdrawal an admin completes BY HAND has no broadcaster. That path
 *     (`api/admin/finance/withdraw/log/[id]/index.put.ts`) demands the operator
 *     supply a value and puts it in `referenceId`, whose own error message
 *     calls it a "transaction hash or wire reference". So the hash for exactly
 *     those withdrawals — the manual crypto payouts — is in `referenceId`, and
 *     a resolver reading `trxId` alone shows them nothing.
 *   - When that reference collides with the platform-wide UNIQUE index on
 *     `referenceId`, the same handler stores it in `metadata.settlementReference`
 *     instead, so a batch settled under one reference lands there.
 *
 * The fallbacks are gated on `looksLikeTxHash` precisely because that column
 * also holds wire references, ticket numbers and exchange payout ids. A bank
 * reference dressed up as an explorer link would send a user to a page denying
 * their withdrawal exists.
 */
export function getTransactionHash(row: any): string | null {
  if (typeof row?.trxId === "string" && row.trxId.trim()) return row.trxId.trim();

  const { chain } = getTransactionChain(row);
  const metadata = readMetadata(row?.metadata);
  const candidates = [row?.referenceId, metadata?.settlementReference];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && looksLikeTxHash(chain, candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

export function TransactionAmountCell({ value, row }: { value: any; row: any }) {
  const num = Number(value);
  const direction = getTransactionDirection(row);

  const magnitude = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.max(3, countSignificantDecimals(num)),
    minimumFractionDigits: 0,
  }).format(Math.abs(num));

  // R1: money DIRECTION rides --up/--down, which exist precisely so an owner can
  // recolour "money moved which way" without touching "the operation succeeded".
  // These two cells were on --success/--destructive, so a credit was byte-
  // identical to a COMPLETED chip and a debit to a FAILED one in the same row.
  if (direction === "in") {
    return (
      <span className="font-mono font-medium text-up">
        +{magnitude}
      </span>
    );
  }
  if (direction === "out") {
    return (
      <span className="font-mono font-medium text-down">
        -{magnitude}
      </span>
    );
  }
  // Unknown direction: keep it neutral rather than guessing a sign/colour.
  return <span className="font-mono">{magnitude}</span>;
}

export function RenderTransactionMetadata({ value }: { value: any }) {
  const tCommon = useTranslations("common");
  if (!value) return "N/A";

  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return <span className="text-destructive">{tCommon("invalid_metadata")}</span>;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return "None";

  // Filter out internal/technical fields that aren't useful to display.
  // `explorerUrl` is plumbing, not information: it is stamped on custom-chain
  // withdrawals purely so the Transaction Hash field can build its link, and
  // printing the bare URL beside a hash the user can already click is noise.
  const hiddenKeys = ["idempotencyKey", "inputs", "outputs", "gasLimit", "gasPrice", "gasUsed", "explorerUrl"];
  const visibleEntries = entries.filter(([key]) => !hiddenKeys.includes(key));

  if (visibleEntries.length === 0) return null;

  return (
    <Card className="bg-muted/10 w-full">
      <CardHeader>
        <CardTitle className="text-xs font-semibold">Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleEntries.map(([key, val]) => {
            const isComplex = typeof val === "object" && val !== null;
            const displayValue = isComplex
              ? Array.isArray(val)
                ? val.join(", ")
                : JSON.stringify(val)
              : String(val);

            return (
              <div key={key} className="flex flex-col gap-0.5 text-xs">
                <span className="font-bold">{metadataLabels[key] || key}</span>
                <span className="text-muted-foreground break-all">{displayValue}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A transaction is a receipt: the operator opens one to answer "how much moved,
 * which way, did it land, and what is the reference I can quote". The flat grid
 * buried the amount among ten equal tiles and stringified `metadata` — the
 * chain/txid/gateway payload that is the whole point of opening a row.
 * -------------------------------------------------------------------------- */

const TX_STATUS_TONE: Record<string, "success" | "warning" | "destructive" | "info" | "neutral"> = {
  COMPLETED: "success",
  PENDING: "warning",
  PROCESSING: "info",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REJECTED: "destructive",
  EXPIRED: "neutral",
  REFUNDED: "info",
  FROZEN: "warning",
  TIMEOUT: "destructive",
};

function humanizeTxType(value?: string): string {
  if (!value) return "Transaction";
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("finance_history");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) => humanizeTxType(row.type),
      subtitle: (row) =>
        row.wallet?.currency
          ? `${row.wallet.currency}${row.wallet.type ? ` · ${row.wallet.type}` : ""}`
          : undefined,

      badges: (row) => (
        <Badge
          tone={TX_STATUS_TONE[String(row.status ?? "").toUpperCase()] ?? "neutral"}
          appearance="soft"
          className="capitalize"
        >
          {String(row.status ?? "").toLowerCase() || "unknown"}
        </Badge>
      ),

      stats: [
        {
          label: tCommon("amount"),
          icon: DollarSign,
          // Reuses the table's own signed/toned cell, so the dialog cannot
          // disagree with the row about which way the money went.
          value: (row) => <TransactionAmountCell value={row.amount} row={row} />,
        },
        {
          label: tCommon("fee"),
          icon: DollarSign,
          value: (row) =>
            row.fee === null || row.fee === undefined || Number(row.fee) === 0
              ? "—"
              : String(row.fee),
        },
        {
          label: tCommon("created_at"),
          icon: CalendarIcon,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy HH:mm") : "—",
        },
      ],

      sections: [
        {
          id: "details",
          title: tCommon("details"),
          icon: FileText,
          columns: 2,
          fields: [
            {
              key: "description",
              title: tCommon("description"),
              icon: FileText,
              fullWidth: true,
              emptyText: tCommon("no_description_recorded"),
            },
            /* Full width and untruncated: this is the pane a user opens
               precisely to read the hash off against their wallet, and a 64
               character string elided in the middle defeats that. The
               component brings its own copy button, so `copyable` (which would
               add the generic one beside it) stays off. */
            {
              key: "trxId",
              title: tCommon("transaction_hash"),
              icon: Hash,
              fullWidth: true,
              condition: (row: any) => Boolean(getTransactionHash(row)),
              render: (_value: any, row: any) => {
                const { chain, network, explorerUrl } = getTransactionChain(row);
                return (
                  <TransactionHash
                    hash={getTransactionHash(row)}
                    chain={chain}
                    network={network}
                    explorerUrl={explorerUrl}
                    truncate={false}
                  />
                );
              },
            },
            {
              key: "referenceId",
              title: tCommon("reference_id"),
              icon: Hash,
              copyable: true,
              emptyText: t("not_referenced"),
            },
            {
              key: "id",
              title: "ID",
              icon: Shield,
              copyable: true,
            },
          ],
        },
        {
          id: "metadata",
          title: tCommon("metadata"),
          icon: Info,
          columns: 1,
          // The column's own renderer already filters the internal keys
          // (idempotencyKey, gas*, inputs/outputs) an end user must not be
          // shown, so it is reused rather than re-derived here.
          condition: (row) => Boolean(row.metadata),
          fields: [
            { key: "metadata", title: tCommon("metadata"), fullWidth: true },
          ],
        },
      ],
    }),
    [tCommon]
  );
}

export function useColumns() {
  const t = useTranslations("finance_history");
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
    description: tCommon("unique_identifier_for_your_transaction_record"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "wallet.currency",
    title: tCommon("wallet"),
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("your_wallet_associated_with_this_transaction"),
    render: (value: any, row: any) => {
      const wallet = row?.wallet;
      if (!wallet) return value || "N/A";
      if (wallet.currency && wallet.type) {
        return `${wallet.currency} (${wallet.type})`;
      }
      return wallet.currency || value || "N/A";
    },
    priority: 2,
  },
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    icon: ArrowLeftRight,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("type_of_transaction_in_your_wallet_history"),
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "DEPOSIT":
              return "success";
            case "WITHDRAW":
              return "danger";
            case "OUTGOING_TRANSFER":
              return "warning";
            case "INCOMING_TRANSFER":
              return "info";
            case "PAYMENT":
              return "primary";
            case "REFUND":
              return "secondary";
            case "BINARY_ORDER":
              return "info";
            case "EXCHANGE_ORDER":
              return "primary";
            case "INVESTMENT":
              return "secondary";
            case "INVESTMENT_ROI":
              return "secondary";
            case "AI_INVESTMENT":
              return "secondary";
            case "AI_INVESTMENT_ROI":
              return "secondary";
            case "INVOICE":
              return "info";
            case "FOREX_DEPOSIT":
              return "success";
            case "FOREX_WITHDRAW":
              return "danger";
            case "FOREX_INVESTMENT":
              return "secondary";
            case "FOREX_INVESTMENT_ROI":
              return "secondary";
            case "ICO_CONTRIBUTION":
              return "info";
            case "REFERRAL_REWARD":
              return "primary";
            case "STAKING":
              return "info";
            case "STAKING_REWARD":
              return "info";
            case "P2P_OFFER_TRANSFER":
              return "warning";
            case "P2P_TRADE":
              return "primary";
            case "FAILED":
              return "danger";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "FAILED", label: tCommon("failed") },
      { value: "DEPOSIT", label: tCommon("deposit") },
      { value: "WITHDRAW", label: tCommon("withdraw") },
      { value: "OUTGOING_TRANSFER", label: tCommon("outgoing_transfer") },
      { value: "INCOMING_TRANSFER", label: tCommon("incoming_transfer") },
      { value: "PAYMENT", label: tCommon("payment") },
      { value: "REFUND", label: tCommon("refund") },
      { value: "BINARY_ORDER", label: tCommon("binary_order") },
      { value: "EXCHANGE_ORDER", label: tCommon("exchange_order") },
      { value: "INVESTMENT", label: tCommon("investment") },
      { value: "INVESTMENT_ROI", label: tCommon("investment_roi") },
      { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
      { value: "AI_INVESTMENT_ROI", label: tCommon("ai_investment_roi") },
      { value: "INVOICE", label: tCommon("invoice") },
      { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
      { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
      { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
      { value: "FOREX_INVESTMENT_ROI", label: tCommon("forex_investment_roi") },
      { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
      { value: "REFERRAL_REWARD", label: tCommon("referral_reward") },
      { value: "STAKING", label: tCommon("staking") },
      { value: "STAKING_REWARD", label: tCommon("staking_reward") },
      { value: "P2P_OFFER_TRANSFER", label: tCommon("p2p_offer_transfer") },
      { value: "P2P_TRADE", label: tCommon("p2p_trade") },
    ],
    priority: 1,
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: Activity,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_processing_status_of_your_transaction"),
    options: [
      { value: "PENDING", label: tCommon("pending") },
      { value: "COMPLETED", label: tCommon("completed") },
      { value: "FAILED", label: tCommon("failed") },
      { value: "CANCELLED", label: tCommon("cancelled") },
      { value: "EXPIRED", label: tCommon("expired") },
      { value: "REJECTED", label: tCommon("rejected") },
      { value: "REFUNDED", label: tCommon("refunded") },
      { value: "FROZEN", label: tCommon("frozen") },
      { value: "PROCESSING", label: tCommon("processing") },
      { value: "TIMEOUT", label: tCommon("timeout") },
    ],
    priority: 1,
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("amount_of_money_involved_in_this_transaction"),
    // Colour + sign the amount by money-flow direction (green/"+" in, red/"-" out).
    // Trades (EXCHANGE_ORDER) resolve buy vs sell from metadata.operationType.
    render: {
      type: "custom",
      render: (value: any, row: any) => (
        <TransactionAmountCell value={value} row={row} />
      ),
    },
    priority: 1,
  },
  {
    key: "fee",
    title: tCommon("fee"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("fee_charged_for_processing_this_transaction"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "description",
    title: tCommon("description"),
    type: "text",
    icon: FileText,
    sortable: false,
    searchable: true,
    filterable: false,
    description: t("additional_details_and_notes_about_this"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "referenceId",
    title: tCommon("reference_id"),
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("unique_reference_code_for_tracking_and"),
    priority: 2,
    expandedOnly: true,
  },
  /* The on-chain hash — the user's receipt for a withdrawal, and the only
     identifier here that any block explorer recognises (`referenceId` above is
     ours alone). Rows that never touched a chain — fiat payouts, internal
     transfers, order fills — leave it empty and render a dash.

     Everything is derived from ROW, not from the cell's value: the explorer URL
     needs the chain, and for a manually settled withdrawal the hash is not even
     in this column (see `getTransactionHash`). A `getValue` would NOT serve
     here — the table cell path reads `getNestedValue(row, column.key)` directly
     (`content/rows/table-row-content.tsx`) and honours `getValue` only in the
     view dialog, so a column built on it renders correctly in one place and as
     an em-dash in the other.

     NOT `expandedOnly`, unlike `referenceId` beside it: an identifier the user
     is being invited to click or copy has to be reachable without first
     discovering that rows expand. `priority: 3` keeps it off the narrowest
     phones, where the card view still carries it in the expanded section. */
  {
    key: "trxId",
    title: tCommon("transaction_hash"),
    type: "custom",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("on_chain_hash_of_this_transaction_click_to_view"),
    priority: 3,
    render: {
      type: "custom",
      render: (_value: any, row: any) => {
        const hash = getTransactionHash(row);
        if (!hash) return <span className="text-muted-foreground">—</span>;
        const { chain, network, explorerUrl } = getTransactionChain(row);
        return (
          <TransactionHash
            hash={hash}
            chain={chain}
            network={network}
            explorerUrl={explorerUrl}
          />
        );
      },
    },
  },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("date_and_time_when_this_transaction_was_created"),
    priority: 2,
    render: { type: "date", format: "PPP", fullDate: true },
  },
  {
    key: "metadata",
    title: tCommon("metadata"),
    type: "custom",
    icon: Info,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("additional_technical_information_about_this_transa"),
    render: {
      type: "custom",
      render: (value: any) => <RenderTransactionMetadata value={value} />,
      title: false,
    },
    priority: 2,
    expandedOnly: true,
  },
] as ColumnDefinition[];
}
