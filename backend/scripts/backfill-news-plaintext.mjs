/**
 * Backfill News Plain Text
 *
 * News vendors return the ORIGINATING PUBLISHER'S HTML in `summary`, not a
 * plain-text abstract. Nothing stripped it, so the terminal rendered the tags
 * as visible body text:
 *
 *   <p class="PDq2pG_selectionAnchorContainer">The USD is little changed...
 *   <p>Headlines:</p><ul><li><a href="..." rel="follow">Iran official...</a></li>
 *
 * WHY A BACKFILL IS MANDATORY, not a nicety. The sync calls
 * `upsertByExternalId(models.fxMarketNews, rows, () => false)` — news is
 * treated as immutable once published, so `toUpdate` is permanently empty and a
 * row already in the table is NEVER rewritten. Fixing ingestion therefore fixes
 * new inserts only: the ~60 stories in the vendor's rolling window stay dirty
 * until the 30-day prune eventually drops them.
 *
 * Fully IDEMPOTENT and safe to re-run:
 *   - each table is guarded by an INFORMATION_SCHEMA existence check, so an
 *     install without the forex addon (or without the exchange news feature)
 *     simply skips it;
 *   - the WHERE clause matches a REAL tag or a REAL entity, so a row already
 *     converted is not selected a second time;
 *   - re-running after --apply reports 0.
 *
 * DRY-RUN by default (reports what WOULD change, with samples).
 *   Report: node scripts/backfill-news-plaintext.mjs
 *   Apply:  node scripts/backfill-news-plaintext.mjs --apply
 *   Verify: node scripts/backfill-news-plaintext.mjs      -> must report 0
 *
 * The conversion below is a deliberate COPY of src/utils/news/html-to-text.ts,
 * not an import: every other script in this directory is self-contained, and a
 * .mjs cannot import the TypeScript source. The TS version stays authoritative
 * — if the two ever disagree, fix the TS one and re-copy.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

/** Every table that stores vendor news. Missing ones are skipped, not fatal. */
const TABLES = [
  { name: "fx_market_news", label: "forex terminal" },
  { name: "market_news", label: "exchange" },
];

const TEXT_COLUMNS = ["headline", "summary"];

/* ------------------------------------------------------------------ */
/* Conversion (mirror of src/utils/news/html-to-text.ts)               */
/* ------------------------------------------------------------------ */

const LIST_SEP = String.fromCharCode(1);
const BLOCK_SEP = String.fromCharCode(2);

const separatorRun = (s) => `[\\s${s}]*${s}[\\s${s}]*`;
const LIST_RUN = new RegExp(separatorRun(LIST_SEP), "g");
const BLOCK_RUN = new RegExp(separatorRun(BLOCK_SEP), "g");
const DANGLING_LIST = new RegExp(
  `^${separatorRun(LIST_SEP)}` +
    `|${separatorRun(LIST_SEP)}$` +
    `|${separatorRun(LIST_SEP)}(?=${BLOCK_SEP})` +
    `|(?<=${BLOCK_SEP})${separatorRun(LIST_SEP)}`,
  "g"
);

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  bull: "•", middot: "·", deg: "°",
  euro: "€", pound: "£", yen: "¥", cent: "¢",
  copy: "©", reg: "®", trade: "™",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
  uuml: "ü", ouml: "ö", auml: "ä", ntilde: "ñ",
};

const ENTITY_RE = /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi;

function safeFromCodePoint(code, fallback) {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return fallback;
  if (code >= 0xd800 && code <= 0xdfff) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

function decodeEntities(text) {
  return text.replace(ENTITY_RE, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return safeFromCodePoint(parseInt(entity.slice(2), 16), match);
    if (lower.startsWith("#")) return safeFromCodePoint(parseInt(entity.slice(1), 10), match);
    return NAMED_ENTITIES[lower] ?? match;
  });
}

function collapseWhitespace(text) {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function applySeparators(text) {
  return text
    .replace(DANGLING_LIST, "")
    .replace(LIST_RUN, "; ")
    .replace(BLOCK_RUN, "\n");
}

function truncate(text, maxLen) {
  if (!maxLen || text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s;,.]+$/, "")}…`;
}

/**
 * Node has no DOM, so the tag strip here is a regex rather than DOMPurify.
 * The two cases that costs us are handled explicitly first: <script> and
 * <style> bodies are removed WITH their content (a bare tag regex would leave
 * the JS or CSS as visible text), and comments go whole.
 */
function stripTags(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "");
}

function htmlToPlainText(input, maxLen) {
  if (!input) return "";
  ENTITY_RE.lastIndex = 0;
  const needsWork = input.includes("<") || ENTITY_RE.test(input);
  ENTITY_RE.lastIndex = 0;
  if (!needsWork) return truncate(collapseWhitespace(input), maxLen);

  const marked = input
    .replace(/<\s*\/\s*li\s*>/gi, LIST_SEP)
    .replace(/<\s*br\s*\/?\s*>/gi, BLOCK_SEP)
    .replace(/<\s*\/\s*(p|div|h[1-6]|tr|ul|ol|blockquote|section|article)\s*>/gi, BLOCK_SEP);

  const text = collapseWhitespace(
    applySeparators(collapseWhitespace(decodeEntities(stripTags(marked))))
  );
  return truncate(text, maxLen);
}

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
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName] }
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return rows.length > 0;
}

/**
 * A row needs work when a column holds a REAL tag or a REAL entity.
 *
 * `<[a-zA-Z!/]` not a bare `<`: operator prose like "EUR/USD < 1.05" contains
 * one and must not be rewritten. Likewise the entity pattern requires the
 * closing semicolon, so a headline like "S&P 500" is left alone.
 */
const DIRTY_SQL = TEXT_COLUMNS.map(
  (c) =>
    `(\`${c}\` REGEXP '<[a-zA-Z!/]' OR \`${c}\` REGEXP '&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);')`
).join(" OR ");

async function main() {
  console.log("=".repeat(70));
  console.log(`Backfill News Plain Text  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(70) + "\n");

  await sequelize.authenticate();

  let grandTotal = 0;

  for (const { name: table, label } of TABLES) {
    if (!(await tableExists(table))) {
      console.log(`[SKIP] \`${table}\` (${label}) does not exist on this install.\n`);
      continue;
    }
    const missing = [];
    for (const column of TEXT_COLUMNS) {
      if (!(await columnExists(table, column))) missing.push(column);
    }
    if (missing.length > 0) {
      console.log(`[SKIP] \`${table}\` is missing column(s): ${missing.join(", ")}.\n`);
      continue;
    }

    const [rows] = await sequelize.query(
      `SELECT id, headline, summary FROM \`${table}\` WHERE ${DIRTY_SQL}`
    );

    if (rows.length === 0) {
      console.log(`[OK]   \`${table}\` (${label}): no rows hold markup or entities.\n`);
      continue;
    }

    console.log(`[FOUND] \`${table}\` (${label}): ${rows.length} row(s) to convert.`);

    let changed = 0;
    let shown = 0;
    for (const row of rows) {
      const headline = htmlToPlainText(String(row.headline ?? ""), 500);
      const summaryText = row.summary ? htmlToPlainText(String(row.summary), 1000) : "";
      const summary = summaryText || null;

      const headlineMoved = headline !== row.headline;
      const summaryMoved = summary !== (row.summary ?? null);
      if (!headlineMoved && !summaryMoved) continue;
      changed += 1;

      if (shown < 3) {
        shown += 1;
        const before = String(row.summary ?? row.headline ?? "").slice(0, 110);
        const after = String(summary ?? headline).slice(0, 110);
        console.log(`         - before: ${JSON.stringify(before)}`);
        console.log(`           after : ${JSON.stringify(after)}`);
      }

      if (APPLY) {
        // A conversion that emptied a required column would be worse than the
        // markup it removed, so an all-markup headline keeps its original.
        await sequelize.query(
          `UPDATE \`${table}\` SET headline = ?, summary = ? WHERE id = ?`,
          { replacements: [headline || row.headline, summary, row.id] }
        );
      }
    }

    grandTotal += changed;
    console.log(
      APPLY
        ? `        [CONVERTED] ${changed} row(s).\n`
        : `        ${changed} row(s) would change.\n`
    );
  }

  console.log("=".repeat(70));
  if (grandTotal === 0) {
    console.log("Nothing to convert — every stored story is already plain text.");
  } else if (APPLY) {
    console.log(`Done. ${grandTotal} row(s) converted. Re-run without --apply; it must report 0.`);
  } else {
    console.log(`DRY-RUN — ${grandTotal} row(s) would be converted. Re-run with --apply.`);
  }
  console.log("=".repeat(70));
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error("Backfill failed:", error?.message || error);
    await sequelize.close();
    process.exit(1);
  });
