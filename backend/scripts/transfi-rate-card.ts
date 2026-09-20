/**
 * Measures TransFi's actual fees and writes a rate card.
 *
 * TransFi publishes NO pricing — not in the docs, not in a rate card, nowhere in
 * the documentation index. Every fee number in their documentation is a sandbox
 * example inside a response body, not a rate.
 *
 * So this measures it. For every enabled corridor it asks
 * `GET /v3/exchange-rates` for a real quote and records what TransFi actually
 * charges: the percentage, any fixed component, the effective minimum, and the
 * FX rate applied. The output is evidence with a date and a MID on it, not an
 * estimate.
 *
 * IMPORTANT — this measures TRANSFI'S COST, not the platform's margin. It tells
 * an operator what a corridor costs them so they can set an informed fee; it does
 * not decide that fee. Sandbox pricing may also differ from the production
 * contract, which is why the output says so.
 *
 * Usage:
 *   cd backend && npx tsx scripts/transfi-rate-card.ts            # print
 *   cd backend && npx tsx scripts/transfi-rate-card.ts --write    # write the doc
 */

import "../module-alias-setup";
import "../load-env";
import fs from "fs";
import path from "path";

import {
  getTransfiConfig,
  listSupportedCurrencies,
  listPaymentMethods,
  getQuote,
  extractLimitsFromError,
} from "../src/api/finance/deposit/fiat/transfi/utils";
import { listPayoutMethods } from "../src/api/finance/withdraw/fiat/transfi/utils";

interface Row {
  direction: "deposit" | "withdraw";
  currency: string;
  method: string;
  methodName: string;
  pctFee: number | null;
  fixedFee: number | null;
  totalFeeAt: number | null;
  probeAmount: number | null;
  min: number | null;
  max: number | null;
  decimals: number;
  note?: string;
}

/** A probe amount comfortably inside the corridor so the quote succeeds. */
function probeFor(min: number | null, max: number | null): number {
  const lo = min && min > 0 ? min : 1;
  const hi = max && max > 0 ? max : lo * 1000;
  // 10x the floor, capped well under the ceiling.
  return Math.min(Math.max(lo * 10, lo + 1), Math.max(lo, hi / 2));
}

async function measure(
  direction: "deposit" | "withdraw",
  currency: string,
  decimals: number
): Promise<Row[]> {
  const methods =
    direction === "deposit"
      ? await listPaymentMethods(currency, "deposit")
      : await listPayoutMethods(currency);

  const rows: Row[] = [];
  for (const m of methods) {
    // First a deliberately tiny quote: it fails, and the failure carries the
    // authoritative window for this corridor.
    let min: number | null = null;
    let max: number | null = null;
    try {
      const q = await getQuote({
        sourceCurrency: currency,
        destinationCurrency: currency,
        amount: 1,
        orderType: direction === "deposit" ? "payin" : "payout",
        paymentCode: m.paymentCode,
        paymentType: m.paymentType,
      });
      min = q.minLimit ?? null;
      max = q.maxLimit ?? null;
    } catch (error) {
      const rec = extractLimitsFromError(error);
      min = rec?.minLimit ?? m.minAmount ?? null;
      max = rec?.maxLimit ?? m.maxAmount ?? null;
    }

    const probe = probeFor(min, max);
    let row: Row = {
      direction,
      currency,
      method: m.paymentCode,
      methodName: m.name || m.paymentCode,
      pctFee: null,
      fixedFee: null,
      totalFeeAt: null,
      probeAmount: probe,
      min,
      max,
      decimals,
    };

    try {
      const q = await getQuote({
        sourceCurrency: currency,
        destinationCurrency: currency,
        amount: probe,
        orderType: direction === "deposit" ? "payin" : "payout",
        paymentCode: m.paymentCode,
        paymentType: m.paymentType,
      });
      row.pctFee = typeof q.processingFeeRate === "number" ? q.processingFeeRate * 100 : null;
      row.totalFeeAt = typeof q.totalFee === "number" ? q.totalFee : null;
      const fx: any = (q as any).fixedFee;
      row.fixedFee = typeof fx?.totalFixedFees === "number" ? fx.totalFixedFees : 0;
      row.min = q.minLimit ?? row.min;
      row.max = q.maxLimit ?? row.max;
    } catch (error: any) {
      row.note = String(error?.message || "quote unavailable").slice(0, 80);
    }

    rows.push(row);
  }
  return rows;
}

function fmt(n: number | null, dp = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: dp });
}

async function main() {
  const config = getTransfiConfig();
  const write = process.argv.includes("--write");
  const env = config.sandbox ? "SANDBOX" : "PRODUCTION";

  console.log(`Measuring TransFi fees — MID ${config.mid} (${env})\n`);

  const depositCurrencies = await listSupportedCurrencies("deposit");
  const withdrawCurrencies = await listSupportedCurrencies("withdraw");

  const rows: Row[] = [];
  for (const c of depositCurrencies) {
    process.stdout.write(`  deposit  ${c.currency} … `);
    const r = await measure("deposit", c.currency, c.decimalPrecision);
    rows.push(...r);
    console.log(`${r.length} method(s)`);
  }
  for (const c of withdrawCurrencies) {
    process.stdout.write(`  withdraw ${c.currency} … `);
    const r = await measure("withdraw", c.currency, c.decimalPrecision);
    rows.push(...r);
    console.log(`${r.length} method(s)`);
  }

  const measured = rows.filter((r) => r.pctFee !== null);
  const pcts = measured.map((r) => r.pctFee as number);
  const uniquePcts = [...new Set(pcts.map((p) => p.toFixed(2)))].sort();
  const anyFixed = measured.some((r) => (r.fixedFee || 0) > 0);

  console.log(`\nMeasured ${measured.length} of ${rows.length} corridor/method pairs.`);
  console.log(`Percentage fees observed: ${uniquePcts.join("%, ")}%`);
  console.log(`Fixed components: ${anyFixed ? "present on some corridors" : "none observed"}`);

  const stamp = new Date().toISOString().slice(0, 10);
  const table = (dir: "deposit" | "withdraw") => {
    const set = rows.filter((r) => r.direction === dir).sort(
      (a, b) => a.currency.localeCompare(b.currency) || a.method.localeCompare(b.method)
    );
    if (!set.length) return "_None enabled._\n";
    return [
      "| Currency | Method | TransFi fee | Fixed | Minimum | Maximum |",
      "|---|---|---|---|---|---|",
      ...set.map((r) => {
        const dp = r.decimals === 0 ? 0 : 2;
        const fee = r.pctFee === null ? `— (${r.note || "no quote"})` : `${fmt(r.pctFee)}%`;
        return `| ${r.currency}${r.decimals === 0 ? " *(0dp)*" : ""} | ${r.methodName} \`${r.method}\` | ${fee} | ${
          r.fixedFee ? fmt(r.fixedFee, dp) : "none"
        } | ${fmt(r.min, dp)} | ${fmt(r.max, dp)} |`;
      }),
      "",
    ].join("\n");
  };

  const doc = `# TransFi rate card

**Measured ${stamp} against MID \`${config.mid}\` (${env}).**
Regenerate with \`cd backend && npx tsx scripts/transfi-rate-card.ts --write\`.

TransFi publishes no pricing — there is no rate card, fee schedule or billing page
anywhere in their documentation, and every fee figure in their docs is a sandbox
example inside a response body rather than a rate. So these numbers are
**measured**: for each corridor the generator asks \`GET /v3/exchange-rates\` for a
real quote and records what TransFi actually charged.

## Read this before using the numbers

- **These are TRANSFI's fees, not yours.** They are the cost of a corridor. The
  platform's own fee is a separate margin an operator sets in
  **Admin → Finance → Deposit → Gateways** (and the withdraw gateway), and it ships
  at **zero** deliberately — a fabricated default would silently overcharge
  customers from day one.
- **Sandbox pricing may not be your contract pricing.** ${
    config.sandbox
      ? "This run measured SANDBOX. Treat it as the shape of the pricing, not the amount, until you have re-run it against production credentials."
      : "This run measured PRODUCTION, so these are your live rates."
  }
- **TransFi's fee is deducted before you are credited.** A deposit of 5,000 with a
  2% fee settles 4,900 to you. The platform credits the settled amount, so your
  margin must come out of what actually arrives.
- **Fees are denominated in the SOURCE currency.** No field in the API states
  this; it was established by measurement.
- **Two fee layers are not visible here.** Settlement charges a
  \`settlementFeeCharged\` plus an FX spread (\`exchangeRateHoldingToSettlement\`)
  that appear in neither the order fees nor the balance categories, and payout fees
  are deducted from the MCA. Ask TransFi for those in writing.

## Summary

| | |
|---|---|
| Corridor/method pairs measured | ${measured.length} of ${rows.length} |
| Percentage fees observed | ${uniquePcts.map((p) => p + "%").join(", ")} |
| Fixed fee components | ${anyFixed ? "present on some corridors" : "none observed"} |
| Deposit currencies | ${depositCurrencies.length} |
| Withdraw currencies | ${withdrawCurrencies.length} |

## Deposits (payin)

${table("deposit")}
## Withdrawals (payout)

${table("withdraw")}
## Setting your own fee

The gateway rows ship with \`fixedFee\` and \`percentageFee\` at 0 for every
currency. To set a margin, edit the gateway in the admin and enter your fee per
currency. A worked example, using a corridor from the table above:

- Customer deposits **5,000 KES**
- TransFi takes **2%** → **100 KES**, and settles **4,900 KES** to you
- If you set a platform fee of **1%**, the customer is credited **4,851 KES** and
  you keep **49 KES**
- Your gross margin is that 49 KES; your cost of goods is TransFi's 100 KES

Set the fee **per currency**, not as a single number: the corridors differ, the
zero-decimal currencies (marked *0dp*) cannot express fractions of a unit, and a
flat percentage across all of them will be wrong somewhere.
`;

  if (write) {
    const out = path.resolve(__dirname, "../../docs/content/core/payment-gateways/transfi-rate-card.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, doc);
    console.log(`\nWritten: ${out}`);
  } else {
    console.log("\n(pass --write to save the rate card)\n");
    console.log(doc.slice(0, 1500));
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFailed:", e?.message || e);
  process.exit(1);
});
