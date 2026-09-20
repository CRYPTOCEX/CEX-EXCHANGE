/**
 * Tells you the webhook URL to register with TransFi, and — once a real delivery
 * has arrived — which signature canonicalization to pin.
 *
 * Why this exists: TransFi's docs publish three code samples that sign three
 * DIFFERENT byte strings (Node signs the raw body, Python signs a re-serialised
 * `json.dumps`), and no test vector. So the only way to know which one they
 * actually use is to observe one genuine delivery. The listener accepts both and
 * stamps whichever matched; this reads that stamp back.
 *
 * Usage:  cd backend && npx tsx scripts/transfi-signature-status.ts
 *
 * Also verifies an arbitrary captured delivery, if you have one:
 *   npx tsx scripts/transfi-signature-status.ts --body ./captured.json --sig <hex>
 */

import "../module-alias-setup";
import "../load-env";
import fs from "fs";

import { models, sequelize } from "@b/db";
import {
  getTransfiConfig,
  transfiWebhookUrl,
  verifyTransfiWebhookSignature,
  SIGNATURE_VARIANT_OBSERVED_KEY,
} from "../src/api/finance/deposit/fiat/transfi/utils";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const config = getTransfiConfig();
  const depositUrl = transfiWebhookUrl();
  const payoutUrl = depositUrl.replace("/deposit/fiat/transfi/webhook", "/withdraw/fiat/transfi/webhook");
  const isLocal = /localhost|127\.0\.0\.1|^http:/i.test(depositUrl);

  console.log("\nTransFi webhook status");
  console.log("======================\n");
  console.log(`Environment : ${config.sandbox ? "SANDBOX" : "PRODUCTION"}  (${config.baseUrl})`);
  console.log(`MID         : ${config.mid}`);
  console.log(`Secret set  : ${config.webhookSecret ? "yes" : "NO — deposits could never be credited"}`);

  console.log("\n1) Register THIS URL in Displai -> Settings -> Integration:\n");
  console.log(`     ${depositUrl}`);
  console.log("\n   TransFi supports one webhook URL per MID, and it delivers every event");
  console.log("   type to it. The payout route exists separately if you ever get a second");
  console.log("   slot, but with one slot the deposit URL is the one to register — the");
  console.log("   payout reconciler covers withdrawals on a 5-minute poll regardless.");
  console.log(`\n   (payout route, for reference: ${payoutUrl})`);

  if (isLocal) {
    console.log("\n   !! That URL is NOT publicly reachable, so TransFi cannot deliver to it.");
    console.log("      Set NEXT_PUBLIC_SITE_URL (or APP_PUBLIC_URL) to your public https");
    console.log("      domain and re-run this. TransFi will not accept an http:// or");
    console.log("      localhost URL.");
  }

  /* ---- reset ---- */
  if (process.argv.includes("--reset")) {
    await models.settings.destroy({ where: { key: SIGNATURE_VARIANT_OBSERVED_KEY } }).catch(() => {});
    console.log("\n   Cleared the observed variant. The next verified delivery re-stamps it.");
  }

  /* ---- observed canonicalization ---- */
  const row: any = await models.settings
    .findOne({ where: { key: SIGNATURE_VARIANT_OBSERVED_KEY } })
    .catch(() => null);
  const pinned = (process.env.APP_TRANSFI_SIGNATURE_VARIANT || "").trim().toLowerCase();

  console.log("\n2) Signature canonicalization\n");
  console.log(`   Pinned in env : ${pinned || "(not pinned — both variants accepted)"}`);
  console.log(`   Observed live : ${row?.value || "(nothing yet — no real delivery has arrived)"}`);

  if (!row?.value) {
    console.log("\n   Nothing to pin yet. Every webhook this platform has verified so far was");
    console.log("   signed by our own test harness, which proves our verification works but");
    console.log("   NOT which variant TransFi uses. Register the URL above, let one real");
    console.log("   event arrive, then run this again.");
    console.log("\n   To force one quickly once the URL is registered, in sandbox:");
    console.log("     POST /v3/simulation/order          {orderId, status}   -> drives a status");
    console.log("     POST /v3/simulation/webhook-resend {entityId}          -> redelivers it");
  } else {
    console.log("\n   !! This value is only trustworthy if it came from a REAL TransFi delivery.");
    console.log("      The test harnesses in backend/scripts sign their payloads themselves");
    console.log("      using the raw-bytes form, so running them against this database ALSO");
    console.log("      stamps \"raw\" — which proves nothing about what TransFi does.");
    console.log("      If you have run them here, clear it with --reset, register the URL,");
    console.log("      and let a genuine event arrive before trusting this.");
    const want = row.value === "raw" ? "raw" : "python";
    if (pinned === want) {
      console.log(`\n   Correctly pinned. Nothing to do.`);
    } else {
      console.log(`\n   ACTION: set this in your environment and restart:`);
      console.log(`\n     APP_TRANSFI_SIGNATURE_VARIANT=${want}`);
      console.log(`\n   That stops the listener accepting the other variant, which narrows the`);
      console.log(`   surface a forged signature could exploit.`);
    }
  }

  /* ---- optional: verify a captured delivery ---- */
  const bodyPath = arg("body");
  const sig = arg("sig");
  if (bodyPath && sig) {
    console.log("\n3) Verifying the captured delivery\n");
    if (!fs.existsSync(bodyPath)) {
      console.log(`   File not found: ${bodyPath}`);
    } else {
      // Read as BYTES and decode once — the same way the platform does. Reading it
      // any other way could "fix" a corruption that is the very thing under test.
      const raw = fs.readFileSync(bodyPath).toString("utf8");
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      const res = verifyTransfiWebhookSignature(raw, sig, parsed);
      if (res.valid) {
        console.log(`   VALID — matched the "${res.variant}" canonicalization.`);
        console.log(`   Pin it:  APP_TRANSFI_SIGNATURE_VARIANT=${res.variant === "raw" ? "raw" : "python"}`);
      } else {
        console.log(`   NOT VALID — ${res.reason}.`);
        console.log("   Check that the file is the EXACT bytes TransFi sent (no reformatting,");
        console.log("   no editor trailing newline) and that the secret in this environment is");
        console.log("   the one that signed it.");
      }
    }
  }

  console.log("");
  await sequelize.close().catch(() => {});
  process.exit(0);
}

main().catch((e) => {
  console.error("Failed:", e?.message || e);
  process.exit(1);
});
