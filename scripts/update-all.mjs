/**
 * One-click "update core + all addons" for managed hosting.
 *
 *   pnpm update-all [--dry-run] [--no-finalize]
 *
 * Turns "log into admin and update each extension one-by-one, then it doesn't
 * take effect until you restart" into a single production-real action:
 *   1. Enumerate installed products (core + extensions + blockchains + exchanges).
 *   2. checkUpdate() each; download every pending version in order (honoring
 *      the server's isSequential flag) via the SAME downloadUpdate() the admin
 *      panel uses (now backed by the hardened, rollback-capable unzip()).
 *   3. Finalize ONCE at the end: maintenance -> seed -> build:frontend -> restart
 *      (mirrors `pnpm updator`'s tail) so the changes actually take effect.
 *
 * Reuses the exact server code — no update logic is duplicated here.
 *
 * NOTE: needs on-box validation against a real install (live DB + license +
 * network to the update server). It is not exercised in CI.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { createRequire } from "module";
import { execSync } from "child_process";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
loadEnv({ path: path.join(ROOT, ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const NO_FINALIZE = process.argv.includes("--no-finalize");
const FORCE_SRC = process.argv.includes("--src");

function log(msg) {
  console.log(`[update-all] ${msg}`);
}

// Resolve @b/* to the same code the running server uses.
//
// THIS IS THE RECOVERY PATH, and it works even when the platform cannot boot.
// That is the whole reason it matters: the admin panel's Update button needs a
// running site, so a dist that crashes on boot locks the operator out of the
// only UI that could replace it. This script never BOOTS the server — it calls
// checkUpdate/downloadUpdate directly — so a dist that dies at startup (an OOM
// in a boot phase, a missing export, a bad native module) is still perfectly
// good enough to fetch its own replacement.
//
// The try/catch covers the other half: a dist so damaged that it will not even
// load. Previously the fallback to source was gated on dist/index.js being
// ABSENT, so a present-but-broken dist was loaded anyway and the repair tool
// inherited the exact breakage it exists to repair — recoverable only by
// knowing to pass --src, which is not knowledge an operator in this situation
// has. Falling back automatically costs nothing when dist is healthy.
let usingSource = FORCE_SRC;
if (!FORCE_SRC && fs.existsSync(path.join(ROOT, "backend/dist/index.js"))) {
  try {
    require(path.join(ROOT, "backend/dist/module-alias-setup.js"));
  } catch (error) {
    log(`backend/dist could not be loaded (${error.message}); falling back to backend/src`);
    usingSource = true;
  }
}
if (usingSource || !fs.existsSync(path.join(ROOT, "backend/dist/index.js"))) {
  require(path.join(ROOT, "backend/node_modules/ts-node")).register({
    transpileOnly: true,
    compilerOptions: { module: "commonjs", target: "es2018", esModuleInterop: true },
  });
  const moduleAlias = require(path.join(ROOT, "backend/node_modules/module-alias"));
  moduleAlias.addAliases({
    "@b": path.join(ROOT, "backend/src"),
    "@db": path.join(ROOT, "backend/models"),
    "@": path.join(ROOT, "frontend"),
  });
}

const { checkUpdate, downloadUpdate, getProduct } = require("@b/api/admin/system/utils");
const { models } = require("@b/db");
const { getLicenseConfig } = require("@b/config/license");

/** Build the work-list of installed products with their type + current version. */
async function collectProducts() {
  const items = [];

  // Core / main product
  try {
    const core = await getProduct();
    if (core && (core.productId || core.id)) {
      items.push({
        productId: core.productId || core.id,
        name: core.name || "Bicrypto",
        version: core.version || "0.0.1",
        type: undefined, // core has no catalog status row
      });
    }
  } catch (e) {
    log(`could not resolve core product: ${e.message}`);
  }

  const tables = [
    ["extension", models.extension],
    ["blockchain", models.ecosystemBlockchain],
    ["exchange", models.exchange],
  ];
  for (const [type, model] of tables) {
    if (!model) continue;
    const rows = await model.findAll();
    for (const r of rows) {
      if (!r.productId) continue;
      items.push({
        productId: r.productId,
        name: r.name || r.title || r.productId,
        version: r.version || "0.0.1",
        type,
      });
    }
  }
  return items;
}

async function main() {
  const products = await collectProducts();
  log(`found ${products.length} installed product(s)`);

  let downloaded = 0;
  let checkFailures = 0;
  const summary = [];

  for (const p of products) {
    let check;
    try {
      check = await checkUpdate(p.productId, p.version);
    } catch (e) {
      checkFailures++;
      log(`check failed for ${p.name}: ${e.message}`);
      summary.push({ product: p.name, updates: 0, checkFailed: true, reason: e.message });
      continue;
    }

    // "COULD NOT ASK" IS NOT "NOTHING TO DO".
    // checkUpdate() swallows its own network/HTTP failures and returns the
    // same shape as a genuine no-op — updateAvailable:false, empty
    // pendingUpdates, message "You have the latest version of the product."
    // — distinguished ONLY by checkFailed. Reading the first three and not
    // the fourth made a run where every check 403'd (an expired licence, a
    // licence server outage) finish on "everything already up to date" with
    // ok:true. The admin UI has read checkFailed since it was added; this
    // script, the one path an operator uses when the UI is unreachable, did
    // not — so the tool for the worst case was the one that lied about it.
    if (check.checkFailed) {
      checkFailures++;
      log(`check failed for ${p.name}: ${check.failureReason || check.message}`);
      summary.push({
        product: p.name,
        updates: 0,
        checkFailed: true,
        reason: check.failureReason || check.message,
      });
      continue;
    }

    const pending = check?.pendingUpdates || [];
    if (!check?.updateAvailable || pending.length === 0) {
      summary.push({ product: p.name, updates: 0 });
      continue;
    }
    log(`${p.name}: ${pending.length} pending update(s) -> ${pending.map((u) => u.version).join(", ")}`);
    summary.push({ product: p.name, updates: pending.length, versions: pending.map((u) => u.version) });

    if (DRY_RUN) continue;

    for (const u of pending) {
      try {
        await downloadUpdate(p.productId, u.updateId, u.version, p.name, p.type);
        downloaded++;
        log(`  applied ${p.name} -> ${u.version}`);
      } catch (e) {
        log(`  FAILED ${p.name} -> ${u.version}: ${e.message} (rolled back)`);
        // downloadUpdate throws on a failed (rolled-back) extraction; stop this
        // product's sequential chain but keep going with the others.
        break;
      }
    }
  }

  if (checkFailures > 0) {
    log(
      `WARNING: ${checkFailures} of ${products.length} product(s) could not be checked — ` +
        `their update status is UNKNOWN, not "up to date". See the reasons above.`
    );
  }

  if (DRY_RUN) {
    process.stdout.write(
      JSON.stringify({ ok: checkFailures === 0, dryRun: true, checkFailures, summary }) + "\n"
    );
    process.exit(checkFailures === 0 ? 0 : 1);
  }

  // Finalize once so the extracted changes actually take effect.
  if (downloaded > 0 && !NO_FINALIZE) {
    log(
      `finalizing (${downloaded} update(s)): stop -> install -> migrate -> seed -> build:frontend -> restart`
    );
    try {
      // `updator:migrate` was MISSING from this chain, and its absence is the
      // same bug its own header describes: it ran `pnpm seed` against the OLD
      // schema. The download above has just replaced backend/dist with a build
      // whose models may carry new columns, and seeders write through those
      // models — so without a sync first, a seeder either errors on an unknown
      // column or writes a row the new code cannot read back.
      //
      // It also has to be a DEADLINE-checked step rather than a sleep: `&&`
      // cannot distinguish a migration that finished from one that never
      // started, which is precisely why updator-migrate.js exists instead of the
      // `pnpm start:backend && sleep 180` it replaced. Running it here means
      // this recovery path gets the same guarantee `pnpm updator` has.
      //
      // Ordering note: it boots the NEWLY downloaded dist, which is what we want
      // — the schema applied is the one the new release expects.
      // `pnpm install` was MISSING, and its absence breaks exactly the case this
      // script is for. The download above replaced package.json with the new
      // release's, so if that release added or moved a dependency, node_modules
      // no longer satisfies it — the freshly downloaded dist then starts and
      // dies on `Cannot find module`, which looks like a bad build rather than
      // an incomplete install. `pnpm updator` runs a package step for precisely
      // this reason; this path skipped it while being the ONLY path that
      // actually changes package.json.
      //
      // `install`, not `update`: the job here is "make node_modules match the
      // release we just downloaded", honouring its lockfile. `update` would
      // instead bump every dependency to the newest version its range allows,
      // which is a different and riskier action that has nothing to do with
      // applying this release.
      //
      // Runs BEFORE updator:migrate because migrate boots the new dist, which
      // needs those modules present to reach the schema sync at all.
      //
      // Non-interactive by necessity (no TTY here): pnpm-workspace.yaml sets
      // confirmModulesPurge:false so a store change cannot abort this with
      // ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY halfway through an update.
      execSync("node backend/scripts/graceful-stop.mjs && node scripts/ensure-deps.mjs && pnpm updator:migrate && pnpm seed && pnpm build:frontend && pnpm start", {
        cwd: ROOT,
        stdio: "inherit",
      });
    } catch (e) {
      process.stdout.write(
        JSON.stringify({ ok: false, downloaded, summary, error: `finalize failed: ${e.message}` }) + "\n"
      );
      process.exit(1);
    }
  } else if (downloaded === 0 && checkFailures === 0) {
    log("everything already up to date");
  }

  process.stdout.write(
    JSON.stringify({
      ok: checkFailures === 0,
      downloaded,
      checkFailures,
      finalized: downloaded > 0 && !NO_FINALIZE,
      summary,
    }) + "\n"
  );
  process.exit(checkFailures === 0 ? 0 : 1);
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ ok: false, error: e?.message || String(e) }) + "\n");
  process.exit(1);
});
