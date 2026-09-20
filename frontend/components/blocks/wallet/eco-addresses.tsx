"use client";

import { useTranslations } from "next-intl";

/**
 * The per-chain deposit map on an ECO wallet:
 * `{ [chain]: { address, network, balance? } }`.
 *
 * ONE COMPONENT, TWO CALLERS. This lived as two drifted copies — the admin
 * wallets table and the customer wallets table — and each had lost a different
 * half. The admin copy rendered adjacent JSX expressions with NO separator
 * (`{t("address")}{address}`), which paints "Address0x1234…" and "Balance0" and
 * reads as one broken word. The customer copy had the separator and the
 * 8-decimal formatting, but hardcoded English labels no locale could reach.
 * This keeps the separator, the formatting and the translated labels.
 *
 * THE BALANCE LINE IS OPTIONAL, AND ITS ABSENCE IS A CONTRACT RATHER THAN A GAP.
 * `api/finance/wallet/**` strips the nested `balance` from CUSTOMER responses
 * (`withoutChainBalances`, backend/src/api/finance/wallet/utils.ts): it is a
 * custody tracker that lags `wallet.balance` by design — the generic
 * `credit()`/`debit()` path behind every spot fill writes the row balance alone
 * — and a customer cannot spend it, so shipping it under the same name as the
 * row's own `balance` read as a second, smaller pot of their own money. Admin
 * custody screens are served by `api/admin/**` and still carry the figure.
 *
 * So the line is rendered when the field is present and omitted when it is not.
 * The `?? 0` this replaced would paint an invented "0.00000000" on every
 * customer row — the one output that is worse than saying nothing.
 */

/** `null` for absent/unparseable, so a missing field never renders as zero. */
function chainBalanceOf(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(amount) ? amount : null;
}

export function EcoAddresses({ value, row }: { value: any; row?: any }) {
  const t = useTranslations("common");

  // Without a row there is no `type` to test, so nothing below can be trusted.
  if (!row) {
    return <>{t("no_row_data")}</>;
  }

  // Only ECO wallets have a per-chain deposit map at all.
  if (row.type !== "ECO") {
    return <>N/A</>;
  }

  if (!value) {
    return <>{t("no_addresses")}</>;
  }

  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return <span className="text-destructive">{t("invalid_address_json")}</span>;
  }

  // `JSON.parse("null")` is null and a scalar has no keys: both mean "nothing to
  // show" rather than a crash inside a table cell.
  const chains = Object.keys(parsed ?? {});
  if (!chains.length) {
    return <>{t("no_addresses")}</>;
  }

  return (
    <div className="space-y-2 text-sm">
      {chains.map((chain) => {
        const chainData = parsed[chain];
        const address = chainData?.address;
        const network = chainData?.network;
        const balance = chainBalanceOf(chainData?.balance);
        /* `depositable === false` is the route saying it cannot build a deposit
           monitor for this chain, so funds sent to the address could never be
           credited. THE FLAG IS READ HERE AND NOT ONLY UPSTREAM: this component
           has two callers, and the ADMIN wallets table deliberately keeps the
           full map so an operator can answer "where did my coins go". The
           customer-facing column is literally headed "Deposit addresses".

           `!== false`, not `=== true`: older payloads and every non-ECO caller
           carry no flag at all, and hiding those would blank the admin custody
           table. Same reading as the wallet detail page (client.tsx:167). */
        const depositable = chainData?.depositable !== false;
        return (
          <div
            key={chain}
            className="rounded-md bg-muted/10 p-2 border border-muted"
          >
            <div className="font-bold">{chain}</div>
            {depositable && address && (
              <div>
                <span className="text-muted-foreground">{t("address")}</span>{" "}
                <span className="font-mono break-all">{address}</span>
              </div>
            )}
            {!depositable && (
              /* The chain stays named. "The address vanished" is a support
                 ticket; "CELO — deposits are not available on this network" is
                 an answer, and deleting the row would take the operator's audit
                 trail with it. */
              <div className="text-warning-ink text-xs">
                {t("deposits_are_not_available_on_this_network")}
              </div>
            )}
            {network && (
              <div>
                <span className="text-muted-foreground">{t("network")}</span>{" "}
                {network}
              </div>
            )}
            {balance !== null && (
              <div>
                <span className="text-muted-foreground">{t("balance")}</span>{" "}
                {balance.toFixed(8)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Column `render` callbacks are plain functions, not components. */
export function renderEcoAddresses(value: any, row?: any) {
  return <EcoAddresses value={value} row={row} />;
}
