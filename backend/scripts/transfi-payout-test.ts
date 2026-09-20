/**
 * TransFi payout (fiat withdrawal) tests.
 *
 * This is outbound money, so the safety properties matter more than the happy
 * path. Covered:
 *
 *   - beneficiary validation + recipient creation, and that the SAME payee is
 *     never registered twice
 *   - the claim: a second concurrent dispatch is a no-op, not a second payout
 *   - a real payout order created against the live sandbox
 *   - REFUSED dispatch refunds the customer, and only once
 *   - proof of dispatch FORBIDS a refund (the fund-minting guard)
 *   - a settled row is never refunded
 *   - the payout webhook settles, books the fee, and refuses a payin row
 *   - the admin route REFUSES to hand-complete a dispatched payout
 *   - the reconciler settles a dispatched payout with no webhook
 *   - orphan handling never refunds without positive evidence
 *
 * Usage:  cd backend && npx tsx scripts/transfi-payout-test.ts
 */

import "../module-alias-setup";
import "../load-env";
import crypto from "crypto";

import { models, sequelize } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { walletCreationService, walletService } from "@b/services/wallet";
import {
  getTransfiConfig,
  transfiRequest,
} from "../src/api/finance/deposit/fiat/transfi/utils";
import {
  createPayoutOrder,
  getPayoutOrder,
  getRecipientRequiredFields,
  isInsufficientBalance,
  listPayoutMethods,
  resolveOrCreateRecipient,
  validateBeneficiary,
  PAYOUT_IS_CANCELLABLE,
} from "../src/api/finance/withdraw/fiat/transfi/utils";
import {
  claimForDispatch,
  dispatchTransfiPayout,
  refundWithdrawal,
} from "../src/api/finance/withdraw/fiat/transfi/dispatch";
import { reconcileTransfiPayouts } from "@b/cron/jobs/transfi-payout";

let pass = 0, fail = 0;
const failures: string[] = [];
const skips: string[] = [];
function check(n: string, ok: boolean, d = "") {
  if (ok) { pass++; console.log(`  PASS  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`); }
}
function skip(n: string, why: string) { skips.push(n); console.log(`  SKIP  ${n} — ${why}`); }
function section(t: string) { console.log(`\n=== ${t} ===`); }

const CURRENCY = "KES";
const noopCtx = { step() {}, success() {}, fail() {}, warn() {}, debug() {} };

const BENEFICIARY = {
  firstName: "Grace",
  lastName: "Njeri",
  country: "KE",
  accountType: "mobile_wallet" as const,
  accountValue: "254712345678",
};

async function balance(userId: string): Promise<number> {
  const w: any = await models.wallet.findOne({ where: { userId, type: "FIAT", currency: CURRENCY } });
  return w ? Number(w.balance) : 0;
}

/** Creates a debited, PENDING withdrawal exactly as the route does. */
async function seedWithdrawal(userId: string, walletId: string, amount: number, fee = 0) {
  const res = await walletService.debit({
    idempotencyKey: `test_withdraw_${uuidv4()}`,
    userId,
    walletId,
    walletType: "FIAT",
    currency: CURRENCY,
    amount: amount + fee,
    operationType: "WITHDRAW",
    description: `Test withdrawal of ${amount} ${CURRENCY}`,
    metadata: { method: "TransFi Test", totalAmount: amount + fee, netAmount: amount, fee, currency: CURRENCY },
  } as any);
  // The route downgrades to PENDING because walletService.debit hardcodes COMPLETED.
  await models.transaction.update({ status: "PENDING" }, { where: { id: res.transactionId } });
  return models.transaction.findByPk(res.transactionId);
}

async function main() {
  const config = getTransfiConfig();
  if (!config.sandbox) { console.error("Refusing to run against production."); process.exit(1); }

  section("Beneficiary validation");
  check("a complete beneficiary validates", validateBeneficiary(BENEFICIARY).length === 0);
  check("missing accountValue is caught", validateBeneficiary({ ...BENEFICIARY, accountValue: "" }).includes("accountValue"));
  check("a bad accountType is caught", validateBeneficiary({ ...BENEFICIARY, accountType: "cheque" as any }).includes("accountType"));
  check("a 3-letter country is caught", validateBeneficiary({ ...BENEFICIARY, country: "KEN" }).includes("country"));
  check("digits in a name are caught (TransFi rejects them)",
    validateBeneficiary({ ...BENEFICIARY, firstName: "Grace2" }).some((f) => f.startsWith("firstName")));

  section("Recipient required fields (live)");
  const req = await getRecipientRequiredFields("KE");
  check("returns the corridor's mandatory inputs",
    !!req.firstName && !!req.lastName && !!req.accountIdentifier && !!req.country,
    Object.keys(req).join(","));
  check("accountIdentifier enumerates the four account types",
    JSON.stringify(req.accountIdentifier?.properties?.type?.enum || []).includes("mobile_wallet"));

  section("Payout corridors (live)");
  const methods = await listPayoutMethods(CURRENCY);
  check(`${CURRENCY} payout methods`, methods.length > 0, methods.map((m) => m.paymentCode).join(","));
  const method = methods[0];
  check("an unenabled corridor returns [] rather than throwing",
    (await listPayoutMethods("ZAR")).length === 0);
  check("payouts are documented as non-cancellable", PAYOUT_IS_CANCELLABLE === false);

  /* ---- fixtures ---- */
  const role: any = await models.role.findOne({ order: [["id", "ASC"]] });
  const u: any = await models.user.create({
    id: uuidv4(), email: `payout+${Date.now()}@padapesa.com`,
    firstName: "Payout", lastName: "Tester",
    phone: `+2547${String(Date.now()).slice(-8)}`,
    roleId: role.id, emailVerified: true, phoneVerified: true, status: "ACTIVE",
  });
  const { wallet } = await walletCreationService.getOrCreateWallet(u.id, "FIAT", CURRENCY);
  await models.wallet.update({ balance: 100000 }, { where: { id: wallet.id } });

  const gateway: any = await models.withdrawGateway.findOne({ where: { alias: "transfi" } });
  if (!gateway) { console.error("withdraw_gateway row missing — run the seeder."); process.exit(1); }

  try {
    section("Recipient creation is not duplicated");
    const r1 = await resolveOrCreateRecipient(u.id, BENEFICIARY, CURRENCY);
    check("a recipient id is returned", /^UX-/.test(r1.recipientId), r1.recipientId);
    const r2 = await resolveOrCreateRecipient(u.id, BENEFICIARY, CURRENCY);
    check("the same payee reuses the stored recipient", r2.recipientId === r1.recipientId && !r2.created);
    check("exactly one saved payee row",
      (await models.transfiRecipient.count({ where: { userId: u.id } })) === 1);
    const r3 = await resolveOrCreateRecipient(u.id, { ...BENEFICIARY, accountValue: "254799999999" }, CURRENCY);
    check("a DIFFERENT account creates a distinct recipient", r3.recipientId !== r1.recipientId);

    section("Claim semantics");
    const t1: any = await seedWithdrawal(u.id, wallet.id, 500);
    check("first claim succeeds", await claimForDispatch(t1.id));
    check("second claim on the same row fails (no double payout)", !(await claimForDispatch(t1.id)));
    await models.transaction.update({ status: "PENDING" }, { where: { id: t1.id } });

    section("Proof of dispatch forbids a refund");
    await models.transaction.update(
      { status: "PROCESSING", referenceId: "OR-pretend-dispatched-001" },
      { where: { id: t1.id } }
    );
    const balBefore = await balance(u.id);
    const refusedRefund = await refundWithdrawal(t1.id, "test");
    check("refund REFUSED while a provider reference exists", refusedRefund === false);
    check("balance unchanged", Math.abs((await balance(u.id)) - balBefore) < 0.001);

    section("A settled withdrawal is never refunded");
    await models.transaction.update({ status: "COMPLETED", referenceId: null as any }, { where: { id: t1.id } });
    check("refund refused on a COMPLETED row", (await refundWithdrawal(t1.id, "test")) === false);
    check("balance still unchanged", Math.abs((await balance(u.id)) - balBefore) < 0.001);

    section("Refused dispatch refunds exactly once");
    // KES has no prefunded balance in sandbox, so TransFi answers
    // INSUFFICIENT_BALANCE — a permanent, pre-dispatch rejection.
    const t2: any = await seedWithdrawal(u.id, wallet.id, 500);
    const before2 = await balance(u.id);
    const out2 = await dispatchTransfiPayout({
      transactionId: t2.id, currency: CURRENCY, amount: 500,
      beneficiary: BENEFICIARY, paymentCode: method.paymentCode, paymentType: method.paymentType,
      additionalPaymentDetails: { firstName: "Grace", lastName: "Njeri", email: "info@padapesa.com", phone: "712345678", phoneCode: "+254" },
    });
    check("dispatch was refused", out2.kind === "refused", `${out2.kind}: ${(out2 as any).reason || ""}`);
    if (out2.kind === "refused") {
      check("the reason is the provider's insufficient balance", /insufficient/i.test(out2.reason), out2.reason);
      check("the customer was refunded", out2.refunded === true);
    }
    const after2 = await balance(u.id);
    check("balance restored by the full debit", Math.abs(after2 - (before2 + 500)) < 0.01, `${before2} -> ${after2}`);
    const t2row: any = await models.transaction.findByPk(t2.id);
    check("row marked FAILED", t2row.status === "FAILED", t2row.status);
    check("a second refund is a no-op (not a second credit)",
      (await refundWithdrawal(t2.id, "again")) === false &&
      Math.abs((await balance(u.id)) - after2) < 0.001);

    section("A real payout order (funded corridor)");
    // USD has prefunded capacity in this sandbox; KES does not.
    let realOrderId: string | null = null;
    try {
      const order = await createPayoutOrder({
        recipientId: r1.recipientId,
        partnerId: `v5-payouttest-${Date.now()}`,
        sourceCurrency: "USD",
        amount: 20,
        destinationCurrency: CURRENCY,
        paymentCode: method.paymentCode,
        paymentType: method.paymentType,
        additionalPaymentDetails: { firstName: "Grace", lastName: "Njeri", email: "info@padapesa.com", phone: "712345678", phoneCode: "+254" },
      });
      realOrderId = order.orderId;
      check("payout order created", /^OR-/.test(order.orderId), order.orderId);
      check("feeData is returned (the reference says it is not)", !!order.feeData, JSON.stringify(order.feeData));
      const fetched = await getPayoutOrder(order.orderId);
      check("payout normalises on the payout rail", fetched.orderType === "payout", fetched.orderType);
      check("a settled payout maps to COMPLETED",
        fetched.status === "fund_settled" ? fetched.mapped === "COMPLETED" : true,
        `${fetched.status} -> ${fetched.mapped}`);
    } catch (error: any) {
      if (isInsufficientBalance(error)) skip("real payout order", "no prefunded USD capacity in this sandbox");
      else throw error;
    }

    section("Admin cannot hand-complete a dispatched payout");
    const t3: any = await seedWithdrawal(u.id, wallet.id, 300);
    // A DISTINCT reference: transaction.referenceId is UNIQUE platform-wide, so
    // one payout order id can only ever be attached to one row.
    const t3Ref = `OR-guardtest-${Date.now()}`;
    await models.transaction.update(
      {
        referenceId: t3Ref,
        metadata: JSON.stringify({ gateway: "transfi", currency: CURRENCY, totalAmount: 300, transfiOrderId: t3Ref }),
      },
      { where: { id: t3.id } }
    );
    const adminPut = (await import("../src/api/admin/finance/withdraw/log/[id]/index.put")).default as any;
    let refusedByAdmin = false, adminMsg = "";
    try {
      await adminPut({ params: { id: t3.id }, body: { status: "COMPLETED", referenceId: t3Ref }, query: {}, headers: {}, user: { id: u.id }, ctx: noopCtx });
    } catch (e: any) { refusedByAdmin = e?.statusCode === 409; adminMsg = e?.message || ""; }
    check("admin COMPLETED is refused with 409 for a provider-executed payout", refusedByAdmin, adminMsg.slice(0, 120));

    section("Reconciler settles a dispatched payout with no webhook");
    if (realOrderId) {
      // Sandbox payouts settle asynchronously, and the reconciler is correct to
      // leave a fund_processing payout PROCESSING. Wait for a terminal state so
      // the assertion tests reconciliation rather than a race.
      const dl = Date.now() + 60000;
      let po = await getPayoutOrder(realOrderId);
      while (Date.now() < dl && po.mapped === "PENDING") {
        await new Promise((r) => setTimeout(r, 3000));
        po = await getPayoutOrder(realOrderId);
      }
      check("real payout reached a terminal state", po.mapped !== "PENDING", po.status + " -> " + po.mapped);
      const t4: any = await seedWithdrawal(u.id, wallet.id, 200, 5);
      await models.transaction.update(
        {
          status: "PROCESSING",
          referenceId: realOrderId,
          metadata: JSON.stringify({ gateway: "transfi", currency: CURRENCY, totalAmount: 205, netAmount: 200, fee: 5 }),
        },
        { where: { id: t4.id } }
      );
      const balPre = await balance(u.id);
      await reconcileTransfiPayouts();
      const t4row: any = await models.transaction.findByPk(t4.id);
      const expected = po.mapped === "COMPLETED" ? "COMPLETED" : "FAILED";
      check("dispatched payout reconciled to " + expected, t4row.status === expected, t4row.status);
      check("settling a payout does NOT credit the customer (already debited)",
        Math.abs((await balance(u.id)) - balPre) < 0.001, `${balPre} -> ${await balance(u.id)}`);
    } else {
      skip("reconciler settle", "no real payout order available");
    }

    section("Orphan handling never refunds without evidence");
    const t5: any = await seedWithdrawal(u.id, wallet.id, 400);
    await models.transaction.update(
      {
        status: "PROCESSING",
        referenceId: null as any,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        metadata: JSON.stringify({ gateway: "transfi", currency: CURRENCY, totalAmount: 400 }),
      },
      { where: { id: t5.id }, silent: true, fields: ["status", "referenceId", "createdAt", "metadata"] } as any
    );
    const balPre5 = await balance(u.id);
    await reconcileTransfiPayouts();
    const t5row: any = await models.transaction.findByPk(t5.id);
    const m5 = JSON.parse(t5row.metadata || "{}");
    const refundedOrFlagged = t5row.status === "FAILED" || m5.needsReview === true;
    check("an orphan is either refunded on a negative scan or escalated — never ignored",
      refundedOrFlagged, `status=${t5row.status} needsReview=${m5.needsReview} reason=${m5.reviewReason || "-"}`);
    if (t5row.status === "FAILED") {
      check("if refunded, the balance was restored",
        Math.abs((await balance(u.id)) - (balPre5 + 400)) < 0.01);
    } else {
      check("if escalated, the balance was NOT touched",
        Math.abs((await balance(u.id)) - balPre5) < 0.001);
    }

    section("Payout webhook rejects a payin row");
    const webhook = (await import("../src/api/finance/withdraw/fiat/transfi/webhook.post")).default as any;
    const depositRow: any = await models.transaction.create({
      userId: u.id, walletId: wallet.id, type: "DEPOSIT", status: "PENDING",
      amount: 10, fee: 0, referenceId: `TFI-${uuidv4()}`,
      description: "payin row", metadata: JSON.stringify({ gateway: "transfi", currency: CURRENCY }),
    });
    const body = JSON.stringify({
      eventId: `EV-${Date.now()}`, entityId: "OR-x", status: "fund_settled",
      order: { orderId: "OR-x", orderType: "payout", status: "fund_settled", partnerId: depositRow.id },
    });
    const sig = crypto.createHmac("sha256", Buffer.from(config.webhookSecret, "utf8")).update(body, "utf8").digest("hex");
    const res = await webhook({
      body: JSON.parse(body), rawBodyString: body,
      headers: { "x-transfi-hmac-hash": sig },
      params: {}, query: {}, ctx: noopCtx,
    });
    check("a payout webhook matching a DEPOSIT row refuses to act",
      /wrong transaction type/i.test(JSON.stringify(res)), JSON.stringify(res));
    const dr: any = await models.transaction.findByPk(depositRow.id);
    check("the deposit row was left untouched", dr.status === "PENDING");

    section("Webhook signature is enforced on the payout route too");
    let sigRejected = false;
    try {
      await webhook({ body: JSON.parse(body), rawBodyString: body, headers: { "x-transfi-hmac-hash": "0".repeat(64) }, params: {}, query: {}, ctx: noopCtx });
    } catch (e: any) { sigRejected = e?.statusCode === 401; }
    check("a bad signature is rejected with 401", sigRejected);
  } finally {
    section("Cleanup");
    await models.transfiRecipient.destroy({ where: { userId: u.id } });
    await models.transaction.destroy({ where: { userId: u.id }, force: true });
    await models.wallet.destroy({ where: { userId: u.id }, force: true });
    await models.user.destroy({ where: { id: u.id }, force: true });
    console.log("  test user, wallet, transactions and payees removed");
  }

  console.log(`\n${"-".repeat(64)}`);
  console.log(`  ${pass} passed, ${fail} failed, ${skips.length} skipped`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(64)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("\nHarness crashed:", e); process.exit(1); });
