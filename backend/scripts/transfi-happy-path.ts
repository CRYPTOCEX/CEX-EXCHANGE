/**
 * TransFi full happy-path test.
 *
 * The complete money flow, end to end, against the live sandbox and the real
 * database:
 *
 *   initiate  -> real TransFi order + payUrl, PENDING transaction row
 *   simulate  -> POST /v3/simulation/order drives the order to fund_settled
 *   webhook   -> a TransFi-signed webhook is POSTed to the real running route
 *   assert    -> wallet balance increased by the SETTLED amount, row COMPLETED
 *   replay    -> the same webhook again must NOT double-credit
 *   failure   -> a second order driven to fund_failed must NOT credit
 *
 * Requires: the backend running (for the webhook leg) and a TransFi user whose
 * email is deliverable. Pass --user UX-... to pin one, otherwise the first
 * approved user on the MID is used.
 *
 * Usage:
 *   cd backend && npx tsx scripts/transfi-happy-path.ts [--user UX-...] [--backend http://localhost:4000]
 */

import "../module-alias-setup";
import "../load-env";
import crypto from "crypto";

import { models, sequelize } from "@b/db";
import {
  getTransfiConfig,
  transfiRequest,
  listPaymentMethods,
  intersectLimits,
  getQuote,
  getOrder,
  isUserUsable,
} from "../src/api/finance/deposit/fiat/transfi/utils";

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const BACKEND = arg("backend") || "http://localhost:4000";
const WEBHOOK_PATH = "/api/finance/deposit/fiat/transfi/webhook";

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

const noopCtx = {
  step: () => {},
  success: () => {},
  fail: () => {},
  warn: () => {},
  debug: () => {},
};

function signPayload(body: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(getTransfiConfig().webhookSecret, "utf8"))
    .update(body, "utf8")
    .digest("hex");
}

async function postWebhook(body: string) {
  const res = await fetch(`${BACKEND}${WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Transfi-Hmac-Hash": signPayload(body),
    },
    body,
  });
  let json: any;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

/** TransFi's sandbox status driver. */
async function simulateStatus(orderId: string, status: string) {
  return transfiRequest("/v3/simulation/order", {
    method: "POST",
    body: { orderId, status },
  });
}

/**
 * Drives an order to `target` and waits for TransFi to actually report it.
 *
 * The simulation endpoint is ASYNCHRONOUS: it accepts the request and the order
 * passes through intermediate states (`fund_processing`) before reaching the
 * target. Reading the status once immediately afterwards races the transition.
 */
async function driveToStatus(orderId: string, target: string, timeoutMs = 45000) {
  await simulateStatus(orderId, target);
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    const o = await getOrder(orderId);
    last = o.status;
    if (o.status === target) return o;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`  (timed out waiting for ${target}; last seen ${last})`);
  return getOrder(orderId);
}

function webhookBody(orderId: string, status: string, extra: Record<string, any> = {}) {
  return JSON.stringify({
    eventId: `EV-${Date.now()}${Math.floor(Math.random() * 1000)}`,
    eventType: "order",
    entityId: orderId,
    status,
    order: {
      orderId,
      orderType: "payin",
      status,
      depositCurrency: extra.currency,
      depositAmount: extra.requested,
      withdrawCurrency: extra.currency,
      withdrawAmount: extra.settled,
      partnerId: extra.partnerId,
    },
  });
}

async function walletBalance(userId: string, currency: string): Promise<number> {
  const w: any = await models.wallet.findOne({
    where: { userId, type: "FIAT", currency },
  });
  return w ? Number(w.balance) : 0;
}

async function main() {
  const config = getTransfiConfig();
  if (!config.sandbox) {
    console.error("Refusing to run against production.");
    process.exit(1);
  }

  // Backend must be up for the webhook leg.
  try {
    const probe = await fetch(`${BACKEND}${WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (probe.status === 404) throw new Error("route not found");
  } catch (e: any) {
    console.error(`\nBackend not reachable at ${BACKEND} (${e?.message}). Start it first.`);
    process.exit(1);
  }

  section("Prerequisites");
  const pinned = arg("user");
  const users = await transfiRequest<any>("/v3/users/individual", { query: { limit: 100 } });
  const usable = pinned
    ? (users?.data || []).find((u: any) => u.userId === pinned)
    : (users?.data || []).find((u: any) => isUserUsable(u));

  if (!usable) {
    console.log("  No usable TransFi identity on this MID.");
    console.log("  Every user is rejected or still screening. TransFi requires an email");
    console.log("  address that can actually receive mail; create one and retry.");
    process.exit(1);
  }
  check("a usable TransFi identity exists", true, `${usable.userId} (${usable.status})`);

  const gateway: any = await models.depositGateway.findOne({ where: { alias: "transfi" } });
  if (!gateway) {
    console.error("TransFi gateway row missing — run the seeder.");
    process.exit(1);
  }
  const originalGatewayStatus = gateway.status;
  await gateway.update({ status: true });

  // Pick a platform user that has a currency row available.
  const currency = "KES";
  const currencyRow = await models.currency.findOne({ where: { id: currency } });
  if (!currencyRow) {
    console.error(`No platform currency row for ${currency}; cannot credit a wallet.`);
    await gateway.update({ status: originalGatewayStatus });
    process.exit(1);
  }

  const platformUser: any = await models.user.findOne({ order: [["createdAt", "ASC"]] });
  check("platform user available", !!platformUser, platformUser?.email);

  // Point the local mirror at the usable TransFi identity so the deposit route
  // skips registration entirely (and cannot trigger the create-user upsert).
  await models.transfiUser.destroy({ where: { userId: platformUser.id } });
  await models.transfiUser.destroy({ where: { transfiUserId: usable.userId } });
  await models.transfiUser.create({
    userId: platformUser.id,
    transfiUserId: usable.userId,
    status: usable.status,
    basicKycStatus: usable.basicKycStatus || null,
    email: usable.email || null,
  });

  const methods = await listPaymentMethods(currency, "deposit");
  const method = methods[0];
  const quote = await getQuote({
    sourceCurrency: currency,
    destinationCurrency: currency,
    amount: 500,
    orderType: "payin",
    paymentCode: method.paymentCode,
    paymentType: method.paymentType,
  });
  const limits = intersectLimits(quote, method);
  const amount = Math.max(limits.min, 200);
  console.log(`  Corridor: ${currency}/${method.paymentCode}, amount ${amount}, limits ${limits.min}..${limits.max}`);

  const initiate = (await import("../src/api/finance/deposit/fiat/transfi/index.post")).default as any;

  const balanceBefore = await walletBalance(platformUser.id, currency);
  console.log(`  Wallet balance before: ${balanceBefore} ${currency}`);

  let createdTransactionIds: string[] = [];

  try {
    /* ================= HAPPY PATH ================= */
    section("1. Initiate deposit");
    const res = await initiate({
      user: { id: platformUser.id },
      body: { amount, currency, paymentCode: method.paymentCode, paymentType: method.paymentType },
      params: {},
      query: {},
      headers: {},
      ctx: noopCtx,
    });

    check("initiate succeeded", res?.success === true, JSON.stringify(res?.status || res?.data?.order_id));
    if (!res?.success) {
      console.log("  response:", JSON.stringify(res).slice(0, 400));
      throw new Error("initiate did not succeed");
    }

    const orderId: string = res.data.order_id;
    const transactionId: string = res.data.transaction_id;
    createdTransactionIds.push(transactionId);

    check("a TransFi order id was returned", /^OR-/.test(orderId), orderId);
    check("a hosted payUrl was returned", /^https:\/\//.test(res.data.checkout_url), res.data.checkout_url);

    const txn: any = await models.transaction.findByPk(transactionId);
    check("a PENDING transaction row was created", txn?.status === "PENDING", txn?.status);
    const meta = JSON.parse(txn.metadata || "{}");
    check("orderId is persisted on the row", meta.transfiOrderId === orderId);
    check(
      "payUrl is persisted at creation (GET /orders never returns it again)",
      !!meta.payUrl,
      meta.payUrl
    );
    check("wallet was not credited yet", (await walletBalance(platformUser.id, currency)) === balanceBefore);

    /* ================= SETTLEMENT ================= */
    section("2. Drive the order to fund_settled (sandbox simulation)");
    const confirmed = await driveToStatus(orderId, "fund_settled");
    check("TransFi reports fund_settled", confirmed.status === "fund_settled", confirmed.status);
    check("mapped to COMPLETED", confirmed.mapped === "COMPLETED");
    const settled = confirmed.destinationAmount;
    check(
      "settled amount is net of TransFi's fee (less than requested)",
      typeof settled === "number" && settled < amount,
      `requested ${amount}, settled ${settled}`
    );

    /* ================= WEBHOOK ================= */
    section("3. Signed webhook credits the wallet");
    const body = webhookBody(orderId, "fund_settled", {
      currency,
      requested: amount,
      settled,
      partnerId: transactionId,
    });
    const hook = await postWebhook(body);
    check("webhook accepted", hook.status === 200, `HTTP ${hook.status} ${JSON.stringify(hook.json)}`);
    check("webhook reports a credit", /credited/i.test(JSON.stringify(hook.json)), JSON.stringify(hook.json));

    const txnAfter: any = await models.transaction.findByPk(transactionId);
    check("transaction is COMPLETED", txnAfter?.status === "COMPLETED", txnAfter?.status);

    const balanceAfter = await walletBalance(platformUser.id, currency);
    const platformFee = Number(txnAfter.fee) || 0;
    const expected = balanceBefore + (settled as number) - platformFee;
    check(
      "wallet credited with the SETTLED amount minus the platform fee",
      Math.abs(balanceAfter - expected) < 0.01,
      `before ${balanceBefore}, after ${balanceAfter}, expected ${expected} (settled ${settled}, fee ${platformFee})`
    );
    check(
      "the credit used the settled amount, NOT the requested amount",
      Math.abs(balanceAfter - (balanceBefore + amount - platformFee)) > 0.001 || settled === amount,
      `requested ${amount} vs settled ${settled}`
    );

    /* ================= REPLAY ================= */
    section("4. Replay protection (TransFi retries up to 9 times)");
    const replay = await postWebhook(body);
    check("replayed webhook is accepted (not an error)", replay.status === 200, `HTTP ${replay.status}`);
    const balanceAfterReplay = await walletBalance(platformUser.id, currency);
    check(
      "replay did NOT double-credit",
      Math.abs(balanceAfterReplay - balanceAfter) < 0.001,
      `${balanceAfter} -> ${balanceAfterReplay}`
    );

    // A DIFFERENT eventId for the same settled order must also not re-credit.
    const distinctEvent = webhookBody(orderId, "fund_settled", {
      currency,
      requested: amount,
      settled,
      partnerId: transactionId,
    });
    await postWebhook(distinctEvent);
    check(
      "a fresh eventId for an already-settled order does not re-credit either",
      Math.abs((await walletBalance(platformUser.id, currency)) - balanceAfter) < 0.001
    );

    /* ================= FAILURE PATH ================= */
    section("5. Failure path must not credit");
    const res2 = await initiate({
      user: { id: platformUser.id },
      body: { amount, currency, paymentCode: method.paymentCode, paymentType: method.paymentType },
      params: {},
      query: {},
      headers: {},
      ctx: noopCtx,
    });
    check("second order created", res2?.success === true, res2?.data?.order_id);
    if (res2?.success) {
      const orderId2 = res2.data.order_id;
      createdTransactionIds.push(res2.data.transaction_id);
      const balBeforeFail = await walletBalance(platformUser.id, currency);
      await driveToStatus(orderId2, "fund_failed");
      const hook2 = await postWebhook(
        webhookBody(orderId2, "fund_failed", {
          currency,
          requested: amount,
          settled: 0,
          partnerId: res2.data.transaction_id,
        })
      );
      check("failure webhook accepted", hook2.status === 200, `HTTP ${hook2.status}`);
      const txn2: any = await models.transaction.findByPk(res2.data.transaction_id);
      check("transaction marked FAILED", txn2?.status === "FAILED", txn2?.status);
      check(
        "wallet NOT credited on failure",
        Math.abs((await walletBalance(platformUser.id, currency)) - balBeforeFail) < 0.001
      );
    }

    /* ================= IDEMPOTENCY AT THE PROVIDER ================= */
    section("6. Provider-side idempotency (partnerId)");
    const { createPayinOrder } = await import("../src/api/finance/deposit/fiat/transfi/utils");
    const reusedPartnerId = transactionId;
    let dupRejected = false;
    let dupDetail = "";
    try {
      await createPayinOrder({
        transfiUserId: usable.userId,
        partnerId: reusedPartnerId,
        sourceCurrency: currency,
        amount,
        paymentCode: method.paymentCode,
        paymentType: method.paymentType,
        successRedirectUrl: "https://example.com/ok",
        failureRedirectUrl: "https://example.com/fail",
      });
    } catch (e: any) {
      dupRejected = true;
      dupDetail = e?.code || e?.message;
    }
    check("reusing a partnerId is rejected by TransFi", dupRejected, dupDetail);
  } finally {
    section("Cleanup");
    await models.transfiUser.destroy({ where: { userId: (await models.user.findOne({ order: [["createdAt", "ASC"]] }))!.id } });
    await gateway.update({ status: originalGatewayStatus });
    console.log(`  gateway.status restored to ${originalGatewayStatus}`);
    console.log(`  transactions left for inspection: ${createdTransactionIds.join(", ") || "none"}`);
    console.log("  (wallet credits are intentionally NOT reversed — inspect them, then remove by hand if desired)");
  }

  console.log(`\n${"-".repeat(64)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(64)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("\nHarness crashed:", e);
  process.exit(1);
});
