/**
 * Seed the payment-rail catalogue and attach every existing payment method to a
 * rail — merging on the normalised name.
 *
 * WHAT IT IS FOR
 * --------------
 * `p2p_payment_methods` was one row per trader per way-of-paying, carrying both
 * the identity ("PayPal") and that trader's credentials. The marketplace filter
 * groups the methods on live offers, so a thousand traders accepting PayPal
 * produced a thousand filter entries all reading "PayPal".
 *
 * Rails split those apart. This script does the one-time part:
 *
 *   1. Every DISTINCT normalised name across all existing methods becomes one
 *      rail. "PayPal", "Paypal" and "pay pal" are one rail, not three — that
 *      merge IS the fix, and it is why the key is the slug and not the name.
 *   2. A rail whose slug matches the shipped catalogue takes the catalogue's
 *      field shape. Everything else has its shape INFERRED from the metadata
 *      keys the accounts on it actually use.
 *   3. Every method row gets `railId`.
 *
 * IT IS A DRY RUN BY DEFAULT. Nothing is written without `--apply`. The plan it
 * prints is the thing to read: it names every merge, and a merge is the one
 * decision here that is hard to reverse by hand.
 *
 * Nothing about offers or trades is touched. The offer join and the trade
 * payment snapshot still point at the method row, exactly as before — see the
 * note at the top of `models/ext/p2p/p2pPaymentRail.ts` for why.
 *
 * RUN:
 *   node backend/scripts/repair-p2p-payment-rails.mjs            # plan only
 *   node backend/scripts/repair-p2p-payment-rails.mjs --apply    # write it
 */

import { config } from "dotenv";
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

/* The env lives at the REPO ROOT, not beside this script. `dotenv/config` alone
   loads `./.env` relative to the working directory, so running this from
   `backend/` found nothing and the connection came up with no database
   selected — which fails on the first query rather than on connect. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

/* The slug rule, mirrored from `src/api/(ext)/p2p/payment-method/rails.ts`.
   Mirrored rather than imported because this is a plain .mjs script and that
   module is TypeScript under a path alias — but the two MUST agree, or a rail
   this script creates is one the application will not find. */
function railSlug(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function humanizeFieldLabel(key) {
  const spaced = String(key ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return "";
  if (/^[A-Z\d ]+$/.test(spaced)) return spaced;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/* Mirrored from `CATALOGUE_RAILS`. Only the shapes are needed here. */
const CATALOGUE = {
  banktransfer: ["Bank", "Account number", "Account name"],
  sepainstant: ["IBAN", "BIC", "Account name"],
  sepa: ["IBAN", "BIC", "Account name"],
  paypal: ["Email"],
  wise: ["Wisetag", "Account name"],
  revolut: ["Revtag"],
  zelle: ["Email or phone", "Account name"],
  cashapp: ["Cashtag"],
  upi: ["UPI ID", "Account name"],
  impsneft: ["Bank", "Account number", "IFSC", "Account name"],
  pix: ["Pix key", "Account name"],
  mpesa: ["Phone number", "Registered name"],
  mercadopago: ["CVU or alias", "Account name"],
  gcash: ["Phone number", "Registered name"],
  papara: ["Papara number"],
  cashinperson: ["Meeting area", "Contact"],
};

/**
 * The metadata key that carries the preferred-method marker.
 *
 * It rides on `icon` (see `components/kit/preferred-method.ts`) precisely
 * because every surface strips it, so it is NOT a payment detail and must never
 * become a field in an inferred shape.
 */
const PREFERRED_MARKER_KEY = "icon";

function parseMetadata(raw) {
  if (!raw) return {};
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
  });

  try {
    const [methods] = await conn.execute(
      `SELECT id, userId, name, icon, description, processingTime, fees, metadata, isGlobal, railId
         FROM p2p_payment_methods
        WHERE deletedAt IS NULL
        ORDER BY isGlobal DESC, createdAt ASC`
    );

    const [existingRails] = await conn.execute(
      `SELECT id, slug, name FROM p2p_payment_rails WHERE deletedAt IS NULL`
    );
    const railBySlug = new Map(existingRails.map((r) => [r.slug, r]));

    /* ---- group ---- */
    const groups = new Map();
    let skipped = 0;
    for (const method of methods) {
      const slug = railSlug(method.name);
      if (!slug) {
        // A name of nothing but punctuation cannot be deduplicated against
        // anything and cannot be searched for. Left unattached and reported.
        skipped += 1;
        continue;
      }
      if (!groups.has(slug)) groups.set(slug, []);
      groups.get(slug).push(method);
    }

    /* ---- decide ---- */
    const plan = [];
    for (const [slug, rows] of groups) {
      /*
        THE DISPLAY NAME COMES FROM THE PLATFORM'S OWN ROW WHERE THERE IS ONE.

        A group is many spellings of one thing, and one of them has to win. A
        global (admin-created) row is the operator's own spelling and beats
        anything a trader typed; otherwise the most common exact spelling wins,
        with the earliest row breaking a tie so the result is deterministic.
      */
      const globalRow = rows.find((r) => r.isGlobal);
      let displayName;
      if (globalRow) {
        displayName = globalRow.name;
      } else {
        const tally = new Map();
        for (const row of rows) tally.set(row.name, (tally.get(row.name) ?? 0) + 1);
        displayName = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
      }

      /* ---- shape ---- */
      const catalogueFields = CATALOGUE[slug];
      let fields;
      let shapeSource;
      if (catalogueFields) {
        fields = catalogueFields.map((label, index) => ({
          key: label,
          label,
          required: index === 0 || !/name|contact|bic/i.test(label),
        }));
        shapeSource = "catalogue";
      } else {
        /*
          INFERRED, in order of how many accounts use each key.

          A field one trader in fifty invented is not part of the shape; one that
          most of them filled in is. `required` is reserved for a key present on
          EVERY account with details, because marking a field required that some
          existing account lacks would make that trader unable to save their own
          row without inventing a value.
        */
        const withDetails = rows.filter(
          (row) =>
            Object.keys(parseMetadata(row.metadata)).filter(
              (k) => k !== PREFERRED_MARKER_KEY
            ).length > 0
        );
        const keyCounts = new Map();
        for (const row of withDetails) {
          for (const key of Object.keys(parseMetadata(row.metadata))) {
            if (key === PREFERRED_MARKER_KEY) continue;
            const label = humanizeFieldLabel(key);
            if (!label) continue;
            keyCounts.set(label, (keyCounts.get(label) ?? 0) + 1);
          }
        }
        fields = [...keyCounts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 12)
          .map(([label, count]) => ({
            key: label,
            label,
            required: withDetails.length > 0 && count === withDetails.length,
          }));
        shapeSource = fields.length > 0 ? `inferred from ${withDetails.length} account(s)` : "free-form";
      }

      const existing = railBySlug.get(slug);
      plan.push({
        slug,
        displayName,
        existingRailId: existing?.id ?? null,
        rows,
        fields,
        shapeSource,
        // A rail that any offer's method already points at is a rail the public
        // filter should show. Trader-created ones added AFTER this repair start
        // unlisted and are promoted by use; these are the platform's existing
        // set, and hiding them would empty the filter on upgrade.
        listed: true,
        icon: globalRow?.icon || rows.find((r) => r.icon)?.icon || null,
        description: globalRow?.description || null,
        processingTime: globalRow?.processingTime || rows.find((r) => r.processingTime)?.processingTime || null,
        fees: globalRow?.fees || null,
      });
    }

    /* ---- report ---- */
    const merges = plan.filter((entry) => {
      const spellings = new Set(entry.rows.map((r) => r.name));
      return spellings.size > 1;
    });

    console.log(`\n  ${methods.length} payment method row(s) → ${plan.length} rail(s)`);
    if (skipped) console.log(`  ${skipped} row(s) have a name that reduces to nothing and are left unattached`);
    console.log("");

    for (const entry of plan) {
      const spellings = [...new Set(entry.rows.map((r) => r.name))];
      const merged = spellings.length > 1;
      const verb = entry.existingRailId ? "update" : "create";
      console.log(
        `  ${merged ? "MERGE " : "      "}${verb.padEnd(6)} ${entry.displayName}` +
          `  [${entry.rows.length} account(s), shape: ${entry.shapeSource}]`
      );
      if (merged) {
        console.log(`           spellings merged: ${spellings.map((s) => JSON.stringify(s)).join(", ")}`);
      }
      if (entry.fields.length) {
        console.log(
          `           fields: ${entry.fields.map((f) => f.label + (f.required ? "*" : "")).join(", ")}`
        );
      }
    }

    if (merges.length) {
      console.log(
        `\n  ${merges.length} rail(s) merge more than one spelling. Read those lines before applying —` +
          `\n  a merge is the one decision here that is awkward to undo by hand.`
      );
    }

    if (!APPLY) {
      console.log("\n  DRY RUN. Nothing was written. Re-run with --apply to commit this plan.\n");
      return;
    }

    /* ---- apply ---- */
    console.log("\n  applying…");
    await conn.beginTransaction();
    try {
      let createdRails = 0;
      let updatedRails = 0;
      let attached = 0;

      for (const entry of plan) {
        let railId = entry.existingRailId;
        if (railId) {
          await conn.execute(
            `UPDATE p2p_payment_rails
                SET name = ?, icon = ?, description = ?, fields = ?, processingTime = ?, fees = ?,
                    listed = ?, available = 1, updatedAt = NOW()
              WHERE id = ?`,
            [
              entry.displayName,
              entry.icon,
              entry.description,
              JSON.stringify(entry.fields),
              entry.processingTime,
              entry.fees,
              entry.listed ? 1 : 0,
              railId,
            ]
          );
          updatedRails += 1;
        } else {
          railId = randomUUID();
          await conn.execute(
            `INSERT INTO p2p_payment_rails
               (id, name, slug, icon, description, fields, isCustom, createdByUserId,
                listed, available, popularityRank, processingTime, fees, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, 1, 0, ?, ?, NOW(), NOW())`,
            [
              railId,
              entry.displayName,
              entry.slug,
              entry.icon,
              entry.description,
              JSON.stringify(entry.fields),
              entry.listed ? 1 : 0,
              entry.processingTime,
              entry.fees,
            ]
          );
          createdRails += 1;
        }

        /*
          `name` is rewritten to the rail's spelling as well as `railId` being
          set. That is deliberate: the offer chips, the admin list and the trade
          snapshot all read `name` off this row, so leaving the old spelling
          would show "Pay Pal" on an offer whose filter entry says "PayPal".
          Trades already opened are untouched — their details were copied at
          initiation and are a record of what was true then.
        */
        const ids = entry.rows.map((row) => row.id);
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          await conn.execute(
            `UPDATE p2p_payment_methods
                SET railId = ?, name = ?, updatedAt = NOW()
              WHERE id IN (${chunk.map(() => "?").join(",")})`,
            [railId, entry.displayName, ...chunk]
          );
          attached += chunk.length;
        }
      }

      await conn.commit();
      console.log(
        `\n  done — ${createdRails} rail(s) created, ${updatedRails} updated, ${attached} account(s) attached.\n`
      );
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
