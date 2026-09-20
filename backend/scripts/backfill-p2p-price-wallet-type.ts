/**
 * Backfill `p2p_offers.priceWalletType` on fiat-asset offers published before
 * the escrow-leg rule existed.
 *
 *   cd backend
 *   npx tsx -r dotenv/config -r ./module-alias-setup.ts scripts/backfill-p2p-price-wallet-type.ts dotenv_config_path=../.env
 *   # ...same line with `--apply` appended to write it
 *
 * WHAT IT REPAIRS, AND WHY THOSE ROWS ARE BROKEN
 * ---------------------------------------------
 * An offer has two legs: the ASSET (`currency` + `walletType`) and the PRICE
 * (`priceCurrency` + `priceWalletType`). The platform escrows THE CRYPTO LEG,
 * never fiat — see `src/api/(ext)/p2p/utils/escrow-leg.ts` for the branch
 * table. So an offer whose asset leg is fiat (selling EUR for USDT) escrows its
 * PRICE leg, held from whoever owes the crypto at trade initiation.
 *
 * `priceWalletType` is the column that makes that possible. `priceCurrency`
 * alone is a bare label — enough to render "1.10 USDT", not enough to locate
 * the balance to hold. The publish and edit doors have written it since the
 * rule landed (`offer/index.post.ts`, `offer/[id]/index.put.ts`), but every
 * fiat-asset offer PUBLISHED BEFORE THEM still carries NULL, and a NULL price
 * wallet type on a fiat asset leg means `resolveEscrowLeg` finds crypto on
 * neither leg and returns `leg: null` — the offer is refusable and nothing
 * else. This backfill is what turns those ads back into tradeable inverted ads
 * instead of dead listings.
 *
 * IT DERIVES NOTHING ITSELF. The wallet type comes from
 * `resolvePriceCurrencyWalletType`, imported, not reimplemented. That
 * function's own header says it is the ONE place the platform derives a price
 * code's wallet type, and that deriving it a second time elsewhere is how a
 * stored value and a rendered one drift apart; a SQL mirror of its
 * FIAT > SPOT > ECO precedence, its `status: true` gates and its unconditional
 * USD answer is exactly that second derivation. The offer becoming genuinely
 * inverted is then CONFIRMED by `resolveEscrowLeg`, the same pure function the
 * doors and the settle paths read, rather than assumed from the wallet type.
 *
 * WHAT IT WILL NOT DO
 * -------------------
 * It writes ONE column on the offer and touches no wallet, trade or escrow row.
 * In particular it cannot change how an EXISTING trade settles:
 * `resolveTradeEscrowTriple` resolves a trade from the trade's own
 * `escrowCurrency` / `escrowWalletType` / `escrowOwnerId`, falling back to
 * `sellerId` + `offer.walletType` + `trade.currency`. `priceWalletType` is not
 * an input to it. Only trades opened AFTER the backfill take the inverted path.
 *
 * It never guesses. Three populations are REPORTED and left alone:
 *
 *   BOTH LEGS CASH   the price code resolves to FIAT as well. There is no
 *                    crypto anywhere on the offer, so nothing is escrowable and
 *                    no column value can fix it. A human pauses or deletes
 *                    these, or asks the maker to re-price in a crypto.
 *   UNPRICEABLE      the resolver answers null: the code is in none of the three
 *                    tables with `status: true` — disabled, renamed, or from an
 *                    uninstalled extension. NOT the same decision as both-legs-
 *                    cash (re-enabling the currency may fix it outright), so it
 *                    gets a bucket of its own rather than being lumped in with
 *                    fiat.
 *   NO PRICE CODE    `priceCurrency` is NULL or blank. Nothing to resolve.
 *
 * DRY RUN BY DEFAULT. Nothing is written without `--apply`. Take a backup
 * first; there is no undo.
 */

import { models, sequelize } from "@b/db";
import { QueryTypes } from "sequelize";
import {
  resolvePriceCurrencyWalletType,
  type PriceCurrencyWalletType,
} from "@b/api/(ext)/p2p/utils/price-currency";
import { resolveEscrowLeg } from "@b/api/(ext)/p2p/utils/escrow-leg";

const APPLY = process.argv.includes("--apply");

type OfferRow = {
  id: string;
  type: string;
  currency: string;
  walletType: string;
  priceCurrency: string | null;
  status: string;
};

type Bucket = "WRITE" | "BOTH_LEGS_CASH" | "UNPRICEABLE" | "NO_PRICE_CODE" | "NOT_INVERTED";

type Decision = {
  row: OfferRow;
  bucket: Bucket;
  resolved: PriceCurrencyWalletType | null;
  note: string;
};

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

/** `n` per status, as "ACTIVE 4, PAUSED 1", so a reader sees what is live. */
function byStatus(rows: OfferRow[]): string {
  const tally = new Map<string, number>();
  for (const row of rows) tally.set(row.status, (tally.get(row.status) ?? 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([status, count]) => `${status} ${count}`)
    .join(", ");
}

async function main() {
  /*
    The exact population: a fiat asset leg with no price wallet type. Raw SQL
    rather than `findAll` so `deletedAt IS NULL` is stated in the query — the
    model is `paranoid: true` and would apply it silently, and a backfill's
    scope should be readable in the backfill.
  */
  const rows = await sequelize.query<OfferRow>(
    `SELECT id, type, currency, walletType, priceCurrency, status
       FROM p2p_offers
      WHERE priceWalletType IS NULL
        AND walletType = 'FIAT'
        AND deletedAt IS NULL
      ORDER BY status, createdAt`,
    { type: QueryTypes.SELECT }
  );

  console.log(
    `\n  ${rows.length} fiat-asset offer(s) with priceWalletType IS NULL` +
      (rows.length ? ` — ${byStatus(rows)}` : "")
  );
  if (rows.length === 0) {
    console.log("\n  Nothing to repair.\n");
    return;
  }

  /*
    Resolve each DISTINCT price code once. The resolver reads up to three tables
    per call, and a marketplace has far more offers than currencies. Caching the
    answer also guarantees every offer sharing a code is bucketed identically,
    which a per-row call cannot promise if an operator toggles a currency
    mid-run.
  */
  const resolvedByCode = new Map<string, PriceCurrencyWalletType | null>();
  for (const row of rows) {
    const code = String(row.priceCurrency ?? "").trim();
    if (!code || resolvedByCode.has(code)) continue;
    resolvedByCode.set(code, await resolvePriceCurrencyWalletType(code));
  }

  const decisions: Decision[] = rows.map((row): Decision => {
    const code = String(row.priceCurrency ?? "").trim();
    if (!code) {
      return {
        row,
        bucket: "NO_PRICE_CODE",
        resolved: null,
        note: "priceCurrency is NULL or blank",
      };
    }
    const resolved = resolvedByCode.get(code) ?? null;
    if (resolved === null) {
      return {
        row,
        bucket: "UNPRICEABLE",
        resolved: null,
        note: `${code} is in no enabled currency table`,
      };
    }

    /*
      THE DECISION IS THE ESCROW MODULE'S, NOT THIS SCRIPT'S. Ask
      `resolveEscrowLeg` what the offer would become with the resolved value
      written, and only write when it actually comes back as an inverted PRICE
      leg. That is what makes the ad tradeable; a wallet type that produced
      anything else would be a column value with no behaviour behind it.
    */
    const leg = resolveEscrowLeg({
      offerType: row.type,
      currency: row.currency,
      walletType: row.walletType,
      priceCurrency: code,
      priceWalletType: resolved,
    });

    if (leg.leg === null) {
      // Reached when the price code is FIAT too: cash on both legs. The
      // module's own sentence is carried through, because it is written to be
      // shown to a maker and is the clearest statement of why a backfill
      // cannot fix this row.
      return { row, bucket: "BOTH_LEGS_CASH", resolved, note: leg.reason };
    }
    if (leg.leg !== "PRICE" || !leg.inverted) {
      // Not expected on a FIAT asset leg. Reported rather than written: an
      // unexpected branch is a reason to stop, not to guess.
      return {
        row,
        bucket: "NOT_INVERTED",
        resolved,
        note: `resolveEscrowLeg returned leg=${leg.leg} inverted=${leg.inverted}`,
      };
    }
    return {
      row,
      bucket: "WRITE",
      resolved,
      note: `escrows ${leg.currency} (${leg.walletType}) from the ${leg.escrowedBy} at ${leg.heldAt}`,
    };
  });

  /* ---- summary table ---- */
  const groups = new Map<Bucket, Decision[]>();
  for (const decision of decisions) {
    if (!groups.has(decision.bucket)) groups.set(decision.bucket, []);
    groups.get(decision.bucket)!.push(decision);
  }
  const LABEL: Record<Bucket, string> = {
    WRITE: "becomes an inverted ad",
    BOTH_LEGS_CASH: "both legs cash — NOT ESCROWABLE",
    UNPRICEABLE: "price code not enabled anywhere",
    NO_PRICE_CODE: "no priceCurrency at all",
    NOT_INVERTED: "unexpected escrow leg — INVESTIGATE",
  };
  const ORDER: Bucket[] = [
    "WRITE",
    "BOTH_LEGS_CASH",
    "UNPRICEABLE",
    "NO_PRICE_CODE",
    "NOT_INVERTED",
  ];

  console.log(`\n  ${pad("bucket", 16)}${pad("offers", 8)}outcome`);
  console.log(`  ${"-".repeat(70)}`);
  for (const bucket of ORDER) {
    const group = groups.get(bucket);
    if (!group?.length) continue;
    console.log(`  ${pad(bucket, 16)}${pad(String(group.length), 8)}${LABEL[bucket]}`);
  }
  console.log("");

  /* ---- what would be written ---- */
  const writes = groups.get("WRITE") ?? [];
  if (writes.length) {
    const perCode = new Map<string, Decision[]>();
    for (const decision of writes) {
      const key = `${String(decision.row.priceCurrency).trim()} -> ${decision.resolved}`;
      if (!perCode.has(key)) perCode.set(key, []);
      perCode.get(key)!.push(decision);
    }
    console.log("  WRITE — priceWalletType set, ad becomes tradeable:");
    for (const [key, group] of [...perCode.entries()].sort()) {
      console.log(
        `    ${pad(key, 20)} ${group.length} offer(s)  [${byStatus(group.map((d) => d.row))}]`
      );
      console.log(`      ${group[0].note}`);
    }
    console.log("");
  }

  /* ---- what a human has to decide, listed by id ---- */
  const forHumans: Bucket[] = [
    "BOTH_LEGS_CASH",
    "UNPRICEABLE",
    "NO_PRICE_CODE",
    "NOT_INVERTED",
  ];
  for (const bucket of forHumans) {
    const group = groups.get(bucket);
    if (!group?.length) continue;
    console.log(
      `  ${bucket} — LEFT ALONE, ${group.length} offer(s) for a human to pause or delete:`
    );
    for (const decision of group) {
      const row = decision.row;
      console.log(
        `    ${row.id}  ${pad(row.status, 17)}${row.type} ${row.currency}/${row.walletType}` +
          ` priced in ${row.priceCurrency ?? "(none)"}`
      );
      console.log(`      ${decision.note}`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log(
      `  DRY RUN. Nothing was written.` +
        (writes.length
          ? ` Re-run with --apply to set priceWalletType on ${writes.length} offer(s).`
          : ` There is nothing this script can repair.`) +
        `\n`
    );
    return;
  }
  if (!writes.length) {
    console.log("  --apply given, but no offer resolves to a crypto price leg. Nothing written.\n");
    return;
  }

  /* ---- apply ---- */
  console.log("  applying…");
  const transaction = await sequelize.transaction();
  try {
    let updated = 0;
    /*
      Grouped by resolved wallet type, and the WHERE still carries
      `priceWalletType IS NULL`: the write stays a no-op against a row that
      another run, or a maker's own edit, has already filled in. That is what
      makes this safe to re-run.
    */
    const byType = new Map<PriceCurrencyWalletType, string[]>();
    for (const decision of writes) {
      const walletType = decision.resolved!;
      if (!byType.has(walletType)) byType.set(walletType, []);
      byType.get(walletType)!.push(decision.row.id);
    }
    for (const [walletType, ids] of byType) {
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const [affected] = await models.p2pOffer.update(
          { priceWalletType: walletType },
          { where: { id: chunk, priceWalletType: null }, transaction }
        );
        updated += typeof affected === "number" ? affected : chunk.length;
      }
    }
    await transaction.commit();
    console.log(`\n  done — priceWalletType written on ${updated} offer(s).\n`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("backfill failed:", error);
    process.exit(1);
  });
