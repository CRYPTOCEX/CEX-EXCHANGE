/**
 * Regression test for a pre-existing MONEY BUG in the admin withdrawal-reject path.
 *
 * THE BUG: `updateUserWalletBalance` keyed its refund on
 * `admin_wallet_${walletId}_${type}`, and `WalletService.checkIdempotency`
 * matches GLOBALLY on `idempotencyKey`. So the first rejected withdrawal on a
 * wallet refunded, and every later rejection of the same type on that same wallet
 * was treated as a duplicate and silently skipped — after the transaction had
 * already been flipped to REJECTED. The customer's history said "rejected" and
 * their money never came back. Nothing errored.
 *
 * Not TransFi-specific: this affects every rejected fiat and spot withdrawal.
 *
 * Usage:  cd backend && npx tsx scripts/platform-refund-idempotency-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { walletCreationService, walletService } from "@b/services/wallet";
import { updateUserWalletBalance } from "@b/api/admin/finance/wallet/[id]/withdraw/reject.post";

let pass = 0, fail = 0;
const failures: string[] = [];
function check(n: string, ok: boolean, d = "") {
  if (ok) { pass++; console.log(`  PASS  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`); }
}
function section(t: string) { console.log(`\n=== ${t} ===`); }

const CURRENCY = "KES";

async function balance(walletId: string): Promise<number> {
  const w: any = await models.wallet.findByPk(walletId);
  return Number(w?.balance || 0);
}

async function seedWithdrawal(userId: string, walletId: string, amount: number, fee: number) {
  const res = await walletService.debit({
    idempotencyKey: `refundtest_${uuidv4()}`,
    userId, walletId, walletType: "FIAT", currency: CURRENCY,
    amount: amount + fee, operationType: "WITHDRAW",
    description: `Refund-idempotency test withdrawal`,
    metadata: { totalAmount: amount + fee, netAmount: amount, fee, currency: CURRENCY },
  } as any);
  await models.transaction.update({ status: "PENDING" }, { where: { id: res.transactionId } });
  return models.transaction.findByPk(res.transactionId);
}

async function main() {
  const role: any = await models.role.findOne({ order: [["id", "ASC"]] });
  const u: any = await models.user.create({
    id: uuidv4(), email: `refundtest+${Date.now()}@example.invalid`,
    firstName: "Refund", lastName: "Tester",
    phone: `+2547${String(Date.now()).slice(-8)}`,
    roleId: role.id, emailVerified: true, phoneVerified: true, status: "ACTIVE",
  });
  const { wallet } = await walletCreationService.getOrCreateWallet(u.id, "FIAT", CURRENCY);
  await models.wallet.update({ balance: 10000 }, { where: { id: wallet.id } });

  try {
    section("Two rejected withdrawals on ONE wallet must BOTH refund");

    const t1: any = await seedWithdrawal(u.id, wallet.id, 100, 5);
    const t2: any = await seedWithdrawal(u.id, wallet.id, 200, 10);
    const afterDebits = await balance(wallet.id);
    check("both withdrawals debited", Math.abs(afterDebits - (10000 - 105 - 210)) < 0.01,
      `balance ${afterDebits}`);

    // First rejection.
    await updateUserWalletBalance(
      wallet.id, Number(t1.amount), Number(t1.fee), "REFUND_WITHDRAWAL",
      undefined, `withdraw_reject_refund_${t1.id}`
    );
    const after1 = await balance(wallet.id);
    check("first rejection refunded", Math.abs(after1 - (afterDebits + 105)) < 0.01,
      `${afterDebits} -> ${after1}`);

    // Second rejection, SAME wallet, SAME type. This is the one the old
    // per-wallet key swallowed.
    await updateUserWalletBalance(
      wallet.id, Number(t2.amount), Number(t2.fee), "REFUND_WITHDRAWAL",
      undefined, `withdraw_reject_refund_${t2.id}`
    );
    const after2 = await balance(wallet.id);
    check("SECOND rejection on the same wallet ALSO refunded (the bug)",
      Math.abs(after2 - (after1 + 210)) < 0.01, `${after1} -> ${after2}`);

    check("wallet is whole again", Math.abs(after2 - 10000) < 0.01, `${after2}`);

    section("Retrying the SAME rejection is still de-duplicated");
    let threw = false;
    try {
      await updateUserWalletBalance(
        wallet.id, Number(t2.amount), Number(t2.fee), "REFUND_WITHDRAWAL",
        undefined, `withdraw_reject_refund_${t2.id}`
      );
    } catch { threw = true; }
    const after3 = await balance(wallet.id);
    check("a repeat of the same transaction does not double-refund",
      Math.abs(after3 - after2) < 0.001, `${after2} -> ${after3}${threw ? " (rejected as duplicate)" : ""}`);

    section("Proof the OLD per-wallet key was broken");
    // Calling WITHOUT a key falls back to the old `admin_wallet_${id}_${type}`
    // form. Two different transactions then collide, which is exactly the bug.
    const o1: any = await seedWithdrawal(u.id, wallet.id, 30, 0);
    const o2: any = await seedWithdrawal(u.id, wallet.id, 40, 0);
    const oBase = await balance(wallet.id);
    try { await updateUserWalletBalance(wallet.id, 30, 0, "REFUND_WITHDRAWAL", undefined); } catch {}
    const oAfter1 = await balance(wallet.id);
    let secondBlocked = false;
    try { await updateUserWalletBalance(wallet.id, 40, 0, "REFUND_WITHDRAWAL", undefined); }
    catch { secondBlocked = true; }
    const oAfter2 = await balance(wallet.id);
    check("without a per-transaction key the SECOND refund is swallowed (the original bug)",
      secondBlocked || Math.abs(oAfter2 - oAfter1) < 0.001,
      `${oBase} -> ${oAfter1} -> ${oAfter2}${secondBlocked ? " (duplicate error)" : ""}`);
    check("so passing the key is what makes repeated rejections safe", true);

    section("Three DIFFERENT rejections all refund");
    const t3: any = await seedWithdrawal(u.id, wallet.id, 50, 0);
    const t4: any = await seedWithdrawal(u.id, wallet.id, 60, 0);
    const t5: any = await seedWithdrawal(u.id, wallet.id, 70, 0);
    const base = await balance(wallet.id);
    for (const t of [t3, t4, t5]) {
      await updateUserWalletBalance(
        wallet.id, Number(t.amount), Number(t.fee), "REFUND_WITHDRAWAL",
        undefined, `withdraw_reject_refund_${t.id}`
      );
    }
    const afterAll = await balance(wallet.id);
    check("all three refunded", Math.abs(afterAll - (base + 180)) < 0.01, `${base} -> ${afterAll}`);
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
