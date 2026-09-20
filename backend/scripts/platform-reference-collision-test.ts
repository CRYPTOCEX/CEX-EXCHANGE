/**
 * Regression test for a pre-existing MONEY BUG shared by the fiat gateways.
 *
 * THE BUG: a gateway stores the provider's reference on the PENDING intent row,
 * then passes the SAME reference to `processFiatDeposit` on settlement. But
 * `processFiatDeposit` INSERTS a new ledger row rather than settling the intent
 * row, and `transaction.referenceId` carries a UNIQUE index
 * (`transactionReferenceIdKey`). The insert therefore collides.
 *
 * Why that is worse than a visible error: `WalletService` only recognises
 * `idempotencyKey` as a duplicate, so a referenceId collision is NOT caught as
 * `DuplicateOperationError`. It escapes as a raw `UniqueConstraintError`, rolls
 * the transaction back and answers 500 — the provider retries forever and the
 * customer is never credited.
 *
 * Paystack had exactly this shape. Fixed by giving the ledger row a distinct
 * `PSD-` prefixed reference. TransFi was built with distinct references (`TFI-`
 * intent, `TFO-`/`TFE-` ledger) from the start.
 *
 * Usage:  cd backend && npx tsx scripts/platform-reference-collision-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { walletCreationService } from "@b/services/wallet";
import { processFiatDeposit } from "@b/api/finance/utils";

let pass = 0, fail = 0;
const failures: string[] = [];
function check(n: string, ok: boolean, d = "") {
  if (ok) { pass++; console.log(`  PASS  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`); }
}
function section(t: string) { console.log(`\n=== ${t} ===`); }

const CURRENCY = "KES";

async function main() {
  const role: any = await models.role.findOne({ order: [["id", "ASC"]] });
  const u: any = await models.user.create({
    id: uuidv4(), email: `refcollide+${Date.now()}@example.invalid`,
    firstName: "Ref", lastName: "Collide",
    phone: `+2547${String(Date.now()).slice(-8)}`,
    roleId: role.id, emailVerified: true, phoneVerified: true, status: "ACTIVE",
  });
  const { wallet } = await walletCreationService.getOrCreateWallet(u.id, "FIAT", CURRENCY);

  try {
    section("The collision is real");
    const providerRef = `TESTREF-${Date.now()}`;

    // The intent row a gateway's index.post.ts writes.
    await models.transaction.create({
      userId: u.id, walletId: wallet.id, type: "DEPOSIT", status: "PENDING",
      amount: 100, fee: 0, referenceId: providerRef,
      description: "intent", metadata: JSON.stringify({ currency: CURRENCY }),
    });

    // Settling with the SAME reference — the old behaviour.
    let raw = false, wasDuplicateError = false, msg = "";
    try {
      await processFiatDeposit({
        userId: u.id, currency: CURRENCY, amount: 100, fee: 0,
        referenceId: providerRef, method: "TEST",
        idempotencyKey: `collide_${providerRef}`,
      });
    } catch (e: any) {
      raw = true;
      msg = e?.name || e?.message || "";
      wasDuplicateError = e?.constructor?.name === "DuplicateOperationError";
    }
    check("reusing the intent reference on the ledger row THROWS", raw, msg.slice(0, 80));
    check("and NOT as a recognised duplicate — it escapes as a raw DB error (hence a 500)",
      raw && !wasDuplicateError);

    const bal1 = Number((await models.wallet.findByPk(wallet.id))!.balance);
    check("so the customer was NOT credited", Math.abs(bal1) < 0.001, `balance ${bal1}`);

    section("A distinct ledger reference settles cleanly");
    const providerRef2 = `TESTREF2-${Date.now()}`;
    await models.transaction.create({
      userId: u.id, walletId: wallet.id, type: "DEPOSIT", status: "PENDING",
      amount: 250, fee: 0, referenceId: providerRef2,
      description: "intent", metadata: JSON.stringify({ currency: CURRENCY }),
    });

    let ok = true, err = "";
    try {
      await processFiatDeposit({
        userId: u.id, currency: CURRENCY, amount: 250, fee: 0,
        // The fix: prefix the ledger row so it cannot collide with the intent row.
        referenceId: `PSD-${providerRef2}`, method: "TEST",
        idempotencyKey: `nocollide_${providerRef2}`,
      });
    } catch (e: any) { ok = false; err = e?.message || String(e); }
    check("crediting with a distinct reference succeeds", ok, err.slice(0, 90));

    const bal2 = Number((await models.wallet.findByPk(wallet.id))!.balance);
    check("and the customer IS credited", Math.abs(bal2 - 250) < 0.01, `balance ${bal2}`);

    section("The shipped gateways use distinct references");
    const fs = require("fs");
    const read = (p: string) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
    const base = "src/api/finance/deposit/fiat";
    const paystackWebhook = read(`${base}/paystack/webhook.post.ts`);
    const paystackVerify = read(`${base}/paystack/verify.post.ts`);
    check("paystack webhook prefixes its ledger reference", /referenceId: `PSD-/.test(paystackWebhook));
    check("paystack verify prefixes its ledger reference", /referenceId: `PSD-/.test(paystackVerify));
    const transfiWebhook = read(`${base}/transfi/webhook.post.ts`);
    check("transfi webhook uses TFE-/TFO- for the ledger row",
      /referenceId: eventId \? `TFE-|`TFO-\$\{orderId\}`/.test(transfiWebhook));
    const transfiIndex = read(`${base}/transfi/index.post.ts`);
    check("transfi intent row uses a separate TFI- reference", /TFI-\$\{uuidv4\(\)\}/.test(transfiIndex));
  } finally {
    section("Cleanup");
    await models.transaction.destroy({ where: { userId: u.id }, force: true });
    await models.wallet.destroy({ where: { userId: u.id }, force: true });
    await models.user.destroy({ where: { id: u.id }, force: true });
    console.log("  removed");
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(60)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("\nHarness crashed:", e); process.exit(1); });
