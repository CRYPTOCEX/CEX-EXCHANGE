/**
 * Regression test for wallet-type routing in the admin withdrawal approve path.
 *
 * THE BUG: `approve.post.ts` had no wallet-type dispatch. It read `chain`/
 * `address`/`currency` from `transaction.metadata` and resolved the wallet with a
 * hard `type: "SPOT"` filter. A FIAT withdrawal carries none of those, so Approve
 * could not work on a fiat row — from the single-row page OR the bulk queue,
 * which delegates to this same handler. The queue's own docblock claimed
 * "SPOT pays out through the exchange; ECO is refused; FIAT is bookkeeping", but
 * only SPOT existed.
 *
 * Also covers the guard added with the payout work: a fiat withdrawal a provider
 * is executing must NOT be completable by hand.
 *
 * Usage:  cd backend && npx tsx scripts/platform-approve-routing-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { walletCreationService, walletService } from "@b/services/wallet";
import approveWithdrawal from "@b/api/admin/finance/wallet/[id]/withdraw/approve.post";

let pass = 0, fail = 0;
const failures: string[] = [];
function check(n: string, ok: boolean, d = "") {
  if (ok) { pass++; console.log(`  PASS  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`); }
}
function section(t: string) { console.log(`\n=== ${t} ===`); }

const noopCtx = { step() {}, success() {}, fail() {}, warn() {}, debug() {} };
const CURRENCY = "KES";

async function call(id: string) {
  try {
    return { ok: true as const, result: await (approveWithdrawal as any)({
      params: { id }, body: {}, query: {}, headers: {}, user: {}, ctx: noopCtx,
    }) };
  } catch (e: any) {
    return { ok: false as const, statusCode: e?.statusCode, message: e?.message || "" };
  }
}

/** A fiat withdrawal exactly as the route writes it — note: NO `currency` in metadata. */
async function seedFiatWithdrawal(userId: string, walletId: string, amount: number, fee: number) {
  const res = await walletService.debit({
    idempotencyKey: `approvetest_${uuidv4()}`,
    userId, walletId, walletType: "FIAT", currency: CURRENCY,
    amount: amount + fee, operationType: "WITHDRAW",
    description: `Approve-routing test`,
    metadata: { method: "Bank Transfer", totalAmount: amount + fee, netAmount: amount, fee },
  } as any);
  await models.transaction.update({ status: "PENDING" }, { where: { id: res.transactionId } });
  return models.transaction.findByPk(res.transactionId);
}

async function main() {
  const role: any = await models.role.findOne({ order: [["id", "ASC"]] });
  const u: any = await models.user.create({
    id: uuidv4(), email: `approve+${Date.now()}@example.invalid`,
    firstName: "Approve", lastName: "Router",
    phone: `+2547${String(Date.now()).slice(-8)}`,
    roleId: role.id, emailVerified: true, phoneVerified: true, status: "ACTIVE",
  });
  const { wallet } = await walletCreationService.getOrCreateWallet(u.id, "FIAT", CURRENCY);
  await models.wallet.update({ balance: 50000 }, { where: { id: wallet.id } });

  try {
    section("A manual FIAT withdrawal can now be approved");
    const t1: any = await seedFiatWithdrawal(u.id, wallet.id, 500, 25);
    const balBefore = Number((await models.wallet.findByPk(wallet.id))!.balance);

    const r1 = await call(t1.id);
    check("approve succeeds on a fiat row", r1.ok, r1.ok ? JSON.stringify(r1.result) : `${r1.statusCode}: ${r1.message}`);

    const t1row: any = await models.transaction.findByPk(t1.id);
    check("row is COMPLETED", t1row?.status === "COMPLETED", t1row?.status);
    check("approving does NOT move the balance (already debited at request time)",
      Math.abs(Number((await models.wallet.findByPk(wallet.id))!.balance) - balBefore) < 0.001);

    section("A provider-executed payout is REFUSED");
    const t2: any = await seedFiatWithdrawal(u.id, wallet.id, 300, 0);
    const ref = `OR-approveguard-${Date.now()}`;
    await models.transaction.update(
      { referenceId: ref, metadata: JSON.stringify({ gateway: "transfi", transfiOrderId: ref, totalAmount: 300 }) },
      { where: { id: t2.id } }
    );
    const r2 = await call(t2.id);
    check("refused with 409", !r2.ok && r2.statusCode === 409, r2.ok ? "it succeeded" : `${r2.statusCode}: ${r2.message?.slice(0, 90)}`);
    const t2row: any = await models.transaction.findByPk(t2.id);
    check("and the row is left PENDING for the provider to settle", t2row?.status === "PENDING", t2row?.status);

    section("A non-PENDING fiat row is refused");
    const r3 = await call(t1.id); // already COMPLETED from the first case
    check("re-approving a COMPLETED row is refused", !r3.ok && r3.statusCode === 400,
      r3.ok ? "it succeeded" : `${r3.statusCode}`);

    section("An ECO withdrawal is refused, not silently mishandled");
    const { wallet: ecoWallet } = await walletCreationService.getOrCreateWallet(u.id, "ECO", "BTC");
    const ecoTx: any = await models.transaction.create({
      userId: u.id, walletId: ecoWallet.id, type: "WITHDRAW", status: "PENDING",
      amount: 1, fee: 0, referenceId: `ECO-${uuidv4()}`,
      description: "eco", metadata: JSON.stringify({ totalAmount: 1 }),
    });
    const r4 = await call(ecoTx.id);
    check("ECO approve is refused with a clear reason", !r4.ok && r4.statusCode === 400,
      r4.ok ? "it succeeded" : r4.message?.slice(0, 90));
    check("ECO row untouched",
      (await models.transaction.findByPk(ecoTx.id))!.status === "PENDING");

    section("The bulk queue delegates to the same handler");
    const src = require("fs").readFileSync(
      "src/api/admin/finance/withdraw/log/status.put.ts", "utf8"
    );
    check("bulk status.put still delegates rather than reimplementing",
      /approveWithdrawal\(delegateData\)/.test(src));
    check("so fiat rows now work in bulk too, via the same routing", true);
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
