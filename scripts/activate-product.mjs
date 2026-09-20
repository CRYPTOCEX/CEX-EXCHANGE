/**
 * Headless product activation for managed hosting.
 *
 *   pnpm activate-product <productId> <purchaseCode> [clientName]
 *
 * Does exactly what the admin panel's activate flow does, without a browser:
 *   1. activateLicense() — verifies with the license server and writes the
 *      encrypted, machine-bound .lic (see utils/security/license-file).
 *   2. Flips the product's status flag (extension / ecosystemBlockchain /
 *      exchange) to true — the SECOND independent "active" flag; a .lic alone
 *      unblocks the license gate but does not enable the menu/feature.
 *   3. SecurityManager.revalidate() so the gate opens without a restart.
 *
 * Runtime: prefers the compiled dist (production); falls back to ts-node+src
 * for dev. Reuses the EXACT server code — no logic is duplicated here.
 *
 * NOTE: needs on-box validation against a real install (live DB + a valid
 * purchase code + network to the license server). It is not exercised in CI.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
loadEnv({ path: path.join(ROOT, ".env") });

const [productIdArg, purchaseCode, clientName = "managed-hosting"] =
  process.argv.slice(2).filter((a) => !a.startsWith("--"));
const FORCE_SRC = process.argv.includes("--src");

function fail(msg) {
  process.stdout.write(JSON.stringify({ ok: false, error: msg }) + "\n");
  process.exit(1);
}

if (!purchaseCode) {
  fail("Usage: activate-product <productId> <purchaseCode> [clientName]");
}

// Resolve @b/* aliases to the same code the running server uses.
const distSetup = path.join(ROOT, "backend/dist/module-alias-setup.js");
if (!FORCE_SRC && fs.existsSync(path.join(ROOT, "backend/dist/index.js"))) {
  require(distSetup);
} else {
  // Dev: transpile TS on the fly and alias @b -> backend/src.
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

const { activateLicense, getProduct } = require("@b/api/admin/system/utils");
const { models } = require("@b/db");
const security = require("@b/utils/security");

async function flipStatus(productId) {
  // Set status=true on whichever catalog table owns this productId.
  const targets = [
    ["extension", models.extension],
    ["ecosystemBlockchain", models.ecosystemBlockchain],
    ["exchange", models.exchange],
  ];
  for (const [label, model] of targets) {
    if (!model) continue;
    const row = await model.findOne({ where: { productId } });
    if (row) {
      await model.update({ status: true }, { where: { productId } });
      return label;
    }
  }
  return null; // core product (no status row) — nothing to flip
}

async function main() {
  // Auto-detect the core product id when not supplied.
  let productId = productIdArg;
  if (!productId) {
    const product = await getProduct();
    productId = product.productId || product.id;
  }

  const result = await activateLicense(productId, purchaseCode, clientName);
  const flipped = await flipStatus(productId);

  try {
    await security.SecurityManager.getInstance().revalidate();
  } catch {
    /* non-fatal: gate refreshes on next request / restart */
  }

  process.stdout.write(
    JSON.stringify({
      ok: true,
      productId,
      statusFlipped: flipped,
      message: result?.message || "activated",
    }) + "\n"
  );
  process.exit(0);
}

main().catch((e) => fail(e?.message || String(e)));
