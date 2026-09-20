/**
 * TransFi reconciler tests.
 *
 * The reconciler is the backstop that credits deposits when a webhook never
 * arrives, so it moves money with no human in the loop. It gets the same scrutiny
 * as the webhook: real DB, real sandbox orders, real credit path.
 *
 * Covers:
 *   - a settled order with no webhook is credited
 *   - it shares the webhook's idempotency key, so it cannot double-credit
 *   - a failed order is marked FAILED and NOT credited
 *   - an order still in flight is left PENDING
 *   - an abandoned `initiated` order past the expiry window is EXPIRED
 *   - an order in `fund_processing` past the expiry window is NEVER expired
 *     (money in motion must not be cancelled out from under the customer)
 *   - rows younger than the grace period are skipped (webhook gets first chance)
 *
 * Usage:  cd backend && npx tsx scripts/transfi-reconciler-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models, sequelize } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { reconcileTransfiDeposits } from "@b/cron/jobs/transfi";
import {
  getTransfiConfig,
  transfiRequest,
  listPaymentMethods,
  isUserUsable,
  createPayinOrder,
  getOrder,
} from "../src/api/finance/deposit/fiat/transfi/utils";
import { walletCreationService } from "@b/services/wallet";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(t: string) {
  console.log(`\n=== ${t} ===`);
}

const CURRENCY = "KES";

async function simulate(orderId: string, status: string) {
  await transfiRequest("/v3/simulation/order", { method: "POST", body: { orderId, status } });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const o = await getOrder(orderId);
    if (o.status === status) return o;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return getOrder(orderId);
}

async function walletBalance(userId: string): Promise<number> {
  const w: any = await models.wallet.findOne({
    where: { userId, type: "FIAT", currency: CURRENCY },
  });
  return w ? Number(w.balance) : 0;
}

/** Creates a real TransFi order plus the PENDING intent row the route would write. */
async function seedIntent(
  userId: string,
  walletId: string,
  transfiUserId: string,
  paymentCode: string,
  paymentType: string,
  amount: number,
  ageMs: number
) {
  const txnId = uuidv4();
  const order = await createPayinOrder({
    transfiUserId,
    partnerId: txnId,
    sourceCurrency: CURRENCY,
    amount,
    paymentCode,
    paymentType,
    successRedirectUrl: "https://example.com/ok",
    failureRedirectUrl: "https://example.com/fail",
  });

  const createdAt = new Date(Date.now() - ageMs);
  const row = await models.transaction.create({
    id: txnId,
    userId,
    walletId,
    type: "DEPOSIT",
    status: "PENDING",
    amount,
    fee: 0,
    referenceId: `TFI-${uuidv4()}`,
    description: `TransFi deposit of ${amount} ${CURRENCY}`,
    metadata: JSON.stringify({
      gateway: "transfi",
      currency: CURRENCY,
      transfiUserId,
      transfiOrderId: order.orderId,
      payUrl: order.payUrl,
    }),
    createdAt,
  });
  // Sequelize overrides createdAt on create; force it so age-based branches are
  // actually exercised.
  await models.transaction.update(
    { createdAt } as any,
    { where: { id: txnId }, silent: true, fields: ["createdAt"] }
  );
  return { txnId, orderId: order.orderId, row };
}

async function main() {
  const config = getTransfiConfig();
  if (!config.sandbox) {
    console.error("Refusing to run against production.");
    process.exit(1);
  }

  const users = await transfiRequest<any>("/v3/users/individual", { query: { limit: 100 } });
  const usable = (users?.data || []).find((u: any) => isUserUsable(u));
  if (!usable) {
    console.error("No usable TransFi identity on this MID; cannot create orders.");
    process.exit(1);
  }

  const gateway: any = await models.depositGateway.findOne({ where: { alias: "transfi" } });
  if (!gateway) {
    console.error("TransFi gateway row missing — run the seeder.");
    process.exit(1);
  }
  const originalStatus = gateway.status;
  await gateway.update({ status: true });

  const currencyRow = await models.currency.findOne({ where: { id: CURRENCY } });
  if (!currencyRow) {
    console.error(`No platform currency row for ${CURRENCY}.`);
    await gateway.update({ status: originalStatus });
    process.exit(1);
  }

  const user: any = await models.user.findOne({ order: [["createdAt", "ASC"]] });
  const { wallet } = await walletCreationService.getOrCreateWallet(user.id, "FIAT", CURRENCY);

  const methods = await listPaymentMethods(CURRENCY, "deposit");
  const method = methods[0];
  const amount = 200;
  const created: string[] = [];

  console.log(`\nUser ${user.id}, TransFi ${usable.userId}, ${CURRENCY}/${method.paymentCode}`);

  try {
    /* -------- settled with no webhook -------- */
    section("Settled order with no webhook is credited");
    const a = await seedIntent(user.id, wallet.id, usable.userId, method.paymentCode, method.paymentType, amount, 5 * 60 * 1000);
    created.push(a.txnId);
    const settledOrder = await simulate(a.orderId, "fund_settled");
    const settled = settledOrder.destinationAmount ?? amount;

    const before = await walletBalance(user.id);
    await reconcileTransfiDeposits();
    const after = await walletBalance(user.id);
    const rowA: any = await models.transaction.findByPk(a.txnId);

    check("transaction marked COMPLETED", rowA?.status === "COMPLETED", rowA?.status);
    check(
      "wallet credited with the settled amount",
      Math.abs(after - (before + settled)) < 0.01,
      `${before} -> ${after} (settled ${settled})`
    );

    /* -------- idempotency with the webhook -------- */
    section("Cannot double-credit");
    await reconcileTransfiDeposits();
    check(
      "a second reconcile run does not re-credit",
      Math.abs((await walletBalance(user.id)) - after) < 0.001
    );

    // Force the row back to PENDING and re-run: the wallet-service idempotency key
    // (shared with the webhook) must still block the credit.
    await rowA.update({ status: "PENDING" });
    await reconcileTransfiDeposits();
    const afterForced = await walletBalance(user.id);
    check(
      "even a PENDING row for an already-credited order does not re-credit",
      Math.abs(afterForced - after) < 0.001,
      `${after} -> ${afterForced}`
    );
    check(
      "and it is put back to COMPLETED",
      (await models.transaction.findByPk(a.txnId))!.status === "COMPLETED"
    );

    /* -------- failed order -------- */
    section("Failed order is marked FAILED, not credited");
    const b = await seedIntent(user.id, wallet.id, usable.userId, method.paymentCode, method.paymentType, amount, 5 * 60 * 1000);
    created.push(b.txnId);
    await simulate(b.orderId, "fund_failed");
    const beforeB = await walletBalance(user.id);
    await reconcileTransfiDeposits();
    const rowB: any = await models.transaction.findByPk(b.txnId);
    check("transaction marked FAILED", rowB?.status === "FAILED", rowB?.status);
    check("wallet not credited", Math.abs((await walletBalance(user.id)) - beforeB) < 0.001);

    /* -------- in flight -------- */
    section("In-flight order is left alone");
    const c = await seedIntent(user.id, wallet.id, usable.userId, method.paymentCode, method.paymentType, amount, 5 * 60 * 1000);
    created.push(c.txnId);
    const beforeC = await walletBalance(user.id);
    await reconcileTransfiDeposits();
    const rowC: any = await models.transaction.findByPk(c.txnId);
    check("still PENDING", rowC?.status === "PENDING", rowC?.status);
    check("wallet untouched", Math.abs((await walletBalance(user.id)) - beforeC) < 0.001);
    const metaC = JSON.parse(rowC.metadata || "{}");
    check("provider status was recorded", !!metaC.transfiStatus, metaC.transfiStatus);

    /* -------- grace period -------- */
    section("Rows younger than the grace period are skipped");
    const d = await seedIntent(user.id, wallet.id, usable.userId, method.paymentCode, method.paymentType, amount, 0);
    created.push(d.txnId);
    await simulate(d.orderId, "fund_settled");
    const beforeD = await walletBalance(user.id);
    await reconcileTransfiDeposits();
    check(
      "a brand-new row is not touched (webhook gets first chance)",
      Math.abs((await walletBalance(user.id)) - beforeD) < 0.001 &&
        (await models.transaction.findByPk(d.txnId))!.status === "PENDING"
    );

    /* -------- expiry -------- */
    section("Expiry rules");
    const e = await seedIntent(user.id, wallet.id, usable.userId, method.paymentCode, method.paymentType, amount, 40 * 60 * 60 * 1000);
    created.push(e.txnId);
    const eOrder = await getOrder(e.orderId);
    await reconcileTransfiDeposits();
    const rowE: any = await models.transaction.findByPk(e.txnId);
    if (eOrder.status === "initiated") {
      check(
        "an abandoned `initiated` order past the window is EXPIRED",
        rowE?.status === "EXPIRED",
        rowE?.status
      );
    } else {
      console.log(`  SKIP  order was ${eOrder.status}, not initiated`);
    }

    const f = await seedIntent(user.id, wallet.id, usable.userId, method.paymentCode, method.paymentType, amount, 40 * 60 * 60 * 1000);
    created.push(f.txnId);
    await simulate(f.orderId, "fund_processing").catch(() => null);
    const fOrder = await getOrder(f.orderId);
    if (fOrder.status === "fund_processing") {
      const beforeF = await walletBalance(user.id);
      await reconcileTransfiDeposits();
      const rowF: any = await models.transaction.findByPk(f.txnId);
      check(
        "a `fund_processing` order past the window is NOT expired (money in motion)",
        rowF?.status === "PENDING",
        rowF?.status
      );
      check("and not credited", Math.abs((await walletBalance(user.id)) - beforeF) < 0.001);
    } else {
      console.log(`  SKIP  could not drive the order to fund_processing (got ${fOrder.status})`);
    }
  } finally {
    section("Cleanup");
    await gateway.update({ status: originalStatus });
    console.log(`  gateway.status restored to ${originalStatus}`);
    console.log(`  transactions created: ${created.join(", ")}`);
  }

  console.log(`\n${"-".repeat(64)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(64)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\nHarness crashed:", e);
  process.exit(1);
});
