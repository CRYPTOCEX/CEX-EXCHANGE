/**
 * Reconcile the ECO per-chain balance trackers against the wallet that owns them.
 *
 *   cd backend
 *   tsx -r dotenv/config -r ./module-alias-setup.ts scripts/reconcile-eco-chain-trackers.ts dotenv_config_path=../.env
 *   ... --apply             # write the repair
 *   ... --user <userId>     # scope to one user
 *
 * WHY THIS EXISTS
 * ---------------
 * An ECO wallet carries the same money THREE times:
 *
 *   wallet.balance                  the authority — the canonical, spendable,
 *                                   currency-scoped platform total.
 *   wallet.address[chain].balance   a per-chain tracker inside the address JSON.
 *   wallet_data.balance             a per-(wallet, chain) tracker row.
 *
 * `ecoDebit` CLAMPS both trackers at zero (correct: a tracker must never go
 * negative, and the trackers legitimately lag the authority because money can
 * reach an ECO wallet without touching a chain). `ecoRefund` used to restore the
 * FULL amount unconditionally, so a debit followed by its own refund left both
 * trackers at `max(before, amount)` — a RATCHET that climbed with every failed
 * withdrawal while `wallet.balance` never moved.
 *
 * `admin/ecosystem/dashboard/index.get.ts` reports `onChain` as
 * `SUM(wallet_data.balance)` and derives `spendable`, `coverage`, `shortfall`,
 * `state` and `assetsShort` from it, so the ratchet made the custody page report
 * cover the platform does not hold. The service is fixed; this repairs the rows
 * written before that.
 *
 * WHAT IT WILL AND WILL NOT TOUCH
 * -------------------------------
 * It NEVER writes `wallet.balance`, `wallet.inOrder` or a transaction row. It
 * only ever LOWERS a tracker, never raises one: a tracker that lags the
 * authority is the normal, documented state (`credit()`/`debit()` — the generic
 * path behind every spot fill and admin adjustment — write `wallet.balance`
 * alone), and "correcting" it upward would invent a custody record out of
 * nothing.
 *
 * THE CEILING is `wallet.balance + wallet.inOrder`: every unit of this currency
 * the platform records the user as owning. `inOrder` is in it because funds
 * locked in open orders are still the customer's claim and still sit at the same
 * deposit address; a ceiling of `balance` alone would order a repair on every
 * wallet with an open order. A wallet is touched only where its trackers, summed
 * across chains, EXCEED that ceiling — the wallet-level total is the right unit
 * because a currency balance is a single claim settleable on any chain the
 * wallet holds an address on (the dashboard says so at :108-112), so no per-chain
 * split of the authority exists to compare against.
 *
 * THE TWO TRACKER FAMILIES ARE RECONCILED INDEPENDENTLY. They are two separate
 * records of the same thing and the ratchet moved both, but a wallet can have
 * one drifted and the other clean (the lazy-create branch of `ecoDebit` seeds a
 * `wallet_data` row that the address JSON never had), and forcing them to agree
 * is not this script's job.
 *
 * AND IT REFUSES TO WRITE WITHOUT EVIDENCE. An excess over the ceiling is not by
 * itself proof of the ratchet: `debit()` lowers `wallet.balance` without
 * touching the trackers, so an ECO spot sell leaves the same shape behind. So a
 * wallet is only WRITTEN where its own ledger contains a clamped ECO debit — a
 * transaction whose metadata says `newChainBalance === 0` while
 * `previousChainBalance < amount`, which is the exact fingerprint of the clamp
 * that the refund then over-restored. Wallets with an excess and no such row are
 * REPORTED for a human to adjudicate and left exactly as found, the same rule
 * `p2p-escrow-reconcile.ts` applies to a surplus it cannot attribute.
 *
 * Idempotent: it recomputes from current state, so a second run is a no-op.
 * DRY-RUN by default. After --apply, restart the backend so cached wallet rows
 * are refreshed.
 */

import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { num } from "@b/utils/decimal";
import { walletDataService } from "@b/services/wallet/WalletDataService";
import { roundToPrecision } from "@b/services/wallet/utils/precision";

const APPLY = process.argv.includes("--apply");
const userArgIdx = process.argv.indexOf("--user");
const ONLY_USER = userArgIdx !== -1 ? process.argv[userArgIdx + 1] : null;
/** Ignore residue at or below display precision — sub-dust is meaningless. */
const TOLERANCE = 0.00000001; // 1e-8

type Tracker = { chain: string; before: number; after: number };

/**
 * `wallet.address` is a DataTypes.JSON column, and MySQL hands it back parsed
 * while some drivers/dumps hand back the raw string. Take both, refuse anything
 * else — a wallet whose address column is unreadable is reported, not guessed at.
 */
function parseAddresses(raw: any): Record<string, any> | null {
  if (!raw) return null;
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

/**
 * Lower the largest trackers until their total fits under `ceiling`.
 *
 * Largest-first, because the ratchet raises a tracker to the largest amount ever
 * attempted on that chain — the biggest figure is the one the authority is least
 * able to justify. Entries are returned for every chain, with `after === before`
 * for the ones left alone, so the report can print the whole wallet.
 */
function reduceToCeiling(
  entries: Array<{ chain: string; balance: number }>,
  ceiling: number,
  currency: string
): { trackers: Tracker[]; removed: number } {
  const total = entries.reduce((sum, e) => sum + e.balance, 0);
  const trackers: Tracker[] = entries.map((e) => ({
    chain: e.chain,
    before: e.balance,
    after: e.balance,
  }));

  let excess = roundToPrecision(total - ceiling, currency);
  if (excess <= TOLERANCE) return { trackers, removed: 0 };

  let removed = 0;
  for (const t of [...trackers].sort((a, b) => b.before - a.before)) {
    if (excess <= TOLERANCE) break;
    if (t.before <= 0) continue;
    const take = Math.min(t.before, excess);
    // Math.max(0, ...) rather than trusting the subtraction: rounding at the
    // currency's precision can land a hair below zero, and a NEGATIVE tracker
    // row is a worse defect than the one being repaired — the dashboard sums
    // these, so one negative row silently cancels another wallet's holdings.
    t.after = Math.max(0, roundToPrecision(t.before - take, currency));
    removed = roundToPrecision(removed + (t.before - t.after), currency);
    excess = roundToPrecision(excess - take, currency);
  }

  return { trackers, removed };
}

/** The chains whose figure actually moved, in reporting order. */
function changed(trackers: Tracker[]): Tracker[] {
  return trackers.filter((t) => t.before - t.after > TOLERANCE);
}

/**
 * How many clamped ECO debits this wallet's ledger records.
 *
 * `newChainBalance === 0` while `previousChainBalance < amount` can only be
 * written by the clamp in `ecoDebit`: on a refund the tracker moves UP, so its
 * `newChainBalance` is only zero when nothing moved at all.
 *
 * DELIBERATELY NOT `metadata.chainShortfall`, the key the fixed `ecoDebit` now
 * writes. Every row this script exists to repair predates that key — a post-fix
 * debit no longer over-restores — so keying on it would find nothing on exactly
 * the install that needs the repair. `ecoRefund` derives the shortfall from the
 * same `previousChainBalance`/`newChainBalance` pair for those older rows.
 *
 * The sum is a LOWER bound on what the asymmetry invented — rows written before
 * the metadata carried either pair cannot be counted — so it is used as evidence
 * that the defect touched this wallet, never as the size of the repair.
 */
function clampEvidence(rows: any[]): { count: number; clamped: number } {
  let count = 0;
  let clamped = 0;
  for (const row of rows) {
    let metadata: any;
    try {
      metadata =
        typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
    } catch {
      continue; // Unparseable metadata is not evidence in either direction.
    }
    if (!metadata) continue;
    const previous = Number(metadata.previousChainBalance);
    const next = Number(metadata.newChainBalance);
    const amount = num(row.amount);
    if (!Number.isFinite(previous) || !Number.isFinite(next)) continue;
    if (next !== 0 || amount <= 0 || previous >= amount) continue;
    count++;
    clamped += amount - previous;
  }
  return { count, clamped };
}

function fmt(value: number): string {
  return value.toFixed(8);
}

async function main() {
  console.log("=".repeat(72));
  console.log(
    `ECO chain-tracker reconciliation  (${APPLY ? "APPLY" : "DRY-RUN"})   ${new Date().toISOString()}`
  );
  if (ONLY_USER) console.log(`Scoped to user: ${ONLY_USER}`);
  console.log("=".repeat(72) + "\n");

  const where: Record<string, any> = { type: "ECO" };
  if (ONLY_USER) where.userId = ONLY_USER;

  // paranoid: false — a soft-deleted wallet's walletData rows are still summed
  // by the custody dashboard, so its drift is still on the page.
  const wallets = await models.wallet.findAll({ where, paranoid: false });
  if (!wallets.length) {
    console.log("No ECO wallets in scope. Nothing to reconcile.\n");
    return;
  }

  const walletIds = wallets.map((w: any) => w.id);
  const [dataRows, ledgerRows] = await Promise.all([
    models.walletData.findAll({ where: { walletId: { [Op.in]: walletIds } } }),
    models.transaction.findAll({
      where: { walletId: { [Op.in]: walletIds } },
      attributes: ["walletId", "amount", "metadata"],
      paranoid: false,
    }),
  ]);

  const dataByWallet = new Map<string, any[]>();
  for (const row of dataRows as any[]) {
    if (!dataByWallet.has(row.walletId)) dataByWallet.set(row.walletId, []);
    dataByWallet.get(row.walletId)!.push(row);
  }
  const ledgerByWallet = new Map<string, any[]>();
  for (const row of ledgerRows as any[]) {
    if (!ledgerByWallet.has(row.walletId)) ledgerByWallet.set(row.walletId, []);
    ledgerByWallet.get(row.walletId)!.push(row);
  }

  let inflated = 0;
  let repaired = 0;
  const unattributed: string[] = [];
  const unreadable: string[] = [];
  // The two families are counted SEPARATELY. They are two records of the same
  // money, so adding them would report twice the drift that exists — and only
  // the wallet_data column is what the custody dashboard sums. Excess this
  // script refuses to attribute is counted apart from both, so the headline
  // figure is never larger than what --apply would actually remove.
  const addressDriftByCurrency: Record<string, number> = {};
  const dataDriftByCurrency: Record<string, number> = {};
  const unattributedByCurrency: Record<string, number> = {};

  for (const wallet of wallets as any[]) {
    const currency = wallet.currency;
    const ceiling = roundToPrecision(num(wallet.balance) + num(wallet.inOrder), currency);

    const addresses = parseAddresses(wallet.address);
    if (wallet.address && !addresses) {
      unreadable.push(`${wallet.id}  ${currency}: wallet.address is not readable JSON`);
    }

    const addressEntries = Object.entries(addresses ?? {}).map(([chain, entry]: [string, any]) => ({
      chain,
      balance: num(entry?.balance),
    }));
    const dataEntries = (dataByWallet.get(wallet.id) ?? []).map((row: any) => ({
      chain: row.chain,
      balance: num(row.balance),
    }));

    const addressFix = reduceToCeiling(addressEntries, ceiling, currency);
    const dataFix = reduceToCeiling(dataEntries, ceiling, currency);
    const drift = Math.max(addressFix.removed, dataFix.removed);
    if (drift <= TOLERANCE) continue;

    inflated++;
    const evidence = clampEvidence(ledgerByWallet.get(wallet.id) ?? []);

    console.log(`[INFLATED] wallet ${wallet.id}  user ${wallet.userId}  ${currency}`);
    console.log(
      `           authority: balance=${fmt(num(wallet.balance))} inOrder=${fmt(num(wallet.inOrder))} ceiling=${fmt(ceiling)}`
    );
    for (const t of changed(addressFix.trackers)) {
      console.log(`           address.${t.chain}.balance   ${fmt(t.before)} -> ${fmt(t.after)}`);
    }
    for (const t of changed(dataFix.trackers)) {
      console.log(`           wallet_data[${t.chain}].balance ${fmt(t.before)} -> ${fmt(t.after)}`);
    }
    console.log(
      `           clamped ECO debits in this wallet's ledger: ${evidence.count}` +
        (evidence.count ? ` (>= ${fmt(evidence.clamped)} ${currency} clamped away)` : "")
    );

    if (evidence.count === 0) {
      // No clamped debit ever ran on this wallet, so the excess was not made by
      // the refund asymmetry. `debit()` writes wallet.balance alone, so an ECO
      // spot sell leaves the same shape; releasing it here would destroy a
      // custody record that is probably true.
      console.log(
        `           [SKIPPED] no clamped debit on this wallet — the excess is not ` +
          `attributable to the refund asymmetry. Left untouched.`
      );
      unattributed.push(
        `  wallet ${wallet.id} user ${wallet.userId} ${currency}: excess ${fmt(drift)}`
      );
      unattributedByCurrency[currency] = (unattributedByCurrency[currency] || 0) + drift;
      console.log("");
      continue;
    }

    addressDriftByCurrency[currency] =
      (addressDriftByCurrency[currency] || 0) + addressFix.removed;
    dataDriftByCurrency[currency] = (dataDriftByCurrency[currency] || 0) + dataFix.removed;

    if (APPLY) {
      await sequelize.transaction(async (t) => {
        const addressChanges = changed(addressFix.trackers);
        if (addressChanges.length && addresses) {
          for (const change of addressChanges) {
            addresses[change.chain].balance = change.after;
          }
          // The JSON is written whole, exactly as ecoDebit writes it, so every
          // other chain's deposit address and network survive untouched.
          await models.wallet.update(
            { address: addresses as any },
            { where: { id: wallet.id }, transaction: t }
          );
        }
        for (const change of changed(dataFix.trackers)) {
          // `syncBalance` is the one routine that writes a caller-supplied
          // figure straight over the tracker instead of applying a delta, which
          // is precisely what a repair needs: every other writer preserves the
          // drift it is handed.
          await walletDataService.syncBalance(wallet.id, change.chain as any, change.after, t);
        }
      });
      repaired++;
      console.log(
        `           [REPAIRED] removed ${fmt(dataFix.removed)} ${currency} from wallet_data, ` +
          `${fmt(addressFix.removed)} from the address JSON`
      );
    } else {
      console.log(
        `           [WOULD REPAIR] remove ${fmt(dataFix.removed)} ${currency} from wallet_data, ` +
          `${fmt(addressFix.removed)} from the address JSON`
      );
    }
    console.log("");
  }

  console.log("=".repeat(72));
  console.log(`ECO wallets scanned:            ${wallets.length}`);
  console.log(`wallets over their ceiling:     ${inflated}`);
  for (const currency of new Set([
    ...Object.keys(addressDriftByCurrency),
    ...Object.keys(dataDriftByCurrency),
  ])) {
    console.log(
      `  ${currency}: ${fmt(dataDriftByCurrency[currency] || 0)} of wallet_data drift ` +
        `(the custody dashboard's figure), ${fmt(addressDriftByCurrency[currency] || 0)} in the address JSON`
    );
  }
  if (APPLY) {
    console.log(`wallets repaired:               ${repaired}`);
    if (repaired > 0) {
      console.log(
        "\nRestart the backend so cached wallet rows are refreshed, then reload the " +
          "ecosystem custody dashboard — its `onChain` figure is the number this repaired."
      );
    }
  } else {
    console.log("\nDRY-RUN — nothing written. Re-run with --apply to repair.");
  }

  if (unattributed.length) {
    console.log("");
    console.log(
      `${unattributed.length} wallet(s) exceed their ceiling with NO clamped debit in the ledger.`
    );
    console.log(
      "These are NOT touched, by --apply either: `debit()` lowers wallet.balance without\n" +
        "touching the trackers, so an ECO spot sell or an admin adjustment produces the same\n" +
        "shape, and the record is probably true. Adjudicate each by hand against that wallet's\n" +
        "transactions before deciding anything."
    );
    for (const [currency, total] of Object.entries(unattributedByCurrency)) {
      console.log(`  ${currency}: ${fmt(total)} of excess left standing`);
    }
    for (const line of unattributed) console.log(line);
  }

  if (unreadable.length) {
    console.log("");
    console.log(`${unreadable.length} wallet(s) have an unreadable address column:`);
    for (const line of unreadable) console.log(line);
    console.log("Their wallet_data rows were still reconciled; the address JSON was not.");
  }
  console.log("=".repeat(72));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("reconcile-eco-chain-trackers failed:", e);
    process.exit(1);
  });
