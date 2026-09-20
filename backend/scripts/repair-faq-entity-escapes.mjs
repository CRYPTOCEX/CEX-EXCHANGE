/**
 * Repair HTML-entity-escaped FAQ text left behind by the pre-6.0.9 validator
 *
 * WHAT WENT WRONG. Until 6.0.9 the FAQ addon ran every plain-text field through
 * `validator.escape()` on the way INTO the database. Escaping belongs at output,
 * and every render site already escapes, so what got stored was the entity soup
 * itself:
 *
 *   "What's the fee for a BTC/USDT withdrawal?"
 *     -> "What&#x27;s the fee for a BTC&#x2F;USDT withdrawal?"
 *
 * validator.escape replaces `&` FIRST (see
 * node_modules/validator/lib/escape.js), so re-saving an already-escaped value
 * escaped the ampersands of the previous pass too, and the damage COMPOUNDED:
 *
 *   &#x27;   ->   &amp;#x27;   ->   &amp;amp;#x27;   -> ...
 *
 * The code path is fixed (src/api/(ext)/faq/utils/faq-validation.ts now only
 * strips tags and control characters, and the image column has its own
 * sanitizeUrl), so only rows written before the fix are affected. Nothing
 * repairs them, and nothing will: the fields are only rewritten when an admin
 * edits that exact FAQ.
 *
 * WHY THIS IS A REPORT AND NOT A BLIND MIGRATION. A single-level escape is
 * genuinely ambiguous. `R&amp;D` is what the bug produces from `R&D`, but it is
 * ALSO what an author legitimately typing `R&amp;D` would have left. Rewriting
 * every entity in the table would silently destroy the second case. So this
 * script classifies instead of assuming:
 *
 *   COMPOUND    depth >= 2 (e.g. `&amp;#x27;`). Nothing but repeated machine
 *               escaping produces a nested entity. Repaired automatically.
 *   UNAMBIGUOUS depth == 1 and the value contains at least one of
 *               `&#x27;` `&#x2F;` `&#x5C;` `&#96;`. Those four forms are not
 *               produced by any input path in this addon — all of the affected
 *               fields are plain <Input>/TagInput controls, never a WYSIWYG —
 *               so their presence proves the value went through escape().
 *               Once that is established, any `&amp;` in the SAME value came
 *               from a literal `&` and decodes correctly too. Repaired
 *               automatically.
 *   AMBIGUOUS   depth == 1 with only `&amp;` `&lt;` `&gt;` `&quot;` present.
 *               Could be the bug, could be what the author typed. NEVER
 *               repaired without a human saying so, one row at a time
 *               (--interactive).
 *
 * PER-COLUMN OVERRIDES. Three columns cannot legitimately contain any of these
 * characters at all, so every entity in them is machine-produced and is
 * repaired at any depth without prompting:
 *
 *   faqs.category  validateCategory enforces /^[a-zA-Z0-9\s\-_]+$/ — `&`, `'`,
 *                  `/`, `<`, `>` and `"` could never be saved through it.
 *                  (Repairing this also un-breaks re-using such a category: an
 *                  escaped one fails today with "Category contains invalid
 *                  characters".)
 *   faqs.tags[]    validateTags enforces the same regex, per element.
 *   faqs.image     a URL column; sanitizeUrl only accepts `/...` or
 *                  `http(s)://...`, so `&#x2F;uploads&#x2F;faq&#x2F;a.webp` is
 *                  purely damage — and it renders as a broken image today.
 *
 * COLUMNS WALKED (all three tables are paranoid; soft-deleted rows are included
 * on purpose, so restoring a row later does not resurrect the mojibake):
 *   faqs           question, category, image, tags
 *   faq_questions  name, question
 *   faq_feedbacks  comment
 * NOT touched: faqs.answer and faq_questions.answer (always went through
 * sanitizeHTML, never escape) and faq_searches.query (stored raw).
 *
 * Writes are raw UPDATEs, deliberately NOT model.update(): bumping `updatedAt`
 * would reorder the admin analytics and make every legacy FAQ look freshly
 * edited.
 *
 * IDEMPOTENT: after a successful --apply, a re-run must report 0 COMPOUND and
 * 0 UNAMBIGUOUS. The AMBIGUOUS bucket is allowed to stay non-zero forever —
 * those rows are only ever changed by a human answering the prompt.
 *
 *   Report:      npm run repair:faq-escapes
 *   Apply safe:  npm run repair:faq-escapes -- --apply
 *   Review rest: npm run repair:faq-escapes -- --apply --interactive
 *   One table:   npm run repair:faq-escapes -- --table=faq_feedbacks
 *   Machine:     npm run repair:faq-escapes -- --json
 *
 * (or `node scripts/repair-faq-entity-escapes.mjs [flags]` directly.)
 */

import { config } from "dotenv";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes("--apply");
const INTERACTIVE = ARGV.includes("--interactive");
const AS_JSON = ARGV.includes("--json");
const TABLE_FILTER = (ARGV.find((a) => a.startsWith("--table=")) || "").split("=")[1] || null;

/* ------------------------------------------------------------------ */
/* Decoder — the exact inverse of validator.escape                     */
/* ------------------------------------------------------------------ */

/**
 * escape() replaces `&` FIRST and everything else after it. The inverse must
 * therefore run in the OPPOSITE order and put `&amp;` LAST, or decoding
 * `&amp;#x27;` would turn into `&#x27;` and then immediately into `'` inside a
 * single pass — collapsing two levels of damage into one and hiding the
 * compounding from the classifier.
 */
function unescapeOnce(s) {
  return s
    .replace(/&#96;/g, "`")
    .replace(/&#x5C;/g, "\\")
    .replace(/&#x2F;/g, "/")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** How many escape passes this value survived. 0 means it is clean. */
const MAX_DEPTH = 8;
function depthOf(s) {
  let d = 0;
  let cur = s;
  while (d < MAX_DEPTH) {
    const next = unescapeOnce(cur);
    if (next === cur) break;
    cur = next;
    d += 1;
  }
  return d;
}

function fullyDecode(s) {
  let cur = s;
  for (let i = 0; i < MAX_DEPTH; i++) {
    const next = unescapeOnce(cur);
    if (next === cur) break;
    cur = next;
  }
  return cur;
}

/** The four forms no human types into a plain <Input> in this addon. */
const UNAMBIGUOUS_ENTITY = /&#x27;|&#x2F;|&#x5C;|&#96;/;

const BUCKET = { COMPOUND: "COMPOUND", UNAMBIGUOUS: "UNAMBIGUOUS", AMBIGUOUS: "AMBIGUOUS" };

/**
 * Classify one value. `force` marks a column whose content could never have
 * contained an entity legitimately, so any depth at all is damage.
 */
function classify(value, force) {
  const depth = depthOf(value);
  if (depth === 0) return null;
  if (force) return depth >= 2 ? BUCKET.COMPOUND : BUCKET.UNAMBIGUOUS;
  if (depth >= 2) return BUCKET.COMPOUND;
  return UNAMBIGUOUS_ENTITY.test(value) ? BUCKET.UNAMBIGUOUS : BUCKET.AMBIGUOUS;
}

/* ------------------------------------------------------------------ */
/* Tags — same normalisation the model getter does                     */
/* ------------------------------------------------------------------ */

/**
 * Copy of `toStringArray` from models/ext/faq/faq.ts. This script reads the
 * column with a raw query, which bypasses the model getter, and `DataTypes.JSON`
 * is a native JSON column on MySQL (driver returns an array) but LONGTEXT on
 * MariaDB (driver returns the raw string).
 */
function toStringArray(value) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* What to walk                                                        */
/* ------------------------------------------------------------------ */

const TARGETS = [
  {
    table: "faqs",
    label: "FAQ articles",
    columns: [
      { name: "question", kind: "text", force: false },
      {
        name: "category",
        kind: "text",
        force: true,
        reason: "validateCategory only permits [a-zA-Z0-9 _-]",
      },
      {
        name: "image",
        kind: "text",
        force: true,
        reason: "URL column; sanitizeUrl only permits /... or http(s)://...",
      },
      {
        name: "tags",
        kind: "json-array",
        force: true,
        reason: "validateTags only permits [a-zA-Z0-9 _-] per tag",
      },
    ],
  },
  {
    table: "faq_questions",
    label: "user-submitted questions",
    columns: [
      { name: "name", kind: "text", force: false },
      { name: "question", kind: "text", force: false },
    ],
  },
  {
    table: "faq_feedbacks",
    label: "FAQ feedback",
    columns: [{ name: "comment", kind: "text", force: false }],
  },
];

/* ------------------------------------------------------------------ */
/* Database                                                            */
/* ------------------------------------------------------------------ */

const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

async function tableExists(tableName) {
  const rows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const rows = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

/**
 * Only rows that actually hold an entity are read back. The pattern requires
 * the closing semicolon so ordinary prose containing a bare `&` is not pulled
 * into memory just to be classified as clean.
 */
const ENTITY_SQL = "&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);";

/* ------------------------------------------------------------------ */
/* Reporting helpers                                                   */
/* ------------------------------------------------------------------ */

const SAMPLE_LIMIT = 10;
const PREVIEW_CHARS = 120;

function preview(value) {
  const s = String(value ?? "");
  return JSON.stringify(s.length > PREVIEW_CHARS ? `${s.slice(0, PREVIEW_CHARS)}…` : s);
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim().toLowerCase())));
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function collect(target) {
  const candidates = [];

  for (const column of target.columns) {
    if (!(await columnExists(target.table, column.name))) {
      if (!AS_JSON) {
        console.log(`[SKIP] \`${target.table}\`.\`${column.name}\` does not exist on this install.`);
      }
      continue;
    }

    // Soft-deleted rows are INCLUDED on purpose — see the header.
    const rows = await sequelize.query(
      `SELECT id, \`${column.name}\` AS value FROM \`${target.table}\`
         WHERE \`${column.name}\` IS NOT NULL AND \`${column.name}\` REGEXP :entity`,
      { replacements: { entity: ENTITY_SQL }, type: QueryTypes.SELECT }
    );

    for (const row of rows) {
      if (column.kind === "json-array") {
        const before = toStringArray(row.value);
        if (before.length === 0) continue;

        // A tag array is repaired as a unit: the worst bucket any element falls
        // into decides the whole column, because the column is written whole.
        let bucket = null;
        const after = before.map((tag) => {
          const tagBucket = classify(tag, column.force);
          if (tagBucket === BUCKET.COMPOUND) bucket = BUCKET.COMPOUND;
          else if (tagBucket === BUCKET.AMBIGUOUS && bucket !== BUCKET.COMPOUND) bucket = BUCKET.AMBIGUOUS;
          else if (tagBucket === BUCKET.UNAMBIGUOUS && bucket === null) bucket = BUCKET.UNAMBIGUOUS;
          return tagBucket ? fullyDecode(tag) : tag;
        });
        // Decoding can leave an element empty (a tag that was nothing but an
        // entity); an empty tag is not a tag.
        const cleaned = after.map((t) => t.trim()).filter((t) => t.length > 0);
        if (!bucket) continue;

        candidates.push({
          table: target.table,
          column: column.name,
          kind: column.kind,
          id: row.id,
          bucket,
          before: JSON.stringify(before),
          after: JSON.stringify(cleaned),
          write: JSON.stringify(cleaned),
        });
        continue;
      }

      const before = String(row.value);
      const bucket = classify(before, column.force);
      if (!bucket) continue;

      const after = fullyDecode(before);
      // A decode that empties a NOT NULL column would be worse than the damage.
      if (!after.trim()) continue;

      candidates.push({
        table: target.table,
        column: column.name,
        kind: column.kind,
        id: row.id,
        bucket,
        before,
        after,
        write: after,
      });
    }
  }

  return candidates;
}

async function writeRows(table, rows) {
  if (rows.length === 0) return 0;
  const transaction = await sequelize.transaction();
  try {
    for (const row of rows) {
      await sequelize.query(
        `UPDATE \`${table}\` SET \`${row.column}\` = :value WHERE id = :id`,
        { replacements: { value: row.write, id: row.id }, transaction }
      );
    }
    await transaction.commit();
    return rows.length;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main() {
  const targets = TABLE_FILTER
    ? TARGETS.filter((t) => t.table === TABLE_FILTER)
    : TARGETS;

  if (TABLE_FILTER && targets.length === 0) {
    console.error(
      `Unknown --table=${TABLE_FILTER}. Valid values: ${TARGETS.map((t) => t.table).join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  if (!AS_JSON) {
    console.log("=".repeat(74));
    console.log(
      `FAQ entity-escape repair  (${APPLY ? "APPLY" : "DRY-RUN"}${INTERACTIVE ? " + INTERACTIVE" : ""})`
    );
    console.log("=".repeat(74) + "\n");
  }

  await sequelize.authenticate();

  const all = [];

  for (const target of targets) {
    if (!(await tableExists(target.table))) {
      if (!AS_JSON) {
        console.log(`[SKIP] \`${target.table}\` (${target.label}) does not exist on this install.\n`);
      }
      continue;
    }

    const candidates = await collect(target);
    all.push(...candidates);

    if (AS_JSON) continue;

    const counts = {
      [BUCKET.COMPOUND]: candidates.filter((c) => c.bucket === BUCKET.COMPOUND).length,
      [BUCKET.UNAMBIGUOUS]: candidates.filter((c) => c.bucket === BUCKET.UNAMBIGUOUS).length,
      [BUCKET.AMBIGUOUS]: candidates.filter((c) => c.bucket === BUCKET.AMBIGUOUS).length,
    };

    if (candidates.length === 0) {
      console.log(`[OK]   \`${target.table}\` (${target.label}): nothing is entity-escaped.\n`);
      continue;
    }

    console.log(
      `[FOUND] \`${target.table}\` (${target.label}): ` +
        `${counts.COMPOUND} compound, ${counts.UNAMBIGUOUS} unambiguous, ${counts.AMBIGUOUS} ambiguous.`
    );

    for (const column of target.columns) {
      const forColumn = candidates.filter((c) => c.column === column.name);
      if (forColumn.length === 0) continue;

      const perBucket = {
        [BUCKET.COMPOUND]: forColumn.filter((c) => c.bucket === BUCKET.COMPOUND).length,
        [BUCKET.UNAMBIGUOUS]: forColumn.filter((c) => c.bucket === BUCKET.UNAMBIGUOUS).length,
        [BUCKET.AMBIGUOUS]: forColumn.filter((c) => c.bucket === BUCKET.AMBIGUOUS).length,
      };
      console.log(
        `        \`${column.name}\`: ${perBucket.COMPOUND} compound, ` +
          `${perBucket.UNAMBIGUOUS} unambiguous, ${perBucket.AMBIGUOUS} ambiguous` +
          (column.force ? `  (auto-repair: ${column.reason})` : "")
      );

      for (const bucket of [BUCKET.COMPOUND, BUCKET.UNAMBIGUOUS, BUCKET.AMBIGUOUS]) {
        const samples = forColumn.filter((c) => c.bucket === bucket).slice(0, SAMPLE_LIMIT);
        for (const sample of samples) {
          console.log(`          [${bucket}] ${sample.id}`);
          console.log(`            before: ${preview(sample.before)}`);
          console.log(`            after : ${preview(sample.after)}`);
        }
      }
    }
    console.log("");
  }

  if (AS_JSON) {
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  const auto = all.filter((c) => c.bucket !== BUCKET.AMBIGUOUS);
  const ambiguous = all.filter((c) => c.bucket === BUCKET.AMBIGUOUS);

  if (!APPLY) {
    console.log("=".repeat(74));
    if (all.length === 0) {
      console.log("Nothing to repair — no FAQ text is entity-escaped.");
    } else {
      console.log(
        `DRY-RUN — ${auto.length} row(s) would be repaired automatically, ` +
          `${ambiguous.length} need a human decision.`
      );
      console.log("Re-run with --apply to repair the automatic ones.");
      if (ambiguous.length > 0) {
        console.log("Add --interactive to be prompted for the ambiguous ones, one at a time.");
      }
    }
    console.log("=".repeat(74));
    return;
  }

  /* --- APPLY ------------------------------------------------------- */

  let written = 0;
  for (const target of targets) {
    const rows = auto.filter((c) => c.table === target.table);
    written += await writeRows(target.table, rows);
    if (rows.length > 0) {
      console.log(`[REPAIRED] \`${target.table}\`: ${rows.length} row(s).`);
    }
  }

  let confirmed = 0;
  if (INTERACTIVE && ambiguous.length > 0) {
    console.log("\n" + "-".repeat(74));
    console.log(
      `${ambiguous.length} value(s) contain a single-level escape that an author could\n` +
        `plausibly have typed. Confirm each one. y = repair, n = leave, a = repair all\n` +
        `remaining, q = stop asking and leave the rest alone.`
    );
    console.log("-".repeat(74) + "\n");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let acceptAll = false;
    const accepted = [];

    try {
      for (const row of ambiguous) {
        if (acceptAll) {
          accepted.push(row);
          continue;
        }
        console.log(`${row.table}.${row.column}  ${row.id}`);
        console.log(`  before: ${preview(row.before)}`);
        console.log(`  after : ${preview(row.after)}`);
        const answer = await ask(rl, "  repair? [y/n/a/q] ");
        if (answer === "q") break;
        if (answer === "a") {
          acceptAll = true;
          accepted.push(row);
        } else if (answer === "y") {
          accepted.push(row);
        }
        console.log("");
      }
    } finally {
      rl.close();
    }

    for (const target of targets) {
      const rows = accepted.filter((c) => c.table === target.table);
      confirmed += await writeRows(target.table, rows);
      if (rows.length > 0) {
        console.log(`[REPAIRED] \`${target.table}\`: ${rows.length} confirmed ambiguous row(s).`);
      }
    }
  }

  const leftover = ambiguous.length - confirmed;

  console.log("\n" + "=".repeat(74));
  console.log(`Done. ${written + confirmed} row(s) repaired.`);
  if (leftover > 0) {
    console.log(
      `${leftover} ambiguous row(s) were left untouched. They will keep being reported;\n` +
        `that is expected — only a human can tell the bug's output from an author's\n` +
        `literal "&amp;". Run again with --apply --interactive to review them.`
    );
    console.log("Re-run without --apply: COMPOUND and UNAMBIGUOUS must both report 0.");
  } else {
    console.log("Re-run without --apply; it must report 0.");
  }
  console.log("=".repeat(74));
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error("FAQ entity-escape repair failed:", error?.message || error);
    await sequelize.close();
    process.exit(1);
  });
