/**
 * TransFi coverage-closing tests.
 *
 * Covers the surface the other four harnesses left untouched:
 *
 *   - verify.post.ts   (the customer-returns-from-checkout path)
 *   - status.get.ts    (corridor discovery + order polling)
 *   - the FULL first-time registration loop through the route, including a real
 *     create-user call, rather than a pre-seeded mirror row
 *   - the KYC-required branch detection
 *   - config assertion, URL builders, purpose-code selection, cache clearing,
 *     limit recovery from a rejected quote, terminality, user-status predicates,
 *     syncTransfiUser, findUserByEmail, phone/DOB normalisation edge cases
 *   - a ZERO-DECIMAL currency order (UGX) — amounts must not be scaled
 *   - a MULTI-METHOD corridor (GHS) — method selection must be required
 *
 * Usage:  cd backend && npx tsx scripts/transfi-coverage-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { walletCreationService } from "@b/services/wallet";
import {
  assertTransfiConfig,
  assertTransfiWebhookSecret,
  clearTransfiConfigCache,
  createPayinOrder,
  extractLimitsFromError,
  findUserByEmail,
  getDepositPurposeCode,
  getOrder,
  getQuote,
  isKycRequiredError,
  isTerminal,
  isUserRejected,
  isUserUsable,
  listPaymentMethods,
  listSupportedCurrencies,
  mapTransfiStatus,
  transfiKycReturnUrl,
  transfiRequest,
  transfiReturnUrl,
  transfiWebhookUrl,
  TransfiError,
  TRANSFI_PRODUCTION_BASE_URL,
  TRANSFI_SANDBOX_BASE_URL,
  TRANSFI_SIGNATURE_HEADER,
} from "../src/api/finance/deposit/fiat/transfi/utils";
import {
  resolveOrCreateTransfiUser,
  splitPhone,
  syncTransfiUser,
} from "../src/api/finance/deposit/fiat/transfi/user";

let pass = 0;
let fail = 0;
const failures: string[] = [];
const skips: string[] = [];

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
function skip(name: string, why: string) {
  skips.push(name);
  console.log(`  SKIP  ${name} — ${why}`);
}
function section(t: string) {
  console.log(`\n=== ${t} ===`);
}

const noopCtx = { step() {}, success() {}, fail() {}, warn() {}, debug() {} };

async function callRoute(mod: string, payload: any) {
  const handler = (await import(`../src/api/finance/deposit/fiat/transfi/${mod}`)).default as any;
  try {
    return { ok: true as const, result: await handler({ params: {}, query: {}, headers: {}, ctx: noopCtx, ...payload }) };
  } catch (e: any) {
    return { ok: false as const, statusCode: e?.statusCode, message: e?.message };
  }
}

async function main() {
  /* ============ pure helpers ============ */
  section("Config, URLs, purpose codes, predicates");

  check("assertTransfiConfig passes with the configured env", (() => {
    try { assertTransfiConfig(); return true; } catch { return false; }
  })());

  check("assertTransfiConfig names what is missing", (() => {
    try {
      assertTransfiConfig({ ...({} as any), username: "", password: "", mid: "", webhookSecret: "x", baseUrl: "x", sandbox: true, timeoutMs: 1 });
      return false;
    } catch (e: any) {
      return /APP_TRANSFI_USERNAME/.test(e.message) && /APP_TRANSFI_MID/.test(e.message);
    }
  })());

  check("assertTransfiWebhookSecret returns the secret", !!assertTransfiWebhookSecret());
  check("base URL constants are the verified hosts",
    TRANSFI_SANDBOX_BASE_URL === "https://sandbox-api.transfi.com" &&
    TRANSFI_PRODUCTION_BASE_URL === "https://api.transfi.com");
  check("signature header is lowercase for case-insensitive lookup",
    TRANSFI_SIGNATURE_HEADER === "x-transfi-hmac-hash");

  const webhookUrl = transfiWebhookUrl();
  check("webhook URL points at the real route", webhookUrl.endsWith("/api/finance/deposit/fiat/transfi/webhook"), webhookUrl);
  const ret = transfiReturnUrl("txn-123", "success");
  check("return URL carries gateway + status + ref",
    ret.includes("gateway=transfi") && ret.includes("status=success") && ret.includes("ref=txn-123"), ret);
  check("failure return URL differs", transfiReturnUrl("txn-123", "failure").includes("status=failure"));
  check("KYC return URL is distinct", transfiKycReturnUrl().includes("kyc_complete"));

  const pc = getDepositPurposeCode();
  check("purpose code resolves to a valid value", !!pc.purposeCode, pc.purposeCode);
  check("non-'other' purpose code carries no reason", pc.purposeCode === "other" ? !!pc.purposeCodeReason : pc.purposeCodeReason === undefined);

  check("isTerminal: COMPLETED/FAILED terminal, PENDING not",
    isTerminal("COMPLETED") && isTerminal("FAILED") && !isTerminal("PENDING"));

  check("isUserUsable accepts user_approved (the value the API actually returns)", isUserUsable({ status: "user_approved" }));
  check("isUserUsable accepts user_active (docs' wording)", isUserUsable({ status: "user_active" }));
  check("isUserUsable rejects user_created (still screening)", !isUserUsable({ status: "user_created" }));
  check("isUserRejected catches user_rejected and user_blocked",
    isUserRejected({ status: "user_rejected" }) && isUserRejected({ status: "user_blocked" }));
  check("isUserRejected treats an unknown *_rejected_* variant as a refusal, not a wait",
    isUserRejected({ status: "some_new_rejected_state" }));
  check("isUserRejected does NOT swallow screening states", !isUserRejected({ status: "user_created" }));

  section("Limit recovery from a rejected quote");
  let quoteErr: any = null;
  try {
    await getQuote({ sourceCurrency: "KES", destinationCurrency: "KES", amount: 1, orderType: "payin" });
  } catch (e) { quoteErr = e; }
  const recovered = extractLimitsFromError(quoteErr);
  check("a below-minimum quote yields the real window", !!recovered && recovered.minLimit === 136,
    JSON.stringify(recovered));
  check("extractLimitsFromError returns null for a non-limit error", extractLimitsFromError(new Error("nope")) === null);

  section("KYC-required detection");
  check("isKycRequiredError matches a top-level code",
    isKycRequiredError(new TransfiError("x", "STANDARD_KYC_REQUIRED", 400)));
  check("isKycRequiredError matches a nested detail code",
    isKycRequiredError(new TransfiError("x", "VALIDATION_ERROR", 400, { details: [{ code: "ENHANCED_KYC_REQUIRED" }] })));
  check("isKycRequiredError ignores unrelated errors",
    !isKycRequiredError(new TransfiError("x", "VALIDATION_ERROR", 400, { details: [{ code: "PARTNER_ID_ALREADY_USED" }] })));
  check("isKycRequiredError ignores plain Errors", !isKycRequiredError(new Error("boom")));

  section("Phone + DOB normalisation edge cases");
  check("phone: no match for an impossibly short national part", splitPhone("+2541") === null);
  check("phone: 3-digit dial code beats a 1-digit prefix",
    splitPhone("+2637123456")?.phoneCode === "+263");
  check("phone: rejects letters", splitPhone("+254abc12345") === null);
  check("phone: rejects a bare national number", splitPhone("0712345678") === null);

  section("Config cache");
  const before = await listSupportedCurrencies("deposit");
  clearTransfiConfigCache();
  const after = await listSupportedCurrencies("deposit");
  check("clearTransfiConfigCache forces a refetch that still returns data",
    before.length > 0 && after.length === before.length, `${after.length} currencies`);

  section("findUserByEmail + syncTransfiUser");
  const users = await transfiRequest<any>("/v3/users/individual", { query: { limit: 100 } });
  // Must be a PAYER, not a recipient. Recipients created via
  // POST /v3/recipients/individual appear in this SAME list, with status
  // user_approved and NO email — they share the UX- namespace with payers,
  // which is exactly why the platform keeps transfi_user and
  // transfi_recipient as separate tables.
  const anyUser = (users?.data || []).find((u: any) => !!u.email);
  if (anyUser?.email) {
    const found = await findUserByEmail(anyUser.email);
    check("findUserByEmail locates a known identity", found?.userId === anyUser.userId, found?.userId);
    check("findUserByEmail is case-insensitive", (await findUserByEmail(anyUser.email.toUpperCase()))?.userId === anyUser.userId);
    check("findUserByEmail returns null for an unknown address",
      (await findUserByEmail(`nobody-${uuidv4()}@example.invalid`)) === null);
  } else {
    skip("findUserByEmail", "no users on the MID");
  }

  /* ============ status.get.ts ============ */
  section("status.get.ts — corridor discovery and polling");
  const gateway: any = await models.depositGateway.findOne({ where: { alias: "transfi" } });
  const originalStatus = gateway?.status;
  const user: any = await models.user.findOne({ order: [["createdAt", "ASC"]] });

  if (!gateway) {
    skip("status.get.ts", "gateway row missing");
  } else {
    await gateway.update({ status: false });
    let s = await callRoute("status.get", { user: { id: user.id }, query: {} });
    check("with the gateway disabled, currency list reports enabled:false",
      s.ok && s.result?.data?.enabled === false, s.ok ? JSON.stringify(s.result?.data) : s.message);

    await gateway.update({ status: true });
    s = await callRoute("status.get", { user: { id: user.id }, query: {} });
    check("enabled gateway lists currencies", s.ok && Array.isArray(s.result?.data?.currencies) && s.result.data.currencies.length > 0,
      s.ok ? `${s.result?.data?.currencies?.length} currencies` : s.message);
    check("every listed currency also has a platform currency row",
      s.ok && s.result.data.currencies.every((c: any) => !!c.currency),
      s.ok ? s.result.data.currencies.map((c: any) => c.currency).join(",") : "");

    s = await callRoute("status.get", { user: { id: user.id }, query: { currency: "KES" } });
    check("per-currency query returns methods with effective limits",
      s.ok && s.result?.data?.methods?.[0]?.paymentCode === "mpesa" && s.result.data.methods[0].minAmount >= 136,
      s.ok ? JSON.stringify(s.result.data.methods[0]) : s.message);

    s = await callRoute("status.get", { user: { id: user.id }, query: { currency: "GHS" } });
    check("a multi-method corridor lists every method",
      s.ok && (s.result?.data?.methods?.length || 0) >= 3,
      s.ok ? s.result.data.methods.map((m: any) => m.paymentCode).join(",") : s.message);

    s = await callRoute("status.get", { user: { id: user.id }, query: { currency: "ZAR" } });
    check("a corridor the MID has not enabled returns no methods rather than erroring",
      s.ok && Array.isArray(s.result?.data?.methods) && s.result.data.methods.length === 0);

    s = await callRoute("status.get", { user: null, query: {} });
    check("status requires authentication", !s.ok && s.statusCode === 401);
  }

  /* ============ zero-decimal currency ============ */
  section("Zero-decimal currency (UGX) — amounts must not be scaled");
  const ugx = (await listSupportedCurrencies("deposit")).find((c) => c.currency === "UGX");
  check("UGX reports decimalPrecision 0", ugx?.decimalPrecision === 0, String(ugx?.decimalPrecision));
  const ugxMethods = await listPaymentMethods("UGX", "deposit");
  if (ugxMethods.length) {
    const q = await getQuote({
      sourceCurrency: "UGX", destinationCurrency: "UGX", amount: 50000,
      orderType: "payin", paymentCode: ugxMethods[0].paymentCode, paymentType: ugxMethods[0].paymentType,
    });
    check("a 50000 UGX quote returns 50000 as the source amount (major units, unscaled)",
      q.sourceAmount === 50000, String(q.sourceAmount));
    check("and the destination is net of fee, still unscaled",
      q.destinationAmount < 50000 && q.destinationAmount > 40000, String(q.destinationAmount));
  } else {
    skip("UGX quote", "no UGX methods on this MID");
  }

  /* ============ full first-time registration loop ============ */
  section("Full first-time registration through the route (real create-user)");
  // A dedicated throwaway platform user so nothing real is mutated, with a
  // deliverable email — the ONLY kind TransFi accepts — and a fresh phone so the
  // create-user UPSERT cannot match and downgrade an existing identity.
  const role: any = await models.role.findOne({ order: [["id", "ASC"]] });
  const throwaway: any = await models.user.create({
    id: uuidv4(),
    email: "info@padapesa.com",
    firstName: "Grace",
    lastName: "Coverage",
    phone: `+2547${String(Date.now()).slice(-8)}`,
    roleId: role.id,
    emailVerified: true,
    phoneVerified: true,
    status: "ACTIVE",
  });
  await walletCreationService.getOrCreateWallet(throwaway.id, "FIAT", "KES");

  try {
    // 1) No details -> needs_details, and NOTHING is created upstream.
    let r = await callRoute("index.post", {
      user: { id: throwaway.id },
      body: { amount: 500, currency: "KES" },
    });
    check("step 1: route asks for the missing identity fields",
      r.ok && r.result?.status === "PAYER_DETAILS_REQUIRED",
      r.ok ? JSON.stringify(r.result?.data?.missing) : r.message);
    check("step 1: no TransFi identity was created",
      (await models.transfiUser.count({ where: { userId: throwaway.id } })) === 0);

    // 2) With details -> a REAL create-user, then screening or ready.
    r = await callRoute("index.post", {
      user: { id: throwaway.id },
      body: {
        amount: 500,
        currency: "KES",
        payerDetails: {
          dateOfBirth: "1990-04-12",
          country: "KE",
          street: "9 Moi Avenue",
          city: "Nairobi",
          state: "Nairobi",
          postalCode: "00100",
        },
      },
    });
    const mirror: any = await models.transfiUser.findOne({ where: { userId: throwaway.id } });
    check("step 2: a TransFi identity was created and persisted", !!mirror?.transfiUserId, mirror?.transfiUserId);
    check("step 2: the persisted id has the UX- shape", /^UX-/.test(mirror?.transfiUserId || ""));

    const st = r.ok ? r.result?.status : undefined;
    let order: { orderId: string; txnId: string } | null = null;

    if (r.ok && r.result?.success === true) {
      check("step 2: screening completed inside the request and an order was created",
        /^OR-/.test(r.result.data?.order_id || ""), r.result.data?.order_id);
      check("step 2: a payUrl came back", /^https:\/\//.test(r.result.data?.checkout_url || ""));
      order = { orderId: r.result.data.order_id, txnId: r.result.data.transaction_id };
    } else if (st === "PAYER_SCREENING") {
      check("step 2: screening is reported with a retry hint",
        Number(r.result?.data?.retryAfterSeconds) > 0, String(r.result?.data?.retryAfterSeconds));
      const beforeId = mirror.transfiUserId;
      await new Promise((res) => setTimeout(res, 35000));
      const r2 = await callRoute("index.post", {
        user: { id: throwaway.id },
        body: { amount: 500, currency: "KES" },
      });
      const after2: any = await models.transfiUser.findOne({ where: { userId: throwaway.id } });
      check("step 3: the identity id is UNCHANGED (no second create-user)",
        after2?.transfiUserId === beforeId, `${beforeId} -> ${after2?.transfiUserId}`);
      check("step 3: retry produced an order",
        r2.ok && r2.result?.success === true && /^OR-/.test(r2.result?.data?.order_id || ""),
        r2.ok ? (r2.result?.status || r2.result?.data?.order_id) : r2.message);
      if (r2.ok && r2.result?.success) {
        order = { orderId: r2.result.data.order_id, txnId: r2.result.data.transaction_id };
      }
    } else if (st === "PAYER_REJECTED") {
      skip("steps 2-3", `TransFi rejected the identity: ${r.result?.message}`);
    } else {
      check("step 2 produced a recognised state", false, JSON.stringify(r).slice(0, 200));
    }

    if (!order) {
      skip("verify.post.ts", "no order could be created");
    } else {
      section("verify.post.ts — the customer-returns path");
      const { orderId, txnId } = order;

      let v = await callRoute("verify.post", {
        user: { id: throwaway.id },
        body: { order_id: orderId, transaction_id: txnId },
      });
      check("verify on an unpaid order reports PENDING and NOT success",
        v.ok && v.result?.success === false && v.result?.status === "PENDING",
        v.ok ? String(v.result?.status) : v.message);

      v = await callRoute("verify.post", { user: null, body: { order_id: orderId } });
      check("verify requires authentication", !v.ok && v.statusCode === 401);
      v = await callRoute("verify.post", { user: { id: throwaway.id }, body: {} });
      check("verify rejects a request with no reference", !v.ok && v.statusCode === 400);
      v = await callRoute("verify.post", { user: { id: throwaway.id }, body: { transaction_id: uuidv4() } });
      check("verify 404s an unknown deposit", !v.ok && v.statusCode === 404);

      await transfiRequest("/v3/simulation/order", { method: "POST", body: { orderId, status: "fund_settled" } });
      const deadline = Date.now() + 45000;
      let o = await getOrder(orderId);
      while (Date.now() < deadline && o.status !== "fund_settled") {
        await new Promise((res) => setTimeout(res, 2000));
        o = await getOrder(orderId);
      }
      check("order reached fund_settled", o.status === "fund_settled", o.status);

      const w0: any = await models.wallet.findOne({ where: { userId: throwaway.id, type: "FIAT", currency: "KES" } });
      const bal0 = Number(w0?.balance || 0);

      v = await callRoute("verify.post", {
        user: { id: throwaway.id },
        body: { order_id: orderId, transaction_id: txnId },
      });
      check("verify credits a settled order", v.ok && v.result?.success === true && v.result?.status === "COMPLETED",
        v.ok ? String(v.result?.status) : v.message);

      const w1: any = await models.wallet.findOne({ where: { userId: throwaway.id, type: "FIAT", currency: "KES" } });
      const bal1 = Number(w1?.balance || 0);
      check("verify moved the balance by the SETTLED amount",
        Math.abs(bal1 - (bal0 + (o.destinationAmount ?? 0))) < 0.01,
        `${bal0} -> ${bal1} (settled ${o.destinationAmount})`);

      v = await callRoute("verify.post", { user: { id: throwaway.id }, body: { order_id: orderId, transaction_id: txnId } });
      const w2: any = await models.wallet.findOne({ where: { userId: throwaway.id, type: "FIAT", currency: "KES" } });
      check("re-verifying does NOT double-credit", Math.abs(Number(w2.balance) - bal1) < 0.001, `${bal1} -> ${w2.balance}`);
      check("re-verify still reports COMPLETED", v.ok && v.result?.status === "COMPLETED");

      section("status.get.ts — order polling");
      const sp = await callRoute("status.get", { user: { id: throwaway.id }, query: { order_id: orderId } });
      check("polling a real order returns its status and mapping",
        sp.ok && sp.result?.data?.orderId === orderId && sp.result.data.mappedStatus === "COMPLETED",
        sp.ok ? `${sp.result?.data?.status}/${sp.result?.data?.mappedStatus}` : sp.message);

      section("syncTransfiUser");
      const row: any = await models.transfiUser.findOne({ where: { userId: throwaway.id } });
      const synced = await syncTransfiUser(row);
      check("syncTransfiUser refreshes status and stamps lastSyncedAt",
        !!synced?.lastSyncedAt && !!synced?.status, String(synced?.status));
    }

    // resolveOrCreateTransfiUser must be idempotent and never re-POST.
    section("resolveOrCreateTransfiUser is idempotent");
    const m1 = await resolveOrCreateTransfiUser(throwaway.id);
    const m2 = await resolveOrCreateTransfiUser(throwaway.id);
    check("two resolves return the same identity",
      (m1 as any).transfiUserId === (m2 as any).transfiUserId, (m1 as any).transfiUserId);
    check("still exactly one mirror row",
      (await models.transfiUser.count({ where: { userId: throwaway.id } })) === 1);
  } finally {
    section("Cleanup");
    await models.transfiUser.destroy({ where: { userId: throwaway.id } });
    await models.transaction.destroy({ where: { userId: throwaway.id }, force: true });
    await models.wallet.destroy({ where: { userId: throwaway.id }, force: true });
    await models.user.destroy({ where: { id: throwaway.id }, force: true });
    if (gateway) await gateway.update({ status: originalStatus });
    console.log("  throwaway user, wallet, transactions and mirror row removed");
  }

  console.log(`\n${"-".repeat(64)}`);
  console.log(`  ${pass} passed, ${fail} failed, ${skips.length} skipped`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(64)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\nHarness crashed:", e);
  process.exit(1);
});
