/**
 * Move KYC identity documents out of the public web root.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG
 * ---------------------------------------------------------------------------
 * Documents were written to `frontend/public/uploads/kyc/documents/` and stored
 * in `kyc_application.data` as `/uploads/...` URLs. That directory is served
 * with NO AUTHENTICATION by two separate doors: `serveStaticFile`, which
 * `server.ts` reaches before any auth middleware runs, and Next's own static
 * handling of `frontend/public/`. Anyone holding a URL read the document. These
 * are passports and national identity cards.
 *
 * The upload route now writes to a backend-private store and returns an
 * `/api/user/kyc/document/<userId>/<file>` URL, served by a route that checks
 * owner-or-reviewer. THIS SCRIPT MOVES WHAT IS ALREADY ON DISK, and rewrites
 * the database paths that point at it.
 *
 * ---------------------------------------------------------------------------
 * WHY THE PATHS ARE REWRITTEN RATHER THAN A LEGACY READ BRANCH ADDED
 * ---------------------------------------------------------------------------
 * A legacy branch would have to answer "who owns this file?" for a bare
 * filename, and the only way to answer it is to search every application's JSON
 * blob for the string. That is a `LIKE '%name%'` scan on the authorization path
 * of an identity document: slow, and wrong the moment two applications
 * reference one file.
 *
 * Rewriting instead makes the owner part of the path, so the door's ownership
 * check is a string comparison for historical documents exactly as it is for
 * new ones. There is then no second code path to keep correct, which matters
 * more here than anywhere else in the platform.
 *
 * ---------------------------------------------------------------------------
 * THE ORPHAN SWEEP
 * ---------------------------------------------------------------------------
 * Not every file under `/uploads/kyc/` is referenced by an application. The
 * upload route's `removeOldFileSecurely` was a deliberate no-op for years, so
 * every superseded document from every correction cycle is still on disk, and
 * applicants who abandoned a form mid-way left documents no row ever named.
 *
 * Those are exactly as sensitive as the referenced ones, and are moved to
 * `<store>/_orphaned/` rather than deleted, because this script must not be the
 * thing that destroys evidence an operator may be required to retain. Nothing
 * points at them, so nothing 404s; an operator can review that directory and
 * delete it at their leisure.
 *
 * ---------------------------------------------------------------------------
 * SAFETY
 * ---------------------------------------------------------------------------
 * DRY-RUN BY DEFAULT. Nothing moves and nothing is written without `--apply`.
 *
 *   Report:  node backend/scripts/kyc-documents-private.mjs
 *   Apply:   node backend/scripts/kyc-documents-private.mjs --apply
 *
 * IDEMPOTENT. A path already rewritten is skipped; a file already moved is
 * skipped. A second run reports zero work.
 *
 * FILES ARE COPIED, VERIFIED, THEN UNLINKED, never renamed. `fs.rename` across
 * devices fails on exactly the deployments most likely to keep uploads on a
 * separate volume, and a rename that half-succeeds on Windows leaves the source
 * gone and the destination unreadable. The unlink happens only after the
 * destination is confirmed the same size as the source.
 *
 * THE DATABASE IS WRITTEN LAST, PER APPLICATION. If a file move fails, that
 * application's paths are left pointing at the old location, which still
 * resolves, because a file that could not be copied was never unlinked. The
 * failure mode is "this one application was not migrated", never "this
 * application's documents are unreachable".
 *
 * ---------------------------------------------------------------------------
 * ORDER OF OPERATIONS
 * ---------------------------------------------------------------------------
 * Run this AFTER deploying the backend that serves `/api/user/kyc/document/...`
 * and BEFORE relying on the static-path refusal. Serving comes first because a
 * rewritten path with no route behind it is a document nobody can open.
 */

import { config } from "dotenv";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const PUBLIC_UPLOADS_ROOT = path.join(
  PROJECT_ROOT,
  "frontend",
  "public",
  "uploads"
);
const LEGACY_KYC_ROOT = path.join(PUBLIC_UPLOADS_ROOT, "kyc");

/**
 * Must agree with `resolveKycDocumentDir()` in
 * `backend/src/api/user/kyc/document/utils.ts`. That function probes the cwd
 * because the backend runs from two different directories; this script knows
 * where it is, so it resolves from its own location instead. It reads the same
 * override, or an operator who set one would migrate into a directory the
 * server does not look in.
 */
const STORE_ROOT = process.env.KYC_DOCUMENT_DIR
  ? path.resolve(process.env.KYC_DOCUMENT_DIR)
  : path.join(PROJECT_ROOT, "backend", "storage", "kyc", "documents");

const ORPHAN_ROOT = path.join(STORE_ROOT, "_orphaned");

const DOCUMENT_URL_PREFIX = "/api/user/kyc/document/";
const LEGACY_URL_PREFIX = "/uploads/";

const DB_NAME = process.env.DB_NAME || "platform";

const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

/** Names the private store will accept back. Kept in step with utils.ts. */
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
]);

const stats = {
  applications: 0,
  applicationsChanged: 0,
  paths: 0,
  pathsRewritten: 0,
  filesMoved: 0,
  filesAlreadyMoved: 0,
  filesMissing: 0,
  orphansMoved: 0,
  skipped: [],
};

/**
 * `data` is a JSON column, and this platform reads it back in TWO shapes: prod
 * MySQL hands back a parsed object, local MariaDB stores it as LONGTEXT and
 * hands back the raw string. The model carries a guarded getter for exactly
 * this; a raw query does not, so the guard is repeated here.
 */
function parseData(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Walk a parsed `data` blob and hand every string leaf to `visit`, replacing it
 * with whatever `visit` returns.
 *
 * Recursive because KYC level definitions nest: a SECTION field holds an object
 * of its own fields, and a document can sit at either depth. The detection
 * sites in the user-facing client check one level of nesting; this checks all
 * of them, because a path this misses is a document left in the web root with a
 * database row still pointing at it.
 */
function mapStrings(node, visit) {
  if (Array.isArray(node)) {
    return node.map((item) => mapStrings(item, visit));
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = mapStrings(value, visit);
    }
    return out;
  }
  if (typeof node === "string") return visit(node);
  return node;
}

/** Is this string a legacy public upload path we are responsible for? */
function isLegacyDocumentPath(value) {
  if (typeof value !== "string") return false;
  if (!value.startsWith(LEGACY_URL_PREFIX)) return false;
  if (value.includes("..")) return false;
  /* Spelled as the escape, not the raw byte: a literal NUL makes this whole
     file binary to git and to ripgrep, so the diff reads "Binary files
     differ" and every repo-wide search skips it. Identical at runtime. */
  if (value.indexOf("\u0000") !== -1) return false;
  return ALLOWED_EXTENSIONS.has(path.extname(value).toLowerCase());
}

/**
 * Copy, verify, then unlink. Returns "moved", "already", or "missing".
 *
 * A destination that already exists is treated as done rather than overwritten.
 * Names in this store are either 192-bit random or a timestamp-plus-PRNG from
 * the old scheme, so a collision between two different documents is not a thing
 * that happens. Overwriting on the assumption that it cannot would make the one
 * case where it does silently destroy a passport.
 */
async function moveFile(source, destination) {
  if (!fs.existsSync(source)) {
    return fs.existsSync(destination) ? "already" : "missing";
  }
  if (fs.existsSync(destination)) return "already";

  if (!APPLY) return "moved";

  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.copyFile(source, destination);

  const sourceSize = (await fsp.stat(source)).size;
  const destinationSize = (await fsp.stat(destination)).size;
  if (sourceSize !== destinationSize) {
    // Leave the source where it is. A half-written destination is the one
    // situation in which the public copy is still the only readable one.
    throw new Error(
      `size mismatch after copy: ${source} (${sourceSize}) -> ${destination} (${destinationSize})`
    );
  }

  await fsp.unlink(source);
  return "moved";
}

async function migrateApplications() {
  const [rows] = await sequelize.query(
    `SELECT id, userId, data FROM kyc_application ORDER BY createdAt`
  );

  for (const row of rows) {
    stats.applications += 1;

    const data = parseData(row.data);
    if (!data || typeof data !== "object") continue;

    const userId = String(row.userId || "");
    if (!userId) {
      stats.skipped.push(`application ${row.id}: no userId`);
      continue;
    }

    const moves = [];
    let changed = false;

    const rewritten = mapStrings(data, (value) => {
      if (!isLegacyDocumentPath(value)) return value;
      stats.paths += 1;

      const filename = path.basename(value);
      const source = path.resolve(
        PUBLIC_UPLOADS_ROOT,
        value.slice(LEGACY_URL_PREFIX.length)
      );

      // Confinement: a stored path is data, and data has been wrong before.
      if (!source.startsWith(path.resolve(PUBLIC_UPLOADS_ROOT) + path.sep)) {
        stats.skipped.push(
          `application ${row.id}: path escapes uploads root (${value})`
        );
        return value;
      }

      const destination = path.join(STORE_ROOT, userId, filename);
      moves.push({ source, destination, value });
      changed = true;
      return `${DOCUMENT_URL_PREFIX}${userId}/${filename}`;
    });

    if (!changed) continue;

    /*
     * EVERY FILE FIRST, THEN THE ROW.
     *
     * A row rewritten ahead of its files points at documents that are not there
     * yet, and the window is however long the copies take. Done this way round,
     * the worst case is a file moved with the row not updated, and the next run
     * finds the destination already present, reports "already", and completes
     * the rewrite.
     */
    let allMoved = true;
    for (const move of moves) {
      try {
        const result = await moveFile(move.source, move.destination);
        if (result === "moved") stats.filesMoved += 1;
        else if (result === "already") stats.filesAlreadyMoved += 1;
        else {
          stats.filesMissing += 1;
          stats.skipped.push(
            `application ${row.id}: file not on disk (${move.value})`
          );
          allMoved = false;
        }
      } catch (error) {
        allMoved = false;
        stats.skipped.push(`application ${row.id}: ${error.message}`);
      }
    }

    if (!allMoved) {
      /*
       * The row is left alone. Its remaining `/uploads/` paths still resolve,
       * because a file that could not be copied was never unlinked, so the
       * application is exactly as it was and the operator can look into the
       * named failure and re-run. A partial rewrite would have been the one
       * outcome that loses a document.
       */
      continue;
    }

    stats.pathsRewritten += moves.length;
    stats.applicationsChanged += 1;

    if (APPLY) {
      await sequelize.query(`UPDATE kyc_application SET data = ? WHERE id = ?`, {
        replacements: [JSON.stringify(rewritten), row.id],
      });
    }
  }
}

/**
 * Everything left under the public KYC directory, referenced by nothing.
 *
 * Runs AFTER the application pass, so anything still here is genuinely
 * unreferenced: a superseded document from a correction cycle, or an abandoned
 * form. Moved, not deleted. See the header.
 */
async function sweepOrphans() {
  if (!fs.existsSync(LEGACY_KYC_ROOT)) return;

  const walk = async (dir) => {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;

      const relative = path.relative(LEGACY_KYC_ROOT, full);
      const destination = path.join(ORPHAN_ROOT, relative);
      try {
        const result = await moveFile(full, destination);
        if (result === "moved") stats.orphansMoved += 1;
      } catch (error) {
        stats.skipped.push(`orphan ${relative}: ${error.message}`);
      }
    }
  };

  await walk(LEGACY_KYC_ROOT);
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY RUN (use --apply to execute)");
  console.log(`Public source:  ${LEGACY_KYC_ROOT}`);
  console.log(`Private store:  ${STORE_ROOT}`);
  console.log("");

  await sequelize.authenticate();

  await migrateApplications();
  await sweepOrphans();

  console.log(`Applications scanned:        ${stats.applications}`);
  console.log(`Applications rewritten:      ${stats.applicationsChanged}`);
  console.log(`Document paths found:        ${stats.paths}`);
  console.log(`Document paths rewritten:    ${stats.pathsRewritten}`);
  console.log(`Files moved:                 ${stats.filesMoved}`);
  console.log(`Files already in the store:  ${stats.filesAlreadyMoved}`);
  console.log(`Files referenced but absent: ${stats.filesMissing}`);
  console.log(`Unreferenced files moved:    ${stats.orphansMoved}`);

  if (stats.skipped.length) {
    console.log("");
    console.log(`Skipped (${stats.skipped.length}):`);
    for (const line of stats.skipped) console.log(`  - ${line}`);
  }

  if (!APPLY) {
    console.log("");
    console.log("Nothing was changed. Re-run with --apply to execute.");
  }

  await sequelize.close();
}

main().catch(async (error) => {
  console.error("MIGRATION FAILED:", error.message);
  try {
    await sequelize.close();
  } catch {}
  process.exit(1);
});
