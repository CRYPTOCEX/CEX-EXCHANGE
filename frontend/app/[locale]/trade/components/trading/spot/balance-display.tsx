import { Wallet, Lock } from "lucide-react";
import type { WalletData, WalletBalance } from "./types";
import { toNum } from "@/lib/precision-utils";
import { useTranslations } from "next-intl";
import { MoneyFigure } from "@/components/ui/money-figure";
import { Loadable } from "@/components/ui/skeleton";

interface BalanceDisplayProps {
  walletData: WalletData | null;
  isLoadingWallet: boolean;
  currency: string;
  pair: string;
  marketPrice: string;
  pricePrecision?: number;
  amountPrecision?: number;
}

interface BalanceDetails {
  total: number;
  inOrder: number;
  available: number;
}

// Format balance based on market precision
function formatBalance(value: number, precision: number) {
  // Handle very small values
  if (value === 0) {
    return value.toFixed(Math.min(precision, 8));
  }

  // For non-zero values, show appropriate precision
  const formatted = value.toFixed(Math.min(precision, 8));

  // Remove trailing zeros but keep at least 2 decimal places
  const parts = formatted.split(".");
  if (parts.length === 2) {
    const decimals = parts[1].replace(/0+$/, "");
    const minDecimals = Math.min(2, precision);
    if (decimals.length < minDecimals) {
      return value.toFixed(minDecimals);
    }
    return decimals.length === 0 ? parts[0] : `${parts[0]}.${decimals}`;
  }
  return formatted;
}

// Helper to extract balance details from WalletBalance or number
function getBalanceDetails(
  balance: number | WalletBalance | undefined
): BalanceDetails {
  if (!balance) {
    return { total: 0, inOrder: 0, available: 0 };
  }
  if (typeof balance === "object") {
    // Wallet balances come from DB DECIMAL columns and can be strings; coerce
    // so formatBalance's `.toFixed()` never throws.
    return {
      total: toNum(balance.total), // Total owned (balance + inOrder)
      inOrder: toNum(balance.inOrder), // Locked in orders
      available: toNum(balance.balance), // Available/spendable
    };
  }
  // Backward compatibility: if it's a number, treat it as available balance
  const n = toNum(balance);
  return { total: n, inOrder: 0, available: n };
}

/** One asset row. This markup was written out twice, character for character. */
function AssetBalanceRow({
  asset,
  details,
  isLoadingWallet,
  amountPrecision,
  className,
}: {
  asset: string;
  details: BalanceDetails;
  isLoadingWallet: boolean;
  amountPrecision: number;
  className?: string;
}) {
  const t = useTranslations("common");

  /**
   * The locked-funds line, and why it stays withheld.
   *
   * Named rather than written inline so the intent is on the record: this is
   * NOT a value being hidden until it is known, it is a row that is genuinely
   * absent for most wallets. Reserving its 14px would put a permanent gap
   * under every clean balance in the trading form — the withheld-content
   * defect inverted and paid by the common case instead of the rare one.
   *
   * The `!isLoadingWallet` half is about truthfulness, not layout: `inOrder`
   * is 0 for the whole fetch, so a wallet that DOES have funds locked would be
   * silently described as fully available for that window, which is the
   * figure a trader sizes an order against.
   */
  const showLockedInOrders = !isLoadingWallet && details.inOrder > 0;

  return (
    <div
      className={`flex items-center justify-between text-xs ${className ?? ""}`}
    >
      <div className="flex items-center text-muted-foreground">
        <Wallet className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
        <span>
          {asset} {t("balance")}
        </span>
      </div>
      {/*
        ONE right-hand column in both states.

        This used to branch to a single-line `{t("loading")}...`, against a
        settled column that is a stacked `flex flex-col items-end gap-0.5` of
        two lines — the balance at `text-xs` and the "Available:" line at
        `text-[10px]`. That is 16px of the trading form appearing under the
        balance row the instant the wallet resolves, and this row sits directly
        above the amount input and the buy/sell button, so the control the user
        is reaching for moves.

        The "Available:" label and the `in orders` unit are static text and
        render throughout; only the three figures wait. Note that the
        `in_orders` line still appears conditionally — it is genuinely absent
        for a wallet with nothing locked, so reserving it would put a permanent
        gap under every clean balance.
      */}
      <div className="flex flex-col items-end gap-0.5">
        {/* `Loadable`, not `isLoading ? <SkeletonText/> : <MoneyFigure/>`.
            The ternary was two elements for one figure — the primitive exists
            precisely to be the single element that IS both states, and it
            takes the same `placeholder` the branch was passing. Same box, one
            spelling, and the placeholder can no longer drift from the value it
            stands in for. */}
        <span className="text-foreground font-medium tabular-nums">
          <Loadable
            loading={isLoadingWallet}
            placeholder={`0.00000000 ${asset}`}
          >
            <MoneyFigure
              value={`${formatBalance(details.total, amountPrecision)} ${asset}`}
            />
          </Loadable>
        </span>
        {showLockedInOrders && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            <span className="tabular-nums">
              {formatBalance(details.inOrder, amountPrecision)}{" "}
              {t("in_orders")}
            </span>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {t("available")}:{" "}
          <Loadable loading={isLoadingWallet} placeholder="0.00000000">
            {formatBalance(details.available, amountPrecision)}
          </Loadable>
        </span>
      </div>
    </div>
  );
}

export default function BalanceDisplay({
  walletData,
  isLoadingWallet,
  currency,
  pair,
  marketPrice,
  pricePrecision = 2,
  amountPrecision = 4,
}: BalanceDisplayProps) {
  // Get the actual currency and pair balance details
  const currencyDetails = getBalanceDetails(walletData?.currencyBalance);
  const pairDetails = getBalanceDetails(walletData?.pairBalance);

  return (
    <div className="flex flex-col px-3 py-2 bg-surface-2 border-b border-border gap-2">
      <AssetBalanceRow
        asset={currency}
        details={currencyDetails}
        isLoadingWallet={isLoadingWallet}
        amountPrecision={amountPrecision}
      />
      <AssetBalanceRow
        asset={pair}
        details={pairDetails}
        isLoadingWallet={isLoadingWallet}
        amountPrecision={amountPrecision}
        className="border-t border-border/50 pt-2"
      />
    </div>
  );
}
