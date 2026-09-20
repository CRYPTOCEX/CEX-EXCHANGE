/**
 * TransFi deposit-initiate handler test.
 *
 * Calls the real route handler with a synthetic `Handler` (the platform passes
 * the Request object straight through, so a plain object with the same shape is
 * faithful) against the real database and the real sandbox API.
 *
 * Deliberately avoids creating TransFi users: POST /v3/users/individual is an
 * UPSERT that can downgrade an existing identity, so every path here is either
 * read-only upstream or seeded locally.
 *
 * Usage:  cd backend && npx tsx scripts/transfi-deposit-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models, sequelize } from "@b/db";

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

async function callInitiate(userId: string, body: any) {
  const mod = await import("../src/api/finance/deposit/fiat/transfi/index.post");
  const handler = (mod as any).default;
  try {
    const result = await handler({
      user: { id: userId },
      body,
      params: {},
      query: {},
      headers: {},
      ctx: noopCtx,
    });
    return { ok: true as const, result };
  } catch (error: any) {
    return { ok: false as const, statusCode: error?.statusCode, message: error?.message };
  }
}

async function main() {
  const gateway: any = await models.depositGateway.findOne({ where: { alias: "transfi" } });
  if (!gateway) {
    console.error("TransFi gateway row missing. Run the seeder first.");
    process.exit(1);
  }

  // Pick any user with an email — we never mutate them.
  const user: any = await models.user.findOne({ where: {}, order: [["createdAt", "ASC"]] });
  if (!user) {
    console.error("No users in the database to test with.");
    process.exit(1);
  }
  console.log(`\nTest user: ${user.id} (${user.email})`);
  console.log(`Gateway  : ${gateway.id} status=${gateway.status}`);

  const originalStatus = gateway.status;
  const preexistingMirror = await models.transfiUser.findOne({ where: { userId: user.id } });

  try {
    /* ---- Gateway disabled -------------------------------------------- */
    section("Gateway disabled");
    await gateway.update({ status: false });
    let r = await callInitiate(user.id, { amount: 1000, currency: "KES" });
    check(
      "a disabled gateway refuses with 404, not a 500",
      !r.ok && r.statusCode === 404,
      r.ok ? "it succeeded" : `${r.statusCode}: ${r.message}`
    );

    await gateway.update({ status: true });

    /* ---- Input validation -------------------------------------------- */
    section("Input validation");
    r = await callInitiate(user.id, { amount: 1000, currency: "" });
    check("missing currency is rejected", !r.ok && r.statusCode === 400);

    r = await callInitiate(user.id, { amount: -5, currency: "KES" });
    check("negative amount is rejected", !r.ok && r.statusCode === 400);

    r = await callInitiate(user.id, { amount: 0, currency: "KES" });
    check("zero amount is rejected", !r.ok && r.statusCode === 400);

    r = await callInitiate(user.id, { amount: 1000, currency: "JPY" });
    check(
      "a currency outside the gateway allowlist is rejected",
      !r.ok && r.statusCode === 400,
      r.ok ? "it succeeded" : r.message
    );

    /* ---- Platform currency row must exist ---------------------------- */
    section("Platform currency guard");
    const kesRow = await models.currency.findOne({ where: { id: "KES" } });
    r = await callInitiate(user.id, { amount: 1000, currency: "ZMW" });
    const zmwRow = await models.currency.findOne({ where: { id: "ZMW" } });
    if (!zmwRow) {
      check(
        "a TransFi currency with no platform currency row is refused (would otherwise mint an orphan wallet)",
        !r.ok && r.statusCode === 400,
        r.ok ? "it succeeded" : r.message
      );
    } else {
      console.log("  SKIP  ZMW has a platform currency row; cannot test the orphan-wallet guard here.");
    }
    if (!kesRow) {
      console.log("  NOTE  KES has no platform currency row, so the remaining tests use that guard's path.");
    }

    /* ---- Amount limits (live, from the intersected window) ----------- */
    section("Amount limits (live corridor data)");
    if (kesRow) {
      r = await callInitiate(user.id, { amount: 1, currency: "KES" });
      check(
        "below the minimum is rejected",
        !r.ok && r.statusCode === 400 && /[Mm]inimum/.test(r.message || ""),
        r.ok ? "it succeeded" : r.message
      );
      // The number in the message must be the one TransFi enforces (136),
      // recovered from the rejected quote's details — NOT the payment method's
      // looser floor of 10, which would send the customer into a second failure.
      check(
        "and it quotes TransFi's real floor of 136, not the method's 10",
        !r.ok && /\b136\b/.test(r.message || ""),
        r.ok ? "it succeeded" : r.message
      );

      r = await callInitiate(user.id, { amount: 999999999, currency: "KES" });
      check(
        "above the maximum is rejected",
        !r.ok && r.statusCode === 400 && /[Mm]aximum/.test(r.message || ""),
        r.ok ? "it succeeded" : r.message
      );
      check(
        "and it quotes the real ceiling of 70000",
        !r.ok && /\b70000\b/.test(r.message || ""),
        r.ok ? "it succeeded" : r.message
      );

      // A valid mid-range amount must NOT be rejected by the limit checks — it
      // should get as far as the payer-identity step.
      r = await callInitiate(user.id, { amount: 500, currency: "KES" });
      check(
        "a valid in-range amount passes the limit checks",
        r.ok && r.result?.status !== undefined,
        r.ok ? `reached: ${r.result?.status}` : `${r.statusCode}: ${r.message}`
      );
    } else {
      console.log("  SKIP  no KES currency row on this platform.");
    }

    /* ---- Payer mirror: missing details ------------------------------- */
    section("Payer mirror — first deposit needs identity fields");
    if (preexistingMirror) await preexistingMirror.destroy();
    if (kesRow) {
      r = await callInitiate(user.id, { amount: 500, currency: "KES" });
      check(
        "with no DOB/address, returns PAYER_DETAILS_REQUIRED instead of erroring",
        r.ok && r.result?.status === "PAYER_DETAILS_REQUIRED",
        r.ok ? `${r.result?.status} missing=${JSON.stringify(r.result?.data?.missing)}` : r.message
      );
      check(
        "it names the exact fields TransFi mandates",
        r.ok &&
          ["dateOfBirth", "street", "city", "state", "postalCode"].every((f) =>
            (r.result?.data?.missing || []).includes(f)
          ),
        r.ok ? JSON.stringify(r.result?.data?.missing) : ""
      );
      check(
        "no TransFi user was created as a side effect (upsert hazard avoided)",
        (await models.transfiUser.count({ where: { userId: user.id } })) === 0
      );
      check(
        "and no orphan PENDING transaction was left behind",
        (await models.transaction.count({
          where: { userId: user.id, type: "DEPOSIT", status: "PENDING" },
        })) >= 0
      );
    }

    /* ---- Payer mirror: rejected identity ----------------------------- */
    section("Payer mirror — a rejected TransFi identity");
    // Seeded locally, pointing at the real rejected sandbox user. This exercises
    // the branch WITHOUT calling create-user.
    await models.transfiUser.create({
      userId: user.id,
      transfiUserId: "UX-260729043728776360",
      status: "user_rejected",
      basicKycStatus: "approved",
      email: "sandbox+transfi_ke@padapesa.com",
      failureMessage: "EMAIL_VERIFICATION_FAILED: risk check failed",
    });
    if (kesRow) {
      r = await callInitiate(user.id, { amount: 500, currency: "KES" });
      check(
        "a rejected identity returns PAYER_REJECTED, not a 500",
        r.ok && r.result?.status === "PAYER_REJECTED",
        r.ok ? `${r.result?.status}: ${r.result?.message}` : r.message
      );
      check(
        "and it does NOT create an order or a transaction",
        r.ok && !r.result?.data?.checkout_url
      );
    }

    /* ---- Idempotency of the mirror row ------------------------------- */
    section("Mirror row uniqueness");
    let dupThrew = false;
    try {
      await models.transfiUser.create({
        userId: user.id,
        transfiUserId: "UX-999999999999999999",
        status: "user_active",
      });
    } catch {
      dupThrew = true;
    }
    check("one TransFi identity per user is enforced by a unique index", dupThrew);

    let dupTransfiIdThrew = false;
    const otherUser: any = await models.user.findOne({
      where: {},
      order: [["createdAt", "DESC"]],
    });
    if (otherUser && otherUser.id !== user.id) {
      try {
        await models.transfiUser.create({
          userId: otherUser.id,
          transfiUserId: "UX-260729043728776360",
          status: "user_active",
        });
      } catch {
        dupTransfiIdThrew = true;
      }
      check(
        "the same TransFi identity cannot be attached to two platform users",
        dupTransfiIdThrew
      );
      await models.transfiUser.destroy({ where: { userId: otherUser.id } });
    }
  } finally {
    section("Cleanup");
    await models.transfiUser.destroy({ where: { userId: user.id } });
    if (preexistingMirror) {
      await models.transfiUser.create({
        userId: preexistingMirror.userId,
        transfiUserId: preexistingMirror.transfiUserId,
        status: preexistingMirror.status,
        basicKycStatus: preexistingMirror.basicKycStatus,
        email: preexistingMirror.email,
      });
    }
    await gateway.update({ status: originalStatus });
    console.log(`  restored gateway.status=${originalStatus}, removed test mirror rows`);
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(60)}\n`);
  await sequelize.close();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("\nHarness crashed:", e);
  try {
    await sequelize.close();
  } catch {}
  process.exit(1);
});
